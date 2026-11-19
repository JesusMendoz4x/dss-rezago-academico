const paths = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  quality: 'M9 3h6l1 3h4v15H4V6h4z M9 12l2 2 4-4 M9 18h6',
  students: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  scenarios: 'M4 21V14 M4 10V3 M12 21v-7 M12 10V3 M20 21v-3 M20 14V3 M1 10h6 M9 14h6 M17 18h6',
  book: 'M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1z M12 5v15',
  data: 'M20 6c0 2-4 3-8 3S4 8 4 6s4-3 8-3 8 1 8 3z M4 6v12c0 2 4 3 8 3s8-1 8-3V6 M4 12c0 2 4 3 8 3s8-1 8-3',
};

export default function Icon({ name, className = '' }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={paths[name] || paths.overview} />
    </svg>
  );
}
