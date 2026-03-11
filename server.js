const express = require("express");
const bcrypt = require("bcrypt");
const http = require("http");
const { Server } = require("socket.io");
const { Pool } = require("pg");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.static("public"));

// PostgreSQL connection
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "chatapp",
  password: "JackAces",
  port: 5432
});

// CREATE PROFILE (REGISTER)
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
    res.status(500).json({ error: "Error creating profile" });
  }
});

// LOGIN ROUTE
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

// SOCKET.IO CHAT
io.on("connection", (socket) => {
  console.log("User connected");

  // User joins a room
  socket.on("join room", async (room) => {
    socket.join(room);

    // Load room history from PostgreSQL
    const result = await pool.query(
      `SELECT sender, content, timestamp
       FROM room_messages
       WHERE room_name = $1
       ORDER BY timestamp ASC`,
      [room]
    );

    socket.emit("roomHistory", result.rows);
  });

  // User sends a message
  socket.on("chat message", async ({ room, sender, content }) => {

    // Save message to PostgreSQL
    await pool.query(
      `INSERT INTO room_messages (room_name, sender, content, timestamp)
       VALUES ($1, $2, $3, NOW())`,
      [room, sender, content]
    );

    // Broadcast to the room only
    io.to(room).emit("chat message", {
      room,
      sender,
      content,
      timestamp: new Date()
    });
  });
});

// Start server
server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});