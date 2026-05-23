import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MobileSidebar } from './MobileSidebar';
import { NotificationsDropdown } from '@/components/staff/NotificationsDropdown';

export function Header() {
  const { signOut, user } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b-2 border-border bg-card px-6">
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <MobileSidebar />
          </SheetContent>
        </Sheet>
        
        <div className="md:hidden">
          <h1 className="text-lg font-bold">HotelOps</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificationsDropdown />
        
        <div className="hidden text-right text-sm md:block">
          <div className="font-medium">{user?.profile?.full_name}</div>
          <div className="text-muted-foreground">{user?.email}</div>
        </div>
        
        <Button variant="outline" size="icon" onClick={signOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
