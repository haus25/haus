"use client"

import { Navbar } from "../components/navbar"

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-border p-8 shadow-lg texture-bg">
            <h1 className="text-4xl font-bold mb-2 text-foreground">
              Terms of Service (TOS) for haus²⁵
            </h1>
            <p className="text-muted-foreground mb-8">
              Last Updated: August 14, 2025
            </p>
            
            <div className="space-y-6 text-foreground">
              <section>
                <h2 className="text-2xl font-semibold mb-3 text-primary">
                  1. Acceptance of Terms
                </h2>
                <p className="leading-relaxed">
                  By accessing or using haus²⁵ (the "App"), you agree to comply with and be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the App.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3 text-primary">
                  2. Description of Service
                </h2>
                <p className="leading-relaxed">
                  haus²⁵ is an innovative music creation app that allows users to generate DJ sets by shaking their phones or using motion sensors. The App utilizes camera, microphone, and motion sensors to enhance the user experience.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3 text-primary">
                  3. User Responsibilities
                </h2>
                <div className="space-y-2">
                  <p className="leading-relaxed">
                    You must be at least 13 years old to use the App.
                  </p>
                  <p className="leading-relaxed">
                    You are responsible for maintaining the confidentiality of your account credentials.
                  </p>
                  <p className="leading-relaxed">
                    You agree not to use the App for any unlawful or prohibited activities.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3 text-primary">
                  4. Third-Party Services
                </h2>
                <p className="leading-relaxed">
                  The App may integrate with third-party services (e.g., Gemini, Anthropic). We are not responsible for the actions, policies, or practices of these third parties.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3 text-primary">
                  5. Disclaimer of Warranties
                </h2>
                <p className="leading-relaxed">
                  The App is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free operation.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3 text-primary">
                  6. Limitation of Liability
                </h2>
                <p className="leading-relaxed">
                  To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the App.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3 text-primary">
                  7. Modifications
                </h2>
                <p className="leading-relaxed">
                  We reserve the right to modify these Terms at any time. Continued use of the App after changes constitutes acceptance of the revised Terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3 text-primary">
                  8. Governing Law
                </h2>
                <p className="leading-relaxed">
                  These Terms shall be governed by and construed in accordance with the laws of our future country of incorporation.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3 text-primary">
                  9. Contact Us
                </h2>
                <p className="leading-relaxed">
                  For any questions regarding these Terms, please contact us at{" "}
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
