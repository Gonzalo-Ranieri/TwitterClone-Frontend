import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import UsersModal from '../components/UsersModal';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  bio?: string;
  avatarPlaceholder?: string;
  followersCount: number;
  followingCount: number;
}

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalType, setModalType] = useState<'followers' | 'following'>('followers');

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const response = await client.get(`/api/users/${user.id}`);
      setProfileData(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    fetchProfile();
    // Refresh stats if follows change
    const handleFollowUpdate = () => {
      fetchProfile();
    };
    window.addEventListener('follow-updated', handleFollowUpdate);
    return () => {
      window.removeEventListener('follow-updated', handleFollowUpdate);
    };
  }, [user]);

  if (!user) {
    return <div style={{ padding: '20px', color: 'var(--text-color)' }}>No hay sesión activa.</div>;
  }

  return (
    <div className="profile-container" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header className="feed-header" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '12px 16px' }}>
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
          {user.username.charAt(0).toUpperCase()}
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          paddingTop: '12px',
          minHeight: '60px'
        }}>
          <button
            onClick={logout}
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
        </div>

        {/* User Details */}
        <div style={{ marginTop: '12px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: 'var(--text-color)' }}>
            {user.username}
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-color-secondary)', margin: '2px 0 12px 0' }}>
            @{user.username}
          </p>

          <p style={{ fontSize: '15px', color: 'var(--text-color)', lineHeight: '1.4', margin: '0 0 12px 0' }}>
            {profileData ? profileData.bio : (user.bio || 'Sin biografía todavía.')}
          </p>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '14px', color: 'var(--text-color-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              📧 {user.email}
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

      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-color-secondary)' }}>
        No has publicado ningún post todavía.
      </div>
      
      <UsersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
        userId={user.id}
        type={modalType}
      />
    </div>
  );
};

export default Profile;
