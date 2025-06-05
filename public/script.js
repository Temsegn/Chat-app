class ChatApp {
  constructor() {
    this.socket = null
    this.currentUser = null
    this.currentChat = null
    this.chats = []
    this.typingTimeout = null
    this.init()
  }

  init() {
    this.initializeElements()
    this.attachEventListeners()
    this.checkAuthStatus()
  }

  initializeElements() {
    // Auth elements
    this.authModal = document.getElementById("authModal")
    this.loginForm = document.getElementById("loginForm")
    this.registerForm = document.getElementById("registerForm")
    this.showRegisterBtn = document.getElementById("showRegister")
    this.showLoginBtn = document.getElementById("showLogin")

    // Chat app elements
    this.chatApp = document.getElementById("chatApp")
    this.currentUserName = document.getElementById("currentUserName")
    this.searchBtn = document.getElementById("searchBtn")
    this.logoutBtn = document.getElementById("logoutBtn")
    this.searchSection = document.getElementById("searchSection")
    this.userSearchInput = document.getElementById("userSearchInput")
    this.closeSearch = document.getElementById("closeSearch")
    this.searchResults = document.getElementById("searchResults")
    this.chatList = document.getElementById("chatList")
    this.welcomeScreen = document.getElementById("welcomeScreen")
    this.activeChat = document.getElementById("activeChat")
    this.activeChatName = document.getElementById("activeChatName")
    this.activeChatStatus = document.getElementById("activeChatStatus")
    this.userStatus = document.getElementById("userStatus")
    this.typingIndicator = document.getElementById("typingIndicator")
    this.messagesContainer = document.getElementById("messagesContainer")
    this.messages = document.getElementById("messages")
    this.messageInput = document.getElementById("messageInput")
    this.sendBtn = document.getElementById("sendBtn")
    this.loadingSpinner = document.getElementById("loadingSpinner")
    this.toastContainer = document.getElementById("toastContainer")
  }

  attachEventListeners() {
    // Auth form listeners
    this.showRegisterBtn.addEventListener("click", (e) => {
      e.preventDefault()
      this.showRegisterForm()
    })

    this.showLoginBtn.addEventListener("click", (e) => {
      e.preventDefault()
      this.showLoginForm()
    })

    this.loginForm.addEventListener("submit", (e) => {
      e.preventDefault()
      this.handleLogin()
    })

    this.registerForm.addEventListener("submit", (e) => {
      e.preventDefault()
      this.handleRegister()
    })

    // Chat app listeners
    this.logoutBtn.addEventListener("click", () => this.handleLogout())
    this.searchBtn.addEventListener("click", () => this.toggleSearch())
    this.closeSearch.addEventListener("click", () => this.toggleSearch())
    this.userSearchInput.addEventListener("input", (e) => this.handleUserSearch(e.target.value))
    this.messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.sendMessage()
      } else {
        this.handleTyping()
      }
    })
    this.sendBtn.addEventListener("click", () => this.sendMessage())

    // Handle typing stop
    this.messageInput.addEventListener("input", () => {
      if (this.messageInput.value.trim() === "") {
        this.stopTyping()
      }
    })
  }

  checkAuthStatus() {
    const token = localStorage.getItem("chatToken")
    if (token) {
      this.validateToken(token)
    }
  }

  async validateToken(token) {
    try {
      const response = await fetch("/api/users/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const user = await response.json()
        this.currentUser = user
        this.showChatApp()
        this.initializeSocket()
        this.loadChats()
      } else {
        localStorage.removeItem("chatToken")
      }
    } catch (error) {
      console.error("Token validation failed:", error)
      localStorage.removeItem("chatToken")
    }
  }

  showRegisterForm() {
    this.loginForm.classList.remove("active")
    this.registerForm.classList.add("active")
  }

  showLoginForm() {
    this.registerForm.classList.remove("active")
    this.loginForm.classList.add("active")
  }

  async handleLogin() {
    const username = document.getElementById("loginUsername").value
    const password = document.getElementById("loginPassword").value

    if (!username || !password) {
      this.showToast("Please fill in all fields", "error")
      return
    }

    this.showLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem("chatToken", data.token)
        this.currentUser = data.user
        this.showToast("Login successful!", "success")
        this.showChatApp()
        this.initializeSocket()
        this.loadChats()
      } else {
        this.showToast(data.message || "Login failed", "error")
      }
    } catch (error) {
      console.error("Login error:", error)
      this.showToast("Network error. Please try again.", "error")
    } finally {
      this.showLoading(false)
    }
  }

  async handleRegister() {
    const name = document.getElementById("registerName").value
    const username = document.getElementById("registerUsername").value
    const password = document.getElementById("registerPassword").value

    if (!name || !username || !password) {
      this.showToast("Please fill in all fields", "error")
      return
    }

    if (password.length < 6) {
      this.showToast("Password must be at least 6 characters", "error")
      return
    }

    this.showLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, username, password }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem("chatToken", data.token)
        this.currentUser = data.user
        this.showToast("Registration successful!", "success")
        this.showChatApp()
        this.initializeSocket()
        this.loadChats()
      } else {
        this.showToast(data.message || "Registration failed", "error")
      }
    } catch (error) {
      console.error("Registration error:", error)
      this.showToast("Network error. Please try again.", "error")
    } finally {
      this.showLoading(false)
    }
  }

  handleLogout() {
    localStorage.removeItem("chatToken")
    if (this.socket) {
      this.socket.disconnect()
    }
    this.currentUser = null
    this.currentChat = null
    this.chats = []
    this.showAuthModal()
    this.showToast("Logged out successfully", "success")
  }

  showChatApp() {
    this.authModal.classList.remove("active")
    this.chatApp.classList.add("active")
    this.currentUserName.textContent = this.currentUser.name
  }

  showAuthModal() {
    this.chatApp.classList.remove("active")
    this.authModal.classList.add("active")
    // Reset forms
    this.loginForm.reset()
    this.registerForm.reset()
    this.showLoginForm()
  }

  initializeSocket() {
    this.socket = io()

    this.socket.emit("user_connected", this.currentUser.id)

    this.socket.on("receive_message", (messageData) => {
      this.handleNewMessage(messageData)
    })

    this.socket.on("user_status_change", (data) => {
      this.updateUserStatus(data.userId, data.status)
    })

    this.socket.on("user_typing", (data) => {
      if (this.currentChat && data.userId !== this.currentUser.id) {
        this.showTypingIndicator(data.isTyping)
      }
    })
  }

  async loadChats() {
    try {
      const response = await fetch("/api/chats", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("chatToken")}`,
        },
      })

      if (response.ok) {
        this.chats = await response.json()
        this.renderChatList()
      }
    } catch (error) {
      console.error("Failed to load chats:", error)
    }
  }

  renderChatList() {
    if (this.chats.length === 0) {
      this.chatList.innerHTML = `
                <div class="no-chats">
                    <i class="fas fa-comments"></i>
                    <p>No conversations yet</p>
                    <span>Search for users to start chatting</span>
                </div>
            `
      return
    }

    this.chatList.innerHTML = this.chats
      .map((chat) => {
        const otherUser = chat.participants.find((p) => p._id !== this.currentUser.id)
        const lastMessage = chat.lastMessage ? chat.lastMessage.content : "No messages yet"
        const isOnline = otherUser.isOnline

        return `
                <div class="chat-item ${this.currentChat && this.currentChat._id === chat._id ? "active" : ""}" 
                     data-chat-id="${chat._id}" onclick="chatApp.selectChat('${chat._id}')">
                    <div class="avatar">
                        <i class="fas fa-user"></i>
                        ${isOnline ? '<div class="online-indicator"></div>' : ""}
                    </div>
                    <div class="chat-info">
                        <h4>${otherUser.name}</h4>
                        <p>${lastMessage}</p>
                    </div>
                    <div class="chat-meta">
                        <span>${this.formatTime(chat.lastActivity)}</span>
                    </div>
                </div>
            `
      })
      .join("")
  }

  async selectChat(chatId) {
    const chat = this.chats.find((c) => c._id === chatId)
    if (!chat) return

    this.currentChat = chat
    const otherUser = chat.participants.find((p) => p._id !== this.currentUser.id)

    // Update UI
    this.welcomeScreen.style.display = "none"
    this.activeChat.style.display = "flex"
    this.activeChatName.textContent = otherUser.name
    this.updateChatStatus(otherUser)

    // Join chat room
    this.socket.emit("join_chat", chatId)

    // Load messages
    await this.loadMessages(chatId)

    // Update chat list active state
    this.renderChatList()
  }

  updateChatStatus(user) {
    if (user.isOnline) {
      this.userStatus.textContent = "Online"
      this.userStatus.style.color = "var(--primary-color)"
    } else {
      this.userStatus.textContent = `Last seen ${this.formatTime(user.lastSeen)}`
      this.userStatus.style.color = "var(--text-secondary)"
    }
  }

  async loadMessages(chatId) {
    try {
      const response = await fetch(`/api/messages/${chatId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("chatToken")}`,
        },
      })

      if (response.ok) {
        const messages = await response.json()
        this.renderMessages(messages)
      }
    } catch (error) {
      console.error("Failed to load messages:", error)
    }
  }

  renderMessages(messages) {
    this.messages.innerHTML = messages
      .map((message) => {
        const isSent = message.sender._id === this.currentUser.id
        return `
                <div class="message ${isSent ? "sent" : "received"}">
                    <div class="message-content">${this.escapeHtml(message.content)}</div>
                    <div class="message-time">
                        ${this.formatTime(message.createdAt)}
                        ${isSent ? '<i class="fas fa-check message-status delivered"></i>' : ""}
                    </div>
                </div>
            `
      })
      .join("")

    // Scroll to bottom
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight
  }

  async sendMessage() {
    const content = this.messageInput.value.trim()
    if (!content || !this.currentChat) return

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("chatToken")}`,
        },
        body: JSON.stringify({
          chatId: this.currentChat._id,
          content,
        }),
      })

      if (response.ok) {
        const message = await response.json()

        // Add message to UI
        this.addMessageToUI(message, true)

        // Emit to socket
        this.socket.emit("send_message", {
          ...message,
          chatId: this.currentChat._id,
        })

        // Clear input
        this.messageInput.value = ""
        this.stopTyping()

        // Update chat list
        this.loadChats()
      }
    } catch (error) {
      console.error("Failed to send message:", error)
      this.showToast("Failed to send message", "error")
    }
  }

  handleNewMessage(messageData) {
    if (this.currentChat && messageData.chat === this.currentChat._id) {
      this.addMessageToUI(messageData, false)
    }

    // Update chat list
    this.loadChats()

    // Show notification if chat is not active
    if (!this.currentChat || messageData.chat !== this.currentChat._id) {
      this.showToast(`New message from ${messageData.sender.name}`, "success")
    }
  }

  addMessageToUI(message, isSent) {
    const messageElement = document.createElement("div")
    messageElement.className = `message ${isSent ? "sent" : "received"}`
    messageElement.innerHTML = `
            <div class="message-content">${this.escapeHtml(message.content)}</div>
            <div class="message-time">
                ${this.formatTime(message.createdAt)}
                ${isSent ? '<i class="fas fa-check message-status delivered"></i>' : ""}
            </div>
        `

    this.messages.appendChild(messageElement)
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight
  }

  handleTyping() {
    if (!this.currentChat) return

    this.socket.emit("typing_start", { chatId: this.currentChat._id })

    // Clear existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout)
    }

    // Set new timeout
    this.typingTimeout = setTimeout(() => {
      this.stopTyping()
    }, 3000)
  }

  stopTyping() {
    if (this.currentChat && this.typingTimeout) {
      this.socket.emit("typing_stop", { chatId: this.currentChat._id })
      clearTimeout(this.typingTimeout)
      this.typingTimeout = null
    }
  }

  showTypingIndicator(isTyping) {
    if (isTyping) {
      this.typingIndicator.style.display = "flex"
      this.userStatus.style.display = "none"
    } else {
      this.typingIndicator.style.display = "none"
      this.userStatus.style.display = "block"
    }
  }

  toggleSearch() {
    this.searchSection.classList.toggle("active")
    if (this.searchSection.classList.contains("active")) {
      this.userSearchInput.focus()
    } else {
      this.userSearchInput.value = ""
      this.searchResults.innerHTML = ""
    }
  }

  async handleUserSearch(query) {
    if (query.length < 2) {
      this.searchResults.innerHTML = ""
      return
    }

    try {
      const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("chatToken")}`,
        },
      })

      if (response.ok) {
        const users = await response.json()
        this.renderSearchResults(users)
      }
    } catch (error) {
      console.error("Search failed:", error)
    }
  }

  renderSearchResults(users) {
    if (users.length === 0) {
      this.searchResults.innerHTML = '<div class="search-result"><p>No users found</p></div>'
      return
    }

    this.searchResults.innerHTML = users
      .map(
        (user) => `
            <div class="search-result" onclick="chatApp.startChat('${user._id}')">
                <div class="avatar">
                    <i class="fas fa-user"></i>
                    ${user.isOnline ? '<div class="online-indicator"></div>' : ""}
                </div>
                <div class="search-result-info">
                    <h4>${user.name}</h4>
                    <p>@${user.username}</p>
                </div>
            </div>
        `,
      )
      .join("")
  }

  async startChat(userId) {
    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("chatToken")}`,
        },
        body: JSON.stringify({ participantId: userId }),
      })

      if (response.ok) {
        const chat = await response.json()

        // Add to chats if not exists
        const existingChat = this.chats.find((c) => c._id === chat._id)
        if (!existingChat) {
          this.chats.unshift(chat)
        }

        // Select the chat
        this.selectChat(chat._id)

        // Close search
        this.toggleSearch()

        this.showToast("Chat started!", "success")
      }
    } catch (error) {
      console.error("Failed to start chat:", error)
      this.showToast("Failed to start chat", "error")
    }
  }

  updateUserStatus(userId, status) {
    // Update in chats list
    this.chats.forEach((chat) => {
      const user = chat.participants.find((p) => p._id === userId)
      if (user) {
        user.isOnline = status === "online"
        if (status === "offline") {
          user.lastSeen = new Date()
        }
      }
    })

    // Update current chat status if applicable
    if (this.currentChat) {
      const otherUser = this.currentChat.participants.find((p) => p._id === userId)
      if (otherUser) {
        otherUser.isOnline = status === "online"
        this.updateChatStatus(otherUser)
      }
    }

    // Re-render chat list
    this.renderChatList()
  }

  showLoading(show) {
    if (show) {
      this.loadingSpinner.classList.add("active")
    } else {
      this.loadingSpinner.classList.remove("active")
    }
  }

  showToast(message, type = "success") {
    const toast = document.createElement("div")
    toast.className = `toast ${type}`
    toast.textContent = message

    this.toastContainer.appendChild(toast)

    // Remove after 3 seconds
    setTimeout(() => {
      toast.remove()
    }, 3000)
  }

  formatTime(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date

    // Less than 1 minute
    if (diff < 60000) {
      return "now"
    }

    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000)
      return `${minutes}m ago`
    }

    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      return `${hours}h ago`
    }

    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000)
      return `${days}d ago`
    }

    // Format as date
    return date.toLocaleDateString()
  }

  escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }
}

// Initialize the chat application
const chatApp = new ChatApp()
