import { RequestHandler } from 'express';

const HEADER = 'x-correlation-id';

const correlationId: RequestHandler = (req, _res, next) => {
  req.correlationId = (req.headers[HEADER] as string | undefined) ?? crypto.randomUUID();
  _res.setHeader(HEADER, req.correlationId);
  next();
};

export default correlationId;
