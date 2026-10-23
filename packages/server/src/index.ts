import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import prisma from './lib/prisma';

// Saare Routers import kar liye
import dashboardRouter from './routes/dashboard';
import authRouter from './routes/auth';
import messagesRouter from './routes/messages';
import chatsRouter from './routes/chats';
import profileRouter from './routes/profile';
import callsRouter from './routes/calls';
import storyRoutes from './routes/stories';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// HTTP server create kiya jisme Express app wrapped hai
const server = http.createServer(app);

// Socket.IO setup server ke upar
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
app.set('io', io);

// Middlewares
app.use(cors());
app.use(express.json());

// ✨ NAYA MASTER FIX: 'io' ko req object me daal diya taaki kisi bhi API route me socket emit kar sakein
app.use((req: any, res: any, next: any) => {
  req.io = io;
  next();
});

// API Routes Register kiye
app.use('/api/dashboard', dashboardRouter);
app.use('/api/auth', authRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/chats', chatsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/calls', callsRouter);
app.use('/api/stories', storyRoutes);

// ✨ FIX: Map me ab safely String keys use hongi
const onlineUsers = new Map();

app.locals.onlineUsers = onlineUsers;
// 📞 Real-Time Socket.IO Logic
io.on('connection', (socket) => {
  console.log('✅ A user connected:', socket.id);

  // 1. User app kholte hi apna private room join karega
  socket.on('register', (userId) => {
    // ✨ FIX: Map ke liye String, Emit ke liye Number
    const strUserId = String(userId);
    const numUserId = Number(userId);

    socket.join(`user_${numUserId}`);
    
    // ✨ NAYA: User ko map me daalo aur sabko batao ki wo Online aa gaya hai
    onlineUsers.set(strUserId, socket.id);
    console.log(`📱 User ${numUserId} registered for calls & is now ONLINE`);
    io.emit('userStatus', { userId: numUserId, status: 'online' });
  });

  // 2. Koi call lagayega toh ye fire hoga
  socket.on('startCall', (data) => {
    const { callerId, callerName, receiverId, type } = data;
    console.log(`📞 ${callerName} (ID: ${callerId}) is calling User ${receiverId} (${type} call)`);
    
    // Receiver ke room me "incomingCall" ka alert bhej do
    io.to(`user_${receiverId}`).emit('incomingCall', {
      callerId,
      callerName,
      type
    });
  });

  // 3. Jab receiver call uthata hai (Accept karda hai)
  socket.on('answerCall', (data) => {
    const { to } = data;
    console.log(`✅ Call answered! Notifying caller (User ${to}) to start timer.`);
    // Caller ko wapas batao ki call uth gayi hai taaki 00:00 timer chalu ho
    io.to(`user_${to}`).emit('callAnswered');
  });

  // 4. Jab receiver call kaat deta hai (Reject)
  socket.on('rejectCall', (data) => {
    const { to } = data;
    console.log(`❌ Call declined! Notifying caller (User ${to}).`);
    io.to(`user_${to}`).emit('callRejected');
  });

  // ✨ NAYA: Typing Indicator Events ✨
  socket.on('typing', (data) => {
    const { senderId, receiverId } = data;
    socket.to(`user_${receiverId}`).emit('typing', { senderId: Number(senderId) });
  });

  socket.on('stopTyping', (data) => {
    const { senderId, receiverId } = data;
    socket.to(`user_${receiverId}`).emit('stopTyping', { senderId: Number(senderId) });
  });

  // ✨ UPDATED: Online Status Check (with Last Seen from DB) ✨
  socket.on('checkStatus', async (userId) => {
    // ✨ FIX: String checking ke sath Number response
    const strUserId = String(userId);
    const numUserId = Number(userId);
    
    const isOnline = onlineUsers.has(strUserId);
    if (isOnline) {
      socket.emit('userStatus', { userId: numUserId, status: 'online' });
    } else {
      try {
        const user = await prisma.user.findUnique({ 
          where: { id: numUserId }, 
          select: { lastSeen: true } 
        });
        socket.emit('userStatus', { userId: numUserId, status: 'offline', lastSeen: user?.lastSeen });
      } catch (error) {
        console.error('Error fetching lastSeen:', error);
      }
    }
  });

  // ✨ UPDATED: Read Receipts (Blue Ticks) Events with DB Update ✨
  
  // A. Jab message samne wale ke phone me pahunch jaye (Double Gray Tick)
  socket.on('messageDelivered', async (data) => {
    const { messageId, senderId } = data;
    try {
      // DB me status 'delivered' update karo
      await prisma.message.update({
        where: { id: messageId },
        data: { status: 'delivered' }
      });
      // UI update ke liye emit
      socket.to(`user_${senderId}`).emit('messageStatusUpdated', { 
        messageId, 
        status: 'delivered' 
      });
    } catch (error) {
      console.error('Error updating delivered status:', error);
    }
  });

  // B. Jab samne wala chat open karke message padh le (Blue Double Tick)
  socket.on('markAsRead', async (data) => {
    const { senderId, receiverId } = data;
    try {
      // DB me un saare messages ko 'read' mark karo
      await prisma.message.updateMany({
        where: { 
          senderId: parseInt(senderId), 
          receiverId: parseInt(receiverId), 
          status: { not: 'read' } 
        },
        data: { status: 'read' }
      });
      // UI update ke liye emit
      socket.to(`user_${senderId}`).emit('messagesReadByReceiver', { 
        readBy: receiverId 
      });
    } catch (error) {
      console.error('Error updating read status:', error);
    }
  });
  socket.on('messagesRead', (data) => {
    io.to(`user_${data.toUserId}`).emit('messagesReadLive');
  });

  // ✨ NAYA: Bulk Delete ka live event
  socket.on('deleteMessagesBulk', ({ messageIds, receiverId }) => {
    io.to(`user_${receiverId}`).emit('messagesDeletedBulk', { messageIds });
  });

  // 5. User app band kar de toh (UPDATED with DB Last Seen)
  socket.on('disconnect', async () => {
    console.log('❌ User disconnected:', socket.id);

    // ✨ NAYA: User ko offline mark karo aur map se hatao
    let disconnectedUserId: string | null = null;
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        onlineUsers.delete(userId);
        break;
      }
    }

    if (disconnectedUserId) {
      const numUserId = Number(disconnectedUserId); // ✨ FIX: Number format me bhejna hai
      console.log(`❌ User ${numUserId} went OFFLINE`);
      const now = new Date();
      try {
        // DB me time update karo
        await prisma.user.update({
          where: { id: numUserId },
          data: { lastSeen: now }
        });
        // Sabko batao ki offline ho gaya aur time kya hai
        io.emit('userStatus', { userId: numUserId, status: 'offline', lastSeen: now });
      } catch (error) {
        console.error('Error updating lastSeen on disconnect:', error);
      }
    }
  });
});

// 🚀 DHYAN DO: Yahan server.listen use karna zaroori hai, app.listen nahi
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server & Socket.IO perfectly running on http://0.0.0.0:${PORT}`);
});