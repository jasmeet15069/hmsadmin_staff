import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/dashboard/OrderStatusBadge';
import { useOrders } from '@/hooks/useOrders';
import { cn } from '@/lib/utils';
import { Clock, User, MapPin, ChevronRight, AlertTriangle, Loader2, RefreshCw, Trash2 } from 'lucide-react';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready';

const statusFlow: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready'];

export default function KitchenQueue() {
  const { orders, isLoading, refetch, updateOrderStatus, deleteOrder } = useOrders();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeOrders = orders.filter(order => statusFlow.includes(order.status as OrderStatus));

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const advanceOrder = (orderId: string, status: OrderStatus) => {
    const currentIdx = statusFlow.indexOf(status);
    if (currentIdx < statusFlow.length - 1) {
      updateOrderStatus(orderId, statusFlow[currentIdx + 1]);
    }
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const getNextAction = (status: OrderStatus): string => {
    switch (status) {
      case 'pending': return 'Confirm Order';
      case 'confirmed': return 'Begin Cooking';
      case 'preparing': return 'Mark Ready';
      default: return 'Done';
    }
  };

  const columns: { status: OrderStatus; label: string }[] = [
    { status: 'pending', label: 'New Orders' },
    { status: 'confirmed', label: 'Confirmed' },
    { status: 'preparing', label: 'Cooking' },
    { status: 'ready', label: 'Ready for Pickup' },
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Kitchen Queue</h2>
            <p className="text-muted-foreground">
              {activeOrders.length} active orders | Real-time updates
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} aria-label="Refresh kitchen queue" title="Refresh kitchen queue">
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
            <span className="animate-pulse bg-green-500 h-2 w-2 rounded-full" />
            <span className="text-sm font-medium">Live</span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {columns.map(column => {
            const columnOrders = activeOrders.filter(o => o.status === column.status);

            return (
              <div key={column.status} className="space-y-3">
                <div className="flex items-center justify-between border-b-2 border-border pb-2">
                  <h3 className="font-bold">{column.label}</h3>
                  <span className="bg-muted px-2 py-0.5 text-sm font-bold">
                    {columnOrders.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {columnOrders.map(order => {
                    const isRush = order.status === 'pending' &&
                      Date.now() - new Date(order.created_at).getTime() > 20 * 60 * 1000;

                    return (
                      <div
                        key={order.id}
                        className={cn(
                          'border-2 bg-card p-4 transition-all hover:shadow-sm',
                          isRush && 'border-destructive'
                        )}
                      >
                        {isRush && (
                          <div className="mb-2 flex items-center gap-1 text-sm font-bold text-destructive">
                            <AlertTriangle className="h-4 w-4" />
                            RUSH ORDER
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-lg font-bold">#{order.order_number}</span>
                          <OrderStatusBadge status={order.status as OrderStatus} />
                        </div>

                        <div className="mt-3 space-y-1 text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            Room {order.rooms?.room_number || 'N/A'}
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                            {order.guest_stays?.guest_name || 'Walk-in'}
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {getTimeAgo(order.created_at)}
                          </div>
                        </div>

                        <ul className="mt-3 space-y-1 border-t border-border pt-3">
                          {order.order_items?.map((item) => (
                            <li key={item.id} className="text-sm">
                              <span className="font-medium">{item.quantity}x</span> {item.menu_items?.name || 'Item'}
                              {item.notes && (
                                <span className="ml-1 text-muted-foreground">({item.notes})</span>
                              )}
                            </li>
                          ))}
                        </ul>

                        {(order.special_instructions || order.kitchen_notes) && (
                          <div className="mt-3 border-l-2 border-destructive bg-destructive/5 p-2 text-sm">
                            <span className="font-bold text-destructive">!</span> {order.special_instructions || order.kitchen_notes}
                          </div>
                        )}

                        <div className="mt-4 flex gap-2">
                          {order.status !== 'ready' && (
                            <Button
                              className="flex-1"
                              size="sm"
                              onClick={() => advanceOrder(order.id, order.status as OrderStatus)}
                            >
                              {getNextAction(order.status as OrderStatus)}
                              <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Delete order"
                            title="Delete order"
                            onClick={() => deleteOrder(order.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {columnOrders.length === 0 && (
                    <div className="border-2 border-dashed border-border p-8 text-center text-muted-foreground">
                      No orders
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
