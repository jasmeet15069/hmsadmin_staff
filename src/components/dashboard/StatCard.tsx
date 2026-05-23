import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'highlight';
}

export function StatCard({ title, value, subtitle, icon, trend, variant = 'default' }: StatCardProps) {
  return (
    <div
      className={cn(
        'border-2 p-6 transition-all hover:shadow-sm',
        variant === 'highlight' && 'border-primary bg-primary text-primary-foreground'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={cn(
            'text-sm font-medium',
            variant === 'default' ? 'text-muted-foreground' : 'text-primary-foreground/80'
          )}>
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className={cn(
              'mt-1 text-sm',
              variant === 'default' ? 'text-muted-foreground' : 'text-primary-foreground/70'
            )}>
              {subtitle}
            </p>
          )}
          {trend && (
            <p className={cn(
              'mt-2 text-sm font-medium',
              trend.isPositive ? 'text-green-600' : 'text-destructive'
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% from last week
            </p>
          )}
        </div>
        <div className={cn(
          'p-3 border-2',
          variant === 'default' ? 'border-border bg-muted' : 'border-primary-foreground/20 bg-primary-foreground/10'
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}
