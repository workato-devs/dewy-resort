"use client"

import { useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Hotel, Users, Wrench, CreditCard } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

export default function Home() {
  const { user, loading, refreshSession } = useAuth()

  // Refresh session when page loads to ensure we have the latest auth state
  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  // Determine dashboard URL based on user role
  const getDashboardUrl = () => {
    if (!user) return "/login"
    return user.role === "guest" ? "/guest/dashboard" : "/manager/dashboard"
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E3EAFA] to-[#FBF6FD] dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/Dewy-purple 64.png" alt="Dewy Resort Logo" width={64} height={64} />
            <span className="text-2xl font-bold">Dewy Resort</span>
          </div>
          {!loading && (
            user ? (
              <Link href={getDashboardUrl()}>
                <Button>Go to Dashboard</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button>Sign In</Button>
              </Link>
            )
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-center min-h-[600px] text-center py-16">
          {/* Dewy Icon */}
          <div className="mb-8">
            <Hotel className="h-24 w-24 text-[#1F0757]" />
          </div>
          
          <h1 className="font-rakkas text-[70px] text-dewy-purple text-center mb-6 leading-tight sm:text-[48px]">
            Welcome to Dewy Resort Hotel
          </h1>
          <p className="text-[34px] sm:text-[24px] text-[#1F0757] dark:text-gray-300 text-center mb-8 max-w-4xl mx-auto leading-snug">
            Experience luxury hospitality with our modern management system. Seamless service for guests and efficient operations for staff
          </p>
          {!loading && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link href={getDashboardUrl()}>
                  <Button size="lg" className="text-lg">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button 
                      size="lg" 
                      className="bg-dewy-purple dark:bg-purple-700 text-white hover:bg-dewy-purple/90 dark:hover:bg-purple-800 transition-colors px-8 py-3 text-lg rounded-lg"
                    >
                      Guest Portal
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button 
                      size="lg" 
                      className="bg-white dark:bg-gray-800 text-dewy-purple dark:text-white border-2 border-dewy-purple dark:border-gray-600 hover:bg-dewy-purple hover:text-white transition-colors px-8 py-3 text-lg rounded-lg"
                    >
                      Staff Login
                    </Button>
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 mt-16">
          <Card>
            <CardHeader>
              <Hotel className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Room Management</CardTitle>
              <CardDescription className="text-dewy-gray">
                Control your room environment with smart device integration
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Guest Services</CardTitle>
              <CardDescription className="text-dewy-gray">
                Request housekeeping, room service, and concierge assistance
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Wrench className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Maintenance</CardTitle>
              <CardDescription className="text-dewy-gray">
                Efficient task management and real-time status updates
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CreditCard className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Easy Checkout</CardTitle>
              <CardDescription className="text-dewy-gray">
                View charges and complete payment with secure processing
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Demo Info */}
        <Card className="max-w-3xl mx-auto bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Workshop Demo Application</CardTitle>
            <CardDescription className="text-base text-dewy-gray">
              This is a demonstration application showcasing integration patterns with Workato and Home Assistant. Built with Next.js and modern web technologies.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <h4 className="font-semibold mb-2">For Guests</h4>
                <p className="text-sm text-dewy-gray">
                  Access your room controls, request services, view billing, and chat with Dewy AI assistant
                </p>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-2">For Managers</h4>
                <p className="text-sm text-dewy-gray">
                  Monitor operations, manage maintenance, oversee rooms, and track billing
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white dark:bg-gray-900 mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Dewy Resort Management System - Demo Application</p>
        </div>
      </footer>
    </div>
  )
}
