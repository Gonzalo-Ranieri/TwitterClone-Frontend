/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { fetchEventSource } from '@microsoft/fetch-event-source';

export interface NotificationItem {
  id: string;
  actorUsername: string;
  type: 'LIKE' | 'FOLLOW';
  referenceId?: string;
  createdAt: string;
  isRead: boolean;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Load persistent notifications when user changes
  useEffect(() => {
    if (user) {
      const storedNotifications = localStorage.getItem(`notifications_${user.id}`);
      const storedUnreadCount = localStorage.getItem(`unreadCount_${user.id}`);

      if (storedNotifications) {
        try {
          setNotifications(JSON.parse(storedNotifications));
        } catch {
          setNotifications([]);
        }
      } else {
        setNotifications([]);
      }

      if (storedUnreadCount) {
        const count = parseInt(storedUnreadCount, 10);
        setUnreadCount(isNaN(count) ? 0 : count);
      } else {
        setUnreadCount(0);
      }
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  // Connect to SSE stream
  useEffect(() => {
    if (!isAuthenticated || !token || !user) {
      return;
    }

    const ctrl = new AbortController();
    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const streamUrl = `${serverUrl}/api/notifications/stream`;

    const connectSSE = async () => {
      try {
        await fetchEventSource(streamUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          signal: ctrl.signal,
          onmessage(msg) {
            if (msg.event === 'NOTIFICATION') {
              try {
                const data = JSON.parse(msg.data);
                const newItem: NotificationItem = {
                  id: data.id,
                  actorUsername: data.actorUsername,
                  type: data.type,
                  referenceId: data.referenceId,
                  createdAt: data.createdAt,
                  isRead: false
                };

                setNotifications((prev) => {
                  const updated = [newItem, ...prev];
                  localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updated));
                  return updated;
                });

                setUnreadCount((prev) => {
                  const updated = prev + 1;
                  localStorage.setItem(`unreadCount_${user.id}`, String(updated));
                  return updated;
                });
              } catch (e) {
                console.error('Error parsing SSE notification payload:', e);
              }
            }
          },
          onerror(err) {
            console.error('SSE connection error:', err);
            // Returning empty lets it reconnect automatically with backoff
          }
        });
      } catch (err) {
        if (ctrl.signal.aborted) {
          console.log('SSE connection aborted manually.');
        } else {
          console.error('Fetch Event Source connection failed:', err);
        }
      }
    };

    connectSSE();

    return () => {
      ctrl.abort();
    };
  }, [isAuthenticated, token, user]);

  const markAllAsRead = () => {
    if (!user) return;

    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updated));
      return updated;
    });

    setUnreadCount(0);
    localStorage.setItem(`unreadCount_${user.id}`, '0');
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
