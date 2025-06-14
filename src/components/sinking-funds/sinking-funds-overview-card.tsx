"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  PiggyBank, 
  MoreHorizontal, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Edit,
  Trash2,
  Plus,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { format, isAfter, isBefore, startOfDay } from "date-fns";
import type { SinkingFundWithProgress } from "@/types";

interface SinkingFundsOverviewCardProps {
  sinkingFunds: SinkingFundWithProgress[];
  onEditSinkingFund: (id: string) => void;
  onDeleteSinkingFund: (id: string) => void;
  onAddContribution: (id: string) => void;
  isDeleting: boolean;
}

const categoryColors: Record<string, string> = {
  'maintenance': 'bg-orange-500',
  'insurance': 'bg-blue-500',
  'gifts': 'bg-pink-500',
  'taxes': 'bg-red-500',
  'healthcare': 'bg-green-500',
  'travel': 'bg-purple-500',
  'home-improvement': 'bg-yellow-500',
  'other': 'bg-gray-500'
};

const categoryDisplayNames: Record<string, string> = {
  'maintenance': 'Maintenance',
  'insurance': 'Insurance',
  'gifts': 'Gifts',
  'taxes': 'Taxes',
  'healthcare': 'Healthcare',
  'travel': 'Travel',
  'home-improvement': 'Home Improvement',
  'other': 'Other'
};

export function SinkingFundsOverviewCard({ 
  sinkingFunds, 
  onEditSinkingFund, 
  onDeleteSinkingFund, 
  onAddContribution,
  isDeleting 
}: SinkingFundsOverviewCardProps) {
  const [expandedFunds, setExpandedFunds] = useState<Set<string>>(new Set());

  const toggleExpanded = (fundId: string) => {
    setExpandedFunds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fundId)) {
        newSet.delete(fundId);
      } else {
        newSet.add(fundId);
      }
      return newSet;
    });
  };

  const getNextExpenseStatus = (nextExpenseDate?: Date) => {
    if (!nextExpenseDate) return null;
    
    const today = startOfDay(new Date());
    const expenseDate = startOfDay(nextExpenseDate);
    
    if (isBefore(expenseDate, today)) {
      return { status: 'overdue', color: 'text-red-600' };
    } else if (expenseDate.getTime() === today.getTime()) {
      return { status: 'today', color: 'text-orange-600' };
    } else {
      const daysUntil = Math.ceil((expenseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 30) {
        return { status: 'soon', color: 'text-yellow-600' };
      } else {
        return { status: 'future', color: 'text-green-600' };
      }
    }
  };

  if (sinkingFunds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            Sinking Funds Overview
          </CardTitle>
          <CardDescription>Track your progress towards specific upcoming expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <PiggyBank className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No sinking funds created yet</p>
            <p className="text-sm text-muted-foreground">Start saving for upcoming expenses like car maintenance, insurance, or gifts.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PiggyBank className="h-5 w-5" />
          Sinking Funds Overview
        </CardTitle>
        <CardDescription>
          {sinkingFunds.length} active fund{sinkingFunds.length !== 1 ? 's' : ''} • 
          ${sinkingFunds.reduce((sum, fund) => sum + fund.currentAmount, 0).toLocaleString()} total saved
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {sinkingFunds.map((fund, index) => {
            const isExpanded = expandedFunds.has(fund.id);
            const expenseStatus = getNextExpenseStatus(fund.nextExpenseDate);
            
            return (
              <div key={fund.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div 
                      className={`w-3 h-3 rounded-full ${categoryColors[fund.category] || categoryColors.other}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{fund.name}</h4>
                        {fund.isFullyFunded && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {categoryDisplayNames[fund.category]}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${fund.currentAmount.toLocaleString()} / ${fund.targetAmount.toLocaleString()}
                        </span>
                        
                        {fund.nextExpenseDate && expenseStatus && (
                          <span className={`flex items-center gap-1 ${expenseStatus.color}`}>
                            <Calendar className="h-3 w-3" />
                            {format(fund.nextExpenseDate, "MMM d, yyyy")}
                          </span>
                        )}
                        
                        {fund.monthsToTarget && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {fund.monthsToTarget} month{fund.monthsToTarget !== 1 ? 's' : ''} to target
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {Math.round(fund.progressPercentage)}%
                    </span>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onAddContribution(fund.id)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Contribution
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleExpanded(fund.id)}>
                          <span className="mr-2">👁️</span>
                          {isExpanded ? 'Hide Details' : 'View Details'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEditSinkingFund(fund.id)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Fund
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDeleteSinkingFund(fund.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Fund
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                <div className="mt-2">
                  <Progress value={fund.progressPercentage} className="h-2" />
                </div>
                
                {isExpanded && (
                  <div className="mt-3 p-3 bg-muted/30 rounded-lg space-y-2 text-sm">
                    {fund.description && (
                      <p className="text-muted-foreground">{fund.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium">Monthly Contribution:</span>
                        <p className="text-muted-foreground">
                          ${fund.monthlyContribution.toLocaleString()} ({fund.contributionFrequency})
                        </p>
                      </div>
                      
                      <div>
                        <span className="font-medium">Remaining:</span>
                        <p className="text-muted-foreground">
                          ${(fund.targetAmount - fund.currentAmount).toLocaleString()}
                        </p>
                      </div>
                      
                      {fund.isRecurring && (
                        <div>
                          <span className="font-medium">Type:</span>
                          <p className="text-muted-foreground">Recurring expense</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {index < sinkingFunds.length - 1 && <Separator className="mt-4" />}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
} 