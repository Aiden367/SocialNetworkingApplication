// advice.ts - Updated backend routes
import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
const { AdvicePost, User } = require('./models');
const jwt = require("jsonwebtoken");

const router = Router();

// JWT Auth middleware (same as your other routes)
interface JwtPayload {
  id: string;
  username: string;
  role: string;
}

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });

  jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user as JwtPayload;
    next();
  });
};

// =====================
// CREATE ADVICE POST
// =====================
router.post("/create", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, content, category, tags, anonymous, urgency } = req.body;

    if (!title || !content || !category) {
      return res.status(400).json({ error: "Title, content, and category are required" });
    }

    if (title.length > 200) {
      return res.status(400).json({ error: "Title too long (max 200 characters)" });
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: "Content too long (max 2000 characters)" });
    }

    const validCategories = ['career', 'learning', 'projects', 'interview', 'technology', 'freelance', 'startup', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const advicePost = new AdvicePost({
      title: title.trim(),
      content: content.trim(),
      category,
      tags: tags ? tags.map((tag: string) => tag.trim().slice(0, 30)) : [],
      author: req.user!.id,
      anonymous: Boolean(anonymous),
      urgency: urgency || 'medium'
    });

    await advicePost.save();

    // Populate author info for response
    const populatedPost = await AdvicePost.findById(advicePost._id)
      .populate('author', 'username profilePhoto jobTitle');

    res.status(201).json({
      message: "Advice post created successfully",
      post: populatedPost
    });
  } catch (err) {
    console.error("Error creating advice post:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =====================
// GET ALL ADVICE POSTS
// =====================
router.get("/all", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    const status = req.query.status as string;
    const urgency = req.query.urgency as string;
    const sort = req.query.sort as string || 'newest';

    // Build filter object
    const filter: any = {};
    if (category && category !== 'all') filter.category = category;
    if (status && status !== 'all') filter.status = status;
    if (urgency && urgency !== 'all') filter.urgency = urgency;

    // Build sort object
    let sortObj: any = {};
    switch (sort) {
      case 'newest':
        sortObj = { createdAt: -1 };
        break;
      case 'oldest':
        sortObj = { createdAt: 1 };
        break;
      case 'most_responses':
        sortObj = { 'responses.length': -1, createdAt: -1 };
        break;
      case 'most_views':
        sortObj = { views: -1, createdAt: -1 };
        break;
      case 'urgent':
        sortObj = { urgency: -1, createdAt: -1 };
        break;
      default:
        sortObj = { createdAt: -1 };
    }

    const posts = await AdvicePost.find(filter)
      .populate('author', 'username profilePhoto jobTitle')
      .populate('responses.author', 'username profilePhoto jobTitle')
      .populate('responses.replies.author', 'username profilePhoto jobTitle')
      .sort(sortObj)
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await AdvicePost.countDocuments(filter);

    res.status(200).json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("Error fetching advice posts:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =====================
// GET SINGLE ADVICE POST
// =====================
router.get("/:postId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const post = await AdvicePost.findById(req.params.postId)
      .populate('author', 'username profilePhoto jobTitle')
      .populate('responses.author', 'username profilePhoto jobTitle')
      .populate('responses.replies.author', 'username profilePhoto jobTitle');

    if (!post) {
      return res.status(404).json({ error: "Advice post not found" });
    }

    // Increment view count (only if not the author)
    if (post.author._id.toString() !== req.user!.id) {
      post.views += 1;
      await post.save();
    }

    res.status(200).json(post);
  } catch (err) {
    console.error("Error fetching advice post:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =====================
// ADD RESPONSE TO ADVICE POST
// =====================
router.post("/:postId/respond", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Response content is required" });
    }

    if (content.length > 1500) {
      return res.status(400).json({ error: "Response too long (max 1500 characters)" });
    }

    const post = await AdvicePost.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: "Advice post not found" });
    }

    if (post.status === 'closed') {
      return res.status(400).json({ error: "This advice post is closed for responses" });
    }

    const response = {
      author: req.user!.id,
      content: content.trim(),
      createdAt: new Date(),
      helpful: [],
      verified: false,
      upvotes: [],
      downvotes: [],
      replies: []
    };

    post.responses.push(response);
    post.updatedAt = new Date();
    await post.save();

    // Populate the new response with author info
    const updatedPost = await AdvicePost.findById(req.params.postId)
      .populate('responses.author', 'username profilePhoto jobTitle')
      .populate('responses.replies.author', 'username profilePhoto jobTitle');

    const newResponse = updatedPost!.responses[updatedPost!.responses.length - 1];

    res.status(201).json({
      message: "Response added successfully",
      response: newResponse
    });
  } catch (err) {
    console.error("Error adding response:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =====================
// REPLY TO A RESPONSE
// =====================
router.post("/:postId/response/:responseId/reply", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Reply content is required" });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: "Reply too long (max 1000 characters)" });
    }

    const post = await AdvicePost.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: "Advice post not found" });
    }

    if (post.status === 'closed') {
      return res.status(400).json({ error: "This advice post is closed for replies" });
    }

    const response = post.responses.id(req.params.responseId);
    if (!response) {
      return res.status(404).json({ error: "Response not found" });
    }

    const reply = {
      author: req.user!.id,
      content: content.trim(),
      createdAt: new Date(),
      upvotes: [],
      downvotes: []
    };

    response.replies.push(reply);
    post.updatedAt = new Date();
    await post.save();

    // Populate the new reply with author info
    const updatedPost = await AdvicePost.findById(req.params.postId)
      .populate('responses.author', 'username profilePhoto jobTitle')
      .populate('responses.replies.author', 'username profilePhoto jobTitle');

    const updatedResponse = updatedPost!.responses.id(req.params.responseId);
    const newReply = updatedResponse!.replies[updatedResponse!.replies.length - 1];

    res.status(201).json({
      message: "Reply added successfully",
      reply: newReply
    });
  } catch (err) {
    console.error("Error adding reply:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =====================
// VOTE ON RESPONSE (UPVOTE/DOWNVOTE)
// =====================
router.post("/:postId/response/:responseId/vote", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { voteType } = req.body; // 'upvote' or 'downvote'

    if (!['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({ error: "Vote type must be 'upvote' or 'downvote'" });
    }

    const post = await AdvicePost.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: "Advice post not found" });
    }

    const response = post.responses.id(req.params.responseId);
    if (!response) {
      return res.status(404).json({ error: "Response not found" });
    }

    // Prevent voting on own response
    if (response.author.toString() === req.user!.id) {
      return res.status(400).json({ error: "You cannot vote on your own response" });
    }

    const userId = req.user!.id;
    const upvoteIndex = response.upvotes.indexOf(userId);
    const downvoteIndex = response.downvotes.indexOf(userId);

    // Remove existing votes first
    if (upvoteIndex !== -1) response.upvotes.splice(upvoteIndex, 1);
    if (downvoteIndex !== -1) response.downvotes.splice(downvoteIndex, 1);

    // Add new vote (unless it's the same as existing vote - toggle behavior)
    if (voteType === 'upvote' && upvoteIndex === -1) {
      response.upvotes.push(userId);
    } else if (voteType === 'downvote' && downvoteIndex === -1) {
      response.downvotes.push(userId);
    }

    await post.save();

    const score = response.upvotes.length - response.downvotes.length;

    res.status(200).json({
      message: "Vote recorded successfully",
      upvotes: response.upvotes.length,
      downvotes: response.downvotes.length,
      score,
      userVote: upvoteIndex === -1 && voteType === 'upvote' ? 'upvote' : 
                downvoteIndex === -1 && voteType === 'downvote' ? 'downvote' : null
    });
  } catch (err) {
    console.error("Error voting on response:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =====================
// VOTE ON REPLY (UPVOTE/DOWNVOTE)
// =====================
router.post("/:postId/response/:responseId/reply/:replyId/vote", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { voteType } = req.body; // 'upvote' or 'downvote'

    if (!['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({ error: "Vote type must be 'upvote' or 'downvote'" });
    }

    const post = await AdvicePost.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: "Advice post not found" });
    }

    const response = post.responses.id(req.params.responseId);
    if (!response) {
      return res.status(404).json({ error: "Response not found" });
    }

    const reply = response.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ error: "Reply not found" });
    }

    // Prevent voting on own reply
    if (reply.author.toString() === req.user!.id) {
      return res.status(400).json({ error: "You cannot vote on your own reply" });
    }

    const userId = req.user!.id;
    const upvoteIndex = reply.upvotes.indexOf(userId);
    const downvoteIndex = reply.downvotes.indexOf(userId);

    // Remove existing votes first
    if (upvoteIndex !== -1) reply.upvotes.splice(upvoteIndex, 1);
    if (downvoteIndex !== -1) reply.downvotes.splice(downvoteIndex, 1);

    // Add new vote (unless it's the same as existing vote - toggle behavior)
    if (voteType === 'upvote' && upvoteIndex === -1) {
      reply.upvotes.push(userId);
    } else if (voteType === 'downvote' && downvoteIndex === -1) {
      reply.downvotes.push(userId);
    }

    await post.save();

    const score = reply.upvotes.length - reply.downvotes.length;

    res.status(200).json({
      message: "Vote recorded successfully",
      upvotes: reply.upvotes.length,
      downvotes: reply.downvotes.length,
      score,
      userVote: upvoteIndex === -1 && voteType === 'upvote' ? 'upvote' : 
                downvoteIndex === -1 && voteType === 'downvote' ? 'downvote' : null
    });
  } catch (err) {
    console.error("Error voting on reply:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =====================
// MARK RESPONSE AS HELPFUL (keeping original functionality)
// =====================
router.post("/:postId/response/:responseId/helpful", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const post = await AdvicePost.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: "Advice post not found" });
    }

    const response = post.responses.id(req.params.responseId);
    if (!response) {
      return res.status(404).json({ error: "Response not found" });
    }

    const userId = req.user!.id;
    const helpfulIndex = response.helpful.indexOf(userId);

    if (helpfulIndex === -1) {
      response.helpful.push(userId); // Mark as helpful
    } else {
      response.helpful.splice(helpfulIndex, 1); // Remove helpful mark
    }

    await post.save();

    res.status(200).json({
      message: helpfulIndex === -1 ? "Marked as helpful" : "Removed helpful mark",
      helpfulCount: response.helpful.length,
      isHelpful: helpfulIndex === -1
    });
  } catch (err) {
    console.error("Error marking response as helpful:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ... (rest of your existing routes remain the same)

module.exports = router;