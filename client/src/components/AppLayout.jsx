import Icon from './Icon.jsx';

const upcoming = [
  { name: 'Calidad de datos', icon: 'quality' },
  { name: 'Estudiantes', icon: 'students' },
  { name: 'Comparar escenarios', icon: 'scenarios' },
];

export default function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <aside className="sidebar" aria-label="Menú principal">
        <a className="brand" href="#main-content" aria-label="Aula, inicio">
          <span className="brand-mark"><Icon name="book" /></span>
          <span><strong>Aula</strong><small>Seguimiento académico</small></span>
        </a>
        <nav aria-label="Navegación principal">
          <p className="nav-label">ESPACIO DE TRABAJO</p>
          <a className="nav-item is-active" href="#main-content" aria-current="page">
            <Icon name="overview" /><span>Resumen</span>
          </a>
          <p className="nav-label upcoming-label">PRÓXIMAMENTE</p>
          {upcoming.map((item) => (
            <span className="nav-item is-unavailable" aria-disabled="true" key={item.name}>
              <Icon name={item.icon} /><span>{item.name}</span>
            </span>
          ))}
        </nav>
        <div className="sidebar-note">
          <Icon name="book" />
          <p>La información orienta.<br /><strong>El tutor decide.</strong></p>
        </div>
        <p className="sidebar-footer">Sistema de apoyo a decisiones</p>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <p>Espacio del tutor <span aria-hidden="true">/</span> <strong>Resumen</strong></p>
          <span className="demo-label">Datos ficticios</span>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>{children}</main>
        <footer className="workspace-footer">Acompañamiento académico con decisiones explicables.</footer>
      </div>
    </div>
  );
}
