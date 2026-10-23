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
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { 
            senderId: userId, 
            receiverId: otherUserId, 
            deletedBySender: false 
          },
          { 
            senderId: otherUserId, 
            receiverId: userId, 
            deletedByReceiver: false 
          }
        ]
      },
      orderBy: { createdAt: 'asc' }
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
// ✨ NAYA ROUTE: Multi-Select Bulk Delete Karne Ke Liye
router.post('/delete-bulk', authenticateToken, async (req: any, res: Response): Promise<any> => {
  try {
    const { messageIds, type } = req.body;
    const userId = req.user.id; // Jis user ne delete dabaya hai

    if (!messageIds || messageIds.length === 0) {
      return res.status(400).json({ error: 'No messages provided' });
    }

    if (type === 'for_everyone') {
      // Sirf wahi delete karo jo is user ne bheje hain (Safety check)
      await prisma.message.updateMany({
        where: { 
          id: { in: messageIds }, 
          senderId: userId 
        },
        data: { 
          isDeleted: true, 
          content: null, 
          mediaUrl: null 
        }
      });
    } else if (type === 'for_me') {
      // 1. Jo messages MAINE bheje the, unhe sender-side se hide karo
      await prisma.message.updateMany({
        where: { 
          id: { in: messageIds }, 
          senderId: userId 
        },
        data: { deletedBySender: true }
      });
      
      // 2. Jo messages MUJHE aaye the, unhe receiver-side se hide karo
      await prisma.message.updateMany({
        where: { 
          id: { in: messageIds }, 
          receiverId: userId 
        },
        data: { deletedByReceiver: true }
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Failed to delete messages' });
  }
});
// ✨ NAYA ROUTE: Mark chat as read
router.post('/mark-read', authenticateToken, async (req: any, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const { senderId } = req.body; // Jiski chat tumne open ki hai

    await prisma.message.updateMany({
      where: { 
        senderId: senderId, 
        receiverId: userId, 
        status: { not: 'read' } 
      },
      data: { status: 'read' }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// ✨ NAYA ROUTE (SOFT DELETE): Asli problem solve karne ke liye!
router.delete('/chat/:otherUserId', authenticateToken, async (req: any, res: Response): Promise<any> => {
  try {
    console.log("-----------------------------------------");
    console.log("🚨 DELETE API HIT HUI (SOFT DELETE)!");
    
    // 1. Check karo Token me user ka data kya hai
    console.log("👤 Token ka User Data:", req.user);
    
    // Token se id nikalne ka safe tareeka
    const myUserId = Number(req.user.id || req.user.userId); 
    const otherUserId = Number(req.params.otherUserId); 

    console.log("👉 My ID (Jo delete kar raha hai):", myUserId);
    console.log("👉 Other User ID (Jiski chat delete karni hai):", otherUserId);

    // Agar ID invalid hai toh yahi rok do
    if (!myUserId || isNaN(myUserId) || !otherUserId || isNaN(otherUserId)) {
      console.log("❌ ERROR: IDs invalid hain!");
      return res.status(400).json({ error: "Invalid User IDs" });
    }

    // ✨ YAHAN SE CHANGE HUA HAI ✨
    // Hard delete (deleteMany) hata diya, ab soft delete (updateMany) kar rahe hain

    // 1. Jo messages MAINE usko bheje the, unhe mere liye hide karo (deletedBySender = true)
    const hiddenSent = await prisma.message.updateMany({
      where: { senderId: myUserId, receiverId: otherUserId },
      data: { deletedBySender: true }
    });

    // 2. Jo messages USNE mujhe bheje the, unhe mere liye hide karo (deletedByReceiver = true)
    const hiddenReceived = await prisma.message.updateMany({
      where: { senderId: otherUserId, receiverId: myUserId },
      data: { deletedByReceiver: true }
    });

    console.log(`✅ Mere liye hide hue messages -> Bheje the: ${hiddenSent.count}, Aaye the: ${hiddenReceived.count}`);
    console.log("-----------------------------------------");

    res.json({ 
      success: true, 
      message: "Chat deleted for you!", 
      hiddenCount: hiddenSent.count + hiddenReceived.count 
    });
  } catch (error) {
    console.error("❌ Delete chat error:", error);
    res.status(500).json({ success: false, error: "Failed to delete chat history" });
  }
});

export default router;