
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

const marketData = [
  { symbol: "S&P 500", price: "5,430.50", change: "+25.60 (0.47%)", positive: true, logo: "https://placehold.co/32x32.png?text=SPX&font=roboto" },
  { symbol: "NVDA", price: "120.88", change: "-1.12 (-0.92%)", positive: false, logo: "https://placehold.co/32x32.png?text=NVDA&font=roboto" },
  { symbol: "AAPL", price: "215.30", change: "+2.45 (1.15%)", positive: true, logo: "https://placehold.co/32x32.png?text=AAPL&font=roboto" },
  { symbol: "TSLA", price: "180.01", change: "-3.50 (-1.91%)", positive: false, logo: "https://placehold.co/32x32.png?text=TSLA&font=roboto" },
];

export function MarketOverviewCard() {
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    // In a real app, you'd fetch new data here
    setIsLoading(false);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Market Overview</CardTitle>
        <CardDescription>Quick glance at key market indicators.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-28" />
              {index < marketData.length - 1 && <Separator />}
            </div>
          ))
        ) : (
          marketData.map((item, index) => (
            <div key={item.symbol} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <img src={item.logo} alt={`${item.symbol} logo`} className="h-8 w-8 rounded-full" data-ai-hint="stock logo" />
                  <span className="font-semibold text-foreground">{item.symbol}</span>
                </div>
                <span className={`text-sm font-medium ${item.positive ? "text-green-600" : "text-red-600"}`}>
                  {item.price}
                </span>
              </div>
              <div className={`flex items-center text-xs ${item.positive ? "text-green-500" : "text-red-500"}`}>
                {item.positive ? <TrendingUp className="h-3.5 w-3.5 mr-1" /> : <TrendingDown className="h-3.5 w-3.5 mr-1" />}
                {item.change}
              </div>
              {index < marketData.length - 1 && <Separator className="my-3"/>}
            </div>
          ))
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleRefresh} disabled={isLoading} variant="outline" className="w-full">
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Refreshing..." : "Refresh Market Data"}
        </Button>
      </CardFooter>
    </Card>
  );
}
