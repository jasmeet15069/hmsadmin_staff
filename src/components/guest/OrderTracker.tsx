import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { Package, Clock, CheckCircle2, Truck, ChefHat, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusIcons = {
  pending: Package,
  confirmed: CheckCircle2,
  preparing: ChefHat,
  ready: CheckCircle2,
  picked_up: Truck,
  delivered: CheckCircle2,
  cancelled: Package,
};

export function OrderTracker() {
  const { orders, isLoading, getStatusLabel, getStatusProgress } = useRealtimeOrders(true);

  const activeOrders = orders.filter(
    o => !['delivered', 'cancelled'].includes(o.status)
  );

  if (isLoading) {
    return (
      <Card className="border-2">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (activeOrders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-lg font-bold">
        <Package className="h-5 w-5" />
        Active Orders
        <Badge variant="secondary" className="ml-2">
          {activeOrders.length}
        </Badge>
      </h3>

      {activeOrders.map(order => {
        const progress = getStatusProgress(order.status);
        const StatusIcon = statusIcons[order.status];
        const timeAgo = getTimeAgo(order.created_at);

        return (
          <Card key={order.id} className="border-2 border-primary">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="font-mono">#{order.order_number}</span>
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {timeAgo}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <StatusIcon className="h-4 w-4 text-primary" />
                    <span className="font-medium">{getStatusLabel(order.status)}</span>
                  </div>
                  <span className="text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Status Steps */}
              <div className="flex justify-between text-xs">
                {['Received', 'Confirmed', 'Preparing', 'Ready', 'Delivered'].map((step, idx) => {
                  const stepProgress = (idx + 1) * 20;
                  const isComplete = progress >= stepProgress;
                  const isCurrent = progress >= stepProgress - 20 && progress < stepProgress;

                  return (
                    <div
                      key={step}
                      className={cn(
                        'flex flex-col items-center gap-1',
                        isComplete && 'text-primary',
                        isCurrent && 'font-bold',
                        !isComplete && !isCurrent && 'text-muted-foreground'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full border-2',
                          isComplete && 'border-primary bg-primary text-primary-foreground',
                          isCurrent && 'border-primary',
                          !isComplete && !isCurrent && 'border-muted'
                        )}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>
                      <span className="hidden sm:block">{step}</span>
                    </div>
                  );
                })}
              </div>

              {/* Amount */}
              <div className="flex items-center justify-between border-t-2 pt-3">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold">${Number(order.total_amount).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function getTimeAgo(dateString: string) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
