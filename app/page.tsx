"use client"

import { useState, lazy, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "./components/navbar"
import { Button } from "./components/ui/button"
import { HausLogo } from "./components/logo"
import { ArtCategoryIcon } from "./components/categoryIcons"
import { TvPlayer } from "./components/tvPlayer"
import { Web3InnovationGraphic } from "./components/web3Innovation"
import { Eye, DollarSign, Zap, Clock, Sparkles, Layers } from "lucide-react"
import { useAuth } from "./contexts/auth"
import { LoginModal } from "./components/loginModal"
import { WaitlistModal } from "./components/waitlist"
import { HIDDEN_MESSAGE_1 } from "./lib/constants"

// Lazy load components that aren't needed immediately
const RtaInfoModal = lazy(() => import("./components/rtaInfo").then((mod) => ({ default: mod.RtaInfoModal })))
const QuickAccess = lazy(() => import("./components/quickAccess").then((mod) => ({ default: mod.QuickAccess })))

// Loading fallback
const LoadingFallback = () => <div className="hidden">Loading...</div>

export default function Home() {
  const router = useRouter()
  const { isConnected, hasInviteAccess } = useAuth()
  const [showRtaModal, setShowRtaModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)
  const [currentRedirectPath, setCurrentRedirectPath] = useState("/ticket-kiosk")

  const handleConnect = (redirectPath?: string) => {
    // If a redirect path is provided, use it
    if (redirectPath) {
      setCurrentRedirectPath(redirectPath)
    }

    if (hasInviteAccess) {
      setShowLoginModal(true)
    } else {
      setShowWaitlistModal(true)
    }
  }

  const handleLoginSuccess = () => {
    setShowLoginModal(false)
    router.push("/ticket-kiosk")
  }

  const handleNavigate = (path: string) => {
    if (hasInviteAccess) {
      if (isConnected) {
        router.push(path)
      } else {
        setCurrentRedirectPath(path) // Store the path
        setShowLoginModal(true)
      }
    } else {
      setCurrentRedirectPath(path) // Store the path
      setShowWaitlistModal(true)
    }
  }

  return (
    <div className="min-h-screen flex flex-col texture-bg">
      <Navbar />

      <Suspense fallback={<LoadingFallback />}>
        <QuickAccess />
      </Suspense>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-28">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-3">
                  <HausLogo className="w-16 h-8" />
                  <h1 className="text-3xl font-bold bauhaus-text">HAUS</h1>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight uppercase">Reality, in the making.</h2>
                <p className="max-w-[700px] text-muted-foreground md:text-xl">
                  Experience live art performances and bid on digital assets in real-time. Connect with artists and
                  become part of the creative process.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                  <Button
                    size="lg"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => handleNavigate("/ticket-kiosk")}
                  >
                    DISCOVER EVENTS
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => handleNavigate("/event-factory")}>
                    CREATE EVENT
                  </Button>
                </div>
                {/* Hidden span with encrypted message */}
                <span className="hidden" data-jabyl={HIDDEN_MESSAGE_1}></span>
              </div>

              <div className="flex-1">
                <TvPlayer onConnect={handleConnect} />
              </div>
            </div>
          </div>
        </section>

        {/* Real-Time Assets Section - Simplified */}
        <section className="py-16 md:py-24 bg-secondary">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="bauhaus-title mb-4">
                REAL-TIME ASSETS (RTA<span className="lowercase">s</span>)
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                A revolutionary approach to digital ownership in Web3
              </p>
            </div>

            <div className="bauhaus-grid">
              <div className="flex flex-col items-center text-center p-6 bg-background rounded-lg border border-primary/20">
                <div className="p-3 bg-primary/10 rounded-full mb-4">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2 uppercase">Dynamic Creation</h3>
                <p className="text-muted-foreground">
                  Unlike traditional NFTs, RTAs evolve in real-time during live performances, capturing the entire
                  creative process.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 bg-background rounded-lg border border-primary/20">
                <div className="p-3 bg-primary/10 rounded-full mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2 uppercase">Interactive Value</h3>
                <p className="text-muted-foreground">
                  The value of an RTA is determined by audience participation and appreciation during the live event.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 bg-background rounded-lg border border-primary/20">
                <div className="p-3 bg-primary/10 rounded-full mb-4">
                  <Layers className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2 uppercase">Multi-layered Ownership</h3>
                <p className="text-muted-foreground">
                  RTAs distribute value across creators, curators, and participants, establishing a new paradigm for
                  collaboration.
                </p>
              </div>
            </div>

            <div className="flex justify-center mt-10">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => setShowRtaModal(true)}
              >
                LEARN MORE ABOUT RTA<span className="lowercase">s</span>
              </Button>
            </div>
          </div>
        </section>

        {/* Web3 Innovation Section */}
        <section className="py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col md:flex-row items-start gap-16">
              <div className="flex-1">
                <h2 className="bauhaus-title mb-4">Web3 Innovation</h2>
                <p className="text-muted-foreground mb-8">
                  RTAs represent the future of digital asset creation by combining:
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-haus-red/10 flex items-center justify-center rounded-sm">
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        className="text-haus-red"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>Real-time streaming to permanent decentralized storage</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-haus-red/10 flex items-center justify-center rounded-sm">
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        className="text-haus-red"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>Community-driven price discovery during creation</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-haus-red/10 flex items-center justify-center rounded-sm">
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        className="text-haus-red"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>Dynamic NFTs that evolve throughout performances</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-haus-red/10 flex items-center justify-center rounded-sm">
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        className="text-haus-red"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>Gasless tipping through account abstraction</span>
                  </li>
                </ul>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="w-full max-w-lg">
                  <Web3InnovationGraphic />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-secondary">
          <div className="container px-4 md:px-6">
            <div className="bauhaus-grid">
              <div className="flex flex-col items-center text-center space-y-4 p-6">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold uppercase">Watch Live</h3>
                <p className="text-muted-foreground">
                  Experience the creative process in real-time as artists perform and create.
                </p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4 p-6">
                <div className="p-2 bg-primary/10 rounded-full">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold uppercase">Bid & Collect</h3>
                <p className="text-muted-foreground">
                  Support artists by tipping during performances and collect unique NFTs.
                </p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4 p-6">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold uppercase">Create & Earn</h3>
                <p className="text-muted-foreground">
                  Artists can monetize their performances and creative process directly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-12 md:py-20">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-4 mb-12">
              <h2 className="bauhaus-title">Art Categories</h2>
              <p className="text-muted-foreground md:text-lg max-w-[700px]">
                Explore different types of live performances and creative processes.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[
                { name: "Standup Comedy", icon: "standup-comedy" },
                { name: "Performance Art", icon: "performance-art" },
                { name: "Poetry Slam", icon: "poetry-slam" },
                { name: "Open Mic / Improv", icon: "open-mic" },
                { name: "Live Painting", icon: "live-painting" },
                { name: "Creative Workshop", icon: "creative-workshop" },
              ].map((category) => (
                <div
                  key={category.name}
                  className="flex flex-col items-center text-center space-y-4 p-6 border rounded-lg hover:bg-secondary transition-colors"
                >
                  <ArtCategoryIcon category={category.icon as any} size="lg" className="text-primary" />
                  <h3 className="text-lg font-medium uppercase">{category.name}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 md:py-20 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <h2 className="bauhaus-title">Ready to Experience Art in a New Way?</h2>
              <p className="md:text-lg max-w-[700px]">
                Join Haus today and become part of a community that values creativity and supports artists.
              </p>
              <Button size="lg" variant="secondary" className="mt-4" onClick={handleConnect}>
                ENTER THE HAUS
              </Button>
            </div>
          </div>
        </section>
      </main>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} redirectPath={currentRedirectPath} />

      <WaitlistModal
        isOpen={showWaitlistModal}
        onClose={() => setShowWaitlistModal(false)}
        redirectPath={currentRedirectPath}
      />

      {showRtaModal && (
        <Suspense fallback={<LoadingFallback />}>
          <RtaInfoModal open={showRtaModal} onClose={() => setShowRtaModal(false)} />
        </Suspense>
      )}

      {/* Hidden comment with encrypted message */}
      {/* <!-- jabyl: cmVhbGl0eSAtIGlzIHlldCB0byBiZSBpbnZlbnRlZC4= --> */}
    </div>
  )
}
