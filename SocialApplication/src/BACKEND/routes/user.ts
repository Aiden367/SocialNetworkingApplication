const bcrypt = require("bcrypt");
const { User, Conversation, Group, GroupPost, AdvicePost, GitHubIntegration } = require('./models');
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');
const crypto = require('crypto');
import { ObjectId } from 'mongoose';
import bucket from '../gcs';
import { Router, Request, Response, NextFunction } from "express";
import multer from 'multer';
import mongoose from 'mongoose';

const upload = multer({ storage: multer.memoryStorage() });

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  html_url: string;
  private: boolean;
  updated_at: string | null;  // Changed from string to string | null
  pushed_at: string | null;   // Changed from string to string | null
}


interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
  company: string | null;
  location: string | null;
  blog: string | null;
  twitter_username: string | null;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  html_url: string;
  private: boolean;
  updated_at: string | null;
  pushed_at: string | null;
}

interface GroupType extends Document {
  _id: string;
  name: string;
  description?: string;
  profileImage?: { url: string; publicId?: string };
  coverImage?: { url: string; publicId?: string };
  members: { user: any; role?: string; joinedAt?: Date }[];
  createdBy: any;
  createdAt: Date;
}

// Add this interface with your other interfaces
interface GitHubTokenResponse {
  access_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface FriendRequest {
  user: ObjectId | {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    profilePhoto?: { url: string };
  };
  status: 'pending' | 'accepted' | 'rejected';
}


interface Message {
  content: string;
  sender: ObjectId | { _id: string; username: string; profilePhoto?: { url: string } };
  recipient: ObjectId | { _id: string; username: string; profilePhoto?: { url: string } };
  timestamp: Date;
  read: boolean;
  attachments: any[];
}


interface Conversation {
  _id: string;
  participants: (mongoose.Types.ObjectId | { _id: string; username: string; profilePhoto?: { url: string } })[];
  messages: Message[];
  lastUpdated?: Date;
}

// ADD THIS NEW INTERFACE BELOW
interface ConversationType {
  _id: string;
  participants: { _id: string; username: string; profilePhoto?: { url: string } }[];
  messages: {
    _id: string;
    content: string;
    sender: { _id: string; username: string; profilePhoto?: { url: string } };
    recipient: { _id: string; username: string; profilePhoto?: { url: string } };
    timestamp: Date;
    read: boolean;
    attachments: any[];
  }[];
}

interface UserWithConversations {
  _id: string;
  username: string;
  conversations: Conversation[];
}


// Define interfaces for TypeScript
interface JwtPayload {
  id: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  file?: Express.Multer.File;
}

// Hilarious contradictory job title components
const contradictoryPrefixes = [
  'Senior Junior', 'Lead Assistant', 'Chief Intern', 'Principal Entry-Level',
  'Executive Trainee', 'Director Apprentice', 'VP of Basics', 'Master Beginner',
  'Expert Novice', 'Advanced Starter', 'Pro Amateur', 'Distinguished Rookie',
  'Elite Newbie', 'Legendary Intern', 'Guru Student', 'Wizard Padawan'
];

const absurdSeniorities = [
  'Senior', 'Junior', 'Lead', 'Assistant', 'Principal', 'Intern', 'Chief',
  'Trainee', 'Executive', 'Entry-Level', 'Distinguished', 'Apprentice',
  'Master', 'Beginner', 'Expert', 'Novice', 'Pro', 'Amateur'
];

const buzzwordyRoles = [
  'Fullstack', 'Frontend', 'Backend', 'Middleware', 'Sidestack', 'Quarterstack',
  'No-Stack', 'Anti-Stack', 'Stack Overflow', 'DevOps', 'DevNops', 'NoOps',
  'AllOps', 'SomeOps', 'MaybeOps', 'Cloud', 'On-Premise', 'Hybrid', 'Quantum',
  'Blockchain', 'AI/ML', 'Non-AI', 'Pseudo-AI', 'Almost-AI'
];

const ridiculousJobTypes = [
  'Engineer', 'Developer', 'Architect', 'Evangelist', 'Ninja', 'Rockstar',
  'Guru', 'Wizard', 'Unicorn', 'Pirate', 'Jedi', 'Superhero', 'Magician',
  'Whisperer', 'Tamer', 'Bender', 'Slayer', 'Champion', 'Master', 'Overlord',
  'Destroyer', 'Creator', 'God', 'Mortal', 'Human', 'Robot', 'Cyborg'
];

const randomSuffixes = [
  'II', 'III', 'IV', 'Jr.', 'Sr.', 'PhD', 'MD', 'Esq.', 'CPA', '2.0', '3000',
  'XL', 'Pro', 'Max', 'Plus', 'Premium', 'Enterprise', 'Deluxe', 'Ultimate',
  'Extreme', 'Turbo', 'Super', 'Mega', 'Ultra', 'Hyper', 'Neo', 'Alpha', 'Beta'
];

const technicalNonsense = [
  'Serverless Server', 'Stateless State', 'Headless Head', 'Wireless Wire',
  'Paperless Paper', 'Cloudless Cloud', 'Agile Waterfall', 'Secure Vulnerability',
  'Scalable Bottleneck', 'Simple Complexity', 'Async Sync', 'Frontend Backend',
  'Left-Handed API', 'Recursive Loop', 'Infinite Finite', 'Legacy Modern'
];

import rateLimit from 'express-rate-limit';
const router = Router();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000;

//Prevent bruce force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});


const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).send({ error: 'Access token required' });
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
    if (err) {
      res.status(403).send({ error: 'Invalid or expired token' });
      return;
    }
    req.user = user as JwtPayload;
    next();
  });
};


router.post('/upload-profile', authenticateToken, upload.single('profileImage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const filename = `${req.user.id}_${Date.now()}_${req.file.originalname}`;
    const file = bucket.file(filename);
    const blobStream = file.createWriteStream({
      resumable: false,
      contentType: req.file.mimetype,
    });
    blobStream.on('error', (err: Error) => {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Upload failed' });
    });
    blobStream.on('finish', async () => {
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 24 * 60 * 60 * 1000,
      });
      const updatedUser = await User.findByIdAndUpdate(
        req.user!.id,
        {
          'profilePhoto.url': signedUrl,
          'profilePhoto.publicId': filename,
        },
        { new: true }
      );
      res.status(200).json({
        message: 'Profile photo uploaded successfully',
        profilePhoto: updatedUser?.profilePhoto,
      });
    });
    blobStream.end(req.file.buffer);
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
}
);


router.post('/Login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).send({ error: "Invalid Username or Password" });
      return;
    }
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      res.status(423).send({ error: `Account Locked. Try again in ${minutesLeft} minutes.` })
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = Date.now() + LOCK_TIME;
      }
      await user.save();
      res.status(401).send({ error: "Invalid username or password" });
    }
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();
    //JWT token for user
    const token = jwt.sign({
      id: user._id,
      username: user.username,
      role: user.role
    }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).send({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Could not log the user in", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

router.post('/Register', async (req, res) => {
  try {
    const { username, firstName, lastName, email, password, role } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = new User({
      username,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: role || "user"
    });
    const savedUser = await user.save()
    res.status(201).send({ user: savedUser })
  } catch (error) {
    console.error('Error saving user or creating account', error);
  }
})

// GET all users (except password)
router.get('/all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await User.find()
      .select('_id username firstName lastName profilePhoto');

    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/friend-data', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get the current logged-in user
    const currentUser = await User.findById(req.user?.id).populate('connections.user', '_id');
    if (!currentUser) return res.status(404).json({ error: 'Current user not found' });

    // Find the requested friend by ID
    const friend = await User.findById(req.params.id)
      .select('-password')
      .populate({
        path: 'posts.comments.user',   // populate the 'user' field in each comment
        select: '_id username profilePhoto'
      });

    if (!friend) return res.status(404).json({ error: 'Friend not found' });

    // Check if the requested user is in the current user's connections
    const isFriend = currentUser.connections?.some(
      (c: any) => c.user._id.toString() === friend._id.toString() && c.status === 'accepted'
    );

    if (!isFriend) return res.status(403).json({ error: 'Access denied, not a friend' });

    res.status(200).json(friend);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.params.id !== req.user?.id) {
      return res.status(403).send({ error: 'Access denied' });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).send({ error: 'User not found' });
    }

    // Manually fetch GitHub integration if it exists
    let githubIntegration = null;
    if (user.integrations?.github) {
      githubIntegration = await GitHubIntegration.findById(user.integrations.github)
        .select('-accessToken');
    }

    // Add the populated GitHub integration to the response
    const userResponse = {
      ...user.toObject(),
      integrations: {
        ...user.integrations,
        github: githubIntegration
      }
    };

    res.status(200).send(userResponse);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).send({ error: 'Internal server error' });
  }
});


router.post('/:id/create-post', authenticateToken, upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const userId = req.user.id;

    if (req.params.id !== userId) return res.status(403).json({ error: 'Access denied' });

    const filename = `${userId}_${Date.now()}_${req.file.originalname}`;
    const file = bucket.file(filename);
    const blobStream = file.createWriteStream({
      resumable: false,
      contentType: req.file.mimetype,
    });

    blobStream.on('error', (err: Error) => {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Upload failed' });
    });

    blobStream.on('finish', async () => {
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 24 * 60 * 60 * 1000,
      });

      const newPost = {
        url: signedUrl,
        mediaType: 'image',
        caption: req.body.caption || '',
        uploadDate: new Date(),
        likes: [],
        comments: [],
      };

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $push: { posts: newPost } },
        { new: true }
      );

      res.status(200).json({
        message: 'Post created successfully',
        post: updatedUser?.posts[updatedUser.posts.length - 1],
      });
    });

    blobStream.end(req.file.buffer);
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// GET user by username (for WebSocket recipient lookup)
router.get('/by-username/:username', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username } = req.params;

    // Find user by username
    const user = await User.findOne({ username }).select('_id username firstName lastName');
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Send only the _id (recipientId) and maybe username
    res.status(200).json({ _id: user._id, username: user.username });
  } catch (error) {
    console.error('Error fetching user by username:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:userId/conversation/:recipientId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, recipientId } = req.params;

    if (req.user?.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Convert to ObjectIds
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const recipientObjectId = new mongoose.Types.ObjectId(recipientId);

    // Sort IDs for consistent chatKey
    const participantIds = [userObjectId.toString(), recipientObjectId.toString()].sort();
    const chatKey = participantIds.join('_');

    // Find existing conversation
    let conversation = await Conversation.findOne({ chatKey })
      .populate('messages.sender', 'username profilePhoto')
      .populate('messages.recipient', 'username profilePhoto');

    // Create an empty conversation if none exists
    if (!conversation) {
      conversation = new Conversation({
        participants: participantIds,
        messages: [],
        lastUpdated: new Date(),
        chatKey,
      });
      await conversation.save();
    }

    res.status(200).json({ messages: conversation.messages, conversationId: conversation._id });

  } catch (err) {
    console.error('Error fetching conversation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});






// SEND friend request
router.post('/:id/connect/:targetId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, targetId } = req.params;

    if (!req.user || req.user.id !== id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (id === targetId) {
      return res.status(400).json({ error: "You cannot connect with yourself" });
    }

    const user = await User.findById(id);
    const target = await User.findById(targetId);

    if (!user || !target) {
      return res.status(404).json({ error: "User not found" });
    }

    // Already connected?
    if ((user.connections as FriendRequest[]).some(c => c.user.toString() === targetId && c.status === "accepted")) {
      return res.status(400).json({ error: "Already connected" });
    }

    // Add request to both users
    (user.sentRequests as FriendRequest[]).push({ user: target._id, status: "pending" });
    (target.receivedRequests as FriendRequest[]).push({ user: user._id, status: "pending" });

    await user.save();
    await target.save();

    res.status(200).json({ message: "Friend request sent" });
  } catch (err) {
    console.error("Error sending request:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


router.post('/:id/accept/:requestId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, requestId } = req.params;

    if (!req.user || req.user.id !== id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const user = await User.findById(id);
    const requester = await User.findById(requestId);

    if (!user || !requester) {
      return res.status(404).json({ error: "User not found" });
    }

    const receivedReq = (user.receivedRequests as FriendRequest[])
      .find((r: FriendRequest) => r.user.toString() === requestId);
    if (!receivedReq) return res.status(400).json({ error: "No request from this user" });

    receivedReq.status = "accepted";
    (user.connections as FriendRequest[]).push({ user: requester._id, status: "accepted" });

    const sentReq = (requester.sentRequests as FriendRequest[])
      .find((r: FriendRequest) => r.user.toString() === id);
    if (sentReq) sentReq.status = "accepted";
    (requester.connections as FriendRequest[]).push({ user: user._id, status: "accepted" });

    await user.save();
    await requester.save();

    // Populate the user field so frontend can get username and profilePhoto
    const populatedReceived = await User.findById(id)
      .populate('receivedRequests.user', 'username profilePhoto')
      .populate('connections.user', 'username profilePhoto');

    res.status(200).json({
      message: "Friend request accepted",
      incoming: populatedReceived?.receivedRequests.filter((r: FriendRequest) => r.status === 'pending'),
      friends: populatedReceived?.connections.filter((c: FriendRequest) => c.status === 'accepted')
    });
  } catch (err) {
    console.error("Error accepting request:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// REJECT request
router.post('/:id/reject/:requestId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, requestId } = req.params;

    if (!req.user || req.user.id !== id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const user = await User.findById(id);
    const requester = await User.findById(requestId);

    if (!user || !requester) {
      return res.status(404).json({ error: "User not found" });
    }

    const receivedReq = (user.receivedRequests as FriendRequest[])
      .find((r: FriendRequest) => r.user.toString() === requestId);
    if (!receivedReq) return res.status(400).json({ error: "No request from this user" });

    receivedReq.status = "rejected";

    const sentReq = (requester.sentRequests as FriendRequest[])
      .find((r: FriendRequest) => r.user.toString() === id);
    if (sentReq) sentReq.status = "rejected";

    await user.save();
    await requester.save();

    res.status(200).json({ message: "Friend request rejected" });
  } catch (err) {
    console.error("Error rejecting request:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// REMOVE friend (unfriend)
router.delete('/:id/remove/:friendId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, friendId } = req.params;

    if (!req.user || req.user.id !== id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const user = await User.findById(id);
    const friend = await User.findById(friendId);

    if (!user || !friend) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove from connections
    user.connections = (user.connections as any).filter((c: any) => c.user.toString() !== friendId);
    friend.connections = (friend.connections as any).filter((c: any) => c.user.toString() !== id);

    // Also clean up requests arrays if they exist
    user.sentRequests = (user.sentRequests as any).filter((c: any) => c.user.toString() !== friendId);
    user.receivedRequests = (user.receivedRequests as any).filter((c: any) => c.user.toString() !== friendId);

    friend.sentRequests = (friend.sentRequests as any).filter((c: any) => c.user.toString() !== id);
    friend.receivedRequests = (friend.receivedRequests as any).filter((c: any) => c.user.toString() !== id);

    await user.save();
    await friend.save();

    res.status(200).json({ message: "Friend removed successfully" });
  } catch (err) {
    console.error("Error removing friend:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET friends and requests for a user
router.get('/:id/friends', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.user || req.user.id !== id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const user = await User.findById(id)
      .populate('connections.user', 'username firstName lastName profilePhoto')
      .populate('sentRequests.user', 'username firstName lastName profilePhoto')
      .populate('receivedRequests.user', 'username firstName lastName profilePhoto');

    if (!user) return res.status(404).json({ error: "User not found" });

    // Cast to FriendRequest[]
    const connections = user.connections as FriendRequest[];
    const received = user.receivedRequests as FriendRequest[];
    const sent = user.sentRequests as FriendRequest[];

    res.json({
      friends: connections.filter(c => c.status === 'accepted'),
      incoming: received.filter(r => r.status === 'pending'),
      outgoing: sent.filter(r => r.status === 'pending'),
    });
  } catch (err) {
    console.error("Error fetching friends:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET all other users for sending friend requests
router.get('/:id/others', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.user || req.user.id !== id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Get IDs of all users the current user is connected to or has requests with
    const excludedIds = new Set<string>([
      id,
      ...(user.connections as FriendRequest[]).map(c => c.user.toString()),
      ...(user.sentRequests as FriendRequest[]).map(r => r.user.toString()),
      ...(user.receivedRequests as FriendRequest[]).map(r => r.user.toString()),
    ]);

    // Find all other users
    const others = await User.find({ _id: { $nin: Array.from(excludedIds) } })
      .select('_id username firstName lastName profilePhoto');

    res.status(200).json(others);
  } catch (err) {
    console.error("Error fetching other users:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET all conversations for a user
router.get('/:id/conversations', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user || req.user.id !== id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Fetch all conversations that include this user
    const conversations = await Conversation.find({ participants: id })
      .populate('participants', 'username profilePhoto')
      .populate('messages.sender', 'username profilePhoto')
      .populate('messages.recipient', 'username profilePhoto')
      .sort({ lastUpdated: -1 }); // newest first

    // Map conversations to chat summaries
    const chats = conversations.map((conversation: ConversationType) => {
      const lastMessage = conversation.messages[conversation.messages.length - 1] || null;

      // The friend is the participant who is not the current user
      const friend = conversation.participants.find(p => p._id.toString() !== id.toString());

      return {
        conversationId: conversation._id,
        friend: friend
          ? { _id: friend._id, username: friend.username, profilePhoto: friend.profilePhoto }
          : null,
        lastMessage: lastMessage
          ? {
            ...lastMessage,
            sender: lastMessage.sender,
            recipient: lastMessage.recipient
          }
          : null,
      };
    });

    res.status(200).json(chats);
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});






// Comment on a post
router.post('/:userId/posts/:postId/comment', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, postId } = req.params;
    const { comment } = req.body;

    if (!req.user) return res.status(403).json({ error: 'Unauthorized' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const post = user.posts.id(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // push comment with proper schema field
    post.comments.push({
      user: new mongoose.Types.ObjectId(req.user.id),
      text: comment,
      createdAt: new Date()
    });

    await user.save();

    // populate user inside comments
    await user.populate({
      path: "posts.comments.user",
      select: "_id username profilePhoto"
    });

    res.status(200).json({ comments: post.comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/:id/upload-story', authenticateToken, upload.single('storyMedia'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Type guard for req.file
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const userId = req.user.id;
    if (req.params.id !== userId) return res.status(403).json({ error: 'Access denied' });

    const filename = `${userId}_story_${Date.now()}_${req.file.originalname}`;
    const file = bucket.file(filename);

    const blobStream = file.createWriteStream({
      resumable: false,
      contentType: req.file.mimetype,
    });

    blobStream.on('error', (err: Error) => {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Upload failed' });
    });

    blobStream.on('finish', async () => {
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours access
      });

      const newStory = {
        media: {
          url: signedUrl,
          mediaType: req.file!.mimetype.startsWith('video') ? 'video' : 'image', // non-null assertion is safe here
          caption: req.body.caption || '',
          uploadDate: new Date(),
          likes: [],
          comments: [],
        },
        postedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // story expires in 24 hours
        viewers: [],
        privacy: req.body.privacy || 'friends',
      };

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $push: { stories: newStory } },
        { new: true }
      );

      res.status(200).json({
        message: 'Story uploaded successfully',
        story: updatedUser?.stories[updatedUser.stories.length - 1],
      });
    });

    blobStream.end(req.file.buffer);
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// GET stories for a user
router.get('/:id/stories', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Only allow access to own stories or friends' stories
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const currentUser = await User.findById(req.user.id).populate('connections.user', '_id');
    if (!currentUser) return res.status(404).json({ error: 'Current user not found' });

    const requestedUser = await User.findById(id).select('stories connections');
    if (!requestedUser) return res.status(404).json({ error: 'User not found' });

    // Check if the requested user is the authenticated user
    const isSelf = req.user.id === id;

    // Check if the requested user is a friend
    const isFriend = currentUser.connections?.some(
      (c: any) => c.user._id.toString() === id && c.status === 'accepted'
    );

    if (!isSelf && !isFriend) {
      return res.status(403).json({ error: 'Access denied, not a friend' });
    }

    // Filter stories that haven't expired yet
    const activeStories = (requestedUser.stories || []).filter(
      (story: any) => new Date(story.expiresAt) > new Date()
    );

    res.status(200).json({ stories: activeStories });
  } catch (err) {
    console.error('Error fetching stories:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/:senderId/message/:recipientId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { senderId, recipientId } = req.params;
    const { content } = req.body;

    if (!req.user || req.user.id !== senderId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const senderObjectId = new mongoose.Types.ObjectId(senderId);
    const recipientObjectId = new mongoose.Types.ObjectId(recipientId);

    const participantIds = [senderObjectId.toString(), recipientObjectId.toString()].sort();
    const chatKey = participantIds.join('_');

    // Only find existing conversation — do NOT create
    const conversation = await Conversation.findOne({ chatKey });
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation does not exist. Open chat first.' });
    }

    const newMessage = {
      content,
      sender: senderObjectId,
      recipient: recipientObjectId,
      timestamp: new Date(),
      read: false,
      attachments: [],
    };

    conversation.messages.push(newMessage);
    conversation.lastUpdated = new Date();
    await conversation.save();

    await conversation.populate([
      { path: 'messages.sender', select: 'username profilePhoto' },
      { path: 'messages.recipient', select: 'username profilePhoto' },
    ]);

    res.status(201).json(conversation.messages[conversation.messages.length - 1]);

  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// GET all groups (no filtering)
router.get('/groups/all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Fetch all groups, populate creator and member info
    const groups = await Group.find()
      .populate('createdBy', 'username profilePhoto')        // creator info
      .populate('members.user', 'username profilePhoto')    // members info
      .sort({ createdAt: -1 });                             // newest first

    // Define GroupSummary type for the response
    interface GroupSummary {
      _id: string;
      name: string;
      description?: string;
      profileImage?: string;
      coverImage?: string;
      membersCount: number;
      createdBy: {
        _id: string;
        username: string;
        profilePhoto?: { url: string; publicId?: string };
      } | null;
      createdAt: Date;
    }

    // Explicitly type 'group' to fix TS error
    const groupSummaries: GroupSummary[] = groups.map((group: GroupType) => ({
      _id: group._id.toString(),
      name: group.name,
      description: group.description,
      profileImage: group.profileImage?.url,
      coverImage: group.coverImage?.url,
      membersCount: group.members.length,
      createdBy: group.createdBy
        ? {
          _id: group.createdBy._id.toString(),
          username: group.createdBy.username,
          profilePhoto: group.createdBy.profilePhoto,
        }
        : null,
      createdAt: group.createdAt,
    }));

    res.status(200).json(groupSummaries);
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Function to generate hilariously contradictory job titles
const generateJobTitle = () => {
  const formats = [
    // Format 1: Contradictory prefix + role + suffix
    () => {
      const prefix = contradictoryPrefixes[Math.floor(Math.random() * contradictoryPrefixes.length)];
      const role = buzzwordyRoles[Math.floor(Math.random() * buzzwordyRoles.length)];
      const jobType = ridiculousJobTypes[Math.floor(Math.random() * ridiculousJobTypes.length)];
      const suffix = randomSuffixes[Math.floor(Math.random() * randomSuffixes.length)];
      return `${prefix} ${role} ${jobType} ${suffix}`;
    },

    // Format 2: Multiple contradictory seniorities
    () => {
      const seniority1 = absurdSeniorities[Math.floor(Math.random() * absurdSeniorities.length)];
      const seniority2 = absurdSeniorities[Math.floor(Math.random() * absurdSeniorities.length)];
      const role = buzzwordyRoles[Math.floor(Math.random() * buzzwordyRoles.length)];
      const jobType = ridiculousJobTypes[Math.floor(Math.random() * ridiculousJobTypes.length)];
      const suffix = randomSuffixes[Math.floor(Math.random() * randomSuffixes.length)];
      return `${seniority1} ${seniority2} ${role} ${jobType} ${suffix}`;
    },

    // Format 3: Technical nonsense + regular title
    () => {
      const nonsense = technicalNonsense[Math.floor(Math.random() * technicalNonsense.length)];
      const jobType = ridiculousJobTypes[Math.floor(Math.random() * ridiculousJobTypes.length)];
      const suffix = randomSuffixes[Math.floor(Math.random() * randomSuffixes.length)];
      return `${nonsense} ${jobType} ${suffix}`;
    },

    // Format 4: Overly specific nonsense
    () => {
      const prefix = absurdSeniorities[Math.floor(Math.random() * absurdSeniorities.length)];
      const role1 = buzzwordyRoles[Math.floor(Math.random() * buzzwordyRoles.length)];
      const role2 = buzzwordyRoles[Math.floor(Math.random() * buzzwordyRoles.length)];
      const jobType = ridiculousJobTypes[Math.floor(Math.random() * ridiculousJobTypes.length)];
      const suffix = randomSuffixes[Math.floor(Math.random() * randomSuffixes.length)];
      return `${prefix} ${role1} ${role2} ${jobType} ${suffix}`;
    },

    // Format 5: Pure chaos
    () => {
      const words = [
        ...contradictoryPrefixes.flatMap(p => p.split(' ')),
        ...buzzwordyRoles,
        ...ridiculousJobTypes,
        'Quantum', 'Artisanal', 'Organic', 'Gluten-Free', 'Sustainable',
        'Disrupting', 'Revolutionary', 'Next-Gen', 'Web3', 'Metaverse'
      ];

      const wordCount = Math.floor(Math.random() * 3) + 3; // 3-5 words
      const selectedWords = [];
      for (let i = 0; i < wordCount; i++) {
        selectedWords.push(words[Math.floor(Math.random() * words.length)]);
      }
      const suffix = randomSuffixes[Math.floor(Math.random() * randomSuffixes.length)];
      return `${selectedWords.join(' ')} ${suffix}`;
    }
  ];

  const randomFormat = formats[Math.floor(Math.random() * formats.length)];
  return randomFormat();
};

// Route to generate and update user's job title
router.post('/:id/generate-job-title', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user || req.user.id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const newJobTitle = generateJobTitle();

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { jobTitle: newJobTitle },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      message: 'Job title generated successfully!',
      jobTitle: newJobTitle,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error generating job title:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to manually set job title
router.put('/:id/job-title', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { jobTitle } = req.body;

    if (!req.user || req.user.id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!jobTitle || jobTitle.trim().length === 0) {
      return res.status(400).json({ error: 'Job title cannot be empty' });
    }

    if (jobTitle.length > 100) {
      return res.status(400).json({ error: 'Job title too long (max 100 characters)' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { jobTitle: jobTitle.trim() },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      message: 'Job title updated successfully!',
      jobTitle: updatedUser.jobTitle,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating job title:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Add this interface at the top with your other interfaces
interface GitHubTokenResponse {
  access_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}


router.post('/auth/github', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code } = req.body;
    console.log('=== GITHUB AUTH DEBUG START ===');
    console.log('1. User ID:', req.user?.id);
    console.log('2. Code received:', code ? 'YES' : 'NO');
    console.log('3. Environment check - Client ID:', process.env.GITHUB_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('4. Environment check - Client Secret:', process.env.GITHUB_CLIENT_SECRET ? 'SET' : 'NOT SET');

    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!code) return res.status(400).json({ error: 'No authorization code provided' });

    // Exchange code for access token
    console.log('5. Exchanging code for access token...');
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json() as GitHubTokenResponse;
    console.log('6. Token response status:', tokenResponse.status);
    console.log('7. Token data error:', tokenData.error || 'NONE');

    if (tokenData.error) {
      console.log('ERROR: GitHub token exchange failed:', tokenData.error_description);
      return res.status(400).json({ error: tokenData.error_description });
    }

    const { access_token, scope, token_type } = tokenData;

    if (!access_token) {
      console.log('ERROR: No access token received');
      return res.status(400).json({ error: 'Failed to obtain access token from GitHub' });
    }

    console.log('8. Access token received successfully');

    // Fetch GitHub user profile
    console.log('9. Fetching GitHub user profile...');
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'YourApp/1.0'
      }
    });

    if (!userResponse.ok) {
      console.log('ERROR: GitHub user API failed:', userResponse.status);
      throw new Error(`GitHub API error: ${userResponse.status}`);
    }

    const githubUser = await userResponse.json() as GitHubUser;
    console.log('10. GitHub user fetched:', githubUser.login);

    // Fetch user repositories
    console.log('11. Fetching repositories...');
    const reposResponse = await fetch('https://api.github.com/user/repos?sort=updated&per_page=10&type=public', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'YourApp/1.0'
      }
    });

    if (!reposResponse.ok) {
      console.log('ERROR: GitHub repos API failed:', reposResponse.status);
      throw new Error(`GitHub API error: ${reposResponse.status}`);
    }

    const repos = await reposResponse.json() as GitHubRepo[];
    console.log('12. Repositories fetched:', repos.length);

    const formattedRepos = repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      url: repo.html_url,
      isPrivate: repo.private,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at
    }));

    console.log('13. Creating GitHub integration document...');

    // Check if GitHubIntegration model is available
    console.log('14. GitHubIntegration model check:', typeof GitHubIntegration);

    const githubIntegration = await GitHubIntegration.findOneAndUpdate(
      { user: req.user.id },
      {
        user: req.user.id,
        accessToken: access_token,
        tokenType: token_type || 'bearer',
        scope: scope || '',
        profile: {
          id: githubUser.id,
          username: githubUser.login,
          name: githubUser.name,
          bio: githubUser.bio,
          avatarUrl: githubUser.avatar_url,
          profileUrl: githubUser.html_url,
          publicRepos: githubUser.public_repos,
          followers: githubUser.followers,
          following: githubUser.following,
          company: githubUser.company,
          location: githubUser.location,
          blog: githubUser.blog,
          twitterUsername: githubUser.twitter_username
        },
        repositories: formattedRepos,
        connectedAt: new Date(),
        lastActiveAt: new Date(),
        lastSyncAt: new Date(),
        profileLastSyncAt: new Date(),
        reposLastSyncAt: new Date(),
        isActive: true
      },
      { upsert: true, new: true }
    ).select('-accessToken');

    console.log('15. GitHub integration created/updated:', githubIntegration ? githubIntegration._id : 'FAILED');

    console.log('16. Updating user document...');
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { 'integrations.github': githubIntegration._id },
      { new: true }
    );

    console.log('17. User document updated:', updatedUser ? 'SUCCESS' : 'FAILED');
    console.log('18. User integrations field:', updatedUser?.integrations);

    console.log('=== GITHUB AUTH DEBUG END ===');

    res.json({
      success: true,
      githubProfile: githubIntegration.profile,
      repositories: githubIntegration.repositories,
      message: 'GitHub connected successfully'
    });
  } catch (error) {
    console.error('=== GITHUB AUTH ERROR ===');
    console.error('Error details:', error);
    res.status(500).json({ error: 'Failed to connect GitHub account' });
  }
});

// Get GitHub profile and repositories
router.get('/:userId/github/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;

    if (!req.user || req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const integration = await GitHubIntegration.findOne({ user: userId }).select('-accessToken');
    if (!integration || !integration.isActive) {
      return res.status(404).json({ error: 'GitHub not connected' });
    }

    res.json({
      profile: integration.profile,
      repositories: integration.repositories,
      lastSyncAt: integration.lastSyncAt,
      settings: integration.settings,
      isConnected: true
    });
  } catch (error) {
    console.error('Error fetching GitHub profile:', error);
    res.status(500).json({ error: 'Failed to fetch GitHub profile' });
  }
});

// Sync GitHub data manually - replace your existing route
router.post('/:userId/github/sync', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;

    if (!req.user || req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const integration = await GitHubIntegration.findOne({ user: userId }).select('+accessToken');
    if (!integration || !integration.isActive || !integration.accessToken) {
      return res.status(404).json({ error: 'GitHub not connected' });
    }

    // Fetch GitHub user profile
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${integration.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'YourApp/1.0'
      }
    });

    if (!userResponse.ok) {
      throw new Error(`GitHub API error: ${userResponse.status}`);
    }

    const githubUser = await userResponse.json() as GitHubUser;

    // Fetch repositories
    const maxRepos = integration.settings?.maxReposToCache || 20;
    const repoType = integration.settings?.showPrivateRepos ? 'all' : 'public';

    const reposResponse = await fetch(`https://api.github.com/user/repos?sort=updated&per_page=${maxRepos}&type=${repoType}`, {
      headers: {
        'Authorization': `Bearer ${integration.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'YourApp/1.0'
      }
    });

    if (!reposResponse.ok) {
      throw new Error(`GitHub API error: ${reposResponse.status}`);
    }

    const repos = await reposResponse.json() as GitHubRepo[];

    const formattedRepos = repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      url: repo.html_url,
      isPrivate: repo.private,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at
    }));

    const updatedIntegration = await GitHubIntegration.findByIdAndUpdate(
      integration._id,
      {
        profile: {
          id: githubUser.id,
          username: githubUser.login,
          name: githubUser.name,
          bio: githubUser.bio,
          avatarUrl: githubUser.avatar_url,
          profileUrl: githubUser.html_url,
          publicRepos: githubUser.public_repos,
          followers: githubUser.followers,
          following: githubUser.following,
          company: githubUser.company,
          location: githubUser.location,
          blog: githubUser.blog,
          twitterUsername: githubUser.twitter_username
        },
        repositories: formattedRepos,
        lastSyncAt: new Date(),
        profileLastSyncAt: new Date(),
        reposLastSyncAt: new Date(),
        lastActiveAt: new Date()
      },
      { new: true }
    ).select('-accessToken');

    res.json({
      message: 'GitHub data synced successfully',
      profile: updatedIntegration?.profile,
      repositories: updatedIntegration?.repositories,
      lastSyncAt: updatedIntegration?.lastSyncAt
    });
  } catch (error) {
    console.error('Error syncing GitHub data:', error);
    res.status(500).json({ error: 'Failed to sync GitHub data' });
  }
});

// Disconnect GitHub
router.delete('/:userId/github/disconnect', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;

    if (!req.user || req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await GitHubIntegration.findOneAndDelete({ user: userId });

    await User.findByIdAndUpdate(userId, {
      $unset: { 'integrations.github': 1 }
    });

    res.json({ message: 'GitHub disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting GitHub:', error);
    res.status(500).json({ error: 'Failed to disconnect GitHub' });
  }
});

// Create post with GitHub code snippet
router.post('/:id/create-code-post', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const userId = req.user.id;
    if (req.params.id !== userId) return res.status(403).json({ error: 'Access denied' });

    const { code, language, filename, githubUrl, caption } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' });
    }

    const newPost = {
      url: '',
      mediaType: 'code' as any,
      caption: caption || '',
      uploadDate: new Date(),
      likes: [],
      comments: [],
      code,
      language,
      filename: filename || 'code-snippet',
      githubUrl: githubUrl || ''
    };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $push: { posts: newPost } },
      { new: true }
    );

    res.status(200).json({
      message: 'Code post created successfully',
      post: updatedUser?.posts[updatedUser.posts.length - 1],
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});




module.exports = router;