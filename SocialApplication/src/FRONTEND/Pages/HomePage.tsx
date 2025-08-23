import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../../BACKEND/COMPONENTS/navbar';
import { useUser } from '../../BACKEND/context/UserContext';
import './Styles/HomePage.css';
import feedImage from "../Images/category.png";
import friendsImage from "../Images/friends.png";
import eventImage from "../Images/event.png";
import photosImage from "../Images/gallery.png";
import { ChatWebSocket, WebSocketMessage } from '../../BACKEND/websocket';

interface DisplayMessage {
  type: 'message' | 'system';
  sender?: string;
  content?: string;
  text?: string;
  timestamp?: string;
}

interface Friend {
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profilePhoto?: { url: string };
}

const Home: React.FC = () => {
  const { userId, token } = useUser();
  const [chatWs, setChatWs] = useState<ChatWebSocket | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [recipient, setRecipient] = useState<Friend | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [chatBarOpen, setChatBarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Ensure small chat bar is always closed on page load
  useEffect(() => {
    setChatBarOpen(false);
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Setup WebSocket connection
  useEffect(() => {
    if (!userId) return;
    const ws = new ChatWebSocket(userId, (msg: WebSocketMessage) => {
      if (!msg) return;
      if (msg.type === 'message') {
        const incoming = msg.message || msg;
        const { sender, content, timestamp } = incoming;
        if (!content) return;
        setMessages(prev => [...prev, { type: 'message', sender, content, timestamp }]);
      }
      if (msg.type === 'system' && msg.text) {
        setMessages(prev => [...prev, { type: 'system', text: msg.text }]);
      }
    });
    setChatWs(ws);
    return () => ws.close();
  }, [userId]);

  // Fetch all friends
  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) return;
      try {
        const res = await fetch("http://localhost:5000/user/all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        setFriends(data.filter((u: Friend) => u._id !== userId));
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    fetchUsers();
  }, [token, userId]);

  // Fetch conversation history
  useEffect(() => {
    const fetchHistory = async () => {
      if (!recipient || !userId || !token) {
        setMessages([]);
        return;
      }
      try {
        const convRes = await fetch(
          `http://localhost:5000/user/${userId}/conversation/${recipient._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!convRes.ok) throw new Error('Conversation not found');
        const convData = await convRes.json();
        const history: DisplayMessage[] = convData.messages.map((m: any) => ({
          type: 'message',
          sender: m.sender,
          content: m.content,
          timestamp: m.timestamp,
        }));
        setMessages(history);
      } catch (err) {
        console.error('Error fetching conversation:', err);
        setMessages([]);
      }
    };
    fetchHistory();
  }, [recipient, token, userId]);

  // Send a message
  const sendMessage = () => {
    if (!chatWs || !recipient || !chatInput) return;
    chatWs.sendMessage(recipient._id, chatInput);
    setMessages(prev => [
      ...prev,
      { type: 'message', sender: userId ?? undefined, content: chatInput, timestamp: new Date().toISOString() },
    ]);
    setChatInput('');
  };

  const openChatWindow = (friend: Friend) => {
    setRecipient(friend);
    setChatBarOpen(false); // Hide small chat bar when opening full chat
  };

  const closeChatWindow = () => {
    setRecipient(null);
    setMessages([]);
    setChatBarOpen(false); // Keep small chat bar closed when closing full chat
  };

  return (
    <>
      <Navbar />
      <div className="home-page-container">

        {/* LEFT SIDE */}
        <div className="left-side-wrapper">
          <div className="social-buttons-container">
            <ul>
              <li><img src={feedImage} alt="Feed" /><a>Feed</a></li>
              <li><img src={friendsImage} alt="Friends" /><a>Friends</a></li>
              <li><img src={eventImage} alt="Event" /><a>Event</a></li>
              <li><img src={photosImage} alt="Photos" /><a>Photos</a></li>
            </ul>
          </div>
          <div className="pages-you-like-container">
            <h4>PAGES YOU LIKE</h4>
            <ul>
              <li><a>Fashin Design</a></li>
              <li><a>Graphic Design</a></li>
              <li><a>Web Designer</a></li>
            </ul>
          </div>
        </div>

        {/* CENTER */}
        <div className="center-wrapper">
          <div className="stories-container">
            <h4>Stories</h4>
            <ul>
              {friends.map(friend => (
                <li key={friend._id} onClick={() => openChatWindow(friend)}>
                  <img className="friend-avatar" src={friend.profilePhoto?.url || '/default-avatar.png'} alt={friend.username} />
                  <span>{friend.username}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* SMALL CHAT TOGGLE BUTTON */}
        {!recipient && (
          <div className="chat-toggle-button" onClick={() => setChatBarOpen(prev => !prev)}>
            💬
          </div>
        )}

        {/* SMALL CHAT BAR */}
        {chatBarOpen && !recipient && (
          <div className="chat-bar open">
            <h4>Chats</h4>
            <ul className="chat-list">
              {friends.map(friend => {
                const latestMsg = messages
                  .filter(m => m.sender === friend._id || m.sender === userId)
                  .slice(-1)[0]?.content || '';
                return (
                  <li key={friend._id} onClick={() => openChatWindow(friend)}>
                    <img className="friend-avatar" src={friend.profilePhoto?.url || '/default-avatar.png'} alt={friend.username} />
                    <div className="chat-info">
                      <span className="username">{friend.username}</span>
                      <span className="latest-message">{latestMsg}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* FULL CHAT POPUP */}
        {recipient && (
          <div className="chat-popup">
            <div className="chat-header">
              <img className="friend-avatar-small" src={recipient.profilePhoto?.url || '/default-avatar.png'} alt={recipient.username} />
              <strong>{recipient.username}</strong>
              <button className="back-btn" onClick={closeChatWindow}>← Back</button>
            </div>
            <div className="chat-messages">
              <ul>
                {messages.map((msg, index) => (
                  <li key={index} className={msg.sender === userId ? 'sent' : 'received'}>
                     {msg.content || msg.text || ''}
                  </li>
                ))}
                <div ref={messagesEndRef} />
              </ul>
            </div>
            <input
              placeholder="Type a message..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage} disabled={!chatInput}>Send</button>
          </div>
        )}

      </div>
    </>
  );
};

export default Home;
