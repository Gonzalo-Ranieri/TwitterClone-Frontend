import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '../api/client';
import Timeline from '../pages/Timeline';
import { AuthProvider } from '../context/AuthContext';

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

describe('Timeline Component Integration Tests', () => {
  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
  };

  const mockTweets = [
    {
      id: 'tweet-1',
      content: 'Hello this is tweet 1',
      authorId: 'user-456',
      authorUsername: 'otheruser',
      authorAvatarPlaceholder: 'avatar.png',
      createdAt: '2026-06-04T00:00:00Z',
      likeCount: 5,
      liked: false,
    },
    {
      id: 'tweet-2',
      content: 'This is my own tweet',
      authorId: 'user-123', // Matches mockUser.id
      authorUsername: 'testuser',
      authorAvatarPlaceholder: 'avatar.png',
      createdAt: '2026-06-04T01:00:00Z',
      likeCount: 2,
      liked: true,
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('user', JSON.stringify(mockUser));
    vi.clearAllMocks();

    // Default mock response for timeline GET
    vi.mocked(client.get).mockResolvedValue({
      data: {
        content: mockTweets,
        last: true,
      },
    });
  });

  it('renders tweets from the timeline successfully', async () => {
    render(
      <AuthProvider>
        <Timeline />
      </AuthProvider>
    );

    // Verify timeline fetch is called
    await waitFor(() => {
      expect(client.get).toHaveBeenCalledWith('/api/timeline?page=0&size=10');
    });

    // Check that tweets content are displayed
    expect(screen.getByText('Hello this is tweet 1')).toBeInTheDocument();
    expect(screen.getByText('This is my own tweet')).toBeInTheDocument();

    // Other user tweet should have a Follow button
    expect(screen.getByTestId('follow-btn-user-456')).toBeInTheDocument();
    expect(screen.getByTestId('follow-btn-user-456')).toHaveTextContent('Siguiendo');

    // Own tweet should have a Delete button instead of Follow button
    expect(screen.getByTestId('delete-btn-tweet-2')).toBeInTheDocument();
    expect(screen.queryByTestId('follow-btn-user-123')).not.toBeInTheDocument();
  });

  it('allows posting a new tweet successfully', async () => {
    const newTweetResponse = {
      id: 'tweet-3',
      content: 'Just posted this brand new tweet!',
      authorId: 'user-123',
      authorUsername: 'testuser',
      authorAvatarPlaceholder: 'avatar.png',
      createdAt: '2026-06-04T02:00:00Z',
      likeCount: 0,
      liked: false,
    };

    vi.mocked(client.post).mockResolvedValueOnce({
      data: newTweetResponse,
    });

    render(
      <AuthProvider>
        <Timeline />
      </AuthProvider>
    );

    // Wait for initial render
    await screen.findByText('Hello this is tweet 1');

    const textarea = screen.getByPlaceholderText('¿Qué está pasando?');
    const postButton = screen.getByRole('button', { name: /Postear/i });

    // Type content
    fireEvent.change(textarea, { target: { value: 'Just posted this brand new tweet!' } });
    expect(screen.getByText('33 / 280')).toBeInTheDocument();

    // Click submit
    fireEvent.click(postButton);

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/api/tweets', {
        content: 'Just posted this brand new tweet!',
      });
    });

    // Verify the new tweet appears in the timeline list
    expect(await screen.findByText('Just posted this brand new tweet!')).toBeInTheDocument();
  });

  it('handles liking and unliking a tweet optimistically', async () => {
    vi.mocked(client.post).mockResolvedValueOnce({});
    vi.mocked(client.delete).mockResolvedValueOnce({});

    render(
      <AuthProvider>
        <Timeline />
      </AuthProvider>
    );

    // Find and click like button on tweet-1 (initially not liked, count = 5)
    const likeButton1 = await screen.findByTestId('like-btn-tweet-1');
    const likeCount1 = screen.getByTestId('like-count-tweet-1');
    expect(likeCount1).toHaveTextContent('5');

    fireEvent.click(likeButton1);

    // Optimistic update should toggle it immediately to liked and count = 6
    expect(likeCount1).toHaveTextContent('6');
    expect(client.post).toHaveBeenCalledWith('/api/tweets/tweet-1/like');

    // Find and click like button on tweet-2 (initially liked, count = 2)
    const likeButton2 = screen.getByTestId('like-btn-tweet-2');
    const likeCount2 = screen.getByTestId('like-count-tweet-2');
    expect(likeCount2).toHaveTextContent('2');

    fireEvent.click(likeButton2);

    // Optimistic update should toggle it immediately to unliked and count = 1
    expect(likeCount2).toHaveTextContent('1');
    expect(client.delete).toHaveBeenCalledWith('/api/tweets/tweet-2/like');
  });

  it('allows unfollowing and refollowing a user from a tweet card', async () => {
    vi.mocked(client.delete).mockResolvedValueOnce({});
    vi.mocked(client.post).mockResolvedValueOnce({});
    
    // Stub confirm dialog
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <AuthProvider>
        <Timeline />
      </AuthProvider>
    );

    const followBtn = await screen.findByTestId('follow-btn-user-456');
    expect(followBtn).toHaveTextContent('Siguiendo');

    // Unfollow
    fireEvent.click(followBtn);

    await waitFor(() => {
      expect(client.delete).toHaveBeenCalledWith('/api/users/user-456/follow');
    });
    expect(followBtn).toHaveTextContent('Seguir');

    // Refollow
    fireEvent.click(followBtn);

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/api/users/user-456/follow');
    });
    expect(followBtn).toHaveTextContent('Siguiendo');
  });
});
