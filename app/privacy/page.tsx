"use client"

import { Navbar } from "../components/navbar"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-border p-8 shadow-lg texture-bg">
            <h1 className="text-4xl font-bold mb-2 text-foreground">
              Privacy Policy for haus²⁵
            </h1>
            <p className="text-muted-foreground mb-8">
              Last Updated: August 14, 2025
            </p>
            
            <div className="space-y-6 text-foreground">
              <section>
                <h2 className="text-2xl font-semibold mb-3 text-primary">
                  1. Introduction
                </h2>
                <p className="leading-relaxed">
                  haus²⁵ ("we," "us," or "our") respects your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our App.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3 text-primary">
                  2. Information We Collect
                </h2>
                <p className="leading-relaxed mb-4">
                  Non-Personal Data: We collect transactions data on-chain, and your interactions with decentralized Curation services in order to improve our agents responses. Data are anonymized, and you are never going to be required to share any sensitive data in order to use our products.
                </p>
                <p className="leading-relaxed">
                  AI Personalization: We analyze recurring themes and patterns to improve your experience but do not store any personal data, including your blockchain address.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3 text-primary">
                  3. How We Use Your Events Details
                </h2>
                <p className="leading-relaxed">
                  Your Events metadata are used to provide App's functionalities, and to personalize your experience with the Curators, which self-refine and provide you better services by analyzing your events' previous results.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3 text-primary">
                  4. Data Sharing & Third Parties
                </h2>
                <p className="leading-relaxed">
                  We do not sell or share your personal data with third parties except as required by law. Third-party services (e.g., Gemini, Anthropic) may have their own data policies, which we do not control.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3 text-primary">
                  5. Data Security
                </h2>
                <p className="leading-relaxed">
                  We implement reasonable security measures to protect your data. However, no method of transmission over the internet is 100% secure.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3 text-primary">
                  6. Children's Privacy
                </h2>
                <p className="leading-relaxed">
                  The App is not intended for children under 13. We do not knowingly collect data from children.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3 text-primary">
                  7. Changes to This Policy
                </h2>
                <p className="leading-relaxed">
                  We may update this Privacy Policy periodically. The latest version will be posted on haus25.live/privacy.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3 text-primary">
                  8. Contact Us
                </h2>
                <p className="leading-relaxed">
                  For privacy-related inquiries, contact us at{" "}
                  <a 
                    href="mailto:hi@haus25.live" 
                    className="text-accent hover:text-accent/80 underline"
                  >
                    hi@haus25.live
                  </a>
                  .
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
