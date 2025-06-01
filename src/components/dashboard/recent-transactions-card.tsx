"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ArrowUpIcon, ArrowDownIcon, ArrowRightIcon, Plus } from "lucide-react";
import type { Transaction, Category, Account } from "@/types";

interface RecentTransactionsCardProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  limit?: number;
  onAddTransaction?: () => void;
}

export function RecentTransactionsCard({ 
  transactions, 
  categories, 
  accounts, 
  limit = 5, 
  onAddTransaction
}: RecentTransactionsCardProps) {
  // Sort transactions by date (most recent first) and limit the results
  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);

  const getCategoryName = (categoryId?: string | null) => {
    if (!categoryId) return 'Uncategorized';
    
    // Check if it's a UUID (category from database)
    const category = categories.find(cat => cat.id === categoryId);
    if (category) {
      return category.name;
    }
    
    // Fallback to predefined category mapping
    const categoryLabels: Record<string, string> = {
      'housing': 'Housing',
      'food': 'Food',
      'utilities': 'Utilities',
      'transportation': 'Transportation',
      'health': 'Health',
      'personal': 'Personal',
      'home-family': 'Home/Family',
      'media-productivity': 'Media/Productivity'
    };
    return categoryLabels[categoryId] || categoryId;
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account?.name || 'Unknown Account';
  };

  const getTransactionTypeColor = (type: string, detailedType?: string) => {
    if (type === 'income') return 'bg-green-100 text-green-800';
    if (type === 'transfer') return 'bg-blue-100 text-blue-800';
    if (detailedType === 'subscription') return 'bg-purple-100 text-purple-800';
    if (detailedType === 'debt-payment') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getTransactionIcon = (type: string, detailedType?: string) => {
    if (type === 'income') return <ArrowUpIcon className="h-3 w-3" />;
    if (type === 'transfer') return <ArrowRightIcon className="h-3 w-3" />;
    return <ArrowDownIcon className="h-3 w-3" />;
  };

  const getTransactionTypeLabel = (type: string, detailedType?: string) => {
    if (detailedType) {
      const labels: Record<string, string> = {
        'income': 'Income',
        'variable-expense': 'Variable',
        'fixed-expense': 'Fixed',
        'subscription': 'Subscription',
        'debt-payment': 'Debt Payment',
        'goal-contribution': 'Goal'
      };
      return labels[detailedType] || detailedType;
    }
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  if (recentTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest financial activity</CardDescription>
            </div>
            {onAddTransaction && (
              <Button onClick={onAddTransaction} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            No transactions found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest {limit} transactions</CardDescription>
          </div>
          {onAddTransaction && (
            <Button onClick={onAddTransaction} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-full ${getTransactionTypeColor(transaction.type, transaction.detailedType)}`}>
                  {getTransactionIcon(transaction.type, transaction.detailedType)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate">
                      {transaction.description}
                    </p>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getTransactionTypeColor(transaction.type, transaction.detailedType)}`}
                    >
                      {getTransactionTypeLabel(transaction.type, transaction.detailedType)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{getAccountName(transaction.accountId)}</span>
                    <span>•</span>
                    <span>{getCategoryName(transaction.categoryId)}</span>
                    <span>•</span>
                    <span>{formatDate(transaction.date)}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <p className={`font-semibold ${
                  transaction.type === 'income' 
                    ? 'text-green-600' 
                    : transaction.type === 'transfer'
                    ? 'text-blue-600'
                    : 'text-red-600'
                }`}>
                  {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
                  {formatCurrency(Math.abs(transaction.amount))}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {transactions.length > limit && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Showing {limit} of {transactions.length} transactions
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 