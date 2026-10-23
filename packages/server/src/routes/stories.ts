import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth'; // Apne auth middleware ka correct path check kar lena

const router = express.Router();
const prisma = new PrismaClient();

// 1. CREATE STORY API
router.post('/create', authenticateToken, async (req: any, res: any) => {
  try {
    // ✨ CHANGE 1: yahan fontFamily add kar
    const { content, backgroundColor, fontFamily } = req.body; 
    const userId = req.user.id || req.user.userId;
    console.log("Saving Story with Font:", fontFamily);
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID missing in token' });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newStory = await prisma.story.create({
      data: {
        userId: Number(userId),
        content,
        backgroundColor,
        fontFamily, // ✨ CHANGE 2: Database me save karne ke liye add kar
        expiresAt,
      },
    });
    if (req.app.get('io')) {
      req.app.get('io').emit('newStoryLive');
    }

    res.json({ success: true, story: newStory });
  } catch (error) {
    console.error("Story creation error:", error);
    res.status(500).json({ success: false, error: 'Failed to create story' });
  }
});

// 2. FETCH ACTIVE STORIES API (24 Hours Logic)
router.get('/', authenticateToken, async (req: any, res: any) => {
  try {
    const activeStories = await prisma.story.findMany({
      where: {
        expiresAt: {
          gt: new Date(), // ✨ NAYA LOGIC: Sirf wahi stories bhejega jo abhi expire nahi hui hain
        },
      },
      include: {
        user: {
          select: { id: true, username: true, isPro: true } 
        },
        views: true // Aage views dikhane ke kaam aayega
      },
      orderBy: {
        createdAt: 'desc', // Sabse latest story pehle aayegi
      },
    });

    res.json({ success: true, stories: activeStories });
  } catch (error) {
    console.error("Fetch stories error:", error);
    res.status(500).json({ success: false, error: 'Failed to fetch stories' });
  }
});

// 3. DELETE STORY API
router.delete('/delete/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const storyId = Number(req.params.id);
    const userId = Number(req.user.userId || req.user.id);

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    
    if (!story) return res.status(404).json({ success: false, error: 'Story not found' });
    
    if (Number(story.userId) !== userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Story database se hamesha ke liye delete ho gayi
    await prisma.story.delete({ where: { id: storyId } });

    // 👇 ✨ NAYA LOGIC: Delete hote hi sabko Live update bhej do 👇
    if (req.app.get('io')) {
      // Hum same 'newStoryLive' event use kar rahe hain kyunki ye frontend par pehle se fetchStoriesData() call karta hai
      req.app.get('io').emit('newStoryLive');
    }
    // 👆 YAHAN TAK 👆

    res.json({ success: true, message: 'Story deleted successfully' });
  } catch (error) {
    console.error("Delete story error:", error);
    res.status(500).json({ success: false, error: 'Failed to delete story' });
  }
});
export default router;