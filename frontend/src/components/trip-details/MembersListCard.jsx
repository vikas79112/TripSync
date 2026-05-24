import React, { useState } from 'react';
import { Users, Trash2, UserCheck, AlertCircle, Info, Loader2 } from 'lucide-react';

const MembersListCard = ({
  members = [],
  isLeader,
  isTripActive,
  currentUserId,
  isOnline,
  onInvite,
  onRemoveMember
}) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviteError('');
    setInviteLoading(true);
    try {
      await onInvite(inviteEmail);
      setInviteEmail('');
      alert('Member added successfully!');
    } catch (err) {
      setInviteError(err || 'Failed to invite member.');
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6">
      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-emerald-400" />
        <span>Trip Members</span>
      </h3>

      {/* Members List */}
      <div className="space-y-3.5 max-h-[300px] overflow-y-auto mb-6 pr-2">
        {members.map((member) => (
          <div key={member.userId} className="flex items-center justify-between gap-3 p-3 bg-[var(--surface-elevated)] rounded-2xl border border-[var(--border-subtle)]">
            <div className="flex items-center gap-3 min-w-0">
              <img 
                src={member.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}`} 
                alt={member.name} 
                className="w-9 h-9 rounded-full object-cover bg-[var(--surface)] border border-[var(--border-subtle)]"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{member.name}</p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">{member.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {member.role === 'LEADER' ? (
                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase rounded-full flex items-center gap-1">
                  <UserCheck className="w-3 h-3" />
                  <span>Leader</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-[10px] font-bold uppercase rounded-full">
                  Member
                </span>
              )}

              {/* Delete member trigger (Leader only, cannot delete self) */}
              {isTripActive && isLeader && member.userId !== currentUserId && (
                <button
                  onClick={() => onRemoveMember(member.userId)}
                  className="p-1.5 text-[var(--text-muted)] hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                  title="Remove member"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Invite members form (Only if trip ACTIVE) */}
      {isTripActive && (
        <div className="mt-5 pt-4 border-t border-[var(--border-subtle)]">
          <div className="bg-[var(--surface-elevated)] p-4 rounded-2xl border border-[var(--border-subtle)]">
            <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-0.5">
              Invite New Friend
            </h4>
            <p className="text-[10px] text-[var(--text-secondary)] mb-3">
              Add someone to this trip group by their email address.
            </p>
            
            {inviteError && (
              <div className="p-2.5 mb-3 bg-red-500/10 border border-red-500/25 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-xl text-xs flex items-center gap-1.5 font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                <span className="truncate">{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="flex gap-2">
              <input
                type="email"
                placeholder="friend@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={!isOnline}
                className={`glass-input px-3 py-2 text-xs flex-1 text-[var(--text-primary)] placeholder-slate-400 dark:placeholder-slate-500 bg-[var(--surface)] border-[var(--border-subtle)] rounded-xl focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all ${!isOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
                required
              />
              <button
                type="submit"
                disabled={inviteLoading || !isOnline}
                className={`px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-sm shrink-0 select-none ${inviteLoading || !isOnline ? 'opacity-50 shadow-none cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'}`}
              >
                {inviteLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Invite</span>
                )}
              </button>
            </form>
            {!isOnline && (
              <p className="text-[9px] text-amber-600 dark:text-amber-500 mt-2 flex items-center gap-1.5 font-medium">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Adding members requires connection.</span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersListCard;
