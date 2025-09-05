import React, { useState, useEffect } from 'react';
import Navbar from '../../BACKEND/COMPONENTS/navbar';
import { useUser } from '../../BACKEND/context/UserContext';
import './Styles/ProfilePage.css';
import postsIcon from "../Images/category.png";
import groupConnectionsIcon from "../Images/group.png";
import createPostIcon from "../Images/more.png";

interface UserProfile {
  _id: string;
  username: string;
  role: 'user' | 'admin' | 'moderator';
  firstName?: string;
  lastName?: string;
  email?: string;
  bio?: string;
  jobTitle?: string; // ADD THIS LINE
  joinDate?: string;
  profilePhoto?: { url?: string; publicId?: string };
  connections?: { _id: string; username?: string }[];
  posts?: {
    _id: string;
    url: string;
    mediaType: 'image' | 'video';
    caption?: string;
    uploadDate: string;
    likes: string[];
    comments: { user: string; text: string; createdAt: string }[];
  }[];
}

const Profile: React.FC = () => {
  const { userId } = useUser();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isGeneratingJobTitle, setIsGeneratingJobTitle] = useState(false); // ADD THIS LINE
  const [isEditingJobTitle, setIsEditingJobTitle] = useState(false); // ADD THIS LINE
  const [tempJobTitle, setTempJobTitle] = useState(''); // ADD THIS LINE

  // State for profile picture
  const [profileFile, setProfileFile] = useState<File | null>(null);
  // State for posts
  const [postFile, setPostFile] = useState<File | null>(null);
  const [caption, setCaption] = useState<string>('');
  const [showPostModal, setShowPostModal] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [showPosts, setShowPosts] = useState(false);
  const [showConnections, setShowConnections] = useState(false);

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

  // PROFILE PHOTO UPLOAD
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

  // JOB TITLE GENERATION - ADD THESE FUNCTIONS
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

  // MANUAL JOB TITLE UPDATE
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

  // CREATE POST
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

            {/* JOB TITLE SECTION - ADD THIS */}
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
          </div>

          <div className="profile-info">
            {userProfile?.bio && <p className="bio">{userProfile.bio}</p>}
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
                      console.log('File selected:', e.target.files?.[0]); // Debug log
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
                onClick={() => {
                  console.log('Upload button clicked, file:', profileFile); // Debug log
                  handleProfileUpload();
                }}
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