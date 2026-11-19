import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState.jsx';
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
    <main className="container">
      <header>
        <p className="eyebrow">APOYO A LA TOMA DE DECISIONES</p>
        <h1>Seguimiento acad?mico</h1>
        <p>Prioriza el acompa?amiento de tus estudiantes con informaci?n explicable.</p>
      </header>
      <EmptyState />
      <section aria-labelledby="scenarios-title">
        <h2 id="scenarios-title">Escenarios de an?lisis</h2>
        <p>Configuraciones iniciales para comparar criterios. El c?lculo con datos estar? disponible en una siguiente etapa.</p>
        {status === 'loading' && <p role="status">Cargando escenarios?</p>}
        {status === 'error' && <p role="alert">{message}</p>}
        {status === 'ready' && scenarios.length === 0 && <p>No hay escenarios configurados.</p>}
        <div className="grid">
          {scenarios.map((scenario) => (
            <article className="card" key={scenario.id}>
              <h3>{scenario.nombre}</h3>
              <p>Prioridad alta desde {scenario.umbrales.alto} puntos.</p>
              <p>{scenario.ventanaSemanas ? `?ltimas ${scenario.ventanaSemanas} semanas` : 'Periodo completo'}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
