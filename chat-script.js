// Connect to the server
const socket = io();

// Load profile from localStorage
const profile = JSON.parse(localStorage.getItem("profile")) || {};
const username = profile.username || "Anonymous";

let currentRoom = null;

// Join a room when the user clicks the button
document.getElementById("joinRoomBtn").addEventListener("click", () => {
  const roomName = document.getElementById("roomSelect").value.trim();
  if (!roomName) return;

  currentRoom = roomName;
  socket.emit("joinRoom", roomName);

  document.getElementById("currentRoomLabel").textContent = roomName;
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

  socket.emit("chatMessage", {
    roomName: currentRoom,
    sender: username,
    content
  });

  document.getElementById("messageInput").value = "";
});

// Receive new messages
socket.on("message", (msg) => {
  addMessage(msg.sender, msg.content, msg.timestamp);
});

// Display a message in the chat window
function addMessage(sender, content, timestamp) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");

  msgDiv.innerHTML = `
    <strong>${sender}</strong>: ${content}
    <span class="timestamp">${new Date(timestamp).toLocaleTimeString()}</span>
  `;

  document.getElementById("messages").appendChild(msgDiv);
}