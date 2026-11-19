export function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'JSON inv?lido' } });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Solicitud demasiado grande' } });
  }
  console.error(error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'No se pudo completar la solicitud' } });
}
