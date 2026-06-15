import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Download, Eye, RefreshCw, Search, TrendingUp, BedDouble, Users, Wrench } from 'lucide-react';

const apiBase = import.meta.env.VITE_API_URL || '/api';

type ReportData = Record<string, unknown>;

const authHeaders = () => {
  try {
    const rawSession = localStorage.getItem('hotel_harmony_session');
    const session = rawSession ? JSON.parse(rawSession) : null;
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  } catch { return {}; }
};

const reports = [
  { key: 'occupancy', title: 'Occupancy' },
  { key: 'revenue', title: 'Revenue' },
  { key: 'complaints', title: 'Complaints' },
  { key: 'bookings-pace', title: 'Booking Pace' },
  { key: 'staff-activity', title: 'Staff Activity' },
  { key: 'ai-usage', title: 'AI Usage' },
];

const guestLedgerData = [
  { date: '2026-06-01', guest: 'Rajesh Kumar', room: '101', description: 'Room Charge', debit: 5000, credit: 0, balance: 5000 },
  { date: '2026-06-01', guest: 'Priya Sharma', room: '202', description: 'Room Charge', debit: 7500, credit: 0, balance: 7500 },
  { date: '2026-06-02', guest: 'Amit Singh', room: '305', description: 'Room Charge', debit: 4000, credit: 0, balance: 4000 },
  { date: '2026-06-02', guest: 'Sneha Patel', room: '110', description: 'Restaurant Bill', debit: 1200, credit: 0, balance: 5200 },
  { date: '2026-06-03', guest: 'Vikram Reddy', room: '201', description: 'Room Charge', debit: 6000, credit: 0, balance: 6000 },
  { date: '2026-06-03', guest: 'Rajesh Kumar', room: '101', description: 'Payment Received', debit: 0, credit: 5000, balance: 0 },
  { date: '2026-06-04', guest: 'Ananya Gupta', room: '404', description: 'Room Charge', debit: 8000, credit: 0, balance: 8000 },
  { date: '2026-06-04', guest: 'Priya Sharma', room: '202', description: 'Mini Bar', debit: 850, credit: 0, balance: 8350 },
  { date: '2026-06-05', guest: 'Rohit Joshi', room: '503', description: 'Room Charge', debit: 5500, credit: 0, balance: 5500 },
  { date: '2026-06-05', guest: 'Amit Singh', room: '305', description: 'Laundry Service', debit: 600, credit: 0, balance: 4600 },
];

const trialBalanceData = [
  { account: 'Room Revenue', debit: 0, credit: 450000 },
  { account: 'F&B Revenue', debit: 0, credit: 125000 },
  { account: 'GST Collected', debit: 0, credit: 57500 },
  { account: 'Other Income', debit: 0, credit: 28500 },
  { account: 'Accounts Receivable', debit: 62000, credit: 0 },
  { account: 'Cash in Hand', debit: 85000, credit: 0 },
  { account: 'Bank Account', debit: 320000, credit: 0 },
  { account: 'Salary Payable', debit: 0, credit: 95000 },
  { account: 'Maintenance Expense', debit: 42000, credit: 0 },
  { account: 'Utility Expense', debit: 28000, credit: 0 },
  { account: 'Housekeeping Supplies', debit: 15000, credit: 0 },
  { account: 'Marketing Expense', debit: 22000, credit: 0 },
];

export default function ReportsPage() {
  const [data, setData] = useState<Record<string, ReportData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(reports[0].key);
  const [tab, setTab] = useState('overview');

  const [ledgerSearch, setLedgerSearch] = useState('');

  const [reportName, setReportName] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [metric, setMetric] = useState('revenue');
  const [groupBy, setGroupBy] = useState('day');
  const [customResult, setCustomResult] = useState<Record<string, unknown>[] | null>(null);
  const [customLoading, setCustomLoading] = useState(false);

  const filteredLedger = guestLedgerData.filter(
    row => row.guest.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      row.description.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      row.room.includes(ledgerSearch),
  );

  const fetchReports = async () => {
    setIsLoading(true);
    const entries = await Promise.all(
      reports.map(async report => {
        const response = await fetch(`${apiBase}/reports/${report.key}`, { headers: authHeaders() });
        const payload = await response.json().catch(() => ({}));
        return [report.key, payload.data || {}] as const;
      }),
    );
    setData(Object.fromEntries(entries));
    setIsLoading(false);
  };

  useEffect(() => { fetchReports(); }, []);

  const activeReport = reports.find(report => report.key === selectedReport) || reports[0];
  const activeData = data[activeReport.key] || {};
  const activeRows = Object.entries(activeData).filter(([key]) => key !== 'report');

  const handleGenerateReport = async () => {
    setCustomLoading(true);
    setCustomResult(null);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (groupBy) params.set('group_by', groupBy);
      const response = await fetch(`${apiBase}/reports/${metric}?${params}`, { headers: authHeaders() });
      const payload = await response.json().catch(() => ({}));
      const resultData = payload.data || {};
      const rows = Object.entries(resultData).filter(([k]) => k !== 'report').map(([key, value]) => ({ key, value }));
      setCustomResult(rows);
    } catch { setCustomResult([]); }
    setCustomLoading(false);
  };

  const handleExportCSV = () => {
    if (!customResult || customResult.length === 0) return;
    const headers = ['Metric', 'Value'];
    const csvContent = [headers.join(','), ...customResult.map(row => `${row.key},${row.value}`)].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${reportName || 'report'}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
            <p className="text-muted-foreground">Operational analytics, guest ledger, trial balance, and export-ready summaries</p>
          </div>
          <Button variant="outline" size="icon" onClick={fetchReports} aria-label="Refresh reports"><RefreshCw className="h-4 w-4" /></Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue-daily">Revenue (Daily)</TabsTrigger>
            <TabsTrigger value="occupancy-reports">Occupancy</TabsTrigger>
            <TabsTrigger value="housekeeping-reports">Housekeeping</TabsTrigger>
            <TabsTrigger value="guest-history">Guest History</TabsTrigger>
            <TabsTrigger value="guest-ledger">Guest Ledger</TabsTrigger>
            <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
            <TabsTrigger value="custom">Custom Report</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-3">
              {reports.map(report => (
                <div key={report.key} className="border-2 bg-card p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-bold"><BarChart3 className="h-4 w-4" />{report.title}</h3>
                    <Button variant="ghost" size="icon" aria-label={`Export ${report.title}`}><Download className="h-4 w-4" /></Button>
                  </div>
                  <Button variant={selectedReport === report.key ? 'default' : 'outline'} className="mb-4 w-full" onClick={() => setSelectedReport(report.key)}><Eye className="mr-2 h-4 w-4" />Show Live Report</Button>
                  {isLoading ? (<p className="text-sm text-muted-foreground">Loading...</p>) : (
                    <dl className="space-y-2 text-sm">
                      {Object.entries(data[report.key] || {}).filter(([key]) => key !== 'report').map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between border-b pb-1">
                          <dt className="capitalize text-muted-foreground">{key.replaceAll('_', ' ')}</dt>
                          <dd className="font-mono font-bold">{String(value ?? '-')}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              ))}
            </div>

            <div className="border-2 bg-card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-xl font-bold"><BarChart3 className="h-5 w-5" />{activeReport.title} Live View</h3>
                  <p className="text-sm text-muted-foreground">Selected report shown directly on the website.</p>
                </div>
                <Button variant="outline" onClick={fetchReports}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
              </div>
              {isLoading ? (<p className="text-sm text-muted-foreground">Loading live report...</p>) : activeRows.length === 0 ? (
                <div className="border-2 border-dashed p-8 text-center text-muted-foreground">No live values available for this report yet.</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {activeRows.map(([key, value]) => (
                    <div key={key} className="border-2 p-4">
                      <div className="text-sm capitalize text-muted-foreground">{key.replaceAll('_', ' ')}</div>
                      <div className="mt-2 break-words font-mono text-2xl font-bold">{String(value ?? '-')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="revenue-daily" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Today's Revenue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">$12,450</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">This Month</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">$285,000</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Month-over-Month</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">+12.5%</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Year-over-Year</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">+8.3%</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">Last 7 Days Revenue Breakdown</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Room Revenue</TableHead><TableHead>F&B</TableHead><TableHead>Other</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {[{date:'Jun 9',room:4800,fb:1200,other:450,total:6450},{date:'Jun 10',room:5200,fb:1400,other:320,total:6920},{date:'Jun 11',room:4900,fb:1100,other:280,total:6280},{date:'Jun 12',room:6100,fb:1800,other:520,total:8420},{date:'Jun 13',room:5800,fb:1500,other:400,total:7700},{date:'Jun 14',room:7200,fb:2100,other:650,total:9950},{date:'Jun 15 (Today)',room:5500,fb:1600,other:350,total:7450}].map((r,i) => (
                      <TableRow key={i}><TableCell className="font-medium">{r.date}</TableCell><TableCell className="font-mono">${r.room.toFixed(2)}</TableCell><TableCell className="font-mono">${r.fb.toFixed(2)}</TableCell><TableCell className="font-mono">${r.other.toFixed(2)}</TableCell><TableCell className="font-mono font-bold">${r.total.toFixed(2)}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="occupancy-reports" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Today</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">68%</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">This Week</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">72%</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">MTD</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">70.5%</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Last Month</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">65.2%</p></CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="housekeeping-reports" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Rooms Cleaned Today</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">33</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">8</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Avg Turnaround</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">28m</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Inspection Pass %</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">94%</p></CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="guest-history" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Guest</TableHead><TableHead>Total Visits</TableHead><TableHead>Last Stay</TableHead><TableHead>Lifetime Value</TableHead><TableHead>Avg Rating</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {[{name:'Rajesh Kumar',visits:12,last:'2026-06-03',ltv:48500,rating:4.5},{name:'Priya Sharma',visits:8,last:'2026-06-04',ltv:32000,rating:4.8},{name:'Amit Singh',visits:5,last:'2026-06-05',ltv:18500,rating:4.2},{name:'Ananya Gupta',visits:3,last:'2026-06-04',ltv:24000,rating:3.9},{name:'Vikram Reddy',visits:6,last:'2026-06-03',ltv:29500,rating:4.6}].map((g,i) => (
                      <TableRow key={i}><TableCell className="font-medium">{g.name}</TableCell><TableCell className="font-mono">{g.visits}</TableCell><TableCell>{new Date(g.last).toLocaleDateString()}</TableCell><TableCell className="font-mono font-bold">${g.ltv.toLocaleString()}</TableCell><TableCell>{g.rating}/5</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guest-ledger" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle>Guest Ledger</CardTitle>
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search guest, room or description..." value={ledgerSearch} onChange={e => setLedgerSearch(e.target.value)} className="pl-8" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Guest Name</TableHead><TableHead>Room</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredLedger.length === 0 ? (<TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No transactions found.</TableCell></TableRow>) : (
                      filteredLedger.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{row.guest}</TableCell>
                          <TableCell className="font-mono">{row.room}</TableCell>
                          <TableCell>{row.description}</TableCell>
                          <TableCell className="text-right font-mono">{row.debit > 0 ? `₹${row.debit.toLocaleString()}` : '-'}</TableCell>
                          <TableCell className="text-right font-mono">{row.credit > 0 ? `₹${row.credit.toLocaleString()}` : '-'}</TableCell>
                          <TableCell className="text-right font-mono font-bold">₹{row.balance.toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trial-balance" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Trial Balance</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="text-right">Debit (₹)</TableHead><TableHead className="text-right">Credit (₹)</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {trialBalanceData.map((row, i) => (
                      <TableRow key={i}><TableCell className="font-medium">{row.account}</TableCell><TableCell className="text-right font-mono">{row.debit > 0 ? row.debit.toLocaleString() : '-'}</TableCell><TableCell className="text-right font-mono">{row.credit > 0 ? row.credit.toLocaleString() : '-'}</TableCell></TableRow>
                    ))}
                    <TableRow><TableCell className="font-bold">Total</TableCell><TableCell className="text-right font-mono font-bold">₹{trialBalanceData.reduce((s, r) => s + r.debit, 0).toLocaleString()}</TableCell><TableCell className="text-right font-mono font-bold">₹{trialBalanceData.reduce((s, r) => s + r.credit, 0).toLocaleString()}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Custom Report Builder</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1"><Label>Report Name</Label><Input placeholder="e.g. June Revenue Summary" value={reportName} onChange={e => setReportName(e.target.value)} /></div>
                  <div className="space-y-1"><Label>From Date</Label><Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
                  <div className="space-y-1"><Label>To Date</Label><Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Metric</Label><Select value={metric} onValueChange={setMetric}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="revenue">Revenue</SelectItem><SelectItem value="occupancy">Occupancy</SelectItem><SelectItem value="bookings-pace">Bookings</SelectItem><SelectItem value="complaints">Complaints</SelectItem><SelectItem value="staff-activity">Staff Activity</SelectItem></SelectContent></Select></div>
                  <div className="space-y-1"><Label>Group By</Label><Select value={groupBy} onValueChange={setGroupBy}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="day">Day</SelectItem><SelectItem value="week">Week</SelectItem><SelectItem value="month">Month</SelectItem></SelectContent></Select></div>
                  <div className="flex items-end gap-2">
                    <Button onClick={handleGenerateReport} disabled={customLoading}>{customLoading ? 'Generating...' : 'Generate Report'}</Button>
                    <Button variant="outline" onClick={handleExportCSV} disabled={!customResult || customResult.length === 0}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            {customLoading && <p className="text-sm text-muted-foreground">Loading report data...</p>}
            {customResult && customResult.length === 0 && !customLoading && <div className="border-2 border-dashed p-8 text-center text-muted-foreground">No data returned for this report.</div>}
            {customResult && customResult.length > 0 && !customLoading && (
              <Card>
                <CardHeader><CardTitle>{reportName || `${metric} Report`}</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                    <TableBody>{customResult.map((row, i) => (<TableRow key={i}><TableCell className="capitalize">{String(row.key).replaceAll('_', ' ')}</TableCell><TableCell className="text-right font-mono font-bold">{String(row.value)}</TableCell></TableRow>))}</TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
