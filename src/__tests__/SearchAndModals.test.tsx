import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import client from '../api/client';
import Layout from '../components/Layout';
import Profile from '../pages/Profile';
import { AuthProvider } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';

vi.mock('../api/client', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    }
  };
});

// Helper helper to sleep for real time
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Search and Modals Integration Tests', () => {
  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'testuser@example.com',
    bio: 'Test bio',
    avatarPlaceholder: 'avatar.png'
  };

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('user', JSON.stringify(mockUser));
    vi.clearAllMocks();
  });

  describe('Search Bar in Layout', () => {
    it('debounces and displays search results after typing', async () => {
      // Mock suggestions search response
      vi.mocked(client.get).mockImplementation((url: string) => {
        if (url.includes('/api/users/suggestions')) {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/users/search')) {
          return Promise.resolve({
            data: [
              {
                id: 'user-789',
                username: 'searcheduser',
                bio: 'Found through search',
                followedByCurrentUser: false
              }
            ]
          });
        }
        return Promise.reject(new Error('Unknown url: ' + url));
      });

      render(
        <AuthProvider>
          <NotificationProvider>
            <MemoryRouter initialEntries={['/']}>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<div>Timeline Content</div>} />
                </Route>
              </Routes>
            </MemoryRouter>
          </NotificationProvider>
        </AuthProvider>
      );

      // Verify layout search input is present
      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toBeInTheDocument();

      // Type into search bar
      fireEvent.change(searchInput, { target: { value: 'search' } });

      // Search API should NOT be called immediately due to debounce
      expect(client.get).not.toHaveBeenCalledWith(expect.stringContaining('/api/users/search'));

      // Sleep 350ms to exceed 300ms debounce
      await sleep(350);

      // Now search API should have been called
      await waitFor(() => {
        expect(client.get).toHaveBeenCalledWith('/api/users/search?q=search');
      });

      // Dropdown should be visible with the result
      const resultItem = await screen.findByTestId('search-result-item-user-789');
      expect(resultItem).toBeInTheDocument();
      expect(screen.getByText('searcheduser')).toBeInTheDocument();
      expect(screen.getByText('Found through search')).toBeInTheDocument();
    });

    it('allows following a user from search results', async () => {
      vi.mocked(client.get).mockImplementation((url: string) => {
        if (url.includes('/api/users/suggestions')) {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/users/search')) {
          return Promise.resolve({
            data: [
              {
                id: 'user-789',
                username: 'searcheduser',
                bio: 'Found through search',
                followedByCurrentUser: false
              }
            ]
          });
        }
        return Promise.reject(new Error('Unknown url: ' + url));
      });

      vi.mocked(client.post).mockResolvedValueOnce({ data: {} });

      render(
        <AuthProvider>
          <NotificationProvider>
            <MemoryRouter initialEntries={['/']}>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<div>Timeline Content</div>} />
                </Route>
              </Routes>
            </MemoryRouter>
          </NotificationProvider>
        </AuthProvider>
      );

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'search' } });

      // Sleep 350ms to exceed 300ms debounce
      await sleep(350);

      const followBtn = await screen.findByTestId('search-follow-btn-user-789');
      expect(followBtn).toHaveTextContent('Seguir');

      // Click follow
      fireEvent.click(followBtn);

      await waitFor(() => {
        expect(client.post).toHaveBeenCalledWith('/api/users/user-789/follow');
      });

      // UI should update to show "Siguiendo"
      expect(followBtn).toHaveTextContent('Siguiendo');
    });
  });

  describe('Profile Modals for followers and following', () => {
    it('opens followers modal when clicking on followers count', async () => {
      // Mock profile response
      vi.mocked(client.get).mockImplementation((url: string) => {
        if (url === '/api/users/user-123') {
          return Promise.resolve({
            data: {
              id: 'user-123',
              username: 'testuser',
              email: 'test@example.com',
              bio: 'Test bio',
              followersCount: 5,
              followingCount: 10
            }
          });
        }
        if (url.includes('/api/users/user-123/followers')) {
          return Promise.resolve({
            data: {
              content: [
                {
                  id: 'follower-1',
                  username: 'followerone',
                  bio: 'Follower bio',
                  followedByCurrentUser: false
                }
              ],
              last: true
            }
          });
        }
        return Promise.reject(new Error('Unknown url: ' + url));
      });

      render(
        <AuthProvider>
          <Profile />
        </AuthProvider>
      );

      // Verify counts load
      await waitFor(() => {
        expect(screen.getByTestId('followers-count')).toHaveTextContent('5');
        expect(screen.getByTestId('following-count')).toHaveTextContent('10');
      });

      // Click followers count trigger
      const followersTrigger = screen.getByTestId('open-followers-modal');
      fireEvent.click(followersTrigger);

      // Check modal renders
      const modal = await screen.findByTestId('users-modal');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveTextContent('Seguidores');

      // Check user list item in modal
      await waitFor(() => {
        expect(client.get).toHaveBeenCalledWith('/api/users/user-123/followers?page=0&size=10');
      });

      expect(screen.getByTestId('modal-user-item-follower-1')).toBeInTheDocument();
      expect(screen.getByText('followerone')).toBeInTheDocument();
      expect(screen.getByText('Follower bio')).toBeInTheDocument();

      // Close modal
      const closeBtn = screen.getByTestId('modal-close-btn');
      fireEvent.click(closeBtn);
      
      await waitFor(() => {
        expect(screen.queryByTestId('users-modal')).not.toBeInTheDocument();
      });
    });
  });
});
