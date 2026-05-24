import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { useOnline } from '../hooks/useOnline';
import { db } from '../services/db';
import api from '../services/api';
import { useTrips } from './TripContext';

const SyncContext = createContext();

export const SyncProvider = ({ children }) => {
  const isOnline = useOnline();
  const { fetchExpenses, fetchTripDetails, activeTrip } = useTrips();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncRef = useRef(false);

  // Function to count pending operations
  const updatePendingCount = async () => {
    try {
      const count = await db.pending_sync.count();
      setPendingCount(count);
    } catch (err) {
      console.error('Failed to get pending sync count:', err);
    }
  };

  // Run initial count on mount and monitor offline_expenses additions
  useEffect(() => {
    updatePendingCount();
    
    // Set up a simple polling interval to check for pending items in case they are added/changed
    const interval = setInterval(updatePendingCount, 3000);
    return () => clearInterval(interval);
  }, []);

  // Sync runner
  const performSync = async () => {
    if (syncRef.current || !isOnline) return;
    
    try {
      const count = await db.pending_sync.count();
      if (count === 0) return;

      console.log(`Starting synchronization for ${count} pending operations...`);
      syncRef.current = true;
      setIsSyncing(true);

      const pendingOps = await db.pending_sync.orderBy('timestamp').toArray();

      for (const op of pendingOps) {
        try {
          if (op.operation === 'CREATE' && op.entityType === 'EXPENSE') {
            const { tripId, ...expenseData } = op.payload;
            // Execute API call to save on server
            await api.post(`/trips/${tripId}/expenses`, expenseData);
            
            // Delete from Dexie queue
            await db.pending_sync.delete(op.id);
            await db.offline_expenses.delete(op.entityId);
          }
        } catch (err) {
          console.error(`Failed to sync operation ${op.id}:`, err);
          // Keep it in queue if it was a server error (e.g. timeout) to try again later
          // Unless it's a validation error (400), where we might want to discard to avoid blocking the queue
          if (err.response && err.response.status >= 400 && err.response.status < 500) {
            await db.pending_sync.delete(op.id);
            await db.offline_expenses.delete(op.entityId);
          }
        }
      }

      await updatePendingCount();
      console.log('Synchronization complete!');

      // If we are currently viewing a trip, refresh details and expenses from server
      if (activeTrip) {
        await fetchTripDetails(activeTrip.id);
        await fetchExpenses(activeTrip.id);
      }
    } catch (err) {
      console.error('Error during synchronization queue run:', err);
    } finally {
      setIsSyncing(false);
      syncRef.current = false;
    }
  };

  // Automatically trigger sync when browser transitions to online
  useEffect(() => {
    if (isOnline) {
      performSync();
    }
  }, [isOnline, activeTrip]);

  const value = {
    isOnline,
    isSyncing,
    pendingCount,
    forceSync: performSync,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

export const useSync = () => useContext(SyncContext);
export default SyncContext;
