// packages/server/src/routes/profile.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

// 1. Purana route: Profile data fetch karne ke liye
router.get('/me', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { username: true, email: true, phoneNumber: true, isPro: true, streakCount: true } // Password chhodkar sab bhej rahe hain
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, message: 'Profile fetch error' });
  }
});

// 2. ✨ NAYA ROUTE: Profile Update (Naam change) karne ke liye
router.put('/update', authenticateToken, async (req: any, res: any) => {
  try {
    const { username } = req.body;
    
    // Check karo ki naam khali toh nahi bhej diya
    if (!username || username.trim() === '') {
      return res.status(400).json({ success: false, message: 'Username cannot be empty' });
    }

    // Prisma se database me user ka naam update karo
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { username: username.trim() },
      select: { username: true, email: true, phoneNumber: true, isPro: true, streakCount: true } // Same structure wapas bhejo
    });

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Profile update fail ho gaya' });
  }
});

export default router;