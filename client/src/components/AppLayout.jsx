import Icon from './Icon.jsx';

const upcoming = [
  { name: 'Comparar escenarios', icon: 'scenarios' },
];

export default function AppLayout({ children, page }) {
  return (
    <div className="app-layout">
      <a className="skip-link" href="#main-content" onClick={(event) => {
        event.preventDefault();
        const main = document.getElementById('main-content');
        main?.focus();
        main?.scrollIntoView({ block: 'start' });
      }}>Saltar al contenido</a>
      <aside className="sidebar" aria-label="Menú principal">
        <a className="brand" href="#/" aria-label="Aula, inicio">
          <span className="brand-mark"><Icon name="book" /></span>
          <span><strong>Aula</strong><small>Seguimiento académico</small></span>
        </a>
        <nav aria-label="Navegación principal">
          <p className="nav-label">ESPACIO DE TRABAJO</p>
          {[{ id: 'overview', name: 'Resumen', href: '#/', icon: 'overview' }, { id: 'quality', name: 'Calidad de datos', href: '#/calidad', icon: 'quality' }, { id: 'students', name: 'Estudiantes', href: '#/estudiantes', icon: 'students' }].map((item) => (
            <a className={`nav-item${page === item.id ? ' is-active' : ''}`} href={item.href} aria-current={page === item.id ? 'page' : undefined} key={item.id}>
              <Icon name={item.icon} /><span>{item.name}</span>
            </a>
          ))}
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
          <p>Espacio del tutor <span aria-hidden="true">/</span> <strong>{page === 'quality' ? 'Calidad de datos' : page === 'students' ? 'Estudiantes' : 'Resumen'}</strong></p>
          <span className="demo-label">Datos ficticios</span>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>{children}</main>
        <footer className="workspace-footer">Acompañamiento académico con decisiones explicables.</footer>
      </div>
    </div>
  );
}
