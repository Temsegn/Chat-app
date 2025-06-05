const express = require("express")
const http = require("http")
const socketIo = require("socket.io")
const mongoose = require("mongoose")
const cors = require("cors")
const path = require("path")
require("dotenv").config()

const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/users")
const chatRoutes = require("./routes/chats")
const messageRoutes = require("./routes/messages")

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, "public")))

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/chatapp", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

const db = mongoose.connection
db.on("error", console.error.bind(console, "MongoDB connection error:"))
db.once("open", () => {
  console.log("Connected to MongoDB")
})

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/chats", chatRoutes)
app.use("/api/messages", messageRoutes)

// Serve static files
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

// Socket.IO connection handling
const connectedUsers = new Map()

io.on("connection", (socket) => {
  console.log("User connected:", socket.id)

  // User joins with their ID
  socket.on("user_connected", (userId) => {
    connectedUsers.set(userId, socket.id)
    socket.userId = userId

    // Broadcast user online status
    socket.broadcast.emit("user_status_change", {
      userId: userId,
      status: "online",
    })

    console.log(`User ${userId} is now online`)
  })

  // Join chat room
  socket.on("join_chat", (chatId) => {
    socket.join(chatId)
    console.log(`User ${socket.userId} joined chat ${chatId}`)
  })

  // Handle new message
  socket.on("send_message", (messageData) => {
    // Broadcast message to chat room
    socket.to(messageData.chatId).emit("receive_message", messageData)
    console.log("Message sent:", messageData)
  })

  // Handle typing indicators
  socket.on("typing_start", (data) => {
    socket.to(data.chatId).emit("user_typing", {
      userId: socket.userId,
      isTyping: true,
    })
  })

  socket.on("typing_stop", (data) => {
    socket.to(data.chatId).emit("user_typing", {
      userId: socket.userId,
      isTyping: false,
    })
  })

  // Handle disconnection
  socket.on("disconnect", () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId)

      // Broadcast user offline status
      socket.broadcast.emit("user_status_change", {
        userId: socket.userId,
        status: "offline",
      })

      console.log(`User ${socket.userId} disconnected`)
    }
  })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`)
})
