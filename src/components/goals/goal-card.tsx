
"use client";

// This component is being replaced by the list items in GoalsOverviewListCard.
// It can be safely removed after confirming the new Goals Dashboard works.
// For now, keeping it to avoid breaking changes if other parts still reference it,
// but it's not used by the new GoalDashboard.

import type { FinancialGoalWithContribution, GoalIconKey } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Icons from "@/components/icons";
import { Trash2, Edit3, Target, Info } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils"; 

interface GoalCardProps {
  goal: FinancialGoalWithContribution;
  onDeleteGoal: (goalId: string) => void;
  onEditGoal: (goalId: string) => void;
}

const getGoalIcon = (iconKey: GoalIconKey) => {
    const iconMap: Record<GoalIconKey, React.ElementType> = {
        'default': Icons.GoalDefault,
        'home': Icons.Home,
        'car': Icons.Car,
        'plane': Icons.Plane,
        'briefcase': Icons.Briefcase,
        'graduation-cap': Icons.GraduationCap,
        'gift': Icons.Gift,
        'piggy-bank': Icons.PiggyBank,
        'trending-up': Icons.TrendingUp,
        'shield-check': Icons.ShieldCheck,
    };
    const IconComponent = iconMap[iconKey] || Icons.GoalDefault;
    return <IconComponent className="h-6 w-6 mr-2 text-primary" />;
};

export function GoalCard({ goal, onDeleteGoal, onEditGoal }: GoalCardProps) {
  const progressPercentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  const amountRemaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  let contributionText: string;
  let contributionColor: string = "text-foreground";

  if (amountRemaining <= 0) {
    contributionText = "Goal Achieved!";
    contributionColor = "text-green-600 font-semibold";
  } else if (goal.monthsRemaining <= 0) {
    contributionText = `Pay $${amountRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Now`;
    contributionColor = "text-red-600 font-semibold";
  } else {
    contributionText = `$${goal.monthlyContribution.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / month`;
  }

  return (
    <TooltipProvider>
      <Card className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-200 ease-in-out">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              {getGoalIcon(goal.icon)}
              <CardTitle className="text-xl">{goal.name}</CardTitle>
            </div>
            {amountRemaining <= 0 && <Badge variant="default" className="ml-2 bg-green-500 text-white">Achieved</Badge>}
          </div>
          <CardDescription className="pt-1">
            Target: ${goal.targetAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} by {format(new Date(goal.targetDate), "MMM dd, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">
                ${goal.currentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${goal.targetAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <Progress value={progressPercentage} className={cn("h-3", progressPercentage >= 100 && "[&>div]:bg-green-500")} />
            <p className="text-xs text-muted-foreground mt-1 text-right">{progressPercentage.toFixed(1)}% Complete</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground flex items-center"><Target className="h-4 w-4 mr-1.5"/>Projected Contribution</span>
                <span className={`font-semibold ${contributionColor}`}>{contributionText}</span>
            </div>
            {amountRemaining > 0 && goal.monthsRemaining > 0 && (
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center"><Info className="h-4 w-4 mr-1.5"/>Months Remaining</span>
                    <span className="font-medium text-foreground">{goal.monthsRemaining}</span>
                </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end items-center gap-2 pt-4 border-t">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onEditGoal(goal.id)} className="text-muted-foreground hover:text-primary h-8 w-8">
                <Edit3 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Edit Goal (Coming Soon)</p></TooltipContent>
          </Tooltip>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Goal "{goal.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this financial goal and its progress.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDeleteGoal(goal.id)}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Delete Goal
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
