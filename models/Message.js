const mongoose = require("mongoose")

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    edited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Message", messageSchema)
