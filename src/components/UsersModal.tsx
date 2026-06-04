import React, { useEffect, useState } from 'react';
import client from '../api/client';

interface UserItem {
  id: string;
  username: string;
  bio?: string;
  avatarPlaceholder?: string;
  followedByCurrentUser: boolean;
}

interface UsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  userId: string;
  type: 'followers' | 'following';
}

export const UsersModal: React.FC<UsersModalProps> = ({ isOpen, onClose, title, userId, type }) => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchUsers = async (pageNum: number, append = false) => {
    try {
      setLoading(true);
      const response = await client.get(`/api/users/${userId}/${type}?page=${pageNum}&size=10`);
      const data = response.data;
      if (append) {
        setUsers((prev) => [...prev, ...data.content]);
      } else {
        setUsers(data.content);
      }
      setHasMore(!data.last);
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      setUsers([]);
      setPage(0);
      fetchUsers(0);
    }
  }, [isOpen, userId, type]);

  if (!isOpen) return null;

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchUsers(nextPage, true);
  };

  const handleToggleFollow = async (item: UserItem) => {
    const isFollowing = item.followedByCurrentUser;
    try {
      // Optimistic update
      setUsers((prev) =>
        prev.map((u) =>
          u.id === item.id ? { ...u, followedByCurrentUser: !isFollowing } : u
        )
      );

      if (isFollowing) {
        await client.delete(`/api/users/${item.id}/follow`);
      } else {
        await client.post(`/api/users/${item.id}/follow`);
      }

      // Notify other components to sync follow counts
      window.dispatchEvent(new Event('follow-updated'));
    } catch (error) {
      console.error('Error toggling follow in modal:', error);
      // Rollback
      setUsers((prev) =>
        prev.map((u) => (u.id === item.id ? item : u))
      );
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="users-modal">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="modal-close-btn" data-testid="modal-close-btn">
            ✕
          </button>
        </div>

        <div className="modal-body" data-testid="modal-body">
          {users.map((item) => (
            <div key={item.id} className="user-list-item" data-testid={`modal-user-item-${item.id}`}>
              <div className="suggestion-user-info">
                <div className="suggestion-avatar">
                  {item.username.charAt(0).toUpperCase()}
                </div>
                <div className="suggestion-name-wrapper">
                  <span className="suggestion-name">{item.username}</span>
                  <span className="suggestion-handle">@{item.username}</span>
                  {item.bio && <span className="user-list-bio">{item.bio}</span>}
                </div>
              </div>
              <button
                onClick={() => handleToggleFollow(item)}
                className={`follow-btn ${item.followedByCurrentUser ? 'following' : 'follow'}`}
                data-testid={`modal-follow-btn-${item.id}`}
              >
                {item.followedByCurrentUser ? 'Siguiendo' : 'Seguir'}
              </button>
            </div>
          ))}

          {loading && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-color-secondary)' }}>
              Cargando...
            </div>
          )}

          {!loading && users.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-color-secondary)' }}>
              No se encontraron usuarios.
            </div>
          )}

          {hasMore && !loading && (
            <button onClick={handleLoadMore} className="load-more-btn" style={{ margin: '16px auto', display: 'block' }}>
              Cargar más
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersModal;
