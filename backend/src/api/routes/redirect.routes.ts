import { Router } from 'express';
import analyticsLogger from '../middlewares/analyticsLogger';
import { redirectToOriginal } from '../controllers/redirect.controller';

const router = Router();

// The regex constrains the param to exactly 7 Base62 characters.
// This prevents the route from matching /api, /create, or any other path prefix.
router.get('/:shortCode([a-zA-Z0-9]{7})', analyticsLogger, redirectToOriginal);

export default router;
