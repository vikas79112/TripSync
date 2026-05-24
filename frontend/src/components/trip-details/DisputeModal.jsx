import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

const DisputeModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  loading 
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onSubmit(reason);
    setReason('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel-heavy w-full max-w-md p-6 rounded-3xl border border-slate-700/50 shadow-2xl relative">
        <h2 className="text-2xl font-extrabold text-white mb-2">Flag Expense</h2>
        <p className="text-xs text-slate-400 mb-6">Explain why you are flagging or disputing this expense transaction.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Reason / Explanation</label>
            <textarea
              placeholder="Describe the discrepancy (e.g. wrong amount, did not participate, duplicated)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="glass-input w-full min-h-[100px] py-3 px-4 text-sm resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => {
                setReason('');
                onClose();
              }}
              className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 font-semibold text-sm transition-all text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="glow-btn px-6 py-3 rounded-2xl bg-red-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-600 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>Flag Expense</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DisputeModal;
