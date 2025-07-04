
"use client";

// This component is being replaced by GoalsOverviewListCard for the new dashboard layout.
// It can be safely removed after confirming the new Goals Dashboard works.

import type { FinancialGoalWithContribution, FinancialGoal } from "@/types";
// import { GoalCard } from "./goal-card"; // GoalCard is also part of the old structure

interface GoalListProps {
  goals: FinancialGoalWithContribution[];
  onDeleteGoal: (goalId: string) => void;
  onEditGoal: (goal: FinancialGoal) => void; // For future editing
}

export function GoalList({ goals, onDeleteGoal, onEditGoal }: GoalListProps) {
  if (goals.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No financial goals set up yet.</p>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {/* {goals.map((goal) => (
        <GoalCard 
            key={goal.id} 
            goal={goal} 
            onDeleteGoal={onDeleteGoal}
            onEditGoal={() => onEditGoal(goal as FinancialGoal)} 
        />
      ))} */}
      <p>GoalCard rendering removed as this component is being phased out.</p>
    </div>
  );
}
