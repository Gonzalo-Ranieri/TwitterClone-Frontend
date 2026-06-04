import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import ReplyModal from '../components/ReplyModal';

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

export const Timeline: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [unfollowedUserIds, setUnfollowedUserIds] = useState<Set<string>>(new Set());
  const [replyParent, setReplyParent] = useState<Tweet | null>(null);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);

  const fetchTimeline = async (pageNum: number, append = false) => {
    try {
      setLoading(true);
      const response = await client.get(`/api/timeline?page=${pageNum}&size=10`);
      const data = response.data;
      if (append) {
        setTweets((prev) => [...prev, ...data.content]);
      } else {
        setTweets(data.content);
      }
      setHasMore(!data.last);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline(0);
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTimeline(nextPage, true);
  };

  const handlePostTweet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerText.trim() || composerText.length > 280) return;

    try {
      setPosting(true);
      const response = await client.post('/api/tweets', { content: composerText });
      // Add the new tweet at the beginning of the list
      setTweets((prev) => [response.data, ...prev]);
      setComposerText('');
      toast.success('¡Publicado!');
    } catch (error) {
      console.error('Error posting tweet:', error);
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteTweet = async (tweetId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este tweet?')) return;
    try {
      await client.delete(`/api/tweets/${tweetId}`);
      setTweets((prev) => prev.filter((t) => t.id !== tweetId));
      toast.success('Tweet eliminado.');
    } catch (error) {
      console.error('Error deleting tweet:', error);
    }
  };

  const handleToggleLike = async (tweet: Tweet) => {
    const isLiked = tweet.liked;
    try {
      // Optimistic update
      setTweets((prev) =>
        prev.map((t) =>
          t.id === tweet.id
            ? { ...t, liked: !isLiked, likeCount: t.likeCount + (isLiked ? -1 : 1) }
            : t
        )
      );

      if (isLiked) {
        await client.delete(`/api/tweets/${tweet.id}/like`);
      } else {
        await client.post(`/api/tweets/${tweet.id}/like`);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Rollback on error
      setTweets((prev) =>
        prev.map((t) => (t.id === tweet.id ? tweet : t))
      );
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

  const handleReplySuccess = (newReply: Tweet) => {
    setTweets((prev) =>
      prev.map((t) =>
        t.id === newReply.parentTweetId
          ? { ...t, replyCount: t.replyCount + 1 }
          : t
      )
    );
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

  return (
    <div className="timeline-container">
      <header className="feed-header">
        <h2>Inicio</h2>
      </header>

      {/* Tweet Composer */}
      {user && (
        <form onSubmit={handlePostTweet} className="tweet-composer">
          <div className="composer-avatar">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="composer-main">
            <textarea
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              placeholder="¿Qué está pasando?"
              maxLength={300}
              className="composer-textarea"
              disabled={posting}
            />
            <div className="composer-actions">
              <span
                className={`char-counter ${
                  composerText.length > 280
                    ? 'error'
                    : composerText.length > 250
                    ? 'warning'
                    : ''
                }`}
              >
                {composerText.length} / 280
              </span>
              <button
                type="submit"
                disabled={posting || !composerText.trim() || composerText.length > 280}
                className="composer-submit-btn"
              >
                {posting ? 'Posteando...' : 'Postear'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tweets List */}
      <div className="tweets-list">
        {tweets.map((tweet) => {
          const isOwnTweet = user && tweet.authorId === user.id;
          const isFollowing = !unfollowedUserIds.has(tweet.authorId);

          return (
            <article
              key={tweet.id}
              className="tweet-card"
              onClick={() => navigate(`/tweet/${tweet.id}`)}
              style={{ cursor: 'pointer' }}
              data-testid={`tweet-${tweet.id}`}
            >
              <div className="tweet-avatar">
                {tweet.authorUsername.charAt(0).toUpperCase()}
              </div>
              <div className="tweet-content-wrapper">
                <div className="tweet-header">
                  <div className="tweet-author-info">
                    <span className="tweet-author-name">{tweet.authorUsername}</span>
                    <span className="tweet-author-handle">@{tweet.authorUsername}</span>
                    <span className="bullet">·</span>
                    <span className="tweet-date">{formatDate(tweet.createdAt)}</span>
                  </div>
                  
                  {/* Actions (Delete or Follow) */}
                  {isOwnTweet ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTweet(tweet.id);
                      }}
                      className="tweet-action-btn delete-btn"
                      title="Eliminar tweet"
                      data-testid={`delete-btn-${tweet.id}`}
                    >
                      🗑️
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFollow(tweet.authorId, tweet.authorUsername);
                      }}
                      className={`follow-btn ${isFollowing ? 'following' : 'follow'}`}
                      data-testid={`follow-btn-${tweet.authorId}`}
                    >
                      {isFollowing ? 'Siguiendo' : 'Seguir'}
                    </button>
                  )}
                </div>

                <div className="tweet-body">{tweet.content}</div>

                <div className="tweet-footer">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setReplyParent(tweet);
                      setIsReplyModalOpen(true);
                    }}
                    className="tweet-action-btn reply-btn"
                    data-testid={`reply-btn-${tweet.id}`}
                  >
                    <span className="reply-icon">💬</span>
                    <span className="reply-count" data-testid={`reply-count-${tweet.id}`}>{tweet.replyCount || 0}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleLike(tweet);
                    }}
                    className={`tweet-action-btn like-btn ${tweet.liked ? 'liked' : ''}`}
                    data-testid={`like-btn-${tweet.id}`}
                  >
                    <span className="like-icon">{tweet.liked ? '❤️' : '🤍'}</span>
                    <span className="like-count" data-testid={`like-count-${tweet.id}`}>{tweet.likeCount}</span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {loading && tweets.length === 0 && (
          <div className="skeleton-timeline" data-testid="timeline-skeleton">
            {[1, 2, 3].map((n) => (
              <div key={n} className="skeleton-card">
                <div className="skeleton-avatar"></div>
                <div className="skeleton-content-wrapper">
                  <div className="skeleton-header">
                    <div className="skeleton-line skeleton-name"></div>
                    <div className="skeleton-line skeleton-date"></div>
                  </div>
                  <div className="skeleton-line skeleton-body-1"></div>
                  <div className="skeleton-line skeleton-body-2"></div>
                  <div className="skeleton-footer">
                    <div className="skeleton-like"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {loading && tweets.length > 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-color-secondary)' }}>
            Cargando más tweets...
          </div>
        )}

        {!loading && tweets.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-color-secondary)' }}>
            <h3>Tu timeline está vacío</h3>
            <p style={{ marginTop: '8px' }}>
              Sigue a otros usuarios en la barra lateral para ver sus publicaciones aquí.
            </p>
          </div>
        )}

        {hasMore && !loading && (
          <div className="load-more-container">
            <button onClick={handleLoadMore} className="load-more-btn">
              Cargar más
            </button>
          </div>
        )}
      </div>

      <ReplyModal
        isOpen={isReplyModalOpen}
        onClose={() => setIsReplyModalOpen(false)}
        parentTweet={replyParent}
        onSuccess={handleReplySuccess}
      />
    </div>
  );
};

export default Timeline;
