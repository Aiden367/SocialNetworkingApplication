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
    }
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
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <img
              src={userProfile?.profilePhoto?.url || '/CompImages/user.png'}
              alt="Profile"
              className="profile-photo"
            />
            <h2 className="profile-name">{userProfile?.firstName} {userProfile?.lastName}</h2>
            <p className="profile-username">@{userProfile?.username}</p>
          </div>

          <div className="profile-info">
            {userProfile?.bio && <p className="bio">{userProfile.bio}</p>}

            {/* PROFILE UPLOAD */}
            <div className="upload-section">
              <input type="file" accept="image/*" onChange={e => e.target.files && setProfileFile(e.target.files[0])} />
              <button onClick={handleProfileUpload}>Update Profile Photo</button>
            </div>



            {message && <p className="upload-message">{message}</p>}

            {/* POST MODAL */}
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
