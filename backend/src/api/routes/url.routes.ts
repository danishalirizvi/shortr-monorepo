import { Router } from 'express';
import { createLimiter } from '../middlewares/rateLimiter';
import { apiKeyAuth } from '../middlewares/apiKeyAuth';
import { createUrl } from '../controllers/url.controller';

const router = Router();

// POST /create — requires Authorization: Bearer <API_KEY>
router.post('/create', createLimiter, apiKeyAuth, createUrl);

export default router;
