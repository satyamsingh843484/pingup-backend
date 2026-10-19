// packages/server/src/routes/calls.ts
import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

router.get('/history', authenticateToken, async (req: any, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;

    // Database se call history nikal rahe hain jisme user ya toh caller tha ya receiver
    const calls = await prisma.callHistory.findMany({
      where: {
        OR: [
          { callerId: userId },
          { receiverId: userId }
        ]
      },
      include: {
        caller: { select: { username: true } },
        receiver: { select: { username: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, calls });
  } catch (error) {
    console.error('Fetch calls error:', error);
    res.status(500).json({ error: 'Failed to fetch call history' });
  }
});

// Naya call record create karne ka route (Jab actually call lagayenge tab use hoga)
router.post('/log', authenticateToken, async (req: any, res: Response): Promise<any> => {
  try {
    const callerId = req.user.id;
    const { receiverId, type, status, duration } = req.body;

    const callLog = await prisma.callHistory.create({
      data: {
        callerId,
        receiverId: parseInt(receiverId),
        type, // 'audio' or 'video'
        status, // 'completed', 'missed', 'declined'
        duration
      }
    });

    res.json({ success: true, callLog });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log call' });
  }
});

export default router;