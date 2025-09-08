import React, { useState, useEffect,useRef } from 'react';
import Navbar from '../../BACKEND/COMPONENTS/navbar';
import { useUser } from '../../BACKEND/context/UserContext';
import './Styles/ProfilePage.css';
import postsIcon from "../Images/category.png";
import groupConnectionsIcon from "../Images/group.png";
import createPostIcon from "../Images/more.png";

// ADD THESE NEW INTERFACES
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

// UPDATE YOUR EXISTING UserProfile INTERFACE
interface UserProfile {
  _id: string;
  username: string;
  role: 'user' | 'admin' | 'moderator';
  firstName?: string;
  lastName?: string;
  email?: string;
  bio?: string;
  jobTitle?: string;
  joinDate?: string;
  profilePhoto?: { url?: string; publicId?: string };
  connections?: { _id: string; username?: string }[];
  // ADD THIS LINE
  integrations?: {
    github?: GitHubIntegration;
  };
  posts?: {
    _id: string;
    url: string;
    mediaType: 'image' | 'video' | 'code'; // ADD 'code' here
    caption?: string;
    uploadDate: string;
    likes: string[];
    comments: { user: string; text: string; createdAt: string }[];
    // ADD THESE FOR CODE POSTS
    code?: string;
    language?: string;
    filename?: string;
    githubUrl?: string;
  }[];
}

const Profile: React.FC = () => {
  const { userId } = useUser();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isGeneratingJobTitle, setIsGeneratingJobTitle] = useState(false);
  const [isEditingJobTitle, setIsEditingJobTitle] = useState(false);
  const [tempJobTitle, setTempJobTitle] = useState('');

  // ADD THESE NEW STATE VARIABLES FOR GITHUB
  const [isConnectingGitHub, setIsConnectingGitHub] = useState(false);
  const [isSyncingGitHub, setIsSyncingGitHub] = useState(false);
  const [showGitHubRepos, setShowGitHubRepos] = useState(false);
  const [showCodePostModal, setShowCodePostModal] = useState(false);
  const [codePostData, setCodePostData] = useState({
    code: '',
    language: 'javascript',
    filename: '',
    caption: ''
  });

  // State for profile picture
  const [profileFile, setProfileFile] = useState<File | null>(null);
  // State for posts
  const [postFile, setPostFile] = useState<File | null>(null);
  const [caption, setCaption] = useState<string>('');
  const [showPostModal, setShowPostModal] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [showPosts, setShowPosts] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
   const callbackProcessed = useRef(false);
  useEffect(() => {
    if (!userId) return;
    const fetchProfile = async () => {
      try {
        const response = await fetch(`http://localhost:5000/user/${userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!response.ok) {
          const text = await response.text();
          console.error('Fetch failed:', text);
          return;
        }
        const data = await response.json();
        setUserProfile(data);
      } catch (err) {
        console.error('Error fetching user profile', err);
      }
    };
    fetchProfile();
  }, [userId]);

  // Updated useEffect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state === 'github-auth' && !callbackProcessed.current && !isConnectingGitHub) {
      console.log('Processing GitHub callback...');
      callbackProcessed.current = true;

      // Clean up URL immediately
      window.history.replaceState({}, document.title, window.location.pathname);

      handleGitHubCallback(code);
    }
  }, []);
  const connectGitHub = () => {
    setIsConnectingGitHub(true);
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID; // Changed this line
    const redirectUri = `${window.location.origin}/profile`;
    const scope = 'read:user,public_repo';
    const state = 'github-auth';

    if (!clientId) {
      setMessage('GitHub client ID not configured');
      setIsConnectingGitHub(false);
      return;
    }

    window.location.href =
      `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
  };
  const handleGitHubCallback = async (code: string) => {
    try {
      const response = await fetch('http://localhost:5000/user/auth/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh the user profile to get the GitHub integration data
        const profileResponse = await fetch(`http://localhost:5000/user/${userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setUserProfile(profileData);
          setMessage('GitHub connected successfully!');
        }

        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || 'Failed to connect GitHub');
      }
    } catch (err) {
      console.error('Error connecting GitHub:', err);
      setMessage('Failed to connect GitHub');
    } finally {
      setIsConnectingGitHub(false);
    }
  };

  const disconnectGitHub = async () => {
    if (!userId) return;

    try {
      const response = await fetch(`http://localhost:5000/user/${userId}/github/disconnect`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.ok) {
        setUserProfile(prev => prev ? {
          ...prev,
          integrations: { ...prev.integrations, github: undefined }
        } : prev);
        setMessage('GitHub disconnected successfully!');
      } else {
        setMessage('Failed to disconnect GitHub');
      }
    } catch (err) {
      console.error('Error disconnecting GitHub:', err);
      setMessage('Failed to disconnect GitHub');
    }
  };

  const syncGitHub = async () => {
    if (!userId) return;

    setIsSyncingGitHub(true);
    try {
      const response = await fetch(`http://localhost:5000/user/${userId}/github/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.ok) {
        const data = await response.json();
        // Update the user profile with fresh GitHub data
        setUserProfile(prev => prev ? {
          ...prev,
          integrations: {
            ...prev.integrations,
            github: prev.integrations?.github ? {
              ...prev.integrations.github,
              profile: data.profile,
              repositories: data.repositories,
              lastSyncAt: data.lastSyncAt
            } : undefined
          }
        } : prev);
        setMessage('GitHub data synced successfully!');
      } else {
        setMessage('Failed to sync GitHub data');
      }
    } catch (err) {
      console.error('Error syncing GitHub:', err);
      setMessage('Failed to sync GitHub data');
    } finally {
      setIsSyncingGitHub(false);
    }
  };

  const createCodePost = async () => {
    if (!userId || !codePostData.code || !codePostData.language) {
      setMessage('Code and language are required');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/user/${userId}/create-code-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(codePostData),
      });

      const data = await response.json();
      if (response.ok) {
        setUserProfile(prev => prev ? {
          ...prev,
          posts: [...(prev.posts || []), data.post]
        } : prev);
        setMessage('Code post created successfully!');
        setCodePostData({ code: '', language: 'javascript', filename: '', caption: '' });
        setShowCodePostModal(false);
      } else {
        setMessage(data.error || 'Failed to create code post');
      }
    } catch (err) {
      console.error('Error creating code post:', err);
      setMessage('Failed to create code post');
    }
  };

  // EXISTING FUNCTIONS (keep all your existing functions)
  const handleProfileUpload = async () => {
    if (!profileFile || !userId) return;

    setIsUploadingProfile(true);
    const formData = new FormData();
    formData.append('profileImage', profileFile);

    try {
      const response = await fetch('http://localhost:5000/user/upload-profile', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setUserProfile(prev => prev ? { ...prev, profilePhoto: data.profilePhoto } : prev);
        setMessage('Profile photo updated successfully!');
        setProfileFile(null);
      } else {
        setMessage(data.error || 'Profile upload failed');
      }
    } catch (err) {
      console.error(err);
      setMessage('Something went wrong while uploading profile photo.');
    } finally {
      setIsUploadingProfile(false);
    }
  };

  const handleGenerateJobTitle = async () => {
    if (!userId) return;

    setIsGeneratingJobTitle(true);
    try {
      const response = await fetch(`http://localhost:5000/user/${userId}/generate-job-title`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      const data = await response.json();
      if (response.ok) {
        setUserProfile(prev => prev ? { ...prev, jobTitle: data.jobTitle } : prev);
        setMessage('New job title generated!');
      } else {
        setMessage(data.error || 'Failed to generate job title');
      }
    } catch (err) {
      console.error(err);
      setMessage('Something went wrong while generating job title.');
    } finally {
      setIsGeneratingJobTitle(false);
    }
  };

  const handleUpdateJobTitle = async () => {
    if (!userId || !tempJobTitle.trim()) return;

    try {
      const response = await fetch(`http://localhost:5000/user/${userId}/job-title`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobTitle: tempJobTitle.trim() }),
      });

      const data = await response.json();
      if (response.ok) {
        setUserProfile(prev => prev ? { ...prev, jobTitle: data.jobTitle } : prev);
        setMessage('Job title updated successfully!');
        setIsEditingJobTitle(false);
        setTempJobTitle('');
      } else {
        setMessage(data.error || 'Failed to update job title');
      }
    } catch (err) {
      console.error(err);
      setMessage('Something went wrong while updating job title.');
    }
  };

  const startEditingJobTitle = () => {
    setTempJobTitle(userProfile?.jobTitle || '');
    setIsEditingJobTitle(true);
  };

  const cancelEditingJobTitle = () => {
    setIsEditingJobTitle(false);
    setTempJobTitle('');
  };

  const handleCreatePost = async () => {
    if (!postFile || !userId) {
      setMessage('Select an image to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('image', postFile);
    formData.append('caption', caption);

    try {
      const response = await fetch(`http://localhost:5000/user/${userId}/create-post`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setUserProfile(prev => prev ? { ...prev, posts: [...(prev.posts || []), data.post] } : prev);
        setMessage('Post created successfully!');
        setPostFile(null);
        setCaption('');
        setShowPostModal(false);
      } else {
        setMessage(data.error || 'Failed to create post.');
      }
    } catch (err) {
      console.error(err);
      setMessage('Something went wrong while creating post.');
    }
  };

  // GET GITHUB INTEGRATION DATA
  const githubIntegration = userProfile?.integrations?.github;
  const isGitHubConnected = !!githubIntegration;

  return (
    <>
      <Navbar />
      <div className="profile-container-page">
        <div className="profile-card">
          <div className="profile-header">
            <img
              src={userProfile?.profilePhoto?.url || '/CompImages/user.png'}
              alt="Profile"
              className="profile-photo"
            />
            <h2 className="profile-name">{userProfile?.firstName} {userProfile?.lastName}</h2>
            <p className="profile-username">@{userProfile?.username}</p>

            {/* JOB TITLE SECTION */}
            <div className="job-title-section">
              {!isEditingJobTitle ? (
                <div className="job-title-display">
                  <h3 className="job-title">
                    {userProfile?.jobTitle || 'No job title set'}
                  </h3>
                  <div className="job-title-buttons">
                    <button
                      onClick={handleGenerateJobTitle}
                      disabled={isGeneratingJobTitle}
                      className="generate-job-title-btn"
                    >
                      {isGeneratingJobTitle ? 'Generating...' : 'Generate Random Title'}
                    </button>
                    <button
                      onClick={startEditingJobTitle}
                      className="edit-job-title-btn"
                    >
                      Edit Title
                    </button>
                  </div>
                </div>
              ) : (
                <div className="job-title-edit">
                  <input
                    type="text"
                    value={tempJobTitle}
                    onChange={(e) => setTempJobTitle(e.target.value)}
                    placeholder="Enter your job title..."
                    maxLength={100}
                    className="job-title-input"
                  />
                  <div className="job-title-edit-buttons">
                    <button onClick={handleUpdateJobTitle} className="save-job-title-btn">
                      Save
                    </button>
                    <button onClick={cancelEditingJobTitle} className="cancel-job-title-btn">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ADD GITHUB SECTION HERE */}
            <div className="github-section">
              <h3>GitHub Integration</h3>

              {!isGitHubConnected ? (
                <div className="github-connect">
                  <p>Connect your GitHub account to showcase your repositories</p>
                  <button
                    onClick={connectGitHub}
                    disabled={isConnectingGitHub}
                    className="github-connect-btn"
                  >
                    {isConnectingGitHub ? 'Connecting...' : '🔗 Connect GitHub'}
                  </button>
                </div>
              ) : (
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
                      <button
                        onClick={syncGitHub}
                        disabled={isSyncingGitHub}
                        className="sync-github-btn"
                      >
                        {isSyncingGitHub ? 'Syncing...' : 'Sync Data'}
                      </button>
                      <button
                        onClick={() => setShowCodePostModal(true)}
                        className="create-code-post-btn"
                      >
                        Share Code
                      </button>
                      <button onClick={disconnectGitHub} className="disconnect-github-btn">
                        Disconnect
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
              )}
            </div>
          </div>

          <div className="profile-info">
            {userProfile?.bio && <p className="bio">{userProfile.bio}</p>}

            {/* EXISTING UPLOAD SECTION */}
            <div className="upload-section">
              <h3>Update Profile Picture</h3>
              <div className="file-input-container">
                <label className={`file-input-button ${profileFile ? 'file-selected' : ''}`}>
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  </svg>
                  <span>
                    {profileFile
                      ? `${profileFile.name.length > 25 ? profileFile.name.substring(0, 25) + '...' : profileFile.name}`
                      : 'Choose image file'
                    }
                  </span>
                  {profileFile && (
                    <div style={{
                      marginLeft: 'auto',
                      color: '#00ff7f',
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}>
                      ✓ READY
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setProfileFile(e.target.files[0]);
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              {profileFile && (
                <div className="file-preview">
                  <span>File loaded: {profileFile.name} ({(profileFile.size / 1024).toFixed(1)}KB)</span>
                </div>
              )}
              <button
                className={`upload-button ${isUploadingProfile ? 'loading' : ''}`}
                onClick={handleProfileUpload}
                disabled={!profileFile || isUploadingProfile}
              >
                {isUploadingProfile ? 'EXECUTING...' : 'EXECUTE UPLOAD'}
              </button>
              {message && (
                <div className="upload-message">
                  {message}
                </div>
              )}
            </div>

            {/* EXISTING POST MODAL */}
            {showPostModal && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <h3>Create New Post</h3>
                  <input type="file" accept="image/*" onChange={e => e.target.files && setPostFile(e.target.files[0])} />
                  <textarea
                    placeholder="Add a description..."
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                  />
                  <button onClick={handleCreatePost}>Post</button>
                  <button onClick={() => setShowPostModal(false)}>Cancel</button>
                </div>
              </div>
            )}

            {/* ADD CODE POST MODAL */}
            {showCodePostModal && (
              <div className="modal-overlay">
                <div className="modal-content code-modal">
                  <h3>Share Code Snippet</h3>
                  <div className="code-form">
                    <input
                      type="text"
                      placeholder="Filename (optional)"
                      value={codePostData.filename}
                      onChange={e => setCodePostData(prev => ({ ...prev, filename: e.target.value }))}
                    />
                    <select
                      value={codePostData.language}
                      onChange={e => setCodePostData(prev => ({ ...prev, language: e.target.value }))}
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="typescript">TypeScript</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                      <option value="html">HTML</option>
                      <option value="css">CSS</option>
                      <option value="other">Other</option>
                    </select>
                    <textarea
                      placeholder="Paste your code here..."
                      value={codePostData.code}
                      onChange={e => setCodePostData(prev => ({ ...prev, code: e.target.value }))}
                      rows={10}
                      className="code-textarea"
                    />
                    <textarea
                      placeholder="Add a description..."
                      value={codePostData.caption}
                      onChange={e => setCodePostData(prev => ({ ...prev, caption: e.target.value }))}
                    />
                  </div>
                  <div className="modal-actions">
                    <button onClick={createCodePost}>Share Code</button>
                    <button onClick={() => setShowCodePostModal(false)}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* EXISTING BUTTONS SECTION */}
            <div className="profile-buttons-section">
              <button onClick={() => setShowPosts(!showPosts)} className="profile-page-icon-buttons">
                <img src={postsIcon} alt="Posts" className="button-icon" />
              </button>
              <button onClick={() => setShowConnections(!showConnections)} className="profile-page-icon-buttons">
                <img src={groupConnectionsIcon} alt="Groups" />
              </button>
              <button onClick={() => setShowPostModal(true)} className="profile-page-icon-buttons">
                <img src={createPostIcon} />
              </button>
            </div>

            {/* UPDATED POSTS SECTION TO HANDLE CODE POSTS */}
            {showPosts && userProfile?.posts?.length ? (
              <div className="posts-list">
                <ul>
                  {userProfile.posts.map(post => (
                    <li key={post._id}>
                      {post.mediaType === 'image' && post.url && (
                        <img src={post.url} alt={post.caption} style={{ width: '100px', display: 'block' }} />
                      )}
                      {post.mediaType === 'video' && post.url && (
                        <video width="200" controls>
                          <source src={post.url} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      )}
                      {post.mediaType === 'code' && (
                        <div className="code-post">
                          <div className="code-header">
                            <span className="code-language">{post.language}</span>
                            {post.filename && <span className="code-filename">{post.filename}</span>}
                          </div>
                          <pre className="code-content">
                            <code>{post.code}</code>
                          </pre>
                          {post.caption && <p className="code-caption">{post.caption}</p>}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : showPosts && <p>No posts found.</p>}

            {showConnections && userProfile?.connections?.length ? (
              <div className="connections-list">
                <h3>Connected Groups / Friends</h3>
                <ul>
                  {userProfile.connections.map(conn => (
                    <li key={conn._id}>{conn.username}</li>
                  ))}
                </ul>
              </div>
            ) : showConnections && <p>No connections found.</p>}

          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;