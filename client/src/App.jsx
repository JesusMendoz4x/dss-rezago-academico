import { useEffect, useState } from 'react';
import AppLayout from './components/AppLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import QualityPage from './pages/QualityPage.jsx';
import StudentsPage from './pages/StudentsPage.jsx';
import ComparisonPage from './pages/ComparisonPage.jsx';

function currentPage() {
  return ({ '#/calidad': 'quality', '#/estudiantes': 'students', '#/comparar': 'comparison' })[window.location.hash] || 'overview';
}

export default function App() {
  const [page, setPage] = useState(currentPage);
  useEffect(() => {
    const onHashChange = () => setPage(currentPage());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  useEffect(() => {
    document.title = `${page === 'quality' ? 'Calidad de datos' : page === 'students' ? 'Estudiantes' : page === 'comparison' ? 'Comparar escenarios' : 'Resumen académico'} | Aula`;
    document.getElementById('main-content')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [page]);

  return (
    <AppLayout page={page}>
      {page === 'quality' ? <QualityPage /> : page === 'students' ? <StudentsPage /> : page === 'comparison' ? <ComparisonPage /> : <DashboardPage />}
    </AppLayout>
  );
}
