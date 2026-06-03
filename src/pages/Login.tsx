import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export const Login: React.FC = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await client.post('/api/auth/login', {
        usernameOrEmail,
        password,
      });

      const { token, id, username, email, bio, avatarPlaceholder } = response.data;
      login(token, { id, username, email, bio, avatarPlaceholder });
      navigate('/');
    } catch (err: any) {
      if (err.response && err.response.data) {
        setError(typeof err.response.data === 'string' ? err.response.data : 'Credenciales incorrectas');
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
        <h2 className="auth-title">Inicia sesión en Twitter/X</h2>
        
        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <input
              type="text"
              id="usernameOrEmail"
              className="form-control"
              placeholder=" "
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <label htmlFor="usernameOrEmail">Nombre de usuario o Email label</label>
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

          <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="auth-footer">
          ¿No tienes una cuenta? <Link to="/register" className="auth-link">Regístrate</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
