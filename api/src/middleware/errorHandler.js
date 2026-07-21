export function notFoundHandler(_req, res) {
  res.status(404).json({
    error: "Not Found",
    message: "La ressource demandée n'existe pas.",
  });
}

export function errorHandler(err, _req, res, _next) {
  console.error(err);

  const status = err.status || err.statusCode || 500;
  const payload = {
    error: err.name || "Error",
    message: err.message || "Erreur interne du serveur",
  };

  if (process.env.NODE_ENV !== "production" && err.stack) {
    payload.stack = err.stack;
  }

  res.status(status).json(payload);
}
