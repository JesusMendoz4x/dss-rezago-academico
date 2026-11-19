import Icon from './Icon.jsx';

export default function EmptyState() {
  return (
    <section className="empty-state" aria-labelledby="empty-title">
      <div className="empty-illustration"><Icon name="data" /></div>
      <span className="section-kicker">TU PUNTO DE PARTIDA</span>
      <h2 id="empty-title">Cada seguimiento empieza con información</h2>
      <p>El resumen estará disponible cuando los datos académicos estén conectados. Aquí podrás identificar quién necesita acompañamiento y comprender los motivos.</p>
      <span className="empty-status">Sin un lote conectado a esta vista</span>
      <div className="source-list" aria-label="Fuentes académicas previstas">
        <span>Asistencia</span><span>Evaluaciones</span><span>Entregas</span>
      </div>
    </section>
  );
}
