import type React from "react"
import type { Metadata } from "next"
import { Work_Sans } from "next/font/google"
import "./globals.css"
import { HIDDEN_MESSAGE_1 } from "./lib/constants"
import dynamic from "next/dynamic"

// Dynamically import the client wrapper to prevent SSR issues
const ClientWrapper = dynamic(() => import("./components/clientWrapper").then(mod => ({ default: mod.ClientWrapper })))

// Use Work Sans as a more Bauhaus-inspired font
const workSans = Work_Sans({
  subsets: ["latin"],
  display: "swap", // Optimize font loading
  variable: "--font-work-sans",
})

export const metadata: Metadata = {
  title: "Haus | Reality, in the making.",
  description:
    "Haus introduces dynamic, Real-Time Assets to the NFT space. Enter the Artist's workshop, and own artworks which acquire value with time.",
  metadataBase: new URL("https://haus.art"),
  openGraph: {
    title: "Haus | Reality, in the making.",
    description:
      "Haus introduces dynamic, Real-Time Assets to the NFT space. Enter the Artist's workshop, and own artworks which acquire value with time.",
    type: "website",
    locale: "en_US",
  },
  // Hidden message in metadata
  other: {
    "jabyl-signature": HIDDEN_MESSAGE_1,
  },
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="application-name" content="Haus | Reality, in the making." />
        <meta
          name="description"
          content="Haus introduces dynamic, Real-Time Assets to the NFT space. Enter the Artist's workshop, and own artworks which acquire value with time."
        />
      </head>
      <body className={`${workSans.className} ${workSans.variable}`}>
        <ClientWrapper>
          {children}
        </ClientWrapper>
        {/* Hidden comment with encrypted message */}
        {/* <!-- jabyl: cmVhbGl0eSAtIGlzIHlldCB0byBiZSBpbnZlbnRlZC4= --> */}
      </body>
    </html>
  )
}
