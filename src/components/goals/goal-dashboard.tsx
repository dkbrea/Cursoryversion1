"use client";

import type { FinancialGoal, FinancialGoalWithContribution, SinkingFund, SinkingFundWithProgress } from "@/types";
import { useState, useEffect, useMemo } from "react";
import { AddGoalDialog } from "./add-goal-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Bot, Download, Settings2, ArrowRight, TrendingUp, Activity, Lightbulb, Flag, Loader2, PiggyBank } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { differenceInCalendarMonths, isPast, startOfDay } from "date-fns";
import { GoalSummaryCards } from "./goal-summary-cards";
import { SavingsBreakdownCard } from "./savings-breakdown-card";
import { GoalPerformanceChartCard } from "./goal-performance-chart-card";
import { SavingsTransactionsCard } from "./savings-transactions-card";
import { GoalsOverviewListCard } from "./goals-overview-list-card";
import { useAuth } from "@/contexts/auth-context";
import { getFinancialGoals, createFinancialGoal, updateFinancialGoal, deleteFinancialGoal } from "@/lib/api/goals";

// Sinking Funds imports
import { AddSinkingFundDialog } from "@/components/sinking-funds/add-sinking-fund-dialog";
import { SinkingFundsOverviewCard } from "@/components/sinking-funds/sinking-funds-overview-card";
import { SinkingFundsSummaryCard } from "@/components/sinking-funds/sinking-funds-summary-card";
import { SinkingFundsEnvelopePage } from "@/components/sinking-funds/sinking-funds-envelope-page";
import { getSinkingFundsWithProgress, createSinkingFund, updateSinkingFund, deleteSinkingFund } from "@/lib/api/sinking-funds";
import { useIsMobile } from "@/hooks/use-mobile";

export function GoalDashboard() {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [sinkingFunds, setSinkingFunds] = useState<SinkingFundWithProgress[]>([]);
  const [isAddGoalDialogOpen, setIsAddGoalDialogOpen] = useState(false);
  const [isAddSinkingFundDialogOpen, setIsAddSinkingFundDialogOpen] = useState(false);
  const [isEditGoalDialogOpen, setIsEditGoalDialogOpen] = useState(false);
  const [isEditSinkingFundDialogOpen, setIsEditSinkingFundDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);
  const [selectedSinkingFund, setSelectedSinkingFund] = useState<SinkingFund | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("goals");
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();

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

  // Fetch goals and sinking funds from the database when the component mounts
  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        // Fetch goals
        const { goals: fetchedGoals, error: goalsError } = await getFinancialGoals(user.id);
        
        if (goalsError) {
          console.error("Error fetching goals:", goalsError);
          toast({
            title: "Error",
            description: "Failed to load your financial goals. Please try again.",
            variant: "destructive"
          });
        } else if (fetchedGoals) {
          setGoals(fetchedGoals);
        }

        // Fetch sinking funds
        const { sinkingFunds: fetchedSinkingFunds, error: sinkingFundsError } = await getSinkingFundsWithProgress(user.id);
        
        if (sinkingFundsError) {
          console.error("Error fetching sinking funds:", sinkingFundsError);
          toast({
            title: "Error", 
            description: "Failed to load your sinking funds. Please try again.",
            variant: "destructive"
          });
        } else if (fetchedSinkingFunds) {
          setSinkingFunds(fetchedSinkingFunds);
        }
        
      } catch (err) {
        console.error("Unexpected error fetching data:", err);
        toast({
          title: "Error",
          description: "An unexpected error occurred while loading your data.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
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

  const handleAddSinkingFund = async (newSinkingFundData: Omit<SinkingFund, "id" | "userId" | "createdAt" | "updatedAt">, keepOpen = false) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to add a sinking fund.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { sinkingFund: newSinkingFund, error } = await createSinkingFund({
        ...newSinkingFundData,
        userId: user.id
      });
      
      if (error || !newSinkingFund) {
        throw new Error(error || "Failed to create sinking fund");
      }
      
      // Calculate progress for the new fund
      const progressPercentage = newSinkingFund.targetAmount > 0 
        ? (newSinkingFund.currentAmount / newSinkingFund.targetAmount) * 100 
        : 0;
      
      const newSinkingFundWithProgress: SinkingFundWithProgress = {
        ...newSinkingFund,
        progressPercentage: Math.round(progressPercentage * 100) / 100,
        isFullyFunded: newSinkingFund.currentAmount >= newSinkingFund.targetAmount,
        monthsToTarget: newSinkingFund.monthlyContribution > 0 && newSinkingFund.currentAmount < newSinkingFund.targetAmount
          ? Math.ceil((newSinkingFund.targetAmount - newSinkingFund.currentAmount) / newSinkingFund.monthlyContribution)
          : undefined
      };
      
      setSinkingFunds((prevFunds) => [...prevFunds, newSinkingFundWithProgress]);
      
      toast({
        title: "Sinking Fund Added!",
        description: `"${newSinkingFundData.name}" has been successfully added to your sinking funds.`,
      });
      
      if (!keepOpen) {
        setIsAddSinkingFundDialogOpen(false);
      }
    } catch (err: any) {
      console.error("Error adding sinking fund:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to add your sinking fund. Please try again.",
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

  const handleDeleteSinkingFund = async (sinkingFundId: string) => {
    if (!user?.id) return;
    
    const fundToDelete = sinkingFunds.find(f => f.id === sinkingFundId);
    if (!fundToDelete) return;
    
    setIsDeleting(true);
    try {
      const { success, error } = await deleteSinkingFund(sinkingFundId);
      
      if (error || !success) {
        throw new Error(error || "Failed to delete sinking fund");
      }
      
      setSinkingFunds((prevFunds) => prevFunds.filter(f => f.id !== sinkingFundId));
      
      toast({
        title: "Sinking Fund Deleted",
        description: `Fund "${fundToDelete.name}" has been removed.`,
        variant: "destructive",
      });
    } catch (err: any) {
      console.error("Error deleting sinking fund:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete your sinking fund. Please try again.",
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

  const handleEditSinkingFund = (sinkingFundId: string) => {
    const sinkingFund = sinkingFunds.find(sf => sf.id === sinkingFundId);
    if (sinkingFund) {
      setSelectedSinkingFund(sinkingFund);
      setIsEditSinkingFundDialogOpen(true);
    }
  };

  const handleSinkingFundEdited = async (sinkingFundId: string, updatedData: Partial<Omit<SinkingFund, "id" | "userId" | "createdAt" | "updatedAt">>) => {
    if (!user?.id) return;
    
    try {
      const { sinkingFund: updatedSinkingFund, error } = await updateSinkingFund(sinkingFundId, updatedData);
      
      if (error || !updatedSinkingFund) {
        throw new Error(error || "Failed to update sinking fund");
      }
      
      // Preserve progress calculation for the updated fund
      setSinkingFunds(prevSinkingFunds => prevSinkingFunds.map(sf => {
        if (sf.id === sinkingFundId) {
          const progressPercentage = updatedSinkingFund.targetAmount > 0 
            ? (updatedSinkingFund.currentAmount / updatedSinkingFund.targetAmount) * 100 
            : 0;
          
          return {
            ...updatedSinkingFund,
            progressPercentage: Math.round(progressPercentage * 100) / 100,
            isFullyFunded: updatedSinkingFund.currentAmount >= updatedSinkingFund.targetAmount,
            monthsToTarget: updatedSinkingFund.monthlyContribution > 0 && updatedSinkingFund.currentAmount < updatedSinkingFund.targetAmount
              ? Math.ceil((updatedSinkingFund.targetAmount - updatedSinkingFund.currentAmount) / updatedSinkingFund.monthlyContribution)
              : undefined
          };
        }
        return sf;
      }));
      
      toast({
        title: "Sinking Fund Updated",
        description: `"${updatedSinkingFund.name}" has been successfully updated.`,
      });
      
      setIsEditSinkingFundDialogOpen(false);
      setSelectedSinkingFund(null);
    } catch (err: any) {
      console.error("Error updating sinking fund:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to update your sinking fund. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAddContribution = (sinkingFundId: string) => {
    // TODO: Implement add contribution functionality
    toast({
      title: "Coming Soon", 
      description: "Add contribution functionality will be available soon.",
    });
  };
  
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

  const hasAnyGoals = goals.length > 0;
  const hasAnySinkingFunds = sinkingFunds.length > 0;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className={`flex ${isMobile ? 'flex-col gap-4' : 'flex-col sm:flex-row justify-between items-start sm:items-center gap-4'} mb-6`}>
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'max-w-md grid-cols-2'}`}>
            <TabsTrigger value="goals" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Goals
            </TabsTrigger>
            <TabsTrigger value="sinking-funds" className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4" />
              {isMobile ? 'Funds' : 'Sinking Funds'}
            </TabsTrigger>
          </TabsList>
          
          <div className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-col sm:flex-row gap-2'}`}>
            <Button variant="outline" size={isMobile ? "default" : "sm"} disabled className={isMobile ? "w-full" : ""}>
              <Download className="mr-2 h-4 w-4" /> Export Report
            </Button>
            
            {activeTab === "goals" && (
              <>
                <AddGoalDialog
                  isOpen={isAddGoalDialogOpen}
                  onOpenChange={setIsAddGoalDialogOpen}
                  onGoalAdded={handleAddGoal}
                >
                  <Button onClick={() => setIsAddGoalDialogOpen(true)} size={isMobile ? "default" : "sm"} variant="outline" className={isMobile ? "w-full" : ""}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Goal
                  </Button>
                </AddGoalDialog>
                <Button variant="outline" size={isMobile ? "default" : "sm"} className={`text-primary border-primary hover:bg-primary/10 hover:text-primary ${isMobile ? "w-full" : ""}`} disabled>
                  <Settings2 className="mr-2 h-4 w-4" /> {isMobile ? 'Optimize' : 'Optimize Savings Plan'}
                </Button>
              </>
            )}
            
            {activeTab === "sinking-funds" && (
              <AddSinkingFundDialog
                isOpen={isAddSinkingFundDialogOpen}
                onOpenChange={setIsAddSinkingFundDialogOpen}
                onSinkingFundAdded={handleAddSinkingFund}
              >
                <Button onClick={() => setIsAddSinkingFundDialogOpen(true)} size={isMobile ? "default" : "sm"} className={isMobile ? "w-full" : ""}>
                  <PiggyBank className="mr-2 h-4 w-4" /> Add Sinking Fund
                </Button>
              </AddSinkingFundDialog>
            )}
          </div>
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

        {/* Edit Sinking Fund Dialog */}
        {selectedSinkingFund && (
          <AddSinkingFundDialog
            isOpen={isEditSinkingFundDialogOpen}
            onOpenChange={setIsEditSinkingFundDialogOpen}
            onSinkingFundAdded={() => {}}
            initialValues={selectedSinkingFund}
            isEditing={true}
            onSinkingFundEdited={handleSinkingFundEdited}
          >
            <Button className="hidden">Edit Sinking Fund</Button>
          </AddSinkingFundDialog>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading your savings data...</p>
          </div>
        ) : (
          <>
            <TabsContent value="goals" className="mt-0">
              {!hasAnyGoals ? (
                <div className="text-center py-12 border-2 border-dashed border-muted-foreground/30 rounded-lg">
                  <Flag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-foreground mb-2`}>Start Your Financial Goals!</h2>
                  <p className="text-muted-foreground mb-6">Create financial goals for your long-term dreams and aspirations.</p>
                  <AddGoalDialog
                    isOpen={isAddGoalDialogOpen}
                    onOpenChange={setIsAddGoalDialogOpen}
                    onGoalAdded={handleAddGoal}
                  >
                    <Button onClick={() => setIsAddGoalDialogOpen(true)} variant="outline" size={isMobile ? "default" : "sm"}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Goal
                    </Button>
                  </AddGoalDialog>
                </div>
              ) : (
                <>
                  <GoalSummaryCards goals={goalsWithContributions} isMobile={isMobile} />

                  <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 lg:grid-cols-3 gap-6'} mt-6`}>
                    <SavingsBreakdownCard goals={goalsWithContributions} isMobile={isMobile} />
                    <SinkingFundsSummaryCard sinkingFunds={sinkingFunds} isMobile={isMobile} />
                    <GoalPerformanceChartCard isMobile={isMobile} />
                  </div>

                  <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 lg:grid-cols-2 gap-6'} mt-6`}>
                    <SavingsTransactionsCard isMobile={isMobile} />
                    <div></div>
                  </div>

                  <GoalsOverviewListCard 
                    goals={goalsWithContributions} 
                    onDeleteGoal={handleDeleteGoal} 
                    onEditGoal={handleEditGoal} 
                    isDeleting={isDeleting}
                    isMobile={isMobile}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="sinking-funds" className="mt-0">
              <SinkingFundsEnvelopePage 
                sinkingFunds={sinkingFunds}
                onEditSinkingFund={handleEditSinkingFund}
                onDeleteSinkingFund={handleDeleteSinkingFund}
                onAddContribution={handleAddContribution}
                isDeleting={isDeleting}
                isAddDialogOpen={isAddSinkingFundDialogOpen}
                onAddDialogChange={setIsAddSinkingFundDialogOpen}
                onAddSinkingFund={handleAddSinkingFund}
                isMobile={isMobile}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
