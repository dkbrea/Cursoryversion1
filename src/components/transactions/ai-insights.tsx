"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TrendingUp, AlertTriangle, Info, Gem, HelpCircle } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

interface FinancialInsight {
  type: 'spending_comparison' | 'budget_progress' | 'category_analysis' | 'frequency_analysis';
  message: string;
  severity: 'info' | 'warning' | 'alert';
  data?: {
    percentage?: number;
    amount?: number;
    timeframe?: string;
  };
}

interface PatternAnomaly {
  type: 'unusual_amount' | 'missing_recurring' | 'frequency_change' | 'new_merchant' | 'timing_irregular';
  message: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  suggestedAction?: string;
  questions?: string[];
}

interface JadeInsightsProps {
  insights?: FinancialInsight[];
  anomalies?: PatternAnomaly[];
  suggestions?: string[];
  isLoading?: boolean;
  className?: string;
}

export function JadeInsights({ insights, anomalies, suggestions, isLoading, className }: JadeInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading) {
    return (
      <Card className={cn("border-emerald-200 bg-emerald-50/50", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Gem className="h-4 w-4 text-emerald-600" />
            Jade-powered Insights
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Analyzing your spending patterns...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights?.length && !anomalies?.length && !suggestions?.length) {
    return null;
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'alert':
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-emerald-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'alert':
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'warning':
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-emerald-200 bg-emerald-50';
    }
  };

  return (
    <Card className={cn("border-emerald-200 bg-emerald-50/50", className)}>
      <CardHeader className="pb-3">
        <CardTitle 
          className="flex items-center gap-2 text-sm cursor-pointer hover:text-emerald-700"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Gem className="h-4 w-4 text-emerald-600" />
          Jade-powered Insights
          <Badge variant="secondary" className="text-xs">
            {(insights?.length || 0) + (anomalies?.length || 0)} insights
          </Badge>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-3">
          {/* Financial Insights */}
          {insights?.map((insight, index) => (
            <Alert key={`insight-${index}`} className={getSeverityColor(insight.severity)}>
              <div className="flex items-start gap-2">
                {getSeverityIcon(insight.severity)}
                <div className="flex-1">
                  <AlertDescription className="text-sm">
                    {insight.message}
                    {insight.data?.percentage && (
                      <span className="font-medium ml-1">
                        ({insight.data.percentage > 0 ? '+' : ''}{insight.data.percentage.toFixed(1)}%)
                      </span>
                    )}
                    {insight.data?.amount && (
                      <span className="font-medium ml-1">
                        (${formatNumber(Math.abs(insight.data.amount), 2)})
                      </span>
                    )}
                    {insight.data?.timeframe && (
                      <span className="text-xs text-muted-foreground ml-1">
                        • {insight.data.timeframe}
                      </span>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          ))}

          {/* Pattern Anomalies */}
          {anomalies?.map((anomaly, index) => (
            <Alert key={`anomaly-${index}`} className={getSeverityColor(anomaly.severity)}>
              <div className="flex items-start gap-2">
                {getSeverityIcon(anomaly.severity)}
                <div className="flex-1">
                  <AlertDescription className="text-sm">
                    <div className="font-medium mb-1">{anomaly.message}</div>
                    
                    {anomaly.questions && anomaly.questions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {anomaly.questions.map((question, qIndex) => (
                          <div key={qIndex} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <HelpCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>{question}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {anomaly.suggestedAction && (
                      <div className="mt-2 text-xs font-medium text-emerald-700">
                        💎 {anomaly.suggestedAction}
                      </div>
                    )}
                    
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {(anomaly.confidence * 100).toFixed(0)}% confidence
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {anomaly.type.replace('_', ' ')}
                      </span>
                    </div>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          ))}

          {/* General Suggestions */}
          {suggestions && suggestions.length > 0 && (
            <Alert className="border-green-200 bg-green-50">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm">
                <div className="font-medium mb-2 text-green-800">Suggestions:</div>
                <ul className="space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="text-xs text-green-700 flex items-start gap-1">
                      <span className="text-green-600 mt-0.5">💎</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      )}
    </Card>
  );
}

interface AIAnalysisHookResult {
  insights: FinancialInsight[] | undefined;
  anomalies: PatternAnomaly[] | undefined;
  suggestions: string[] | undefined;
  isLoading: boolean;
  error: string | null;
}

export function useAIAnalysis(
  transactionData: {
    amount: number;
    description: string;
    detailedType: string;
    categoryId?: string;
    date: Date;
  } | null,
  userId: string | null,
  enabled: boolean = true
): AIAnalysisHookResult {
  const [insights, setInsights] = useState<FinancialInsight[] | undefined>(undefined);
  const [anomalies, setAnomalies] = useState<PatternAnomaly[] | undefined>(undefined);
  const [suggestions, setSuggestions] = useState<string[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !transactionData || !userId || transactionData.amount <= 0) {
      setInsights(undefined);
      setAnomalies(undefined);
      setSuggestions(undefined);
      setError(null);
      return;
    }

    const analyzeTransaction = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Call the API endpoints for AI analysis
        const [insightsResponse, patternsResponse] = await Promise.all([
          fetch('/api/ai/financial-insights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transaction: transactionData,
              userId,
            }),
          }),
          fetch('/api/ai/pattern-recognition', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transaction: transactionData,
              userId,
            }),
          }),
        ]);

        if (insightsResponse.ok) {
          const insightsData = await insightsResponse.json();
          setInsights(insightsData.insights || []);
          setSuggestions(insightsData.suggestions || []);
        }

        if (patternsResponse.ok) {
          const patternsData = await patternsResponse.json();
          setAnomalies(patternsData.anomalies || []);
        }
      } catch (err) {
        console.error('AI analysis error:', err);
        setError('Failed to analyze transaction');
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the analysis to avoid too many API calls
    const timeoutId = setTimeout(analyzeTransaction, 1000);
    return () => clearTimeout(timeoutId);
  }, [transactionData, userId, enabled]);

  return { insights, anomalies, suggestions, isLoading, error };
} 