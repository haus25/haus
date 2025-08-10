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
import { HIDDEN_MESSAGE_1 } from "./lib/constants"
import { UndergroundSection, ChaosGrid, AsymmetricContent, HandDrawnContainer, ElectricAccent, ParallaxWrapper } from "./components/undergroundLayout"
import dynamic from "next/dynamic"

// 3D Loading fallback
const Loading3D = () => (
  <div className="flex items-center justify-center h-full">
    <div className="w-8 h-8 bg-bauhaus-red/20 animate-pulse transform rotate-45"></div>
  </div>
)

// Note: 3D components removed to prevent WebGL context exhaustion

// Lazy load components that aren't needed immediately
const RtaInfoModal = lazy(() => import("./components/rtaInfo").then((mod) => ({ default: mod.RtaInfoModal })))
const QuickAccess = lazy(() => import("./contexts/auth").then((mod) => ({ default: mod.QuickAccess })))

// Loading fallback
const LoadingFallback = () => <div className="hidden">Loading...</div>

export default function Home() {
  const router = useRouter()
  const { isConnected } = useAuth()
  const [showRtaModal, setShowRtaModal] = useState(false)

  const handleConnect = (redirectPath?: string) => {
    // This function is for connecting wallet, handled by auth context
  }

  const handleNavigate = (path: string) => {
    router.push(path)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <Suspense fallback={<LoadingFallback />}>
        <QuickAccess />
      </Suspense>

      <main className="flex-1">
        {/* Hero Section - Underground Revolution */}
        <UndergroundSection 
          title="reality, in the making"
          quote="the stage eats the performer who feeds the audience"
          has3D={false}
          className="py-20 md:py-28"
        >
          <div className="container px-4 md:px-6">
            <AsymmetricContent variant="chaos">
              <div className="space-y-8">
                <div className="flex items-center gap-4 transform -skew-x-1">
                  <HausLogo className="w-20 h-10 glitch" />
                  <ElectricAccent intensity="intense">haus²⁵</ElectricAccent>
                </div>
                
                <ParallaxWrapper speed={0.3}>
                  <p className="max-w-[700px] text-lg font-medium leading-relaxed transform skew-x-0.5">
                    experience live performances and tip in real-time to connect with artists,
                    become part of the creative process, and own the final Video NFT.
                  </p>
                </ParallaxWrapper>
                
                <div className="flex flex-col sm:flex-row gap-6 mt-12">
                  <Button
                    size="lg"
                    variant="underground"
                    onClick={() => handleNavigate("/kiosk")}
                  >
                    discover events
                  </Button>
                  <Button size="lg" variant="electric" onClick={() => handleNavigate("/factory")}>
                    create event
                  </Button>
                </div>
                {/* Hidden span with encrypted message */}
                <span className="hidden" data-jabyl={HIDDEN_MESSAGE_1}></span>
              </div>

              <HandDrawnContainer className="transform rotate-2 hover:rotate-0 transition-all duration-500">
                <TvPlayer onConnect={handleConnect} />
              </HandDrawnContainer>
              
              {/* Underground aesthetic accent */}
              <div className="hidden md:block w-full h-48 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-8">
                  <div className="text-6xl font-black text-bauhaus-red transform -rotate-12 opacity-20">live</div>
                  <div className="text-6xl font-black text-bauhaus-electric transform rotate-12 opacity-20">real</div>
                </div>
              </div>
            </AsymmetricContent>
          </div>
        </UndergroundSection>

        {/* Real-Time Assets Section - Underground Manifesto */}
        <UndergroundSection 
          title="real-time assets (rtas)"
          quote="chaos is just order waiting to be discovered"
          className="py-16 md:py-24 bg-bauhaus-concrete"
        >
          <div className="container px-4 md:px-6">
            <ParallaxWrapper speed={0.2}>
              <div className="text-center mb-16 transform -skew-y-0.5">
                <p className="text-xl font-bold max-w-3xl mx-auto brutal-text">
                  a revolutionary approach to digital ownership in web3
                </p>
              </div>
            </ParallaxWrapper>

            <ChaosGrid>
              <HandDrawnContainer className="text-center p-8 transform -rotate-1 hover:rotate-0 transition-all duration-500">
                <div className="p-4 bg-bauhaus-red/20 mb-6 transform rotate-2">
                  <Clock className="h-12 w-12 text-bauhaus-red mx-auto" />
                </div>
                <h3 className="text-xl font-black mb-4 graffiti-underline">dynamic creation</h3>
                <p className="text-muted-foreground font-medium">
                  unlike traditional nfts, rtas evolve in real-time during live performances, capturing the entire
                  creative process.
                </p>
              </HandDrawnContainer>

              <HandDrawnContainer className="text-center p-8 transform rotate-1 hover:rotate-0 transition-all duration-500">
                <div className="p-4 bg-bauhaus-electric/20 mb-6 transform -rotate-1">
                  <Sparkles className="h-12 w-12 text-bauhaus-electric mx-auto" />
                </div>
                <h3 className="text-xl font-black mb-4 graffiti-underline">interactive value</h3>
                <p className="text-muted-foreground font-medium">
                  the value of an rta is determined by audience participation and appreciation during the live event.
                </p>
              </HandDrawnContainer>

              <HandDrawnContainer className="text-center p-8 transform -rotate-0.5 hover:rotate-0 transition-all duration-500">
                <div className="p-4 bg-bauhaus-void/20 mb-6 transform rotate-1">
                  <Layers className="h-12 w-12 text-bauhaus-void mx-auto" />
                </div>
                <h3 className="text-xl font-black mb-4 graffiti-underline">multi-layered ownership</h3>
                <p className="text-muted-foreground font-medium">
                  rtas distribute value across creators, curators, and participants, establishing a new paradigm for
                  collaboration.
                </p>
              </HandDrawnContainer>
            </ChaosGrid>

            <div className="flex justify-center mt-16">
              <Button
                size="lg"
                variant="underground"
                onClick={() => setShowRtaModal(true)}
              >
                learn more about rtas
              </Button>
            </div>
          </div>
        </UndergroundSection>

        {/* Web3 Innovation Section - Underground Tech */}
        <UndergroundSection 
          title="web3 innovation"
          quote="authentic voice breaks through digital noise"
          className="py-16 md:py-24"
        >
          <div className="container px-4 md:px-6">
            <AsymmetricContent variant="default">
              <div className="space-y-8">
                <ParallaxWrapper speed={0.2}>
                  <p className="text-muted-foreground mb-8 font-medium transform skew-x-0.5">
                    rtas represent the future of digital asset creation by combining:
                  </p>
                </ParallaxWrapper>
                
                <div className="space-y-6">
                  {[
                    "real-time streaming to permanent decentralized storage",
                    "community-driven price discovery during creation", 
                    "dynamic nfts that evolve throughout performances",
                    "gasless tipping through account abstraction"
                  ].map((feature, index) => (
                    <div key={feature} className={`flex items-center gap-4 transform ${index % 2 === 0 ? 'skew-x-1' : '-skew-x-1'}`}>
                      <div className="w-8 h-8 bg-bauhaus-red/20 flex items-center justify-center transform rotate-45">
                        <div className="w-3 h-3 bg-bauhaus-red transform -rotate-45" />
                      </div>
                      <span className="font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <HandDrawnContainer className="transform rotate-2 hover:rotate-0 transition-all duration-500">
                <Web3InnovationGraphic />
              </HandDrawnContainer>
            </AsymmetricContent>
          </div>
        </UndergroundSection>

        {/* Features Section - Underground Actions */}
        <UndergroundSection 
          title="how it works"
          quote="improvisation is conversation with the unknown"
          className="py-16 md:py-24"
        >
          <div className="container px-4 md:px-6">
            <AsymmetricContent variant="reverse">
              <HandDrawnContainer className="text-center space-y-6 p-8 scribble-bg">
                <div className="p-3 bg-bauhaus-red/10 transform rotate-3 inline-block">
                  <Eye className="h-8 w-8 text-bauhaus-red" />
                </div>
                <h3 className="text-xl font-black underground-pulse">watch live</h3>
                <p className="text-muted-foreground font-medium">
                  experience the creative process in real-time as artists perform and create.
                </p>
              </HandDrawnContainer>
              
              <HandDrawnContainer className="text-center space-y-6 p-8">
                <div className="p-3 bg-bauhaus-electric/10 transform -rotate-2 inline-block">
                  <DollarSign className="h-8 w-8 text-bauhaus-electric" />
                </div>
                <h3 className="text-xl font-black underground-pulse">tip & collect</h3>
                <p className="text-muted-foreground font-medium">
                  support artists by tipping during performances and collect unique nfts.
                </p>
              </HandDrawnContainer>
              
              <HandDrawnContainer className="text-center space-y-6 p-8">
                <div className="p-3 bg-bauhaus-void/10 transform rotate-1 inline-block">
                  <Zap className="h-8 w-8 text-bauhaus-void" />
                </div>
                <h3 className="text-xl font-black underground-pulse">create & earn</h3>
                <p className="text-muted-foreground font-medium">
                  artists can monetize their performances and creative process directly.
                </p>
              </HandDrawnContainer>
            </AsymmetricContent>
          </div>
        </UndergroundSection>

        {/* Categories Section - Art Forms Underground */}
        <UndergroundSection 
          title="art forms"
          quote="boundaries exist only to be artistically destroyed"
          className="py-12 md:py-20 bg-bauhaus-chalk"
          has3D={false}
        >
          <div className="container px-4 md:px-6">
            <ParallaxWrapper speed={0.1}>
              <p className="text-center text-muted-foreground md:text-lg max-w-[700px] mx-auto mb-16 font-medium transform skew-x-0.5">
                explore different types of live performances and creative processes.
              </p>
            </ParallaxWrapper>
            
            <div className="underground-grid">
              {[
                { name: "standup comedy", icon: "standup-comedy" },
                { name: "performance art", icon: "performance-art" },
                { name: "poetry slam", icon: "poetry-slam" },
                { name: "open mic / improv", icon: "open-mic" },
                { name: "live streaming", icon: "live-streaming" },
                { name: "creative workshop", icon: "creative-workshop" },
              ].map((category, index) => (
                <HandDrawnContainer
                  key={category.name}
                  className={`text-center space-y-6 p-8 transform ${
                    index % 2 === 0 ? 'rotate-1' : '-rotate-1'
                  } hover:rotate-0 transition-all duration-500 live-element`}
                >
                  <div className="transform hover:scale-110 transition-all duration-300">
                    <ArtCategoryIcon 
                      category={category.icon as any} 
                      size="lg" 
                      className={`mx-auto ${
                        index % 3 === 0 ? 'text-bauhaus-red' : 
                        index % 3 === 1 ? 'text-bauhaus-electric' : 'text-bauhaus-void'
                      }`} 
                    />
                  </div>
                  <h3 className="text-lg font-black graffiti-underline">{category.name}</h3>
                </HandDrawnContainer>
              ))}
            </div>
          </div>
        </UndergroundSection>

        {/* CTA Section - Enter the Underground */}
        <UndergroundSection 
          title="ready to disrupt?"
          quote="live performance is democracy in action"
          className="py-12 md:py-20 bg-bauhaus-black text-bauhaus-white"
          has3D={false}
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-8">
              <ParallaxWrapper speed={0.4}>
                <p className="md:text-lg max-w-[700px] font-bold brutal-text">
                  join haus²⁵ today and become part of a community that values creativity and supports artists.
                </p>
              </ParallaxWrapper>
              
              <div className="relative">
                <Button 
                  size="lg" 
                  variant="electric" 
                  className="mt-8 text-xl px-12 py-6 glitch" 
                  onClick={() => handleConnect()}
                >
                  <ElectricAccent intensity="intense">enter the haus</ElectricAccent>
                </Button>
                
                {/* Underground accent elements */}
                <div className="absolute -top-8 -left-8 w-16 h-16 opacity-30 flex items-center justify-center">
                  <div className="text-6xl font-black text-bauhaus-red transform rotate-12">²</div>
                </div>
                <div className="absolute -bottom-8 -right-8 w-16 h-16 opacity-30 flex items-center justify-center">
                  <div className="text-6xl font-black text-bauhaus-electric transform -rotate-12">⁵</div>
                </div>
              </div>
            </div>
          </div>
        </UndergroundSection>
      </main>



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
