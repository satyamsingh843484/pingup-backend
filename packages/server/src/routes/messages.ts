// packages/server/src/routes/messages.ts
import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

// 1. Message Send Karne Ka Route
router.post('/send', authenticateToken, async (req: any, res: Response): Promise<any> => {
  try {
    const senderId = req.user.id;
    // ✨ NAYA: req.body se mediaUrl aur mediaType bhi lo
    const { receiverId, content, mediaUrl, mediaType } = req.body;

    if (!receiverId) {
      return res.status(400).json({ error: 'Receiver ID zaroori hai' });
    }

    const message = await prisma.message.create({
      data: {
        content: content || "", // Agar content nahi hai toh khali string
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        senderId,
        receiverId: parseInt(receiverId),
        status: 'sent'
      }
    });
    req.io.to(`user_${receiverId}`).emit('receiveMessage', message);

    res.json({ success: true, message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Message send karne me error aayi' });
  }
});

// 2. Chat History Fetch Karne Ka Route
router.get('/chat/:receiverId', authenticateToken, async (req: any, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const otherUserId = parseInt(req.params.receiverId);

    // ✨ NAYA LOGIC: Jab bhi chat khule, samne wale ke bheje gaye saare unread messages ko 'read' mark kar do
    await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        status: {
          not: 'read'
        }
      },
      data: {
        status: 'read'
      }
    });

    // Ab messages fetch karo (taki tumhe ekdum updated 'read' status wale messages milein)
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'asc' } // Purane messages upar, naye sabse niche
    });

    // Frontend (ChatDetailScreen) ko yahan myId chahiye taaki bubbles sahi align hon
    res.json({ 
      success: true, 
      messages,
      myId: userId 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Messages fetch error.' });
  }
});
// Backend: routes/messages.ts me add karo (sabse neeche)
router.get('/unread', authenticateToken, async (req: any, res: any) => {
  try {
    const unreadMessages = await prisma.message.findMany({
      where: {
        receiverId: req.user.id,
        status: { not: 'read' } // Sirf wo message jo abhi tak padhe nahi gaye
      },
      include: {
        sender: {
          select: { id: true, username: true } // Jisne bheja uska naam
        }
      },
      orderBy: { createdAt: 'desc' } // Sabse naya sabse upar
    });

    res.json({ success: true, notifications: unreadMessages });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ error: 'Notifications fetch fail ho gaye' });
  }
});

export default router;