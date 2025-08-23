const bcrypt = require("bcrypt");
const { User } = require('./models');
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');
const crypto = require('crypto');
import { ObjectId } from 'mongoose';
import bucket from '../gcs';
import { Router, Request, Response, NextFunction } from "express";
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

//import { sendOtp } from '../utils/sendOtp';



// Define Message interface (matches MessageSchema)
interface Message {
  content: string;
  sender: ObjectId;
  recipient: ObjectId;
  timestamp: Date;
  read: boolean;
  attachments: any[]; // can refine later
}

// Define Conversation interface (matches conversations sub-schema)
interface Conversation {
  participants: ObjectId[];
  messages: Message[];
  lastUpdated: Date;
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

// ADD THE GET ENDPOINT HERE
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if the requested user ID matches the authenticated user's ID
    if (req.params.id !== req.user?.id) {
      return res.status(403).send({ error: 'Access denied' });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).send({ error: 'User not found' });
    }

    res.status(200).send(user);
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

// GET conversation between two users
router.get('/:userId/conversation/:recipientId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, recipientId } = req.params;

    // Ensure requesting user matches authenticated user
    if (req.user?.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Cast conversations to correct type
    const conversations = user.conversations as Conversation[];

    // Explicitly type 'c' here
    const conversation = conversations.find((c: Conversation) =>
      c.participants.map(p => p.toString()).includes(userId) &&
      c.participants.map(p => p.toString()).includes(recipientId)
    );

    res.status(200).json({ messages: conversation?.messages || [] });
  } catch (err) {
    console.error('Error fetching conversation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



module.exports = router;