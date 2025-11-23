/**
 * Dashboard Comments Component
 *
 * Collaborative commenting system for dashboards with:
 * - Real-time comments display
 * - Markdown support
 * - Edit and delete capabilities
 * - User mentions
 * - Threaded replies
 */

import React, { useState } from 'react';
import { PencilIcon, TrashIcon, XIcon } from '../icons';

export interface Comment {
  id: string;
  dashboardId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string;
}

interface DashboardCommentsProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardId: string;
  dashboardName: string;
  comments: Comment[];
  onAddComment: (content: string, parentId?: string) => void;
  onUpdateComment: (commentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
  currentUserId: string;
  currentUserName: string;
}

export const DashboardComments: React.FC<DashboardCommentsProps> = ({
  isOpen,
  onClose,
  dashboardId,
  dashboardName,
  comments,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  currentUserId,
  currentUserName,
}) => {
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  if (!isOpen) return null;

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    onAddComment(newComment, undefined);
    setNewComment('');
  };

  const handleReply = (parentId: string) => {
    if (!replyContent.trim()) return;
    onAddComment(replyContent, parentId);
    setReplyContent('');
    setReplyingToId(null);
  };

  const handleUpdateComment = (commentId: string) => {
    if (!editingContent.trim()) return;
    onUpdateComment(commentId, editingContent);
    setEditingCommentId(null);
    setEditingContent('');
  };

  const handleDeleteComment = (commentId: string) => {
    if (confirm('Are you sure you want to delete this comment?')) {
      onDeleteComment(commentId);
    }
  };

  const startEditing = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Simple markdown rendering for comments
  const renderMarkdown = (text: string): string => {
    let html = text;

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  };

  // Organize comments into threads
  const topLevelComments = comments.filter(c => !c.parentId);
  const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId);

  const CommentItem: React.FC<{ comment: Comment; isReply?: boolean }> = ({ comment, isReply = false }) => {
    const isEditing = editingCommentId === comment.id;
    const isReplying = replyingToId === comment.id;
    const isOwner = comment.userId === currentUserId;
    const replies = getReplies(comment.id);

    return (
      <div className={`${isReply ? 'ml-8 mt-2' : 'mt-4'}`}>
        <div className="flex items-start gap-3 p-3 bg-white rounded-lg border hover:border-gray-300 transition-colors">
          {/* Avatar */}
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            {comment.userAvatar ? (
              <img src={comment.userAvatar} alt={comment.userName} className="w-full h-full rounded-full" />
            ) : (
              <span className="text-blue-600 font-semibold text-sm">
                {comment.userName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{comment.userName}</span>
                {isOwner && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">You</span>
                )}
                <span className="text-xs text-gray-500">{formatTimestamp(comment.createdAt)}</span>
                {comment.updatedAt !== comment.createdAt && (
                  <span className="text-xs text-gray-400">(edited)</span>
                )}
              </div>

              {/* Actions */}
              {isOwner && !isEditing && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEditing(comment)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Edit"
                  >
                    <PencilIcon className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="p-1 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <TrashIcon className="w-3.5 h-3.5 text-red-600" />
                  </button>
                </div>
              )}
            </div>

            {/* Content or Edit Form */}
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  className="input w-full h-20 resize-none text-sm"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button onClick={() => handleUpdateComment(comment.id)} className="btn btn-sm btn-primary">
                    Save
                  </button>
                  <button onClick={cancelEditing} className="btn btn-sm btn-outline">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  className="text-sm text-gray-700 break-words"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(comment.content) }}
                />

                {/* Reply Button */}
                {!isReply && (
                  <button
                    onClick={() => setReplyingToId(comment.id)}
                    className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                  >
                    Reply
                  </button>
                )}
              </>
            )}

            {/* Reply Form */}
            {isReplying && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="input w-full h-20 resize-none text-sm"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button onClick={() => handleReply(comment.id)} className="btn btn-sm btn-primary">
                    Reply
                  </button>
                  <button
                    onClick={() => {
                      setReplyingToId(null);
                      setReplyContent('');
                    }}
                    className="btn btn-sm btn-outline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Replies */}
        {replies.length > 0 && (
          <div className="mt-2">
            {replies.map(reply => (
              <CommentItem key={reply.id} comment={reply} isReply />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Comments</h2>
            <p className="text-sm text-gray-600 mt-1">{dashboardName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg
                className="w-16 h-16 mb-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-lg mb-2">No comments yet</p>
              <p className="text-sm">Be the first to comment on this dashboard</p>
            </div>
          ) : (
            <div>
              {topLevelComments.map(comment => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </div>
          )}
        </div>

        {/* New Comment Form */}
        <div className="p-6 border-t bg-white">
          <div className="space-y-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment... (Markdown supported)"
              className="input w-full h-24 resize-none"
            />
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                <strong>Markdown:</strong> **bold**, *italic*, `code`, [link](url)
              </div>
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="btn btn-primary"
              >
                Add Comment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
