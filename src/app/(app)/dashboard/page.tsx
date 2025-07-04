import { ExpenseChart } from "@/components/dashboard/expense-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CreditCard, Users, TrendingUp } from "lucide-react";
import { RecurringList } from "@/components/recurring/recurring-list";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import type { UnifiedRecurringListItem, RecurringItem } from "@/types";
import { Suspense } from "react";
import { DashboardContent } from "./dashboard-content";

export default function DashboardPage() {
  return (
    <DashboardClient>
      <Suspense fallback={<div>Loading dashboard...</div>}>
        <DashboardContent />
      </Suspense>
    </DashboardClient>
  );
}
