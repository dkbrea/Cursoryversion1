"use client";

import type { SavingsTransactionItem, Transaction } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, ArrowRight, MoreHorizontal, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, subMonths } from "date-fns";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";



export function SavingsTransactionsCard() {
  const [transactions, setTransactions] = useState<SavingsTransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all-status');
  const [sortOrder, setSortOrder] = useState<string>('latest');
  const { user } = useAuth();
  
  useEffect(() => {
    async function fetchSavingsTransactions() {
      if (!user?.id) return;
      
      setIsLoading(true);
      
      try {
        // First get all goal contributions transactions
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select('id, date, amount, source_id, source, notes, created_at')
          .eq('user_id', user.id)
          .eq('detailed_type', 'goal-contribution')
          .order('date', { ascending: sortOrder === 'oldest' })
          .limit(10);
          
        if (transactionsError) throw transactionsError;
        
        if (!transactionsData || transactionsData.length === 0) {
          setTransactions([]);
          setIsLoading(false);
          return;
        }
        
        // Get goal names for all transactions
        const goalIds = [...new Set(transactionsData.map(t => t.source_id).filter(Boolean))] as string[];
        
        const { data: goalsData, error: goalsError } = await supabase
          .from('financial_goals')
          .select('id, name')
          .in('id', goalIds);
          
        if (goalsError) throw goalsError;
        
        // Create a map of goal IDs to names
        const goalMap = (goalsData || []).reduce((map, goal) => {
          map[goal.id] = goal.name;
          return map;
        }, {} as Record<string, string>);
        
        // Transform transactions to SavingsTransactionItems
        const savingsTransactions: SavingsTransactionItem[] = transactionsData.map(transaction => ({
          id: String(transaction.id),
          date: new Date(transaction.date),
          goalName: transaction.source_id ? goalMap[transaction.source_id] || 'Unknown Goal' : 'Unknown Goal',
          amount: transaction.amount,
          method: transaction.source === 'automatic' ? 'Auto-Save' : 'Manual',
          // For demo purposes, we'll set statuses based on some logic
          // In a real app, this would come from the database
          status: new Date(transaction.date) > new Date() ? 'Pending' : 
                 transaction.notes?.includes('failed') ? 'Failed' : 'Completed'
        }));
        
        // Apply status filter if needed
        let filteredTransactions = savingsTransactions;
        if (statusFilter !== 'all-status') {
          const status = statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1);
          filteredTransactions = savingsTransactions.filter(t => t.status === status);
        }
        
        setTransactions(filteredTransactions);
      } catch (err) {
        console.error('Error fetching savings transactions:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchSavingsTransactions();
  }, [user?.id, statusFilter, sortOrder]);
  
  const getStatusBadgeVariant = (status: SavingsTransactionItem['status']) => {
    switch (status) {
      case "Completed": return "default"; // Greenish if theme allows
      case "Pending": return "secondary"; // Yellowish/Grayish
      case "Failed": return "destructive";
      default: return "outline";
    }
  };
  
  const getStatusBadgeClass = (status: SavingsTransactionItem['status']) => {
    switch (status) {
      case "Completed": return "bg-green-500/20 text-green-700 border-green-500/30";
      case "Pending": return "bg-yellow-500/20 text-yellow-700 border-yellow-500/30";
      case "Failed": return "bg-red-500/20 text-red-700 border-red-500/30";
      default: return "";
    }
  };


  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <CardTitle className="text-lg font-semibold">Savings Transactions</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-auto h-9 text-xs sm:text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-status">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-auto h-9 text-xs sm:text-sm">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" disabled className="h-9 w-9 opacity-50">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" disabled className="h-9 w-9 opacity-50">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading transactions...</p>
          </div>
        ) : transactions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead>Goal</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-[50px]"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="text-xs">{format(transaction.date, "MMMM dd, yyyy")}</TableCell>
                  <TableCell className="font-medium text-sm">{transaction.goalName}</TableCell>
                  <TableCell className="text-right text-sm">${transaction.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{transaction.method}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(transaction.status)} className={`text-xs ${getStatusBadgeClass(transaction.status)}`}>
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50" disabled>
                        <MoreHorizontal className="h-4 w-4"/>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No savings transactions to display.</p>
            <p className="text-xs text-muted-foreground mt-2">When you contribute to your goals, transactions will appear here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
