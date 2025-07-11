"use client"

import type React from "react"

import { useRef, useEffect } from "react"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Input } from "./ui/input"
import { Button } from "./ui/button"

interface ChatMessage {
  id: number
  user: string
  message: string
  timestamp: string
}

interface EventChatProps {
  messages: ChatMessage[]
  message: string
  onMessageChange: (message: string) => void
  onSendMessage: (e: React.FormEvent) => void
  height?: string
  isOverlay?: boolean
}

export function EventChat({
  messages,
  message,
  onMessageChange,
  onSendMessage,
  height = "400px",
  isOverlay = false,
}: EventChatProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  if (isOverlay) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-2 border-b border-white/20">
          <h3 className="text-white text-sm font-medium">Live Chat</h3>
        </div>
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-2 space-y-2">
          {messages.map((msg) => (
            <div key={msg.id} className="flex items-start space-x-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">{msg.user.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center space-x-1">
                  <span className="text-white text-xs font-medium">{msg.user}</span>
                  <span className="text-white/60 text-xs">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-white text-xs">{msg.message}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-2 border-t border-white/20">
          <form onSubmit={onSendMessage} className="flex space-x-1">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              className="flex-1 h-8 bg-white/10 border-white/20 text-white text-xs"
            />
            <Button type="submit" size="sm" className="h-8 px-2 py-0 bg-primary text-white">
              Send
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={chatContainerRef} className={`h-[${height}] overflow-y-auto p-4 space-y-4`}>
        {messages.map((msg) => (
          <div key={msg.id} className="flex items-start space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{msg.user.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium">{msg.user}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm">{msg.message}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t">
        <form onSubmit={onSendMessage} className="flex space-x-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" className="bg-primary text-white">
            Send
          </Button>
        </form>
      </div>
    </div>
  )
}
