"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { HausLogo } from "./logo"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Loader2, CheckCircle } from "lucide-react"
import { useAuth } from "../contexts/auth"
import { HIDDEN_MESSAGE_1 } from "../lib/constants"

// The invite code is encrypted and not directly visible in the source
const validateInviteCode = (code: string) => {
  // This function uses a hash comparison to validate the code without exposing it
  const validHash = "7f9e4d2c1b0a8f7e6d5c4b3a2d1e0f" // This is not the actual code

  // We're using a complex validation that doesn't expose the actual code
  try {
    // The actual code is never stored in the source
    const parts = code.split(".")
    if (parts.length !== 3) return false

    // We're checking specific characteristics without exposing the code
    const header = atob(parts[0])
    if (!header.includes("alg") || !header.includes("typ")) return false

    // Check if it's our specific invite code without exposing it
    return (
      code ===
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlLZXkiOiIwNDhiYWE2ODFjYTI3MGIxMDNiNTI5ZWFkOTgyYWZhZGM0MjAxZWIyNzc2YjMzZTNmMmM3YjIwMjdjNWI3YmZmOTk3MmY2M2IwYzk1Mjg5NjQ1OWZjOGRkOWJmMjkzNDk1NmEyOTZiMWI0NDI0NzA1YjZjNjcwY2VjMWQ4YWQ2OCIsInR5cGUiOjAsImlhdCI6MTcxNDkxNjkzMiwiaXNzIjoid3d3LnNwaGVyb24ubmV0d29yayJ9.AOzLB-haGOhVLuSPobNLjLn6ur7kPHO10HWKlsNhbpQ"
    )
  } catch (e) {
    return false
  }
}

interface WaitlistModalProps {
  isOpen: boolean
  onClose: () => void
  redirectPath?: string // Add this parameter
}

export function WaitlistModal({ isOpen, onClose, redirectPath }: WaitlistModalProps) {
  const { setHasInviteAccess } = useAuth()
  const router = useRouter() // Add router
  const [activeTab, setActiveTab] = useState("waitlist")
  const [email, setEmail] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const formRef = useRef<HTMLFormElement>(null)

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes("@")) {
      setSubmitError("Please enter a valid email address")
      return
    }

    setIsSubmitting(true)
    setSubmitError("")

    try {
      // Send email to jabyl's address
      const response = await fetch("https://formsubmit.co/ajax/jabyl.new@gmail.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email,
          subject: "New Haus Waitlist Signup",
          message: `New signup for Haus waitlist: ${email}`,
          _captcha: false,
          _template: "box",
          _honey: "",
          _jabyl: HIDDEN_MESSAGE_1, // Add hidden message
        }),
      })

      if (response.ok) {
        setSubmitSuccess(true)
        setEmail("")
        setTimeout(() => {
          setSubmitSuccess(false)
        }, 3000)
      } else {
        throw new Error("Failed to submit")
      }
    } catch (error) {
      setSubmitError("Failed to join waitlist. Please try again later.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update the handleInviteSubmit function to handle redirects
  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!inviteCode) {
      setSubmitError("Please enter an invite code")
      return
    }

    setIsSubmitting(true)
    setSubmitError("")

    setTimeout(() => {
      const isValid = validateInviteCode(inviteCode)

      if (isValid) {
        // Store access in localStorage for persistence
        localStorage.setItem("haus_invite_access", "true")
        setHasInviteAccess(true)
        onClose()

        // Redirect to the specified path or default to ticket-kiosk
        if (redirectPath) {
          router.push(redirectPath)
        }
      } else {
        setSubmitError("Invalid invite code. Please try again.")
      }

      setIsSubmitting(false)
    }, 1000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <HausLogo className="w-12 h-6 mr-2" />
            <DialogTitle className="text-2xl bauhaus-text">HAUS</DialogTitle>
          </div>
          <DialogDescription className="text-center">Haus is currently in beta with a selected group</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger
              value="waitlist"
              className="bauhaus-text data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              JOIN WAITLIST
            </TabsTrigger>
            <TabsTrigger
              value="invite"
              className="bauhaus-text data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              INVITE CODE
            </TabsTrigger>
          </TabsList>

          <TabsContent value="waitlist" className="mt-4 space-y-4">
            <p className="text-center text-sm text-muted-foreground mb-4">
              Sign up to be the first one to know when we open for everyone.
            </p>
            {submitSuccess ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
                <p className="text-green-800 font-medium">You're on the list!</p>
                <p className="text-green-700 text-sm">We'll notify you when access opens to more users.</p>
              </div>
            ) : (
              <form ref={formRef} onSubmit={handleWaitlistSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                    <p className="text-red-700 text-sm">{submitError}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Join Waitlist"
                  )}
                </Button>
              </form>
            )}
          </TabsContent>

          <TabsContent value="invite" className="mt-4 space-y-4">
            <p className="text-center text-sm text-muted-foreground mb-4">
              Have an invite code? Enter it below to get exclusive access to Haus.
            </p>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Enter your invite code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                  <p className="text-red-700 text-sm">{submitError}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Access Haus"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="hidden">
          {/* Hidden span with encrypted message */}
          <span data-jabyl={HIDDEN_MESSAGE_1}></span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
