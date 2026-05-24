import React, { useEffect, useState } from 'react';
import { useTrips } from '../context/TripContext';
import { useSync } from '../context/SyncContext';
import { Plus, Compass, Calendar, MapPin, Users, CheckCircle, ShieldAlert, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { trips, fetchTrips, createTrip, loading, error } = useTrips();
  const { isOnline } = useSync();
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    if (!name || !destination) {
      setFormError('Trip name and destination are required.');
      return;
    }
    setFormError('');
    setFormLoading(true);
    try {
      await createTrip({
        name,
        destination,
        description,
        startDate: startDate || null,
        endDate: endDate || null,
      });
      setShowModal(false);
      // Reset form
      setName('');
      setDestination('');
      setDescription('');
      setStartDate('');
      setEndDate('');
    } catch (err) {
      setFormError(err);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 bg-[var(--surface)] p-6 rounded-3xl border border-[var(--border-subtle)] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">My Trips</h1>
          <p className="text-[var(--text-secondary)] text-sm">Coordinate group spending and settlements seamlessly</p>
        </div>

        {/* Create trip button */}
        <button
          onClick={() => {
            if (!isOnline) {
              alert('You must be online to create a new trip group.');
              return;
            }
            setShowModal(true);
          }}
          disabled={!isOnline}
          className={`glow-btn px-5 py-3 rounded-2xl font-semibold flex items-center gap-2 text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 ${!isOnline ? 'opacity-55 cursor-not-allowed shadow-none' : ''}`}
        >
          <Plus className="w-5 h-5" />
          <span>New Trip</span>
        </button>
      </div>

      {/* Connection notification */}
      {error && (
        <div className="flex items-center gap-2 p-4 mb-6 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-2xl text-[var(--text-secondary)] text-sm">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading list state */}
      {loading && trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
          <p className="text-slate-400 text-sm">Loading your trips...</p>
        </div>
      ) : trips.length === 0 ? (
        /* Empty state */
        <div className="glass-panel rounded-3xl p-12 text-center max-w-xl mx-auto py-16">
          <div className="p-4 bg-emerald-500/10 rounded-full inline-flex text-emerald-500 dark:text-emerald-400 mb-4 border border-emerald-500/10">
            <Compass className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">No trips found</h3>
          <p className="text-[var(--text-secondary)] text-sm mb-6 max-w-md mx-auto">
            You are not part of any trip groups yet. Click "New Trip" to create a collaborative trip group and invite your friends.
          </p>
          {isOnline && (
            <button
              onClick={() => setShowModal(true)}
              className="glow-btn px-6 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create Your First Trip</span>
            </button>
          )}
        </div>
      ) : (
        /* Trips grid list */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="glass-panel hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between group border border-[var(--border-subtle)] bg-[var(--surface)]"
            >
              <div>
                {/* Trip status header */}
                <div className="flex items-center justify-between mb-4">
                  {trip.status === 'SETTLED' ? (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-semibold uppercase">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Settled</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-semibold uppercase">
                      <Compass className="w-3.5 h-3.5 animate-spin-slow" />
                      <span>Active</span>
                    </span>
                  )}

                  <span className="text-xs text-[var(--text-muted)] font-medium">
                    Leader: {trip.createdBy.name.split(' ')[0]}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 group-hover:text-[var(--accent)] transition-colors leading-snug">
                  {trip.name}
                </h3>
                
                {/* Destination */}
                <div className="flex items-center gap-1 text-[var(--text-secondary)] text-sm mb-3">
                  <MapPin className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
                  <span>{trip.destination}</span>
                </div>

                {/* Description */}
                {trip.description && (
                  <p className="text-[var(--text-secondary)] text-xs line-clamp-2 mb-4 bg-[var(--background)] p-3 rounded-xl border border-[var(--border-subtle)]">
                    {trip.description}
                  </p>
                )}
              </div>

              {/* Meta details footer */}
              <div className="mt-4 border-t border-[var(--border-subtle)] pt-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-[var(--text-muted)] text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {trip.startDate ? new Date(trip.startDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'Dates open'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[var(--text-muted)] text-xs">
                    <Users className="w-3.5 h-3.5" />
                    <span>{(trip.members || []).length} members</span>
                  </div>
                </div>

                <Link
                  to={`/trips/${trip.id}`}
                  className="p-2.5 rounded-xl bg-[var(--surface-elevated)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-slate-950 transition-all font-semibold cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE TRIP MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel-heavy w-full max-w-lg p-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-2xl relative">
            <h2 className="text-2xl font-extrabold text-[var(--text-primary)] mb-6">Create New Trip</h2>

            {formError && (
              <div className="flex items-center gap-2 p-4 mb-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-sm">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Trip Name</label>
                <input
                  type="text"
                  placeholder="e.g. Europe Backpacking, Goa Weekend"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input w-full py-3 px-4 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Destination</label>
                <input
                  type="text"
                  placeholder="e.g. Paris, Goa, Manali"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="glass-input w-full py-3 px-4 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description (Optional)</label>
                <textarea
                  placeholder="What is the plan for this trip?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                  className="glass-input w-full py-3 px-4 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="glass-input w-full py-3 px-4 text-sm text-[var(--text-secondary)] bg-[var(--surface-elevated)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="glass-input w-full py-3 px-4 text-sm text-[var(--text-secondary)] bg-[var(--surface-elevated)]"
                  />
                </div>
              </div>

              {/* Action triggers */}
              <div className="flex items-center justify-end gap-3 mt-6 border-t border-[var(--border-subtle)] pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-3 rounded-xl bg-[var(--surface-elevated)] hover:bg-[var(--surface-hover)] font-semibold text-sm transition-all text-[var(--text-secondary)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="glow-btn px-6 py-3 text-sm flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span>Create Trip</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
