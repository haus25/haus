"use client"

import { ThemeProvider } from "./themeProvider"
import { Footer } from "./footer"
import { AuthProvider } from "../contexts/auth"
import { EventsProvider } from "../contexts/events"
import { AuthGuard } from "../contexts/auth"

interface ClientWrapperProps {
  children: React.ReactNode
}

export function ClientWrapper({ children }: ClientWrapperProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <EventsProvider>
          <AuthGuard>
            <div className="flex flex-col min-h-screen">
              <div className="flex-1">{children}</div>
              <Footer />
            </div>
          </AuthGuard>
        </EventsProvider>
      </AuthProvider>
    </ThemeProvider>
  )
} 