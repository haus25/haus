import Link from "next/link"
import { HausLogo } from "./logo"
import { memo } from "react"
import { HIDDEN_MESSAGE_2 } from "../lib/constants"

// Memoize the footer to prevent unnecessary re-renders
export const Footer = memo(function Footer() {
  return (
    <footer className="border-t py-8 md:py-12">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 w-full">
              <HausLogo className="w-8 h-4" />
              <span className="font-bold text-lg tracking-wide bauhaus-text">haus</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground w-full">reality, in the making.</p>
            {/* Hidden span with encrypted message */}
            <span className="hidden" data-jabyl={HIDDEN_MESSAGE_2}></span>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-medium bauhaus-text">COMMUNITY</h3>
            <div className="flex gap-4">
              <Link href="https://x.com/haus25_live" target="_blank" className="text-muted-foreground hover:text-foreground">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="sr-only">X (Twitter)</span>
              </Link>
              <Link
                href="https://github.com/haus25"
                target="_blank"
                className="text-muted-foreground hover:text-foreground"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span className="sr-only">GitHub</span>
              </Link>
              <Link
                href="https://discord.gg/haus25"
                target="_blank"
                className="text-muted-foreground hover:text-foreground"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.39-.444.977-.608 1.414a17.97 17.97 0 0 0-5.487 0 12.197 12.197 0 0 0-.617-1.414.077.077 0 0 0-.079-.036c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 6.04 3.056.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.209 13.209 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.1.246.198.373.292a.077.077 0 0 1-.006.129 12.24 12.24 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.963 19.963 0 0 0 6.04-3.056.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                <span className="sr-only">Discord</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t">
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} haus. all rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
})
