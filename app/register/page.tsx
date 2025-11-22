"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Hotel, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"

type AuthProvider = 'mock' | 'okta' | 'cognito';

function RegisterForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<"guest" | "manager">("guest")
  const [isLoading, setIsLoading] = useState(false)
  const [authProvider, setAuthProvider] = useState<AuthProvider | null>(null)
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    name?: string
    role?: string
  }>({})

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
    const newErrors: {
      email?: string
      password?: string
      name?: string
      role?: string
    } = {}

    // Email validation
    if (!email) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address"
    }

    // Password validation
    if (!password) {
      newErrors.password = "Password is required"
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    } else {
      // Check password requirements
      const hasLowercase = /[a-z]/.test(password)
      const hasUppercase = /[A-Z]/.test(password)
      const hasNumber = /\d/.test(password)
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

      if (!hasLowercase) {
        newErrors.password = "Password must contain at least one lowercase letter"
      } else if (!hasUppercase) {
        newErrors.password = "Password must contain at least one uppercase letter"
      } else if (!hasNumber) {
        newErrors.password = "Password must contain at least one number"
      } else if (!hasSpecial) {
        newErrors.password = "Password must contain at least one special character"
      }
    }

    // Name validation
    if (!name) {
      newErrors.name = "Name is required"
    } else if (name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters"
    }

    // Role validation
    if (!role) {
      newErrors.role = "Role is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      // Determine endpoint based on auth provider
      let endpoint: string;
      if (authProvider === 'cognito') {
        endpoint = "/api/auth/cognito/register"
      } else if (authProvider === 'okta') {
        endpoint = "/api/auth/okta/register"
      } else {
        endpoint = "/api/auth/register"
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          name,
          role,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error?.message || errorData.error || "Registration failed"
        throw new Error(errorMessage)
      }

      const data = await response.json()

      // Show success message
      toast({
        title: "Account created successfully",
        description: data.message || "Welcome to Dewy Resort!",
      })

      // Handle redirect based on auth provider
      if (authProvider === 'cognito' || authProvider === 'okta') {
        // Cognito and Okta: redirect to login page
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl
        } else {
          router.push("/login")
        }
      } else {
        // Mock mode: redirect to dashboard
        if (role === "guest") {
          router.push("/guest/dashboard")
        } else {
          router.push("/manager/dashboard")
        }
      }
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "An error occurred during registration",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Password requirement checks
  const passwordRequirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One lowercase letter", met: /[a-z]/.test(password) },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One number", met: /\d/.test(password) },
    { label: "One special character", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ]

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
          <Link href="/login">
            <Button variant="ghost">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Registration Form */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Create Your Account</CardTitle>
            <CardDescription className="text-center">
              {authProvider === 'mock'
                ? "Enter your details to get started"
                : authProvider === 'okta'
                ? "Create an account with Okta authentication"
                : "Create an account with AWS Cognito authentication"
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
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
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className={errors.password ? "border-red-500" : ""}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Account Type</Label>
                <Select
                  value={role}
                  onValueChange={(value) => setRole(value as "guest" | "manager")}
                  disabled={isLoading}
                >
                  <SelectTrigger id="role" className={errors.role ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guest">Guest</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-red-500">{errors.role}</p>
                )}
              </div>

              {/* Password Requirements */}
              {password && (
                <div className="bg-slate-50 p-3 rounded-md space-y-2">
                  <p className="text-sm font-semibold">Password Requirements:</p>
                  <div className="space-y-1">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        {req.met ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={req.met ? "text-green-600" : "text-gray-600"}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            {/* Sign In Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign In
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
