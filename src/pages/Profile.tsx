import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import UsersModal from '../components/UsersModal';
import ReplyModal from '../components/ReplyModal';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  bio?: string;
  avatarPlaceholder?: string;
  followersCount: number;
  followingCount: number;
  followedByCurrentUser?: boolean;
}

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

export const Profile: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const targetUserId = id || user?.id;

  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unfollowedUserIds, setUnfollowedUserIds] = useState<Set<string>>(new Set());
  const [replyParent, setReplyParent] = useState<Tweet | null>(null);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalType, setModalType] = useState<'followers' | 'following'>('followers');

  const fetchProfile = useCallback(async () => {
    if (!targetUserId) return;
    try {
      const response = await client.get(`/api/users/${targetUserId}`);
      setProfileData(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, [targetUserId]);

  const fetchUserTweets = useCallback(async (pageNum: number, append = false) => {
    if (!targetUserId) return;
    try {
      setLoading(true);
      const response = await client.get(`/api/users/${targetUserId}/tweets?page=${pageNum}&size=10`);
      const data = response.data;
      if (append) {
        setTweets((prev) => [...prev, ...data.content]);
      } else {
        setTweets(data.content);
      }
      setHasMore(!data.last);
    } catch (error) {
      console.error('Error fetching user tweets:', error);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchProfile();
    // Refresh stats if follows change
    window.addEventListener('follow-updated', fetchProfile);
    return () => {
      window.removeEventListener('follow-updated', fetchProfile);
    };
  }, [fetchProfile]);

  useEffect(() => {
    setTweets([]);
    setPage(0);
    fetchUserTweets(0);
  }, [targetUserId, fetchUserTweets]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchUserTweets(nextPage, true);
  };

  const handleToggleFollowProfile = async () => {
    if (!profileData) return;
    const isCurrentlyFollowing = profileData.followedByCurrentUser;
    try {
      if (isCurrentlyFollowing) {
        if (!window.confirm(`¿Dejar de seguir a @${profileData.username}?`)) return;
        await client.delete(`/api/users/${profileData.id}/follow`);
        setProfileData(prev => prev ? { ...prev, followedByCurrentUser: false, followersCount: prev.followersCount - 1 } : null);
        toast.success(`Dejaste de seguir a @${profileData.username}`);
      } else {
        await client.post(`/api/users/${profileData.id}/follow`);
        setProfileData(prev => prev ? { ...prev, followedByCurrentUser: true, followersCount: prev.followersCount + 1 } : null);
        toast.success(`Ahora sigues a @${profileData.username}`);
      }
      window.dispatchEvent(new Event('follow-updated'));
    } catch (error) {
      console.error('Error toggling follow:', error);
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
      // Rollback
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
      window.dispatchEvent(new Event('follow-updated'));
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

  const handleLogoutClick = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return <div style={{ padding: '20px', color: 'var(--text-color)' }}>No hay sesión activa.</div>;
  }

  return (
    <div className="profile-container" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header className="feed-header" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '12px 16px' }}>
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
        <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Perfil</h2>
      </header>

      {/* Profile Banner */}
      <div className="profile-banner" style={{
        height: '200px',
        background: 'linear-gradient(135deg, var(--primary), #a855f7, #ec4899)',
        width: '100%',
        position: 'relative'
      }}>
      </div>

      {/* Profile Info Card */}
      <div className="profile-info-section" style={{
        padding: '0 16px 16px 16px',
        position: 'relative',
        borderBottom: '1px solid var(--border-color)'
      }}>
        {/* Overlapping Avatar */}
        <div className="profile-avatar-container" style={{
          position: 'absolute',
          top: '-70px',
          left: '16px',
          width: '130px',
          height: '130px',
          borderRadius: '50%',
          border: '4px solid var(--bg-color)',
          background: 'linear-gradient(135deg, #a855f7, var(--primary))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: '800',
          fontSize: '48px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}>
          {profileData ? profileData.username.charAt(0).toUpperCase() : ''}
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          paddingTop: '12px',
          minHeight: '60px'
        }}>
          {targetUserId === user.id ? (
            <button
              onClick={handleLogoutClick}
              style={{
                padding: '8px 16px',
                border: '1px solid var(--border-color)',
                borderRadius: '9999px',
                fontWeight: '700',
                fontSize: '15px',
                color: 'var(--text-color)',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-color-hover)')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Cerrar Sesión
            </button>
          ) : (
            profileData && (
              <button
                onClick={handleToggleFollowProfile}
                className={`follow-btn ${profileData.followedByCurrentUser ? 'following' : 'follow'}`}
                style={{
                  padding: '8px 20px',
                  fontSize: '15px',
                  fontWeight: '700'
                }}
              >
                {profileData.followedByCurrentUser ? 'Siguiendo' : 'Seguir'}
              </button>
            )
          )}
        </div>

        {/* User Details */}
        <div style={{ marginTop: '12px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: 'var(--text-color)' }}>
            {profileData ? profileData.username : ''}
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-color-secondary)', margin: '2px 0 12px 0' }}>
            @{profileData ? profileData.username : ''}
          </p>

          <p style={{ fontSize: '15px', color: 'var(--text-color)', lineHeight: '1.4', margin: '0 0 12px 0' }}>
            {profileData ? (profileData.bio || 'Sin biografía todavía.') : ''}
          </p>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '14px', color: 'var(--text-color-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              📧 {profileData ? profileData.email : ''}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              📅 Registrado
            </span>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginTop: '16px', fontSize: '15px' }}>
            <span
              onClick={() => {
                setModalTitle('Siguiendo');
                setModalType('following');
                setIsModalOpen(true);
              }}
              style={{ cursor: 'pointer' }}
              data-testid="open-following-modal"
            >
              <strong style={{ color: 'var(--text-color)' }} data-testid="following-count">
                {profileData ? profileData.followingCount : 0}
              </strong>{' '}
              <span style={{ color: 'var(--text-color-secondary)' }}>Siguiendo</span>
            </span>
            <span
              onClick={() => {
                setModalTitle('Seguidores');
                setModalType('followers');
                setIsModalOpen(true);
              }}
              style={{ cursor: 'pointer' }}
              data-testid="open-followers-modal"
            >
              <strong style={{ color: 'var(--text-color)' }} data-testid="followers-count">
                {profileData ? profileData.followersCount : 0}
              </strong>{' '}
              <span style={{ color: 'var(--text-color-secondary)' }}>Seguidores</span>
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
        <button className="profile-tab active" style={{
          flex: 1,
          padding: '16px',
          textAlign: 'center',
          fontWeight: '700',
          fontSize: '15px',
          color: 'var(--text-color)',
          borderBottom: '4px solid var(--primary)',
          cursor: 'default'
        }}>
          Posts
        </button>
        <button className="profile-tab" style={{
          flex: 1,
          padding: '16px',
          textAlign: 'center',
          fontWeight: '500',
          fontSize: '15px',
          color: 'var(--text-color-secondary)',
          cursor: 'not-allowed'
        }}>
          Respuestas
        </button>
        <button className="profile-tab" style={{
          flex: 1,
          padding: '16px',
          textAlign: 'center',
          fontWeight: '500',
          fontSize: '15px',
          color: 'var(--text-color-secondary)',
          cursor: 'not-allowed'
        }}>
          Me gusta
        </button>
      </div>

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
              <Link
                to={`/profile/${tweet.authorId}`}
                onClick={(e) => e.stopPropagation()}
                className="tweet-avatar"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                {tweet.authorUsername.charAt(0).toUpperCase()}
              </Link>
              <div className="tweet-content-wrapper">
                <div className="tweet-header">
                  <div className="tweet-author-info">
                    <Link
                      to={`/profile/${tweet.authorId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="tweet-author-name"
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      {tweet.authorUsername}
                    </Link>
                    <Link
                      to={`/profile/${tweet.authorId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="tweet-author-handle"
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      @{tweet.authorUsername}
                    </Link>
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
            <h3>No hay publicaciones</h3>
            <p style={{ marginTop: '8px' }}>
              Este usuario no ha publicado nada todavía.
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
      
      <UsersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
        userId={targetUserId || ''}
        type={modalType}
      />

      <ReplyModal
        isOpen={isReplyModalOpen}
        onClose={() => setIsReplyModalOpen(false)}
        parentTweet={replyParent}
        onSuccess={handleReplySuccess}
      />
    </div>
  );
};

export default Profile;
