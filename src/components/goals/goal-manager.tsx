
"use client";

// This component is no longer used and will be replaced by GoalDashboard.
// It can be safely deleted if GoalDashboard is fully implemented.

import type { FinancialGoal, FinancialGoalWithContribution, GoalIconKey } from "@/types";
import { useState, useEffect, useMemo } from "react";
import { AddGoalDialog } from "./add-goal-dialog";
// import { GoalList } from "./goal-list"; // No longer used
import { Button } from "@/components/ui/button";
import { PlusCircle, Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { differenceInCalendarMonths, isPast, startOfDay } from "date-fns";

const mockGoals: FinancialGoal[] = [
  { id: "goal1", name: "New Car Down Payment", targetAmount: 5000, currentAmount: 1200, targetDate: new Date(2025, 11, 31), icon: "car", userId: "1", createdAt: new Date() },
  { id: "goal2", name: "Vacation to Hawaii", targetAmount: 3000, currentAmount: 300, targetDate: new Date(2025, 11, 31), icon: "plane", userId: "1", createdAt: new Date() },
  { id: "goal3", name: "Emergency Fund Top-up", targetAmount: 10000, currentAmount: 8500, targetDate: new Date(2025, 11, 31), icon: "shield-check", userId: "1", createdAt: new Date() },
];

export function GoalManager() {
  const [goals, setGoals] = useState<FinancialGoal[]>(mockGoals);
  const [isAddGoalDialogOpen, setIsAddGoalDialogOpen] = useState(false);
  const { toast } = useToast();

  const goalsWithContributions = useMemo((): FinancialGoalWithContribution[] => {
    const today = startOfDay(new Date());
    return goals.map(goal => {
      const targetDate = startOfDay(new Date(goal.targetDate));
      let monthsRemaining = differenceInCalendarMonths(targetDate, today);
      let monthlyContribution = 0;
      const amountNeeded = goal.targetAmount - goal.currentAmount;

      if (amountNeeded <= 0) { // Goal already reached or exceeded
        monthsRemaining = 0;
        monthlyContribution = 0;
      } else if (isPast(targetDate) || monthsRemaining < 0) { // Target date is in the past
        monthsRemaining = 0; // Or -1 to indicate past due
        monthlyContribution = amountNeeded; // Entire remaining amount is "due"
      } else if (monthsRemaining === 0) { // Target date is current month
         monthsRemaining = 1; // Treat as 1 month to contribute
         monthlyContribution = amountNeeded;
      }
      else {
        monthlyContribution = amountNeeded / (monthsRemaining + 1); // +1 because diffInMonths is exclusive of start
      }
      
      return {
        ...goal,
        monthsRemaining: Math.max(0, monthsRemaining), // Ensure months remaining is not negative
        monthlyContribution: monthlyContribution > 0 ? parseFloat(monthlyContribution.toFixed(2)) : 0,
      };
    }).sort((a,b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  }, [goals]);

  const handleAddGoal = (newGoalData: Omit<FinancialGoal, "id" | "userId" | "createdAt">) => {
    const newGoal: FinancialGoal = {
      ...newGoalData,
      id: `goal-${Date.now()}`,
      userId: "1", // Mock user ID
      createdAt: new Date(),
    };
    setGoals((prevGoals) => [...prevGoals, newGoal]);
    toast({
      title: "Goal Added!",
      description: `"${newGoal.name}" has been successfully added to your goals.`,
    });
    setIsAddGoalDialogOpen(false);
  };

  const handleDeleteGoal = (goalId: string) => {
    const goalToDelete = goals.find(g => g.id === goalId);
    if (goalToDelete) {
      setGoals((prevGoals) => prevGoals.filter(g => g.id !== goalId));
      toast({
        title: "Goal Deleted",
        description: `Goal "${goalToDelete.name}" has been removed.`,
        variant: "destructive",
      });
    }
  };

  // Placeholder for editing a goal
  const handleEditGoal = (updatedGoal: FinancialGoal) => {
    setGoals(prevGoals => prevGoals.map(g => g.id === updatedGoal.id ? updatedGoal : g));
     toast({
      title: "Goal Updated (Placeholder)",
      description: `Goal "${updatedGoal.name}" would be updated here.`,
    });
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <AddGoalDialog
          isOpen={isAddGoalDialogOpen}
          onOpenChange={setIsAddGoalDialogOpen}
          onGoalAdded={handleAddGoal}
        >
          <Button onClick={() => setIsAddGoalDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Goal
          </Button>
        </AddGoalDialog>
      </div>

      {goalsWithContributions.length > 0 ? (
        // <GoalList 
        //     goals={goalsWithContributions} 
        //     onDeleteGoal={handleDeleteGoal}
        //     onEditGoal={() => { /* onEditGoal expects a goalId, or actual goal to edit */ }} 
        // />
        <p className="text-muted-foreground">Goal list would appear here (GoalList component removed/replaced).</p>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <Flag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Start Planning Your Future!</h2>
          <p className="text-muted-foreground mb-6">You haven't set any financial goals yet. <br/>What are you saving for?</p>
          <AddGoalDialog
            isOpen={isAddGoalDialogOpen}
            onOpenChange={setIsAddGoalDialogOpen}
            onGoalAdded={handleAddGoal}
          >
            <Button onClick={() => setIsAddGoalDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Goal
            </Button>
          </AddGoalDialog>
        </div>
      )}
    </div>
  );
}
