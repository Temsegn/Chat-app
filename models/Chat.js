const mongoose = require("mongoose")

const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Ensure only two participants per chat
chatSchema.pre("save", function (next) {
  if (this.participants.length !== 2) {
    return next(new Error("Chat must have exactly 2 participants"))
  }
  next()
})

module.exports = mongoose.model("Chat", chatSchema)
