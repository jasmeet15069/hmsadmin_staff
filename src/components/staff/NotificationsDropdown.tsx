import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useStaffNotifications } from '@/hooks/useStaffNotifications';
import { Bell, Check, Trash2, Package, AlertTriangle, ChefHat } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeIcons = {
  new_order: Package,
  order_ready: ChefHat,
  new_complaint: AlertTriangle,
  complaint_critical: AlertTriangle,
};

const typeColors = {
  new_order: 'text-primary',
  order_ready: 'text-primary',
  new_complaint: 'text-amber-600',
  complaint_critical: 'text-destructive',
};

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useStaffNotifications();

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 border-2 p-0" align="end">
        <div className="flex items-center justify-between border-b-2 p-3">
          <h4 className="font-bold">Notifications</h4>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <Check className="mr-1 h-3 w-3" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="icon" onClick={clearNotifications}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Bell className="mb-2 h-8 w-8 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => {
                const Icon = typeIcons[notification.type];
                const colorClass = typeColors[notification.type];

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex gap-3 p-3 transition-colors hover:bg-muted/50 cursor-pointer',
                      !notification.read && 'bg-primary/5'
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className={cn('mt-0.5', colorClass)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between">
                        <p className={cn('text-sm', !notification.read && 'font-bold')}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getTimeAgo(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
