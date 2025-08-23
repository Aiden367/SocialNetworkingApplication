// websocket.ts
type MessageType = 'register' | 'message' | 'system';

export interface WebSocketMessage {
  type: MessageType;
  sender?: string;
  recipient?: string;
  content?: string;
  text?: string;
  message?: any;
}

export class ChatWebSocket {
  private socket: WebSocket;
  private userId: string;

  constructor(userId: string, onMessage: (msg: WebSocketMessage) => void) {
    this.userId = userId;
    this.socket = new WebSocket(`ws://localhost:5000?userId=${userId}`);

    this.socket.onopen = () => {
      console.log('✅ Connected to WebSocket server');

      // Register this user with the server
      const registerMsg: WebSocketMessage = { type: 'register' };
      this.send(registerMsg);
    };

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);

        // Handle system messages
        if (data.type === 'system') {
          console.log('📢 System:', data.text);
        }

        // Handle incoming messages
        if (data.type === 'message' && data.message) {
          // Ensure the message has 'type' for React state
          const msgWithType: WebSocketMessage = {
            type: 'message',
            ...data.message
          };
          onMessage(msgWithType);
        }

      } catch (err) {
        console.error('❌ Error parsing WebSocket message:', err);
      }
    };

    this.socket.onclose = () => console.log('❌ WebSocket connection closed');
    this.socket.onerror = (err) => console.error('❌ WebSocket error:', err);
  }

  // Generic send function
  send(msg: WebSocketMessage) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    } else {
      console.error('❌ WebSocket not open. Cannot send message.');
    }
  }

  // Send a message to a recipient
  sendMessage(recipientId: string, content: string) {
    if (!recipientId || !content) return;

    const msg: WebSocketMessage = {
      type: 'message',
      sender: this.userId,
      recipient: recipientId,
      content,
    };
    this.send(msg);
  }

  // Public method to close the socket
  public close() {
    this.socket.close();
  }
}
