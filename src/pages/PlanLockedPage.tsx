import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { STAFF_NAV_ITEMS } from '@/lib/staffNavigation';
import { Lock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PlanLockedPageProps {
  moduleID: string;
}

export default function PlanLockedPage({ moduleID }: PlanLockedPageProps) {
  const { limits } = usePlanLimits();
  const moduleLabel = STAFF_NAV_ITEMS.find(item => item.id === moduleID)?.label || 'This panel';
  const planName = limits?.plan_name || 'Basic';

  return (
    <DashboardLayout>
      <div className="flex min-h-[55vh] items-center justify-center">
        <Card className="w-full max-w-xl border-2">
          <CardHeader>
            <div className="mb-3 flex h-12 w-12 items-center justify-center border-2 border-border">
              <Lock className="h-6 w-6" />
            </div>
            <CardTitle>{moduleLabel} is locked</CardTitle>
            <CardDescription>
              This hotel is currently on the {planName} plan. Unlock Pro plan or more to use this panel.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/settings">
                <Sparkles className="mr-2 h-4 w-4" />
                View Upgrade Options
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

