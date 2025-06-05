const express = require("express")
const Message = require("../models/Message")
const Chat = require("../models/Chat")
const auth = require("../middleware/auth")

const router = express.Router()

// Get messages for a chat
router.get("/:chatId", auth, async (req, res) => {
  try {
    const { chatId } = req.params
    const { page = 1, limit = 50 } = req.query

    // Verify user is participant in chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.userId,
    })

    if (!chat) {
      return res.status(403).json({ message: "Access denied" })
    }

    const messages = await Message.find({ chat: chatId })
      .populate("sender", "username name avatar")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    res.json(messages.reverse())
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Send message
router.post("/", auth, async (req, res) => {
  try {
    const { chatId, content, messageType = "text" } = req.body

    // Verify user is participant in chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.userId,
    })

    if (!chat) {
      return res.status(403).json({ message: "Access denied" })
    }

    // Create message
    const message = new Message({
      sender: req.userId,
      chat: chatId,
      content,
      messageType,
    })

    await message.save()
    await message.populate("sender", "username name avatar")

    // Update chat's last message and activity
    chat.lastMessage = message._id
    chat.lastActivity = new Date()
    await chat.save()

    res.status(201).json(message)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

module.exports = router
