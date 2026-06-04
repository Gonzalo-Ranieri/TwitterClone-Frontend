/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import ReplyModal from '../components/ReplyModal';
import { getAvatarStyle, shouldShowInitials } from '../utils/styleHelper';

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

export const TweetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tweet, setTweet] = useState<Tweet | null>(null);
  const [replies, setReplies] = useState<Tweet[]>([]);
  const [loadingTweet, setLoadingTweet] = useState(true);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Inline quick-reply state
  const [quickReplyText, setQuickReplyText] = useState('');
  const [postingQuickReply, setPostingQuickReply] = useState(false);

  // Modal reply state
  const [replyParent, setReplyParent] = useState<Tweet | null>(null);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);

  // Follow tracking
  const [unfollowedUserIds, setUnfollowedUserIds] = useState<Set<string>>(new Set());

  const fetchTweetDetails = async () => {
    if (!id) return;
    try {
      setLoadingTweet(true);
      const response = await client.get(`/api/tweets/${id}`);
      setTweet(response.data);
    } catch (error) {
      console.error('Error fetching main tweet:', error);
    } finally {
      setLoadingTweet(false);
    }
  };

  const fetchReplies = async (pageNum: number, append = false) => {
    if (!id) return;
    try {
      setLoadingReplies(true);
      const response = await client.get(`/api/tweets/${id}/replies?page=${pageNum}&size=10`);
      const data = response.data;
      if (append) {
        setReplies((prev) => [...prev, ...data.content]);
      } else {
        setReplies(data.content);
      }
      setHasMore(!data.last);
    } catch (error) {
      console.error('Error fetching replies:', error);
    } finally {
      setLoadingReplies(false);
    }
  };

  useEffect(() => {
    setTweet(null);
    setReplies([]);
    setPage(0);
    setQuickReplyText('');
    fetchTweetDetails();
    fetchReplies(0);
  }, [id]);

  const handleLoadMoreReplies = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchReplies(nextPage, true);
  };

  const handlePostQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickReplyText.trim() || quickReplyText.length > 280 || !tweet) return;

    try {
      setPostingQuickReply(true);
      const response = await client.post('/api/tweets', {
        content: quickReplyText,
        parentTweetId: tweet.id,
      });
      // Add quick reply to list
      setReplies((prev) => [...prev, response.data]);
      setQuickReplyText('');
      toast.success('¡Respuesta publicada!');
      // Update main tweet replyCount
      setTweet((prev) => (prev ? { ...prev, replyCount: prev.replyCount + 1 } : null));
    } catch (error) {
      console.error('Error posting quick reply:', error);
    } finally {
      setPostingQuickReply(false);
    }
  };

  const handleReplyModalSuccess = (newReply: Tweet) => {
    // If the reply is to the main tweet, add it to our list
    if (newReply.parentTweetId === tweet?.id) {
      setReplies((prev) => [...prev, newReply]);
      setTweet((prev) => (prev ? { ...prev, replyCount: prev.replyCount + 1 } : null));
    } else {
      // If reply is to a sub-tweet, update that sub-tweet's replyCount
      setReplies((prev) =>
        prev.map((t) =>
          t.id === newReply.parentTweetId
            ? { ...t, replyCount: t.replyCount + 1 }
            : t
        )
      );
    }
  };

  const handleDeleteTweet = async (tweetId: string, isMain: boolean) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este tweet?')) return;
    try {
      await client.delete(`/api/tweets/${tweetId}`);
      if (isMain) {
        // Navigate back or to home if we deleted the main tweet
        toast.success('Tweet eliminado.');
        navigate('/home');
      } else {
        setReplies((prev) => prev.filter((t) => t.id !== tweetId));
        toast.success('Respuesta eliminada.');
        // Decrement main tweet replyCount
        setTweet((prev) => (prev ? { ...prev, replyCount: Math.max(0, prev.replyCount - 1) } : null));
      }
    } catch (error) {
      console.error('Error deleting tweet:', error);
    }
  };

  const handleToggleLike = async (item: Tweet, isMain: boolean) => {
    const isLiked = item.liked;
    try {
      // Optimistic update
      const updatedItem = { ...item, liked: !isLiked, likeCount: item.likeCount + (isLiked ? -1 : 1) };
      if (isMain) {
        setTweet(updatedItem);
      } else {
        setReplies((prev) => prev.map((t) => (t.id === item.id ? updatedItem : t)));
      }

      if (isLiked) {
        await client.delete(`/api/tweets/${item.id}/like`);
      } else {
        await client.post(`/api/tweets/${item.id}/like`);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Rollback
      if (isMain) {
        setTweet(item);
      } else {
        setReplies((prev) => prev.map((t) => (t.id === item.id ? item : t)));
      }
    }
  };

  const handleToggleFollow = async (authorId: string, authorUsername: string) => {
    const isCurrentlyUnfollowed = unfollowedUserIds.has(authorId);
    try {
      if (isCurrentlyUnfollowed) {
        await client.post(`/api/users/${authorId}/follow`);
        setUnfollowedUserIds((prev) => {
          const next = new Set(prev);
          next.delete(authorId);
          return next;
        });
        toast.success(`Ahora sigues a @${authorUsername}`);
      } else {
        if (!window.confirm(`¿Dejar de seguir a @${authorUsername}?`)) return;
        await client.delete(`/api/users/${authorId}/follow`);
        setUnfollowedUserIds((prev) => {
          const next = new Set(prev);
          next.add(authorId);
          return next;
        });
        toast.success(`Dejaste de seguir a @${authorUsername}`);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (loadingTweet) {
    return (
      <div style={{ padding: '20px', color: 'var(--text-color)', textAlign: 'center' }}>
        Cargando conversación...
      </div>
    );
  }

  if (!tweet) {
    return (
      <div style={{ padding: '20px', color: 'var(--text-color)', textAlign: 'center' }}>
        <h3>El tweet no existe o ha sido eliminado</h3>
        <button
          onClick={() => navigate('/home')}
          className="composer-submit-btn"
          style={{ marginTop: '16px', display: 'inline-block' }}
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  const isMainOwnTweet = user && tweet.authorId === user.id;
  const isMainFollowing = !unfollowedUserIds.has(tweet.authorId);

  return (
    <div className="timeline-container">
      <header className="feed-header" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-color)',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '50%',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-color-hover)')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          ←
        </button>
        <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Conversación</h2>
      </header>

      {/* Primary Highlighted Tweet */}
      <article className="tweet-card primary-tweet-card" style={{ borderBottom: '1px solid var(--border-color)', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link
              to={`/profile/${tweet.authorId}`}
              onClick={(e) => e.stopPropagation()}
              className="tweet-avatar"
              style={{ margin: 0, textDecoration: 'none', color: 'inherit', ...getAvatarStyle(tweet.authorAvatarPlaceholder) }}
            >
              {shouldShowInitials(tweet.authorAvatarPlaceholder) ? tweet.authorUsername.charAt(0).toUpperCase() : null}
            </Link>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Link
                to={`/profile/${tweet.authorId}`}
                onClick={(e) => e.stopPropagation()}
                className="tweet-author-name"
                style={{ fontSize: '16px', fontWeight: '700', textDecoration: 'none', color: 'inherit' }}
              >
                {tweet.authorUsername}
              </Link>
              <Link
                to={`/profile/${tweet.authorId}`}
                onClick={(e) => e.stopPropagation()}
                className="tweet-author-handle"
                style={{ fontSize: '14px', color: 'var(--text-color-secondary)', textDecoration: 'none' }}
              >
                @{tweet.authorUsername}
              </Link>
            </div>
          </div>

          {/* Action buttons on main tweet */}
          {isMainOwnTweet ? (
            <button
              onClick={() => handleDeleteTweet(tweet.id, true)}
              className="tweet-action-btn delete-btn"
              title="Eliminar tweet"
              data-testid={`delete-btn-${tweet.id}`}
            >
              🗑️
            </button>
          ) : (
            <button
              onClick={() => handleToggleFollow(tweet.authorId, tweet.authorUsername)}
              className={`follow-btn ${isMainFollowing ? 'following' : 'follow'}`}
              data-testid={`follow-btn-${tweet.authorId}`}
            >
              {isMainFollowing ? 'Siguiendo' : 'Seguir'}
            </button>
          )}
        </div>

        <div className="tweet-body" style={{ fontSize: '22px', lineHeight: '1.4', margin: '16px 0', color: 'var(--text-color)' }}>
          {tweet.content}
        </div>

        <div style={{ padding: '12px 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '20px', fontSize: '15px', color: 'var(--text-color-secondary)' }}>
          <span>{formatDate(tweet.createdAt)}</span>
        </div>

        <div className="tweet-footer" style={{ padding: '8px 0 0 0', display: 'flex', justifyContent: 'space-around' }}>
          <button
            onClick={() => {
              setReplyParent(tweet);
              setIsReplyModalOpen(true);
            }}
            className="tweet-action-btn reply-btn"
            data-testid={`reply-btn-${tweet.id}`}
          >
            💬 <span style={{ marginLeft: '4px' }}>{tweet.replyCount}</span>
          </button>
          <button
            onClick={() => handleToggleLike(tweet, true)}
            className={`tweet-action-btn like-btn ${tweet.liked ? 'liked' : ''}`}
            data-testid={`like-btn-${tweet.id}`}
          >
            <span>{tweet.liked ? '❤️' : '🤍'}</span>
            <span style={{ marginLeft: '4px' }}>{tweet.likeCount}</span>
          </button>
        </div>
      </article>

      {/* Inline composer for direct replies */}
      {user && (
        <form onSubmit={handlePostQuickReply} className="tweet-composer inline-composer" style={{ borderBottom: '1px solid var(--border-color)', padding: '16px', display: 'flex', gap: '12px' }}>
          <div className="composer-avatar" style={{ width: '40px', height: '40px', fontSize: '16px', ...getAvatarStyle(user.avatarPlaceholder) }}>
            {shouldShowInitials(user.avatarPlaceholder) ? user.username.charAt(0).toUpperCase() : null}
          </div>
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <textarea
              value={quickReplyText}
              onChange={(e) => setQuickReplyText(e.target.value)}
              placeholder="Postea tu respuesta"
              maxLength={300}
              disabled={postingQuickReply}
              className="composer-textarea"
              style={{
                width: '100%',
                minHeight: '80px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-color)',
                fontSize: '16px',
                outline: 'none',
                resize: 'none',
                padding: '12px 0',
                margin: '8px 0'
              }}
              data-testid="quick-reply-textarea"
            />
            <div className="composer-actions" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', paddingTop: '8px' }}>
              <span className="char-counter" style={{ fontSize: '12px' }}>{quickReplyText.length} / 280</span>
              <button
                type="submit"
                disabled={postingQuickReply || !quickReplyText.trim() || quickReplyText.length > 280}
                className="composer-submit-btn"
                style={{ padding: '6px 16px', fontSize: '14px' }}
                data-testid="quick-reply-submit-btn"
              >
                {postingQuickReply ? 'Respondiendo...' : 'Responder'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Replies List */}
      <div className="replies-section">
        {replies.map((reply) => {
          const isOwnReply = user && reply.authorId === user.id;
          const isReplyFollowing = !unfollowedUserIds.has(reply.authorId);

          return (
            <article
              key={reply.id}
              className="tweet-card reply-tweet-card"
              onClick={() => navigate(`/tweet/${reply.id}`)}
              style={{ cursor: 'pointer', display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '16px', gap: '12px' }}
              data-testid={`reply-card-${reply.id}`}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Link
                  to={`/profile/${reply.authorId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="tweet-avatar"
                  style={{ margin: 0, textDecoration: 'none', color: 'inherit', ...getAvatarStyle(reply.authorAvatarPlaceholder) }}
                >
                  {shouldShowInitials(reply.authorAvatarPlaceholder) ? reply.authorUsername.charAt(0).toUpperCase() : null}
                </Link>
              </div>
              <div style={{ flexGrow: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="tweet-author-info">
                    <Link
                      to={`/profile/${reply.authorId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="tweet-author-name"
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      {reply.authorUsername}
                    </Link>
                    <Link
                      to={`/profile/${reply.authorId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="tweet-author-handle"
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      @{reply.authorUsername}
                    </Link>
                    <span className="bullet">·</span>
                    <span className="tweet-date">{formatDate(reply.createdAt)}</span>
                  </div>

                  {isOwnReply ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTweet(reply.id, false);
                      }}
                      className="tweet-action-btn delete-btn"
                      title="Eliminar respuesta"
                      data-testid={`delete-btn-${reply.id}`}
                    >
                      🗑️
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFollow(reply.authorId, reply.authorUsername);
                      }}
                      className={`follow-btn ${isReplyFollowing ? 'following' : 'follow'}`}
                      data-testid={`follow-btn-${reply.authorId}`}
                    >
                      {isReplyFollowing ? 'Siguiendo' : 'Seguir'}
                    </button>
                  )}
                </div>

                <div className="tweet-body" style={{ color: 'var(--text-color)', marginTop: '4px', fontSize: '15px' }}>{reply.content}</div>

                <div className="tweet-footer" style={{ marginTop: '12px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setReplyParent(reply);
                      setIsReplyModalOpen(true);
                    }}
                    className="tweet-action-btn reply-btn"
                    data-testid={`reply-btn-${reply.id}`}
                  >
                    💬 <span style={{ marginLeft: '4px' }}>{reply.replyCount}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleLike(reply, false);
                    }}
                    className={`tweet-action-btn like-btn ${reply.liked ? 'liked' : ''}`}
                    data-testid={`like-btn-${reply.id}`}
                  >
                    <span>{reply.liked ? '❤️' : '🤍'}</span>
                    <span style={{ marginLeft: '4px' }}>{reply.likeCount}</span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {loadingReplies && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-color-secondary)' }}>
            Cargando respuestas...
          </div>
        )}

        {!loadingReplies && replies.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-color-secondary)' }}>
            No hay respuestas a esta publicación. ¡Sé el primero en responder!
          </div>
        )}

        {hasMore && !loadingReplies && (
          <div className="load-more-container" style={{ padding: '16px 0' }}>
            <button onClick={handleLoadMoreReplies} className="load-more-btn">
              Cargar más respuestas
            </button>
          </div>
        )}
      </div>

      <ReplyModal
        isOpen={isReplyModalOpen}
        onClose={() => setIsReplyModalOpen(false)}
        parentTweet={replyParent}
        onSuccess={handleReplyModalSuccess}
      />
    </div>
  );
};

export default TweetDetail;
