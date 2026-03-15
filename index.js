const express = require("express");
const bcrypt = require("bcryptjs");
const http = require("http");
const { Server } = require("socket.io");
const pool = require("./db"); // uses your db.js

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.static("public")); // serve chat.html, profile.html, scripts, css

// -----------------------------
// USER AUTHENTICATION
// -----------------------------

// REGISTER
app.post("/create-profile", async (req, res) => {
  try {
    const { username, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (username, password)
       VALUES ($1, $2)`,
      [username, hashedPassword]
    );

    res.json({ message: "Profile created" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating profile" });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(
    `SELECT * FROM users WHERE username = $1`,
    [username]
  );

  const user = result.rows[0];

  if (!user) {
    return res.json({ message: "User not found" });
  }

  const validPassword = await bcrypt.compare(password, user.password);

  if (!validPassword) {
    return res.json({ message: "Incorrect password" });
  }

  res.json({
    message: "Login successful",
    username: user.username
  });
});

// -----------------------------
// PRESET ROOMS
// -----------------------------
async function ensurePresetRooms() {
  const presetRooms = ["General", "Gaming", "Support", "Off Topic"];

  for (const room of presetRooms) {
    await pool.query(
      `INSERT INTO rooms (name)
       VALUES ($1)
       ON CONFLICT (name) DO NOTHING`,
      [room]
    );
  }

  console.log("Preset rooms ensured.");
}
ensurePresetRooms();

// -----------------------------
// SOCKET.IO CHAT SYSTEM
// -----------------------------
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // JOIN ROOM
  socket.on("join room", async (roomName) => {
    try {
      // Ensure room exists
      const roomResult = await pool.query(
        `INSERT INTO rooms (name)
         VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [roomName]
      );

      const roomId = roomResult.rows[0].id;

      socket.join(roomName);
      console.log(`User ${socket.id} joined room: ${roomName}`);

      // Load message history
      const messages = await pool.query(
        `SELECT sender, content, timestamp
         FROM messages
         WHERE room_id = $1
         ORDER BY timestamp ASC`,
        [roomId]
      );

      socket.emit("roomHistory", messages.rows);

    } catch (err) {
      console.error("Error joining room:", err);
    }
  });

  // SEND MESSAGE
  socket.on("chat message", async ({ room, sender, content }) => {
  try {
    const MAX_LINE_LENGTH = 300;
    const MAX_WORDS = 200;

    // Line length check
    const lines = content.split("\n");
    for (const line of lines) {
      if (line.length > MAX_LINE_LENGTH) {
        socket.emit("errorMessage", `A single line cannot exceed ${MAX_LINE_LENGTH} characters.`);
        return;
      }
    }

    // Word count check
    const wordCount = content.trim().split(/\s+/).length;
    if (wordCount > MAX_WORDS) {
      socket.emit("errorMessage", `Messages cannot exceed ${MAX_WORDS} words.`);
      return;
    }

    // Continue with your existing logic
    const roomResult = await pool.query(
      `SELECT id FROM rooms WHERE name = $1`,
      [room]
    );

    const roomId = roomResult.rows[0].id;

    await pool.query(
      `INSERT INTO messages (room_id, sender, content, timestamp)
       VALUES ($1, $2, $3, NOW())`,
      [roomId, sender, content]
    );

    io.to(room).emit("chat message", {
      room,
      sender,
      content,
      timestamp: new Date()
    });

  } catch (err) {
    console.error("Error sending message:", err);
  }
});


  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// -----------------------------
// START SERVER
// -----------------------------
server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
