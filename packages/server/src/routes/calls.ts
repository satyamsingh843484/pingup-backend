// packages/server/src/routes/calls.ts
import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

router.get('/history', authenticateToken, async (req: any, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;

    const calls = await prisma.callHistory.findMany({
      where: {
        OR: [
          { callerId: userId, deletedByCaller: false },
          { receiverId: userId, deletedByReceiver: false }
        ]
      },
      include: {
        caller: { select: { username: true } },
        receiver: { select: { username: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, calls, myUserId: userId });
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

// POST /api/calls/delete-bulk
router.post('/delete-bulk', authenticateToken, async (req: any, res: Response): Promise<any> => {
  try {
    const { callIds } = req.body;
    const myUserId = req.user.id;

    if (!callIds || !Array.isArray(callIds) || callIds.length === 0) {
      return res.status(400).json({ error: 'No call IDs provided' });
    }

    // 1. Security Check: Sirf wahi calls fetch karo jisme current user shamil hai
    const calls = await prisma.callHistory.findMany({
      where: {
        id: { in: callIds },
        OR: [{ callerId: myUserId }, { receiverId: myUserId }]
      }
    });

    const callsToHardDelete: number[] = [];
    const callsToSoftDeleteAsCaller: number[] = [];
    const callsToSoftDeleteAsReceiver: number[] = [];

    // 2. Logic: Agar samne wale ne bhi pehle delete kar diya hai, toh DB se permanently uda do
    for (const call of calls) {
      if (call.callerId === call.receiverId) {
        callsToHardDelete.push(call.id);
        continue;
      }
      const isMeCaller = call.callerId === myUserId;
      const otherUserAlreadyDeleted = isMeCaller ? call.deletedByReceiver : call.deletedByCaller;

      if (otherUserAlreadyDeleted) {
        callsToHardDelete.push(call.id); // Dono ne delete kar diya, storage free karo
      } else {
        // Sirf maine delete kiya hai, flag true karo
        if (isMeCaller) callsToSoftDeleteAsCaller.push(call.id);
        else callsToSoftDeleteAsReceiver.push(call.id);
      }
    }

    // 3. Ek sath saari queries run karo (Transactions)
    const transactions = [];
    if (callsToHardDelete.length > 0) {
      transactions.push(prisma.callHistory.deleteMany({ where: { id: { in: callsToHardDelete } } }));
    }
    if (callsToSoftDeleteAsCaller.length > 0) {
      transactions.push(prisma.callHistory.updateMany({ where: { id: { in: callsToSoftDeleteAsCaller } }, data: { deletedByCaller: true } }));
    }
    if (callsToSoftDeleteAsReceiver.length > 0) {
      transactions.push(prisma.callHistory.updateMany({ where: { id: { in: callsToSoftDeleteAsReceiver } }, data: { deletedByReceiver: true } }));
    }

    await prisma.$transaction(transactions);

    res.json({ success: true, message: 'Calls deleted successfully' });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Failed to delete calls' });
  }
});

export default router;