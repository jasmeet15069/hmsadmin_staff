import { OrderStatusBadge } from './OrderStatusBadge';
import { Clock, MapPin, User } from 'lucide-react';

interface LiveOrderCardProps {
  orderNumber: string;
  roomNumber: string;
  guestName: string;
  items: { name: string; quantity: number }[];
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';
  createdAt: string;
  specialInstructions?: string;
}

export function LiveOrderCard({
  orderNumber,
  roomNumber,
  guestName,
  items,
  status,
  createdAt,
  specialInstructions,
}: LiveOrderCardProps) {
  const timeAgo = getTimeAgo(new Date(createdAt));

  return (
    <div className="border-2 border-border bg-card p-4 transition-all hover:shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-bold">#{orderNumber}</span>
            <OrderStatusBadge status={status} />
          </div>
          
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">Room {roomNumber}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{guestName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{timeAgo}</span>
            </div>
          </div>

          <div className="mt-3">
            <ul className="space-y-1">
              {items.slice(0, 3).map((item, idx) => (
                <li key={idx} className="text-sm">
                  <span className="font-medium">{item.quantity}×</span> {item.name}
                </li>
              ))}
              {items.length > 3 && (
                <li className="text-sm text-muted-foreground">+{items.length - 3} more items</li>
              )}
            </ul>
          </div>

          {specialInstructions && (
            <div className="mt-3 border-l-2 border-primary bg-muted/50 p-2 text-sm">
              <span className="font-medium">Note:</span> {specialInstructions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
