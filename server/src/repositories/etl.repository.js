/** Una importación completa se confirma o revierte en una sola transacción. */
export async function loadMysql(pool, result, manifest) {
  const connection = await pool.getConnection();
  const lock = `dss-etl-${manifest.fingerprint.slice(0, 48)}`;
  let locked = false, transaction = false;
  try {
    const [[lease]] = await connection.query('SELECT GET_LOCK(?, 10) AS acquired', [lock]);
    if (Number(lease.acquired) !== 1) throw new Error('Otra carga del mismo conjunto sigue en curso');
    locked = true;
    await connection.beginTransaction();
    transaction = true;
    const [existing] = await connection.execute(
      "SELECT id FROM import_batches WHERE status = 'completed' AND JSON_UNQUOTE(JSON_EXTRACT(source_manifest, '$.fingerprint')) = ? LIMIT 1",
      [manifest.fingerprint],
    );
    if (existing.length) {
      await connection.commit(); transaction = false;
      return { batchId: existing[0].id, reused: true };
    }
    const c = manifest.configuration;
    const snapshot = { ...manifest, catalogo: result.clean['estudiantes.csv'] };
    const [batch] = await connection.execute(
      'INSERT INTO import_batches (cutoff_date, period_start, period_end, status, source_manifest, quality_report) VALUES (?, ?, ?, ?, ?, ?)',
      [c.fecha_corte, c.periodo_inicio, c.periodo_fin, 'pending', JSON.stringify(snapshot), JSON.stringify(result.report)],
    );
    const batchId = batch.insertId;
    for (const row of result.clean['estudiantes.csv']) {
      const [id, group, program] = row.values;
      const [found] = await connection.execute('SELECT group_code, program FROM students WHERE id = ? FOR UPDATE', [id]);
      if (found.length) {
        if (found[0].group_code !== group || found[0].program !== program) {
          throw new Error(`Catálogo existente incompatible para ${id}; no se sobrescribió el historial`);
        }
      } else {
        await connection.execute('INSERT INTO students (id, group_code, program) VALUES (?, ?, ?)', [id, group, program]);
      }
    }
    const statements = {
      'asistencia.csv': 'INSERT INTO attendance (batch_id, student_id, session_date, attended, source_file, source_row) VALUES (?, ?, ?, ?, ?, ?)',
      'evaluaciones.csv': 'INSERT INTO evaluations (batch_id, student_id, evaluation_code, evaluation_date, grade, source_file, source_row) VALUES (?, ?, ?, ?, ?, ?, ?)',
      'entregas.csv': 'INSERT INTO submissions (batch_id, student_id, activity_code, due_date, submitted, source_file, source_row) VALUES (?, ?, ?, ?, ?, ?, ?)',
    };
    for (const [file, sql] of Object.entries(statements)) {
      for (const row of result.clean[file]) {
        await connection.execute(sql, [batchId, ...row.values, file, row.fila]);
      }
    }
    for (const a of result.anomalies) {
      await connection.execute(
        'INSERT INTO data_anomalies (batch_id, source_file, source_row, field_name, original_value, normalized_value, action, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [batchId, a.archivo, a.fila, a.campo, a.original, a.normalizado, a.accion, a.motivo],
      );
    }
    await connection.execute('UPDATE import_batches SET status = ? WHERE id = ?', ['completed', batchId]);
    await connection.commit(); transaction = false;
    return { batchId, reused: false };
  } catch (error) {
    if (transaction) await connection.rollback();
    throw error;
  } finally {
    try {
      if (locked) await connection.query('SELECT RELEASE_LOCK(?)', [lock]);
    } finally { connection.release(); }
  }
}
