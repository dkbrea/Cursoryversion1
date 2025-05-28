"use client";

import type { UnifiedRecurringListItem, RecurringItem, RecurringFrequency } from "@/types"; // Updated import
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit3, ArrowDownCircle, ArrowUpCircle, AlertCircle, CreditCard, Briefcase, DollarSign } from "lucide-react";
import { format, isPast, isToday, isSameDay } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface RecurringListProps {
  items: UnifiedRecurringListItem[];
  onDeleteItem: (itemId: string, source: 'recurring' | 'debt') => void;
  onEditItem: (item: RecurringItem) => void; // Still expects original RecurringItem for editing
}

const formatDisplayType = (type: UnifiedRecurringListItem['itemDisplayType']) => {
  switch (type) {
    case 'income': return 'Income';
    case 'subscription': return 'Subscription';
    case 'fixed-expense': return 'Fixed Expense';
    case 'debt-payment': return 'Debt Payment';
    default: return String(type).replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }
};

const formatFrequencyDisplay = (frequency: UnifiedRecurringListItem['frequency']) => {
  if (!frequency) return 'N/A';
  return frequency.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Helper functions for consistent color coding (matching calendar view)
const getItemIcon = (itemType: UnifiedRecurringListItem['itemDisplayType']) => {
  switch (itemType) {
    case 'income':
      return <ArrowUpCircle className="h-5 w-5 text-green-600" />;
    case 'subscription':
      return <CreditCard className="h-5 w-5 text-blue-600" />;
    case 'fixed-expense':
      return <Briefcase className="h-5 w-5 text-orange-600" />;
    case 'debt-payment':
      return <ArrowDownCircle className="h-5 w-5 text-red-600" />;
    default:
      return <DollarSign className="h-5 w-5 text-gray-600" />;
  }
};

const getBadgeVariant = (itemType: UnifiedRecurringListItem['itemDisplayType']) => {
  switch (itemType) {
    case 'income':
      return 'default';
    case 'subscription':
      return 'secondary';
    case 'fixed-expense':
      return 'outline';
    case 'debt-payment':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getBadgeClassName = (itemType: UnifiedRecurringListItem['itemDisplayType']) => {
  switch (itemType) {
    case 'income':
      return 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200';
    case 'subscription':
      return 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200';
    case 'fixed-expense':
      return 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200';
    case 'debt-payment':
      return 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200';
    default:
      return '';
  }
};

const getAmountTextColor = (itemType: UnifiedRecurringListItem['itemDisplayType']) => {
  switch (itemType) {
    case 'income':
      return 'text-green-600';
    case 'subscription':
      return 'text-blue-600';
    case 'fixed-expense':
      return 'text-orange-600';
    case 'debt-payment':
      return 'text-red-600';
    default:
      return 'text-destructive';
  }
};

export function RecurringList({ items, onDeleteItem, onEditItem }: RecurringListProps) {
  if (items.length === 0) {
    return <p className="text-muted-foreground mt-4 text-center py-8">No recurring items or debt payments set up yet.</p>;
  }
  
  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Next Occurrence</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const isExpenseType = item.itemDisplayType === 'subscription' || item.itemDisplayType === 'fixed-expense' || item.itemDisplayType === 'debt-payment';
              
              return (
                <TableRow key={item.id + item.source} className={cn(item.status === "Ended" && "opacity-60")}>
                  <TableCell>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="flex items-center justify-center">
                                {getItemIcon(item.itemDisplayType)}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{formatDisplayType(item.itemDisplayType)}</p>
                        </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge 
                        variant={getBadgeVariant(item.itemDisplayType)}
                        className={cn("capitalize", getBadgeClassName(item.itemDisplayType))}
                    >
                      {formatDisplayType(item.itemDisplayType)}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${getAmountTextColor(item.itemDisplayType)}`}>
                    ${item.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>{formatFrequencyDisplay(item.frequency)}</TableCell>
                  <TableCell>
                    {format(item.nextOccurrenceDate, "MMM dd, yyyy")}
                    {item.endDate && item.source === 'recurring' && <div className="text-xs text-muted-foreground">Ends: {format(new Date(item.endDate), "MMM dd, yyyy")}</div>}
                     {item.frequency === 'semi-monthly' && item.source === 'recurring' && item.semiMonthlyFirstPayDate && item.semiMonthlySecondPayDate && (
                        <div className="text-xs text-muted-foreground">
                            Pay Dates: {format(new Date(item.semiMonthlyFirstPayDate), "MMM d")} & {format(new Date(item.semiMonthlySecondPayDate), "MMM d")}
                        </div>
                    )}
                  </TableCell>
                  <TableCell>
                     <Badge 
                        variant={item.status === "Ended" ? "outline" 
                                 : item.status === "Today" ? "default" 
                                 : "secondary" } 
                        className={cn(item.status === "Today" && "bg-blue-500 text-white")} // Consider a specific 'today' color in theme
                    >
                        {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {item.isDebt ? (
                       <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" disabled className="opacity-50 cursor-not-allowed">
                                <Edit3 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="flex items-center gap-1"><AlertCircle className="h-4 w-4"/> Manage in Debt Plan</p>
                        </TooltipContent>
                       </Tooltip>
                    ) : (
                        <Button variant="ghost" size="icon" onClick={() => onEditItem(item as unknown as RecurringItem)} disabled={item.status === "Ended"} className="hover:text-primary h-8 w-8">
                            <Edit3 className="h-4 w-4" />
                        </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={item.isDebt} className={cn("hover:text-destructive h-8 w-8", item.isDebt && "opacity-50 cursor-not-allowed")}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{item.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this recurring item.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDeleteItem(item.id, item.source)} className="bg-destructive hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}

