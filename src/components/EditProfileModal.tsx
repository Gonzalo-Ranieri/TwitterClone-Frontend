import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { toast } from 'sonner';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedProfile: {
    id: string;
    username: string;
    email: string;
    bio?: string;
    avatarPlaceholder?: string;
    bannerPlaceholder?: string;
    showEmail?: boolean;
    followersCount: number;
    followingCount: number;
    followedByCurrentUser?: boolean;
  }) => void;
  initialProfile: {
    username: string;
    email: string;
    bio?: string;
    avatarPlaceholder?: string;
    bannerPlaceholder?: string;
    showEmail?: boolean;
  };
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialProfile,
}) => {
  const { updateUser } = useAuth();
  const [username, setUsername] = useState(initialProfile.username);
  const [email, setEmail] = useState(initialProfile.email);
  const [bio, setBio] = useState(initialProfile.bio || '');
  const [avatarPlaceholder, setAvatarPlaceholder] = useState(initialProfile.avatarPlaceholder || '');
  const [bannerPlaceholder, setBannerPlaceholder] = useState(initialProfile.bannerPlaceholder || '');
  const [showEmail, setShowEmail] = useState(initialProfile.showEmail !== false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.length < 3 || username.length > 30) {
      toast.error('El nombre de usuario debe tener entre 3 y 30 caracteres.');
      return;
    }
    if (!avatarPlaceholder.trim()) {
      toast.error('La foto de perfil es requerida.');
      return;
    }
    if (!bannerPlaceholder.trim()) {
      toast.error('La foto de portada es requerida.');
      return;
    }
    setLoading(true);
    try {
      const response = await client.put('/api/users/profile', {
        username,
        email,
        bio: bio.trim(),
        avatarPlaceholder: avatarPlaceholder.trim(),
        bannerPlaceholder: bannerPlaceholder.trim(),
        showEmail,
      });

      // Update context user info
      updateUser({
        id: response.data.id,
        username: response.data.username,
        email: response.data.email,
        bio: response.data.bio,
        avatarPlaceholder: response.data.avatarPlaceholder,
      });

      toast.success('Perfil actualizado correctamente.');
      onSuccess(response.data);
      onClose();
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      const err = error as { response?: { data?: { message?: string } | string } };
      const errMsg =
        err.response?.data && typeof err.response.data === 'object' && 'message' in err.response.data
          ? (err.response.data as { message: string }).message
          : typeof err.response?.data === 'string'
          ? err.response.data
          : 'Error al actualizar el perfil.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const avatarPresets = [
    'linear-gradient(135deg, #a855f7, var(--primary))',
    'linear-gradient(135deg, #f97316, #ef4444)',
    'linear-gradient(135deg, #10b981, #06b6d4)',
    'linear-gradient(135deg, #3b82f6, #6366f1)',
    '#f43f5e',
    '#0f172a',
  ];

  const bannerPresets = [
    'linear-gradient(135deg, var(--primary), #a855f7, #ec4899)',
    'linear-gradient(135deg, #f97316, #facc15, #10b981)',
    'linear-gradient(135deg, #06b6d4, #3b82f6, #6366f1)',
    'linear-gradient(135deg, #14b8a6, #0f172a)',
    '#1e293b',
  ];

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="edit-profile-modal">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px', width: '95%' }}
      >
        <div className="modal-header">
          <h3 style={{ fontSize: '20px', fontWeight: '800' }}>Editar Perfil</h3>
          <button onClick={onClose} className="modal-close-btn" data-testid="edit-profile-close-btn">
            ✕
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="modal-body"
          style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px' }}
        >
          {/* Avatar URL or Preset */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-color)' }}>
              Foto de perfil (URL o Preset)
            </label>
            <input
              type="text"
              className="form-control"
              style={{ padding: '12px' }}
              placeholder="https://ejemplo.com/avatar.jpg"
              value={avatarPlaceholder}
              onChange={(e) => setAvatarPlaceholder(e.target.value)}
              data-testid="edit-avatar-input"
            />
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
              {avatarPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAvatarPlaceholder(preset)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: preset,
                    border:
                      avatarPlaceholder === preset
                        ? '3px solid var(--text-color)'
                        : '1px solid var(--border-color)',
                    cursor: 'pointer',
                  }}
                  title={preset}
                />
              ))}
            </div>
          </div>

          {/* Banner URL or Preset */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-color)' }}>
              Foto de portada (URL o Preset)
            </label>
            <input
              type="text"
              className="form-control"
              style={{ padding: '12px' }}
              placeholder="https://ejemplo.com/banner.jpg"
              value={bannerPlaceholder}
              onChange={(e) => setBannerPlaceholder(e.target.value)}
              data-testid="edit-banner-input"
            />
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
              {bannerPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBannerPlaceholder(preset)}
                  style={{
                    width: '48px',
                    height: '24px',
                    borderRadius: '4px',
                    background: preset,
                    border:
                      bannerPlaceholder === preset
                        ? '3px solid var(--text-color)'
                        : '1px solid var(--border-color)',
                    cursor: 'pointer',
                  }}
                  title={preset}
                />
              ))}
            </div>
          </div>

          {/* Username */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-color)' }}>
              Nombre de usuario
            </label>
            <input
              type="text"
              className="form-control"
              style={{ padding: '12px' }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              data-testid="edit-username-input"
            />
          </div>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-color)' }}>
              Correo electrónico
            </label>
            <input
              type="email"
              className="form-control"
              style={{ padding: '12px' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="edit-email-input"
            />
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                marginTop: '6px',
                cursor: 'pointer',
                color: 'var(--text-color-secondary)',
              }}
            >
              <input
                type="checkbox"
                checked={showEmail}
                onChange={(e) => setShowEmail(e.target.checked)}
                data-testid="edit-showemail-checkbox"
              />
              Mostrar correo electrónico públicamente en mi perfil
            </label>
          </div>

          {/* Bio */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-color)' }}>
              Biografía
            </label>
            <textarea
              className="form-control"
              style={{ padding: '12px', minHeight: '80px', resize: 'none' }}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              data-testid="edit-bio-textarea"
            />
          </div>

          <button
            type="submit"
            className="follow-btn follow"
            disabled={loading}
            style={{ width: '100%', padding: '12px', fontSize: '16px', marginTop: '8px' }}
            data-testid="edit-profile-submit-btn"
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
