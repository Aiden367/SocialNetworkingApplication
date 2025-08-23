import { connectToDatabase } from "./db/conn";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer, IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
const { User } = require("./routes/models"); // adjust path if needed
const user = require("./routes/user");

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server from Express app
const server = createServer(app);

// ---- WebSocket Setup ----
interface UsersMap {
  [userId: string]: WebSocket;
}
const users: UsersMap = {};

const wss = new WebSocketServer({ server });

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  console.log("✅ New WebSocket connection");

  // Parse userId from query param
  const params = new URLSearchParams(req.url?.split("?")[1]);
  const userId = params.get("userId");

  // ----- Ensure userId is provided -----
  if (!userId) {
    console.log("⚠️ WebSocket connected without userId, closing...");
    ws.close(1008, "Missing userId"); // 1008 = Policy Violation
    return;
  }

  // Register the user socket if not already registered
  if (!users[userId]) {
    users[userId] = ws;
    console.log("✅ WebSocket registered for user", userId);
  }

  ws.on("message", async (data: string | Buffer) => {
    try {
      const msg = JSON.parse(data.toString());
      const { type, sender, recipient, content } = msg;

      // ---- Handle chat messages ----
      if (type === "message" && sender && recipient && content) {
        const message = {
          content,
          sender,
          recipient,
          timestamp: new Date(),
          read: false,
        };

        // ---- Ensure conversation exists for sender ----
        const senderConvExists = await User.exists({ _id: sender, "conversations.participants": recipient });
        if (senderConvExists) {
          await User.updateOne(
            { _id: sender, "conversations.participants": recipient },
            {
              $push: { "conversations.$.messages": message },
              $set: { "conversations.$.lastUpdated": new Date() },
            }
          );
        } else {
          await User.updateOne(
            { _id: sender },
            {
              $push: {
                conversations: {
                  participants: [sender, recipient],
                  messages: [message],
                  lastUpdated: new Date(),
                },
              },
            }
          );
        }

        // ---- Ensure conversation exists for recipient ----
        const recipientConvExists = await User.exists({ _id: recipient, "conversations.participants": sender });
        if (recipientConvExists) {
          await User.updateOne(
            { _id: recipient, "conversations.participants": sender },
            {
              $push: { "conversations.$.messages": message },
              $set: { "conversations.$.lastUpdated": new Date() },
            }
          );
        } else {
          await User.updateOne(
            { _id: recipient },
            {
              $push: {
                conversations: {
                  participants: [sender, recipient],
                  messages: [message],
                  lastUpdated: new Date(),
                },
              },
            }
          );
        }

        // ---- Real-time delivery ----
        const recipientSocket = users[recipient];
        if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
          recipientSocket.send(JSON.stringify({ type: "message", message }));
        }

        // Echo back to sender
        ws.send(JSON.stringify({ type: "message", message }));
      }

      // ---- Handle registration message ----
      if (type === "register") {
        ws.send(JSON.stringify({ type: "system", text: "Registered successfully" }));
      }

    } catch (err) {
      console.error("❌ Error parsing message:", err);
    }
  });

  ws.on("close", () => {
    console.log("❌ WebSocket disconnected");
    if (userId && users[userId]) delete users[userId];
  });

  ws.on("error", (err) => {
    console.error("❌ WebSocket error for user", userId, err);
  });
});

// ---- Express Middlewares ----
app.use(cors());
app.use(helmet());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again after 15 minutes.",
});
app.use(limiter);

app.use("/user", user);

// ---- Start Server ----
connectToDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`✅ WebSocket ready on ws://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("❌ Failed to connect to the database", error);
    process.exit(1);
  });
