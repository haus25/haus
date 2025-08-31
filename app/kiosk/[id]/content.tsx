"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Checkbox } from "../../components/ui/checkbox"
import { Label } from "../../components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog"
import { Loader2, Eye, Check, X, MessageSquare, Send, Share2, Heart } from "lucide-react"
import type { OnChainEventData } from "../../services/tickets"

interface ContentTabProps {
  event: OnChainEventData
  socialContent: Record<string, any>
  isGeneratingContent: Record<string, boolean>
  contentIterations: Record<string, number>
  approvedContent: Record<string, any>
  contentLimits: Record<string, { daily: number, total: number, used: { daily: number, total: number } }>
  onGenerateContent: (platform: 'x' | 'facebook' | 'instagram' | 'eventbrite') => void
  onRefineContent: (platform: 'x' | 'facebook' | 'instagram' | 'eventbrite', feedback: string) => void
  onPreviewContent: (platform: string, content: any) => void
  onApproveContent: (platform: 'x' | 'facebook' | 'instagram' | 'eventbrite') => void
  renderSocialContent: (content: any, platform: string) => string
  bannerUrl?: string | null
}

export default function ContentTab({
  event,
  socialContent,
  isGeneratingContent,
  contentIterations,
  approvedContent,
  contentLimits,
  onGenerateContent,
  onRefineContent,
  onPreviewContent,
  onApproveContent,
  renderSocialContent,
  bannerUrl
}: ContentTabProps) {

  const [showPastContent, setShowPastContent] = useState<Record<string, boolean>>({})
  const [previewModal, setPreviewModal] = useState<{platform: string, content: any} | null>(null)

  const platforms = [
    { 
      key: 'x' as const, 
      name: 'X (Twitter)', 
      icon: '🐦',
      limits: { daily: 1, total: 999999 },
      description: 'Up to 1 post per day'
    },
    { 
      key: 'instagram' as const, 
      name: 'Instagram', 
      icon: '📸',
      limits: { daily: 1, total: 3 },
      description: 'Up to 1 post per day, max 3 total'
    },
    { 
      key: 'facebook' as const, 
      name: 'Facebook', 
      icon: '📘',
      limits: { daily: 999999, total: 1 },
      description: 'Up to 1 post total'
    },
    { 
      key: 'eventbrite' as const, 
      name: 'Eventbrite', 
      icon: '🎟️',
      limits: { daily: 999999, total: 1 },
      description: 'Up to 1 listing total'
    }
  ]

  const canGenerateContent = (platformKey: string) => {
    const limits = contentLimits[platformKey]
    if (!limits) return true
    
    return limits.used.daily < limits.daily && limits.used.total < limits.total
  }

  const getRemainingContent = (platformKey: string) => {
    const limits = contentLimits[platformKey]
    if (!limits) return { daily: 'unlimited', total: 'unlimited' }
    
    const dailyRemaining = limits.daily - limits.used.daily
    const totalRemaining = limits.total - limits.used.total
    
    return {
      daily: limits.daily >= 999999 ? 'unlimited' : dailyRemaining,
      total: limits.total >= 999999 ? 'unlimited' : totalRemaining
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Social Media Content</CardTitle>
          <CardDescription>
            Generate platform-specific content for your event promotion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {platforms.map(platform => {
              const hasApprovedContent = approvedContent[platform.key]
              const remaining = getRemainingContent(platform.key)
              const canGenerate = canGenerateContent(platform.key)
              
              return (
                <div key={platform.key} className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <span>{platform.icon} {platform.name}</span>
                      {contentIterations[platform.key] && (
                        <Badge variant="secondary">v{contentIterations[platform.key]}</Badge>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground">{platform.description}</p>
                    
                    {/* Content limits display */}
                    <div className="text-xs text-muted-foreground">
                      Remaining: {remaining.daily} daily, {remaining.total} total
                    </div>
                    
                    {/* See Past checkbox */}
                    {hasApprovedContent && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`past-${platform.key}`}
                          checked={showPastContent[platform.key] || false}
                          onCheckedChange={(checked) => 
                            setShowPastContent(prev => ({ ...prev, [platform.key]: !!checked }))
                          }
                        />
                        <Label htmlFor={`past-${platform.key}`} className="text-xs">
                          See past content
                        </Label>
                      </div>
                    )}
                  </div>
                  
                  {/* Show approved content if checkbox is checked */}
                  {showPastContent[platform.key] && hasApprovedContent && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-green-600">✓ Approved Content</h4>
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-sm border border-green-200 dark:border-green-800">
                        <div className="whitespace-pre-wrap">
                          {renderSocialContent(hasApprovedContent, platform.key)}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Current draft content */}
                  {socialContent[platform.key] ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Current Draft</h4>
                      <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-sm border">
                        <div className="whitespace-pre-wrap">
                          {renderSocialContent(socialContent[platform.key], platform.key)}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setPreviewModal({platform: platform.key, content: socialContent[platform.key]})}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            const feedback = prompt("How would you like to improve this content?")
                            if (feedback) onRefineContent(platform.key, feedback)
                          }}
                          disabled={contentIterations[platform.key] >= 3}
                        >
                          🔄 Refine {contentIterations[platform.key] >= 3 ? '(Max reached)' : `(${3 - (contentIterations[platform.key] || 0)} left)`}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onGenerateContent(platform.key)}
                          disabled={isGeneratingContent[platform.key] || !canGenerate}
                        >
                          {isGeneratingContent[platform.key] ? <Loader2 className="h-3 w-3 animate-spin" /> : '🔄 Regenerate'}
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => onApproveContent(platform.key)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => onGenerateContent(platform.key)}
                      disabled={isGeneratingContent[platform.key] || !canGenerate}
                      className="w-full"
                    >
                      {isGeneratingContent[platform.key] ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : !canGenerate ? (
                        'Limit Reached'
                      ) : (
                        platform.key === 'eventbrite' ? 'Create Listing' : 'Create Post'
                      )}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Platform Preview Modal */}
      {previewModal && (
        <PlatformPreviewModal 
          platform={previewModal.platform}
          content={previewModal.content}
          isOpen={!!previewModal}
          onClose={() => setPreviewModal(null)}
          event={event}
          renderSocialContent={renderSocialContent}
          bannerUrl={bannerUrl}
        />
      )}
    </>
  )
}

// Platform Preview Modal Components with 2025 Brand Guidelines
function PlatformPreviewModal({ 
  platform, 
  content, 
  isOpen, 
  onClose, 
  event,
  renderSocialContent, 
  bannerUrl
}: { 
  platform: string
  content: any
  isOpen: boolean
  onClose: () => void
  event: OnChainEventData
  renderSocialContent: (content: any, platform: string) => string
  bannerUrl?: string | null
}) {
  if (!content) return null

  const renderPlatformPreview = () => {
    switch (platform) {
      case 'x':
        return (
          <div className="max-w-sm mx-auto">
            {/* X 2025 Design: Pure black background, minimal UI */}
            <div className="bg-black text-white rounded-2xl border border-gray-800 overflow-hidden" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              <div className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">h</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-bold text-white text-[15px]">haus²⁵</span>
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      <span className="text-gray-400 text-[15px]">@haus25live</span>
                      <span className="text-gray-500">·</span>
                      <span className="text-gray-500 text-[15px]">2m</span>
                    </div>
                    {bannerUrl && (
                      <div className="mb-3 overflow-hidden rounded-xl border border-gray-800">
                        <img src={bannerUrl} alt={event.title} className="w-full h-auto" />
                      </div>
                    )}
                    <div className="text-white text-[15px] leading-5 mb-3 whitespace-pre-wrap">
                      {renderSocialContent(content, 'x')}
                    </div>
                    <div className="flex items-center justify-between text-gray-500 max-w-md">
                      <div className="flex items-center space-x-2 hover:text-blue-400 cursor-pointer transition-colors p-2 rounded-full hover:bg-blue-500/10">
                        <MessageSquare className="w-5 h-5" />
                        <span className="text-sm">24</span>
                      </div>
                      <div className="flex items-center space-x-2 hover:text-green-400 cursor-pointer transition-colors p-2 rounded-full hover:bg-green-500/10">
                        <Share2 className="w-5 h-5" />
                        <span className="text-sm">8</span>
                      </div>
                      <div className="flex items-center space-x-2 hover:text-red-400 cursor-pointer transition-colors p-2 rounded-full hover:bg-red-500/10">
                        <Heart className="w-5 h-5" />
                        <span className="text-sm">156</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'instagram':
        return (
          <div className="max-w-sm mx-auto">
            {/* Instagram 2025 Design: Clean white interface with refined gradients */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              <div className="flex items-center justify-between p-3 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full p-0.5" style={{ background: 'linear-gradient(45deg, #833ab4, #fd1d1d, #fcb045)' }}>
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-800">h</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-gray-900">haus25live</span>
                    <span className="text-xs text-gray-500">Live Event Platform</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="text-blue-500 text-sm font-semibold px-4 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    Follow
                  </button>
                </div>
              </div>
              <div className="aspect-[4/3] bg-black flex items-center justify-center relative">
                {bannerUrl ? (
                  <img src={bannerUrl} alt={event.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-2xl flex items-center justify-center mb-2 mx-auto shadow-lg">
                      <span className="text-white font-bold text-xl">🎭</span>
                    </div>
                    <span className="text-gray-600 text-sm font-medium">Event Visual</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="text-sm text-gray-900">
                  <span className="font-semibold">haus25live</span> <span className="leading-relaxed">{renderSocialContent(content, 'instagram')}</span>
                </div>
                <div className="text-gray-400 text-xs mt-2 font-medium uppercase tracking-wide">
                  2 HOURS AGO
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'facebook':
        return (
          <div className="max-w-lg mx-auto">
            {/* Facebook 2025 Design: Clean white interface with Meta branding */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-sm">h</span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-900 text-[15px]">haus²⁵</span>
                    </div>
                    <div className="text-gray-500 text-sm flex items-center space-x-1">
                      <span>2h</span>
                    </div>
                  </div>
                </div>
              </div>
              {bannerUrl && (
                <div className="w-full">
                  <img src={bannerUrl} alt={event.title} className="w-full h-auto object-cover" />
                </div>
              )}
              <div className="px-4 py-3">
                <div className="text-gray-800 text-[15px] whitespace-pre-wrap leading-relaxed">
                  {renderSocialContent(content, 'facebook')}
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'eventbrite':
        return (
          <div className="max-w-lg mx-auto">
            {/* Eventbrite 2025 Design: "The Path" rebrand with neon gradients */}
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden" style={{ fontFamily: '"Benton Sans", -apple-system, BlinkMacSystemFont, sans-serif' }}>
              <div className="aspect-[16/10] bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-orange-600 shadow-lg">
                  🔴 LIVE EVENT
                </div>
                <div className="text-center text-white relative z-10">
                  <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mb-4 mx-auto shadow-2xl">
                    <span className="text-4xl">🎭</span>
                  </div>
                  <div className="bg-black/20 backdrop-blur-sm rounded-2xl px-4 py-2">
                    <span className="text-lg font-bold">Event Visual</span>
                  </div>
                </div>
                {/* The Path logo element - fluid curved line */}
                <div className="absolute bottom-0 right-0 w-32 h-16 opacity-20">
                  <svg viewBox="0 0 128 64" className="w-full h-full">
                    <path d="M0,32 Q32,0 64,32 T128,32" stroke="white" strokeWidth="3" fill="none" opacity="0.6"/>
                  </svg>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-black text-2xl mb-4 text-gray-900 leading-tight">{event?.title || 'Live Performance Event'}</h3>
                <div className="text-gray-700 text-[15px] leading-relaxed whitespace-pre-wrap">
                  {renderSocialContent(content, 'eventbrite')}
                </div>
              </div>
            </div>
          </div>
        )
      
      default:
        return (
          <div className="p-4 bg-gray-50 rounded-lg">
            <pre className="text-sm">{JSON.stringify(content, null, 2)}</pre>
          </div>
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              {platform === 'x' && '🐦 X (Twitter) Preview'}
              {platform === 'instagram' && '📸 Instagram Preview'}
              {platform === 'facebook' && '📘 Facebook Preview'}
              {platform === 'eventbrite' && '🎟️ Eventbrite Preview'}
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="p-6">
          <div className="flex justify-center">
            {renderPlatformPreview()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
