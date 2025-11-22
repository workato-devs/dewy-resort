import type { Metadata } from "next"
// import { Rakkas } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { ThemeProvider } from "@/components/shared/ThemeProvider"
import { DataSourceProvider } from "@/lib/context/DataSourceContext"
import { Toaster } from "@/components/ui/toaster"

// Temporarily disabled due to SSL certificate issues with Google Fonts
// const rakkas = Rakkas({
//   weight: '400',
//   subsets: ['latin'],
//   variable: '--font-rakkas',
// })

export const metadata: Metadata = {
  title: "Hotel Management Demo",
  description: "A demo application for hotel management with Workato integrations",
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DataSourceProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </DataSourceProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
