const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


// MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/chatProfiles", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));


// Profile Schema
const ProfileSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String
});

const Profile = mongoose.model("Profile", ProfileSchema);


// CREATE PROFILE (REGISTER)
app.post("/create-profile", async (req, res) => {

  try {

    const { username, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const newProfile = new Profile({
      username: username,
      email: email,
      password: hashedPassword
    });

    await newProfile.save();

    res.json({ message: "Profile saved successfully!" });

  } catch (error) {

    res.status(500).json({ error: "Error saving profile" });

  }

});


// LOGIN ROUTE
app.post("/login", async (req,res)=>{

  const { username, password } = req.body;

  const user = await Profile.findOne({ username });

  if(!user){
    return res.json({ message: "User not found" });
  }

  const validPassword = await bcrypt.compare(password,user.password);

  if(!validPassword){
    return res.json({ message: "Incorrect password" });
  }

  res.json({ message: "Login successful" });

});


// SOCKET.IO CHAT
io.on("connection",(socket)=>{

  console.log("User connected");

  socket.on("chat message",(msg)=>{

    io.emit("chat message",msg);

  });

});


// Start server
server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
