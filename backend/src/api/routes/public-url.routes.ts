import { Router } from 'express';
import { publicCreateLimiter } from '../middlewares/rateLimiter';
import { createUrl } from '../controllers/url.controller';

const router = Router();

// POST /api/v1/public-create — unauthenticated, Redis-backed 3 req/hr/IP limit
router.post('/public-create', publicCreateLimiter, createUrl);

export default router;
