const express = require("express")
const Chat = require("../models/Chat")
const Message = require("../models/Message")
const auth = require("../middleware/auth")

const router = express.Router()

// Get user's chats
router.get("/", auth, async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.userId,
    })
      .populate("participants", "username name avatar isOnline lastSeen")
      .populate("lastMessage")
      .sort({ lastActivity: -1 })

    res.json(chats)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Create or get existing chat
router.post("/", auth, async (req, res) => {
  try {
    const { participantId } = req.body
    const currentUserId = req.userId

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [currentUserId, participantId] },
    }).populate("participants", "username name avatar isOnline lastSeen")

    if (!chat) {
      // Create new chat
      chat = new Chat({
        participants: [currentUserId, participantId],
      })
      await chat.save()
      await chat.populate("participants", "username name avatar isOnline lastSeen")
    }

    res.json(chat)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

module.exports = router
