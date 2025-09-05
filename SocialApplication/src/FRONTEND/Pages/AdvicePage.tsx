import React, { useState, useEffect } from 'react';
import Navbar from '../../BACKEND/COMPONENTS/navbar';
import { useUser } from '../../BACKEND/context/UserContext';
import './Styles/AdvicePage.css';

// Updated interfaces to include replies and voting
interface Author {
  _id: string;
  username: string;
  profilePhoto?: { url: string; publicId?: string };
  jobTitle?: string;
}

interface Reply {
  _id: string;
  author: Author;
  content: string;
  createdAt: string;
  upvotes: string[];
  downvotes: string[];
}

interface Response {
  _id: string;
  author: Author;
  content: string;
  createdAt: string;
  helpful: string[];
  upvotes: string[];
  downvotes: string[];
  verified: boolean;
  replies: Reply[];
}

interface AdvicePost {
  _id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  author: Author;
  anonymous: boolean;
  urgency: 'low' | 'medium' | 'high';
  status: 'open' | 'resolved' | 'closed';
  responses: Response[];
  views: number;
  followers: string[];
  createdAt: string;
  updatedAt: string;
}

const AdvicePage: React.FC = () => {
  const { userId, token } = useUser();
  const [posts, setPosts] = useState<AdvicePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('career');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [message, setMessage] = useState('');

  // Reply functionality state
  const [showReplyInputs, setShowReplyInputs] = useState<{ [key: string]: boolean }>({});
  const [replyInputs, setReplyInputs] = useState<{ [key: string]: string }>({});
  const [responseInputs, setResponseInputs] = useState<{ [key: string]: string }>({});

  // Programming-focused categories
  const categories = [
    { value: 'career', label: 'Career Advice', icon: '💼', description: 'Job searching, salary negotiation, career transitions' },
    { value: 'learning', label: 'Learning Path', icon: '📚', description: 'What to learn next, study strategies, skill development' },
    { value: 'projects', label: 'Project Ideas', icon: '🚀', description: 'Portfolio projects, side projects, open source' },
    { value: 'interview', label: 'Interview Prep', icon: '🎯', description: 'Technical interviews, coding challenges, preparation tips' },
    { value: 'technology', label: 'Tech Stack', icon: '⚡', description: 'Framework choices, technology decisions, best practices' },
    { value: 'freelance', label: 'Freelancing', icon: '🏃‍♂️', description: 'Client work, pricing, building a freelance business' },
    { value: 'startup', label: 'Startups', icon: '🌱', description: 'Founding companies, startup advice, entrepreneurship' },
    { value: 'other', label: 'Other', icon: '💭', description: 'General programming and tech discussions' }
  ];

  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'career',
    tags: '',
    anonymous: false,
    urgency: 'medium' as const
  });

  const fetchPosts = async () => {
    try {
      const queryParams = new URLSearchParams({
        category: activeCategory,
        status: selectedStatus,
        sort: sortBy
      });

      const response = await fetch(`http://localhost:5000/advice/all?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts);
      } else {
        setMessage('Failed to load advice posts');
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setMessage('Something went wrong while loading posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [activeCategory, selectedStatus, sortBy, token]);

  // Handle creating a new post
  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      setMessage('Title and content are required');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/advice/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newPost,
          tags: newPost.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        })
      });

      if (response.ok) {
        setMessage('Advice post created successfully!');
        setShowCreateModal(false);
        setNewPost({
          title: '',
          content: '',
          category: activeCategory,
          tags: '',
          anonymous: false,
          urgency: 'medium'
        });
        fetchPosts();
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to create post');
      }
    } catch (err) {
      console.error('Error creating post:', err);
      setMessage('Something went wrong while creating post');
    }
  };

  // Handle adding a response
  const handleAddResponse = async (postId: string) => {
    const content = responseInputs[postId];
    if (!content?.trim()) return;

    try {
      const response = await fetch(`http://localhost:5000/advice/${postId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(posts.map(post => 
          post._id === postId 
            ? { ...post, responses: [...post.responses, data.response] }
            : post
        ));
        setResponseInputs({ ...responseInputs, [postId]: '' });
        setMessage('Response added successfully!');
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to add response');
      }
    } catch (err) {
      console.error('Error adding response:', err);
      setMessage('Something went wrong while adding response');
    }
  };

  // Handle adding a reply to a response
  const handleAddReply = async (postId: string, responseId: string) => {
    const replyKey = `${postId}-${responseId}`;
    const content = replyInputs[replyKey];
    if (!content?.trim()) return;

    try {
      const response = await fetch(`http://localhost:5000/advice/${postId}/response/${responseId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(posts.map(post => 
          post._id === postId 
            ? {
                ...post,
                responses: post.responses.map(resp =>
                  resp._id === responseId
                    ? { ...resp, replies: [...resp.replies, data.reply] }
                    : resp
                )
              }
            : post
        ));
        setReplyInputs({ ...replyInputs, [replyKey]: '' });
        setShowReplyInputs({ ...showReplyInputs, [replyKey]: false });
        setMessage('Reply added successfully!');
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to add reply');
      }
    } catch (err) {
      console.error('Error adding reply:', err);
      setMessage('Something went wrong while adding reply');
    }
  };

  // Handle voting on responses
  const handleVoteResponse = async (postId: string, responseId: string, voteType: 'upvote' | 'downvote') => {
    try {
      const response = await fetch(`http://localhost:5000/advice/${postId}/response/${responseId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ voteType })
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(posts.map(post => 
          post._id === postId 
            ? {
                ...post,
                responses: post.responses.map(resp =>
                  resp._id === responseId
                    ? {
                        ...resp,
                        upvotes: data.userVote === 'upvote' 
                          ? [...(resp.upvotes.filter(id => id !== userId!)), userId!]
                          : resp.upvotes.filter(id => id !== userId!),
                        downvotes: data.userVote === 'downvote'
                          ? [...(resp.downvotes.filter(id => id !== userId!)), userId!]
                          : resp.downvotes.filter(id => id !== userId!)
                      }
                    : resp
                )
              }
            : post
        ));
      }
    } catch (err) {
      console.error('Error voting on response:', err);
    }
  };

  // Handle voting on replies
  const handleVoteReply = async (postId: string, responseId: string, replyId: string, voteType: 'upvote' | 'downvote') => {
    try {
      const response = await fetch(`http://localhost:5000/advice/${postId}/response/${responseId}/reply/${replyId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ voteType })
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(posts.map(post => 
          post._id === postId 
            ? {
                ...post,
                responses: post.responses.map(resp =>
                  resp._id === responseId
                    ? {
                        ...resp,
                        replies: resp.replies.map(reply =>
                          reply._id === replyId
                            ? {
                                ...reply,
                                upvotes: data.userVote === 'upvote' 
                                  ? [...(reply.upvotes.filter(id => id !== userId!)), userId!]
                                  : reply.upvotes.filter(id => id !== userId!),
                                downvotes: data.userVote === 'downvote'
                                  ? [...(reply.downvotes.filter(id => id !== userId!)), userId!]
                                  : reply.downvotes.filter(id => id !== userId!)
                              }
                            : reply
                        )
                      }
                    : resp
                )
              }
            : post
        ));
      }
    } catch (err) {
      console.error('Error voting on reply:', err);
    }
  };

  const handleMarkHelpful = async (postId: string, responseId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/advice/${postId}/response/${responseId}/helpful`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(posts.map(post => 
          post._id === postId 
            ? {
                ...post,
                responses: post.responses.map(resp =>
                  resp._id === responseId
                    ? {
                        ...resp,
                        helpful: data.isHelpful
                          ? [...resp.helpful, userId!]
                          : resp.helpful.filter(id => id !== userId)
                      }
                    : resp
                )
              }
            : post
        ));
      }
    } catch (err) {
      console.error('Error marking helpful:', err);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return '#ff4757';
      case 'medium': return '#ffa502';
      case 'low': return '#2ed573';
      default: return '#ffa502';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#00ff7f';
      case 'resolved': return '#3742fa';
      case 'closed': return '#747d8c';
      default: return '#00ff7f';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const getVoteScore = (upvotes: string[], downvotes: string[]) => {
    return upvotes.length - downvotes.length;
  };

  const getUserVote = (upvotes: string[], downvotes: string[]): 'upvote' | 'downvote' | null => {
    if (upvotes.includes(userId!)) return 'upvote';
    if (downvotes.includes(userId!)) return 'downvote';
    return null;
  };

  const toggleReplyInput = (responseId: string, postId: string) => {
    const key = `${postId}-${responseId}`;
    setShowReplyInputs({
      ...showReplyInputs,
      [key]: !showReplyInputs[key]
    });
  };

  if (loading) return <div className="advice-loading">Loading advice posts...</div>;

  return (
    <>
      <Navbar />
      <div className="advice-page-container">
        
        {/* Header */}
        <div className="advice-header">
          <div className="advice-title-section">
            <h1>Developer Advice Hub</h1>
            <p>Get career guidance, project ideas, and tech advice from the community</p>
          </div>
          
          <div className="advice-actions">
            <button 
              className="create-advice-btn"
              onClick={() => setShowCreateModal(true)}
            >
              Ask for Advice
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="category-tabs">
          {categories.map(category => (
            <button
              key={category.value}
              className={`category-tab ${activeCategory === category.value ? 'active' : ''}`}
              onClick={() => setActiveCategory(category.value)}
            >
              <span className="tab-icon">{category.icon}</span>
              <div className="tab-content">
                <span className="tab-label">{category.label}</span>
                <span className="tab-description">{category.description}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Active Category Info */}
        <div className="active-category-info">
          <div className="category-header">
            <h2>
              {categories.find(c => c.value === activeCategory)?.icon} {' '}
              {categories.find(c => c.value === activeCategory)?.label}
            </h2>
            <p>{categories.find(c => c.value === activeCategory)?.description}</p>
          </div>

          {/* Filters for active category */}
          <div className="category-filters">
            <div className="filter-group">
              <label>Status:</label>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Sort by:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="most_responses">Most Responses</option>
                <option value="most_views">Most Views</option>
                <option value="urgent">Most Urgent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Posts List */}
        <div className="advice-posts">
          {posts.length === 0 ? (
            <div className="no-posts">
              <div className="no-posts-icon">{categories.find(c => c.value === activeCategory)?.icon}</div>
              <h3>No posts in {categories.find(c => c.value === activeCategory)?.label} yet</h3>
              <p>Be the first to ask for advice in this category!</p>
              <button 
                className="create-first-post-btn"
                onClick={() => setShowCreateModal(true)}
              >
                Ask the First Question
              </button>
            </div>
          ) : (
            posts.map(post => (
              <div key={post._id} className="advice-post">
                <div className="advice-post-header">
                  <div className="post-meta">
                    <div className="author-info">
                      {!post.anonymous ? (
                        <>
                          <img 
                            src={post.author.profilePhoto?.url || '/default-avatar.png'} 
                            alt={post.author.username}
                            className="author-avatar"
                          />
                          <div className="author-details">
                            <span className="author-name">{post.author.username}</span>
                            {post.author.jobTitle && (
                              <span className="author-title">{post.author.jobTitle}</span>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="anonymous-avatar">🤐</div>
                          <div className="author-details">
                            <span className="author-name">Anonymous</span>
                            <span className="author-title">Identity Hidden</span>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="post-badges">
                      <span 
                        className="urgency-badge"
                        style={{ backgroundColor: getUrgencyColor(post.urgency) }}
                      >
                        {post.urgency.toUpperCase()}
                      </span>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(post.status) }}
                      >
                        {post.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="post-stats">
                    <span>{post.views} views</span>
                    <span>{post.responses.length} responses</span>
                    <span>{formatTimeAgo(post.createdAt)}</span>
                  </div>
                </div>

                <div className="advice-post-content">
                  <h3 className="post-title">{post.title}</h3>
                  <p className="post-content">{post.content}</p>
                  
                  {post.tags.length > 0 && (
                    <div className="post-tags">
                      {post.tags.map((tag, index) => (
                        <span key={index} className="tag">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Responses section with voting and replies */}
                <div className="advice-responses">
                  {post.responses.map(response => (
                    <div key={response._id} className="advice-response">
                      <div className="response-header">
                        <div className="response-author">
                          <img 
                            src={response.author.profilePhoto?.url || '/default-avatar.png'} 
                            alt={response.author.username}
                            className="response-avatar"
                          />
                          <div className="response-author-info">
                            <span className="response-author-name">{response.author.username}</span>
                            {response.author.jobTitle && (
                              <span className="response-author-title">{response.author.jobTitle}</span>
                            )}
                          </div>
                          {response.verified && (
                            <span className="verified-badge">✓ Verified</span>
                          )}
                        </div>
                        
                        <div className="response-actions">
                          {/* Voting buttons */}
                          <div className="vote-buttons">
                            <button 
                              className={`vote-btn upvote ${getUserVote(response.upvotes, response.downvotes) === 'upvote' ? 'active' : ''}`}
                              onClick={() => handleVoteResponse(post._id, response._id, 'upvote')}
                              disabled={response.author._id === userId}
                            >
                              ↑
                            </button>
                            <span className="vote-score">{getVoteScore(response.upvotes, response.downvotes)}</span>
                            <button 
                              className={`vote-btn downvote ${getUserVote(response.upvotes, response.downvotes) === 'downvote' ? 'active' : ''}`}
                              onClick={() => handleVoteResponse(post._id, response._id, 'downvote')}
                              disabled={response.author._id === userId}
                            >
                              ↓
                            </button>
                          </div>

                          <button 
                            className={`helpful-btn ${response.helpful.includes(userId!) ? 'helpful-active' : ''}`}
                            onClick={() => handleMarkHelpful(post._id, response._id)}
                          >
                            👍 {response.helpful.length}
                          </button>
                          
                          <button 
                            className="reply-btn"
                            onClick={() => toggleReplyInput(response._id, post._id)}
                          >
                            💬 Reply
                          </button>
                          
                          <span className="response-time">{formatTimeAgo(response.createdAt)}</span>
                        </div>
                      </div>
                      
                      <p className="response-content">{response.content}</p>

                      {/* Replies section */}
                      {response.replies && response.replies.length > 0 && (
                        <div className="replies-section">
                          {response.replies.map(reply => (
                            <div key={reply._id} className="reply">
                              <div className="reply-header">
                                <div className="reply-author">
                                  <img 
                                    src={reply.author.profilePhoto?.url || '/default-avatar.png'} 
                                    alt={reply.author.username}
                                    className="reply-avatar"
                                  />
                                  <div className="reply-author-info">
                                    <span className="reply-author-name">{reply.author.username}</span>
                                    {reply.author.jobTitle && (
                                      <span className="reply-author-title">{reply.author.jobTitle}</span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="reply-actions">
                                  {/* Reply voting buttons */}
                                  <div className="vote-buttons small">
                                    <button 
                                      className={`vote-btn upvote ${getUserVote(reply.upvotes, reply.downvotes) === 'upvote' ? 'active' : ''}`}
                                      onClick={() => handleVoteReply(post._id, response._id, reply._id, 'upvote')}
                                      disabled={reply.author._id === userId}
                                    >
                                      ↑
                                    </button>
                                    <span className="vote-score">{getVoteScore(reply.upvotes, reply.downvotes)}</span>
                                    <button 
                                      className={`vote-btn downvote ${getUserVote(reply.upvotes, reply.downvotes) === 'downvote' ? 'active' : ''}`}
                                      onClick={() => handleVoteReply(post._id, response._id, reply._id, 'downvote')}
                                      disabled={reply.author._id === userId}
                                    >
                                      ↓
                                    </button>
                                  </div>
                                  
                                  <span className="reply-time">{formatTimeAgo(reply.createdAt)}</span>
                                </div>
                              </div>
                              
                              <p className="reply-content">{reply.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply input */}
                      {showReplyInputs[`${post._id}-${response._id}`] && post.status === 'open' && (
                        <div className="reply-input-container">
                          <textarea
                            placeholder="Write a reply..."
                            value={replyInputs[`${post._id}-${response._id}`] || ''}
                            onChange={(e) => setReplyInputs({
                              ...replyInputs,
                              [`${post._id}-${response._id}`]: e.target.value
                            })}
                            maxLength={1000}
                            rows={3}
                          />
                          <div className="reply-input-actions">
                            <span className="char-count">
                              {(replyInputs[`${post._id}-${response._id}`] || '').length}/1000
                            </span>
                            <div className="reply-buttons">
                              <button 
                                onClick={() => toggleReplyInput(response._id, post._id)}
                                className="cancel-reply-btn"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={() => handleAddReply(post._id, response._id)}
                                disabled={!replyInputs[`${post._id}-${response._id}`]?.trim()}
                                className="submit-reply-btn"
                              >
                                Reply
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add Response */}
                  {post.status === 'open' && (
                    <div className="add-response">
                      <div className="response-input-container">
                        <textarea
                          placeholder="Share your advice..."
                          value={responseInputs[post._id] || ''}
                          onChange={(e) => setResponseInputs({
                            ...responseInputs,
                            [post._id]: e.target.value
                          })}
                          maxLength={1500}
                        />
                        <button 
                          onClick={() => handleAddResponse(post._id)}
                          disabled={!responseInputs[post._id]?.trim()}
                          className="submit-response-btn"
                        >
                          Share Advice
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="modal-overlay">
            <div className="modal-content advice-modal">
              <div className="modal-header">
                <h3>Ask for Advice - {categories.find(c => c.value === activeCategory)?.label}</h3>
                <button 
                  className="close-modal-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  ×
                </button>
              </div>

              <div className="create-post-form">
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    placeholder="What do you need advice about?"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    maxLength={200}
                  />
                  <span className="char-count">{newPost.title.length}/200</span>
                </div>

                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={newPost.category}
                    onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Urgency</label>
                    <select
                      value={newPost.urgency}
                      onChange={(e) => setNewPost({ ...newPost, urgency: e.target.value as any })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={newPost.anonymous}
                        onChange={(e) => setNewPost({ ...newPost, anonymous: e.target.checked })}
                      />
                      Post anonymously
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    placeholder="Describe your situation and what kind of advice you're looking for..."
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    maxLength={2000}
                    rows={6}
                  />
                  <span className="char-count">{newPost.content.length}/2000</span>
                </div>

                <div className="form-group">
                  <label>Tags (optional)</label>
                  <input
                    type="text"
                    placeholder="Separate tags with commas (e.g., react, job-search, remote)"
                    value={newPost.tags}
                    onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
                  />
                </div>

                <div className="modal-actions">
                  <button 
                    className="submit-btn"
                    onClick={handleCreatePost}
                    disabled={!newPost.title.trim() || !newPost.content.trim()}
                  >
                    Post Advice Request
                  </button>
                  <button 
                    className="cancel-btn"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div className="message-toast">
            {message}
            <button onClick={() => setMessage('')}>×</button>
          </div>
        )}
      </div>
    </>
  );
};

export default AdvicePage;