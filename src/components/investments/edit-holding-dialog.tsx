"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Holding, InvestmentAccount } from "@/types";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  symbol: z.string().min(1, { message: "Symbol is required." }).max(10).toUpperCase(),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(100),
  shares: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number({ required_error: "Shares is required.", invalid_type_error: "Shares must be a number." })
     .min(0.000001, { message: "Shares must be greater than 0." })
  ),
  price: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number({ required_error: "Price is required.", invalid_type_error: "Price must be a number." })
     .min(0.01, { message: "Price must be greater than 0." })
  ),
  changePercent: z.preprocess(
    (val) => (typeof val === 'string' ? (val === '' ? 0 : parseFloat(val)) : val),
    z.number().optional().default(0)
  ),
  logoUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal("")),
  accountId: z.string().optional(),
});

type EditHoldingFormValues = z.infer<typeof formSchema>;

interface EditHoldingDialogProps {
  holding: Holding | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onHoldingUpdated: (holding: Holding) => void;
  investmentAccounts: InvestmentAccount[];
}

export function EditHoldingDialog({
  holding,
  isOpen,
  onOpenChange,
  onHoldingUpdated,
  investmentAccounts,
}: EditHoldingDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EditHoldingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      symbol: "",
      name: "",
      shares: 0,
      price: 0,
      changePercent: 0,
      logoUrl: "",
      accountId: "none",
    },
  });

  // Update form values when holding changes
  useEffect(() => {
    if (holding) {
      form.reset({
        symbol: holding.symbol,
        name: holding.name,
        shares: holding.shares,
        price: holding.price,
        changePercent: holding.changePercent,
        logoUrl: holding.logoUrl || "",
        accountId: holding.accountId || "none",
      });
    }
  }, [holding, form]);

  async function onSubmit(values: EditHoldingFormValues) {
    if (!holding) return;
    
    setIsLoading(true);
    try {
      // Import the API function dynamically to avoid circular dependencies
      const { updateHolding } = await import("@/lib/api/investment-accounts");
      
      // Calculate value from shares * price
      const value = values.shares * values.price;
      
      const { holding: updatedHolding, error } = await updateHolding(holding.id, {
        symbol: values.symbol.toUpperCase(),
        name: values.name,
        value: value,
        shares: values.shares,
        price: values.price,
        changePercent: values.changePercent || 0,
        logoUrl: values.logoUrl || undefined,
        accountId: values.accountId === "none" ? undefined : values.accountId,
      });

      if (error) {
        console.error("Error updating holding:", error);
        return;
      }

      if (updatedHolding) {
        onHoldingUpdated(updatedHolding);
        onOpenChange(false);
        form.reset();
      }
    } catch (error) {
      console.error("Error updating holding:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Edit Holding</DialogTitle>
          <DialogDescription>
            Update the details of your investment holding.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symbol *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., AAPL, BTC" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No specific account</SelectItem>
                        {investmentAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} ({account.type.toUpperCase()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Apple Inc., Bitcoin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="shares"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shares/Quantity *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.000001" 
                        placeholder="10.5" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per Share ($) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="150.00" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="changePercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>24h Change (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="2.5" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="url" 
                        placeholder="https://example.com/logo.png" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {form.watch("shares") && form.watch("price") && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Total Value: <span className="font-semibold text-foreground">
                    ${(form.watch("shares") * form.watch("price")).toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </span>
                </p>
              </div>
            )}
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Holding
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 