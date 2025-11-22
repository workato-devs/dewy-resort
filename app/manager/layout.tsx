'use client';

/**
 * Manager Portal Layout
 * Provides navigation and layout structure for manager-facing pages
 */

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { FallbackWarningBanner } from '@/components/ui/FallbackWarningBanner';
import { 
  LayoutDashboard, 
  Wrench, 
  DoorOpen, 
  CreditCard, 
  MessageSquare, 
  LogOut
} from 'lucide-react';
import Link from 'next/link';

const navigationItems = [
  { name: 'Dashboard', href: '/manager/dashboard', icon: LayoutDashboard },
  { name: 'Maintenance', href: '/manager/maintenance', icon: Wrench },
  { name: 'Rooms', href: '/manager/rooms', icon: DoorOpen },
  { name: 'Billing', href: '/manager/billing', icon: CreditCard },
  { name: 'AI Assistant', href: '/manager/chat', icon: MessageSquare },
];

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Redirect if not authenticated or not a manager
  useEffect(() => {
    if (!loading && (!user || user.role !== 'manager')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Safety timeout for loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setLoadingTimeout(true);
        router.push('/login');
      }
    }, 15000); // 15 second timeout

    return () => clearTimeout(timer);
  }, [loading, router]);

  // Show loading state
  if (loading && !loadingTimeout) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user || user.role !== 'manager') {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col fixed inset-y-0">
        {/* Sidebar Header */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Manager Portal</h1>
            <ThemeToggle />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{user.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">Hotel Staff</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <FallbackWarningBanner />
        <div className="px-8 py-8">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
