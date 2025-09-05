
import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import multer from "multer";
import bucket from "../gcs"; // Your GCS setup
const { Group, User, GroupPost } = require('./models');
const jwt = require("jsonwebtoken");
const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// JWT Auth middleware (reuse from user.ts)
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

  import("jsonwebtoken").then(jwt => {
    jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: "Invalid or expired token" });
      req.user = user as JwtPayload;
      next();
    });
  });
};

// =====================
// CREATE GROUP
// =====================
router.post("/create/:userId", authenticateToken, upload.single("groupImage"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.id !== req.params.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { name, description } = req.body;
    if (!name || !description) return res.status(400).json({ error: "Name and description required" });

    let profileImage = null;

    if (req.file) {
      const filename = `group_${req.user.id}_${Date.now()}_${req.file.originalname}`;
      const file = bucket.file(filename);

      const blobStream = file.createWriteStream({ resumable: false, contentType: req.file.mimetype });

      blobStream.on("error", (err: Error) => {
        console.error("Upload error:", err);
        res.status(500).json({ error: "Image upload failed" });
      });

      blobStream.on("finish", async () => {
        const [signedUrl] = await file.getSignedUrl({ action: "read", expires: Date.now() + 24 * 60 * 60 * 1000 });
        profileImage = { url: signedUrl, publicId: filename };

        const newGroup = new Group({
          name,
          description,
          profileImage,
          createdBy: req.user!.id,
          members: [{ user: req.user!.id, role: "owner" }],
        });

        await newGroup.save();
        res.status(201).json(newGroup);
      });

      blobStream.end(req.file.buffer);
    } else {
      const newGroup = new Group({
        name,
        description,
        createdBy: req.user!.id,
        members: [{ user: req.user!.id, role: "owner" }],
      });

      await newGroup.save();
      res.status(201).json(newGroup);
    }
  } catch (err) {
    console.error("Error creating group:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET GROUP BY ID
router.get("/:groupId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate("members.user", "username profilePhoto")
      .populate("joinRequests.user", "username profilePhoto"); // <-- add this
    if (!group) return res.status(404).json({ error: "Group not found" });
    res.status(200).json(group);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});



// =====================
// JOIN GROUP
// =====================
router.post("/:groupId/join", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    if (group.members.some((m: any) => m.user.toString() === req.user!.id)) {
      return res.status(400).json({ error: "Already a member" });
    }

    group.members.push({ user: req.user!.id, role: "member" });
    await group.save();

    res.status(200).json({ message: "Joined group", group });
  } catch (err) {
    console.error("Error joining group:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =====================
// LEAVE GROUP
// =====================
router.post("/:groupId/leave", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    group.members = group.members.filter((m: any) => m.user.toString() !== req.user!.id);
    await group.save();

    res.status(200).json({ message: "Left group successfully", group });
  } catch (err) {
    console.error("Error leaving group:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =====================
// CREATE GROUP POST
// =====================
router.post("/:groupId/post", authenticateToken, upload.single("media"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    if (!group.members.some((m: any) => m.user.toString() === req.user!.id)) {
      return res.status(403).json({ error: "Must be a member to post" });
    }

    let media = null;
    if (req.file) {
      const filename = `grouppost_${req.user!.id}_${Date.now()}_${req.file.originalname}`;
      const file = bucket.file(filename);

      await new Promise<void>((resolve, reject) => {
        const blobStream = file.createWriteStream({ resumable: false, contentType: req.file!.mimetype });
        blobStream.on("error", reject);
        blobStream.on("finish", resolve);
        blobStream.end(req.file!.buffer);
      });

      const [signedUrl] = await bucket.file(filename).getSignedUrl({ action: "read", expires: Date.now() + 24 * 60 * 60 * 1000 });
      media = [{ url: signedUrl, mediaType: req.file.mimetype.startsWith("video") ? "video" : "image" }];
    }

    const post = new GroupPost({
      group: group._id,
      author: req.user!.id,
      content: req.body.content,
      media,
    });

    await post.save();
    res.status(201).json(post);
  } catch (err) {
    console.error("Error creating group post:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =====================
// GET GROUP POSTS
// =====================
router.get("/:groupId/posts", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const posts = await GroupPost.find({ group: req.params.groupId })
      .populate("author", "username profilePhoto")
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (err) {
    console.error("Error fetching group posts:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// REQUEST TO JOIN GROUP
router.post("/:groupId/request", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Already a member
    if (group.members.some((m: any) => m.user.toString() === req.user!.id)) {
      return res.status(400).json({ error: "Already a member" });
    }

    // Already requested
    if (group.joinRequests.some((r: any) => r.user.toString() === req.user!.id)) {
      return res.status(400).json({ error: "Request already sent" });
    }

    group.joinRequests.push({ user: req.user!.id });
    await group.save();

    res.status(200).json({ message: "Join request sent", group });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


// ACCEPT JOIN REQUEST
router.post("/:groupId/accept/:userId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Only owner can accept
    const isOwner = group.members.some((m: any) => m.user.toString() === req.user!.id && m.role === "owner");
    if (!isOwner) return res.status(403).json({ error: "Only owner can accept requests" });

    // Find the request
    const requestIndex = group.joinRequests.findIndex((r: any) => r.user.toString() === req.params.userId);
    if (requestIndex === -1) return res.status(404).json({ error: "Request not found" });

    // Add to members
    group.members.push({ user: req.params.userId, role: "member" });

    // Remove from joinRequests
    group.joinRequests.splice(requestIndex, 1);

    await group.save();
    res.status(200).json({ message: "User added to group", group });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// =====================
// ADD COMMENT TO GROUP POST
// =====================
router.post("/:groupId/post/:postId/comment", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { postId, groupId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Comment cannot be empty" });
    }

    // Fetch the post
    const post = await GroupPost.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    // Ensure the user is a member of the group
    const group = await Group.findById(groupId);
    if (!group?.members.some((m: any) => m.user.toString() === req.user!.id)) {
      return res.status(403).json({ error: "Must be a member to comment" });
    }

    // Add the new comment
    const comment = {
      user: req.user!.id,
      text,
      createdAt: new Date(),
    };
    post.comments.push(comment);
    await post.save();

    // Fetch the newly added comment with populated user info
    const populatedPost = await GroupPost.findById(postId)
      .populate("comments.user", "username profilePhoto");

    const newComment = populatedPost!.comments[populatedPost.comments.length - 1];

    // Return populated comment
    res.status(201).json(newComment);
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ error: "Server error" });
  }
});




// Like or Unlike a post
router.post("/:groupId/post/:postId/like", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const post = await GroupPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const userId = req.user!.id;
    const index = post.likes.indexOf(userId);

    if (index === -1) {
      post.likes.push(userId); // Like
    } else {
      post.likes.splice(index, 1); // Unlike
    }

    await post.save();
    res.status(200).json({ likes: post.likes.length, likedByUser: index === -1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;