import React from 'react';
import { useNotifications } from '../context/NotificationContext';

export const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, markAllAsRead } = useNotifications();

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
    <div className="notifications-container">
      <header className="feed-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Notificaciones</h2>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="mark-read-btn"
            data-testid="mark-read-btn"
          >
            Marcar todas como leídas
          </button>
        )}
      </header>

      <div className="notifications-list" data-testid="notifications-list">
        {notifications.map((item) => (
          <div
            key={item.id}
            className={`notification-card ${item.isRead ? 'read' : 'unread'}`}
            data-testid={`notification-item-${item.id}`}
          >
            <div className="notification-icon">
              {item.type === 'LIKE' ? '❤️' : '👤'}
            </div>
            <div className="notification-content-wrapper">
              <span className="notification-message">
                {item.type === 'LIKE' ? (
                  <>
                    <strong>@{item.actorUsername}</strong> le dio me gusta a tu tweet.
                  </>
                ) : (
                  <>
                    <strong>@{item.actorUsername}</strong> comenzó a seguirte.
                  </>
                )}
              </span>
              <span className="notification-time">
                {formatDate(item.createdAt)}
              </span>
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="feed-placeholder" data-testid="notifications-empty">
            <span style={{ fontSize: '48px' }}>🔔</span>
            <h3>No tienes notificaciones</h3>
            <p>
              Cuando otros usuarios te sigan o den me gusta a tus tweets, las verás aquí en tiempo real.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
