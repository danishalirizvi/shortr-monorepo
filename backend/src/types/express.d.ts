// Augment the Express Request type so TypeScript accepts req.correlationId
// without type errors in every middleware and route handler.
declare namespace Express {
  interface Request {
    correlationId: string;
  }
}
