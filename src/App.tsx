import './App.css'

function App() {
  return (
    <div className="container">
      {/* Left Sidebar */}
      <aside className="sidebar">
        <div className="logo-container">
          <svg viewBox="0 0 24 24" className="twitter-logo" aria-hidden="true">
            <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
        <nav className="nav-links">
          <a href="#" className="nav-link active">
            <span className="icon">🏠</span>
            <span className="text">Inicio</span>
          </a>
          <a href="#" className="nav-link">
            <span className="icon">🔍</span>
            <span className="text">Buscar</span>
          </a>
          <a href="#" className="nav-link">
            <span className="icon">👤</span>
            <span className="text">Perfil</span>
          </a>
        </nav>
        <button className="tweet-button">Postear</button>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="feed-header">
          <h2>Inicio</h2>
        </header>

        <div className="feed-placeholder">
          <h3>¡Bienvenido al Clon de Twitter/X!</h3>
          <p>El andamiaje inicial se ha completado con éxito.</p>
          <div className="status-badge">
            <span className="status-dot"></span>
            Conectado a la base de datos PostgreSQL
          </div>
        </div>
      </main>

      {/* Right Sidebar Widgets */}
      <aside className="widgets">
        <div className="search-bar-container">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Buscar usuarios..." disabled />
          </div>
        </div>
        <div className="widget-box">
          <h3>Qué está pasando</h3>
          <div className="trend-item">
            <span className="trend-category">Tendencia en Argentina</span>
            <span className="trend-name">#SpringBoot</span>
            <span className="trend-posts">10.5K posts</span>
          </div>
          <div className="trend-item">
            <span className="trend-category">Tecnología · Tendencia</span>
            <span className="trend-name">#ReactJS</span>
            <span className="trend-posts">84.2K posts</span>
          </div>
        </div>
      </aside>
    </div>
  )
}

export default App
