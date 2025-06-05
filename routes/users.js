const express = require("express")
const User = require("../models/User")
const auth = require("../middleware/auth")

const router = express.Router()

// Search users
router.get("/search", auth, async (req, res) => {
  try {
    const { query } = req.query
    const currentUserId = req.userId

    if (!query) {
      return res.status(400).json({ message: "Search query is required" })
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: currentUserId } },
        {
          $or: [{ username: { $regex: query, $options: "i" } }, { name: { $regex: query, $options: "i" } }],
        },
      ],
    })
      .select("username name avatar isOnline lastSeen")
      .limit(10)

    res.json(users)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Get user profile
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password")
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

module.exports = router
