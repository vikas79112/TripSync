import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTrips } from '../context/TripContext';
import { useSync } from '../context/SyncContext';
import { useWebSocket } from '../hooks/useWebSocket';
import api from '../services/api';
import { 
  ArrowLeft, MapPin, Plus, CalendarDays,
  Info, ShieldAlert, Sparkles, Loader2,
  AlertCircle, Play, Trash2
} from 'lucide-react';

// Subcomponents
import ExpenseCard from '../components/trip-details/ExpenseCard';
import DisputeModal from '../components/trip-details/DisputeModal';
import MembersListCard from '../components/trip-details/MembersListCard';
import AddExpenseModal from '../components/trip-details/AddExpenseModal';

const TripDetails = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { 
    activeTrip, expenses, loading, error, 
    fetchTripDetails, fetchExpenses, inviteMember, removeMember, addExpense, deleteExpense, deleteTrip 
  } = useTrips();
  const { isOnline } = useSync();

  // Modal open states
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  
  // Action details
  const [disputeExpenseId, setDisputeExpenseId] = useState(null);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [disputes, setDisputes] = useState([]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchDisputes = async () => {
    try {
      if (navigator.onLine) {
        const response = await api.get(`/trips/${tripId}/disputes`);
        setDisputes(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch disputes:", err);
    }
  };

  // Load trip details
  useEffect(() => {
    fetchTripDetails(tripId);
    fetchExpenses(tripId);
    fetchDisputes();
  }, [tripId]);

  // WebSocket live message handler
  const handleWsMessage = useCallback((message) => {
    console.log('Real-Time WS Group Update Received:', message);
    // Refresh group data in background
    fetchTripDetails(tripId);
    fetchExpenses(tripId);
    fetchDisputes();

    // Trigger premium Toast notification
    if (message.type === 'EXPENSE_ADDED') {
      showToast('A new expense was added in real-time!', 'success');
    } else if (message.type === 'EXPENSE_UPDATED') {
      showToast('An expense was updated in real-time!', 'info');
    } else if (message.type === 'EXPENSE_DELETED') {
      showToast('An expense was deleted in real-time!', 'info');
    } else if (message.type === 'DISPUTE_RAISED') {
      showToast('An expense was flagged/disputed!', 'warning');
    } else if (message.type === 'DISPUTE_RESOLVED') {
      showToast('A dispute has been resolved!', 'success');
    } else if (message.type === 'TRIP_SETTLED') {
      showToast('The trip has been finalized and settled!', 'success');
    } else if (message.type === 'MEMBER_ADDED') {
      showToast('A new member has been added to the trip!', 'success');
    } else if (message.type === 'MEMBER_REMOVED') {
      showToast('A member was removed from the trip.', 'info');
    } else if (message.type === 'TRIP_DELETED') {
      showToast('This trip group has been deleted by the leader!', 'warning');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    }
  }, [tripId]);

  // Hook up WebSockets
  useWebSocket(tripId, handleWsMessage);

  // Invite member wrapper passed to subcomponent
  const handleInvite = async (email) => {
    return await inviteMember(tripId, email);
  };

  // Remove member wrapper passed to subcomponent
  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      await removeMember(tripId, userId);
      alert('Member removed successfully!');
    } catch (err) {
      alert(err);
    }
  };

  // Add expense wrapper passed to subcomponent
  const handleAddExpenseSubmit = async (expenseData) => {
    setExpenseLoading(true);
    try {
      await addExpense(tripId, expenseData);
      setShowExpenseModal(false);
      showToast('Expense added successfully!', 'success');
    } catch (err) {
      alert(err || 'Failed to add expense.');
    } finally {
      setExpenseLoading(false);
    }
  };

  // Delete expense wrapper passed to subcomponent
  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await deleteExpense(expenseId);
      showToast('Expense deleted successfully.', 'info');
    } catch (err) {
      alert(err);
    }
  };

  // Raise dispute wrapper passed to subcomponent
  const handleRaiseDisputeSubmit = async (reason) => {
    setDisputeLoading(true);
    try {
      await api.post(`/expenses/${disputeExpenseId}/disputes`, { reason });
      setShowDisputeModal(false);
      setDisputeExpenseId(null);
      showToast('Expense flagged/disputed successfully.', 'warning');
      fetchExpenses(tripId);
      fetchDisputes();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to raise dispute.');
    } finally {
      setDisputeLoading(false);
    }
  };

  // Resolve dispute wrapper passed to subcomponent
  const handleResolveDispute = async (disputeId) => {
    if (!window.confirm('Are you sure you want to resolve this dispute?')) return;
    try {
      await api.put(`/disputes/${disputeId}/resolve`);
      showToast('Dispute resolved successfully!', 'success');
      fetchExpenses(tripId);
      fetchDisputes();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to resolve dispute.');
    }
  };

  const handleDeleteTrip = async () => {
    const confirmDelete = window.confirm(
      "CRITICAL WARNING:\n\nAre you absolutely sure you want to delete this trip?\n\nThis will permanently delete all expenses, disputes, settlements, notifications, and group memberships. This action is irreversible!"
    );
    if (!confirmDelete) return;

    try {
      await deleteTrip(tripId);
      showToast("Trip deleted successfully.", "success");
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (err) {
      alert(err || "Failed to delete trip.");
    }
  };

  if (loading && !activeTrip) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
        <p className="text-slate-400 text-sm">Loading trip details...</p>
      </div>
    );
  }

  if (!activeTrip) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Trip Not Found</h3>
        <p className="text-slate-400 text-sm mb-6">Could not load trip data. Verify your internet connection.</p>
        <Link to="/" className="glow-btn px-6 py-3 bg-slate-800 rounded-2xl text-sm font-semibold">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Get current user ID
  const currentUserId = localStorage.getItem('tripsync_user') 
    ? JSON.parse(localStorage.getItem('tripsync_user')).id 
    : null;

  // Check if current user is leader
  const currentMemberObj = activeTrip.members.find(m => m.userId === currentUserId);
  const isLeader = currentMemberObj?.role === 'LEADER';
  const isTripActive = activeTrip.status === 'ACTIVE';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 relative">
      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed top-6 right-6 z-[999] max-w-sm glass-panel p-4 rounded-2xl shadow-2xl border border-slate-700/60 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            {toast.type === 'success' && <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg"><Sparkles className="w-5 h-5" /></span>}
            {toast.type === 'info' && <span className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg"><Info className="w-5 h-5" /></span>}
            {toast.type === 'warning' && <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg"><ShieldAlert className="w-5 h-5" /></span>}
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{toast.type} Alert</p>
              <p className="text-sm font-bold text-white mt-0.5">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="text-slate-500 hover:text-white text-xs font-bold px-1">&times;</button>
          </div>
        </div>
      )}

      {/* Navigation & Actions Header */}
      <div className="flex items-center justify-between mb-6">
        <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Trips</span>
        </Link>

        {/* Dashboard Analytics & Settlement shortcuts */}
        <div className="flex gap-3">
          <Link 
            to={`/trips/${tripId}/analytics`}
            className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Dashboard</span>
          </Link>
          <Link 
            to={`/trips/${tripId}/settlements`}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Play className="w-4 h-4 shrink-0" />
            <span>Final Settlement</span>
          </Link>
          {isLeader && (activeTrip.status === 'ACTIVE' || activeTrip.status === 'SETTLED') && (
            <button
              onClick={handleDeleteTrip}
              className="px-4 py-2.5 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500 hover:text-slate-950 text-rose-400 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-lg hover:shadow-rose-500/20"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Delete Trip</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Info Header & Expenses/Members Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT 2 COLUMNS: Meta & Expense Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trip Meta Card */}
          <div className="glass-panel rounded-3xl p-5 relative overflow-hidden border border-slate-800/60">
            <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-2xl"></div>
            
            <div className="flex items-center justify-between gap-4 mb-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{activeTrip.name}</h1>
              
              {!isTripActive ? (
                <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-semibold uppercase">
                  Settled
                </span>
              ) : (
                <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold uppercase">
                  Active
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-slate-400 text-xs">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-[var(--text-secondary)]">{activeTrip.destination}</span>
              </div>
              {activeTrip.startDate && activeTrip.endDate && (
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-[var(--text-secondary)]">
                    {new Date(activeTrip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} – {new Date(activeTrip.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>

            {activeTrip.description && (
              <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                  Trip Description
                </span>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed whitespace-pre-line">
                  {activeTrip.description}
                </p>
              </div>
            )}
          </div>

          {/* Expense Log Timeline */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Expenses Log</span>
                <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-lg text-xs">
                  {expenses.length}
                </span>
              </h2>

              {isTripActive && (
                <button
                  onClick={() => setShowExpenseModal(true)}
                  className="glow-btn px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 flex items-center gap-1.5 animate-pulse-subtle"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Expense</span>
                </button>
              )}
            </div>

            {expenses.length === 0 ? (
              <div className="glass-panel p-12 text-center rounded-3xl">
                <p className="text-slate-400 text-sm mb-4">No expenses recorded yet.</p>
                {isTripActive && (
                  <button
                    onClick={() => setShowExpenseModal(true)}
                    className="glow-btn px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold rounded-xl"
                  >
                    Add First Expense
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {expenses.map((expense) => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    currentUserId={currentUserId}
                    isLeader={isLeader}
                    isTripActive={isTripActive}
                    disputes={disputes}
                    onResolveDispute={handleResolveDispute}
                    onDeleteExpense={handleDeleteExpense}
                    onOpenDisputeModal={(id) => {
                      setDisputeExpenseId(id);
                      setShowDisputeModal(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT 1 COLUMN: Members list & Invites */}
        <div className="space-y-6">
          <MembersListCard
            members={activeTrip.members}
            isLeader={isLeader}
            isTripActive={isTripActive}
            currentUserId={currentUserId}
            isOnline={isOnline}
            onInvite={handleInvite}
            onRemoveMember={handleRemoveMember}
          />
        </div>
      </div>

      {/* ADD EXPENSE MODAL */}
      <AddExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        members={activeTrip.members}
        currentUserId={currentUserId}
        onSubmit={handleAddExpenseSubmit}
        loading={expenseLoading}
      />

      {/* DISPUTE EXPENSE MODAL */}
      <DisputeModal
        isOpen={showDisputeModal}
        onClose={() => {
          setShowDisputeModal(false);
          setDisputeExpenseId(null);
        }}
        onSubmit={handleRaiseDisputeSubmit}
        loading={disputeLoading}
      />
    </div>
  );
};

export default TripDetails;
