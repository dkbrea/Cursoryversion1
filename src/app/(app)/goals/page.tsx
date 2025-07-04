import { GoalDashboard } from "@/components/goals/goal-dashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Goal & Savings - Unbroken Pockets",
  description: "Track, manage, and achieve your financial goals and savings.",
};

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Goal & Savings</h1>
        {/* Action buttons will be part of GoalDashboard now */}
      </div>
      <GoalDashboard />
    </div>
  );
}
