/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import client from '../api/client';
import { getAvatarStyle, shouldShowInitials } from '../utils/styleHelper';

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

  const [showMobileDropdown, setShowMobileDropdown] = useState(false);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);

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
      if (mobileSearchContainerRef.current && !mobileSearchContainerRef.current.contains(event.target as Node)) {
        setShowMobileDropdown(false);
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
            <span className="icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '24px', height: '24px', fill: 'currentColor' }}>
                <path d="M12 2.69l5.66 5.66a8 8 0 0 1 2.34 5.65v5c0 .55-.45 1-1 1h-4v-5c0-.55-.45-1-1-1h-2c-.55 0-1 .45-1 1v5H5c-.55 0-1-.45-1-1v-5c0-2.12.84-4.16 2.34-5.65L12 2.69zM12 1a9.96 9.96 0 0 0-7.07 2.93L3.5 5.36c-2.3 2.3-3.5 5.3-3.5 8.3v5.33c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-5h2v5c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-5.33c0-3-.9-6.3-3.5-8.3l-1.43-1.43A9.96 9.96 0 0 0 12 1z" />
              </svg>
            </span>
            <span className="text">Inicio</span>
          </Link>
          <Link to="/notifications" className={`nav-link ${isActive('/notifications') ? 'active' : ''}`}>
            <span className="icon" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '24px', height: '24px', fill: 'currentColor' }}>
                <path d="M21.163 11.636L19 9.473V6c0-3.86-3.14-7-7-7S5 3.14 5 7v2.473L2.837 11.636c-.42.42-.587 1.05-.436 1.624.152.574.654.99 1.25.99H9v.25c0 1.657 1.343 3 3 3s3-1.343 3-3v-.25h5.35c.595 0 1.097-.416 1.25-.99.15-.574-.017-1.204-.437-1.624zM12 19c-.552 0-1-.448-1-1v-.25h2V18c0 .552-.448 1-1 1zm-7-6.5l1.5-1.5V7c0-2.757 2.243-5 5-5s5 2.243 5 5v4l1.5 1.5H5z" />
              </svg>
              {unreadCount > 0 && (
                <span className="notification-badge" data-testid="notification-badge">
                  {unreadCount}
                </span>
              )}
            </span>
            <span className="text">Notificaciones</span>
          </Link>
          <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`}>
            <span className="icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '24px', height: '24px', fill: 'currentColor' }}>
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </span>
            <span className="text">Perfil</span>
          </Link>
          <button onClick={handleLogout} className="nav-link">
            <span className="icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '24px', height: '24px', fill: 'currentColor' }}>
                <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
              </svg>
            </span>
            <span className="text">Salir</span>
          </button>
        </nav>
        
        {user && (
          <div className="user-profile-summary">
            <div className="avatar-placeholder" style={getAvatarStyle(user.avatarPlaceholder)}>
              {shouldShowInitials(user.avatarPlaceholder) ? user.username.charAt(0).toUpperCase() : null}
            </div>
            <div className="user-info-text">
              <div className="user-display-name">
                {user.username}
              </div>
              <div className="user-email">
                {user.email}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Mobile Search Bar */}
        <div className="mobile-search-container">
          <div className="search-bar-container" ref={mobileSearchContainerRef}>
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Buscar usuarios..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowMobileDropdown(true);
                }}
                onFocus={() => setShowMobileDropdown(true)}
                data-testid="mobile-search-input"
              />
            </div>

            {showMobileDropdown && searchQuery.trim().length > 0 && (
              <div className="search-dropdown" data-testid="mobile-search-dropdown">
                {searchLoading && (
                  <div className="search-dropdown-message">Buscando...</div>
                )}
                {!searchLoading && searchResults.length === 0 && (
                  <div className="search-dropdown-message">No se encontraron resultados</div>
                )}
                {!searchLoading && searchResults.length > 0 && (
                  <div className="search-results-list">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="search-result-item"
                        data-testid={`mobile-search-result-item-${result.id}`}
                        onClick={() => {
                          setShowMobileDropdown(false);
                          setSearchQuery('');
                          navigate(`/profile/${result.id}`);
                        }}
                      >
                        <div className="suggestion-user-info">
                          <div className="suggestion-avatar" style={getAvatarStyle(result.avatarPlaceholder)}>
                            {shouldShowInitials(result.avatarPlaceholder) ? result.username.charAt(0).toUpperCase() : null}
                          </div>
                          <div className="suggestion-name-wrapper">
                            <span className="suggestion-name">{result.username}</span>
                            <span className="suggestion-handle">@{result.username}</span>
                            {result.bio && <span className="search-result-bio">{result.bio}</span>}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFollowSearch(result);
                          }}
                          className={`follow-btn ${result.followedByCurrentUser ? 'following' : 'follow'}`}
                          data-testid={`mobile-search-follow-btn-${result.id}`}
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
        </div>
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
                    <div
                      key={result.id}
                      className="search-result-item"
                      data-testid={`search-result-item-${result.id}`}
                      onClick={() => {
                        setShowDropdown(false);
                        setSearchQuery('');
                        navigate(`/profile/${result.id}`);
                      }}
                    >
                      <div className="suggestion-user-info">
                        <div className="suggestion-avatar" style={getAvatarStyle(result.avatarPlaceholder)}>
                          {shouldShowInitials(result.avatarPlaceholder) ? result.username.charAt(0).toUpperCase() : null}
                        </div>
                        <div className="suggestion-name-wrapper">
                          <span className="suggestion-name">{result.username}</span>
                          <span className="suggestion-handle">@{result.username}</span>
                          {result.bio && <span className="search-result-bio">{result.bio}</span>}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFollowSearch(result);
                        }}
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
                  <div className="suggestion-avatar" style={getAvatarStyle(sug.avatarPlaceholder)}>
                    {shouldShowInitials(sug.avatarPlaceholder) ? sug.username.charAt(0).toUpperCase() : null}
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
