import mongoose, { Schema } from 'mongoose';

// -------------------- Media --------------------
const MediaSchema = new Schema({
  url: { type: String, required: true },
  mediaType: { type: String, enum: ['image', 'video', 'code'], required: true },
  caption: { type: String },
  uploadDate: { type: Date, default: Date.now },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Fields for code posts
  code: { type: String },
  language: { type: String },
  filename: { type: String },
  githubUrl: { type: String }
});

// -------------------- GitHub Integration --------------------
const GitHubIntegrationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  
  // OAuth data
  accessToken: { type: String, required: true, select: false },
  tokenType: { type: String, default: 'bearer' },
  scope: { type: String },
  
  // GitHub profile data (cached for performance)
  profile: {
    id: { type: Number, required: true },
    username: { type: String, required: true },
    name: { type: String },
    bio: { type: String },
    avatarUrl: { type: String },
    profileUrl: { type: String },
    publicRepos: { type: Number },
    followers: { type: Number },
    following: { type: Number },
    company: { type: String },
    location: { type: String },
    blog: { type: String },
    twitterUsername: { type: String }
  },
  
  // Cached repositories
  repositories: [{
    id: { type: Number, required: true },
    name: { type: String, required: true },
    fullName: { type: String, required: true },
    description: { type: String },
    language: { type: String },
    stars: { type: Number, default: 0 },
    forks: { type: Number, default: 0 },
    url: { type: String, required: true },
    isPrivate: { type: Boolean, default: false },
    updatedAt: { type: Date },
    pushedAt: { type: Date }
  }],
  
  // Sync metadata
  lastSyncAt: { type: Date, default: Date.now },
  profileLastSyncAt: { type: Date, default: Date.now },
  reposLastSyncAt: { type: Date, default: Date.now },
  syncErrors: [{ 
    error: String, 
    occurredAt: { type: Date, default: Date.now } 
  }],
  
  // Settings
  settings: {
    syncFrequency: { type: String, enum: ['manual', 'hourly', 'daily', 'weekly'], default: 'daily' },
    autoSyncRepos: { type: Boolean, default: true },
    showPrivateRepos: { type: Boolean, default: false },
    maxReposToCache: { type: Number, default: 20 }
  },
  
  // Integration status
  isActive: { type: Boolean, default: true },
  connectedAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now }
}, { 
  timestamps: true
});

GitHubIntegrationSchema.index({ user: 1 });
GitHubIntegrationSchema.index({ 'profile.username': 1 });
GitHubIntegrationSchema.index({ lastSyncAt: 1 });
GitHubIntegrationSchema.index({ isActive: 1 });

// -------------------- Message --------------------
const MessageSchema = new Schema({
  content: { type: String, required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  attachments: [MediaSchema]
});

// -------------------- Conversation --------------------
const ConversationSchema = new Schema({
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  messages: [MessageSchema],
  lastUpdated: { type: Date, default: Date.now },
  chatKey: { type: String, required: true, unique: true }
});

// -------------------- Connection --------------------
const ConnectionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'blocked'], default: 'pending' },
  date: { type: Date, default: Date.now }
});

// -------------------- Stories --------------------
const StorySchema = new Schema({
  media: { type: MediaSchema, required: true },
  postedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  viewers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  privacy: { type: String, enum: ['public', 'friends', 'private'], default: 'friends' }
});

// -------------------- Advice Post --------------------
const AdvicePostSchema = new Schema({
  title: { type: String, required: true, maxlength: 200 },
  content: { type: String, required: true, maxlength: 2000 },
  category: { 
    type: String, 
    enum: ['career', 'learning', 'projects', 'interview', 'technology', 'freelance', 'startup', 'other'], 
    required: true 
  },
  tags: [{ type: String, maxlength: 30 }],
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  anonymous: { type: Boolean, default: false },
  urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['open', 'resolved', 'closed'], default: 'open' },
  
  responses: [{
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 1500 },
    createdAt: { type: Date, default: Date.now },
    helpful: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    verified: { type: Boolean, default: false },
    upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    
    replies: [{
      author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      content: { type: String, required: true, maxlength: 1000 },
      createdAt: { type: Date, default: Date.now },
      upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      downvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }]
    }]
  }],
  
  views: { type: Number, default: 0 },
  followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

AdvicePostSchema.index({ category: 1, status: 1, createdAt: -1 });
AdvicePostSchema.index({ author: 1, createdAt: -1 });
AdvicePostSchema.index({ urgency: -1, createdAt: -1 });

// -------------------- User --------------------
const UserSchema = new Schema({
  username: { type: String, required: true, unique: true, minlength: 3, maxlength: 30 },
  email: { type: String, required: true, unique: true, match: /^\S+@\S+\.\S+$/ },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin', 'moderator'], default: 'user' },

  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  bio: { type: String, maxlength: 500 },
  jobTitle: { type: String, maxlength: 100 },
  profilePhoto: { url: String, publicId: String },
  coverPhoto: { url: String, publicId: String },

  // Integration references
  integrations: {
    github: { type: Schema.Types.ObjectId, ref: 'GitHubIntegration' }
  },

  connections: [ConnectionSchema],
  sentRequests: [ConnectionSchema],
  receivedRequests: [ConnectionSchema],
  blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],

  posts: [MediaSchema],
  mediaUploads: [MediaSchema],
  stories: [StorySchema],
  savedPosts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],

  otp: String,
  otpExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  isVerified: { type: Boolean, default: false },

  lastActive: Date,
  joinDate: { type: Date, default: Date.now },
  privacySettings: {
    profileVisibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
    messagePermissions: { type: String, enum: ['everyone', 'friends', 'none'], default: 'friends' }
  }
}, { timestamps: true });

// -------------------- Group --------------------
const GroupJoinRequestSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  requestedAt: { type: Date, default: Date.now }
});

const GroupMemberSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['owner', 'admin', 'moderator', 'member'], default: 'member' },
  joinedAt: { type: Date, default: Date.now }
});

const GroupSchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, maxlength: 500 },
  profileImage: { url: String, publicId: String },
  coverImage: { url: String, publicId: String },
  members: [GroupMemberSchema],
  invitedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  joinRequests: [GroupJoinRequestSchema],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

// -------------------- Group Posts --------------------
const GroupPostSchema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  media: [MediaSchema],
  createdAt: { type: Date, default: Date.now },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
});

// -------------------- Models --------------------
const User = mongoose.model('User', UserSchema);
const Conversation = mongoose.model('Conversation', ConversationSchema);
const Group = mongoose.model('Group', GroupSchema);
const GroupPost = mongoose.model('GroupPost', GroupPostSchema);
const AdvicePost = mongoose.model('AdvicePost', AdvicePostSchema);
const GitHubIntegration = mongoose.model('GitHubIntegration', GitHubIntegrationSchema);

module.exports = { 
  User, 
  Conversation, 
  Group, 
  GroupPost, 
  AdvicePost,
  GitHubIntegration
};