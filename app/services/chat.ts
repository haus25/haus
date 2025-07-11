import { Server as WebSocketServer } from "ws"
import { createServer } from "http"
import { v4 as uuidv4 } from "uuid"
import { verifyTicket } from "./event"

// Types
interface ChatMessage {
  id: string
  type: "message" | "tip" | "system" | "auth" | "join" | "history"
  eventId: string
  sender: string
  message: string
  timestamp: number
  isTip?: boolean
  tipAmount?: number
}

interface ChatClient {
  id: string
  socket: WebSocket
  eventId: string
  publicKey: string | null
  isAuthenticated: boolean
}

// Store messages in memory (in production, use a database)
const messageHistory: Record<string, ChatMessage[]> = {}
const clients: ChatClient[] = []

/**
 * Starts the chat WebSocket server
 */
export function startChatServer(port = 8080): void {
  const server = createServer()
  const wss = new WebSocketServer({ server })

  wss.on("connection", (socket: WebSocket) => {
    const clientId = uuidv4()

    // Add client to list
    const client: ChatClient = {
      id: clientId,
      socket,
      eventId: "",
      publicKey: null,
      isAuthenticated: false,
    }
    clients.push(client)

    // Handle messages
    socket.addEventListener("message", async (event) => {
      try {
        const data = JSON.parse(event.data.toString())

        // Handle different message types
        switch (data.type) {
          case "auth":
            // Authenticate user
            client.publicKey = data.publicKey
            client.isAuthenticated = true
            break

          case "join":
            // Join an event room
            client.eventId = data.eventId

            // Verify ticket if authenticated
            if (client.isAuthenticated && client.publicKey) {
              const hasTicket = await verifyTicket(data.eventId, client.publicKey)
              if (!hasTicket) {
                // Send error message
                socket.send(
                  JSON.stringify({
                    type: "system",
                    message: "You do not have a ticket for this event",
                  }),
                )

                // Close connection
                socket.close()
                return
              }
            }

            // Initialize message history for this event if it doesn't exist
            if (!messageHistory[data.eventId]) {
              messageHistory[data.eventId] = []
            }

            // Send message history to client
            socket.send(
              JSON.stringify({
                type: "history",
                messages: messageHistory[data.eventId],
              }),
            )
            break

          case "message":
            // Validate message
            if (!data.message || !data.eventId) {
              socket.send(
                JSON.stringify({
                  type: "system",
                  message: "Invalid message format",
                }),
              )
              return
            }

            // Create message object
            const message: ChatMessage = {
              id: uuidv4(),
              type: "message",
              eventId: data.eventId,
              sender: client.publicKey || "Guest",
              message: data.message,
              timestamp: Date.now(),
            }

            // Add to history
            if (messageHistory[data.eventId]) {
              messageHistory[data.eventId].push(message)

              // Limit history size
              if (messageHistory[data.eventId].length > 100) {
                messageHistory[data.eventId].shift()
              }
            }

            // Broadcast to all clients in the same event
            broadcastToEvent(data.eventId, message)
            break

          case "tip":
            // Create tip message
            const tipMessage: ChatMessage = {
              id: uuidv4(),
              type: "tip",
              eventId: data.eventId,
              sender: client.publicKey || "Guest",
              message: `Tipped ${data.amount} SOL!`,
              timestamp: Date.now(),
              isTip: true,
              tipAmount: data.amount,
            }

            // Add to history
            if (messageHistory[data.eventId]) {
              messageHistory[data.eventId].push(tipMessage)
            }

            // Broadcast to all clients in the same event
            broadcastToEvent(data.eventId, tipMessage)
            break
        }
      } catch (error) {
        console.error("Error handling message:", error)
      }
    })

    // Handle disconnection
    socket.addEventListener("close", () => {
      // Remove client from list
      const index = clients.findIndex((c) => c.id === clientId)
      if (index !== -1) {
        clients.splice(index, 1)
      }
    })
  })

  server.listen(port, () => {
    console.log(`Chat server running on port ${port}`)
  })
}

/**
 * Broadcasts a message to all clients in an event
 */
function broadcastToEvent(eventId: string, message: ChatMessage): void {
  clients.forEach((client) => {
    if (client.eventId === eventId && client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(message))
    }
  })
}

/**
 * Adds a tip message to the chat
 */
export function addTipMessage(eventId: string, publicKey: string, amount: number): void {
  const tipMessage: ChatMessage = {
    id: uuidv4(),
    type: "tip",
    eventId,
    sender: publicKey,
    message: `Tipped ${amount} SOL!`,
    timestamp: Date.now(),
    isTip: true,
    tipAmount: amount,
  }

  // Add to history
  if (messageHistory[eventId]) {
    messageHistory[eventId].push(tipMessage)
  } else {
    messageHistory[eventId] = [tipMessage]
  }

  // Broadcast to all clients in the event
  broadcastToEvent(eventId, tipMessage)
}
