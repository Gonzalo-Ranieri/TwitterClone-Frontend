/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import client from '../api/client';

interface Suggestion {
  id: string;
  username: string;
  bio?: string;
  avatarPlaceholder?: string;
}

interface SearchResultUser {
  id: string;
  username: string;
  bio?: string;
  avatarPlaceholder?: string;
  followedByCurrentUser: boolean;
}

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = async () => {
    try {
      const response = await client.get('/api/users/suggestions');
      setSuggestions(response.data);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSuggestions();
    }

    const handleFollowUpdate = () => {
      fetchSuggestions();
    };

    window.addEventListener('follow-updated', handleFollowUpdate);
    return () => {
      window.removeEventListener('follow-updated', handleFollowUpdate);
    };
  }, [user]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debounced search logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await client.get(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(response.data);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleFollowSuggestion = async (id: string) => {
    try {
      await client.post(`/api/users/${id}/follow`);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      window.dispatchEvent(new Event('follow-updated'));
    } catch (error) {
      console.error('Error following user suggestion:', error);
    }
  };

  const handleToggleFollowSearch = async (item: SearchResultUser) => {
    const isFollowing = item.followedByCurrentUser;
    try {
      // Optimistic update
      setSearchResults((prev) =>
        prev.map((u) =>
          u.id === item.id ? { ...u, followedByCurrentUser: !isFollowing } : u
        )
      );

      if (isFollowing) {
        await client.delete(`/api/users/${item.id}/follow`);
      } else {
        await client.post(`/api/users/${item.id}/follow`);
      }

      window.dispatchEvent(new Event('follow-updated'));
    } catch (error) {
      console.error('Error toggling follow in search:', error);
      // Rollback
      setSearchResults((prev) =>
        prev.map((u) => (u.id === item.id ? item : u))
      );
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="container">
      {/* Left Sidebar */}
      <aside className="sidebar">
        <div className="logo-container">
          <Link to="/">
            <svg viewBox="0 0 24 24" className="twitter-logo" aria-hidden="true" style={{ color: 'var(--primary)' }}>
              <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </Link>
        </div>
        
        <nav className="nav-links">
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
            <span className="icon">🏠</span>
            <span className="text">Inicio</span>
          </Link>
          <Link to="/notifications" className={`nav-link ${isActive('/notifications') ? 'active' : ''}`}>
            <span className="icon" style={{ position: 'relative' }}>
              🔔
              {unreadCount > 0 && (
                <span className="notification-badge" data-testid="notification-badge">
                  {unreadCount}
                </span>
              )}
            </span>
            <span className="text">Notificaciones</span>
          </Link>
          <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`}>
            <span className="icon">👤</span>
            <span className="text">Perfil</span>
          </Link>
          <button onClick={handleLogout} className="nav-link" style={{ width: '100%', textAlign: 'left' }}>
            <span className="icon">🚪</span>
            <span className="text">Salir</span>
          </button>
        </nav>
        
        {user && (
          <div className="user-profile-summary" style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            borderRadius: '9999px',
            backgroundColor: 'var(--bg-color-hover)'
          }}>
            <div className="avatar-placeholder" style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), #a855f7)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '16px'
            }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="user-info-text" style={{ overflow: 'hidden' }}>
              <div className="user-display-name" style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-color)' }}>
                {user.username}
              </div>
              <div className="user-email" style={{ fontSize: '13px', color: 'var(--text-color-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Right Sidebar Widgets */}
      <aside className="widgets">
        <div className="search-bar-container" ref={searchContainerRef}>
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              data-testid="search-input"
            />
          </div>

          {showDropdown && searchQuery.trim().length > 0 && (
            <div className="search-dropdown" data-testid="search-dropdown">
              {searchLoading && (
                <div className="search-dropdown-message">Buscando...</div>
              )}
              {!searchLoading && searchResults.length === 0 && (
                <div className="search-dropdown-message">No se encontraron resultados</div>
              )}
              {!searchLoading && searchResults.length > 0 && (
                <div className="search-results-list">
                  {searchResults.map((result) => (
                    <div key={result.id} className="search-result-item" data-testid={`search-result-item-${result.id}`}>
                      <div className="suggestion-user-info">
                        <div className="suggestion-avatar">
                          {result.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="suggestion-name-wrapper">
                          <span className="suggestion-name">{result.username}</span>
                          <span className="suggestion-handle">@{result.username}</span>
                          {result.bio && <span className="search-result-bio">{result.bio}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleFollowSearch(result)}
                        className={`follow-btn ${result.followedByCurrentUser ? 'following' : 'follow'}`}
                        data-testid={`search-follow-btn-${result.id}`}
                      >
                        {result.followedByCurrentUser ? 'Siguiendo' : 'Seguir'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="widget-box">
          <h3>Qué está pasando</h3>
          <div className="trend-item">
            <span className="trend-category">Tendencia en Argentina</span>
            <span className="trend-name">#SpringBoot</span>
            <span className="trend-posts">10.5K posts</span>
          </div>
          <div className="trend-item">
            <span className="trend-category">Tecnología · Tendencia</span>
            <span className="trend-name">#ReactJS</span>
            <span className="trend-posts">84.2K posts</span>
          </div>
        </div>
        <div className="widget-box">
          <h3>A quién seguir</h3>
          <div className="suggestions-list">
            {suggestions.map((sug) => (
              <div key={sug.id} className="suggestion-item" data-testid={`suggestion-${sug.id}`}>
                <div className="suggestion-user-info">
                  <div className="suggestion-avatar">
                    {sug.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="suggestion-name-wrapper">
                    <span className="suggestion-name">{sug.username}</span>
                    <span className="suggestion-handle">@{sug.username}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleFollowSuggestion(sug.id)}
                  className="follow-btn follow"
                  data-testid={`follow-sug-btn-${sug.id}`}
                >
                  Seguir
                </button>
              </div>
            ))}
            {suggestions.length === 0 && (
              <span style={{ fontSize: '14px', color: 'var(--text-color-secondary)' }}>
                No hay sugerencias
              </span>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Layout;
