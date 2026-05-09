import { Router } from 'express';
import healthRoutes from './health.routes';
import publicUrlRoutes from './public-url.routes';
import analyticsRoutes from './analytics.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/', publicUrlRoutes);

router.use('/analytics', analyticsRoutes);

export default router;
