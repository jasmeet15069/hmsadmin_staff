import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePayments } from '@/hooks/usePayments';
import { useHotelBranding } from '@/hooks/useHotelBranding';
import { formatCurrency, getCountryOption } from '@/lib/currency';
import { Loader2, CheckCircle, XCircle, Clock, Search, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PaymentsPage() {
  const { payments, isLoading, stats, refetch } = usePayments();
  const { branding } = useHotelBranding();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const currencyOption = getCountryOption(branding.country, branding.currency);
  const money = (amount: number) => formatCurrency(amount, currencyOption);

  const filteredPayments = payments.filter(payment =>
    payment.payment_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payment.guest_stays?.guest_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
      case 'refunded':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-800 border-green-600',
      pending: 'bg-amber-100 text-amber-800 border-amber-600',
      failed: 'bg-red-100 text-red-800 border-red-600',
      refunded: 'bg-gray-100 text-gray-800 border-gray-600',
    };
    return (
      <Badge variant="outline" className={cn('border-2', styles[status])}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Payments</h2>
            <p className="text-muted-foreground">
              {stats.completed} completed | {stats.pending} pending | {money(stats.total)} total
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh} aria-label="Refresh payments" title="Refresh payments">
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="border-2 border-green-600 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">Completed</p>
            <p className="text-3xl font-bold text-green-800">{stats.completed}</p>
          </div>
          <div className="border-2 border-amber-600 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">Pending</p>
            <p className="text-3xl font-bold text-amber-800">{stats.pending}</p>
          </div>
          <div className="border-2 border-destructive bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">Failed</p>
            <p className="text-3xl font-bold text-destructive">{stats.failed}</p>
          </div>
          <div className="border-2 border-primary bg-primary/5 p-4">
            <p className="text-sm font-medium">Total Revenue</p>
            <p className="text-3xl font-bold">{money(stats.total)}</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="border-2 pl-9"
          />
        </div>

        <div className="border-2 border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2">
                <TableHead>Payment #</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map(payment => (
                <TableRow key={payment.id} className="border-b">
                  <TableCell className="font-mono font-bold">{payment.payment_number}</TableCell>
                  <TableCell>
                    {payment.guest_stays?.guest_name || 'N/A'}
                    {payment.guest_stays?.rooms?.room_number && (
                      <span className="ml-1 text-sm text-muted-foreground">
                        (Room {payment.guest_stays.rooms.room_number})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{payment.orders?.order_number || '-'}</TableCell>
                  <TableCell className="font-mono font-bold">{money(Number(payment.amount))}</TableCell>
                  <TableCell>{payment.payment_method}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(payment.status)}
                      {getStatusBadge(payment.status)}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {filteredPayments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No payments found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
