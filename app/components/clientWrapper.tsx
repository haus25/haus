"use client"

import { ThemeProvider } from "./themeProvider"
import { Footer } from "./footer"
import { DelegationProvider } from "../contexts/delegation"
import { AuthProvider } from "../contexts/auth"
import { EventsProvider } from "../contexts/events"
import { AuthGuard } from "./authGuard"

interface ClientWrapperProps {
  children: React.ReactNode
}

export function ClientWrapper({ children }: ClientWrapperProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <DelegationProvider>
          <EventsProvider>
            <AuthGuard>
              <div className="flex flex-col min-h-screen">
                <div className="flex-1">{children}</div>
                <Footer />
              </div>
            </AuthGuard>
          </EventsProvider>
        </DelegationProvider>
      </AuthProvider>
    </ThemeProvider>
  )
} 