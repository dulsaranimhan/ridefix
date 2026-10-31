import { Router } from 'express';
import { submitBid } from '../controllers/bidController';

const router = Router();

router.post('/', submitBid);

export default router;