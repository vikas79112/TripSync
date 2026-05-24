import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTrips } from '../context/TripContext';
import { useSync } from '../context/SyncContext';
import api from '../services/api';
import { 
  ArrowLeft, CheckCircle2, AlertCircle, Loader2, 
  DollarSign, UserCheck, Play, CreditCard, ShieldAlert, 
  Sparkles, CalendarClock
} from 'lucide-react';

const Settlements = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { activeTrip, fetchTripDetails } = useTrips();
  const { isOnline } = useSync();

  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Refresh data
  const loadSettlements = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // We must fetch settlements. If offline, the backend is not reachable.
      // We'll try to fetch from API. If it fails and we are offline, let the user know.
      const response = await api.get(`/trips/${tripId}/settlements`);
      setSettlements(response.data);
    } catch (err) {
      console.error('Failed to load settlements:', err);
      setErrorMsg('Could not fetch settlements from backend. Endpoints might require internet connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeTrip) {
      fetchTripDetails(tripId);
    }
    loadSettlements();
  }, [tripId, activeTrip]);

  const handleSettleTrip = async () => {
    if (!window.confirm('Are you sure you want to end this trip and lock all balances? This action is irreversible and active members will not be able to add or delete expenses anymore.')) return;
    
    setActionError('');
    setActionLoading(true);
    try {
      const response = await api.post(`/trips/${tripId}/settle`);
      setSettlements(response.data);
      // Refresh active trip state to get updated SETTLED status
      await fetchTripDetails(tripId);
      alert('Trip ended and settlements generated successfully!');
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Failed to settle trip.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsPaid = async (settlementId) => {
    if (!window.confirm('Are you sure you want to mark this transaction as PAID?')) return;

    setActionError('');
    try {
      const response = await api.post(`/settlements/${settlementId}/pay`);
      
      // Update local state to reflect paid status immediately
      setSettlements(prev => prev.map(s => {
        if (s.id === settlementId) {
          return { 
            ...s, 
            status: 'PAID', 
            settledAt: response.data.settledAt || new Date().toISOString() 
          };
        }
        return s;
      }));

      alert('Settlement transaction marked as paid!');
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to mark settlement as paid.');
    }
  };

  if (loading && !activeTrip) {
    return (
      <div className="flex flex-col items-center justify-center py-36 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
        <p className="text-slate-400 text-sm">Computing settlements matrix...</p>
      </div>
    );
  }

  if (!activeTrip) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Trip Not Found</h3>
        <p className="text-slate-400 text-sm mb-6">Could not load trip data.</p>
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link to={`/trips/${tripId}`} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold mb-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {activeTrip.name}</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2.5">
            <CreditCard className="w-8 h-8 text-emerald-400" />
            <span>Group Settlements</span>
          </h1>
        </div>

        {/* Dynamic State Badge */}
        {activeTrip.status === 'SETTLED' ? (
          <span className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider self-start md:self-auto flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Trip Finalized & Settled</span>
          </span>
        ) : (
          <span className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider self-start md:self-auto flex items-center gap-1.5 animate-pulse">
            <Sparkles className="w-4 h-4" />
            <span>Dynamic Calculations Preview</span>
          </span>
        )}
      </div>

      {actionError && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Trip Summary & End-Trip controls */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 space-y-4">
            <h3 className="text-lg font-bold text-white mb-2">Trip Status Summary</h3>
            
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">Group Name:</span>
                <span className="font-semibold text-white">{activeTrip.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">Destination:</span>
                <span className="font-semibold text-white">{activeTrip.destination}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">Total Transactions:</span>
                <span className="font-semibold text-emerald-400 font-bold">{settlements.length} payments</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-slate-400">Lock State:</span>
                <span className={activeTrip.status === 'SETTLED' ? 'text-blue-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {activeTrip.status === 'SETTLED' ? 'Locked (Final)' : 'Unlocked (Active)'}
                </span>
              </div>
            </div>

            {/* End Trip button (If Active, online, and Leader) */}
            {activeTrip.status === 'ACTIVE' && (
              <div className="border-t border-slate-800/80 pt-4 space-y-3">
                {isLeader ? (
                  <>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      As the trip leader, you can end this trip once travel finishes. This runs the greed-based cash minimizer and generates a locked, editable payment sheet for everyone.
                    </p>
                    <button
                      onClick={handleSettleTrip}
                      disabled={actionLoading || !isOnline}
                      className={`glow-btn w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 uppercase tracking-wider ${actionLoading || !isOnline ? 'opacity-50 cursor-not-allowed shadow-none' : ''}`}
                    >
                      {actionLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Play className="w-4 h-4 shrink-0 fill-current" />
                          <span>End Trip & Lock Balances</span>
                        </>
                      )}
                    </button>
                    {!isOnline && (
                      <p className="text-[10px] text-amber-500 text-center flex items-center justify-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span>Requires internet to finalize trip.</span>
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex items-start gap-2 p-3.5 bg-slate-900/40 border border-slate-900 rounded-2xl">
                    <ShieldAlert className="w-4.5 h-4.5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Only the trip leader (<span className="text-slate-300 font-semibold">{activeTrip.members.find(m => m.role === 'LEADER')?.name || 'Leader'}</span>) has authority to end this trip and lock settlements.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT 2 COLUMNS: Settlements log */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Payment Clear-Out Plan</span>
            <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-lg text-xs">
              {settlements.length}
            </span>
          </h3>

          {errorMsg && (
            <div className="glass-panel p-12 text-center rounded-3xl border border-slate-800">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">{errorMsg}</p>
            </div>
          )}

          {settlements.length === 0 ? (
            <div className="glass-panel p-16 text-center rounded-3xl border border-slate-800/60">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h4 className="text-lg font-bold text-white mb-2">Everything Settled!</h4>
              <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
                All participant shares match their contributions exactly. No outstanding debts are owed by anyone in this group!
              </p>
            </div>
          ) : (
            <div className="space-y-4.5">
              {settlements.map((settlement, idx) => {
                const isUserDebtor = settlement.debtor.id === currentUserId;
                const isUserCreditor = settlement.creditor.id === currentUserId;
                const isParticipant = isUserDebtor || isUserCreditor;
                const isPaid = settlement.status === 'PAID';

                return (
                  <div 
                    key={settlement.id || idx}
                    className={`glass-panel p-5 border border-[var(--border-subtle)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:border-[var(--text-muted)] hover:shadow-md ${isPaid ? 'opacity-55' : ''}`}
                  >
                    {/* Debtor -> Creditor graphic */}
                    <div className="flex flex-1 items-center gap-4 flex-wrap w-full md:w-auto min-w-0">
                      <div className="flex items-center gap-3">
                        <img 
                          src={settlement.debtor.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(settlement.debtor.name)}`} 
                          alt={settlement.debtor.name} 
                          className="w-9 h-9 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)]"
                        />
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                            <span>{settlement.debtor.name}</span>
                            {isUserDebtor && (
                              <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[9px] font-black uppercase rounded">You</span>
                            )}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">Debtor</p>
                        </div>
                      </div>

                      {/* Arrow indicator */}
                      <div className="flex-1 max-w-[80px] h-[1px] bg-[var(--border-subtle)] relative hidden md:block">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-[8px] rounded-full uppercase font-black tracking-wider">
                          owes
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <img 
                          src={settlement.creditor.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(settlement.creditor.name)}`} 
                          alt={settlement.creditor.name} 
                          className="w-9 h-9 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)]"
                        />
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                            <span>{settlement.creditor.name}</span>
                            {isUserCreditor && (
                              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase rounded">You</span>
                            )}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">Creditor</p>
                        </div>
                      </div>
                    </div>

                    {/* Amount & Status control */}
                    <div className="flex items-center justify-between md:justify-end gap-5 w-full md:w-auto border-t border-[var(--border-subtle)] pt-3.5 md:pt-0 md:border-none">
                      <div className="text-left md:text-right">
                        <p className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                          {new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            maximumFractionDigits: 0
                          }).format(settlement.amount)}
                        </p>
                        {isPaid && settlement.settledAt && (
                          <p className="text-[9px] text-[var(--text-muted)] italic mt-0.5 flex items-center gap-1 md:justify-end">
                            <CalendarClock className="w-3 h-3" />
                            <span>Paid {new Date(settlement.settledAt).toLocaleDateString()}</span>
                          </p>
                        )}
                      </div>

                      {/* Status marker / pay button */}
                      {isPaid ? (
                        <span className="px-3.5 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase rounded-xl flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Paid</span>
                        </span>
                      ) : activeTrip.status === 'SETTLED' ? (
                        (isParticipant || isLeader) && isOnline ? (
                          <button
                            onClick={() => handleMarkAsPaid(settlement.id)}
                            className="glow-btn px-4 py-2 text-xs font-bold flex items-center gap-1"
                          >
                            <span>Mark Paid</span>
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-[10px] font-bold uppercase rounded-xl flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                            <span>Pending</span>
                          </span>
                        )
                      ) : (
                        <span className="px-3 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-[10px] font-bold uppercase rounded-xl flex items-center gap-1">
                          <span>Preview</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Settlements;
