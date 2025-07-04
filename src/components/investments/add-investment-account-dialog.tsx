
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
  DialogTrigger,
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
import type { InvestmentAccount, InvestmentAccountType } from "@/types";
import { investmentAccountTypes } from "@/types";
import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, { message: "Account name must be at least 2 characters." }).max(50),
  type: z.enum(investmentAccountTypes, { required_error: "Please select an account type." }),
  institution: z.string().max(50).optional(),
  currentValue: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]+/g,"")) : val),
    z.number({ required_error: "Current value is required.", invalid_type_error: "Value must be a number." })
     .min(0, { message: "Value cannot be negative." })
  ),
});

type AddInvestmentFormValues = z.infer<typeof formSchema>;

interface AddInvestmentAccountDialogProps {
  children: ReactNode; // Trigger button
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountAdded: (accountData: Omit<InvestmentAccount, "id" | "userId" | "createdAt">) => void;
}

export function AddInvestmentAccountDialog({ children, isOpen, onOpenChange, onAccountAdded }: AddInvestmentAccountDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AddInvestmentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: undefined,
      institution: "",
      currentValue: undefined,
    },
  });

  async function onSubmit(values: AddInvestmentFormValues) {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulate API call
    
    const accountData = {
        name: values.name,
        type: values.type,
        institution: values.institution || undefined,
        currentValue: values.currentValue,
    };
    onAccountAdded(accountData);
    form.reset();
    setIsLoading(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) form.reset();
      onOpenChange(open);
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Investment Account</DialogTitle>
          <DialogDescription>
            Enter the details for your new investment account.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Fidelity Brokerage, My Crypto Wallet" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an account type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {investmentAccountTypes.map(type => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="institution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institution (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Vanguard, Coinbase" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currentValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Value ($) *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="10000.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : "Add Account"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
