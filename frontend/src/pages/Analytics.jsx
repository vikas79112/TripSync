import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTrips } from '../context/TripContext';
import { useSync } from '../context/SyncContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { 
  ArrowLeft, Sparkles, IndianRupee, TrendingUp, Tag, 
  Users, Award, Calendar, CloudLightning, AlertCircle, Loader2,
  Clipboard, ArrowRight, UserPlus, CheckCircle2, Wifi, Play,
  HelpCircle, Info, RefreshCw, ShieldAlert, HeartHandshake,
  Utensils, Hotel, Car, Fuel, ShoppingBag, Ticket, UserCheck
} from 'lucide-react';

const CATEGORIES = {
  FOOD: { label: 'Food', color: 'bg-orange-500', text: 'text-orange-500', icon: Utensils },
  HOTEL: { label: 'Hotel & Stay', color: 'bg-purple-500', text: 'text-purple-500', icon: Hotel },
  TRANSPORT: { label: 'Transport', color: 'bg-blue-500', text: 'text-blue-500', icon: Car },
  FUEL: { label: 'Fuel & Tolls', color: 'bg-amber-500', text: 'text-amber-500', icon: Fuel },
  SHOPPING: { label: 'Shopping', color: 'bg-pink-500', text: 'text-pink-500', icon: ShoppingBag },
  TICKETS: { label: 'Tickets & Entry', color: 'bg-cyan-500', text: 'text-cyan-500', icon: Ticket },
  OTHER: { label: 'Other', color: 'bg-slate-500', text: 'text-slate-400', icon: HelpCircle }
};

const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

const Analytics = () => {
  const { tripId } = useParams();
  const { activeTrip, expenses, fetchTripDetails, fetchExpenses } = useTrips();
  const { isOnline, pendingCount } = useSync();
  const { isDark } = useTheme();

  const [settlements, setSettlements] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLocalData, setIsLocalData] = useState(false);
  const [showSimplifyExplainer, setShowSimplifyExplainer] = useState(false);

  // Get current user ID
  const currentUserId = localStorage.getItem('tripsync_user') 
    ? JSON.parse(localStorage.getItem('tripsync_user')).id 
    : null;

  // Load trip context data first if not loaded
  useEffect(() => {
    if (!activeTrip) {
      fetchTripDetails(tripId);
    }
    if (expenses.length === 0) {
      fetchExpenses(tripId);
    }
  }, [tripId, activeTrip, expenses]);

  // Load analytics & settlements
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setErrorMsg('');
      setIsLocalData(false);

      if (isOnline) {
        try {
          // Fetch settlements
          const settlementsRes = await api.get(`/trips/${tripId}/settlements`);
          setSettlements(settlementsRes.data);

          // Fetch disputes
          const disputesRes = await api.get(`/trips/${tripId}/disputes`);
          setDisputes(disputesRes.data);
        } catch (err) {
          console.warn('Failed to fetch backend data. Falling back to local computations...', err);
          computeLocalFallback();
        } finally {
          setLoading(false);
        }
      } else {
        computeLocalFallback();
        setLoading(false);
      }
    };

    if (activeTrip) {
      loadDashboardData();
    }
  }, [tripId, isOnline, activeTrip, expenses]);

  // Greed-Based Debt Simplifier Fallback
  const computeLocalFallback = () => {
    if (!activeTrip) return;
    setIsLocalData(true);

    try {
      // Calculate individual net balances
      const balances = {};
      activeTrip.members.forEach(m => {
        balances[m.userId] = 0;
      });

      expenses.forEach(e => {
        const paidById = e.paidBy?.userId || e.paidBy?.id;
        if (paidById && balances[paidById] !== undefined) {
          balances[paidById] += parseFloat(e.amount || 0);
        }
        if (e.participants && e.participants.length > 0) {
          e.participants.forEach(p => {
            const pId = p.userId || p.id;
            if (pId && balances[pId] !== undefined) {
              balances[pId] -= parseFloat(p.shareAmount || 0);
            }
          });
        }
      });

      // Split into debtors & creditors
      const debtors = [];
      const creditors = [];

      Object.entries(balances).forEach(([userId, bal]) => {
        const member = activeTrip.members.find(m => m.userId === userId || m.id === userId);
        if (!member) return;
        const roundedBal = parseFloat(bal.toFixed(2));
        if (roundedBal < -0.01) {
          debtors.push({ member, balance: roundedBal });
        } else if (roundedBal > 0.01) {
          creditors.push({ member, balance: roundedBal });
        }
      });

      // Sort
      debtors.sort((a, b) => a.balance - b.balance);
      creditors.sort((a, b) => b.balance - a.balance);

      const localSettlements = [];
      let dIdx = 0;
      let cIdx = 0;

      while (dIdx < debtors.length && cIdx < creditors.length) {
        const debtor = debtors[dIdx];
        const creditor = creditors[cIdx];

        const oweAmount = Math.min(-debtor.balance, creditor.balance);
        if (oweAmount > 0.01) {
          localSettlements.push({
            id: `local-${dIdx}-${cIdx}`,
            debtor: {
              id: debtor.member.userId || debtor.member.id,
              name: debtor.member.name
            },
            creditor: {
              id: creditor.member.userId || creditor.member.id,
              name: creditor.member.name
            },
            amount: parseFloat(oweAmount.toFixed(2)),
            status: 'PENDING'
          });
        }

        debtor.balance += oweAmount;
        creditor.balance -= oweAmount;

        if (Math.abs(debtor.balance) < 0.01) dIdx++;
        if (Math.abs(creditor.balance) < 0.01) cIdx++;
      }

      setSettlements(localSettlements);

      // Map offline disputes from expense status
      const localDisputes = expenses
        .filter(e => e.isDisputed)
        .map(e => ({
          expenseId: e.id,
          status: 'OPEN',
          reason: 'Disputed'
        }));
      setDisputes(localDisputes);
    } catch (err) {
      console.error('Failed to compute settlements locally:', err);
    }
  };

  // Compile calculations for Dashboard UI
  const totalExpense = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  // Compute Current User Share & Net Balance
  let yourPaid = 0;
  let yourShare = 0;
  expenses.forEach(e => {
    const paidById = e.paidBy?.userId || e.paidBy?.id;
    if (paidById === currentUserId) {
      yourPaid += parseFloat(e.amount || 0);
    }
    if (e.participants && e.participants.length > 0) {
      e.participants.forEach(p => {
        const pId = p.userId || p.id;
        if (pId === currentUserId) {
          yourShare += parseFloat(p.shareAmount || 0);
        }
      });
    }
  });
  const netBalance = yourPaid - yourShare;

  // Compute top spender
  const spendMap = {};
  activeTrip?.members.forEach(m => {
    spendMap[m.name] = 0;
  });
  expenses.forEach(e => {
    const payerName = e.paidBy?.name;
    if (payerName && spendMap[payerName] !== undefined) {
      spendMap[payerName] += parseFloat(e.amount || 0);
    }
  });

  let topSpenderName = 'No spending';
  let topSpenderAmount = 0;
  Object.entries(spendMap).forEach(([name, amt]) => {
    if (amt > topSpenderAmount) {
      topSpenderName = name;
      topSpenderAmount = amt;
    }
  });

  // Calculate member balances tracking contributed vs share
  const memberBalances = (activeTrip?.members || []).map(m => {
    let contributed = 0;
    let share = 0;
    expenses.forEach(e => {
      const paidById = e.paidBy?.userId || e.paidBy?.id;
      if (paidById === m.userId) {
        contributed += parseFloat(e.amount || 0);
      }
      if (e.participants && e.participants.length > 0) {
        e.participants.forEach(p => {
          const pId = p.userId || p.id;
          if (pId === m.userId) {
            share += parseFloat(p.shareAmount || 0);
          }
        });
      }
    });
    return {
      userId: m.userId,
      name: m.name,
      contributed,
      share,
      net: contributed - share
    };
  }).sort((a, b) => b.net - a.net);

  // Calculate category progress breakdown
  const categoryTotals = {};
  Object.keys(CATEGORIES).forEach(c => { categoryTotals[c] = 0; });
  expenses.forEach(e => {
    const cat = e.category ? e.category.toUpperCase() : 'OTHER';
    if (categoryTotals[cat] !== undefined) {
      categoryTotals[cat] += parseFloat(e.amount || 0);
    } else {
      categoryTotals['OTHER'] += parseFloat(e.amount || 0);
    }
  });

  const categoryProgress = Object.entries(categoryTotals)
    .filter(([_, amt]) => amt > 0)
    .map(([key, amt]) => {
      const pct = totalExpense > 0 ? (amt / totalExpense) * 100 : 0;
      return {
        key,
        amount: amt,
        percentage: parseFloat(pct.toFixed(1)),
        ...CATEGORIES[key]
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // Generate Activity Feed Chronologically
  const generateActivities = () => {
    const feed = [];
    if (!activeTrip) return feed;

    // Member Joins
    activeTrip.members.forEach(m => {
      feed.push({
        id: `m-join-${m.userId || m.id}`,
        type: 'JOIN',
        title: `${m.name} joined the trip`,
        timestamp: activeTrip.createdAt || new Date().toISOString(),
        icon: UserPlus,
        colorBg: 'bg-violet-500/10 text-violet-500 border border-violet-500/20'
      });
    });

    // Expenses added
    expenses.forEach(e => {
      feed.push({
        id: `exp-add-${e.id}`,
        type: 'EXPENSE',
        title: `${e.paidBy?.name || 'Someone'} added "${e.title}"`,
        timestamp: e.expenseDate || e.createdAt,
        meta: formatINR(e.amount),
        icon: IndianRupee,
        colorBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      });
    });

    // Disputes
    disputes.forEach(d => {
      const expTitle = expenses.find(e => e.id === d.expenseId)?.title || 'Expense';
      feed.push({
        id: `disp-${d.id || d.expenseId}`,
        type: d.status === 'OPEN' ? 'DISPUTE_RAISED' : 'DISPUTE_RESOLVED',
        title: d.status === 'OPEN' 
          ? `Dispute raised on "${expTitle}"` 
          : `Dispute on "${expTitle}" resolved`,
        timestamp: d.updatedAt || d.createdAt || new Date().toISOString(),
        meta: d.status === 'OPEN' ? 'Disputed' : 'Resolved',
        icon: ShieldAlert,
        colorBg: d.status === 'OPEN' 
          ? 'bg-red-500/10 text-red-500 border border-red-500/20'
          : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
      });
    });

    // Settlement generated / finalized status
    if (activeTrip.status === 'SETTLED') {
      feed.push({
        id: `trip-settled-${activeTrip.id}`,
        type: 'SETTLED',
        title: `Trip finalized and settled`,
        timestamp: activeTrip.updatedAt || activeTrip.createdAt || new Date().toISOString(),
        meta: 'Settled',
        icon: CheckCircle2,
        colorBg: 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
      });
    }

    // Sort newest first
    feed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return feed.slice(0, 10);
  };

  const activities = generateActivities();

  // Clipboard Copier
  const handleCopyLedger = () => {
    if (settlements.length === 0) {
      alert('All settled up! No outstanding payments to share.');
      return;
    }
    const header = `TripSync Ledger: ${activeTrip?.name} (${activeTrip?.destination})\n`;
    const rows = settlements.map(s => {
      const isPaid = s.status === 'PAID';
      return `• ${s.debtor.name} owes ${s.creditor.name} → ₹${parseFloat(s.amount).toFixed(0)} [${isPaid ? 'PAID' : 'PENDING'}]`;
    }).join('\n');

    navigator.clipboard.writeText(`${header}${rows}`);
    alert('Settlement summary copied to clipboard!');
  };

  if (loading && !activeTrip) {
    return (
      <div className="flex flex-col items-center justify-center py-36 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
        <p className="text-slate-400 text-sm">Organizing trip command center...</p>
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

  const activeDisputesCount = expenses.filter(e => e.isDisputed).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header Connection Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div className="space-y-1">
          <Link to={`/trips/${tripId}`} className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-sm font-semibold mb-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {activeTrip.name}</span>
          </Link>
          <h1 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-400" />
            <span>Trip Command Center</span>
          </h1>
        </div>

        {/* Sync status pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {pendingCount > 0 ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-semibold animate-pulse">
              <CloudLightning className="w-4 h-4 shrink-0 animate-bounce" />
              <span>{pendingCount} pending sync</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>All expenses synced</span>
            </div>
          )}

          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-500/15 border border-slate-500/20 text-slate-400 rounded-xl text-xs font-semibold">
              <Wifi className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* PART 1 — COMPACT SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total spend */}
        <div className="glass-panel p-4 relative overflow-hidden flex flex-col justify-between h-28 border border-[var(--border-subtle)] bg-[var(--surface)]">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Spend</span>
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight leading-none">
              {formatINR(totalExpense)}
            </h3>
            <p className="text-[9px] text-[var(--text-muted)] mt-1.5 font-medium">Group total expenses</p>
          </div>
        </div>

        {/* Your Share */}
        <div className="glass-panel p-4 relative overflow-hidden flex flex-col justify-between h-28 border border-[var(--border-subtle)] bg-[var(--surface)]">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Your Share</span>
            <Award className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight leading-none">
              {formatINR(yourShare)}
            </h3>
            <p className="text-[9px] text-[var(--text-muted)] mt-1.5 font-medium">Your individual portion</p>
          </div>
        </div>

        {/* Personal Balance - PART 6 */}
        <div className={`glass-panel p-4 relative overflow-hidden flex flex-col justify-between h-28 border transition-all ${
          netBalance > 0.01 
            ? 'border-emerald-500/30 bg-emerald-500/5' 
            : netBalance < -0.01 
              ? 'border-red-500/30 bg-red-500/5' 
              : 'border-[var(--border-subtle)] bg-[var(--surface)]'
        }`}>
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Personal Balance</span>
            <UserCheck className={`w-4 h-4 ${
              netBalance > 0.01 
                ? 'text-emerald-400' 
                : netBalance < -0.01 
                  ? 'text-red-400' 
                  : 'text-slate-400'
            }`} />
          </div>
          <div>
            {netBalance > 0.01 ? (
              <h3 className="text-sm font-black text-emerald-400 tracking-tight leading-tight">
                You are owed <span className="text-lg block font-black">{formatINR(netBalance)}</span>
              </h3>
            ) : netBalance < -0.01 ? (
              <h3 className="text-sm font-black text-red-400 tracking-tight leading-tight">
                You owe <span className="text-lg block font-black">{formatINR(Math.abs(netBalance))}</span>
              </h3>
            ) : (
              <h3 className="text-lg font-black text-slate-400 tracking-tight leading-none">
                Settled Up
              </h3>
            )}
            <p className="text-[9px] text-[var(--text-muted)] mt-1.5 font-medium">Your net financial standing</p>
          </div>
        </div>

        {/* Top Spender */}
        <div className="glass-panel p-4 relative overflow-hidden flex flex-col justify-between h-28 border border-[var(--border-subtle)] bg-[var(--surface)]">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Top Spender</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[var(--text-primary)] truncate max-w-[130px] leading-tight" title={topSpenderName}>
              {topSpenderName}
            </h3>
            <p className="text-[10px] text-purple-400 font-semibold mt-1.5">{formatINR(topSpenderAmount)} paid</p>
          </div>
        </div>

        {/* Pending approvals / disputes - PART 2 */}
        <div className="glass-panel p-4 relative overflow-hidden flex flex-col justify-between h-28 col-span-2 md:col-span-1 border border-[var(--border-subtle)] bg-[var(--surface)]">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Approvals</span>
            <ShieldAlert className={`w-4 h-4 ${activeDisputesCount > 0 ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
          </div>
          <div>
            <h3 className="text-sm font-black text-[var(--text-primary)] tracking-tight leading-tight">
              {activeDisputesCount > 0 
                ? `${activeDisputesCount} awaiting approval` 
                : 'All approved'}
            </h3>
            <p className={`text-[9px] font-bold mt-1.5 ${activeDisputesCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {activeDisputesCount > 0 ? 'Requires attention' : 'All clear'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Command Dashboard Layout splits settlements and breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT 2 COLUMNS: SETTLEMENTS LEDGER */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-5 space-y-4 border border-[var(--border-subtle)] bg-[var(--surface)]">
            
            {/* Settlement Header - PART 1 */}
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                  <HeartHandshake className="w-5 h-5 text-emerald-400" />
                  <span>Who Owes Who</span>
                </h3>
                <p className="text-[var(--text-muted)] text-[11px] mt-0.5">
                  {activeTrip.status === 'ACTIVE' 
                    ? 'Dynamic dynamic calculations preview of outstanding peer debts' 
                    : 'Official locked final settlement payment sheet'}
                </p>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLedger}
                  title="Copy settlement summary"
                  className="p-2 bg-[var(--surface-elevated)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] hover:border-[var(--text-muted)] text-[var(--text-secondary)] rounded-xl transition-all cursor-pointer"
                >
                  <Clipboard className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowSimplifyExplainer(!showSimplifyExplainer)}
                  title="Simplify debts explanation"
                  className={`p-2 rounded-xl transition-all cursor-pointer border ${showSimplifyExplainer ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-[var(--surface-elevated)] border-[var(--border-subtle)] text-[var(--text-muted)]'}`}
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Offline calculations banner */}
            {isLocalData && settlements.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-amber-500 text-[10px] leading-snug">
                <CloudLightning className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Showing offline calculated dynamic ledger. Transactions will sync with backend cloud once online.</span>
              </div>
            )}

            {/* Collapsible Simplify explanation */}
            {showSimplifyExplainer && (
              <div className="bg-[var(--surface-elevated)] p-4 rounded-2xl border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <h4 className="font-bold text-[var(--text-primary)]">How does TripSync simplify debts?</h4>
                <p className="leading-relaxed text-[var(--text-muted)]">
                  TripSync runs a greed-based transaction minimization engine. It aggregates all expenses, calculates each member's net contribution (Paid - Share), and matches debtors with creditors. 
                </p>
                <p className="leading-relaxed text-[var(--text-muted)]">
                  Instead of paying multiple people back for individual meals or tickets, members only make the minimum possible payments to clear the trip balance completely.
                </p>
              </div>
            )}

            {/* Settlements list - PART 3 (Simplified Rows) */}
            {settlements.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-[var(--text-primary)]">All Balanced!</h4>
                <p className="text-[var(--text-muted)] text-xs max-w-sm mx-auto leading-normal">
                  All expenses are split evenly. No outstanding peer-to-peer debts are owed at this time.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {settlements.map((s) => {
                  const isUserDebtor = s.debtor.id === currentUserId;
                  const isUserCreditor = s.creditor.id === currentUserId;
                  const isPaid = s.status === 'PAID';

                  return (
                    <div 
                      key={s.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-[var(--surface-elevated)] border rounded-2xl transition-all gap-3 ${
                        isPaid 
                          ? 'opacity-55 border-[var(--border-subtle)]' 
                          : isUserDebtor 
                            ? 'border-red-500/20 bg-red-500/5 hover:border-red-500/30' 
                            : isUserCreditor 
                              ? 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/30' 
                              : 'border-[var(--border-subtle)] hover:border-[var(--text-muted)]'
                      }`}
                    >
                      {/* Left: Debtor and Creditor names */}
                      <div className="flex items-center gap-2 min-w-0 flex-wrap text-sm">
                        <span className={`font-bold ${isUserDebtor ? 'text-red-400 font-black' : 'text-[var(--text-primary)]'} truncate`}>
                          {s.debtor.name} {isUserDebtor && <span className="font-extrabold text-[9px] uppercase text-red-500/80">(You)</span>}
                        </span>
                        
                        <span className="text-[9px] font-black uppercase tracking-wider bg-[var(--surface)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-md text-[var(--text-muted)] select-none">
                          owes
                        </span>
                        
                        <span className={`font-bold ${isUserCreditor ? 'text-emerald-400 font-black' : 'text-[var(--text-primary)]'} truncate`}>
                          {s.creditor.name} {isUserCreditor && <span className="font-extrabold text-[9px] uppercase text-emerald-500/80">(You)</span>}
                        </span>
                      </div>

                      {/* Right: Amount and Status Tag */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span className="font-black text-base text-[var(--text-primary)]">
                          {formatINR(s.amount)}
                        </span>
                        
                        {isPaid ? (
                          <span className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black rounded-lg uppercase select-none">
                            Paid
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black rounded-lg uppercase select-none">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PART 4 — RECENT ACTIVITY FEED */}
          <div className="glass-panel p-5 space-y-4 border border-[var(--border-subtle)] bg-[var(--surface)]">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <span>Recent Activity</span>
              </h3>
              <span className="text-[9px] uppercase font-bold tracking-wider bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-lg text-[var(--text-muted)] select-none">
                Live Feed
              </span>
            </div>

            {activities.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                No activity logged yet.
              </div>
            ) : (
              <div className="relative border-l border-[var(--border-subtle)] pl-4 ml-2.5 py-1.5 space-y-4">
                {activities.map((act) => {
                  const IconComponent = act.icon;
                  return (
                    <div key={act.id} className="relative flex items-start gap-3 text-xs leading-normal">
                      {/* Timeline Bullet Icon */}
                      <div className={`absolute -left-[24.5px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center ${act.colorBg}`}>
                        <IconComponent className="w-3 h-3" />
                      </div>

                      {/* Content details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-[var(--text-primary)] text-sm tracking-tight leading-snug">
                          {act.title}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">
                          {new Date(act.timestamp).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>

                      {act.meta && (
                        <span className="text-[10px] font-black text-[var(--text-secondary)] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-lg shrink-0 select-none">
                          {act.meta}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CATEGORY BREAKDOWN & MEMBER BALANCES */}
        <div className="space-y-6">
          
          {/* PART 5 — MEMBER BALANCES */}
          <div className="glass-panel p-5 space-y-4 border border-[var(--border-subtle)] bg-[var(--surface)]">
            <div>
              <h3 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <span>Member Balances</span>
              </h3>
              <p className="text-[var(--text-muted)] text-[11px] mt-0.5">
                Total contributions and net group balances.
              </p>
            </div>

            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {memberBalances.map((m) => {
                const isCurrentUser = m.userId === currentUserId;
                const isCreditor = m.net > 0.01;
                const isDebtor = m.net < -0.01;

                return (
                  <div 
                    key={m.userId} 
                    className={`flex items-center justify-between gap-3 p-3 bg-[var(--surface-elevated)] rounded-2xl border transition-all ${
                      isCurrentUser 
                        ? isCreditor 
                          ? 'border-emerald-500/25 bg-emerald-500/5' 
                          : isDebtor 
                            ? 'border-red-500/25 bg-red-500/5' 
                            : 'border-[var(--text-muted)]'
                        : 'border-[var(--border-subtle)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.name)}`} 
                        alt={m.name} 
                        className="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)]"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate flex items-center gap-1">
                          <span>{m.name}</span>
                          {isCurrentUser && (
                            <span className="text-[8px] font-black uppercase text-[var(--text-muted)]">(You)</span>
                          )}
                        </p>
                        <p className="text-[9px] text-[var(--text-muted)] mt-0.5 font-medium">
                          Paid: <span className="font-semibold text-[var(--text-secondary)]">{formatINR(m.contributed)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isCreditor ? (
                        <span className="text-xs font-extrabold text-emerald-400">
                          +{formatINR(m.net)}
                        </span>
                      ) : isDebtor ? (
                        <span className="text-xs font-extrabold text-red-400">
                          -{formatINR(Math.abs(m.net))}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-500">
                          Settled
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Link 
              to={`/trips/${tripId}`}
              className="glow-btn block w-full py-3.5 text-xs text-center rounded-xl flex items-center justify-center gap-1.5"
            >
              <span>Go to Expenses Log</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* EXPENSE CATEGORY BREAKDOWN */}
          <div className="glass-panel p-5 space-y-4 border border-[var(--border-subtle)] bg-[var(--surface)]">
            <div>
              <h3 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-400" strokeWidth={2.2} />
                <span>Expense Breakdown</span>
              </h3>
              <p className="text-[var(--text-muted)] text-[11px] mt-0.5">
                Distribution of travel expenses across categories.
              </p>
            </div>

            {categoryProgress.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                No categorized items available yet.
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {categoryProgress.map((cat) => {
                  const CatIcon = cat.icon;
                  return (
                    <div key={cat.key} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2 text-[var(--text-secondary)] font-bold">
                          <span className={`p-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] ${cat.text}`}>
                            <CatIcon className="w-3.5 h-3.5" />
                          </span>
                          <span>{cat.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-[var(--text-primary)]">{formatINR(cat.amount)}</span>
                          <span className="text-[9px] text-[var(--text-muted)] ml-1">({cat.percentage}%)</span>
                        </div>
                      </div>

                      {/* Custom Responsive Progress Bar */}
                      <div className="w-full bg-[var(--surface-elevated)] h-1.5 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                        <div 
                          className={`${cat.color} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
