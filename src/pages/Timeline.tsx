import React from 'react';
import { useAuth } from '../context/AuthContext';

export const Timeline: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="timeline-container">
      <header className="feed-header">
        <h2>Inicio</h2>
      </header>

      <div className="feed-placeholder">
        <h3>¡Bienvenido al Clon de Twitter/X, {user?.username}!</h3>
        <p>Has iniciado sesión correctamente. La protección de rutas y la autenticación stateless con JWT están funcionando de extremo a extremo.</p>
        
        <div className="status-badge" style={{ marginTop: '24px' }}>
          <span className="status-dot"></span>
          Sesión Activa - JWT Verificado
        </div>
      </div>
    </div>
  );
};

export default Timeline;
