import React, { useState, useEffect } from 'react';
import { Loader2, IndianRupee, AlertCircle, CheckSquare, Square } from 'lucide-react';

const CATEGORIES = ['FOOD', 'HOTEL', 'TRANSPORT', 'FUEL', 'SHOPPING', 'TICKETS', 'OTHER'];

const AddExpenseModal = ({
  isOpen,
  onClose,
  members = [],
  currentUserId,
  onSubmit,
  loading
}) => {
  // Expense form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('FOOD');
  const [notes, setNotes] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [error, setError] = useState('');

  // Reset/Initialize states when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setAmount('');
      setCategory('FOOD');
      setNotes('');
      setError('');
      // Default to current user or first member
      const defaultPaidBy = currentUserId || (members.length > 0 ? members[0].userId : '');
      setPaidBy(defaultPaidBy);
      // Default to all members participating
      setSelectedParticipants(members.map(m => m.userId));
    }
  }, [isOpen, members, currentUserId]);

  if (!isOpen) return null;

  const toggleParticipant = (userId) => {
    if (selectedParticipants.includes(userId)) {
      // Must have at least one participant
      if (selectedParticipants.length === 1) return;
      setSelectedParticipants(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedParticipants(prev => [...prev, userId]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !amount) {
      setError('Please enter a title and amount.');
      return;
    }
    if (parseFloat(amount) <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (selectedParticipants.length === 0) {
      setError('Please select at least one participant.');
      return;
    }

    setError('');
    onSubmit({
      title: title.trim(),
      amount: parseFloat(amount),
      category,
      notes: notes.trim(),
      paidById: paidBy || null,
      splitEqually: true,
      participantIds: selectedParticipants,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="glass-panel-heavy w-full max-w-lg p-6 rounded-3xl border border-slate-700/50 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-extrabold text-white mb-6">Add New Expense</h2>

        {error && (
          <div className="flex items-center gap-2 p-4 mb-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Title</label>
              <input
                type="text"
                placeholder="e.g. Flight Tickets, Dinner"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="glass-input w-full py-3 px-4 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Amount (₹)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <IndianRupee className="w-4 h-4" />
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="glass-input w-full py-3 pl-9 pr-4 text-sm"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="glass-input w-full py-3 px-4 text-sm text-slate-300"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat} className="bg-slate-900 text-white">{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Paid By</label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="glass-input w-full py-3 px-4 text-sm text-slate-300"
              >
                {members.map(m => (
                  <option key={m.userId} value={m.userId} className="bg-slate-900 text-white">
                    {m.name} {m.userId === currentUserId ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Split evenly between everyone"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="glass-input w-full py-3 px-4 text-sm"
            />
          </div>

          {/* Equisplit Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Select Participants to Split Equally:
            </label>
            <div className="grid grid-cols-2 gap-2.5 max-h-[140px] overflow-y-auto p-3 bg-slate-950/40 rounded-2xl border border-slate-900 pr-2">
              {members.map(m => {
                const isSelected = selectedParticipants.includes(m.userId);
                return (
                  <button
                    type="button"
                    key={m.userId}
                    onClick={() => toggleParticipant(m.userId)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all text-left ${isSelected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-900/20 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                  >
                    <span className="truncate">{m.name}</span>
                    {isSelected ? (
                      <CheckSquare className="w-4.5 h-4.5 text-emerald-400 shrink-0 ml-2" />
                    ) : (
                      <Square className="w-4.5 h-4.5 text-slate-600 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action triggers */}
          <div className="flex items-center justify-end gap-3 mt-6 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 font-semibold text-sm transition-all text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="glow-btn px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>Add Expense</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpenseModal;
