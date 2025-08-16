"use client"

import { Navbar } from "../components/navbar"
import { Breadcrumbs } from "../components/breadcrumbs"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen flex flex-col texture-bg">
      <Navbar />

      <main className="flex-1 container py-12">
        <Breadcrumbs items={[{ label: "terms of service" }]} />

        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">terms of service</h1>
          <p className="text-muted-foreground max-w-3xl">
            the rules and conditions for using haus²⁵ to create and experience real-time assets.
          </p>
        </div>

        <div className="max-w-4xl space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>terms of service for haus²⁵</CardTitle>
                <p className="text-sm text-muted-foreground">
                  last updated: august 14, 2025
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              <section className="space-y-4">
                <h2 className="text-xl font-medium">
                  1. acceptance of terms
                </h2>
                <p className="leading-relaxed">
                  by accessing or using haus²⁵ (the "app"), you agree to comply with and be bound by these terms of service ("terms"). if you do not agree to these terms, please do not use the app.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-medium">
                  2. description of service
                </h2>
                <p className="leading-relaxed">
                  haus²⁵ is an innovative music creation app that allows users to generate dj sets by shaking their phones or using motion sensors. the app utilizes camera, microphone, and motion sensors to enhance the user experience.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-medium">
                  3. user responsibilities
                </h2>
                <div className="space-y-3">
                  <p className="leading-relaxed">
                    • you must be at least 13 years old to use the app.
                  </p>
                  <p className="leading-relaxed">
                    • you are responsible for maintaining the confidentiality of your account credentials.
                  </p>
                  <p className="leading-relaxed">
                    • you agree not to use the app for any unlawful or prohibited activities.
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-medium">
                  4. third-party services
                </h2>
                <p className="leading-relaxed">
                  the app may integrate with third-party services (e.g., gemini, anthropic). we are not responsible for the actions, policies, or practices of these third parties.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-medium">
                  5. disclaimer of warranties
                </h2>
                <p className="leading-relaxed">
                  the app is provided "as is" without warranties of any kind. we do not guarantee uninterrupted or error-free operation.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-medium">
                  6. limitation of liability
                </h2>
                <p className="leading-relaxed">
                  to the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the app.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-medium">
                  7. modifications
                </h2>
                <p className="leading-relaxed">
                  we reserve the right to modify these terms at any time. continued use of the app after changes constitutes acceptance of the revised terms.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-medium">
                  8. governing law
                </h2>
                <p className="leading-relaxed">
                  these terms shall be governed by and construed in accordance with the laws of our future country of incorporation.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-medium">
                  9. contact us
                </h2>
                <p className="leading-relaxed">
                  for any questions regarding these terms, please contact us at{" "}
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
