// packages/server/src/routes/chats.ts
import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

router.get('/recent', authenticateToken, async (req: any, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;

    // 1. Logged-in user ki details
    const me = await prisma.user.findUnique({
      where: { id: userId }
    });

    // 2. Baaki sabhi users ko nikal rahe hain
    const users = await prisma.user.findMany({
      where: { id: { not: userId } },
      select: { id: true, username: true, isPro: true }
    });

    // 3. Har user ke liye last message aur unread count nikalna
    const recentChatsData = await Promise.all(
      users.map(async (otherUser) => {
        // A. Aakhri message dhoondo jo delete na hua ho
        const lastMsg = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: otherUser.id, deletedBySender: false },
              { senderId: otherUser.id, receiverId: userId, deletedByReceiver: false }
            ]
          },
          orderBy: { createdAt: 'desc' }
        });

        // B. Unread messages count karo
        const unreadCount = await prisma.message.count({
          where: {
            senderId: otherUser.id,
            receiverId: userId,
            status: { not: 'read' },
            deletedByReceiver: false
          }
        });

        // C. Last message ka text aur time format karo
        let lastMessageText = null;
        let lastMessageTime = null;
        let rawTime = 0; 
        
        let isLastMessageMine = false; 
        let lastMessageStatus = null;  

        if (lastMsg) {
          rawTime = new Date(lastMsg.createdAt).getTime();
          lastMessageTime = new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          isLastMessageMine = lastMsg.senderId === userId; 
          lastMessageStatus = lastMsg.status; 
          
          if (lastMsg.isDeleted) {
            lastMessageText = "This message was deleted";
          } else if (lastMsg.mediaType === 'image') {
            lastMessageText = "📷 Photo";
          } else if (lastMsg.content) {
            lastMessageText = lastMsg.content;
          }
        }

        return {
          ...otherUser,
          lastMessage: lastMessageText,
          lastMessageTime: lastMessageTime,
          unreadCount: unreadCount,
          rawTime: rawTime,
          isLastMessageMine: isLastMessageMine, 
          lastMessageStatus: lastMessageStatus,
          isLastMessageDeleted: lastMsg?.isDeleted || false
        };
      })
    );

    // ✨ FIX 1: Sirf wahi chats Home Screen pe bhejo jinme actually koi message ho (rawTime > 0)
    const activeChats = recentChatsData.filter(chat => chat.rawTime > 0);

    // ✨ FIX 2: Sort ka syntax theek kiya (minus lagaya)
    const sortedChats = activeChats.sort((a, b) => b.rawTime - a.rawTime);

    // ✨ NAYA: Home screen ke liye real-time online status check
    const onlineUsers = req.app.locals.onlineUsers;
    const finalRecentChats = sortedChats.map(chat => ({
      ...chat,
      isOnline: onlineUsers ? onlineUsers.has(String(chat.id)) : false
    }));

    res.json({
      success: true,
      currentUser: me?.username,
      stories: users.slice(0, 6),
      recentChats: finalRecentChats // ✨ Ab online status filter ki hui list jayegi
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch recent chats' });
  }
});
// ==========================================
// 2. ✨ NAYA SEARCH ROUTE (Real Online Status ke sath)
// ==========================================
router.get('/search', authenticateToken, async (req: any, res: Response): Promise<any> => {
  try {
    const { query } = req.query; 
    const myUserId = Number(req.user.id || req.user.userId);

    if (!query || String(query).trim().length < 2) {
      return res.json({ success: true, users: [] });
    }

    const searchText = String(query).trim();

    const matchedUsers = await prisma.user.findMany({
      where: {
        id: { not: myUserId },
        OR: [
          { username: { contains: searchText, mode: 'insensitive' } },
          { phoneNumber: { contains: searchText } }
        ]
      },
      select: { id: true, username: true, isPro: true, phoneNumber: true },
      take: 15 
    });

    // ✨ ASLI JADOO: App ki memory me check karo user online hai ya nahi
    const onlineUsers = req.app.locals.onlineUsers; // Ye Socket file se aayega
    
    const usersWithStatus = matchedUsers.map(user => ({
      ...user,
      isOnline: onlineUsers ? onlineUsers.has(String(user.id)) : false
    }));

    res.json({ success: true, users: usersWithStatus });
  } catch (error) {
    console.error("❌ Search error:", error);
    res.status(500).json({ success: false, error: "Failed to search users" });
  }
});

// ==========================================
// 3. ✨ SUGGESTED CONTACTS ROUTE (Real Online Status ke sath)
// ==========================================
router.get('/suggested', authenticateToken, async (req: any, res: Response): Promise<any> => {
  try {
    const myUserId = Number(req.user.id || req.user.userId);

    const suggestedUsers = await prisma.user.findMany({
      where: { id: { not: myUserId } },
      select: { id: true, username: true, phoneNumber: true },
      take: 6,
      orderBy: { createdAt: 'desc' } 
    });

    // ✨ ASLI JADOO: Har suggested user ka real-time status check karo
    const onlineUsers = req.app.locals.onlineUsers;
    
    const usersWithStatus = suggestedUsers.map(user => ({
      ...user,
      // Agar wo banda onlineUsers map me maujood hai, toh isOnline true ho jayega
      isOnline: onlineUsers ? onlineUsers.has(String(user.id)) : false
    }));

    res.json({ success: true, users: usersWithStatus });
  } catch (error) {
    console.error("❌ Suggested fetch error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch suggested users" });
  }
});

export default router;