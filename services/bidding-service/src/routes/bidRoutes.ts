import { Router } from 'express';
import { submitBid, getBidsForRequest, getBidsForProvider, updateBidStatus } from '../controllers/bidController';
const router = Router();
router.post('/', submitBid);
router.get('/request/:requestId', getBidsForRequest);
router.get('/provider/:providerId', getBidsForProvider);
router.patch('/:bidId/status', updateBidStatus);
export default router;
