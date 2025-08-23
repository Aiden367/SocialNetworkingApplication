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

const Home: React.FC = () => {
  const { userId, token } = useUser();
  const [chatWs, setChatWs] = useState<ChatWebSocket | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [recipientUsername, setRecipientUsername] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize WebSocket
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

  // Fetch recipient ID and chat history
  useEffect(() => {
    const fetchRecipientAndHistory = async () => {
      const trimmedUsername = recipientUsername.trim();
      if (!trimmedUsername) {
        setRecipientId('');
        setMessages([]);
        return;
      }

      try {
        // 1️⃣ Get recipient ID
        const res = await fetch(
          `http://localhost:5000/user/by-username/${encodeURIComponent(trimmedUsername)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error('Recipient not found');

        const data = await res.json();
        setRecipientId(data._id);

        // 2️⃣ Get conversation history
        const convRes = await fetch(
          `http://localhost:5000/user/${userId}/conversation/${data._id}`,
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
        console.error('Error fetching recipient or conversation:', err);
        setRecipientId('');
        setMessages([]);
      }
    };

    fetchRecipientAndHistory();
  }, [recipientUsername, token, userId]);

  const sendMessage = () => {
    if (!chatWs || !recipientId || !chatInput) return;
    chatWs.sendMessage(recipientId, chatInput);

    // Optimistically add message to UI
    setMessages(prev => [
      ...prev,
      {
        type: 'message',
        sender: userId ?? undefined, // ensure string | undefined
        content: chatInput,
        timestamp: new Date().toISOString(),
      },
    ]);

    setChatInput('');
  };


  return (
    <>
      <Navbar />
      <div className="home-page-container">
        {/* Left side */}
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

        {/* Center */}
        <div className="center-wrapper">
          <div className="stories-container">
            <h4>Stories</h4>
            <ul>
              <li><a>Aiden</a></li>
              <li><a>Eric</a></li>
              <li><a>Carli</a></li>
            </ul>
          </div>
        </div>

        {/* Right side / Chat */}
        <div className="right-wrapper">
          <div className="friends-container">
            <h4>Friends</h4>
            <ul>
              <li><p>Alex</p></li>
              <li><p>Gary</p></li>
              <li><p>John</p></li>
            </ul>
          </div>

          <div className="groups-container">
            <h4>Groups</h4>
            <ul>
              <li><a>Fishing Group</a></li>
              <li><a>Rowing Group</a></li>
              <li><a>Shooting Group</a></li>
            </ul>
          </div>

          <div className="chat-container">
            <h4>Chat</h4>
            <input
              placeholder="Recipient Username"
              value={recipientUsername}
              onChange={e => setRecipientUsername(e.target.value)}
            />
            <div className="chat-messages">
              <ul>
                {messages.map((msg, index) => (
                  <li
                    key={index}
                    className={msg.sender === userId ? 'sent' : 'received'}
                  >
                    <strong>{msg.sender === userId ? 'You' : msg.sender || 'System'}:</strong> {msg.content || msg.text || ''}
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
            <button
              onClick={sendMessage}
              disabled={!recipientId || !chatInput || !recipientUsername.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
