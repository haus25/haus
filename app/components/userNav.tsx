"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdownMenu"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { User, Wallet, Ticket, Brush, Settings, LogOut } from "lucide-react"
import { LoginModal } from "./loginModal"
import { WaitlistModal } from "./waitlist"
import { useAuth } from "../contexts/auth"

export function UserNav() {
  const { isConnected, isLoading, userProfile, disconnect, hasInviteAccess } = useAuth()
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false)

  const handleConnect = () => {
    if (!hasInviteAccess) {
      setIsWaitlistModalOpen(true)
    } else {
      setIsLoginModalOpen(true)
    }
  }

  if (isLoading) {
    return (
      <Button disabled className="bg-background text-foreground border border-input hover:bg-accent">
        Connecting...
      </Button>
    )
  }

  if (!isConnected || !userProfile) {
    return (
      <>
        <Button onClick={handleConnect} className="bg-background text-foreground border border-input hover:bg-accent">
          Connect Wallet
        </Button>
        {hasInviteAccess ? (
          <LoginModal
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
            redirectPath="/profile" // Redirect to profile after login
          />
        ) : (
          <WaitlistModal
            isOpen={isWaitlistModalOpen}
            onClose={() => setIsWaitlistModalOpen(false)}
            redirectPath="/event-market" // Redirect to event market after successful code entry
          />
        )}
      </>
    )
  }

  const displayName =
    userProfile.ensName ||
    userProfile.address.substring(0, 6) + "..." + userProfile.address.substring(userProfile.address.length - 4)
  const avatarSrc = userProfile.avatar || "/placeholder.svg?height=32&width=32"
  const initials = (userProfile.ensName || "WA").substring(0, 2).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarSrc} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userProfile.address.substring(0, 6) +
                "..." +
                userProfile.address.substring(userProfile.address.length - 4)}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile/events">
              <Brush className="mr-2 h-4 w-4" />
              <span>Your Events</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile/tickets">
              <Ticket className="mr-2 h-4 w-4" />
              <span>Your Tickets</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile/wallet">
              <Wallet className="mr-2 h-4 w-4" />
              <span>Wallet</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile/settings">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={disconnect}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
