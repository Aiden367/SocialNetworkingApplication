import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../../BACKEND/COMPONENTS/navbar';
import { useUser } from '../../BACKEND/context/UserContext';
import './Styles/HomePage.css';
import feedImage from "../Images/category.png";
import friendsImage from "../Images/friends.png";
import eventImage from "../Images/event.png";
import photosImage from "../Images/gallery.png";
import likePostImage from "../Images/application.png";
import commentPostImage from "../Images/code.png";
import { useNavigate } from 'react-router-dom';
import { ChatWebSocket, WebSocketMessage } from '../../BACKEND/websocket';

interface DisplayMessage {
  type: 'message' | 'system';
  sender?: string;
  recipientId?: string;
  content?: string;
  text?: string;
  timestamp?: string;
}

interface Story {
  _id: string;
  url: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: string;
  expiresAt: string;
}


interface Friend {
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profilePhoto?: { url: string };
  stories?: Story[]; // <-- add this line
}
interface NormalizedFriend extends Friend {
  user: string;
}

interface FriendRequest {
  _id: string;
  user: string | Friend;
  status: 'pending' | 'accepted' | 'rejected';
  date: string;
  username?: string;
  profilePhoto?: { url: string };
}

interface FriendResponse {
  friends: Friend[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}

interface Conversation {
  conversationId: string;
  friend: Friend | null; // backend guarantees friend is the other user
  lastMessage?: {
    content: string;
    sender: string | Friend;
    recipient?: string | Friend;
    timestamp: string;
  } | null;
}


const Home: React.FC = () => {
  const { userId, token } = useUser();
  const [chatWs, setChatWs] = useState<ChatWebSocket | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [recipient, setRecipient] = useState<Friend | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [otherUsers, setOtherUsers] = useState<Friend[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chatBarOpen, setChatBarOpen] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [friendsPosts, setFriendsPosts] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState<{ [postId: string]: string }>({});
  const [showCommentsModal, setShowCommentsModal] = useState<{ [postId: string]: boolean }>({});
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyPreview, setStoryPreview] = useState<string | null>(null);
  const [storyCaption, setStoryCaption] = useState('');
  const [showUploadStory, setShowUploadStory] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [currentStory, setCurrentStory] = useState<any | null>(null); // the story being viewed
  const [storiesFetched, setStoriesFetched] = useState(false)
  const [groups, setGroups] = useState<{ _id: string; name: string; profilePhoto?: { url: string } }[]>([]);
  const navigate = useNavigate();
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // WebSocket
  useEffect(() => {
    if (!userId) return;
    const ws = new ChatWebSocket(userId, (msg: WebSocketMessage) => {
      if (!msg) return;
      if (msg.type === 'message') {
        const { sender, content, timestamp, recipientId } = msg.message || msg;
        if (!content) return;
        setMessages(prev => [...prev, { type: 'message', sender, recipientId, content, timestamp }]);
      }
      if (msg.type === 'system' && msg.text) {
        setMessages(prev => [...prev, { type: 'system', text: msg.text }]);
      }
    });
    setChatWs(ws);
    return () => ws.close();
  }, [userId]);

  const handleStoryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setStoryFile(file);

    // preview image/video
    const reader = new FileReader();
    reader.onload = () => setStoryPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const fetchAllGroups = async () => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:5000/user/groups/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch groups');

      // Backend returns _id, name, profileImage
      const data: { _id: string; name: string; profileImage?: string }[] = await res.json();

      const normalizedGroups = data.map(g => ({
        _id: g._id, // or g.groupId if backend sends that
        name: g.name,
        profilePhoto: g.profileImage ? { url: g.profileImage } : undefined, // wrap profileImage in object with url
      }));

      setGroups(normalizedGroups);
    } catch (err) {
      console.error(err);
    }
  };


  const uploadStory = async () => {
    if (!storyFile || !userId || !token) return;

    const formData = new FormData();
    formData.append('storyMedia', storyFile);
    formData.append('caption', storyCaption);
    formData.append('privacy', 'friends'); // optional

    try {
      const res = await fetch(`http://localhost:5000/user/${userId}/upload-story`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      console.log('Story uploaded:', data);

      // reset
      setStoryFile(null);
      setStoryPreview(null);
      setStoryCaption('');
      fetchFriendsPosts(); // refresh feed if necessary
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch functions
  const fetchFriends = async () => {
    if (!token || !userId) return;
    try {
      const res = await fetch(`http://localhost:5000/user/${userId}/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch friends');
      const data: FriendResponse = await res.json();
      const normalizedFriends = data.friends.map(f => {
        const friendUser = (f as any).user;
        const uid = typeof friendUser === "string" ? friendUser : friendUser?._id || f._id;
        const username = typeof friendUser === "string" ? f.username : friendUser?.username || f.username;
        const profilePhoto = typeof friendUser === "string" ? f.profilePhoto : friendUser?.profilePhoto || f.profilePhoto;

        return {
          _id: f._id || uid,
          user: uid,  // <-- keep this so fetchStories works
          username,
          profilePhoto,
        } as NormalizedFriend;
      });
      setFriends(normalizedFriends);
      setIncomingRequests(data.incoming);
      setOutgoingRequests(data.outgoing);
    } catch (err) { console.error(err); }
  };

  const fetchOtherUsers = async () => {
    if (!token || !userId) return;
    try {
      const res = await fetch(`http://localhost:5000/user/${userId}/others`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch other users');
      const data: Friend[] = await res.json();
      setOtherUsers(data);
    } catch (err) { console.error(err); }
  };

  const fetchConversations = async () => {
    if (!token || !userId) return;
    try {
      const res = await fetch(`http://localhost:5000/user/${userId}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch conversations');

      const data: Conversation[] = await res.json();

      // No need to remap lastMessage, backend already normalized
      setConversations(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConversationMessages = async (friendId: string) => {
    if (!token || !userId) return;
    try {
      const res = await fetch(`http://localhost:5000/user/${userId}/conversation/${friendId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch conversation');
      const data: { messages: DisplayMessage[] } = await res.json();
      setMessages(data.messages.map(msg => ({
        type: 'message',
        sender: msg.sender,
        recipientId: msg.recipientId,
        content: msg.content,
        timestamp: msg.timestamp
      })));
    } catch (err) { console.error(err); }
  };
  useEffect(() => { fetchFriends(); fetchOtherUsers(); fetchConversations(); fetchAllGroups(); }, [token, userId]);

  const fetchFriendsPosts = async () => {
    if (!token || !userId) return;
    try {
      const res = await fetch(`http://localhost:5000/user/${userId}/friends`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch friends');
      const data: FriendResponse = await res.json();
      const normalizedFriends: NormalizedFriend[] = data.friends.map(f => {
        const friendUser = (f as any).user;
        const uid = typeof friendUser === 'string' ? friendUser : friendUser._id;
        const username = typeof friendUser === 'string' ? '' : friendUser.username;
        const profilePhoto = typeof friendUser === 'string' ? undefined : friendUser.profilePhoto;
        return { _id: f._id || uid, user: uid, username: f.username || username, profilePhoto: f.profilePhoto || profilePhoto };
      });
      const allPosts = await Promise.all(
        normalizedFriends.map(async (friend) => {
          if (!friend.user) return [];
          try {
            const friendRes = await fetch(`http://localhost:5000/user/${friend.user}/friend-data`, { headers: { Authorization: `Bearer ${token}` } });
            if (!friendRes.ok) return [];
            const friendData = await friendRes.json();
            return (friendData.posts || []).map((post: any) => ({
              ...post,
              userId: friendData._id,
              friendName: friendData.username,
              friendAvatar: friendData.profilePhoto?.url,
            }));
          } catch { return []; }
        })
      );
      setFriendsPosts(allPosts.flat());
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchFriendsPosts(); }, [token, userId]);


  const fetchStories = async () => {
    if (!token || !userId || !friends.length) return;

    const normalizedFriends: NormalizedFriend[] = friends
      .map(f => {
        const friendUser = (f as any).user;
        if (!friendUser) return null;

        const uid = typeof friendUser === 'string' ? friendUser : friendUser._id;
        const username = f.username || (typeof friendUser === 'object' ? friendUser.username : '');
        const profilePhoto = f.profilePhoto || (typeof friendUser === 'object' ? friendUser.profilePhoto : undefined);

        return { ...f, user: uid, username, profilePhoto };
      })
      .filter(Boolean) as NormalizedFriend[];

    const storiesByFriend: { [userId: string]: Story[] } = {};

    for (const friend of normalizedFriends) {
      if (!friend.user) continue;

      try {
        const res = await fetch(`http://localhost:5000/user/${friend.user}/stories`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) continue;

        const data = await res.json();

        // 🔥 Normalize stories so they match your frontend `Story` interface
        storiesByFriend[friend.user] = (data.stories || []).map((s: any) => ({
          _id: s._id,
          url: s.media?.url,
          mediaType: s.media?.mediaType,
          caption: s.media?.caption,
          createdAt: s.postedAt,
          expiresAt: s.expiresAt,
        }));
      } catch (err) {
        console.error(`Error fetching stories for ${friend.username}:`, err);
      }
    }

    setFriends(prev =>
      prev.map(f => {
        const friendUserId = (f as any).user;
        return { ...f, stories: storiesByFriend[friendUserId] || [] };
      })
    );
  };


  // Fetch stories when friends change
  useEffect(() => {
    if (friends.length && !storiesFetched) {
      fetchStories();
      setStoriesFetched(true);
    }
  }, [friends, storiesFetched]);

  // Friend Request actions
  const sendFriendRequest = async (targetId: string) => {
    if (!token || !userId) return;
    try {
      await fetch(`http://localhost:5000/user/${userId}/connect/${targetId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFriends(); fetchOtherUsers(); fetchConversations();
    } catch (err) { console.error(err); }
  };

  const acceptFriendRequest = async (requestId: string) => {
    if (!token || !userId) return;
    try {
      await fetch(`http://localhost:5000/user/${userId}/accept/${requestId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      fetchFriends(); fetchOtherUsers(); fetchConversations();
    } catch (err) { console.error(err); }
  };

  const rejectFriendRequest = async (requestId: string) => {
    if (!token || !userId) return;
    try {
      await fetch(`http://localhost:5000/user/${userId}/reject/${requestId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      fetchFriends(); fetchOtherUsers(); fetchConversations();
    } catch (err) { console.error(err); }
  };

  // Chat window functions
  const openChatWindow = (friend: Friend) => {
    setRecipient(friend);
    setChatBarOpen(true);
    fetchConversationMessages(friend._id); // fetch messages here
  };

  const closeChatWindow = () => { setRecipient(null); setMessages([]); setChatBarOpen(false); };



  const sendMessage = async () => {
    if (!recipient || !chatInput || !userId || !token) return;

    try {
      // Call backend to persist message
      const res = await fetch(`http://localhost:5000/user/${userId}/message/${recipient._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: chatInput }),
      });

      if (!res.ok) throw new Error("Failed to send message");
      const savedMessage = await res.json();

      // Optionally also send over WebSocket for realtime updates
      chatWs?.sendMessage(recipient._id, chatInput);

      // Update local state
      setMessages(prev => [
        ...prev,
        {
          type: "message",
          sender: userId,
          recipientId: recipient._id,
          content: savedMessage.content,
          timestamp: savedMessage.timestamp,
        },
      ]);

      setChatInput("");
      fetchConversations(); // refresh sidebar with latest message
    } catch (err) {
      console.error(err);
    }
  };


  const activeChats = conversations;

  return (
    <>
      <Navbar />
      <div className="home-page-container">

        {/* LEFT */}
        <div className="left-side-wrapper">
          <div className="social-buttons-container">
            <ul>
              <li><img src={feedImage} alt="Feed" /><span>Feed</span></li>
              <li>
                <img src={friendsImage} alt="Friends" /><span>Friends</span></li>
              <li>
                <a href="/CreateGroup" className="menu-link">
                  <img src={eventImage} alt="Event" />
                  <span>Event</span>
                </a>
              </li>
              <li onClick={() => setShowUploadStory(prev => !prev)}>
                <img src={photosImage} alt="Photos" />
                <span>Photos</span>
              </li>
            </ul>
          </div>
          {showUploadStory && (
            <div className="upload-story-modal">
              <div className="upload-story-modal-content">
                <button className="close-modal" onClick={() => setShowUploadStory(false)}>✖</button>
                <h4>Upload a Story</h4>
                <input type="file" accept="image/*,video/*" onChange={handleStoryFileChange} />
                {storyPreview && (
                  <div className="story-preview">
                    {storyFile?.type.startsWith('video') ? (
                      <video src={storyPreview} controls width={300}></video>
                    ) : (
                      <img src={storyPreview} alt="preview" width={300} />
                    )}
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Add a caption..."
                  value={storyCaption}
                  onChange={e => setStoryCaption(e.target.value)}
                />
                <button onClick={uploadStory} disabled={!storyFile}>Upload Story</button>
              </div>
            </div>
          )}
          <div className="pages-you-like-container">
            <h4>Groups</h4>
            <ul>
              {groups.length === 0 ? (
                <li>No groups yet</li>
              ) : (
                groups.map(group => (
                  <li
                    key={group._id}
                    className="clickable-group"
                    onClick={() => navigate(`/group/${group._id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <img
                      src={group.profilePhoto?.url || "/default-group-avatar.png"}
                      alt={group.name}
                      className="group-avatar"
                    />
                    <span>{group.name}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        {/* CENTER */}
        <div className="center-wrapper">
          {/* STORY BAR */}
          <h2 className="stories-heading">Stories</h2>
          <div className="story-bar-container">
            {friends.map(friend => {
              const story = friend.stories?.[0];
              if (!story) return null;
              return (
                <div key={friend._id} className="story-card">
                  {/* Thumbnail */}
                  {story.mediaType === "image" ? (
                    <img src={story.url} className="story-thumbnail" />
                  ) : (
                    <video src={story.url} className="story-thumbnail" muted />
                  )}
                  {/* Footer */}
                  <div className="story-footer">
                    <img
                      src={friend.profilePhoto?.url || "/default-avatar.png"}
                      className="story-footer-avatar"
                    />
                    <span className="story-footer-username">{friend.username}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* STORY PREVIEW MODAL */}
          {currentStory && (
            <div
              className="story-preview-overlay"
              onClick={() => setCurrentStory(null)}
            >
              {currentStory.mediaType === "image" ? (
                <img
                  src={currentStory.url}
                  alt="Story"
                  className="story-preview-media"
                />
              ) : (
                <video src={currentStory.url} controls className="story-preview-media" />
              )}
            </div>
          )}

          <h2>News Feed / Posts Section</h2>
          {friendsPosts.length === 0 ? (
            <p>No posts from friends yet.</p>
          ) : (
            <div className="posts-grid">
              {friendsPosts.map((post, idx) => (
                <div key={idx} className="post-card">
                  <div className="post-header">
                    <img
                      src={post.friendAvatar || '/default-avatar.png'}
                      alt={post.friendName}
                      className="post-avatar"
                    />
                    <span className="post-username">{post.friendName}</span>
                  </div>

                  {post.mediaType === 'image' && (
                    <img src={post.url} alt="post" className="post-image" />
                  )}

                  <p className="post-caption">{post.caption}</p>

                  <div className="post-actions">
                    <button
                      className={`like-btn ${post.likes?.includes(userId) ? 'liked' : ''}`}
                      onClick={async () => {
                        try {
                          const res = await fetch(
                            `http://localhost:5000/user/${post.userId}/posts/${post._id}/like`,
                            {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` },
                            }
                          );
                          const data = await res.json();
                          setFriendsPosts(prev =>
                            prev.map(p =>
                              p._id === post._id ? { ...p, likes: data.likes } : p
                            )
                          );
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                    >
                      <img src={likePostImage} alt="Like" className="comment-icon" />
                      {post.likes?.length || 0}
                    </button>

                    <button
                      className="comment-btn"
                      onClick={() =>
                        setShowCommentsModal(prev => ({ ...prev, [post._id]: true }))
                      }
                    >
                      <img src={commentPostImage} alt="Comment" className="comment-icon" />
                      {post.comments?.length || 0}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* RIGHT */}
        <div className="right-side-wrapper">
          <button className="manage-requests-btn" onClick={() => setShowRequestsModal(true)}>Manage Requests</button>
          <div className="friends-list-container">
            <h4>Friends</h4>
            <ul>
              {friends.map(f => (
                <li key={f._id} onClick={e => { e.preventDefault(); openChatWindow(f); }}>
                  <img className="friend-avatar" src={f.profilePhoto?.url || '/default-avatar.png'} alt={f.username || 'Unknown'} />
                  <span>{f.username || 'Unknown'}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="other-users-container">
            <h4>Recommend Users</h4>
            <ul>
              {otherUsers.map(user => (
                <li key={user._id}>
                  <img
                    className="friend-avatar"
                    src={user.profilePhoto?.url || "/default-avatar.png"}
                    alt={user.username || "Unknown"}
                  />
                  <span>{user.username || "Unknown"}</span>
                  <button
                    onClick={() => sendFriendRequest(user._id)}
                    className="send-request-btn"
                  >
                    Send Invite
                  </button>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Requests Modal */}
        {showRequestsModal && (
          <div className="requests-modal">
            <h4>Friend Requests</h4>
            <ul>
              {incomingRequests.map(req => (
                <li key={req._id}>
                  <img className="friend-avatar"
                    src={typeof req.user === 'string' ? req.profilePhoto?.url || '/default-avatar.png' : req.user.profilePhoto?.url || '/default-avatar.png'}
                    alt={typeof req.user === 'string' ? req.username || 'Unknown' : req.user.username} />
                  <span>{typeof req.user === 'string' ? req.username || 'Unknown' : req.user.username}</span>
                  <div className="friend-buttons">
                    <button onClick={() => acceptFriendRequest(typeof req.user === 'string' ? req.user : req.user._id)}>Accept</button>
                    <button onClick={() => rejectFriendRequest(typeof req.user === 'string' ? req.user : req.user._id)}>Reject</button>
                  </div>
                </li>
              ))}
            </ul>

            <h4>Pending Requests</h4>
            <ul>
              {outgoingRequests.map(req => (
                <li key={req._id}>
                  <img className="friend-avatar" src={typeof req.user === 'string' ? '/default-avatar.png' : req.user.profilePhoto?.url || '/default-avatar.png'} alt="user" />
                  <span>{typeof req.user === 'string' ? 'Unknown' : req.user.username} <em>(Pending)</em></span>
                </li>
              ))}
            </ul>

            <button className="requests-close" onClick={() => setShowRequestsModal(false)}>Close</button>
          </div>
        )}

        {/* CHAT TOGGLE */}
        {!recipient && <div className="chat-toggle-button" onClick={() => setChatBarOpen(prev => !prev)}>Messages</div>}

        {/* CHAT BAR */}
        {chatBarOpen && !recipient && (
          <div className="chat-bar open">
            <h4>Chats</h4>
            <ul className="chat-list">
              {activeChats.length > 0 ? (
                activeChats.map(chat => chat.friend ? (
                  <li key={chat.conversationId} onClick={(e) => {
                    e.preventDefault();
                    if (chat.friend) openChatWindow(chat.friend); // <-- type guard
                  }}>
                    <img className="friend-avatar" src={chat.friend.profilePhoto?.url || '/default-avatar.png'} alt={chat.friend.username || 'Unknown'} />
                    <div>
                      <span>{chat.friend.username || 'Unknown'}</span>
                      <p>{chat.lastMessage?.content || ''}</p>
                    </div>
                  </li>
                ) : null)
              ) : (
                <li>No active chats</li>
              )}

            </ul>
          </div>
        )}

        {/* CHAT WINDOW */}
        {recipient && (
          <div className="chat-window">
            <div className="chat-header">
              <img className="chat-recipient-avatar" src={recipient.profilePhoto?.url || '/default-avatar.png'} alt={recipient.username || 'Unknown'} />
              <h4>{recipient.username}</h4>
              <button onClick={closeChatWindow}>X</button>
            </div>
            <div className="chat-messages">
              {messages.map((msg, i) =>
                msg.type === 'system' ? (
                  <div key={i} className="system-message">{msg.text}</div>
                ) : (
                  <div key={i} className={`chat-message ${msg.sender === userId ? 'sent' : 'received'}`}>
                    <span>{msg.content}</span>
                  </div>
                )
              )}
              <div ref={messagesEndRef}></div>
            </div>
            <div className="chat-input">
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." />
              <button onClick={sendMessage}>Send</button>
            </div>
          </div>
        )}

        {/* COMMENTS MODAL */}
        {Object.entries(showCommentsModal).map(([postId, visible]) => {
          const post = friendsPosts.find(p => p._id === postId);
          if (!visible || !post) return null;

          return (
            <div key={postId} className="comments-modal">
              {/* Left side - Post Image */}
              <div className="comments-modal-left">
                {post.mediaType === 'image' && (
                  <img src={post.url} alt="Post" />
                )}
              </div>

              {/* Right side - Comments */}
              <div className="comments-modal-right">
                {/* Header */}
                <div className="comments-modal-header">
                  <img
                    src={post.friendAvatar || "/default-avatar.png"}
                    alt={post.friendName}
                    className="post-avatar"
                  />
                  <span>{post.friendName}</span>
                  <button
                    onClick={() =>
                      setShowCommentsModal(prev => ({ ...prev, [postId]: false }))
                    }
                  >
                    ✖
                  </button>
                </div>

                {/* Comments body */}
                <div className="comments-modal-body">
                  {post.comments?.map((c: any, i: number) => (
                    <div key={i} className="comment">
                      <img
                        src={c.user?.profilePhoto?.url || "/default-avatar.png"}
                        alt={c.user?.username || "Unknown"}
                      />
                      <div>
                        <strong>
                          {c.user?._id === userId ? "You" : c.user?.username || "Unknown"}
                        </strong>
                        <p>{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add comment form */}
                <form
                  className="comment-form"
                  onSubmit={async e => {
                    e.preventDefault();
                    const text = commentInput[post._id]?.trim();
                    if (!text) return;
                    try {
                      const res = await fetch(
                        `http://localhost:5000/user/${post.userId}/posts/${post._id}/comment`,
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ comment: text }),
                        }
                      );
                      const data = await res.json();
                      setFriendsPosts(prev =>
                        prev.map(p =>
                          p._id === post._id ? { ...p, comments: data.comments } : p
                        )
                      );
                      setCommentInput(prev => ({ ...prev, [post._id]: "" }));
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                >
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={commentInput[post._id] || ""}
                    onChange={e =>
                      setCommentInput(prev => ({
                        ...prev,
                        [post._id]: e.target.value,
                      }))
                    }
                  />
                  <button type="submit">Post</button>
                </form>
              </div>
            </div>
          );
        })}

      </div>
    </>
  );
};

export default Home;
