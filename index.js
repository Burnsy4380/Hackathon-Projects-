const pool = require('./db');
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const path = require("path");
app.use(express.static(path.join(__dirname)));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

async function ensurePresetRooms() {
  const presetRooms = ['General', 'Gaming', 'Support', 'Off Topic'];

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

io.on("connection", (socket) => {
  console.log("a user connected:", socket.id);

  // User joins a room
  socket.on("joinRoom", async (roomName) => {
    try {
      // Ensure room exists (preset or created on demand)
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
// User sends a message
  socket.on("chatMessage", async ({ roomName, sender, content }) => {
    try {
      console.log("Received message:", sender, content, "in room", roomName);
      // Get room ID
      const room = await pool.query(
        `SELECT id FROM rooms WHERE name = $1`,
        [roomName]
      );

      const roomId = room.rows[0].id;

      // Save message to DB
      await pool.query(
        `INSERT INTO messages (room_id, sender, content)
         VALUES ($1, $2, $3)`,
        [roomId, sender, content]
      );

      // Broadcast to room
      io.to(roomName).emit("message", {
        sender,
        content,
        timestamp: new Date()
      });

    } catch (err) {
      console.error("Error sending message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("a user disconnected:", socket.id);
  });
});

http.listen(3000, "0.0.0.0", () => {
  console.log("Server running on port 3000");
});


