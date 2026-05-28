import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Building2, ShieldCheck } from 'lucide-react';

export default function PlatformPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Platform Admin</h2>
          <p className="text-muted-foreground">Cross-hotel tenant management for HotelOps operators</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="border-2 bg-card p-4">
            <Building2 className="mb-3 h-5 w-5" />
            <p className="text-sm text-muted-foreground">Tenants</p>
            <p className="text-3xl font-bold">1</p>
          </div>
          <div className="border-2 bg-card p-4">
            <ShieldCheck className="mb-3 h-5 w-5" />
            <p className="text-sm text-muted-foreground">Plan</p>
            <p className="text-3xl font-bold">Enterprise</p>
          </div>
          <div className="border-2 bg-card p-4">
            <Badge variant="outline" className="border-2">Next pass</Badge>
            <p className="mt-3 text-sm text-muted-foreground">
              Tenant impersonation, usage metering, health checks, and billing controls are staged for the platform module.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
