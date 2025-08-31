"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Loader2, MessageSquare } from "lucide-react"
import type { OnChainEventData } from "../../services/tickets"

interface StrategyTabProps {
  event: OnChainEventData
  promoterStrategy: any
  isGeneratingStrategy: boolean
  isAcceptingStrategy: boolean
  strategyAccepted: boolean
  selectedStrategyIterations: Record<string, number>
  expandedStrategyDiscussion: string | null
  strategyDiscussionMessages: Record<string, Array<{role: string, content: string}>>
  isDiscussingStrategy: boolean
  onGenerateStrategy: () => void
  onAcceptStrategy: () => void
  onSetPromoterStrategy: (strategy: any) => void
  onSetExpandedStrategyDiscussion: (aspect: string | null) => void
  onStrategyDiscussion: (aspect: string, message: string) => void
  getStrategyDisplayValue: (aspect: string) => any
  StrategyIterationSelector: React.ComponentType<{aspect: string, title: string}>
  StrategyDiscussionBlock: React.ComponentType<{aspect: string, title: string}>
}

export default function StrategyTab({
  event,
  promoterStrategy,
  isGeneratingStrategy,
  isAcceptingStrategy,
  strategyAccepted,
  selectedStrategyIterations,
  expandedStrategyDiscussion,
  strategyDiscussionMessages,
  isDiscussingStrategy,
  onGenerateStrategy,
  onAcceptStrategy,
  onSetPromoterStrategy,
  onSetExpandedStrategyDiscussion,
  onStrategyDiscussion,
  getStrategyDisplayValue,
  StrategyIterationSelector,
  StrategyDiscussionBlock
}: StrategyTabProps) {

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Strategy</CardTitle>
        <CardDescription>
          Generate and refine your event's Content Strategy
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!promoterStrategy ? (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Generate a comprehensive Content Strategy to promote your event</p>
            <Button 
              onClick={onGenerateStrategy}
              disabled={isGeneratingStrategy}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              {isGeneratingStrategy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Strategy...
                </>
              ) : (
                'Generate Content Strategy'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Accept Strategy Button - Only show when strategy exists and is not accepted */}
            {!strategyAccepted && (
              <div className="flex gap-2 mb-6">
                <Button
                  onClick={onAcceptStrategy}
                  disabled={isAcceptingStrategy}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isAcceptingStrategy ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    'Accept Strategy'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onSetPromoterStrategy(null)}
                >
                  Generate New Strategy
                </Button>
              </div>
            )}

            {/* Strategy Accepted Status */}
            {strategyAccepted && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-6">
                <p className="text-green-800 dark:text-green-200 font-medium">
                  ✅ Strategy accepted. Go to the Content tab to create your social media content.
                </p>
              </div>
            )}

            {/* Content Plan Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Content Plan</h3>
                {!strategyAccepted && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                    onClick={() => onSetExpandedStrategyDiscussion(expandedStrategyDiscussion === 'generalStrategy' ? null : 'generalStrategy')}
                    title="Discuss Content Plan"
                  >
                    <MessageSquare className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <StrategyIterationSelector aspect="generalStrategy" title="Content Plan" />
              <StrategyDiscussionBlock aspect="generalStrategy" title="Content Plan" />
              
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                {(() => {
                  const generalStrategy = getStrategyDisplayValue('generalStrategy')
                  if (!generalStrategy) return <p className="text-gray-500">No content plan available</p>
                  
                  // Handle natural language response from GeneralStrategyAgent
                  if (typeof generalStrategy.approach === 'string' && !generalStrategy.rationale) {
                    // Natural language response from individual agent
                    return (
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-sm mb-1">Content Plan</h4>
                          <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {generalStrategy.approach}
                          </div>
                        </div>
                      </div>
                    )
                  }
                  
                  // Handle structured response from ContentManagerAgent  
                  return (
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm mb-1">Approach</h4>
                        <p className="text-sm text-muted-foreground">{generalStrategy.approach || 'No approach defined'}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-1">Rationale</h4>
                        <p className="text-sm text-muted-foreground">{generalStrategy.rationale || 'No rationale provided'}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-1">Target Audience</h4>
                        <p className="text-sm text-muted-foreground">{generalStrategy.targetAudience || 'No target audience defined'}</p>
                      </div>
                      {generalStrategy.keyMessages && generalStrategy.keyMessages.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-1">Key Messages</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {generalStrategy.keyMessages.map((message: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-red-600 mt-1">•</span>
                                <span>{message}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Channels & Format Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Channels & Format</h3>
                {!strategyAccepted && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                    onClick={() => onSetExpandedStrategyDiscussion(expandedStrategyDiscussion === 'platformStrategies' ? null : 'platformStrategies')}
                    title="Discuss Channels & Format"
                  >
                    <MessageSquare className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <StrategyIterationSelector aspect="platformStrategies" title="Channels & Format" />
              <StrategyDiscussionBlock aspect="platformStrategies" title="Channels & Format" />
              
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                {(() => {
                  const platformStrategies = getStrategyDisplayValue('platformStrategies')
                  if (!platformStrategies) return <p className="text-gray-500">No platform strategies available</p>
                  
                  // Handle natural language response from PlatformStrategiesAgent
                  if (typeof platformStrategies.strategies === 'string') {
                    // Natural language response from individual agent
                    return (
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-sm mb-1">Platform Strategies</h4>
                          <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {platformStrategies.strategies}
                          </div>
                        </div>
                      </div>
                    )
                  }
                  
                  // Handle structured response from ContentManagerAgent
                  if (typeof platformStrategies === 'object' && !platformStrategies.strategies) {
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(platformStrategies).map(([platform, strategy]: [string, any]) => (
                          <div key={platform} className="border rounded-lg p-3 bg-white dark:bg-gray-800">
                            <h4 className="font-medium text-sm mb-2 capitalize flex items-center gap-2">
                              {platform === 'x' ? '🐦 X (Twitter)' : 
                               platform === 'facebook' ? '📘 Facebook' :
                               platform === 'instagram' ? '📸 Instagram' :
                               platform === 'eventbrite' ? '🎟️ Eventbrite' : platform}
                            </h4>
                            <div className="space-y-2 text-xs">
                              {strategy.frequency && (
                                <div>
                                  <span className="font-medium">Frequency:</span> {strategy.frequency}
                                </div>
                              )}
                              {strategy.contentTypes && (
                                <div>
                                  <span className="font-medium">Content:</span> {strategy.contentTypes.join(', ')}
                                </div>
                              )}
                              {strategy.style && (
                                <div>
                                  <span className="font-medium">Style:</span> {strategy.style}
                                </div>
                              )}
                              {strategy.hashtags && (
                                <div>
                                  <span className="font-medium">Tags:</span> {strategy.hashtags.join(' ')}
                                </div>
                              )}
                              {strategy.timing && (
                                <div>
                                  <span className="font-medium">Timing:</span> {strategy.timing}
                                </div>
                              )}
                              {strategy.approach && (
                                <div>
                                  <span className="font-medium">Approach:</span> {strategy.approach}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  }
                  
                  return <p className="text-gray-500">Invalid platform strategies format</p>
                })()}
              </div>
            </div>

            {/* Timeline Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Timeline</h3>
                {!strategyAccepted && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                    onClick={() => onSetExpandedStrategyDiscussion(expandedStrategyDiscussion === 'timeline' ? null : 'timeline')}
                    title="Discuss Timeline"
                  >
                    <MessageSquare className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <StrategyIterationSelector aspect="timeline" title="Timeline" />
              <StrategyDiscussionBlock aspect="timeline" title="Timeline" />
              
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                {(() => {
                  const timeline = getStrategyDisplayValue('timeline')
                  if (!timeline) return <p className="text-gray-500">No timeline available</p>
                  
                  // Handle natural language response from TimelineAgent
                  if (typeof timeline.timeline === 'string') {
                    // Natural language response from individual agent
                    return (
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-sm mb-1">Promotional Timeline</h4>
                          <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {timeline.timeline}
                          </div>
                        </div>
                      </div>
                    )
                  }
                  
                  // Handle structured response from ContentManagerAgent
                  return (
                    <div className="space-y-4">
                      {timeline.immediate && timeline.immediate.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            ⚡ Immediate (Next 24h)
                          </h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {timeline.immediate.map((task: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-red-600 mt-1">•</span>
                                <span>{task}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {timeline.shortTerm && timeline.shortTerm.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            📅 Short-term (Next Week)
                          </h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {timeline.shortTerm.map((task: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-red-600 mt-1">•</span>
                                <span>{task}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {timeline.ongoing && timeline.ongoing.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            🔄 Ongoing (Until Event)
                          </h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {timeline.ongoing.map((task: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-red-600 mt-1">•</span>
                                <span>{task}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
