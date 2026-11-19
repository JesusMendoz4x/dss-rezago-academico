/** Plan semanal en memoria: no cambia el índice ni la recomendación del modelo. */
export function buildAttentionPlan(students, capacity) {
  if (!Number.isSafeInteger(capacity) || capacity < 0) throw new Error('La capacidad debe ser un entero no negativo.');
  const eligible = students.filter((student) => ['alto', 'medio'].includes(student.level) && Number.isFinite(student.index))
    .sort((a, b) => b.index - a.index || a.id.localeCompare(b.id));
  const selected = new Set(eligible.slice(0, capacity).map((student) => student.id));
  const eligibleIds = new Set(eligible.map((student) => student.id));
  const statuses = new Map(students.map((student) => [student.id,
    student.level === 'sin_dictamen' ? 'complete_data' : selected.has(student.id) ? 'scheduled' : eligibleIds.has(student.id) ? 'pending' : 'monitoring',
  ]));
  return {
    statuses, selectedIds: [...selected], scheduled: selected.size,
    pending: eligible.length - selected.size, eligible: eligible.length,
    available: Math.max(0, capacity - selected.size), capacity,
  };
}

export function parseCapacity(input) {
  if (typeof input !== 'string' || !/^\d+$/.test(input.trim())) throw new Error('Escribe un número entero igual o mayor que cero.');
  const value = Number(input.trim());
  if (!Number.isSafeInteger(value)) throw new Error('La capacidad es demasiado grande.');
  return value;
}
