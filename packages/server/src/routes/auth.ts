// packages/server/src/routes/auth.ts
import { Router, Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

// ✨ NAYA IMPORT: Modern Firebase Admin (v11+)
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const router = Router();
const JWT_SECRET = 'super-secret-key-change-later'; // Ye wahi secret hai jo middleware me use hua tha

// ✨ NAYA SETUP: Firebase Admin Initialize (Bina 'admin.' prefix ke)
// Dhyan rahe: 'firebaseServiceAccount.json' file server ke root folder me honi chahiye
const serviceAccount = require('../../firebaseServiceAccount.json'); 

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

// 1. SIGNUP ROUTE
router.post('/signup', async (req: any, res: any) => {
  try {
    const { username, email, phoneNumber, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        phoneNumber,
        password: hashedPassword,
      },
    });

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
      return res.status(404).json({ success: false, message: 'User not found. Sign Up First.' });
    }

    // ✨ NAYA FIX: Pehle check karo ki password exist karta bhi hai ya nahi
    if (!user.password) {
      return res.status(401).json({ 
        success: false, 
        message: 'Password not set. Please use Google or Phone login.' 
      });
    }

    // Ab TypeScript khush ho jayega kyunki usko pata hai password null nahi hai
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Galat Password' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.json({ success: true, token, user });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: 'Server me kuch gadbad hai' });
  }
});

// ✨ 3. Puraana ROUTE: Firebase OTP Token Verify (Untouched)
router.post('/verify-firebase-token', async (req: any, res: any) => {
  const { idToken, phoneNumber } = req.body;

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;

    let user = await prisma.user.findFirst({
      where: { phoneNumber: phoneNumber }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phoneNumber: phoneNumber,
          username: `user_${Math.floor(1000 + Math.random() * 9000)}`, 
          password: await bcrypt.hash(firebaseUid, 10), 
        }
      });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);

    res.json({ success: true, token, user });
  } catch (error) {
    console.error('Firebase Auth Error:', error);
    res.status(401).json({ success: false, message: 'Invalid OTP or Token' });
  }
});

// ✨ 4. NAYA ROUTE: UNIFIED LOGIN (For Google, Phone, & Email all in one)
router.post('/unified-login', async (req: any, res: any) => {
  try {
    const { email, phoneNumber, authProvider, firebaseUid } = req.body;

    // Ek unique pehchaan (Identifier) dhundho
    const identifier = email || phoneNumber;
    if (!identifier) {
      return res.status(400).json({ success: false, message: "Email ya Phone number hona zaroori hai!" });
    }

    // Database me check karo user pehle se hai ya nahi
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email || undefined },
          { phoneNumber: phoneNumber || undefined }
        ]
      }
    });

    // Agar user nahi mila, toh naya banao (New Sign Up)
    if (!user) {
      const baseName = email ? email.split('@')[0] : `user_${phoneNumber.slice(-4)}`;
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const newUsername = `${baseName}${randomNum}`;

      user = await prisma.user.create({
        data: {
          username: newUsername,
          email: email || null,
          phoneNumber: phoneNumber || null,
          authProvider: authProvider || 'local', 
          // Password optional hai schema me, isliye nahi daala
        }
      });
      console.log("✨ Naya User Ban Gaya:", user.username);
    } else {
      console.log("♻️ Purana User Login Hua:", user.username);
    }

    // Apna Node.js JWT Token banao session ke liye
    const token = jwt.sign(
      { id: user.id, username: user.username }, 
      JWT_SECRET, 
      { expiresIn: '30d' } 
    );

    res.json({ success: true, token, user });

  } catch (error) {
    console.error("Unified Login Error:", error);
    res.status(500).json({ success: false, message: "Server me kuch gadbad ho gayi." });
  }
});

// 5. GET USERS ROUTE
router.get('/users', authenticateToken, async (req: any, res: Response) => {
  try {
    const currentUserId = req.user.id;
    
    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId }
      },
      select: {
        id: true,
        username: true,
        email: true,
        phoneNumber: true, 
      }
    });
    res.json({ success: true, users });
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Users fetch failed' });
  }
});

export default router;