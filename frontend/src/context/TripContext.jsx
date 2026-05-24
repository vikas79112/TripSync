import React, { createContext, useState, useContext } from 'react';
import api from '../services/api';
import { db, saveTripToLocal, getTripFromLocal, getAllTripsFromLocal } from '../services/db';

const TripContext = createContext();

export const TripProvider = ({ children }) => {
  const [trips, setTrips] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      if (navigator.onLine) {
        const response = await api.get('/trips');
        const data = response.data;
        setTrips(data);
        // Cache trips locally
        for (const trip of data) {
          await saveTripToLocal(trip);
        }
      } else {
        // Load from local IndexedDB cache
        const localTrips = await getAllTripsFromLocal();
        setTrips(localTrips);
      }
    } catch (err) {
      console.error('Failed to fetch trips:', err);
      // Fallback to local cache if API fails
      const localTrips = await getAllTripsFromLocal();
      setTrips(localTrips);
      setError('Running in Offline Mode - showing cached trip groups.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTripDetails = async (tripId) => {
    setLoading(true);
    setError(null);
    try {
      if (navigator.onLine) {
        const response = await api.get(`/trips/${tripId}`);
        const data = response.data;
        setActiveTrip(data);
        await saveTripToLocal(data);
      } else {
        const cachedTrip = await getTripFromLocal(tripId);
        if (cachedTrip) {
          setActiveTrip(cachedTrip);
        } else {
          setError('Trip details not available in offline cache.');
        }
      }
    } catch (err) {
      console.error('Failed to fetch trip details:', err);
      const cachedTrip = await getTripFromLocal(tripId);
      if (cachedTrip) {
        setActiveTrip(cachedTrip);
      } else {
        setError('Could not connect to backend and no cache was found.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async (tripId) => {
    setError(null);
    try {
      if (navigator.onLine) {
        const response = await api.get(`/trips/${tripId}/expenses`);
        const backendExpenses = response.data;

        // Fetch local offline expenses for this trip from Dexie
        const localOfflineExpenses = await db.offline_expenses
          .where('tripId')
          .equals(tripId)
          .toArray();

        // Merge backend and offline expenses
        setExpenses([...localOfflineExpenses, ...backendExpenses]);
      } else {
        // Load only offline expenses + what we might have saved inside the cached trip
        const cachedTrip = await getTripFromLocal(tripId);
        const cachedExpenses = cachedTrip?.expenses || [];

        const localOfflineExpenses = await db.offline_expenses
          .where('tripId')
          .equals(tripId)
          .toArray();

        setExpenses([...localOfflineExpenses, ...cachedExpenses]);
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
      // Fallback
      const localOfflineExpenses = await db.offline_expenses
        .where('tripId')
        .equals(tripId)
        .toArray();
      setExpenses(localOfflineExpenses);
    }
  };

  const createTrip = async (tripData) => {
    setLoading(true);
    setError(null);
    try {
      if (!navigator.onLine) {
        throw new Error('You must be online to create a new trip group.');
      }
      const response = await api.post('/trips', tripData);
      const newTrip = response.data;
      setTrips((prev) => [newTrip, ...prev]);
      await saveTripToLocal(newTrip);
      return newTrip;
    } catch (err) {
      throw err.response?.data?.message || err.message || 'Failed to create trip.';
    } finally {
      setLoading(false);
    }
  };

  const inviteMember = async (tripId, email) => {
    setError(null);
    try {
      if (!navigator.onLine) {
        throw new Error('You must be online to invite new members.');
      }
      const response = await api.post(`/trips/${tripId}/members`, { email });
      const newMember = response.data;

      // Update local activeTrip state
      if (activeTrip && activeTrip.id === tripId) {
        const updatedMembers = [...activeTrip.members, newMember];
        const updatedTrip = { ...activeTrip, members: updatedMembers };
        setActiveTrip(updatedTrip);
        await saveTripToLocal(updatedTrip);
      }
      return newMember;
    } catch (err) {
      throw err.response?.data?.message || err.message || 'Failed to add member.';
    }
  };

  const removeMember = async (tripId, userId) => {
    setError(null);
    try {
      if (!navigator.onLine) {
        throw new Error('You must be online to remove members.');
      }
      await api.delete(`/trips/${tripId}/members/${userId}`);

      if (activeTrip && activeTrip.id === tripId) {
        const updatedMembers = activeTrip.members.filter((m) => m.userId !== userId);
        const updatedTrip = { ...activeTrip, members: updatedMembers };
        setActiveTrip(updatedTrip);
        await saveTripToLocal(updatedTrip);
      }
    } catch (err) {
      throw err.response?.data?.message || err.message || 'Failed to remove member.';
    }
  };

  const addExpense = async (tripId, expenseData) => {
    setError(null);
    try {
      if (navigator.onLine) {
        const response = await api.post(`/trips/${tripId}/expenses`, expenseData);
        const newExpense = response.data;
        setExpenses((prev) => [newExpense, ...prev]);
        return newExpense;
      } else {
        // --- OFFLINE EXPENSE HANDLING ---
        const tempId = crypto.randomUUID();
        const storedUser = JSON.parse(localStorage.getItem('tripsync_user'));

        const offlineExpense = {
          id: tempId,
          tripId: tripId,
          title: expenseData.title,
          amount: parseFloat(expenseData.amount),
          category: expenseData.category,
          paidBy: storedUser, // Simulated local user details
          notes: expenseData.notes,
          expenseDate: new Date().toISOString(),
          isDisputed: false,
          isOffline: true, // Tag as offline!
        };

        // 1. Save in local offline_expenses table
        await db.offline_expenses.add(offlineExpense);

        // 2. Queue in pending_sync
        await db.pending_sync.add({
          operation: 'CREATE',
          entityType: 'EXPENSE',
          entityId: tempId,
          payload: { ...expenseData, tripId, clientExpenseId: tempId },
          timestamp: Date.now(),
        });

        // 3. Immediately render locally in the active expense state
        const formattedLocalExpense = {
          ...offlineExpense,
          participants: (expenseData.participantIds || []).map(pId => {
            const memberObj = activeTrip?.members.find(m => m.userId === pId);
            return {
              userId: pId,
              name: memberObj?.name || 'Group Member',
              email: memberObj?.email || '',
              shareAmount: parseFloat(expenseData.amount) / (expenseData.participantIds?.length || 1)
            };
          })
        };

        setExpenses((prev) => [formattedLocalExpense, ...prev]);
        return formattedLocalExpense;
      }
    } catch (err) {
      throw err.response?.data?.message || err.message || 'Failed to add expense.';
    }
  };

  const deleteExpense = async (expenseId) => {
    setError(null);
    try {
      if (!navigator.onLine) {
        throw new Error('You must be online to delete expenses.');
      }
      await api.delete(`/expenses/${expenseId}`);
      setExpenses((prev) => prev.filter((exp) => exp.id !== expenseId));
    } catch (err) {
      throw err.response?.data?.message || err.message || 'Failed to delete expense.';
    }
  };

  const deleteTrip = async (tripId) => {
    setLoading(true);
    setError(null);
    try {
      if (!navigator.onLine) {
        throw new Error('You must be online to delete a trip.');
      }
      await api.delete(`/trips/${tripId}`);
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
      if (activeTrip && activeTrip.id === tripId) {
        setActiveTrip(null);
      }
    } catch (err) {
      throw err.response?.data?.message || err.message || 'Failed to delete trip.';
    } finally {
      setLoading(false);
    }
  };

  return (
    <TripContext.Provider
      value={{
        trips,
        activeTrip,
        expenses,
        loading,
        error,
        fetchTrips,
        fetchTripDetails,
        fetchExpenses,
        createTrip,
        inviteMember,
        removeMember,
        addExpense,
        deleteExpense,
        deleteTrip,
        setExpenses,
        setActiveTrip,
      }}
    >
      {children}
    </TripContext.Provider>
  );
};

export const useTrips = () => useContext(TripContext);
export default TripContext;
