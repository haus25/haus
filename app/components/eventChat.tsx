"use client"

import type React from "react"
import { useRef, useEffect } from "react"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { MessageSquare, X, Send } from "lucide-react"

interface ChatMessage {
  id: number
  user: string
  message: string
  timestamp: string
  isSystem?: boolean
  isTip?: boolean
  tipAmount?: number
}

interface EventChatProps {
  messages: ChatMessage[]
  message: string
  onMessageChange: (message: string) => void
  onSendMessage: (e: React.FormEvent) => void
  height?: string
  isOverlay?: boolean
  isVisible?: boolean
  onToggleVisibility?: () => void
  className?: string
}

export function EventChat({
  messages,
  message,
  onMessageChange,
  onSendMessage,
  height = "400px",
  isOverlay = false,
  isVisible = true,
  onToggleVisibility,
  className = "",
}: EventChatProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      onSendMessage(e)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (isOverlay) {
    return (
      <div className={`
        h-full w-full flex flex-col
        ${className}
      `}>
        {/* Chat Messages */}
        <div 
          ref={chatContainerRef} 
          className="flex-1 overflow-y-auto p-3 space-y-3"
          style={{ height: 'calc(100% - 60px)' }}
        >
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-2">
              {!msg.isSystem && (
                <Avatar className="w-6 h-6 mt-1">
                  <AvatarFallback className="text-xs bg-white/20 text-white">
                    {msg.user.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex-1 min-w-0">
                {msg.isSystem ? (
                  <div className="text-center">
                    <span className="text-xs text-primary bg-primary/20 px-2 py-1 rounded">
                      {msg.message}
                    </span>
                  </div>
                ) : msg.isTip ? (
                  <div className="bg-primary/20 border border-primary/30 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-primary font-medium text-sm">{msg.user}</span>
                      <span className="text-xs text-white/70">
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    </div>
                    <p className="text-primary text-sm mt-1">
                      💰 Tipped {msg.tipAmount} SEI
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">{msg.user}</span>
                      <span className="text-xs text-white/50">
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    </div>
                    <p className="text-white/90 text-sm mt-1 break-words">{msg.message}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Chat Input */}
        <div className="p-3 border-t border-white/20">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-primary"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!message.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
            >
              <Send size={16} />
            </Button>
          </form>
        </div>
      </div>
    )
  }

  // Regular embedded chat (for tabs or right sidebar)
  return (
    <div className={`h-full flex flex-col ${className}`} style={{ height }}>
      {/* Chat Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-2">
            {!msg.isSystem && (
              <Avatar className="w-6 h-6 mt-1">
                <AvatarFallback className="text-xs bg-accent text-accent-foreground">
                  {msg.user.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              {msg.isSystem ? (
                <div className="text-center">
                  <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">
                    {msg.message}
                  </span>
                </div>
              ) : msg.isTip ? (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-medium text-sm">{msg.user}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-primary text-sm mt-1">
                    💰 Tipped {msg.tipAmount} SEI
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-card-foreground">{msg.user}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm mt-1 break-words text-card-foreground">{msg.message}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Chat Input */}
      <div className="p-3 border-t border-border">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-background border-border text-foreground focus:border-primary"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!message.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send size={16} />
          </Button>
        </form>
      </div>
    </div>
  )
}
