// AdminDashboard.tsx - Enhanced with Security & Safety Features
import './Styles/AdminDashboard.css';
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  AlertTriangle,
  MessageSquare, 
  FileText, 
  Activity, 
  Shield, 
  TrendingUp,
  Search,
  UserCheck,
  UserX,
  Eye,
  AlertCircle,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  GitBranch,
  Ban,
  Flag,
  ShieldAlert,
  Lock,
  Unlock,
  Server,
  Database,
  Wifi,
  UserMinus,
  Monitor,
  HardDrive,
  Cpu,
  MemoryStick,
  Globe,
  Mail,
  Key,
  ShieldCheck,
  ShieldX,
  Zap,
  
} from 'lucide-react';

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar,
  AreaChart,
  Area,
  Legend
} from 'recharts';

// Type Definitions
interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalPosts: number;
  totalConversations: number;
  totalGroups: number;
  totalAdvicePosts: number;
  githubIntegrations: number;
  recentUsers: number;
  inactiveUsers: number;
  userGrowthRate: string;
}

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

interface SecurityAlert {
  _id: string;
  type: 'failed_login' | 'suspicious_activity' | 'content_violation' | 'api_abuse' | 'system_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  userId?: string;
  ipAddress?: string;
  timestamp: string;
  status: 'unresolved' | 'investigating' | 'resolved';
  actions?: string[];
}

interface ContentReport {
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
  assignedTo?: string;
  resolution?: string;
}

interface BannedUser {
  _id: string;
  username: string;
  email: string;
  banType: 'temporary' | 'permanent';
  reason: string;
  bannedBy: string;
  banDate: string;
  expiresAt?: string;
  appealStatus?: 'none' | 'pending' | 'approved' | 'denied';
}

interface DailyActivity {
  _id: string;
  activeUsers: number;
}

interface PostByType {
  _id: string;
  count: number;
}

interface TopActiveUser {
  _id: string;
  username: string;
  firstName: string;
  lastName: string;
  postCount: number;
}

interface ActivityData {
  dailyActivity: DailyActivity[];
  topActiveUsers: TopActiveUser[];
  postsByType: PostByType[];
}

interface User {
  _id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  isVerified?: boolean;
  postCount: number;
  connectionsCount: number;
  messagesSent: number;
  lastActive?: string;
  joinDate: string;
  role: string;
}

interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface RecentActivity {
  username: string;
  action: string;
  timestamp: string;
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string | number;
  change?: number;
  color?: string;
  alert?: boolean;
}

interface UserTableRowProps {
  user: User;
}

interface TabItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number | null;
  alert?: boolean;
}

// API Configuration
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

// API Service
const dashboardAPI = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await fetch(`${API_BASE}/admin/dashboard/stats`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  getSecurityStats: async (): Promise<SecurityStats> => {
    const response = await fetch(`${API_BASE}/admin/dashboard/security/stats`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch security stats');
    return response.json();
  },

  getSystemHealth: async (): Promise<SystemHealth> => {
    const response = await fetch(`${API_BASE}/admin/dashboard/system/health`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch system health');
    return response.json();
  },

  getSecurityAlerts: async (params: {
    page?: number;
    limit?: number;
    severity?: string;
    status?: string;
  } = {}): Promise<{ alerts: SecurityAlert[]; pagination: any }> => {
    const queryParams = new URLSearchParams({
      page: String(params.page || 1),
      limit: String(params.limit || 20),
      severity: params.severity || 'all',
      status: params.status || 'all',
    });

    const response = await fetch(`${API_BASE}/admin/dashboard/security/alerts?${queryParams}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch security alerts');
    return response.json();
  },

  getContentReports: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
  } = {}): Promise<{ reports: ContentReport[]; pagination: any }> => {
    const queryParams = new URLSearchParams({
      page: String(params.page || 1),
      limit: String(params.limit || 20),
      status: params.status || 'all',
      type: params.type || 'all',
    });

    const response = await fetch(`${API_BASE}/admin/dashboard/moderation/reports?${queryParams}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch content reports');
    return response.json();
  },

  getBannedUsers: async (params: {
    page?: number;
    limit?: number;
    type?: string;
  } = {}): Promise<{ users: BannedUser[]; pagination: any }> => {
    const queryParams = new URLSearchParams({
      page: String(params.page || 1),
      limit: String(params.limit || 20),
      type: params.type || 'all',
    });

    const response = await fetch(`${API_BASE}/admin/dashboard/security/banned?${queryParams}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch banned users');
    return response.json();
  },

  getUserActivity: async (timeframe = '7d'): Promise<ActivityData> => {
    const response = await fetch(`${API_BASE}/admin/dashboard/user-activity?timeframe=${timeframe}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch activity');
    return response.json();
  },

  getUsers: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  } = {}): Promise<UsersResponse> => {
    const queryParams = new URLSearchParams({
      page: String(params.page || 1),
      limit: String(params.limit || 20),
      search: params.search || '',
      status: params.status || 'all',
    });

    const response = await fetch(`${API_BASE}/admin/dashboard/users?${queryParams}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  updateUserStatus: async (userId: string, action: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE}/admin/dashboard/users/${userId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action }),
    });
    if (!response.ok) throw new Error(`Failed to ${action} user`);
    return response.json();
  },

  resolveSecurityAlert: async (alertId: string, action: string, notes?: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE}/admin/dashboard/security/alerts/${alertId}/resolve`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, notes }),
    });
    if (!response.ok) throw new Error('Failed to resolve alert');
    return response.json();
  },

  moderateContent: async (reportId: string, action: string, notes?: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE}/admin/dashboard/moderation/reports/${reportId}/moderate`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, notes }),
    });
    if (!response.ok) throw new Error('Failed to moderate content');
    return response.json();
  },

  unbanUser: async (userId: string, reason?: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE}/admin/dashboard/security/banned/${userId}/unban`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) throw new Error('Failed to unban user');
    return response.json();
  },

  getRecentActivity: async (): Promise<RecentActivity[]> => {
    const response = await fetch(`${API_BASE}/admin/dashboard/recent-activity`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch recent activity');
    return response.json();
  },

  exportUsers: async (): Promise<User[]> => {
    const response = await fetch(`${API_BASE}/admin/dashboard/export/users`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to export users');
    return response.json();
  }
};

const AdminDashboard: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [timeframe, setTimeframe] = useState<string>('7d');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Data state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [securityAlerts, setSecurityAlerts] = useState<{ alerts: SecurityAlert[]; pagination: any } | null>(null);
  const [contentReports, setContentReports] = useState<{ reports: ContentReport[]; pagination: any } | null>(null);
  const [bannedUsers, setBannedUsers] = useState<{ users: BannedUser[]; pagination: any } | null>(null);
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [users, setUsers] = useState<UsersResponse | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  
  // Loading and error states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, string | null>>({});
  const [exporting, setExporting] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);

  // Security filters
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<string>('all');
  const [alertStatusFilter, setAlertStatusFilter] = useState<string>('all');
  const [reportTypeFilter, setReportTypeFilter] = useState<string>('all');
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('all');

  // Fetch functions
  const fetchStats = async (): Promise<void> => {
    try {
      const data = await dashboardAPI.getStats();
      setStats(data);
    } catch (err) {
      console.error('Stats error:', err);
      setError('Failed to load dashboard stats');
    }
  };

  const fetchSecurityStats = async (): Promise<void> => {
    try {
      const data = await dashboardAPI.getSecurityStats();
      setSecurityStats(data);
    } catch (err) {
      console.error('Security stats error:', err);
      setError('Failed to load security stats');
    }
  };

  const fetchSystemHealth = async (): Promise<void> => {
    try {
      const data = await dashboardAPI.getSystemHealth();
      setSystemHealth(data);
    } catch (err) {
      console.error('System health error:', err);
      setError('Failed to load system health');
    }
  };

  const fetchSecurityAlerts = async (): Promise<void> => {
    try {
      const data = await dashboardAPI.getSecurityAlerts({
        page: currentPage,
        severity: alertSeverityFilter,
        status: alertStatusFilter,
      });
      setSecurityAlerts(data);
    } catch (err) {
      console.error('Security alerts error:', err);
      setError('Failed to load security alerts');
    }
  };

  const fetchContentReports = async (): Promise<void> => {
    try {
      const data = await dashboardAPI.getContentReports({
        page: currentPage,
        status: reportStatusFilter,
        type: reportTypeFilter,
      });
      setContentReports(data);
    } catch (err) {
      console.error('Content reports error:', err);
      setError('Failed to load content reports');
    }
  };

  const fetchBannedUsers = async (): Promise<void> => {
    try {
      const data = await dashboardAPI.getBannedUsers({
        page: currentPage,
      });
      setBannedUsers(data);
    } catch (err) {
      console.error('Banned users error:', err);
      setError('Failed to load banned users');
    }
  };

  const fetchActivity = async (): Promise<void> => {
    try {
      const data = await dashboardAPI.getUserActivity(timeframe);
      setActivityData(data);
    } catch (err) {
      console.error('Activity error:', err);
      setError('Failed to load activity data');
    }
  };

  const fetchUsers = async (): Promise<void> => {
    try {
      const data = await dashboardAPI.getUsers({
        page: currentPage,
        search: searchTerm,
        status: statusFilter,
        limit: 20
      });
      setUsers(data);
    } catch (err) {
      console.error('Users error:', err);
      setError('Failed to load users');
    }
  };

  const fetchRecentActivity = async (): Promise<void> => {
    try {
      const data = await dashboardAPI.getRecentActivity();
      setRecentActivity(data);
    } catch (err) {
      console.error('Recent activity error:', err);
    }
  };

  // Handle actions
  const handleUserAction = async (userId: string, action: string): Promise<void> => {
    setActionLoading(prev => ({ ...prev, [userId]: action }));
    try {
      await dashboardAPI.updateUserStatus(userId, action);
      await fetchUsers();
      setError(null);
    } catch (err) {
      console.error('User action error:', err);
      setError(`Failed to ${action} user`);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  const handleResolveAlert = async (alertId: string, action: string): Promise<void> => {
    setActionLoading(prev => ({ ...prev, [alertId]: action }));
    try {
      await dashboardAPI.resolveSecurityAlert(alertId, action);
      await fetchSecurityAlerts();
      setError(null);
    } catch (err) {
      console.error('Resolve alert error:', err);
      setError(`Failed to ${action} alert`);
    } finally {
      setActionLoading(prev => ({ ...prev, [alertId]: null }));
    }
  };

  const handleModerateContent = async (reportId: string, action: string): Promise<void> => {
    setActionLoading(prev => ({ ...prev, [reportId]: action }));
    try {
      await dashboardAPI.moderateContent(reportId, action);
      await fetchContentReports();
      setError(null);
    } catch (err) {
      console.error('Moderate content error:', err);
      setError(`Failed to ${action} content`);
    } finally {
      setActionLoading(prev => ({ ...prev, [reportId]: null }));
    }
  };

  const handleUnbanUser = async (userId: string): Promise<void> => {
    setActionLoading(prev => ({ ...prev, [userId]: 'unban' }));
    try {
      await dashboardAPI.unbanUser(userId);
      await fetchBannedUsers();
      setError(null);
    } catch (err) {
      console.error('Unban user error:', err);
      setError('Failed to unban user');
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  // Handle export
  const handleExport = async (): Promise<void> => {
    setExporting(true);
    try {
      const data = await dashboardAPI.exportUsers();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export users');
    } finally {
      setExporting(false);
    }
  };

  // Refresh all data
  const refreshAll = async (): Promise<void> => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchSecurityStats(),
      fetchSystemHealth(),
      fetchActivity(),
      fetchUsers(),
      fetchRecentActivity()
    ]);
    setLoading(false);
  };

  // Effects
  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [timeframe]);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm, statusFilter]);

  useEffect(() => {
    if (activeTab === 'security') {
      fetchSecurityAlerts();
    } else if (activeTab === 'moderation') {
      fetchContentReports();
      fetchBannedUsers();
    }
  }, [activeTab, currentPage, alertSeverityFilter, alertStatusFilter, reportTypeFilter, reportStatusFilter]);

  // Auto refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchStats();
      fetchSecurityStats();
      fetchSystemHealth();
      fetchRecentActivity();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Helper functions
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-800 bg-red-100 border-red-200';
      case 'high': return 'text-orange-800 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-800 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-800 bg-blue-100 border-blue-200';
      default: return 'text-gray-800 bg-gray-100 border-gray-200';
    }
  };

  const getHealthColor = (status: string, value?: number) => {
    if (status === 'critical' || (value && value > 90)) return 'text-red-600';
    if (status === 'warning' || (value && value > 70)) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Components
  const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, change, color = "blue", alert = false }) => (
    <div className={`bg-white p-6 rounded-lg shadow-sm border transition-shadow ${
      alert ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:shadow-md'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${alert ? 'text-red-900' : 'text-gray-900'}`}>
            {typeof value === 'number' ? value.toLocaleString() : value || '0'}
          </p>
          {change && (
            <p className={`text-sm flex items-center ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="w-3 h-3 mr-1" />
              {change > 0 ? '+' : ''}{change}% from last period
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${alert ? 'bg-red-200' : `bg-${color}-100`}`}>
          <Icon className={`w-6 h-6 ${alert ? 'text-red-700' : `text-${color}-600`}`} />
        </div>
      </div>
    </div>
  );

  const UserTableRow: React.FC<UserTableRowProps> = ({ user }) => (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
            {user.firstName?.[0]}{user.lastName?.[0]}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</div>
            <div className="text-sm text-gray-500">@{user.username}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{user.email}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          user.isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {user.isActive ? (
            <><CheckCircle className="w-3 h-3 mr-1" /> Active</>
          ) : (
            <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
          )}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          user.isVerified 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {user.isVerified ? (
            <><Shield className="w-3 h-3 mr-1" /> Verified</>
          ) : (
            <><Clock className="w-3 h-3 mr-1" /> Pending</>
          )}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <div className="flex items-center">
          <FileText className="w-4 h-4 mr-1 text-gray-400" />
          {user.postCount || 0}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <div className="flex items-center">
          <Users className="w-4 h-4 mr-1 text-gray-400" />
          {user.connectionsCount || 0}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={() => handleUserAction(user._id, user.isVerified ? 'unverify' : 'verify')}
            disabled={!!actionLoading[user._id]}
            className="text-green-600 hover:text-green-900 disabled:opacity-50 p-1 rounded transition-colors"
            title={user.isVerified ? 'Remove verification' : 'Verify user'}
          >
            {actionLoading[user._id] === 'verify' ? 
              <RefreshCw className="w-4 h-4 animate-spin" /> : 
              <UserCheck className="w-4 h-4" />
            }
          </button>
          <button
            onClick={() => handleUserAction(user._id, user.isActive ? 'deactivate' : 'activate')}
            disabled={!!actionLoading[user._id]}
            className="text-red-600 hover:text-red-900 disabled:opacity-50 p-1 rounded transition-colors"
            title={user.isActive ? 'Deactivate user' : 'Activate user'}
          >
            {actionLoading[user._id] === 'deactivate' || actionLoading[user._id] === 'activate' ? 
              <RefreshCw className="w-4 h-4 animate-spin" /> : 
              <UserX className="w-4 h-4" />
            }
          </button>
          <button
            className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
            title="View details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );

  // Chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-xl text-gray-600">Loading admin dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching latest analytics data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Platform management and analytics</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto-refresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="auto-refresh" className="text-sm text-gray-600">Auto-refresh</label>
              </div>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              <button
                onClick={refreshAll}
                disabled={loading}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
            <span className="text-red-800 flex-1">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 font-bold text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {([
              { id: 'overview', name: 'Overview', icon: BarChart3, count: null },
              { id: 'users', name: 'Users', icon: Users, count: stats?.totalUsers },
              { id: 'security', name: 'Security', icon: ShieldAlert, count: securityStats?.pendingReports, alert: securityStats && securityStats.pendingReports > 0 },
              { id: 'moderation', name: 'Moderation', icon: Flag, count: securityStats?.moderationQueue, alert: securityStats && securityStats.moderationQueue > 0 },
              { id: 'system', name: 'System Health', icon: Monitor, count: null, alert: systemHealth?.databaseHealth === 'critical' || systemHealth?.apiHealth === 'down' },
              { id: 'activity', name: 'Activity', icon: TrendingUp, count: null },
            ] as TabItem[]).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-1 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } ${tab.alert ? 'relative' : ''}`}
                >
                  <Icon className={`w-4 h-4 mr-2 ${tab.alert ? 'text-red-500' : ''}`} />
                  {tab.name}
                  {tab.count && (
                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                      tab.alert 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {tab.count.toLocaleString()}
                    </span>
                  )}
                  {tab.alert && !tab.count && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  icon={Users}
                  title="Total Users"
                  value={stats.totalUsers}
                  change={+parseFloat(stats.userGrowthRate)}
                  color="blue"
                />
                <StatCard
                  icon={Activity}
                  title="Active Users"
                  value={stats.activeUsers}
                  change={+12.5}
                  color="green"
                />
                <StatCard
                  icon={FileText}
                  title="Total Posts"
                  value={stats.totalPosts}
                  change={+8.3}
                  color="yellow"
                />
                <StatCard
                  icon={MessageSquare}
                  title="Conversations"
                  value={stats.totalConversations}
                  change={+15.2}
                  color="purple"
                />
              </div>
            )}

            {/* Security Overview */}
            {securityStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  icon={ShieldAlert}
                  title="Security Alerts"
                  value={securityStats.pendingReports}
                  color="red"
                  alert={securityStats.pendingReports > 0}
                />
                <StatCard
                  icon={Flag}
                  title="Content Reports"
                  value={securityStats.moderationQueue}
                  color="orange"
                  alert={securityStats.moderationQueue > 5}
                />
                <StatCard
                  icon={Ban}
                  title="Banned Users"
                  value={securityStats.bannedUsers}
                  color="red"
                />
                <StatCard
                  icon={AlertTriangle}
                  title="Failed Logins"
                  value={securityStats.failedLogins}
                  color="yellow"
                  alert={securityStats.failedLogins > 100}
                />
              </div>
            )}

            {/* System Health Overview */}
            {systemHealth && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Monitor className="w-5 h-5 mr-2" />
                  System Health
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getHealthColor('', systemHealth.cpuUsage)}`}>
                      {systemHealth.cpuUsage}%
                    </div>
                    <div className="text-sm text-gray-500">CPU Usage</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getHealthColor('', systemHealth.memoryUsage)}`}>
                      {systemHealth.memoryUsage}%
                    </div>
                    <div className="text-sm text-gray-500">Memory Usage</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getHealthColor(systemHealth.databaseHealth)}`}>
                      <Database className="w-6 h-6 mx-auto mb-1" />
                    </div>
                    <div className="text-sm text-gray-500">Database: {systemHealth.databaseHealth}</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getHealthColor(systemHealth.apiHealth)}`}>
                      <Wifi className="w-6 h-6 mx-auto mb-1" />
                    </div>
                    <div className="text-sm text-gray-500">API: {systemHealth.apiHealth}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Charts with Recharts */}
            {activityData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Area Chart */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Daily Active Users</h3>
                    <TrendingUp className="w-5 h-5 text-gray-400" />
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={activityData.dailyActivity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="_id" />
                      <YAxis />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="activeUsers" 
                        stroke="#3B82F6" 
                        fill="#3B82F6" 
                        fillOpacity={0.1}
                        strokeWidth={2} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie Chart */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Posts by Type</h3>
                    <BarChart3 className="w-5 h-5 text-gray-400" />
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={activityData.postsByType}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        label={(entry: any) => `${entry._id} ${(entry.percent * 100).toFixed(0)}%`}
                      >
                        {activityData.postsByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Security Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <select
                  value={alertSeverityFilter}
                  onChange={(e) => setAlertSeverityFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select
                  value={alertStatusFilter}
                  onChange={(e) => setAlertStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="unresolved">Unresolved</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                </select>
                <button
                  onClick={fetchSecurityAlerts}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Alerts
                </button>
              </div>
            </div>

            {/* Security Alerts Table */}
            {securityAlerts && (
              <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <ShieldAlert className="w-5 h-5 mr-2 text-red-500" />
                    Security Alerts
                  </h3>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alert</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {securityAlerts.alerts.map((alert) => (
                      <tr key={alert._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{alert.title}</div>
                            <div className="text-sm text-gray-500">{alert.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                            {alert.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {alert.type.replace('_', ' ').toUpperCase()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {alert.ipAddress || alert.userId || 'System'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(alert.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            alert.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            alert.status === 'investigating' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {alert.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            {alert.status === 'unresolved' && (
                              <>
                                <button
                                  onClick={() => handleResolveAlert(alert._id, 'investigate')}
                                  disabled={!!actionLoading[alert._id]}
                                  className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50 p-1 rounded transition-colors"
                                  title="Mark as investigating"
                                >
                                  {actionLoading[alert._id] === 'investigate' ? 
                                    <RefreshCw className="w-4 h-4 animate-spin" /> : 
                                    <Eye className="w-4 h-4" />
                                  }
                                </button>
                                <button
                                  onClick={() => handleResolveAlert(alert._id, 'resolve')}
                                  disabled={!!actionLoading[alert._id]}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50 p-1 rounded transition-colors"
                                  title="Mark as resolved"
                                >
                                  {actionLoading[alert._id] === 'resolve' ? 
                                    <RefreshCw className="w-4 h-4 animate-spin" /> : 
                                    <CheckCircle className="w-4 h-4" />
                                  }
                                </button>
                              </>
                            )}
                            {alert.status === 'investigating' && (
                              <button
                                onClick={() => handleResolveAlert(alert._id, 'resolve')}
                                disabled={!!actionLoading[alert._id]}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50 p-1 rounded transition-colors"
                                title="Mark as resolved"
                              >
                                {actionLoading[alert._id] === 'resolve' ? 
                                  <RefreshCw className="w-4 h-4 animate-spin" /> : 
                                  <CheckCircle className="w-4 h-4" />
                                }
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {securityAlerts.alerts.length === 0 && (
                  <div className="text-center py-12">
                    <ShieldCheck className="w-12 h-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Security Alerts</h3>
                    <p className="text-gray-500">All systems are secure and functioning normally.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Moderation Tab */}
        {activeTab === 'moderation' && (
          <div className="space-y-6">
            {/* Moderation Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <select
                  value={reportTypeFilter}
                  onChange={(e) => setReportTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="spam">Spam</option>
                  <option value="harassment">Harassment</option>
                  <option value="inappropriate">Inappropriate</option>
                  <option value="violence">Violence</option>
                  <option value="copyright">Copyright</option>
                  <option value="other">Other</option>
                </select>
                <select
                  value={reportStatusFilter}
                  onChange={(e) => setReportStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="under_review">Under Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
                <button
                  onClick={fetchContentReports}
                  className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Reports
                </button>
              </div>
            </div>

            {/* Content Reports */}
            {contentReports && (
              <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Flag className="w-5 h-5 mr-2 text-orange-500" />
                    Content Reports
                  </h3>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reporter</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {contentReports.reports.map((report) => (
                      <tr key={report._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{report.reason}</div>
                            <div className="text-sm text-gray-500">{report.description}</div>
                            <div className="text-xs text-gray-400">{new Date(report.timestamp).toLocaleString()}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {report.reportType.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          @{report.reporterUsername}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          @{report.targetUsername}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            report.priority === 'high' ? 'bg-red-100 text-red-800' :
                            report.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {report.priority.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            report.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                            report.status === 'dismissed' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {report.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            {report.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleModerateContent(report._id, 'approve')}
                                  disabled={!!actionLoading[report._id]}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50 p-1 rounded transition-colors"
                                  title="Approve content"
                                >
                                  {actionLoading[report._id] === 'approve' ? 
                                    <RefreshCw className="w-4 h-4 animate-spin" /> : 
                                    <CheckCircle className="w-4 h-4" />
                                  }
                                </button>
                                <button
                                  onClick={() => handleModerateContent(report._id, 'remove')}
                                  disabled={!!actionLoading[report._id]}
                                  className="text-red-600 hover:text-red-900 disabled:opacity-50 p-1 rounded transition-colors"
                                  title="Remove content"
                                >
                                  {actionLoading[report._id] === 'remove' ? 
                                    <RefreshCw className="w-4 h-4 animate-spin" /> : 
                                    <XCircle className="w-4 h-4" />
                                  }
                                </button>
                              </>
                            )}
                            <button
                              className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {contentReports.reports.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Reports</h3>
                    <p className="text-gray-500">All content is in compliance with community guidelines.</p>
                  </div>
                )}
              </div>
            )}

            {/* Banned Users */}
            {bannedUsers && (
              <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Ban className="w-5 h-5 mr-2 text-red-500" />
                    Banned Users
                  </h3>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ban Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Banned By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bannedUsers.users.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">@{user.username}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{user.reason}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.banType === 'permanent' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {user.banType.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.bannedBy}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.banDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.expiresAt ? new Date(user.expiresAt).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleUnbanUser(user._id)}
                              disabled={!!actionLoading[user._id]}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50 p-1 rounded transition-colors"
                              title="Unban user"
                            >
                              {actionLoading[user._id] === 'unban' ? 
                                <RefreshCw className="w-4 h-4 animate-spin" /> : 
                                <Unlock className="w-4 h-4" />
                              }
                            </button>
                            <button
                              className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                              title="View appeal"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {bannedUsers.users.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Banned Users</h3>
                    <p className="text-gray-500">All users are in good standing.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* System Health Tab */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            {/* System Overview */}
            {systemHealth && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  icon={Cpu}
                  title="CPU Usage"
                  value={`${systemHealth.cpuUsage}%`}
                  color="blue"
                  alert={systemHealth.cpuUsage > 80}
                />
                <StatCard
                  icon={MemoryStick}
                  title="Memory Usage"
                  value={`${systemHealth.memoryUsage}%`}
                  color="green"
                  alert={systemHealth.memoryUsage > 85}
                />
                <StatCard
                  icon={HardDrive}
                  title="Disk Usage"
                  value={`${systemHealth.diskUsage}%`}
                  color="yellow"
                  alert={systemHealth.diskUsage > 90}
                />
                <StatCard
                  icon={Zap}
                  title="Uptime"
                  value={systemHealth.uptime}
                  color="purple"
                />
              </div>
            )}

            {/* Detailed System Health */}
            {systemHealth && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Database Health */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <Database className="w-5 h-5 mr-2" />
                      Database Health
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      systemHealth.databaseHealth === 'healthy' ? 'bg-green-100 text-green-800' :
                      systemHealth.databaseHealth === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {systemHealth.databaseHealth.toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Active Connections</span>
                      <span className="text-sm font-medium text-gray-900">{systemHealth.activeConnections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Response Time</span>
                      <span className="text-sm font-medium text-gray-900">{systemHealth.responseTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Last Backup</span>
                      <span className="text-sm font-medium text-gray-900">{systemHealth.lastBackup}</span>
                    </div>
                  </div>
                </div>

                {/* API Health */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <Globe className="w-5 h-5 mr-2" />
                      API Health
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      systemHealth.apiHealth === 'healthy' ? 'bg-green-100 text-green-800' :
                      systemHealth.apiHealth === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {systemHealth.apiHealth.toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Error Rate</span>
                      <span className={`text-sm font-medium ${getHealthColor('', systemHealth.errorRate)}`}>
                        {systemHealth.errorRate}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Avg Response Time</span>
                      <span className="text-sm font-medium text-gray-900">{systemHealth.responseTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Active Connections</span>
                      <span className="text-sm font-medium text-gray-900">{systemHealth.activeConnections}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* System Performance Chart */}
            {systemHealth && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Monitor className="w-5 h-5 mr-2" />
                  System Performance
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={[
                    { time: '00:00', cpu: systemHealth.cpuUsage - 10, memory: systemHealth.memoryUsage - 5, disk: systemHealth.diskUsage },
                    { time: '04:00', cpu: systemHealth.cpuUsage - 5, memory: systemHealth.memoryUsage, disk: systemHealth.diskUsage },
                    { time: '08:00', cpu: systemHealth.cpuUsage + 5, memory: systemHealth.memoryUsage + 3, disk: systemHealth.diskUsage },
                    { time: '12:00', cpu: systemHealth.cpuUsage, memory: systemHealth.memoryUsage + 8, disk: systemHealth.diskUsage },
                    { time: '16:00', cpu: systemHealth.cpuUsage + 3, memory: systemHealth.memoryUsage + 5, disk: systemHealth.diskUsage },
                    { time: '20:00', cpu: systemHealth.cpuUsage - 2, memory: systemHealth.memoryUsage + 2, disk: systemHealth.diskUsage },
                    { time: '24:00', cpu: systemHealth.cpuUsage, memory: systemHealth.memoryUsage, disk: systemHealth.diskUsage }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="cpu" stroke="#3B82F6" name="CPU %" strokeWidth={2} />
                    <Line type="monotone" dataKey="memory" stroke="#10B981" name="Memory %" strokeWidth={2} />
                    <Line type="monotone" dataKey="disk" stroke="#F59E0B" name="Disk %" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users by name, username, or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Users</option>
                  <option value="active">Active Users</option>
                  <option value="inactive">Inactive Users</option>
                </select>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
                >
                  {exporting ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Export
                </button>
              </div>
            </div>

            {/* Users Table */}
            {users && (
              <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posts</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Connections</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.users.map((user) => (
                      <UserTableRow key={user._id} user={user} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && activityData && (
          <div className="space-y-6">
            {/* Bar Chart */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">User Activity Over Time</h3>
                <BarChart3 className="w-5 h-5 text-gray-400" />
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={activityData.dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [value, 'Active Users']}
                    labelFormatter={(label: string) => `Date: ${label}`}
                  />
                  <Bar dataKey="activeUsers" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Activity Feed */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Recent Activity Feed</h3>
                <button
                  onClick={fetchRecentActivity}
                  className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </button>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      {activity.action.includes('post') ? (
                        <FileText className="w-5 h-5 text-white" />
                      ) : activity.action.includes('joined') ? (
                        <UserCheck className="w-5 h-5 text-white" />
                      ) : (
                        <Activity className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.username}</span>{' '}
                        <span className="text-gray-600">{activity.action}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {activity.action.includes('post') ? 'Content' : 
                         activity.action.includes('joined') ? 'User' : 'System'}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
                    <p className="text-gray-500">Activity will appear here as users interact with the platform.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;