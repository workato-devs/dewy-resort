'use client';

/**
 * Protected route component
 * Redirects to login if user is not authenticated or doesn't have required role
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'guest' | 'manager';
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Not authenticated
      if (!user) {
        router.push(redirectTo);
        return;
      }

      // Check role if required
      if (requiredRole && user.role !== requiredRole) {
        // Redirect to appropriate dashboard based on actual role
        const dashboardPath = user.role === 'guest' ? '/guest/dashboard' : '/manager/dashboard';
        router.push(dashboardPath);
      }
    }
  }, [user, loading, requiredRole, redirectTo, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  // Wrong role
  if (requiredRole && user.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}
