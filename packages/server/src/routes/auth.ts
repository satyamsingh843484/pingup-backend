// packages/server/src/routes/auth.ts
import { Router, Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const JWT_SECRET = 'super-secret-key-change-later'; // Ye wahi secret hai jo middleware me use hua tha

// 1. SIGNUP ROUTE
router.post('/signup', async (req: any, res: any) => {
  try {
    const { username, email, phoneNumber, password } = req.body;

    // Password ko secure (hash) kar rahe hain
    const hashedPassword = await bcrypt.hash(password, 10);

    // Database me naya user banao
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        phoneNumber,
        password: hashedPassword,
      },
    });

    // ✨ YAHI MAIN FIX HAI: Naye bane user ki ID se naya token banao
    const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET);

    res.json({ success: true, token, user: newUser });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(400).json({ success: false, message: 'Ye email/username pehle se use ho chuka hai' });
  }
});

// 2. LOGIN ROUTE
router.post('/login', async (req: any, res: any) => {
  try {
    const { identifier, password } = req.body;

    // Database me user dhundo (Username, Email ya Phone kisi se bhi)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phoneNumber: identifier },
          { username: identifier },
        ],
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User nahi mila. Pehle Sign Up karo.' });
    }

    // Password check karo
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Galat Password' });
    }

    // ✨ YAHI MAIN FIX HAI: Jo user login hua hai, usi ki ID ka token banao
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);

    res.json({ success: true, token, user });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: 'Server me kuch gadbad hai' });
  }
});
// Backend: routes/auth.ts me add karo (sabse neeche)
router.get('/users', authenticateToken, async (req: any, res: Response) => {
  try {
    const currentUserId = req.user.id;
    // Khud ko chhod kar baaki saare users fetch karo
    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId }
      },
      select: {
        id: true,
        username: true,
        email: true,
        // Yahan profile picture add kar sakte ho agar DB me hai
      }
    });
    res.json({ success: true, users });
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Users fetch nahi ho paye' });
  }
});

export default router;