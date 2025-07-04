
"use client";

import type { FinancialGoalWithContribution } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, MoreHorizontal, Edit3, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface GoalsOverviewListCardProps {
  goals: FinancialGoalWithContribution[];
  onDeleteGoal: (goalId: string) => void;
  onEditGoal: (goalId: string) => void;
  isDeleting?: boolean;
}

export function GoalsOverviewListCard({ goals, onDeleteGoal, onEditGoal, isDeleting = false }: GoalsOverviewListCardProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Goals Overview</CardTitle>
        <Button variant="ghost" size="icon" disabled className="h-8 w-8 opacity-50">
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {goals.length > 0 ? (
          <div className="space-y-4">
            {goals.map((goal) => {
              const progressPercentage = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
              const isAchieved = goal.currentAmount >= goal.targetAmount;
              return (
                <div key={goal.id} className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-foreground">{goal.name}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                            ${goal.targetAmount.toLocaleString()} ({progressPercentage.toFixed(0)}%)
                        </span>
                        {!isAchieved && (
                             <AlertDialog>
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 data-[state=open]:bg-muted">
                                        <MoreHorizontal className="h-4 w-4 text-muted-foreground"/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onEditGoal(goal.id)}>
                                        <Edit3 className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Edit
                                    </DropdownMenuItem>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                </DropdownMenuContent>
                                </DropdownMenu>
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
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? "Deleting..." : "Delete Goal"}
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                  </div>
                  <Progress value={progressPercentage} className={cn("h-2", isAchieved && "[&>div]:bg-green-500")} />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-10">No goals set up yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
