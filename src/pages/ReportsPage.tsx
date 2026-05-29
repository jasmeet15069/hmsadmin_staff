import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { BarChart3, Download, Eye, RefreshCw } from 'lucide-react';

const apiBase = import.meta.env.VITE_API_URL || '/api';

type ReportData = Record<string, unknown>;

const authHeaders = () => {
  try {
    const rawSession = localStorage.getItem('hotel_harmony_session');
    const session = rawSession ? JSON.parse(rawSession) : null;
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  } catch {
    return {};
  }
};

const reports = [
  { key: 'occupancy', title: 'Occupancy' },
  { key: 'revenue', title: 'Revenue' },
  { key: 'complaints', title: 'Complaints' },
  { key: 'bookings-pace', title: 'Booking Pace' },
  { key: 'staff-activity', title: 'Staff Activity' },
  { key: 'ai-usage', title: 'AI Usage' },
];

export default function ReportsPage() {
  const [data, setData] = useState<Record<string, ReportData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(reports[0].key);

  const fetchReports = async () => {
    setIsLoading(true);
    const entries = await Promise.all(
      reports.map(async report => {
        const response = await fetch(`${apiBase}/reports/${report.key}`, {
          headers: authHeaders(),
        });
        const payload = await response.json().catch(() => ({}));
        return [report.key, payload.data || {}] as const;
      }),
    );
    setData(Object.fromEntries(entries));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const activeReport = reports.find(report => report.key === selectedReport) || reports[0];
  const activeData = data[activeReport.key] || {};
  const activeRows = Object.entries(activeData).filter(([key]) => key !== 'report');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
            <p className="text-muted-foreground">Operational analytics and export-ready summaries</p>
          </div>
          <Button variant="outline" size="icon" onClick={fetchReports} aria-label="Refresh reports">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {reports.map(report => (
            <div key={report.key} className="border-2 bg-card p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-bold">
                  <BarChart3 className="h-4 w-4" />
                  {report.title}
                </h3>
                <Button variant="ghost" size="icon" aria-label={`Export ${report.title}`}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant={selectedReport === report.key ? 'default' : 'outline'}
                className="mb-4 w-full"
                onClick={() => setSelectedReport(report.key)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Show Live Report
              </Button>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <dl className="space-y-2 text-sm">
                  {Object.entries(data[report.key] || {})
                    .filter(([key]) => key !== 'report')
                    .map(([key, value]) => (
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
              <h3 className="flex items-center gap-2 text-xl font-bold">
                <BarChart3 className="h-5 w-5" />
                {activeReport.title} Live View
              </h3>
              <p className="text-sm text-muted-foreground">This is the selected report shown directly on the website.</p>
            </div>
            <Button variant="outline" onClick={fetchReports}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading live report...</p>
          ) : activeRows.length === 0 ? (
            <div className="border-2 border-dashed p-8 text-center text-muted-foreground">
              No live values available for this report yet.
            </div>
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
      </div>
    </DashboardLayout>
  );
}
