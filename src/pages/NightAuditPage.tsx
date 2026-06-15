import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Loader2, CheckCircle2, Circle, DollarSign, Receipt, FileText, CalendarDays,
  ArrowRight, ArrowUp, ArrowDown, Moon,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  task: string;
  category: string;
}

interface RevenueAudit {
  expected_revenue: number;
  actual_revenue: number;
  currency: string;
}

interface TaxEntry {
  tax_type: string;
  collected: number;
  payable: number;
}

interface Report {
  id: string;
  report_date: string;
  status: string;
  total_revenue: number;
  closed_by: string;
  created_at: string;
}

const CHECKLIST_TASKS: ChecklistItem[] = [
  { id: '1', task: 'Verify all guest check-ins and check-outs are posted', category: 'Front Desk' },
  { id: '2', task: 'Reconcile room occupancy with housekeeping report', category: 'Front Desk' },
  { id: '3', task: 'Post all room charges and taxes', category: 'Billing' },
  { id: '4', task: 'Verify all folio balances match system totals', category: 'Billing' },
  { id: '5', task: 'Reconcile restaurant and bar postings', category: 'F&B' },
  { id: '6', task: 'Verify banquet and event charges', category: 'Events' },
  { id: '7', task: 'Audit all cash and card transactions', category: 'Finance' },
  { id: '8', task: 'Reconcile end-of-day cash drop', category: 'Finance' },
  { id: '9', task: 'Verify tax calculations for the day', category: 'Tax' },
  { id: '10', task: 'Generate and review backup reports', category: 'Reports' },
];

export default function NightAuditPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [revenueAudit, setRevenueAudit] = useState<RevenueAudit | null>(null);
  const [taxEntries, setTaxEntries] = useState<TaxEntry[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const fetchRevenueAudit = async () => {
    try {
      const res = await fetch('/api/night-audit/revenue-audit');
      const json = await res.json();
      setRevenueAudit(json.data || null);
    } catch { /* ignore */ }
  };

  const fetchTaxAudit = async () => {
    try {
      const res = await fetch('/api/night-audit/tax-audit');
      const json = await res.json();
      setTaxEntries(json.data || []);
    } catch { /* ignore */ }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/night-audit/reports');
      const json = await res.json();
      setReports(json.data || []);
    } catch { /* ignore */ }
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchRevenueAudit(), fetchTaxAudit(), fetchReports()]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const toggleTask = (id: string) => {
    setCompletedTasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCloseDay = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/night-audit/close-day', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) throw new Error();
      toast({ title: 'Day closed successfully', description: 'Night audit has been completed for today.' });
      fetchAll();
    } catch {
      toast({ title: 'Error closing day', variant: 'destructive' });
    }
    setSaving(false);
  };

  const variance = revenueAudit ? revenueAudit.actual_revenue - revenueAudit.expected_revenue : 0;
  const allCompleted = completedTasks.size === CHECKLIST_TASKS.length;
  const completedCount = completedTasks.size;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Moon className="h-8 w-8 text-primary" />
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Night Audit</h2>
              <p className="text-lg font-medium text-muted-foreground">{today}</p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="lg" disabled={saving || !allCompleted}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Close Day
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Day Close</AlertDialogTitle>
                <AlertDialogDescription>
                  This will finalize all transactions for today, post ending balances, and lock the day's records.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleCloseDay}>Confirm Close Day</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-5 w-5" />
                Audit Checklist
                <Badge variant={allCompleted ? 'default' : 'outline'} className="ml-auto">
                  {completedCount}/{CHECKLIST_TASKS.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <div className="space-y-1">
                  {CHECKLIST_TASKS.map(item => (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                        completedTasks.has(item.id) && 'border-green-200 bg-green-50',
                      )}
                    >
                      <Checkbox
                        id={`task-${item.id}`}
                        checked={completedTasks.has(item.id)}
                        onCheckedChange={() => toggleTask(item.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={`task-${item.id}`}
                          className={cn(
                            'text-sm font-medium cursor-pointer',
                            completedTasks.has(item.id) && 'line-through text-muted-foreground',
                          )}
                        >
                          {item.task}
                        </label>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-xs">{item.category}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-5 w-5" />
                  Revenue Audit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : revenueAudit ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Expected Revenue</p>
                        <p className="text-xl font-bold">{revenueAudit.currency} {revenueAudit.expected_revenue.toLocaleString()}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Actual Revenue</p>
                        <p className="text-xl font-bold">{revenueAudit.currency} {revenueAudit.actual_revenue.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">Variance</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {variance >= 0 ? (
                          <ArrowUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowDown className="h-4 w-4 text-red-600" />
                        )}
                        <p className={cn('text-lg font-bold', variance >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {revenueAudit.currency} {Math.abs(variance).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">No revenue data yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Receipt className="h-5 w-5" />
                  Tax Audit
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : taxEntries.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No tax entries found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tax Type</TableHead>
                        <TableHead className="text-right">Collected</TableHead>
                        <TableHead className="text-right">Payable</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taxEntries.map((tax, i) => (
                        <TableRow key={tax.tax_type || i}>
                          <TableCell className="font-medium capitalize">{tax.tax_type}</TableCell>
                          <TableCell className="font-mono text-right">${tax.collected.toLocaleString()}</TableCell>
                          <TableCell className="font-mono text-right">${tax.payable.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" />
              Past Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : reports.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No past reports available</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead>Closed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map(report => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        {new Date(report.report_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={report.status === 'completed' ? 'default' : 'outline'}>
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-right">${report.total_revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground">{report.closed_by}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
