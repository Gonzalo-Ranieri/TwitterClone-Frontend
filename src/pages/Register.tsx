import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const validate = () => {
    if (username.length < 3 || username.length > 30) {
      setError('El nombre de usuario debe tener entre 3 y 30 caracteres.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Por favor, ingresa un email válido.');
      return false;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return false;
    }
    if (bio.length > 280) {
      setError('La biografía no puede superar los 280 caracteres.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await client.post('/api/auth/register', {
        username,
        email,
        password,
        bio: bio.trim() || undefined,
        avatarPlaceholder: `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${username}`,
      });

      const { token, id, username: respUsername, email: respEmail, bio: respBio, avatarPlaceholder } = response.data;
      login(token, { id, username: respUsername, email: respEmail, bio: respBio, avatarPlaceholder });
      navigate('/');
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (err.response && err.response.data) {
        setError(typeof err.response.data === 'string' ? err.response.data : 'Error al registrar el usuario.');
      } else {
        setError('Error al conectar con el servidor. Inténtalo de nuevo más tarde.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <svg viewBox="0 0 24 24" className="twitter-logo" aria-hidden="true" style={{ color: 'var(--primary)', width: '48px', height: '48px', marginBottom: '16px' }}>
            <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
        <h2 className="auth-title">Crea tu cuenta</h2>
        
        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <input
              type="text"
              id="username"
              className="form-control"
              placeholder=" "
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              disabled={isSubmitting}
              required
            />
            <label htmlFor="username">Nombre de usuario label</label>
          </div>

          <div className="form-group">
            <input
              type="email"
              id="email"
              className="form-control"
              placeholder=" "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <label htmlFor="email">Correo electrónico label</label>
          </div>

          <div className="form-group">
            <input
              type="password"
              id="password"
              className="form-control"
              placeholder=" "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <label htmlFor="password">Contraseña label</label>
          </div>

          <div className="form-group">
            <textarea
              id="bio"
              className="form-control"
              placeholder=" "
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={isSubmitting}
              maxLength={280}
              style={{ minHeight: '80px', resize: 'vertical' }}
            />
            <label htmlFor="bio">Biografía (opcional) label</label>
            <span style={{ fontSize: '11px', color: 'var(--text-color-secondary)', position: 'absolute', right: '12px', bottom: '-18px' }}>
              {bio.length}/280
            </span>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={isSubmitting} style={{ marginTop: '24px' }}>
            {isSubmitting ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        <p className="auth-footer">
          ¿Ya tienes una cuenta? <Link to="/login" className="auth-link">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
