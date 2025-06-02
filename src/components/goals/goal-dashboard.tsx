"use client";

import type { FinancialGoal, FinancialGoalWithContribution } from "@/types";
import { useState, useEffect, useMemo } from "react";
import { AddGoalDialog } from "./add-goal-dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle, Bot, Download, Settings2, ArrowRight, TrendingUp, Activity, Lightbulb, Flag, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { differenceInCalendarMonths, isPast, startOfDay } from "date-fns";
import { GoalSummaryCards } from "./goal-summary-cards";
import { SavingsBreakdownCard } from "./savings-breakdown-card";
import { GoalPerformanceChartCard } from "./goal-performance-chart-card";
import { SavingsTransactionsCard } from "./savings-transactions-card";
import { GoalsOverviewListCard } from "./goals-overview-list-card";
import { useAuth } from "@/contexts/auth-context";
import { getFinancialGoals, createFinancialGoal, updateFinancialGoal, deleteFinancialGoal } from "@/lib/api/goals";



export function GoalDashboard() {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [isAddGoalDialogOpen, setIsAddGoalDialogOpen] = useState(false);
  const [isEditGoalDialogOpen, setIsEditGoalDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const goalsWithContributions = useMemo((): FinancialGoalWithContribution[] => {
    const today = startOfDay(new Date());
    return goals.map(goal => {
      const targetDate = startOfDay(new Date(goal.targetDate));
      let monthsRemaining = differenceInCalendarMonths(targetDate, today);
      let monthlyContribution = 0;
      const amountNeeded = goal.targetAmount - goal.currentAmount;

      if (amountNeeded <= 0) {
        monthsRemaining = 0;
        monthlyContribution = 0;
      } else if (isPast(targetDate) || monthsRemaining < 0) {
        monthsRemaining = 0;
        monthlyContribution = amountNeeded;
      } else if (monthsRemaining === 0) {
         monthsRemaining = 1;
         monthlyContribution = amountNeeded;
      }
      else {
        monthlyContribution = amountNeeded / (monthsRemaining + 1); // +1 for current month too
      }
      
      return {
        ...goal,
        monthsRemaining: Math.max(0, monthsRemaining),
        monthlyContribution: monthlyContribution > 0 ? parseFloat(monthlyContribution.toFixed(2)) : 0,
      };
    }).sort((a,b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  }, [goals]);

  // Fetch goals from the database when the component mounts
  useEffect(() => {
    async function fetchGoals() {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        const { goals: fetchedGoals, error } = await getFinancialGoals(user.id);
        
        if (error) {
          console.error("Error fetching goals:", error);
          toast({
            title: "Error",
            description: "Failed to load your financial goals. Please try again.",
            variant: "destructive"
          });
          return;
        }
        
        if (fetchedGoals) {
          setGoals(fetchedGoals);
        }
      } catch (err) {
        console.error("Unexpected error fetching goals:", err);
        toast({
          title: "Error",
          description: "An unexpected error occurred while loading your goals.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchGoals();
  }, [user?.id, toast]);

  const handleAddGoal = async (newGoalData: Omit<FinancialGoal, "id" | "userId" | "createdAt">, keepOpen = false) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to add a goal.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { goal: newGoal, error } = await createFinancialGoal({
        ...newGoalData,
        userId: user.id
      });
      
      if (error || !newGoal) {
        throw new Error(error || "Failed to create goal");
      }
      
      setGoals((prevGoals) => [...prevGoals, newGoal]);
      
      toast({
        title: "Goal Added!",
        description: `"${newGoal.name}" has been successfully added to your goals.`,
      });
      
      if (!keepOpen) {
        setIsAddGoalDialogOpen(false);
      }
    } catch (err: any) {
      console.error("Error adding goal:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to add your goal. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user?.id) return;
    
    const goalToDelete = goals.find(g => g.id === goalId);
    if (!goalToDelete) return;
    
    setIsDeleting(true);
    try {
      const { success, error } = await deleteFinancialGoal(goalId);
      
      if (error || !success) {
        throw new Error(error || "Failed to delete goal");
      }
      
      setGoals((prevGoals) => prevGoals.filter(g => g.id !== goalId));
      
      toast({
        title: "Goal Deleted",
        description: `Goal "${goalToDelete.name}" has been removed.`,
        variant: "destructive",
      });
    } catch (err: any) {
      console.error("Error deleting goal:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete your goal. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditGoal = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      setSelectedGoal(goal);
      setIsEditGoalDialogOpen(true);
    }
  }
  
  const handleGoalEdited = async (goalId: string, updatedData: Omit<FinancialGoal, "id" | "userId" | "createdAt">) => {
    if (!user?.id) return;
    
    try {
      const { goal: updatedGoal, error } = await updateFinancialGoal(goalId, updatedData);
      
      if (error || !updatedGoal) {
        throw new Error(error || "Failed to update goal");
      }
      
      setGoals(prevGoals => prevGoals.map(g => g.id === goalId ? updatedGoal : g));
      
      toast({
        title: "Goal Updated",
        description: `"${updatedGoal.name}" has been successfully updated.`,
      });
      
      setIsEditGoalDialogOpen(false);
      setSelectedGoal(null);
    } catch (err: any) {
      console.error("Error updating goal:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to update your goal. Please try again.",
        variant: "destructive"
      });
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-end items-center gap-2 mb-2">
        <Button variant="outline" size="sm" disabled>
          <Download className="mr-2 h-4 w-4" /> Export Report
        </Button>
        <AddGoalDialog
          isOpen={isAddGoalDialogOpen}
          onOpenChange={setIsAddGoalDialogOpen}
          onGoalAdded={handleAddGoal}
        >
          <Button onClick={() => setIsAddGoalDialogOpen(true)} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Goal
          </Button>
        </AddGoalDialog>
        <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10 hover:text-primary" disabled>
          <Settings2 className="mr-2 h-4 w-4" /> Optimize Savings Plan
        </Button>
      </div>
      
      {/* Edit Goal Dialog */}
      {selectedGoal && (
        <AddGoalDialog
          isOpen={isEditGoalDialogOpen}
          onOpenChange={setIsEditGoalDialogOpen}
          onGoalAdded={() => {}}
          initialValues={selectedGoal}
          isEditing={true}
          onGoalEdited={handleGoalEdited}
        >
          <Button className="hidden">Edit Goal</Button>
        </AddGoalDialog>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading your financial goals...</p>
        </div>
      ) : goals.length === 0 ? (
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
      ) : (
        <>
          <GoalSummaryCards goals={goalsWithContributions} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SavingsBreakdownCard goals={goalsWithContributions} />
            <GoalPerformanceChartCard />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SavingsTransactionsCard />
            <GoalsOverviewListCard 
              goals={goalsWithContributions} 
              onDeleteGoal={handleDeleteGoal} 
              onEditGoal={handleEditGoal} 
              isDeleting={isDeleting}
            />
          </div>
        </>
      )}
    </div>
  );
}
