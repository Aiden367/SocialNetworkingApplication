// admin-routes.ts - Fixed TypeScript errors with Security Models
import { Router, Request, Response, NextFunction } from 'express';
const { 
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
} = require('./models');
import jwt from 'jsonwebtoken';

// Existing interfaces
interface IUser {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin' | 'moderator';
  isVerified?: boolean;
  isActive?: boolean;
  isBanned?: boolean;
  isSuspended?: boolean;
  lastActive?: Date;
  joinDate: Date;
  posts?: any[];
  connections?: any[];
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    iat?: number;
    exp?: number;
  };
  startTime?: number;
}

interface RecentActivity {
  username: string;
  action: string;
  timestamp: Date;
}

// New Security Interfaces
interface SecurityStats {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  bannedUsers: number;
  suspendedUsers: number;
  failedLogins: number;
  blockedIps: number;
  flaggedContent: number;
  moderationQueue: number;
  suspiciousActivity: number;
}

interface SystemHealth {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: string;
  responseTime: number;
  errorRate: number;
  activeConnections: number;
  databaseHealth: 'healthy' | 'warning' | 'critical';
  lastBackup: string;
  apiHealth: 'healthy' | 'degraded' | 'down';
}

interface ISecurityAlert {
  _id: string;
  type: 'failed_login' | 'suspicious_activity' | 'content_violation' | 'api_abuse' | 'system_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  userId?: string;
  ipAddress?: string;
  timestamp: string;
  status: 'unresolved' | 'investigating' | 'resolved';
}

interface IContentReport {
  _id: string;
  reportType: 'spam' | 'harassment' | 'inappropriate' | 'violence' | 'copyright' | 'other';
  contentType: 'post' | 'comment' | 'message' | 'profile';
  contentId: string;
  reporterId: string;
  reporterUsername: string;
  targetUserId: string;
  targetUsername: string;
  reason: string;
  description?: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
}

interface IBannedUser {
  _id: string;
  userId: string;
  username: string;
  email: string;
  banType: 'temporary' | 'permanent';
  reason: string;
  bannedBy: string;
  banDate: string;
  expiresAt?: string;
}

const router = Router();

// Helper function for uptime formatting
const formatUptime = (uptimeSeconds: number): string => {
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
};

const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

// Middleware to track request start time
const trackRequestTime = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  req.startTime = Date.now();
  next();
};

// User Activity Analytics
router.get('/dashboard/user-activity', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { timeframe = '7d' } = req.query as { timeframe?: string };
    
    let dateFilter: Date;
    switch (timeframe) {
      case '24h':
        dateFilter = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    const [dailyActivity, topActiveUsers, postsByType] = await Promise.all([
      User.aggregate([
        {
          $match: {
            lastActive: { $gte: dateFilter }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$lastActive"
              }
            },
            activeUsers: { $sum: 1 }
          }
        },
        { $sort: { "_id": 1 } }
      ]),

      User.find({
        lastActive: { $gte: dateFilter }
      })
      .select('username firstName lastName lastActive posts')
      .sort({ lastActive: -1 })
      .limit(10)
      .lean(),

      User.aggregate([
        { $unwind: "$posts" },
        {
          $match: {
            "posts.uploadDate": { $gte: dateFilter }
          }
        },
        {
          $group: {
            _id: "$posts.mediaType",
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const typedActiveUsers = topActiveUsers as IUser[];

    res.json({
      dailyActivity,
      topActiveUsers: typedActiveUsers.map((user: IUser) => ({
        ...user,
        postCount: user.posts?.length || 0
      })),
      postsByType
    });
  } catch (error) {
    console.error('User activity error:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

// User Management
router.get('/dashboard/users', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      search = '', 
      status = 'all' 
    } = req.query as { 
      page?: string; 
      limit?: string; 
      search?: string; 
      status?: string; 
    };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let userQuery: any = {};
    
    if (search) {
      userQuery.$or = [
        { username: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (status === 'active') {
      userQuery.lastActive = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    } else if (status === 'inactive') {
      userQuery.$or = [
        { lastActive: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        { lastActive: { $exists: false } }
      ];
    }

    const [users, totalUsers] = await Promise.all([
      User.find(userQuery)
        .select('-password -resetPasswordToken -otp')
        .sort({ joinDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(userQuery)
    ]);

    const typedUsers = users as IUser[];

    const enhancedUsers = await Promise.all(
      typedUsers.map(async (user: IUser) => {
        const [messagesSent, connectionsCount] = await Promise.all([
          Conversation.countDocuments({
            'messages.sender': user._id
          }),
          User.findById(user._id).select('connections').lean()
        ]);

        return {
          ...user,
          postCount: user.posts?.length || 0,
          messagesSent: messagesSent || 0,
          connectionsCount: (connectionsCount as any)?.connections?.length || 0,
          isActive: user.lastActive && 
            new Date(user.lastActive) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        };
      })
    );

    res.json({
      users: enhancedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('User management error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Dashboard Overview Stats
router.get('/dashboard/stats', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalPosts,
      totalConversations,
      totalGroups,
      totalAdvicePosts,
      githubIntegrations,
      recentUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({
        lastActive: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      User.aggregate([
        { $project: { postCount: { $size: "$posts" } } },
        { $group: { _id: null, total: { $sum: "$postCount" } } }
      ]),
      Conversation.countDocuments(),
      Group.countDocuments(),
      AdvicePost.countDocuments(),
      GitHubIntegration.countDocuments({ isActive: true }),
      User.countDocuments({
        joinDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    res.json({
      totalUsers,
      activeUsers,
      totalPosts: totalPosts[0]?.total || 0,
      totalConversations,
      totalGroups,
      totalAdvicePosts,
      githubIntegrations,
      recentUsers,
      inactiveUsers: totalUsers - activeUsers,
      userGrowthRate: ((recentUsers / totalUsers) * 100).toFixed(2)
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// User Actions (Admin only)
router.patch('/dashboard/users/:userId/status', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { action } = req.body as { action: string };

    let updateQuery: any = {};
    
    switch (action) {
      case 'verify':
        updateQuery.isVerified = true;
        break;
      case 'unverify':
        updateQuery.isVerified = false;
        break;
      case 'deactivate':
        updateQuery.isActive = false;
        break;
      case 'activate':
        updateQuery.isActive = true;
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateQuery },
      { new: true }
    ).select('-password');

    res.json({
      message: `User ${action}d successfully`,
      user: updatedUser
    });
  } catch (error) {
    console.error('User action error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Recent activity feed endpoint
router.get('/dashboard/recent-activity', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [recentPosts, recentUsers] = await Promise.all([
      User.aggregate([
        { $unwind: "$posts" },
        { $sort: { "posts.uploadDate": -1 } },
        { $limit: 10 },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "userInfo" } },
        { $project: { 
          username: { $arrayElemAt: ["$userInfo.username", 0] },
          action: "created a post",
          timestamp: "$posts.uploadDate"
        }}
      ]),
      User.find({}).sort({ joinDate: -1 }).limit(5).select('username joinDate')
    ]);

    const activities: RecentActivity[] = [
      ...recentPosts.map((p: any) => ({ 
        username: p.username, 
        action: "created a post", 
        timestamp: p.timestamp 
      })),
      ...recentUsers.map((u: any) => ({ 
        username: u.username, 
        action: "joined the platform", 
        timestamp: u.joinDate 
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, 20);

    res.json(activities);
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

// Export user data endpoint
router.get('/dashboard/export/users', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await User.find({})
      .select('-password -resetPasswordToken -otp')
      .populate('connections.user', 'username')
      .lean();

    res.json(users);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export user data' });
  }
});

// Get detailed user analytics
router.get('/dashboard/users/:userId/details', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    
    const [user, messageStats, postStats, connectionStats] = await Promise.all([
      User.findById(userId).select('-password -resetPasswordToken -otp').lean(),
      Conversation.aggregate([
        { $match: { 'messages.sender': userId } },
        { $unwind: '$messages' },
        { $match: { 'messages.sender': userId } },
        { $group: { _id: null, total: { $sum: 1 } } }
      ]),
      User.aggregate([
        { $match: { _id: userId } },
        { $project: { postCount: { $size: '$posts' } } }
      ]),
      User.findById(userId).select('connections').lean()
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const detailedUser = {
      ...user,
      messagesSent: messageStats[0]?.total || 0,
      postCount: postStats[0]?.postCount || 0,
      connectionsCount: (connectionStats as any)?.connections?.length || 0
    };

    res.json(detailedUser);
  } catch (error) {
    console.error('User details error:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// SECURITY & SAFETY ROUTES

// Security Stats
router.get('/dashboard/security/stats', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats: SecurityStats = {
      totalReports: await ContentReport.countDocuments(),
      pendingReports: await ContentReport.countDocuments({ status: 'pending' }),
      resolvedReports: await ContentReport.countDocuments({ status: 'resolved' }),
      bannedUsers: await User.countDocuments({ isBanned: true }),
      suspendedUsers: await User.countDocuments({ isSuspended: true }),
      failedLogins: await FailedLogin.countDocuments({ 
        attemptedAt: { $gte: new Date(Date.now() - 24*60*60*1000) } 
      }),
      blockedIps: await BlockedIP.countDocuments({ isActive: true }),
      flaggedContent: 0, // Implement when you have flagged content
      moderationQueue: await ContentReport.countDocuments({ status: 'pending' }),
      suspiciousActivity: await SecurityAlert.countDocuments({ 
        severity: { $in: ['high', 'critical'] }, 
        status: 'unresolved' 
      })
    };
    res.json(stats);
  } catch (error) {
    console.error('Security stats error:', error);
    res.status(500).json({ error: 'Failed to fetch security stats' });
  }
});

// System Health
router.get('/dashboard/system/health', trackRequestTime, authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const os = require('os');
    
    // Calculate CPU usage (simplified)
    const cpuUsage = Math.round((os.loadavg()[0] / os.cpus().length) * 100);
    
    // Calculate memory usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = Math.round(((totalMem - freeMem) / totalMem) * 100);
    
    const health: SystemHealth = {
      cpuUsage: Math.min(cpuUsage, 100),
      memoryUsage,
      diskUsage: 75, // Mock - implement actual disk usage check
      uptime: formatUptime(os.uptime()),
      responseTime: req.startTime ? Date.now() - req.startTime : 0,
      errorRate: 2.1, // Mock - calculate from error logs
      activeConnections: 150, // Mock - get from connection pool
      databaseHealth: memoryUsage > 90 ? 'critical' : memoryUsage > 75 ? 'warning' : 'healthy',
      lastBackup: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      apiHealth: 'healthy' // Mock - check API endpoints
    };
    res.json(health);
  } catch (error) {
    console.error('System health error:', error);
    res.status(500).json({ error: 'Failed to fetch system health' });
  }
});

// Security Alerts
router.get('/dashboard/security/alerts', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      severity = 'all', 
      status = 'all' 
    } = req.query as { 
      page?: string; 
      limit?: string; 
      severity?: string; 
      status?: string; 
    };
    
    const filter: any = {};
    if (severity !== 'all') filter.severity = severity;
    if (status !== 'all') filter.status = status;
    
    const alerts = await SecurityAlert.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();
      
    const total = await SecurityAlert.countDocuments(filter);
    
    res.json({
      alerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Security alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch security alerts' });
  }
});

// Content Reports
router.get('/dashboard/moderation/reports', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      status = 'all', 
      type = 'all' 
    } = req.query as { 
      page?: string; 
      limit?: string; 
      status?: string; 
      type?: string; 
    };
    
    const filter: any = {};
    if (status !== 'all') filter.status = status;
    if (type !== 'all') filter.reportType = type;
    
    const reports = await ContentReport.find(filter)
      .populate('reporterId', 'username')
      .populate('targetUserId', 'username')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();
      
    const total = await ContentReport.countDocuments(filter);
    
    // Add usernames to reports
    const reportsWithUsernames = reports.map((report: any) => ({
      ...report,
      reporterUsername: report.reporterId?.username || 'Unknown',
      targetUsername: report.targetUserId?.username || 'Unknown'
    }));
    
    res.json({
      reports: reportsWithUsernames,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Content reports error:', error);
    res.status(500).json({ error: 'Failed to fetch content reports' });
  }
});

// Banned Users
router.get('/dashboard/security/banned', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      type = 'all' 
    } = req.query as { 
      page?: string; 
      limit?: string; 
      type?: string; 
    };
    
    const filter: any = { isActive: true };
    if (type !== 'all') filter.banType = type;
    
    const bans = await UserBan.find(filter)
      .populate('userId', 'username email')
      .populate('bannedBy', 'username')
      .sort({ banDate: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();
      
    const total = await UserBan.countDocuments(filter);
    
    // Format the response
    const formattedBans = bans.map((ban: any) => ({
      _id: ban._id,
      username: ban.userId?.username || 'Unknown',
      email: ban.userId?.email || 'Unknown',
      banType: ban.banType,
      reason: ban.reason,
      bannedBy: ban.bannedBy?.username || 'System',
      banDate: ban.banDate,
      expiresAt: ban.expiresAt,
      appealStatus: ban.appealStatus
    }));
    
    res.json({
      users: formattedBans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Banned users error:', error);
    res.status(500).json({ error: 'Failed to fetch banned users' });
  }
});

// Resolve Security Alert
router.patch('/dashboard/security/alerts/:alertId/resolve', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { alertId } = req.params;
    const { action, notes } = req.body as { action: string; notes?: string };
    
    const alert = await SecurityAlert.findByIdAndUpdate(
      alertId,
      { 
        status: action === 'investigate' ? 'investigating' : 'resolved',
        resolvedBy: req.user?.id,
        resolvedAt: new Date(),
        notes
      },
      { new: true }
    );
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json({ message: `Alert ${action}d successfully` });
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// Moderate Content
router.patch('/dashboard/moderation/reports/:reportId/moderate', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reportId } = req.params;
    const { action, notes } = req.body as { action: string; notes?: string };
    
    const report = await ContentReport.findByIdAndUpdate(
      reportId,
      { 
        status: action === 'approve' ? 'dismissed' : 'resolved',
        moderatedBy: req.user?.id,
        moderatedAt: new Date(),
        resolution: notes,
        actionTaken: action === 'remove' ? 'content_removed' : 'no_action'
      },
      { new: true }
    );
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json({ message: `Content ${action}d successfully` });
  } catch (error) {
    console.error('Moderate content error:', error);
    res.status(500).json({ error: 'Failed to moderate content' });
  }
});

// Unban User
router.patch('/dashboard/security/banned/:userId/unban', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body as { reason?: string };
    
    // Update the ban record
    const ban = await UserBan.findOneAndUpdate(
      { userId: userId, isActive: true },
      { 
        isActive: false,
        unbannedBy: req.user?.id,
        unbannedAt: new Date(),
        unbanReason: reason
      },
      { new: true }
    );
    
    if (!ban) {
      return res.status(404).json({ error: 'Active ban not found for this user' });
    }
    
    // Update the user record
    await User.findByIdAndUpdate(userId, { 
      isBanned: false,
      isActive: true
    });
    
    res.json({ message: 'User unbanned successfully' });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

module.exports = router;