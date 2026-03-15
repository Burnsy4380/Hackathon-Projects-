console.log("chat-script.js is running");

// Connect to the server
const socket = io();

// Load username from localStorage
const username = localStorage.getItem("username") || "Anonymous";

// Force login if no username
if (!username) {
  window.location.href = "profile.html";
}

let currentRoom = null;

// Join a room
document.getElementById("joinRoomBtn").addEventListener("click", () => {
  const room = document.getElementById("roomSelect").value.trim();
  if (!room) return;

  currentRoom = room;

  socket.emit("join room", room);

  document.getElementById("currentRoomLabel").textContent = "Room: " + room;
  document.getElementById("messages").innerHTML = "";
});

// Receive room history
socket.on("roomHistory", (messages) => {
  messages.forEach(msg => {
    addMessage(msg.sender, msg.content, msg.timestamp);
  });
});

// Send a message
document.getElementById("sendBtn").addEventListener("click", () => {
  const content = document.getElementById("messageInput").value.trim();
  if (!content || !currentRoom) return;

  socket.emit("chat message", {
    room: currentRoom,
    sender: username,
    content
  });

  document.getElementById("messageInput").value = "";
});

// Receive new messages
socket.on("chat message", (msg) => {
  if (msg.room !== currentRoom) return;
  addMessage(msg.sender, msg.content, msg.timestamp);
});
// Receive error messages from the server
socket.on("errorMessage", (msg) => {
  alert(msg); // or console.log(msg);
});

// Display a message
function addMessage(sender, content, timestamp) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");

  msgDiv.innerHTML = `
    <strong>${sender}</strong>: ${content}
    <span class="timestamp">${new Date(timestamp).toLocaleTimeString()}</span>
  `;

  document.getElementById("messages").appendChild(msgDiv);
}