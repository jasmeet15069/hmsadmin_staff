import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingDown, Clock, Thermometer } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type InventoryItem = Tables<'inventory_items'>;

interface PerishableForecastProps {
  items: InventoryItem[];
}

interface ForecastItem {
  item: InventoryItem;
  daysUntilExpiry: number;
  urgency: 'expired' | 'critical' | 'warning' | 'ok';
  fifoAction: string;
}

export function PerishableForecast({ items }: PerishableForecastProps) {
  const perishables = items.filter(i => i.is_perishable && i.expiry_date);

  const forecast: ForecastItem[] = perishables
    .map(item => {
      const daysUntilExpiry = Math.ceil(
        (new Date(item.expiry_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      let urgency: ForecastItem['urgency'] = 'ok';
      let fifoAction = 'Use in rotation';

      if (daysUntilExpiry <= 0) {
        urgency = 'expired';
        fifoAction = 'DISCARD — expired, log waste immediately';
      } else if (daysUntilExpiry <= 1) {
        urgency = 'critical';
        fifoAction = 'USE FIRST — expires today/tomorrow';
      } else if (daysUntilExpiry <= 3) {
        urgency = 'warning';
        fifoAction = `Prioritize usage — ${daysUntilExpiry} days remaining`;
      }

      return { item, daysUntilExpiry, urgency, fifoAction };
    })
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  const expired = forecast.filter(f => f.urgency === 'expired');
  const critical = forecast.filter(f => f.urgency === 'critical');
  const warning = forecast.filter(f => f.urgency === 'warning');

  const urgentItems = [...expired, ...critical, ...warning];

  if (urgentItems.length === 0) {
    return (
      <Card className="border-2 border-green-600/30">
        <CardContent className="py-6 text-center">
          <Thermometer className="mx-auto mb-2 h-8 w-8 text-green-600" />
          <p className="font-medium text-green-800">All perishables within safe shelf life</p>
          <p className="text-sm text-muted-foreground">{perishables.length} perishable items tracked</p>
        </CardContent>
      </Card>
    );
  }

  const wasteRisk = expired.reduce(
    (sum, f) => sum + Number(f.item.current_stock) * Number(f.item.cost_per_unit || 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {expired.length > 0 && (
          <div className="border-2 border-destructive bg-destructive/5 p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-bold text-destructive">Expired</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{expired.length}</p>
            {wasteRisk > 0 && (
              <p className="text-xs text-destructive/80">~${wasteRisk.toFixed(2)} waste risk</p>
            )}
          </div>
        )}
        {critical.length > 0 && (
          <div className="border-2 border-amber-600 bg-amber-50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-700" />
              <span className="text-sm font-bold text-amber-700">Expiring &lt;24h</span>
            </div>
            <p className="text-2xl font-bold text-amber-700">{critical.length}</p>
          </div>
        )}
        {warning.length > 0 && (
          <div className="border-2 border-yellow-500 bg-yellow-50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-yellow-700" />
              <span className="text-sm font-bold text-yellow-700">Expiring &lt;3 days</span>
            </div>
            <p className="text-2xl font-bold text-yellow-700">{warning.length}</p>
          </div>
        )}
      </div>

      {/* FIFO Action List */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Thermometer className="h-4 w-4" />
            FIFO Priority Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {urgentItems.map(({ item, daysUntilExpiry, urgency, fifoAction }) => {
            const shelfProgress = urgency === 'expired'
              ? 100
              : urgency === 'critical'
                ? 85
                : urgency === 'warning'
                  ? 60
                  : 30;

            return (
              <div key={item.id} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.name}</span>
                    <Badge
                      variant={urgency === 'expired' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {urgency === 'expired'
                        ? 'EXPIRED'
                        : `${daysUntilExpiry}d left`}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {fifoAction}
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>{Number(item.current_stock)} {item.unit} in stock</span>
                    <span>Expires: {item.expiry_date}</span>
                  </div>
                </div>
                <div className="w-16">
                  <Progress
                    value={shelfProgress}
                    className={`h-2 ${urgency === 'expired' ? '[&>div]:bg-destructive' : urgency === 'critical' ? '[&>div]:bg-amber-500' : '[&>div]:bg-yellow-500'}`}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
