import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MobileSidebar } from './MobileSidebar';
import { NotificationsDropdown } from '@/components/staff/NotificationsDropdown';

export function Header() {
  const { signOut, user } = useAuth();

  return (
    <header className="flex h-12 items-center justify-between border-b-2 border-border bg-card px-3">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 md:hidden">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-52 p-0">
            <MobileSidebar />
          </SheetContent>
        </Sheet>
        
        <div className="md:hidden">
          <h1 className="text-base font-bold">HotelOps</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <NotificationsDropdown />
        
        <div className="hidden max-w-[240px] text-right text-[0.82rem] leading-tight md:block">
          <div className="font-medium">{user?.profile?.full_name}</div>
          <div className="truncate text-muted-foreground">{user?.email}</div>
        </div>
        
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={signOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
