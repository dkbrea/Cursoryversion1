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
import type { InvestmentAccount, InvestmentAccountType } from "@/types";
import { investmentAccountTypes } from "@/types";
import { useState, useEffect } from "react";
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

type EditInvestmentFormValues = z.infer<typeof formSchema>;

interface EditInvestmentAccountDialogProps {
  account: InvestmentAccount | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountUpdated: (account: InvestmentAccount) => void;
}

export function EditInvestmentAccountDialog({
  account,
  isOpen,
  onOpenChange,
  onAccountUpdated,
}: EditInvestmentAccountDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EditInvestmentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "brokerage",
      institution: "",
      currentValue: 0,
    },
  });

  // Update form values when account changes
  useEffect(() => {
    if (account) {
      form.reset({
        name: account.name,
        type: account.type,
        institution: account.institution || "",
        currentValue: account.currentValue,
      });
    }
  }, [account, form]);

  async function onSubmit(values: EditInvestmentFormValues) {
    if (!account) return;
    
    setIsLoading(true);
    try {
      // Import the API function dynamically to avoid circular dependencies
      const { updateInvestmentAccount } = await import("@/lib/api/investment-accounts");
      
      const { account: updatedAccount, error } = await updateInvestmentAccount(account.id, {
        name: values.name,
        type: values.type,
        institution: values.institution || undefined,
        currentValue: values.currentValue,
      });

      if (error) {
        console.error("Error updating investment account:", error);
        return;
      }

      if (updatedAccount) {
        onAccountUpdated(updatedAccount);
        onOpenChange(false);
        form.reset();
      }
    } catch (error) {
      console.error("Error updating investment account:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Investment Account</DialogTitle>
          <DialogDescription>
            Update the details of your investment account.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Vanguard Brokerage" {...field} />
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
                  <FormLabel>Account Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="brokerage">Brokerage</SelectItem>
                      <SelectItem value="ira">IRA</SelectItem>
                      <SelectItem value="401k">401(k)</SelectItem>
                      <SelectItem value="crypto">Crypto</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
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
                    <Input placeholder="e.g. Vanguard, Fidelity, Charles Schwab" {...field} />
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
                  <FormLabel>Current Value</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
                Update Account
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 