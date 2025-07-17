"use client"

import { Wallet, User, Brush, Ticket, Settings, LogOut } from "lucide-react"
import { DynamicWidget } from '@dynamic-labs/sdk-react-core'
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
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
import { useAuth } from "../contexts/auth"
import { SettingsModal } from "./settings"
import Link from "next/link"

export function UserNav() {
  const { userProfile, disconnect } = useAuth()

  if (!userProfile) {
    return <DynamicWidget />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={userProfile.avatar || ""} alt={userProfile.displayName || ""} />
            <AvatarFallback>
              {userProfile.displayName?.slice(0, 2).toUpperCase() || 
               userProfile.name?.slice(0, 2).toUpperCase() ||
               userProfile.address?.slice(2, 4).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {userProfile.displayName || userProfile.name || "Anonymous"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {userProfile.address?.slice(0, 6)}...{userProfile.address?.slice(-4)}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile?tab=info">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile?tab=events">
              <Brush className="mr-2 h-4 w-4" />
              <span>Your Events</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile?tab=tickets">
              <Ticket className="mr-2 h-4 w-4" />
              <span>Your Tickets</span>
            </Link>
          </DropdownMenuItem>
          <SettingsModal>
            <DropdownMenuItem onSelect={(e: Event) => e.preventDefault()}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
          </SettingsModal>
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
