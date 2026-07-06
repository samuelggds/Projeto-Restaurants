export function notFoundMiddleware(req, res) {
  return res.status(404).json({
    error: "Rota nao encontrada",
    requestId: req.requestId,
  });
}
