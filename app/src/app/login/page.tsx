"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Hotel, Loader2, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "@/hooks/use-toast"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [authProvider, setAuthProvider] = useState<'mock' | 'okta' | 'cognito' | null>(null)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  
  // Debug mode flag
  const DEBUG_AUTH = process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true'

  // Get error message from query parameters
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Fetch auth provider status on mount
  useEffect(() => {
    async function checkAuthProvider() {
      try {
        const response = await fetch("/api/auth/config")
        if (response.ok) {
          const data = await response.json()
          setAuthProvider(data.provider)
        } else {
          // Default to mock mode on error
          setAuthProvider('mock')
        }
      } catch (error) {
        // Default to mock mode on error
        setAuthProvider('mock')
      }
    }
    checkAuthProvider()
  }, [])

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {}

    if (!email) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!password) {
      newErrors.password = "Password is required"
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (DEBUG_AUTH) {
      console.log('=== LOGIN FORM SUBMIT ===')
      console.log('Email:', email)
    }

    if (!validateForm()) {
      if (DEBUG_AUTH) console.log('Form validation failed')
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      if (DEBUG_AUTH) console.log('Calling login API...')
      // Call the login API directly
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (DEBUG_AUTH) {
        console.log('Login response status:', loginResponse.status)
      }
      const loginData = await loginResponse.json()
      if (DEBUG_AUTH) {
        console.log('Login response data:', loginData)
      }

      if (!loginResponse.ok) {
        if (DEBUG_AUTH) console.error('Login failed:', loginData)
        throw new Error(loginData.error?.message || "Login failed")
      }

      if (DEBUG_AUTH) console.log('Login successful!')
      
      // Show success message
      toast({
        title: "Login successful",
        description: `Welcome back, ${loginData.user.name}!`,
      })

      // Check for redirect parameter
      const redirectTo = searchParams.get('redirect')
      if (DEBUG_AUTH) console.log('Redirect parameter:', redirectTo)
      
      // Redirect to specified path or use the redirect URL from API
      if (redirectTo && (redirectTo.startsWith('/guest') || redirectTo.startsWith('/manager'))) {
        if (DEBUG_AUTH) console.log('Redirecting to redirect param:', redirectTo)
        window.location.href = redirectTo
      } else {
        if (DEBUG_AUTH) console.log('Redirecting to dashboard:', loginData.redirectUrl)
        window.location.href = loginData.redirectUrl
      }
    } catch (error) {
      if (DEBUG_AUTH) console.error('Login error:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        toast({
          title: "Request timeout",
          description: "The login request took too long. Please try again.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Login failed",
          description: error instanceof Error ? error.message : "Invalid email or password",
          variant: "destructive",
        })
      }
    } finally {
      if (DEBUG_AUTH) console.log('Setting isLoading to false')
      setIsLoading(false)
    }
  }

  const handleOktaLogin = () => {
    setIsLoading(true)
    // Redirect to Okta login endpoint
    window.location.href = "/api/auth/okta/login"
  }

  const handleCognitoLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (DEBUG_AUTH) {
      console.log('=== COGNITO LOGIN FORM SUBMIT ===')
      console.log('Email:', email)
    }

    if (!validateForm()) {
      if (DEBUG_AUTH) console.log('Form validation failed')
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      if (DEBUG_AUTH) console.log('Calling Cognito login API...')
      // Direct login with Cognito (no redirect)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch("/api/auth/cognito/login-direct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const data = await response.json()
      if (DEBUG_AUTH) {
        console.log('Cognito login response status:', response.status)
        console.log('Cognito login response data:', data)
      }

      if (!response.ok) {
        if (DEBUG_AUTH) console.error('Cognito login failed:', data)
        // Check if user needs email verification
        if (data.needsVerification) {
          toast({
            title: "Email not verified",
            description: data.error,
            variant: "destructive",
          })
          router.push(`/verify-email?email=${encodeURIComponent(email)}`)
          return
        }
        
        throw new Error(data.error || "Login failed")
      }

      if (DEBUG_AUTH) console.log('Cognito login successful!')
      
      // Show success message
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.name}!`,
      })

      // Use window.location.href for hard redirect
      if (DEBUG_AUTH) console.log('Redirecting to:', data.redirectUrl)
      window.location.href = data.redirectUrl
    } catch (error) {
      if (DEBUG_AUTH) console.error('Cognito login error:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        toast({
          title: "Request timeout",
          description: "The login request took too long. Please try again.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Login failed",
          description: error instanceof Error ? error.message : "Invalid email or password",
          variant: "destructive",
        })
      }
      setIsLoading(false)
    }
  }

  // Show loading state while determining auth provider
  if (authProvider === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/Dewy-purple 64.png" alt="Dewy Resort Logo" width={64} height={64} />
            <span className="text-2xl font-bold">Dewy Resort</span>
          </Link>
          <Link href="/">
            <Button variant="ghost">Back to Home</Button>
          </Link>
        </div>
      </header>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              {authProvider === 'mock'
                ? "Enter your credentials to access your account"
                : authProvider === 'okta'
                ? "Sign in with your Okta account"
                : "Sign in with your AWS Cognito account"
              }
            </CardDescription>
            {authProvider === 'mock' && (
              <div className="mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-xs text-blue-800 dark:text-blue-200 text-center">
                  🔧 Mock Mode Active - Using local authentication
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {/* Display error messages from query parameters */}
            {(errorParam || errorDescription) && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">
                    {errorDescription || errorParam || "Authentication failed"}
                  </p>
                </div>
              </div>
            )}

            {authProvider === 'mock' ? (
              // Mock Mode: Show email/password form
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="guest@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className={errors.email ? "border-red-500" : ""}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className={errors.password ? "border-red-500" : ""}
                    />
                    {errors.password && (
                      <p className="text-sm text-red-500">{errors.password}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>

                {/* Demo Credentials */}
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm font-semibold mb-3 text-center">Demo Credentials</p>
                  <div className="space-y-3 text-sm">
                    <div className="bg-slate-50 p-3 rounded-md">
                      <p className="font-medium mb-1">Guest Account</p>
                      <p className="text-muted-foreground">Email: guest1@hotel.com</p>
                      <p className="text-muted-foreground">Password: Hotel2026!</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-md">
                      <p className="font-medium mb-1">Manager Account</p>
                      <p className="text-muted-foreground">Email: manager1@hotel.com</p>
                      <p className="text-muted-foreground">Password: Hotel2026!</p>
                    </div>
                  </div>
                </div>
              </>
            ) : authProvider === 'okta' ? (
              // Okta Mode: Show Okta login button
              <div className="space-y-4">
                <Button 
                  onClick={handleOktaLogin} 
                  className="w-full" 
                  disabled={isLoading}
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirecting to Okta...
                    </>
                  ) : (
                    "Sign in with Okta"
                  )}
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  You will be redirected to Okta to sign in securely
                </p>
              </div>
            ) : (
              // Cognito Mode: Show email/password form (direct login)
              <>
                <form onSubmit={handleCognitoLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cognito-email">Email</Label>
                    <Input
                      id="cognito-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className={errors.email ? "border-red-500" : ""}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cognito-password">Password</Label>
                    <Input
                      id="cognito-password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className={errors.password ? "border-red-500" : ""}
                    />
                    {errors.password && (
                      <p className="text-sm text-red-500">{errors.password}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </>
            )}

            {/* Create Account Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-primary hover:underline font-medium">
                  Create Account
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
