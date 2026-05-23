import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ClickableStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'highlight';
  href?: string;
}

export function ClickableStatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  variant = 'default',
  href 
}: ClickableStatCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (href) {
      navigate(href);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'border-2 p-6 transition-all hover:shadow-sm',
        variant === 'highlight' && 'border-primary bg-primary text-primary-foreground',
        href && 'cursor-pointer hover:scale-[1.02] hover:shadow-md active:scale-[0.98]'
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
              trend.isPositive ? 'text-primary' : 'text-destructive'
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
