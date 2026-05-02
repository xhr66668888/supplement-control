function errorHandler(err, req, res, _next) {
  console.error('[error]', err.stack || err.message);

  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: `Route ${req.method} ${req.path} not found` } });
}

module.exports = { errorHandler, notFoundHandler };
