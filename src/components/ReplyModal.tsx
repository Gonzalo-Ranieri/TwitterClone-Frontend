import React, { useState } from 'react';
import { toast } from 'sonner';
import client from '../api/client';

interface Tweet {
  id: string;
  content: string;
  authorId: string;
  authorUsername: string;
  authorAvatarPlaceholder: string;
  createdAt: string;
  likeCount: number;
  liked: boolean;
  replyCount: number;
  parentTweetId?: string;
}

interface ReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentTweet: Tweet | null;
  onSuccess: (newReply: Tweet) => void;
}

export const ReplyModal: React.FC<ReplyModalProps> = ({
  isOpen,
  onClose,
  parentTweet,
  onSuccess,
}) => {
  const [replyText, setReplyText] = useState('');
  const [posting, setPosting] = useState(false);

  if (!isOpen || !parentTweet) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || replyText.length > 280) return;

    try {
      setPosting(true);
      const response = await client.post('/api/tweets', {
        content: replyText,
        parentTweetId: parentTweet.id,
      });
      onSuccess(response.data);
      toast.success('¡Respuesta publicada!');
      setReplyText('');
      onClose();
    } catch (error) {
      console.error('Error posting reply:', error);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="reply-modal">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3>Responder a @{parentTweet.authorUsername}</h3>
          <button onClick={onClose} className="modal-close-btn" data-testid="modal-close-btn">
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ padding: '16px' }}>
          {/* Parent Tweet Preview */}
          <div className="parent-tweet-preview" style={{ display: 'flex', gap: '12px', marginBottom: '20px', position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="tweet-avatar" style={{ margin: 0 }}>
                {parentTweet.authorUsername.charAt(0).toUpperCase()}
              </div>
              <div className="thread-connector-line" style={{
                width: '2px',
                flexGrow: 1,
                backgroundColor: 'var(--border-color)',
                marginTop: '4px',
                minHeight: '24px'
              }}></div>
            </div>
            <div style={{ flexGrow: 1 }}>
              <div className="tweet-author-info" style={{ display: 'flex', gap: '8px', fontSize: '15px' }}>
                <strong style={{ color: 'var(--text-color)' }}>{parentTweet.authorUsername}</strong>
                <span style={{ color: 'var(--text-color-secondary)' }}>@{parentTweet.authorUsername}</span>
              </div>
              <p style={{ color: 'var(--text-color)', margin: '4px 0', fontSize: '15px', lineHeight: '1.4' }}>{parentTweet.content}</p>
              <div style={{ fontSize: '13px', color: 'var(--text-color-secondary)', marginTop: '4px' }}>
                Repitiendo a <span style={{ color: 'var(--primary)' }}>@{parentTweet.authorUsername}</span>
              </div>
            </div>
          </div>

          {/* Composer Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px' }}>
            <div className="tweet-avatar" style={{ margin: 0 }}>
              {parentTweet.authorUsername.charAt(0).toUpperCase()} {/* Fallback placeholder */}
            </div>
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Postea tu respuesta"
                maxLength={300}
                className="composer-textarea"
                disabled={posting}
                style={{
                  width: '100%',
                  minHeight: '120px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-color)',
                  fontSize: '18px',
                  outline: 'none',
                  resize: 'none',
                  padding: '12px 0',
                  margin: '8px 0'
                }}
                data-testid="reply-textarea"
              />
              <div className="composer-actions" style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '12px',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '12px',
                marginTop: '12px'
              }}>
                <span
                  className={`char-counter ${
                    replyText.length > 280
                      ? 'error'
                      : replyText.length > 250
                      ? 'warning'
                      : ''
                  }`}
                  style={{ fontSize: '13px', color: replyText.length > 280 ? '#ef4444' : 'var(--text-color-secondary)' }}
                >
                  {replyText.length} / 280
                </span>
                <button
                  type="submit"
                  disabled={posting || !replyText.trim() || replyText.length > 280}
                  className="composer-submit-btn"
                  style={{
                    padding: '8px 20px',
                    backgroundColor: 'var(--primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '9999px',
                    fontWeight: '700',
                    fontSize: '15px',
                    cursor: 'pointer',
                    opacity: (posting || !replyText.trim() || replyText.length > 280) ? 0.5 : 1
                  }}
                  data-testid="reply-submit-btn"
                >
                  {posting ? 'Respondiendo...' : 'Responder'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReplyModal;
