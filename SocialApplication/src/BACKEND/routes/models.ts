import mongoose, { Document, Schema } from 'mongoose';


// Sub-schema for uploaded media
const MediaSchema = new Schema({
  url: { type: String, required: true }, // Cloudinary/S3 URL
  mediaType: { type: String, enum: ['image', 'video'], required: true },
  caption: { type: String },
  uploadDate: { type: Date, default: Date.now },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
});

// Sub-schema for messages
const MessageSchema = new Schema({
  content: { type: String, required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  attachments: [MediaSchema] // For media in messages
});

// Sub-schema for friend connections
const ConnectionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected', 'blocked'],
    default: 'pending'
  },
  date: { type: Date, default: Date.now }
});

// Main User Schema
const UserSchema = new Schema({
  // Authentication
  username: { 
    type: String, 
    required: true, 
    unique: true,
    minlength: 3,
    maxlength: 30
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    match: /^\S+@\S+\.\S+$/ // Simple email regex
  },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['user', 'admin', 'moderator'], 
    default: 'user' 
  },

  // Profile Info
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  bio: { type: String, maxlength: 500 },
  profilePhoto: {
    url: { type: String },
    publicId: { type: String } // For cloud storage management
  },
  coverPhoto: {
    url: { type: String },
    publicId: { type: String }
  },

  // Social Features
  connections: [ConnectionSchema], // Two-way friendships/followers
  sentRequests: [ConnectionSchema], // Outgoing friend requests
  receivedRequests: [ConnectionSchema], // Incoming friend requests
  blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],

  // Content
  posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
  mediaUploads: [MediaSchema],
  savedPosts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],

  // Messaging
  conversations: [{
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    messages: [MessageSchema],
    lastUpdated: { type: Date, default: Date.now }
  }],

  // Security
  otp: { type: String },
  otpExpires: { type: Date },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  isVerified: { type: Boolean, default: false },

  // Metadata
  lastActive: { type: Date },
  joinDate: { type: Date, default: Date.now },
  privacySettings: {
    profileVisibility: { 
      type: String, 
      enum: ['public', 'friends', 'private'], 
      default: 'public' 
    },
    messagePermissions: {
      type: String,
      enum: ['everyone', 'friends', 'none'],
      default: 'friends'
    }
  }
}, { timestamps: true });



const User = mongoose.model('User', UserSchema);

module.exports = {User};