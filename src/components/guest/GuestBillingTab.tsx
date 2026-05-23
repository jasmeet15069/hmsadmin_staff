import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, Receipt, Loader2 } from 'lucide-react';

interface GuestStay {
  id: string;
  guest_name: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: number | null;
  actual_check_in: string | null;
  actual_check_out: string | null;
  rooms: { room_number: string; room_type: string } | null;
}

interface Payment {
  id: string;
  payment_number: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
}

export function GuestBillingTab() {
  const { user } = useAuth();
  const [stays, setStays] = useState<GuestStay[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchBilling = async () => {
      try {
        const [staysRes, paymentsRes] = await Promise.all([
          supabase
            .from('guest_stays')
            .select('*, rooms(room_number, room_type)')
            .eq('guest_id', user.id)
            .order('check_in_date', { ascending: false }),
          supabase
            .from('payments')
            .select('*')
            .eq('guest_stays.guest_id', user.id)
            .order('created_at', { ascending: false }),
        ]);

        setStays((staysRes.data as any) || []);
        setPayments(paymentsRes.data || []);
      } catch (err) {
        console.error('Error fetching billing:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBilling();
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const activeStay = stays.find(s => s.actual_check_in && !s.actual_check_out);
  const totalBilled = stays.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">Billing & Invoices</h3>

      {/* Current Stay Summary */}
      {activeStay ? (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Stay
            </CardTitle>
            <CardDescription>
              Room {activeStay.rooms?.room_number} • {activeStay.rooms?.room_type}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Check-in</span>
              <span className="font-medium">{new Date(activeStay.check_in_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Check-out</span>
              <span className="font-medium">{new Date(activeStay.check_out_date).toLocaleDateString()}</span>
            </div>
            {activeStay.total_amount && (
              <div className="flex justify-between pt-2">
                <span className="font-bold">Total Amount</span>
                <span className="text-xl font-bold">${Number(activeStay.total_amount).toFixed(2)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2">
          <CardContent className="py-8 text-center text-muted-foreground">
            <CreditCard className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>No active stay found.</p>
            <p className="text-sm">Book a room to see billing details here.</p>
          </CardContent>
        </Card>
      )}

      {/* Past Stay History */}
      {stays.length > 0 && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Stay History
            </CardTitle>
            <CardDescription>
              {stays.length} stay(s) • ${totalBilled.toFixed(2)} total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-b-2">
                  <TableHead>Room</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stays.map(stay => (
                  <TableRow key={stay.id}>
                    <TableCell className="font-medium">
                      {stay.rooms?.room_number || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(stay.check_in_date).toLocaleDateString()} –{' '}
                      {new Date(stay.check_out_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-mono font-bold">
                      ${Number(stay.total_amount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={stay.actual_check_out ? 'secondary' : 'default'}>
                        {stay.actual_check_out ? 'Completed' : stay.actual_check_in ? 'Active' : 'Upcoming'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
