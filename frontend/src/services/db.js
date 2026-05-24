import Dexie from 'dexie';

export const db = new Dexie('TripSyncDB');

// Define database schema
// Note: schema keys represent indexed fields, other properties are stored dynamically!
db.version(1).stores({
  trips: 'id, name, destination, status, createdAt',
  pending_sync: '++id, operation, entityType, entityId, timestamp',
  offline_expenses: 'id, tripId, title, amount, category, paidById, timestamp',
});

// Helper functions for IndexedDB operations
export const saveTripToLocal = async (trip) => {
  try {
    await db.trips.put(trip);
  } catch (error) {
    console.error('Failed to save trip to local db:', error);
  }
};

export const getTripFromLocal = async (tripId) => {
  try {
    return await db.trips.get(tripId);
  } catch (error) {
    console.error('Failed to get trip from local db:', error);
    return null;
  }
};

export const getAllTripsFromLocal = async () => {
  try {
    return await db.trips.toArray();
  } catch (error) {
    console.error('Failed to get all trips from local db:', error);
    return [];
  }
};

export const clearLocalCache = async () => {
  try {
    await db.trips.clear();
    await db.offline_expenses.clear();
    await db.pending_sync.clear();
  } catch (error) {
    console.error('Failed to clear local db cache:', error);
  }
};
