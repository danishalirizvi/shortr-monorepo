import { Router } from 'express';
import { getAnalytics } from '../controllers/analytics.controller';

const router = Router();

router.get('/:shortCode([a-zA-Z0-9]{7})', getAnalytics);

export default router;
