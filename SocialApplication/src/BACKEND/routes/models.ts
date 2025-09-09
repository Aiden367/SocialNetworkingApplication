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

// -------------------- Security Alert --------------------
const SecurityAlertSchema = new Schema({
  type: { 
    type: String, 
    enum: ['failed_login', 'suspicious_activity', 'content_violation', 'api_abuse', 'system_breach'], 
    required: true 
  },
  severity: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    required: true 
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  ipAddress: { type: String },
  userAgent: { type: String },
  metadata: { type: Schema.Types.Mixed }, // Additional context data
  timestamp: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['unresolved', 'investigating', 'resolved'], 
    default: 'unresolved' 
  },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  notes: { type: String },
  actions: [{ type: String }] // Actions taken in response
}, { timestamps: true });

SecurityAlertSchema.index({ type: 1, severity: 1, status: 1 });
SecurityAlertSchema.index({ timestamp: -1 });
SecurityAlertSchema.index({ userId: 1 });

// -------------------- Content Report --------------------
const ContentReportSchema = new Schema({
  reportType: { 
    type: String, 
    enum: ['spam', 'harassment', 'inappropriate', 'violence', 'copyright', 'misinformation', 'other'], 
    required: true 
  },
  contentType: { 
    type: String, 
    enum: ['post', 'comment', 'message', 'profile', 'story', 'group_post'], 
    required: true 
  },
  contentId: { type: Schema.Types.ObjectId, required: true },
  reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  description: { type: String },
  evidence: [{ // Screenshots, URLs, etc.
    type: { type: String, enum: ['image', 'url', 'text'] },
    content: { type: String, required: true }
  }],
  status: { 
    type: String, 
    enum: ['pending', 'under_review', 'resolved', 'dismissed'], 
    default: 'pending' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'medium' 
  },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  moderatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  moderatedAt: { type: Date },
  resolution: { type: String },
  actionTaken: { 
    type: String, 
    enum: ['no_action', 'content_removed', 'user_warned', 'user_suspended', 'user_banned'] 
  }
}, { timestamps: true });

ContentReportSchema.index({ reportType: 1, status: 1 });
ContentReportSchema.index({ targetUserId: 1 });
ContentReportSchema.index({ reporterId: 1 });
ContentReportSchema.index({ createdAt: -1 });

// -------------------- Failed Login Attempt --------------------
const FailedLoginSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  email: { type: String },
  username: { type: String },
  ipAddress: { type: String, required: true },
  userAgent: { type: String },
  attemptedAt: { type: Date, default: Date.now },
  reason: { 
    type: String, 
    enum: ['wrong_password', 'user_not_found', 'account_locked', 'account_disabled'],
    required: true 
  },
  isBlocked: { type: Boolean, default: false }
});

FailedLoginSchema.index({ ipAddress: 1, attemptedAt: -1 });
FailedLoginSchema.index({ userId: 1, attemptedAt: -1 });

// -------------------- Blocked IP --------------------
const BlockedIPSchema = new Schema({
  ipAddress: { type: String, required: true, unique: true },
  reason: { type: String, required: true },
  blockedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  blockedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }, // null means permanent
  isActive: { type: Boolean, default: true },
  attempts: { type: Number, default: 0 },
  lastAttempt: { type: Date }
});

BlockedIPSchema.index({ ipAddress: 1 });
BlockedIPSchema.index({ expiresAt: 1 });

// -------------------- User Ban --------------------
const UserBanSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  banType: { 
    type: String, 
    enum: ['temporary', 'permanent'], 
    required: true 
  },
  reason: { type: String, required: true },
  description: { type: String },
  bannedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  banDate: { type: Date, default: Date.now },
  expiresAt: { type: Date }, // null for permanent bans
  isActive: { type: Boolean, default: true },
  
  // Appeal system
  appealStatus: { 
    type: String, 
    enum: ['none', 'pending', 'approved', 'denied'], 
    default: 'none' 
  },
  appealReason: { type: String },
  appealedAt: { type: Date },
  appealReviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  appealReviewedAt: { type: Date },
  appealNotes: { type: String },
  
  // Unban info
  unbannedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  unbannedAt: { type: Date },
  unbanReason: { type: String }
}, { timestamps: true });

UserBanSchema.index({ userId: 1, isActive: 1 });
UserBanSchema.index({ banType: 1, isActive: 1 });

// -------------------- System Log --------------------
const SystemLogSchema = new Schema({
  level: { 
    type: String, 
    enum: ['info', 'warn', 'error', 'critical'], 
    required: true 
  },
  category: { 
    type: String, 
    enum: ['auth', 'database', 'api', 'security', 'performance', 'user_action'], 
    required: true 
  },
  message: { type: String, required: true },
  details: { type: Schema.Types.Mixed },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  ipAddress: { type: String },
  userAgent: { type: String },
  endpoint: { type: String },
  responseTime: { type: Number },
  statusCode: { type: Number },
  timestamp: { type: Date, default: Date.now }
});

SystemLogSchema.index({ level: 1, category: 1, timestamp: -1 });
SystemLogSchema.index({ userId: 1, timestamp: -1 });
SystemLogSchema.index({ timestamp: -1 });

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

// -------------------- User Schema (Enhanced) --------------------
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

  // Authentication & Security
  otp: String,
  otpExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  lastLoginAttempt: { type: Date },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },

  // Security & Moderation Fields
  isBanned: { type: Boolean, default: false },
  isSuspended: { type: Boolean, default: false },
  suspendedUntil: { type: Date },
  suspensionReason: { type: String },
  
  // Moderation history
  warnings: [{
    reason: { type: String, required: true },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    issuedAt: { type: Date, default: Date.now },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
  }],
  
  // Security tracking
  loginAttempts: { type: Number, default: 0 },
  suspiciousActivityCount: { type: Number, default: 0 },
  
  // Trust score (for automated moderation)
  trustScore: { type: Number, default: 100, min: 0, max: 100 },

  // Activity tracking
  lastActive: Date,
  joinDate: { type: Date, default: Date.now },
  
  // Privacy settings
  privacySettings: {
    profileVisibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
    messagePermissions: { type: String, enum: ['everyone', 'friends', 'none'], default: 'friends' }
  }
}, { timestamps: true });

// User Schema Indexes
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ lastActive: -1 });
UserSchema.index({ joinDate: -1 });
UserSchema.index({ isBanned: 1, isSuspended: 1 });
UserSchema.index({ trustScore: -1 });

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
const SecurityAlert = mongoose.model('SecurityAlert', SecurityAlertSchema);
const ContentReport = mongoose.model('ContentReport', ContentReportSchema);
const FailedLogin = mongoose.model('FailedLogin', FailedLoginSchema);
const BlockedIP = mongoose.model('BlockedIP', BlockedIPSchema);
const UserBan = mongoose.model('UserBan', UserBanSchema);
const SystemLog = mongoose.model('SystemLog', SystemLogSchema);

module.exports = {
  User,
  Conversation,
  Group,
  GroupPost,
  AdvicePost,
  GitHubIntegration,
  SecurityAlert,
  ContentReport,
  FailedLogin,
  BlockedIP,
  UserBan,
  SystemLog
};