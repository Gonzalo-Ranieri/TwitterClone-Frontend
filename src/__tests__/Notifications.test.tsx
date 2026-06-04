import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import Layout from '../components/Layout';
import NotificationsPage from '../pages/NotificationsPage';

vi.mock('@microsoft/fetch-event-source', () => {
  return {
    fetchEventSource: vi.fn(),
  };
});

describe('Notifications Integration Tests', () => {
  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
  };

  let onMessageCallback: any = null;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('user', JSON.stringify(mockUser));
    vi.clearAllMocks();

    onMessageCallback = null;
    vi.mocked(fetchEventSource).mockImplementation(async (_url, options) => {
      onMessageCallback = options?.onmessage;
      return Promise.resolve();
    });
  });

  it('connects to SSE stream and receives a notification in real-time', async () => {
    render(
      <AuthProvider>
        <NotificationProvider>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<div>Timeline Home</div>} />
                <Route path="notifications" element={<NotificationsPage />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </NotificationProvider>
      </AuthProvider>
    );

    // Verify SSE connection was initiated
    await waitFor(() => {
      expect(fetchEventSource).toHaveBeenCalled();
    });

    // Check that there is no notification badge initially
    expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();

    // Simulate receiving a LIKE event over SSE
    expect(onMessageCallback).not.toBeNull();
    onMessageCallback({
      event: 'NOTIFICATION',
      data: JSON.stringify({
        id: 'notif-1',
        actorUsername: 'juan',
        type: 'LIKE',
        referenceId: 'tweet-123',
        createdAt: new Date().toISOString(),
      }),
    });

    // Verify notification badge displays "1"
    const badge = await screen.findByTestId('notification-badge');
    expect(badge).toHaveTextContent('1');

    // Simulate receiving a FOLLOW event over SSE
    onMessageCallback({
      event: 'NOTIFICATION',
      data: JSON.stringify({
        id: 'notif-2',
        actorUsername: 'maria',
        type: 'FOLLOW',
        createdAt: new Date().toISOString(),
      }),
    });

    // Verify notification badge increments to "2"
    await waitFor(() => {
      expect(screen.getByTestId('notification-badge')).toHaveTextContent('2');
    });
  });

  it('displays notifications list and marks all as read', async () => {
    // Seed initial notifications in localStorage for user-123
    const seededNotifications = [
      {
        id: 'notif-1',
        actorUsername: 'juan',
        type: 'LIKE',
        referenceId: 'tweet-123',
        createdAt: new Date().toISOString(),
        isRead: false,
      },
    ];
    localStorage.setItem('notifications_user-123', JSON.stringify(seededNotifications));
    localStorage.setItem('unreadCount_user-123', '1');

    render(
      <AuthProvider>
        <NotificationProvider>
          <MemoryRouter initialEntries={['/notifications']}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route path="notifications" element={<NotificationsPage />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </NotificationProvider>
      </AuthProvider>
    );

    // Verify the page renders notifications list
    expect(screen.getByRole('heading', { name: 'Notificaciones' })).toBeInTheDocument();
    expect(screen.getByTestId('notification-badge')).toHaveTextContent('1');
    expect(screen.getByTestId('notification-item-notif-1')).toBeInTheDocument();
    expect(screen.getByText(/@juan/)).toBeInTheDocument();
    expect(screen.getByText(/le dio me gusta a tu tweet/)).toBeInTheDocument();

    // Click "Marcar todas como leídas" button
    const markReadBtn = screen.getByTestId('mark-read-btn');
    fireEvent.click(markReadBtn);

    // Verify badge disappears
    await waitFor(() => {
      expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
    });

    // Verify class turns to read
    expect(screen.getByTestId('notification-item-notif-1')).toHaveClass('read');
  });
});
