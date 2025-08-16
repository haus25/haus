"use client"

import { Navbar } from "../components/navbar"
import { Breadcrumbs } from "../components/breadcrumbs"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col texture-bg">
      <Navbar />

      <main className="flex-1 container py-12">
        <Breadcrumbs items={[{ label: "privacy policy" }]} />

        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">privacy policy</h1>
          <p className="text-muted-foreground max-w-3xl">
            how we protect your data while you create and own real-time assets.
          </p>
        </div>

        <div className="max-w-4xl space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>privacy policy for haus²⁵</CardTitle>
                <p className="text-sm text-muted-foreground">
                  last updated: august 14, 2025
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              <section className="space-y-4">
                <h2 className="text-xl font-medium">
                  1. introduction
                </h2>
                <p className="leading-relaxed">
                  haus²⁵ ("we," "us," or "our") respects your privacy. this privacy policy explains how we collect, use, and protect your information when you use our app.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-medium">
                  2. information we collect
                </h2>
                <div className="space-y-4">
                  <p className="leading-relaxed">
                    <span className="font-medium">non-personal data:</span> we collect transactions data on-chain, and your interactions with decentralized curation services in order to improve our agents responses. data are anonymized, and you are never going to be required to share any sensitive data in order to use our products.
                  </p>
                  <p className="leading-relaxed">
                    <span className="font-medium">ai personalization:</span> we analyze recurring themes and patterns to improve your experience but do not store any personal data, including your blockchain address.
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-medium">
                  3. how we use your events details
                </h2>
                <p className="leading-relaxed">
                  your events metadata are used to provide app's functionalities, and to personalize your experience with the curators, which self-refine and provide you better services by analyzing your events' previous results.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-medium">
                  4. data sharing & third parties
                </h2>
                <p className="leading-relaxed">
                  we do not sell or share your personal data with third parties except as required by law. third-party services (e.g., gemini, anthropic) may have their own data policies, which we do not control.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-medium">
                  5. data security
                </h2>
                <p className="leading-relaxed">
                  we implement reasonable security measures to protect your data. however, no method of transmission over the internet is 100% secure.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-medium">
                  6. children's privacy
                </h2>
                <p className="leading-relaxed">
                  the app is not intended for children under 13. we do not knowingly collect data from children.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-medium">
                  7. changes to this policy
                </h2>
                <p className="leading-relaxed">
                  we may update this privacy policy periodically. the latest version will be posted on haus25.live/privacy.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-medium">
                  8. contact us
                </h2>
                <p className="leading-relaxed">
                  for privacy-related inquiries, contact us at{" "}
                  <a 
                    href="mailto:hi@haus25.live" 
                    className="text-accent hover:text-accent/80 underline"
                  >
                    hi@haus25.live
                  </a>
                  .
                </p>
              </section>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
