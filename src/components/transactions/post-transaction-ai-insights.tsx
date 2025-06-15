"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, AlertTriangle, Info, Gem, HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Transaction, Account, Category } from '@/types';

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

interface PostTransactionJadeInsightsProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
}

export function PostTransactionJadeInsights({
  transaction,
  isOpen,
  onClose,
  accounts,
  categories
}: PostTransactionJadeInsightsProps) {
  const [insights, setInsights] = useState<FinancialInsight[]>([]);
  const [anomalies, setAnomalies] = useState<PatternAnomaly[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasAnalyzedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!transaction) return;
    
    const transactionKey = `${transaction.id}-${transaction.date}-${transaction.amount}`;
    
    // If we've already analyzed this transaction, don't do it again
    if (hasAnalyzedRef.current === transactionKey) {
      return;
    }
    
    hasAnalyzedRef.current = transactionKey;

    // Add a delay to prevent simultaneous AI API calls
    const timer = setTimeout(() => {
      const analyzeTransaction = async () => {
      if (!transaction) return;
      
      setIsLoading(true);
      setError(null);

      try {
        const transactionData = {
          amount: Math.abs(transaction.amount),
          description: transaction.description || "",
          detailedType: transaction.detailedType || "variable-expense",
          categoryId: transaction.categoryId || undefined,
          date: new Date(transaction.date),
        };

        // Debug logging to see what data we're sending
        console.log('PostTransactionJadeInsights - Raw transaction:', transaction);
        console.log('PostTransactionJadeInsights - Processed data:', transactionData);

        // Validate that we have the minimum required data
        if (!transactionData.amount || transactionData.amount <= 0) {
          console.log('Invalid amount:', transactionData.amount);
          setTimeout(() => onClose(), 1000);
          return;
        }

        if (!transactionData.description || transactionData.description.trim() === '') {
          console.log('Missing description');
          setTimeout(() => onClose(), 1000);
          return;
        }

        if (!transactionData.date || isNaN(transactionData.date.getTime())) {
          console.log('Invalid date:', transactionData.date);
          setTimeout(() => onClose(), 1000);
          return;
        }

        // Call the AI API endpoints for analysis
        const [insightsResponse, patternsResponse] = await Promise.all([
          fetch('/api/ai/financial-insights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transaction: transactionData,
              userId: 'jade',
            }),
          }),
          fetch('/api/ai/pattern-recognition', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transaction: transactionData,
              userId: 'jade',
            }),
          }),
        ]);

        let hasInsights = false;

        if (insightsResponse.ok) {
          const insightsData = await insightsResponse.json();
          setInsights(insightsData.insights || []);
          setSuggestions(insightsData.suggestions || []);
          hasInsights = hasInsights || (insightsData.insights?.length > 0) || (insightsData.suggestions?.length > 0);
        }

        if (patternsResponse.ok) {
          const patternsData = await patternsResponse.json();
          setAnomalies(patternsData.anomalies || []);
          hasInsights = hasInsights || (patternsData.anomalies?.length > 0);
        }

        // If no insights were generated, dismiss automatically
        if (!hasInsights) {
          setTimeout(() => onClose(), 1000);
        }

      } catch (err) {
        console.error('AI analysis error:', err);
        setError('Failed to analyze transaction');
        setTimeout(() => onClose(), 2000);
      } finally {
        setIsLoading(false);
      }
    };

      analyzeTransaction();
    }, 400); // 400ms delay for AI insights

    return () => clearTimeout(timer);
  }, [transaction]);

  if (!transaction) return null;

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

  const totalInsights = (insights?.length || 0) + (anomalies?.length || 0) + (suggestions?.length || 0);

  if (isLoading) {
    return null; // Don't show anything while loading
  }

  if (error || totalInsights === 0) {
    return null;
  }

  return (
    <Card className={cn("border-emerald-200 bg-emerald-50/50 shadow-sm", isOpen ? "" : "hidden")}>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Gem className="h-3 w-3 text-emerald-600" />
            Jade Insights
            <Badge variant="secondary" className="text-xs px-1 py-0">
              {totalInsights}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-5 w-5 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-2 pt-0">
        {/* Financial Insights */}
        {insights?.map((insight, index) => (
          <Alert key={`insight-${index}`} className={cn("py-2 px-3", getSeverityColor(insight.severity))}>
            <div className="flex items-start gap-2">
              {getSeverityIcon(insight.severity)}
              <div className="flex-1 min-w-0">
                <AlertDescription className="text-xs leading-relaxed">
                  {/* Truncate long messages */}
                  {insight.message.length > 100 ? `${insight.message.substring(0, 100)}...` : insight.message}
                  {insight.data?.amount && (
                    <span className="font-medium ml-1">
                      (${Math.abs(insight.data.amount).toFixed(0)})
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
          <Alert key={`anomaly-${index}`} className={cn("py-2 px-3", getSeverityColor(anomaly.severity))}>
            <div className="flex items-start gap-2">
              {getSeverityIcon(anomaly.severity)}
              <div className="flex-1 min-w-0">
                <AlertDescription className="text-xs leading-relaxed">
                  <div className="font-medium mb-1">
                    {anomaly.message.length > 80 ? `${anomaly.message.substring(0, 80)}...` : anomaly.message}
                  </div>
                  
                  {anomaly.suggestedAction && (
                    <div className="text-xs text-emerald-700 mt-1">
                      💎 {anomaly.suggestedAction.length > 60 ? `${anomaly.suggestedAction.substring(0, 60)}...` : anomaly.suggestedAction}
                    </div>
                  )}
                  
                  <div className="mt-1">
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      {(anomaly.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        ))}

        {/* General Suggestions */}
        {suggestions && suggestions.length > 0 && (
          <Alert className="border-green-200 bg-green-50 py-2 px-3">
            <TrendingUp className="h-3 w-3 text-green-600" />
            <AlertDescription className="text-xs leading-relaxed">
              <div className="font-medium mb-1 text-green-800">Tips:</div>
              <ul className="space-y-0">
                {suggestions.slice(0, 2).map((suggestion, index) => (
                  <li key={index} className="text-xs text-green-700 flex items-start gap-1">
                    <span className="text-green-600">•</span>
                    <span>{suggestion.length > 60 ? `${suggestion.substring(0, 60)}...` : suggestion}</span>
                  </li>
                ))}
                {suggestions.length > 2 && (
                  <li className="text-xs text-green-600 italic">+{suggestions.length - 2} more</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
} 