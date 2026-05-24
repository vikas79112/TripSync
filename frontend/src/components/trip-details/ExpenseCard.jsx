import React from 'react';
import { 
  Utensils, Hotel, Car, Fuel, ShoppingBag, Ticket, HelpCircle, 
  CloudLightning, ShieldAlert, Trash2 
} from 'lucide-react';

const CATEGORY_CONFIGS = {
  FOOD: {
    icon: Utensils,
    bg: 'bg-orange-500/10 text-orange-500 border border-orange-500/25',
    badgeBg: 'bg-orange-500/15 border border-orange-500/20 text-orange-500',
  },
  HOTEL: {
    icon: Hotel,
    bg: 'bg-purple-500/10 text-purple-500 border border-purple-500/25',
    badgeBg: 'bg-purple-500/15 border border-purple-500/20 text-purple-500',
  },
  TRANSPORT: {
    icon: Car,
    bg: 'bg-blue-500/10 text-blue-500 border border-blue-500/25',
    badgeBg: 'bg-blue-500/15 border border-blue-500/20 text-blue-500',
  },
  FUEL: {
    icon: Fuel,
    bg: 'bg-amber-500/10 text-amber-500 border border-amber-500/25',
    badgeBg: 'bg-amber-500/15 border border-amber-500/20 text-amber-500',
  },
  SHOPPING: {
    icon: ShoppingBag,
    bg: 'bg-pink-500/10 text-pink-500 border border-pink-500/25',
    badgeBg: 'bg-pink-500/15 border border-pink-500/20 text-pink-500',
  },
  TICKETS: {
    icon: Ticket,
    bg: 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/25',
    badgeBg: 'bg-cyan-500/15 border border-cyan-500/20 text-cyan-500',
  },
  OTHER: {
    icon: HelpCircle,
    bg: 'bg-slate-500/10 text-[var(--text-muted)] border border-slate-500/25',
    badgeBg: 'bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)]',
  }
};

const ExpenseCard = ({ 
  expense, 
  currentUserId, 
  isLeader, 
  isTripActive, 
  disputes = [], 
  onResolveDispute, 
  onDeleteExpense, 
  onOpenDisputeModal 
}) => {
  const activeDispute = disputes.find(d => d.expenseId === expense.id && d.status === 'OPEN');
  
  const catKey = expense.category ? expense.category.toUpperCase() : 'OTHER';
  const config = CATEGORY_CONFIGS[catKey] || CATEGORY_CONFIGS.OTHER;
  const CategoryIcon = config.icon;

  return (
    <div className="glass-panel rounded-2xl p-5 border border-[var(--border-subtle)] hover:border-[var(--text-muted)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group">
      <div className="flex gap-4 items-start w-full md:w-auto min-w-0">
        {/* Category Icon Badge */}
        <div className={`w-11 h-11 rounded-xl shrink-0 flex items-center justify-center ${config.bg}`}>
          <CategoryIcon className="w-5 h-5" strokeWidth={2} />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-[var(--text-primary)] text-base leading-snug truncate">{expense.title}</h4>
            <span className={`px-2 py-0.5 text-[9px] uppercase font-extrabold rounded-md tracking-wider shrink-0 ${config.badgeBg}`}>
              {expense.category}
            </span>
            
            {/* Sync Pending Badge */}
            {expense.isOffline && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold rounded-md shrink-0">
                <CloudLightning className="w-3 h-3" />
                <span>Pending Sync</span>
              </span>
            )}

            {/* Disputed Badge */}
            {expense.isDisputed && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold rounded-md shrink-0">
                <ShieldAlert className="w-3 h-3 animate-pulse" />
                <span>Disputed</span>
              </span>
            )}
          </div>

          <p className="text-[var(--text-muted)] text-xs mt-1">
            Paid by <span className="text-[var(--text-secondary)] font-semibold">{expense.paidBy?.name || 'Unknown'}</span>
            {' • '}
            Split between {expense.participants?.length || 0} participants
          </p>
          
          {expense.notes && (
            <p className="text-[var(--text-muted)] text-xs mt-1.5 bg-[var(--surface-elevated)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] italic max-w-md break-words">
              “{expense.notes}”
            </p>
          )}

          {/* Inline Dispute Details */}
          {expense.isDisputed && activeDispute && (
            <div className="mt-3 p-3.5 bg-red-500/5 border border-red-500/10 rounded-2xl text-xs space-y-2 max-w-md">
              <div className="flex items-center justify-between gap-4">
                <span className="text-red-400 font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>Flagged by {activeDispute.raisedBy?.name || 'Unknown'}:</span>
                </span>
                {isTripActive && (expense.paidBy?.id === currentUserId || isLeader) && (
                  <button
                    onClick={() => onResolveDispute(activeDispute.id)}
                    className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-bold rounded-lg transition-all shrink-0"
                  >
                    Resolve
                  </button>
                )}
              </div>
              <p className="text-[var(--text-secondary)] italic break-words">“{activeDispute.reason}”</p>
            </div>
          )}
        </div>
      </div>

      {/* Cost & Delete controls */}
      <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 w-full md:w-auto border-t border-[var(--border-subtle)] pt-3.5 md:pt-0 md:border-none shrink-0">
        <div className="text-left md:text-right">
          <p className="text-2xl font-black text-[var(--text-primary)] tracking-tight leading-none">
            {new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              maximumFractionDigits: 0
            }).format(expense.amount)}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] whitespace-nowrap mt-1.5 md:mt-1">
            {new Date(expense.expenseDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
          </p>
        </div>

        {/* Action icons block */}
        {(isTripActive && ((!expense.isDisputed && !expense.isOffline) || (expense.paidBy?.id === currentUserId || isLeader))) && (
          <div className="flex items-center gap-0.5 bg-[var(--surface-elevated)] p-0.5 rounded-lg border border-[var(--border-subtle)] md:mt-1 shrink-0">
            {isTripActive && !expense.isDisputed && !expense.isOffline && (
              <button
                onClick={() => onOpenDisputeModal(expense.id)}
                className="p-1.5 text-[var(--text-muted)] hover:text-amber-500 rounded-md transition-colors cursor-pointer"
                title="Flag/Dispute Expense"
              >
                <ShieldAlert className="w-4 h-4" />
              </button>
            )}

            {isTripActive && (expense.paidBy?.id === currentUserId || isLeader) && (
              <button
                onClick={() => onDeleteExpense(expense.id)}
                className="p-1.5 text-[var(--text-muted)] hover:text-red-400 rounded-md transition-colors cursor-pointer"
                title="Delete Expense"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseCard;
