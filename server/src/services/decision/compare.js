/** Une dictámenes sin interpretar la ausencia de índice como cero. */
export function compareResults(left, right) {
  const rightById = new Map(right.map((student) => [student.id, student]));
  if (left.length !== right.length || rightById.size !== right.length || new Set(left.map((s) => s.id)).size !== left.length) throw new Error('Los catálogos de comparación no coinciden');
  const rows = left.map((a) => {
    const b = rightById.get(a.id);
    if (!b) throw new Error('Los catálogos de comparación no coinciden');
    const comparable = a.index != null && b.index != null;
    const delta = comparable ? b.index - a.index : null;
    const positionChange = comparable ? a.position - b.position : null;
    return {
      id: a.id, group: a.group,
      left: { index: a.index, level: a.level, position: a.position, action: a.action },
      right: { index: b.index, level: b.level, position: b.position, action: b.action },
      delta, positionChange, levelChanged: a.level !== b.level,
      changed: a.level !== b.level || (comparable && (Math.abs(delta) > 1e-9 || positionChange !== 0)),
    };
  });
  return rows.sort((a, b) => a.id.localeCompare(b.id));
}
