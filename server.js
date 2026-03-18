const express = require("express");
const bcrypt = require("bcrypt");
const http = require("http");
const { Server } = require("socket.io");
const { Pool } = require("pg");
const multer = require("multer");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// Multer storage
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

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

// FILE UPLOAD ROUTE
app.post("/upload", upload.single("file"), async (req, res) => {
  console.log("UPLOAD ROUTE HIT");
  const fileUrl = `/uploads/${req.file.filename}`;
  const fileName = req.file.originalname;
  const sender = req.body.sender;
  const room = req.body.room;

  await pool.query(
    `INSERT INTO messages (room_id, sender, content, timestamp, type, file_url, file_name)
     VALUES ($1, $2, NULL, NOW(), 'file', $3, $4)`,
    [room, sender, fileUrl, fileName]
  );

  io.to(room).emit("fileMessage", {
    room,
    sender,
    fileName,
    url: fileUrl,
    timestamp: new Date()
  });

  res.json({ status: "ok" });
});

// SOCKET.IO CHAT
io.on("connection", (socket) => {
  console.log("User connected");

  // User joins a room
  socket.on("join room", async (room) => {
    socket.join(room);

    // Load room history from PostgreSQL
    const result = await pool.query(
      `SELECT sender, content, timestamp, type, file_url, file_name
       FROM messages
       WHERE room_id = $1
       ORDER BY timestamp ASC`,
      [room]
    );

    socket.emit("roomHistory", result.rows);
  });

  // User sends a message
  socket.on("chat message", async ({ room, sender, content }) => {

    // Save message to PostgreSQL
    await pool.query(
      `INSERT INTO messages (room_id, sender, content, timestamp, type)
       VALUES ($1, $2, $3, NOW(), 'text')`,
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