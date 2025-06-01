"use client";

import type { Holding } from "@/types";
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
import { MoreHorizontal, TrendingUp, TrendingDown, Trash2, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface TopHoldingsTableProps {
  holdings: Holding[];
  onDeleteHolding: (holdingId: string) => void;
  onEditHolding?: (holding: Holding) => void;
}

export function TopHoldingsTable({ holdings, onDeleteHolding, onEditHolding }: TopHoldingsTableProps) {

  if (holdings.length === 0) {
    return <p className="text-muted-foreground mt-4 text-center py-6">No holdings tracked yet. Add holdings to see them here.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Symbol</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="text-right">Shares</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Change (24h)</TableHead>
            <TableHead className="text-right w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((holding) => (
            <TableRow key={holding.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                    {holding.logoUrl && <img src={holding.logoUrl} alt="" className="h-6 w-6 rounded-full" data-ai-hint="stock logo" />}
                    <span>{holding.symbol}</span>
                </div>
              </TableCell>
              <TableCell>{holding.name}</TableCell>
              <TableCell className="text-right font-semibold">
                ${holding.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-right">{holding.shares.toLocaleString()}</TableCell>
              <TableCell className="text-right">
                ${holding.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell className={`text-right ${holding.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <div className="flex items-center justify-end gap-1">
                    {holding.changePercent >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {holding.changePercent.toFixed(2)}%
                </div>
              </TableCell>
              <TableCell className="text-right">
                <AlertDialog>
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {onEditHolding ? (
                          <DropdownMenuItem onClick={() => onEditHolding(holding)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Holding
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem disabled>Edit Holding (Soon)</DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                    </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Delete Holding "{holding.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this holding.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => onDeleteHolding(holding.id)}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Delete Holding
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
