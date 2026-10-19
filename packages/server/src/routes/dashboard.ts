// packages/server/src/routes/dashboard.ts
import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import prisma from '../lib/prisma'; // Prisma import karna mat bhoolna

const router = Router();

// authenticateToken lagane se bina login wale yahan nahi aa sakte
router.get('/', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    // Database se logged-in user ka real data nikal rahe hain
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    res.json({
      message: `Welcome to PingUp, ${user?.username}!`,
      stats: {
        profileViews: 120, // Baad me inhe bhi real DB se connect karenge
        activeCrushes: 3,
        unansweredAMAs: 5,
        newMessages: 12,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching dashboard' });
  }
});

export default router;