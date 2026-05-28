import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { Hotel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { defaultPortalPath } from '@/lib/rolePortal';

interface AuthPageProps {
  portal: 'client' | 'staff';
}

export default function AuthPage({ portal }: AuthPageProps) {
  const { user, loading, signOut } = useAuth();
  const portalTitle = 'Staff Portal';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-medium">Loading...</div>
      </div>
    );
  }

  if (user) {
    const isGuestOnly = user.roles.includes('guest') && user.roles.length === 1;
    if (!isGuestOnly) {
      return <Navigate to={defaultPortalPath(user.roles)} replace />;
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md border-2 border-border p-6">
          <h1 className="text-2xl font-bold">Wrong Login Portal</h1>
          <p className="mt-2 text-muted-foreground">
            This account is a guest account. Please use the client website.
          </p>
          <div className="mt-6 flex gap-3">
            <Button onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden flex-1 flex-col justify-between border-r-2 border-border bg-primary p-12 lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <div className="border-2 border-primary-foreground p-2">
              <Hotel className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-primary-foreground">HotelOps {portalTitle}</h1>
          </div>
        </div>
        
        <div className="space-y-6">
          <blockquote className="text-xl font-medium leading-relaxed text-primary-foreground">
            "Role-specific portals for reception, housekeeping, maintenance, kitchen, payments, reporting, and hotel administration."
          </blockquote>
          <div className="space-y-1">
            <p className="font-bold text-primary-foreground">{portalTitle}</p>
            <p className="text-primary-foreground/80">
              Designed for hotel staff.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 text-primary-foreground/70">
          <div>
            <p className="text-3xl font-bold text-primary-foreground">10</p>
            <p className="text-sm">Staff Roles</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-primary-foreground">24/7</p>
            <p className="text-sm">Live Updates</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-primary-foreground">100%</p>
            <p className="text-sm">Operations</p>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="border-2 border-primary p-2">
              <Hotel className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold">HotelOps {portalTitle}</h1>
          </div>
          
          <LoginForm portal={portal} onToggleMode={() => undefined} />
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Client accounts use the separate client website.
          </div>
        </div>
      </div>
    </div>
  );
}
