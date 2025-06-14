'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  RefreshCw,
  Gem,
  Target,
  DollarSign,
  BarChart3,
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

interface DashboardInsight {
  type: 'budget_health' | 'spending_trend' | 'goal_progress' | 'cash_flow' | 'debt_optimization' | 'seasonal_pattern';
  title: string;
  message: string;
  severity: 'positive' | 'neutral' | 'warning' | 'alert';
  priority: number;
  actionable: boolean;
  suggestions?: string[];
  data?: {
    percentage?: number;
    amount?: number;
    timeframe?: string;
    trend?: 'improving' | 'stable' | 'declining';
  };
}

interface InsightsSummary {
  overallHealth: 'excellent' | 'good' | 'fair' | 'needs_attention';
  keyMetrics: {
    monthlySpending: number;
    budgetUtilization: number;
    goalProgress: number;
    debtPaymentRatio?: number;
  };
  topPriority: string;
}

interface DashboardInsightsResponse {
  insights: DashboardInsight[];
  summary: InsightsSummary;
  generatedAt: string;
}

const typeIcons = {
  budget_health: BarChart3,
  spending_trend: TrendingUp,
  goal_progress: Target,
  cash_flow: DollarSign,
  debt_optimization: Zap,
  seasonal_pattern: Info,
};

const severityConfig = {
  positive: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    iconColor: 'text-green-600',
  },
  neutral: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-600',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-700',
    iconColor: 'text-yellow-600',
  },
  alert: {
    icon: AlertTriangle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    iconColor: 'text-red-600',
  },
};

const healthColors = {
  excellent: 'text-emerald-600',
  good: 'text-emerald-500',
  fair: 'text-yellow-600',
  needs_attention: 'text-red-600',
};

export function DashboardAIInsightsCard() {
  const [insights, setInsights] = useState<DashboardInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const fetchInsights = async () => {
    if (!user?.id) return;

    try {
      setError(null);
      const response = await fetch('/api/ai/dashboard-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch insights';
        try {
          // Try to read as JSON first
          const responseText = await response.text();
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.details || errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use the response text directly
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setInsights(data);
    } catch (err) {
      console.error('Error fetching dashboard insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to load AI insights');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [user?.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInsights();
  };

  if (loading) {
    return (
      <Card className="border-l-4 border-l-emerald-500">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Gem className="h-5 w-5 text-emerald-600" />
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !insights) {
    return (
      <Card className="border-l-4 border-l-emerald-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gem className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Jade-powered Insights</p>
                <p className="text-xs text-gray-500">Unable to load insights</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get only the top 1-2 highest priority insights for compact display
  const topInsights = insights.insights
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 2);
  
  if (topInsights.length === 0) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-emerald-500">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Gem className="h-3 w-3 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">Jade-powered Insights</span>
            <Badge 
              variant="outline" 
              className={cn("text-xs px-1 py-0", healthColors[insights.summary.overallHealth])}
            >
              {insights.summary.overallHealth.replace('_', ' ')}
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={cn("h-2 w-2", refreshing && "animate-spin")} />
          </Button>
        </div>

        <div className="space-y-2">
          {topInsights.map((insight, index) => {
            const TypeIcon = typeIcons[insight.type];
            const SeverityIcon = severityConfig[insight.severity].icon;
            const config = severityConfig[insight.severity];

            return (
              <div 
                key={index}
                className={cn(
                  "p-2 rounded border",
                  config.bgColor,
                  config.borderColor
                )}
              >
                <div className="flex items-start gap-2">
                  <TypeIcon className={cn("h-3 w-3 mt-0.5 flex-shrink-0", config.iconColor)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <h4 className={cn("font-medium text-xs", config.textColor)}>
                        {insight.title}
                      </h4>
                      {insight.data?.trend && (
                        <div className="flex items-center">
                          {insight.data.trend === 'improving' && <TrendingUp className="h-2 w-2 text-green-500" />}
                          {insight.data.trend === 'declining' && <TrendingDown className="h-2 w-2 text-red-500" />}
                        </div>
                      )}
                      <SeverityIcon className={cn("h-2 w-2", config.iconColor)} />
                    </div>
                    <p className="text-xs text-gray-600 leading-tight">
                      {insight.message.length > 120 ? `${insight.message.substring(0, 120)}...` : insight.message}
                    </p>
                    
                    {/* Show compact suggestion */}
                    {insight.suggestions && insight.suggestions.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        💎 {insight.suggestions[0].length > 80 ? `${insight.suggestions[0].substring(0, 80)}...` : insight.suggestions[0]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
} 