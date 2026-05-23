import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useComplaintAnalysis } from '@/hooks/useComplaintAnalysis';
import { 
  Sparkles, 
  Loader2, 
  AlertTriangle, 
  Clock, 
  User, 
  Gift,
  ArrowUp,
  CheckCircle2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComplaintAnalysisPanelProps {
  description: string;
  category?: string;
  onAnalysisComplete?: (analysis: ReturnType<typeof useComplaintAnalysis>['analysis']) => void;
}

const priorityColors = {
  low: 'border-muted-foreground bg-muted text-muted-foreground',
  medium: 'border-amber-600 bg-amber-50 text-amber-800',
  high: 'border-orange-600 bg-orange-50 text-orange-800',
  critical: 'border-destructive bg-destructive/10 text-destructive',
};

const sentimentIcons = {
  neutral: '😐',
  negative: '😟',
  very_negative: '😠',
};

const timeframeLabels = {
  immediate: 'Now',
  within_hour: '< 1 hour',
  today: 'Today',
  follow_up: 'Follow up',
};

const ownerLabels = {
  front_desk: 'Front Desk',
  housekeeping: 'Housekeeping',
  maintenance: 'Maintenance',
  management: 'Management',
  food_service: 'Food Service',
};

export function ComplaintAnalysisPanel({ description, category, onAnalysisComplete }: ComplaintAnalysisPanelProps) {
  const { analysis, isLoading, error, analyzeComplaint, clearAnalysis } = useComplaintAnalysis();

  const handleAnalyze = async () => {
    const result = await analyzeComplaint(description, category);
    if (result && onAnalysisComplete) {
      onAnalysisComplete(result);
    }
  };

  if (!analysis && !isLoading) {
    return (
      <Button onClick={handleAnalyze} variant="outline" className="w-full" disabled={!description.trim()}>
        <Sparkles className="mr-2 h-4 w-4" />
        Analyze with AI
      </Button>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-2">
        <CardContent className="flex items-center justify-center gap-3 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Analyzing complaint...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-2 border-destructive">
        <CardContent className="p-4 text-center">
          <p className="mb-2 text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={handleAnalyze}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  return (
    <Card className="border-2 border-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Analysis
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={clearAnalysis}>
            Clear
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Priority & Sentiment */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn('border-2', priorityColors[analysis.suggestedPriority])}>
            Suggested: {analysis.suggestedPriority.toUpperCase()}
          </Badge>
          <span className="text-lg">{sentimentIcons[analysis.analysis.sentiment]}</span>
          <span className="text-sm capitalize text-muted-foreground">
            {analysis.analysis.emotionalState}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">{analysis.priorityReason}</p>

        {/* Escalation Warning */}
        {analysis.escalationNeeded && (
          <div className="flex items-start gap-2 border-2 border-destructive bg-destructive/10 p-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-bold text-destructive">Escalation Recommended</p>
              <p className="text-sm text-destructive/80">{analysis.escalationReason}</p>
            </div>
          </div>
        )}

        {/* Resolution Steps */}
        <div>
          <h4 className="mb-2 text-sm font-bold">Suggested Actions</h4>
          <div className="space-y-2">
            {analysis.resolutionSuggestions.map((suggestion, idx) => (
              <div key={idx} className="flex items-start gap-3 border-2 p-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 text-sm">
                  <p>{suggestion.action}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeframeLabels[suggestion.timeframe]}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {ownerLabels[suggestion.owner]}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compensation */}
        {analysis.compensationSuggestion && (
          <div className="flex items-center gap-2 border-2 border-primary bg-primary/10 p-3">
            <Gift className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-primary">Suggested Compensation</p>
              <p className="text-sm text-primary/80">{analysis.compensationSuggestion}</p>
            </div>
          </div>
        )}

        {/* Apply Button */}
        <Button className="w-full" onClick={() => onAnalysisComplete?.(analysis)}>
          <ArrowUp className="mr-2 h-4 w-4" />
          Apply AI Suggestions
        </Button>
      </CardContent>
    </Card>
  );
}
