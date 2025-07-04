"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Settings2 } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { Holding, InvestmentAccount } from "@/types";
import { useMemo } from "react";

// Asset categorization function based on symbol patterns
function categorizeAsset(symbol: string, name: string): string {
  const upperSymbol = symbol.toUpperCase();
  const upperName = name.toUpperCase();
  
  // Cryptocurrency patterns
  if (upperSymbol.includes('BTC') || upperSymbol.includes('ETH') || upperSymbol.includes('ADA') || 
      upperSymbol.includes('SOL') || upperSymbol.includes('DOT') || upperSymbol.includes('AVAX') ||
      upperName.includes('BITCOIN') || upperName.includes('ETHEREUM') || upperName.includes('CRYPTO')) {
    return 'Crypto';
  }
  
  // Bond ETFs and funds
  if (upperSymbol.includes('TLT') || upperSymbol.includes('BND') || upperSymbol.includes('AGG') || 
      upperSymbol.includes('BOND') || upperName.includes('BOND') || upperName.includes('TREASURY') ||
      upperName.includes('FIXED INCOME')) {
    return 'Bonds';
  }
  
  // International/Emerging market ETFs
  if (upperSymbol.includes('VEA') || upperSymbol.includes('VWO') || upperSymbol.includes('IEFA') ||
      upperSymbol.includes('EEM') || upperSymbol.includes('INTL') || upperName.includes('INTERNATIONAL') ||
      upperName.includes('EMERGING') || upperName.includes('EUROPE') || upperName.includes('PACIFIC') ||
      // European companies
      upperName.includes('ESSILORLUXOTTICA') || upperName.includes('LUXOTTICA') || upperName.includes('ESSILOR') ||
      upperName.includes('ASML') || upperName.includes('NESTLE') || upperName.includes('NOVARTIS') ||
      upperName.includes('AIRBUS') || upperName.includes('TOYOTA') || upperName.includes('SAMSUNG') ||
      upperName.includes('TSMC') || upperName.includes('ALIBABA') || upperName.includes('TENCENT') ||
      // Country/Region indicators
      upperName.includes('FRANCE') || upperName.includes('GERMANY') || upperName.includes('JAPAN') ||
      upperName.includes('CHINA') || upperName.includes('KOREA') || upperName.includes('NETHERLANDS') ||
      upperName.includes('SWITZERLAND') || upperName.includes('ITALY') || upperName.includes('SPAIN') ||
      // Exchange indicators (when people include exchange info)
      upperName.includes('PARIS') || upperName.includes('AMSTERDAM') || upperName.includes('FRANKFURT') ||
      upperName.includes('MILAN') || upperName.includes('TOKYO') || upperName.includes('HONG KONG')) {
    return 'International';
  }
  
  // REITs
  if (upperSymbol.includes('REIT') || upperSymbol.includes('VNQ') || upperName.includes('REAL ESTATE') ||
      upperName.includes('REIT')) {
    return 'REITs';
  }
  
  // Commodities and precious metals
  if (upperSymbol.includes('GLD') || upperSymbol.includes('SLV') || upperSymbol.includes('GOLD') ||
      upperName.includes('GOLD') || upperName.includes('SILVER') || upperName.includes('COMMODITY')) {
    return 'Commodities';
  }
  
  // Cash equivalents and money market
  if (upperName.includes('CASH') || upperName.includes('MONEY MARKET') || upperName.includes('SAVINGS')) {
    return 'Cash';
  }
  
  // Default to US Stocks for everything else
  return 'US Stocks';
}

const assetColors = {
  'US Stocks': "hsl(var(--chart-1))",
  'International': "hsl(var(--chart-2))",
  'Bonds': "hsl(var(--chart-3))",
  'Crypto': "hsl(var(--chart-4))",
  'REITs': "hsl(var(--chart-5))",
  'Commodities': "hsl(142, 76%, 36%)", // Green
  'Cash': "hsl(220, 14%, 50%)", // Gray
  'Retirement Accounts': "hsl(270, 80%, 50%)", // Purple
};

// Function to categorize investment accounts
function categorizeInvestmentAccount(accountType: string, accountName: string): string {
  const upperType = accountType.toUpperCase();
  const upperName = accountName.toUpperCase();
  
  if (upperType === '401K' || upperType === 'IRA' || upperName.includes('401K') || upperName.includes('IRA') || upperName.includes('RETIREMENT')) {
    return 'Retirement Accounts';
  }
  
  if (upperType === 'CRYPTO' || upperName.includes('CRYPTO') || upperName.includes('COINBASE') || upperName.includes('BINANCE')) {
    return 'Crypto';
  }
  
  // Default to US Stocks for brokerage accounts
  return 'US Stocks';
}

interface PortfolioSummaryCardProps {
  totalPortfolioValue: number;
  holdings: Holding[];
  investmentAccounts: InvestmentAccount[];
}

export function PortfolioSummaryCard({ totalPortfolioValue, holdings, investmentAccounts }: PortfolioSummaryCardProps) {
  // Placeholder performance data
  const dailyPerformance = { change: "+$250.75", percent: "+0.45%", positive: true };
  const yearlyPerformance = { change: "+$5,120.30", percent: "+10.8%", positive: true };

  // Calculate real asset allocation from holdings and accounts
  const assetAllocationData = useMemo(() => {
    if ((holdings.length === 0 && investmentAccounts.length === 0) || totalPortfolioValue === 0) {
      return [{ name: "No Holdings", value: 100, fill: "hsl(var(--muted))" }];
    }

    // Group holdings by asset category
    const assetGroups: Record<string, number> = {};
    
    // Add individual holdings (detailed breakdown)
    holdings.forEach(holding => {
      const category = categorizeAsset(holding.symbol, holding.name);
      assetGroups[category] = (assetGroups[category] || 0) + holding.value;
    });

    // Calculate value from holdings to know what's left unaccounted for in investment accounts
    const totalHoldingsValue = holdings.reduce((sum, holding) => sum + holding.value, 0);
    
    // Add investment account values that don't have associated holdings
    investmentAccounts.forEach(account => {
      // Find holdings associated with this account
      const accountHoldings = holdings.filter(h => h.accountId === account.id);
      const accountHoldingsValue = accountHoldings.reduce((sum, h) => sum + h.value, 0);
      
      // If the account value is greater than its holdings value, add the difference
      const unaccountedValue = account.currentValue - accountHoldingsValue;
      if (unaccountedValue > 0) {
        const category = categorizeInvestmentAccount(account.type, account.name);
        assetGroups[category] = (assetGroups[category] || 0) + unaccountedValue;
      }
    });

    // Convert to chart format with percentages
    return Object.entries(assetGroups)
      .map(([name, value]) => ({
        name,
        value: Math.round((value / totalPortfolioValue) * 100 * 100) / 100, // Round to 2 decimal places
        fill: assetColors[name as keyof typeof assetColors] || "hsl(var(--chart-1))",
      }))
      .filter(item => item.value > 0) // Remove zero values
      .sort((a, b) => b.value - a.value); // Sort by value descending
  }, [holdings, investmentAccounts, totalPortfolioValue]);

  const chartConfig = {
    value: {
      label: "Percentage",
    },
    ...assetAllocationData.reduce((acc, item) => {
      acc[item.name] = { label: item.name, color: item.fill };
      return acc;
    }, {} as any),
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-xl">Portfolio Summary</CardTitle>
          <CardDescription>Your total investment performance.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" disabled className="opacity-50 cursor-not-allowed">
            <Settings2 className="h-5 w-5"/>
            <span className="sr-only">Configure Summary</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-xs text-muted-foreground">Total Portfolio Value</p>
          <p className="text-4xl font-bold text-foreground">
            ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Daily Performance</p>
            <p className={`font-medium ${dailyPerformance.positive ? "text-green-600" : "text-red-600"}`}>
              {dailyPerformance.change} ({dailyPerformance.percent})
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Yearly Performance</p>
            <p className={`font-medium ${yearlyPerformance.positive ? "text-green-600" : "text-red-600"}`}>
              {yearlyPerformance.change} ({yearlyPerformance.percent})
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-2">
            {['1D', '1W', '1M', '1Y', 'All'].map((range) => (
                <Button key={range} variant={range === '1Y' ? 'secondary' : 'ghost'} size="sm" className="text-xs h-7 px-2" disabled>
                    {range}
                </Button>
            ))}
        </div>

        <div>
          <h4 className="text-md font-semibold text-foreground mb-2">
            Asset Allocation
            {holdings.length === 0 && investmentAccounts.length === 0 && (
              <span className="text-xs font-normal text-muted-foreground ml-2">(No holdings to display)</span>
            )}
          </h4>
           <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square h-[200px]"
            >
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                        data={assetAllocationData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        strokeWidth={2}
                    >
                        {assetAllocationData.map((entry) => (
                            <Cell key={`cell-${entry.name}`} fill={entry.fill} stroke={entry.fill} />
                        ))}
                    </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
                {assetAllocationData.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.fill }} />
                        {item.name} ({item.value}%)
                    </div>
                ))}
            </div>
        </div>
      </CardContent>
       <CardFooter className="text-xs text-muted-foreground pt-4 border-t">
        Performance data is illustrative. Asset allocation includes both individual holdings and account totals.
      </CardFooter>
    </Card>
  );
}
