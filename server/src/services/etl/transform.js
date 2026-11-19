import { parseCsv } from './csv.js';

export const HEADERS = {
  'estudiantes.csv': ['id_estudiante', 'grupo', 'programa'],
  'asistencia.csv': ['id_estudiante', 'fecha_sesion', 'asistio'],
  'evaluaciones.csv': ['id_estudiante', 'id_evaluacion', 'fecha_evaluacion', 'calificacion'],
  'entregas.csv': ['id_estudiante', 'id_actividad', 'fecha_limite', 'entregada'],
};

export function normalizeDate(value) {
  let iso = value;
  const local = /^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/.exec(value);
  if (local) iso = `${local[3].length === 2 ? '20' : ''}${local[3]}-${local[2]}-${local[1]}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('Formato de fecha inválido');
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso) {
    throw new Error('Fecha inexistente');
  }
  return iso;
}

export function validateSpec(spec) {
  for (const field of ['periodo_inicio', 'periodo_fin', 'fecha_corte']) {
    if (normalizeDate(spec[field] ?? '') !== spec[field]) throw new Error(`Fecha de configuración inválida: ${field}`);
  }
  if (!(spec.periodo_inicio <= spec.fecha_corte && spec.fecha_corte <= spec.periodo_fin)) {
    throw new Error('El corte debe estar dentro del periodo');
  }
  if (!Array.isArray(spec.grupos) || !spec.grupos.length || spec.grupos.some((g) => typeof g !== 'string' || !g.trim() || g.length > 40)) {
    throw new Error('Catálogo de grupos inválido');
  }
}

const issue = (file, record, action, field, original, normalized, reason) => ({
  archivo: file, fila: record.line, accion: action, campo: field,
  original: String(original ?? ''), normalizado: normalized == null ? null : String(normalized), motivo: reason,
});

/** Transformación pura: nunca lee expected-indicators ni las referencias limpias. */
export function transformSources(sources, spec) {
  validateSpec(spec);
  const clean = {}, anomalies = [], rejected = {}, counts = {};
  let studentIds;
  for (const [file, header] of Object.entries(HEADERS)) {
    if (typeof sources[file] !== 'string') throw new Error(`Falta fuente ${file}`);
    const [first, ...records] = parseCsv(sources[file]);
    if (!first || JSON.stringify(first.values) !== JSON.stringify(header)) {
      throw new Error(`Encabezado inválido en ${file}: se esperaba ${header.join(',')}`);
    }
    const valid = [], output = [], rejects = [];
    const stats = { leidos: records.length, aceptados: 0, corregidos: 0, rechazados: 0, duplicados: 0, conflictos: 0 };
    for (const record of records) {
      const original = record.values;
      const values = original.map((value) => value.trim());
      const corrections = [], errors = [];
      const fail = (field, reason) => errors.push(issue(file, record, 'rejected', field, original[header.indexOf(field)], null, reason));
      const set = (field, value, reason) => {
        const index = header.indexOf(field);
        values[index] = value;
        if (original[index] !== value) corrections.push(issue(file, record, 'corrected', field, original[index], value, reason));
      };
      if (values.length !== header.length) {
        errors.push(issue(file, record, 'rejected', '*', JSON.stringify(original), null, 'Número de columnas inválido'));
      } else {
        // Normalizar espacios en todos los campos, sin perder el valor original.
        for (let i = 0; i < header.length; i++) set(header[i], values[i], 'Eliminar espacios exteriores');
        const id = /^e-?(\d{1,4})$/i.exec(values[0]);
        if (!id) fail('id_estudiante', 'Identificador faltante o inválido');
        else {
          set('id_estudiante', `E-${id[1].padStart(4, '0')}`, 'Normalizar código de estudiante');
          if (file !== 'estudiantes.csv' && !studentIds.has(values[0])) fail('id_estudiante', 'Estudiante fuera del catálogo válido');
        }
        if (file === 'estudiantes.csv') {
          if (!spec.grupos.includes(values[1])) fail('grupo', 'Grupo fuera del catálogo');
          if (!values[2] || values[2].length > 120) fail('programa', 'Programa requerido, máximo 120 caracteres');
        } else {
          const dateField = file === 'asistencia.csv' ? 'fecha_sesion' : file === 'evaluaciones.csv' ? 'fecha_evaluacion' : 'fecha_limite';
          const dateIndex = header.indexOf(dateField);
          try {
            const date = normalizeDate(values[dateIndex]);
            set(dateField, date, 'Normalizar fecha DD/MM/AA a AAAA-MM-DD');
            if (date < spec.periodo_inicio || date > spec.periodo_fin) fail(dateField, 'Fecha fuera del periodo académico');
            else if (file !== 'entregas.csv' && date > spec.fecha_corte) fail(dateField, 'Fecha posterior al corte');
          } catch (error) { fail(dateField, error.message); }
          if (file !== 'asistencia.csv' && (!values[1] || values[1].length > 80)) {
            fail(header[1], 'Identificador requerido, máximo 80 caracteres');
          }
          if (file === 'evaluaciones.csv') {
            const grade = values[3];
            if (!/^[-+]?\d+(?:\.\d{1,2})?$/.test(grade)) fail('calificacion', 'Calificación requerida, numérica y con máximo dos decimales');
            else if (Number(grade) < 0 || Number(grade) > 10) fail('calificacion', 'Calificación fuera del rango 0 a 10');
            else set('calificacion', Number(grade).toFixed(2), 'Normalizar decimal a dos posiciones');
          } else {
            const field = file === 'asistencia.csv' ? 'asistio' : 'entregada';
            const index = header.indexOf(field);
            const token = values[index].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            const truth = ['1', 'si', 'presente'];
            const falsity = ['0', 'no', 'ausente'];
            if (![...truth, ...falsity].includes(token)) fail(field, 'Booleano faltante o ambiguo');
            else set(field, truth.includes(token) ? '1' : '0', 'Normalizar booleano');
          }
        }
      }
      if (errors.length) {
        stats.rechazados++;
        anomalies.push(...errors);
        rejects.push({ fila: record.line, original, motivos: errors.map((error) => error.motivo) });
      } else {
        // Registrar una única corrección por campo, del original al valor definitivo.
        const finalCorrections = [...new Map(corrections.map((c) => [c.campo, c])).values()];
        valid.push({ values, line: record.line, original, corrections: finalCorrections });
      }
    }
    const groups = new Map();
    for (const row of valid) {
      const key = file === 'estudiantes.csv' ? row.values[0] : JSON.stringify(row.values.slice(0, 2));
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    for (const group of groups.values()) {
      const distinct = new Set(group.map((row) => JSON.stringify(row.values)));
      if (distinct.size > 1) {
        // Poner en cuarentena todas las versiones; no depende del orden del archivo.
        for (const row of group) {
          stats.conflictos++;
          anomalies.push(issue(file, row, 'conflict', '*', JSON.stringify(row.original), null, 'Clave duplicada con valores contradictorios; revisión requerida'));
          rejects.push({ fila: row.line, original: row.original, motivos: ['Conflicto de clave duplicada'] });
        }
        continue;
      }
      const [kept, ...duplicates] = group;
      stats.aceptados++;
      if (kept.corrections.length) stats.corregidos++;
      anomalies.push(...kept.corrections);
      output.push({ values: kept.values, fila: kept.line });
      for (const row of duplicates) {
        stats.duplicados++;
        anomalies.push(issue(file, row, 'duplicate', '*', JSON.stringify(row.original), null, `Duplicado de línea ${kept.line}; descartado`));
      }
    }
    output.sort((a, b) => a.fila - b.fila);
    clean[file] = output;
    rejected[file] = rejects.sort((a, b) => a.fila - b.fila);
    counts[file] = stats;
    if (file === 'estudiantes.csv') studentIds = new Set(output.map((row) => row.values[0]));
  }
  const totals = Object.values(counts).reduce((acc, item) => {
    for (const key of Object.keys(item)) acc[key] = (acc[key] ?? 0) + item[key];
    return acc;
  }, {});
  return { clean, rejected, anomalies, report: { archivos: counts, totales: totals } };
}
