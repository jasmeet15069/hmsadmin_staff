import { cn } from '@/lib/utils';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-muted text-muted-foreground border-muted-foreground' },
  confirmed: { label: 'Confirmed', className: 'bg-blue-100 text-blue-800 border-blue-800' },
  preparing: { label: 'Preparing', className: 'bg-amber-100 text-amber-800 border-amber-800' },
  ready: { label: 'Ready', className: 'bg-green-100 text-green-800 border-green-800' },
  picked_up: { label: 'Picked Up', className: 'bg-purple-100 text-purple-800 border-purple-800' },
  delivered: { label: 'Delivered', className: 'bg-primary text-primary-foreground border-primary' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive border-destructive' },
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn('inline-block border-2 px-2 py-1 text-xs font-bold uppercase tracking-wide', config.className)}>
      {config.label}
    </span>
  );
}
