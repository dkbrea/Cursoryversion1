import { InvestmentManager } from "@/components/investments/investment-manager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investments Dashboard - Unbroken Pockets",
  description: "Track your investment portfolio, market performance, and top holdings.",
};

export default function InvestmentsPage() {
  return (
    <div className="space-y-6">
      <InvestmentManager />
    </div>
  );
}
