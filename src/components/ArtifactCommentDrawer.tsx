import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  CheckCircle2, 
  RotateCcw, 
  Trash2, 
  CornerDownRight, 
  Tag, 
  Filter, 
  Plus, 
  ShieldCheck, 
  User, 
  Smile, 
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  ChevronDown,
  Layers
} from 'lucide-react';
import { ArtifactComment, CommentReply } from '../types.js';

export interface RequirementAnchor {
  id: string; // e.g. 'FR-101', 'US-101', 'OBJECTIVE', 'MVP_SCOPE'
  label: string; // e.g. 'FR-101: Real-time Multi-Bank Balance Aggregation'
  category?: string;
}

export const TEAM_MEMBERS = [
  { name: 'Alex Rivera', role: 'Lead Product Manager', avatarBg: 'bg-emerald-600', email: 'alex.rivera@company.internal' },
  { name: 'Marcus Chen', role: 'Staff Backend Architect', avatarBg: 'bg-blue-600', email: 'marcus.chen@company.internal' },
  { name: 'Sarah Jenkins', role: 'Senior Security Engineer', avatarBg: 'bg-rose-600', email: 'sarah.j@company.internal' },
  { name: 'Maya Lin', role: 'Principal Product Designer', avatarBg: 'bg-purple-600', email: 'maya.lin@company.internal' },
  { name: 'David Zhao', role: 'Staff QA Lead', avatarBg: 'bg-amber-600', email: 'david.zhao@company.internal' },
  { name: 'Elena Rostova', role: 'Engineering Director', avatarBg: 'bg-indigo-600', email: 'elena.rostova@company.internal' }
];

const EMOJI_OPTIONS = ['👍', '💡', '🚀', '👀', '⚠️', '❤️'];
const TAG_OPTIONS = ['Architecture', 'Security', 'Scope', 'UX', 'SLA', 'Quality', 'General'];

interface ArtifactCommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  artifactId: string;
  artifactTitle: string;
  taskType: 'PRD' | 'USER_STORIES';
  requirements: RequirementAnchor[];
  initialRequirementId?: string; // If opened from a specific requirement button
  currentUserName?: string;
  currentUserRole?: string;
  onCommentCountChange?: (total: number, open: number) => void;
}

export const ArtifactCommentDrawer: React.FC<ArtifactCommentDrawerProps> = ({
  isOpen,
  onClose,
  artifactId,
  artifactTitle,
  taskType,
  requirements,
  initialRequirementId,
  currentUserName = 'Alex Rivera',
  currentUserRole = 'Lead Product Manager',
  onCommentCountChange
}) => {
  const [comments, setComments] = useState<ArtifactComment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [selectedRequirementFilter, setSelectedRequirementFilter] = useState<string>('ALL');

  // New Comment State
  const [newContent, setNewContent] = useState('');
  const [selectedRequirementId, setSelectedRequirementId] = useState<string>('GENERAL');
  const [selectedTag, setSelectedTag] = useState<string>('Architecture');
  const [selectedAuthorIndex, setSelectedAuthorIndex] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reply States
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Sync initial requirement filter when drawer is opened with a target
  useEffect(() => {
    if (initialRequirementId) {
      setSelectedRequirementFilter(initialRequirementId);
      setSelectedRequirementId(initialRequirementId);
    } else {
      setSelectedRequirementFilter('ALL');
      setSelectedRequirementId(requirements[0]?.id || 'GENERAL');
    }
  }, [initialRequirementId, requirements, isOpen]);

  // Fetch comments for artifact
  const fetchComments = async () => {
    if (!artifactId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/artifacts/${artifactId}/comments`);
      if (res.ok) {
        const data = await res.json();
        const loaded: ArtifactComment[] = data.comments || [];
        setComments(loaded);
        if (onCommentCountChange) {
          onCommentCountChange(loaded.length, loaded.filter(c => c.status === 'OPEN').length);
        }
      } else {
        setErrorMsg('Failed to load comments');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error connecting to comments service');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && artifactId) {
      fetchComments();
    }
  }, [isOpen, artifactId]);

  // Submit top-level comment
  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || isSubmitting) return;

    const author = TEAM_MEMBERS[selectedAuthorIndex] || TEAM_MEMBERS[0];
    const targetAnchor = requirements.find(r => r.id === selectedRequirementId);

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/artifacts/${artifactId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newContent.trim(),
          author,
          targetType: taskType === 'USER_STORIES' ? 'STORY' : 'REQUIREMENT',
          requirementId: selectedRequirementId === 'GENERAL' ? undefined : selectedRequirementId,
          requirementTitle: targetAnchor?.label || (selectedRequirementId === 'GENERAL' ? 'General Artifact Discussion' : selectedRequirementId),
          tag: selectedTag
        })
      });

      if (res.ok) {
        const data = await res.json();
        setComments(prev => [data.comment, ...prev]);
        setNewContent('');
        if (onCommentCountChange) {
          const nextComments = [data.comment, ...comments];
          onCommentCountChange(nextComments.length, nextComments.filter(c => c.status === 'OPEN').length);
        }
      }
    } catch (err: any) {
      console.error('Error submitting comment', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit reply
  const handleCreateReply = async (commentId: string) => {
    if (!replyContent.trim() || isSubmittingReply) return;

    const author = TEAM_MEMBERS[selectedAuthorIndex] || TEAM_MEMBERS[0];
    setIsSubmittingReply(true);
    try {
      const res = await fetch(`/api/artifacts/${artifactId}/comments/${commentId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyContent.trim(),
          author
        })
      });

      if (res.ok) {
        const data = await res.json();
        setComments(prev => prev.map(c => {
          if (c.id === commentId) {
            return {
              ...c,
              replies: [...(c.replies || []), data.reply]
            };
          }
          return c;
        }));
        setReplyContent('');
        setReplyingCommentId(null);
      }
    } catch (err) {
      console.error('Error submitting reply', err);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Toggle resolve
  const handleToggleResolve = async (commentId: string) => {
    const author = TEAM_MEMBERS[selectedAuthorIndex] || TEAM_MEMBERS[0];
    try {
      const res = await fetch(`/api/artifacts/${artifactId}/comments/${commentId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolvedBy: {
            name: author.name,
            role: author.role
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setComments(prev => prev.map(c => c.id === commentId ? data.comment : c));
        if (onCommentCountChange) {
          const next = comments.map(c => c.id === commentId ? data.comment : c);
          onCommentCountChange(next.length, next.filter(c => c.status === 'OPEN').length);
        }
      }
    } catch (err) {
      console.error('Error resolving comment', err);
    }
  };

  // Toggle reaction
  const handleToggleReaction = async (commentId: string, emoji: string) => {
    const currentName = TEAM_MEMBERS[selectedAuthorIndex]?.name || currentUserName;
    try {
      const res = await fetch(`/api/artifacts/${artifactId}/comments/${commentId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emoji,
          userName: currentName
        })
      });

      if (res.ok) {
        const data = await res.json();
        setComments(prev => prev.map(c => c.id === commentId ? data.comment : c));
      }
    } catch (err) {
      console.error('Error toggling reaction', err);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment thread?')) return;
    try {
      const res = await fetch(`/api/artifacts/${artifactId}/comments/${commentId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        if (onCommentCountChange) {
          const next = comments.filter(c => c.id !== commentId);
          onCommentCountChange(next.length, next.filter(c => c.status === 'OPEN').length);
        }
      }
    } catch (err) {
      console.error('Error deleting comment', err);
    }
  };

  // Filtered comments
  const filteredComments = useMemo(() => {
    return comments.filter(c => {
      // Status filter
      if (statusFilter !== 'ALL' && c.status !== statusFilter) {
        return false;
      }
      // Requirement filter
      if (selectedRequirementFilter !== 'ALL') {
        if (selectedRequirementFilter === 'GENERAL') {
          return !c.requirementId;
        }
        return c.requirementId === selectedRequirementFilter;
      }
      return true;
    });
  }, [comments, statusFilter, selectedRequirementFilter]);

  const openCount = comments.filter(c => c.status === 'OPEN').length;
  const resolvedCount = comments.filter(c => c.status === 'RESOLVED').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm animate-in fade-in flex justify-end">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                  Requirement Discussion Threads
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                  {comments.length}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-md">
                {artifactTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CONTROLS & FILTER BAR */}
        <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-slate-800 shrink-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({comments.length})
              </button>
              <button
                onClick={() => setStatusFilter('OPEN')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === 'OPEN'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Open ({openCount})
              </button>
              <button
                onClick={() => setStatusFilter('RESOLVED')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === 'RESOLVED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Resolved ({resolvedCount})
              </button>
            </div>

            {/* Requirement Selector Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedRequirementFilter}
                onChange={(e) => setSelectedRequirementFilter(e.target.value)}
                className="bg-slate-950 text-xs font-semibold text-slate-200 border border-slate-800 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 max-w-[220px] truncate"
              >
                <option value="ALL">All Requirements & Scope</option>
                <option value="GENERAL">General Discussion</option>
                {requirements.map((req) => (
                  <option key={req.id} value={req.id}>
                    {req.id}: {req.label.slice(0, 32)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Requirement Banner */}
          {selectedRequirementFilter !== 'ALL' && (
            <div className="px-3 py-1.5 rounded-lg bg-indigo-950/40 border border-indigo-800/40 flex items-center justify-between text-xs">
              <span className="text-indigo-300 font-medium truncate">
                Focused on: <strong className="text-slate-100">{selectedRequirementFilter}</strong>
              </span>
              <button
                onClick={() => setSelectedRequirementFilter('ALL')}
                className="text-xs text-indigo-400 hover:text-indigo-200 underline font-semibold"
              >
                Show All Threads
              </button>
            </div>
          )}
        </div>

        {/* COMMENTS SCROLL CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading requirement discussions...</p>
            </div>
          ) : filteredComments.length === 0 ? (
            <div className="py-12 text-center space-y-3 px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200">
                No discussion threads found
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {selectedRequirementFilter !== 'ALL'
                  ? `No comments yet on requirement ${selectedRequirementFilter}. Post a comment below to initiate feedback with your team.`
                  : 'Start a collaborative thread below to discuss functional specs, security constraints, or test criteria.'}
              </p>
            </div>
          ) : (
            filteredComments.map((comment) => {
              const isReplying = replyingCommentId === comment.id;
              const hasReplies = comment.replies && comment.replies.length > 0;

              return (
                <div
                  key={comment.id}
                  className={`p-4 rounded-xl border transition-all space-y-3 ${
                    comment.status === 'RESOLVED'
                      ? 'bg-slate-950/50 border-slate-800/70 opacity-90'
                      : 'bg-slate-950/80 border-slate-800 shadow-sm hover:border-slate-700'
                  }`}
                >
                  {/* Thread Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full ${comment.author?.avatarBg || 'bg-indigo-600'} flex items-center justify-center text-xs font-bold text-white shadow-xs`}>
                        {comment.author?.name ? comment.author.name.charAt(0) : 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-200">
                            {comment.author?.name || 'Team Member'}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            {comment.author?.role || 'Contributor'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{new Date(comment.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Requirement Anchor & Status Badges */}
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      {comment.requirementId && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/60" title={comment.requirementTitle}>
                          {comment.requirementId}
                        </span>
                      )}

                      {comment.tag && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {comment.tag}
                        </span>
                      )}

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        comment.status === 'RESOLVED'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                          : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                      }`}>
                        {comment.status}
                      </span>
                    </div>
                  </div>

                  {/* Comment Body */}
                  <div className="pl-1 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                    {comment.content}
                  </div>

                  {/* Resolution Notice */}
                  {comment.status === 'RESOLVED' && comment.resolvedBy && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Resolved by {comment.resolvedBy.name} ({comment.resolvedBy.role})</span>
                    </div>
                  )}

                  {/* Reactions & Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-850">
                    {/* Reactions */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {EMOJI_OPTIONS.map((emoji) => {
                        const users = comment.reactions?.[emoji] || [];
                        const count = users.length;
                        const hasReacted = users.includes(TEAM_MEMBERS[selectedAuthorIndex]?.name || currentUserName);

                        return (
                          <button
                            key={emoji}
                            onClick={() => handleToggleReaction(comment.id, emoji)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs transition-colors border cursor-pointer ${
                              hasReacted
                                ? 'bg-indigo-950 text-indigo-200 border-indigo-600 font-bold'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                            }`}
                            title={users.length > 0 ? `Reacted: ${users.join(', ')}` : `React with ${emoji}`}
                          >
                            <span>{emoji}</span>
                            {count > 0 && <span className="font-mono text-[10px]">{count}</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setReplyingCommentId(isReplying ? null : comment.id);
                          setReplyContent('');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <CornerDownRight className="w-3 h-3 text-indigo-400" />
                        <span>Reply</span>
                      </button>

                      <button
                        onClick={() => handleToggleResolve(comment.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                          comment.status === 'RESOLVED'
                            ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-800'
                            : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border-emerald-800/60'
                        }`}
                        title={comment.status === 'RESOLVED' ? 'Reopen Thread' : 'Mark Requirement Thread as Resolved'}
                      >
                        {comment.status === 'RESOLVED' ? (
                          <>
                            <RotateCcw className="w-3 h-3 text-amber-400" />
                            <span>Reopen</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Resolve</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer"
                        title="Delete Thread"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* NESTED REPLIES */}
                  {hasReplies && (
                    <div className="pt-2 pl-3 sm:pl-4 border-l-2 border-indigo-900/50 space-y-2 mt-2">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-850 space-y-1 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-full ${reply.author?.avatarBg || 'bg-slate-700'} flex items-center justify-center text-[10px] font-bold text-white`}>
                                {reply.author?.name ? reply.author.name.charAt(0) : 'U'}
                              </div>
                              <span className="font-bold text-slate-200 text-xs">
                                {reply.author?.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {reply.author?.role}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-300 pl-7 whitespace-pre-wrap leading-relaxed text-xs">
                            {reply.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* INLINE REPLY COMPOSER */}
                  {isReplying && (
                    <div className="pt-2 pl-3 sm:pl-4 border-l-2 border-indigo-500/50 space-y-2 mt-2 animate-in fade-in">
                      <div className="flex items-center gap-2 text-xs text-indigo-300">
                        <CornerDownRight className="w-3 h-3" />
                        <span>Replying as <strong>{TEAM_MEMBERS[selectedAuthorIndex]?.name}</strong> ({TEAM_MEMBERS[selectedAuthorIndex]?.role})</span>
                      </div>
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write a reply to this thread..."
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setReplyingCommentId(null)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCreateReply(comment.id)}
                          disabled={!replyContent.trim() || isSubmittingReply}
                          className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>{isSubmittingReply ? 'Posting...' : 'Post Reply'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* NEW COMMENT COMPOSER (BOTTOM DOCKED) */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 shrink-0 space-y-3">
          <form onSubmit={handleCreateComment} className="space-y-3">
            {/* Pick Requirement Target & Team Member Identity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* Requirement Anchor */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-indigo-400" />
                  <span>Requirement Anchor</span>
                </label>
                <select
                  value={selectedRequirementId}
                  onChange={(e) => setSelectedRequirementId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="GENERAL">General Artifact Discussion</option>
                  {requirements.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.id}: {r.label.slice(0, 36)}...
                    </option>
                  ))}
                </select>
              </div>

              {/* Team Member Profile */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-emerald-400" />
                  <span>Team Member Identity</span>
                </label>
                <select
                  value={selectedAuthorIndex}
                  onChange={(e) => setSelectedAuthorIndex(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {TEAM_MEMBERS.map((tm, idx) => (
                    <option key={tm.name} value={idx}>
                      {tm.name} — {tm.role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tag Selection Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Tag:</span>
              {TAG_OPTIONS.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors border cursor-pointer ${
                    selectedTag === tag
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Comment Textarea */}
            <div className="relative">
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Share technical review feedback, security SLAs, or ask questions on this requirement..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none font-sans"
              />
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className={`w-2 h-2 rounded-full ${TEAM_MEMBERS[selectedAuthorIndex]?.avatarBg || 'bg-indigo-600'}`} />
                <span>Posting as <strong className="text-slate-300">{TEAM_MEMBERS[selectedAuthorIndex]?.name}</strong></span>
              </div>

              <button
                type="submit"
                disabled={!newContent.trim() || isSubmitting}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-950 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Posting...' : 'Post Discussion Comment'}</span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
