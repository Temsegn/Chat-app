const express = require("express")
const jwt = require("jsonwebtoken")
const User = require("../models/User")

const router = express.Router()

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, name, password } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" })
    }

    // Create new user
    const user = new User({ username, name, password })
    await user.save()

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || "your-secret-key", { expiresIn: "7d" })

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
      },
    })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body

    // Find user
    const user = await User.findOne({ username })
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // Update online status
    user.isOnline = true
    user.lastSeen = new Date()
    await user.save()

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || "your-secret-key", { expiresIn: "7d" })

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
      },
    })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

module.exports = router
