// FriendProfile.tsx - Enhanced with full GitHub integration
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../../BACKEND/context/UserContext';
import Navbar from '../../BACKEND/COMPONENTS/navbar';
import './Styles/FriendProfile.css';

// Updated interface to match your Profile page GitHub structure
interface GitHubProfile {
  id: number;
  username: string;
  name?: string;
  bio?: string;
  avatarUrl?: string;
  profileUrl?: string;
  publicRepos?: number;
  followers?: number;
  following?: number;
  company?: string;
  location?: string;
  blog?: string;
  twitterUsername?: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description?: string;
  language?: string;
  stars: number;
  forks: number;
  url: string;
  isPrivate: boolean;
  updatedAt: string;
  pushedAt: string;
}

interface GitHubIntegration {
  _id: string;
  profile: GitHubProfile;
  repositories: GitHubRepo[];
  lastSyncAt: string;
  settings: {
    syncFrequency: string;
    autoSyncRepos: boolean;
    showPrivateRepos: boolean;
    maxReposToCache: number;
  };
  isActive: boolean;
}

interface FriendProfileData {
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profilePhoto?: { url: string };
  jobTitle?: string;
  bio?: string;
  joinDate?: string;
  posts: {
    _id: string;
    url: string;
    mediaType: 'image' | 'video' | 'code';
    caption?: string;
    uploadDate: string;
    likes: string[];
    comments: { user: string; text: string; createdAt: string }[];
    code?: string;
    language?: string;
    filename?: string;
    githubUrl?: string;
  }[];
  isFriend: boolean;
  isSelf: boolean;
  integrations?: {
    github?: GitHubIntegration;
  };
}

const FriendProfile: React.FC = () => {
  const { friendId } = useParams<{ friendId: string }>();
  const { token, userId } = useUser();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<FriendProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPosts, setShowPosts] = useState(false);
  const [showGitHubRepos, setShowGitHubRepos] = useState(false);

  useEffect(() => {
    if (!friendId || !token) {
      setLoading(false);
      return;
    }

    // If viewing own profile, redirect to main profile page
    if (friendId === userId) {
      navigate('/profile');
      return;
    }

    fetchFriendProfile();
  }, [friendId, token, userId]);

  const fetchFriendProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/user/${friendId}/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const profileData = await response.json();
      setProfile(profileData);
    } catch (err) {
      console.error('Error fetching friend profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="friend-profile-loading">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </>
    );
  }

  if (error || !profile) {
    return (
      <>
        <Navbar />
        <div className="friend-profile-error">
          <h2>Profile Not Available</h2>
          <p>{error || 'This profile could not be loaded.'}</p>
          <button onClick={() => navigate('/home')} className="back-home-btn">
            Back to Home
          </button>
        </div>
      </>
    );
  }

  const githubIntegration = profile.integrations?.github;
  const isGitHubConnected = !!githubIntegration;

  return (
    <>
      <Navbar />
      <div className="profile-container-page">
        <div className="profile-card">
          <div className="profile-header">
            <img
              src={profile.profilePhoto?.url || '/CompImages/user.png'}
              alt="Profile"
              className="profile-photo"
            />
            <h2 className="profile-name">{profile.firstName} {profile.lastName}</h2>
            <p className="profile-username">@{profile.username}</p>

            {/* Job Title Section */}
            {profile.jobTitle && (
              <div className="job-title-section">
                <div className="job-title-display">
                  <h3 className="job-title">{profile.jobTitle}</h3>
                </div>
              </div>
            )}

            {/* Friend Status Badge */}
            {!profile.isFriend && !profile.isSelf && (
              <div className="friend-status">
                <span className="not-friend-badge">Public Profile</span>
              </div>
            )}

            {/* GitHub Section - matching your Profile page exactly */}
            {profile.isFriend && isGitHubConnected && (
              <div className="github-section">
                <h3>GitHub Integration</h3>
                <div className="github-connected">
                  <div className="github-profile-info">
                    <div className="github-user-info">
                      <h4>Connected: @{githubIntegration.profile.username}</h4>
                      {githubIntegration.profile.name && (
                        <p>{githubIntegration.profile.name}</p>
                      )}
                      <div className="github-stats">
                        <span>📚 {githubIntegration.profile.publicRepos || 0} repos</span>
                        <span>👥 {githubIntegration.profile.followers || 0} followers</span>
                        <span>➡️ {githubIntegration.profile.following || 0} following</span>
                      </div>
                      <p className="last-sync">
                        Last synced: {new Date(githubIntegration.lastSyncAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="github-actions">
                      <button
                        onClick={() => setShowGitHubRepos(!showGitHubRepos)}
                        className="toggle-repos-btn"
                      >
                        {showGitHubRepos ? 'Hide' : 'Show'} Repositories
                      </button>
                    </div>
                  </div>

                  {showGitHubRepos && (
                    <div className="github-repositories">
                      <h4>Recent Repositories</h4>
                      {githubIntegration.repositories.length > 0 ? (
                        <div className="repos-grid">
                          {githubIntegration.repositories.map(repo => (
                            <div key={repo.id} className="repo-card">
                              <div className="repo-header">
                                <h5>
                                  <a href={repo.url} target="_blank" rel="noopener noreferrer">
                                    {repo.name}
                                  </a>
                                </h5>
                                {repo.language && (
                                  <span className="repo-language">{repo.language}</span>
                                )}
                              </div>
                              {repo.description && (
                                <p className="repo-description">{repo.description}</p>
                              )}
                              <div className="repo-stats">
                                <span>⭐ {repo.stars}</span>
                                <span>🍴 {repo.forks}</span>
                                <span className="repo-updated">
                                  Updated: {new Date(repo.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No public repositories found</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="profile-info">
            {/* Bio Section */}
            {profile.bio && <p className="bio">{profile.bio}</p>}

            {/* Posts Section */}
            <div className="profile-buttons-section">
              <button 
                onClick={() => setShowPosts(!showPosts)} 
                className="profile-page-icon-buttons"
                style={{
                  background: showPosts ? '#00ff7f' : 'rgba(22, 27, 34, 0.95)',
                  color: showPosts ? '#000' : '#f0f6fc'
                }}
              >
                📝 Posts ({profile.posts.length})
              </button>
              <button 
                onClick={() => navigate('/home')} 
                className="profile-page-icon-buttons"
              >
                🏠 Back to Home
              </button>
            </div>

            {/* Posts Display - matching your Profile page style */}
            {showPosts && profile.posts.length ? (
              <div className="posts-list">
                <ul>
                  {profile.posts.map(post => (
                    <li key={post._id}>
                      {post.mediaType === 'image' && post.url && (
                        <img 
                          src={post.url} 
                          alt={post.caption} 
                          style={{ width: '100%', maxWidth: '400px', display: 'block', borderRadius: '8px' }} 
                        />
                      )}
                      {post.mediaType === 'video' && post.url && (
                        <video width="400" controls style={{ borderRadius: '8px' }}>
                          <source src={post.url} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      )}
                      {post.mediaType === 'code' && (
                        <div className="code-post">
                          <div className="code-header">
                            <span className="code-language">{post.language}</span>
                            {post.filename && <span className="code-filename">{post.filename}</span>}
                            {post.githubUrl && (
                              <a 
                                href={post.githubUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="github-link"
                                style={{ 
                                  color: '#00ff7f', 
                                  textDecoration: 'none', 
                                  fontSize: '12px' 
                                }}
                              >
                                View on GitHub
                              </a>
                            )}
                          </div>
                          <pre className="code-content">
                            <code>{post.code}</code>
                          </pre>
                          {post.caption && <p className="code-caption">{post.caption}</p>}
                        </div>
                      )}
                      <div style={{ 
                        marginTop: '10px', 
                        padding: '10px', 
                        background: 'rgba(22, 27, 34, 0.5)', 
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#8b949e'
                      }}>
                        <span>{post.likes.length} likes</span>
                        <span>{post.comments.length} comments</span>
                        <span>{new Date(post.uploadDate).toLocaleDateString()}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : showPosts && profile.posts.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                color: '#8b949e',
                fontStyle: 'italic'
              }}>
                {profile.isFriend ? "No posts shared yet." : "Posts only visible to friends."}
              </div>
            ) : null}

            {/* Connection Status Info */}
            {!profile.isFriend && !profile.isSelf && (
              <div style={{
                textAlign: 'center',
                padding: '30px',
                background: 'rgba(22, 27, 34, 0.8)',
                borderRadius: '12px',
                margin: '20px 0',
                border: '1px solid #30363d'
              }}>
                <h4 style={{ color: '#f0f6fc', marginBottom: '10px' }}>
                  Add {profile.firstName} as a friend to see their posts and GitHub integration
                </h4>
                <p style={{ color: '#8b949e', fontSize: '14px' }}>
                  Only friends can view full profiles and activity
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

export default FriendProfile;