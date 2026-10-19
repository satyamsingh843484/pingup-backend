// packages/server/src/routes/chats.ts
import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

router.get('/recent', authenticateToken, async (req: any, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;

    // 1. Database se tumhara (Logged-in user ka) 100% real data nikal rahe hain
    const me = await prisma.user.findUnique({
      where: { id: userId }
    });

    // 2. Baaki sabhi users ko nikal rahe hain
    const users = await prisma.user.findMany({
      where: { id: { not: userId } },
      select: { id: true, username: true, isPro: true }
    });

    res.json({
      success: true,
      currentUser: me?.username, // ✨ Yahan se 100% sahi naam jayega
      stories: users.slice(0, 6),
      recentChats: users
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch recent chats' });
  }
});

export default router;