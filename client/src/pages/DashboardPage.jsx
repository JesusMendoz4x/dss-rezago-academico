import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState.jsx';
import Icon from '../components/Icon.jsx';
import { getScenarios } from '../services/api.js';

export default function DashboardPage() {
  const [scenarios, setScenarios] = useState([]);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    getScenarios(controller.signal).then((data) => {
      setScenarios(data);
      setStatus('ready');
    }).catch((error) => {
      if (error.name !== 'AbortError') {
        setMessage(error.message);
        setStatus('error');
      }
    });
    return () => controller.abort();
  }, []);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="section-kicker">UNA MIRADA PARA ACOMPAÑAR MEJOR</p>
          <h1>Resumen académico</h1>
          <p>Comprende el contexto antes de decidir a quién dar seguimiento.</p>
        </div>
        <span className="page-tag">Seguimiento semanal</span>
      </div>
      <EmptyState />
      <section className="scenarios-section" aria-labelledby="scenarios-title">
        <div className="section-heading">
          <div>
            <h2 id="scenarios-title">Criterios para explorar</h2>
            <p>Escenarios configurados para el análisis. La comparación estará disponible en una próxima etapa.</p>
          </div>
          <Icon name="scenarios" />
        </div>
        {status === 'loading' && <p className="feedback" role="status">Cargando escenarios…</p>}
        {status === 'error' && <p className="feedback feedback-error" role="alert">{message}</p>}
        {status === 'ready' && scenarios.length === 0 && <p className="feedback">No hay escenarios configurados.</p>}
        <div className="scenario-grid">
          {scenarios.map((scenario) => (
            <article className="scenario-card" key={scenario.id}>
              <span className="scenario-label">CONFIGURACIÓN</span>
              <h3>{scenario.nombre}</h3>
              <dl>
                <div><dt>Prioridad alta</dt><dd>Desde {scenario.umbrales.alto} puntos</dd></div>
                <div><dt>Periodo</dt><dd>{scenario.ventanaSemanas ? `Últimas ${scenario.ventanaSemanas} semanas` : 'Periodo completo'}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>
      <aside className="decision-note" aria-label="Uso del sistema">
        <Icon name="book" />
        <p>El seguimiento busca ofrecer apoyo oportuno. Los indicadores no determinan sanciones ni acreditación.</p>
      </aside>
    </>
  );
}
