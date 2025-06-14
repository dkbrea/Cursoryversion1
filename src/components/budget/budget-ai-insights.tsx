'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, AlertTriangle, Target, Gem, RefreshCw } from 'lucide-react';

interface BudgetInsight {
  type: 'budget_balance' | 'category_optimization' | 'spending_pattern' | 'zero_based_achievement' | 'reallocation_opportunity';
  title: string;
  message: string;
  severity: 'positive' | 'neutral' | 'warning' | 'alert';
  priority: number;
  actionable: boolean;
  suggestions?: string[];
  data?: {
    amount?: number;
    percentage?: number;
    categoryName?: string;
    targetAmount?: number;
    savings?: number;
  };
}

interface BudgetInsightsSummary {
  budgetHealth: 'excellent' | 'good' | 'needs_attention' | 'critical';
  keyRecommendation: string;
  potentialSavings?: number;
}

interface BudgetInsightsResponse {
  insights: BudgetInsight[];
  summary: BudgetInsightsSummary;
}

interface BudgetAIInsightsProps {
  userId: string;
  year: number;
  month: number;
  className?: string;
  refreshTrigger?: number;
}

export function BudgetAIInsights({ userId, year, month, className, refreshTrigger }: BudgetAIInsightsProps) {
  const [insights, setInsights] = useState<BudgetInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/budget-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          year,
          month,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch insights: ${response.status}`);
      }

      const data = await response.json();
      setInsights(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [userId, year, month, refreshTrigger]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'positive':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'alert':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'positive':
        return <Target className="h-3 w-3" />;
      case 'warning':
        return <TrendingUp className="h-3 w-3" />;
      case 'alert':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <Sparkles className="h-3 w-3" />;
    }
  };

  const getHealthBadgeColor = (health: string) => {
    switch (health) {
      case 'excellent':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'good':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'needs_attention':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <Card className={`border-emerald-200 ${className}`}>
        <CardContent className="p-3">
          <div className="flex items-center space-x-2">
            <Gem className="h-4 w-4 text-emerald-600 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !insights) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">Unable to load budget insights</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchInsights}
              className="h-6 px-2 text-red-600 hover:text-red-700"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights || insights.insights.length === 0) {
    return null;
  }

  return (
    <Card className={`border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-50/50 ${className}`}>
      <CardContent className="p-3">
        {/* Header with Health Badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Gem className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-emerald-900 text-sm">Jade Budget Insights</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge 
              variant="outline" 
              className={`text-xs h-5 px-2 ${getHealthBadgeColor(insights.summary.budgetHealth)}`}
            >
              {insights.summary.budgetHealth.replace('_', ' ')}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchInsights}
              disabled={loading}
              className="h-6 px-2 text-emerald-600 hover:text-emerald-700"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Insights Cards */}
        <div className="space-y-2">
          {insights.insights.slice(0, 2).map((insight, index) => (
            <div
              key={index}
              className={`rounded-lg border p-2 ${getSeverityColor(insight.severity)}`}
            >
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 mt-0.5">
                  {getSeverityIcon(insight.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-xs truncate">{insight.title}</h4>
                    {insight.data?.amount && (
                      <span className="text-xs font-mono ml-2">
                        ${Math.abs(insight.data.amount).toFixed(0)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-1 leading-relaxed">{insight.message}</p>
                  
                  {/* Suggestions for actionable insights */}
                  {insight.actionable && insight.suggestions && insight.suggestions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                      <div className="flex flex-wrap gap-1">
                        {insight.suggestions.slice(0, 2).map((suggestion, suggestionIndex) => (
                          <Badge 
                            key={suggestionIndex}
                            variant="secondary"
                            className="text-xs h-5 px-2 opacity-90"
                          >
                            {suggestion}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Section */}
        {insights.summary.potentialSavings !== undefined && 
         insights.summary.potentialSavings !== null && 
         insights.summary.potentialSavings > 0 && (
          <div className="mt-3 pt-2 border-t border-emerald-200">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-700">Potential optimization:</span>
              <span className="font-mono font-medium text-emerald-800">
                ${insights.summary.potentialSavings.toFixed(0)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 