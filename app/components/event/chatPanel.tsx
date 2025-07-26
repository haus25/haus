"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"
import { Send } from "lucide-react"
import { useAccount } from "wagmi"

interface ChatMessage {
  id: string
  sender: string
  message: string
  timestamp: number
  isSystem?: boolean
}

interface ChatPanelProps {
  eventId: string
  isLive: boolean
}

export default function ChatPanel({ eventId, isLive }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const { isConnected: walletConnected, address } = useAccount()

  // Initialize with welcome message and some sample chat
  useEffect(() => {
    const initialMessages: ChatMessage[] = [
      {
        id: "system-1",
        sender: "System",
        message: `Welcome to the event! ${isLive ? 'The stream is live!' : 'Waiting for stream to start...'}`,
        timestamp: Date.now(),
        isSystem: true
      },
      {
        id: "msg-1",
        sender: "alice123",
        message: "Amazing performance! 🎉",
        timestamp: Date.now() - 300000
      },
      {
        id: "msg-2",
        sender: "bob456",
        message: "This is incredible! Love the energy",
        timestamp: Date.now() - 240000
      },
      {
        id: "msg-3",
        sender: "charlie789",
        message: "Keep it up! 🔥",
        timestamp: Date.now() - 180000
      },
      {
        id: "msg-4",
        sender: "diana101",
        message: "When is the next song?",
        timestamp: Date.now() - 120000
      },
      {
        id: "msg-5",
        sender: "eve202",
        message: "This is my favorite part!",
        timestamp: Date.now() - 60000
      }
    ]
    
    setMessages(initialMessages)
  }, [isLive])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Initialize WebSocket connection for real-time chat
  useEffect(() => {
    if (!eventId) return

    // Simulate WebSocket connection
    const connectChat = () => {
      setIsConnected(true)
      console.log('CHAT: Connected to event chat:', eventId)
      
      // Simulate receiving messages periodically
      const interval = setInterval(() => {
        if (Math.random() > 0.7) { // 30% chance of new message
          const sampleMessages = [
            "Great stream! 👏",
            "Love this!",
            "Amazing work!",
            "When's the next one?",
            "This is fire! 🔥",
            "So talented!",
            "Can't stop watching",
            "Incredible performance"
          ]
          
          const randomMessage = sampleMessages[Math.floor(Math.random() * sampleMessages.length)]
          const randomUser = `user${Math.floor(Math.random() * 1000)}`
          
          const newMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            sender: randomUser,
            message: randomMessage,
            timestamp: Date.now()
          }
          
          setMessages(prev => [...prev, newMessage])
        }
      }, 8000) // New message every 8 seconds

      return () => clearInterval(interval)
    }

    const cleanup = connectChat()
    
    return cleanup
  }, [eventId])

  // Send message
  const sendMessage = () => {
    if (!newMessage.trim() || !walletConnected) return

    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "You",
      message: newMessage.trim(),
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, message])
    setNewMessage("")
  }

  // Handle enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Format time for messages
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Get display name for user
  const getDisplayName = (sender: string) => {
    if (sender === "System") return sender
    return sender
  }

  return (
    <div className="h-full flex flex-col bg-background">
      
      {/* Chat Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Live Chat</h3>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={isLive ? "default" : "secondary"} 
              className={isLive ? "bg-green-500 text-white" : ""}
            >
              <div className={`w-2 h-2 rounded-full mr-2 ${isLive ? 'bg-white animate-pulse' : 'bg-muted-foreground'}`}></div>
              {isLive ? 'Live' : 'Offline'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {messages.length} messages
            </Badge>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className="group">
            
            {/* System Messages */}
            {msg.isSystem ? (
              <div className="text-center">
                <Badge variant="secondary" className="text-xs">
                  {msg.message}
                </Badge>
              </div>
            ) : (
              /* Regular Messages */
              <div className="space-y-1">
                
                {/* Message Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {getDisplayName(msg.sender).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{getDisplayName(msg.sender)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatTime(msg.timestamp)}</span>
                </div>
                
                {/* Message Content */}
                <div className="text-sm">
                  {msg.message}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-4 border-t border-border bg-muted/30">
        
        {/* Connection Status */}
        {!isConnected && (
          <div className="mb-3 text-center">
            <Badge variant="outline" className="text-xs">
              Connecting to chat...
            </Badge>
          </div>
        )}

        {/* Input Area */}
        <div className="flex space-x-2">
          <div className="flex-1">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={walletConnected ? "Type a message..." : "Connect wallet to chat"}
              disabled={!walletConnected || !isConnected}
              className="bg-background"
            />
          </div>
          <Button 
            onClick={sendMessage} 
            disabled={!newMessage.trim() || !walletConnected || !isConnected}
            size="icon"
            className="bg-primary hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Chat Status */}
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          
          {!walletConnected && (
            <span>Connect wallet to participate</span>
          )}
        </div>
      </div>
    </div>
  )
}
