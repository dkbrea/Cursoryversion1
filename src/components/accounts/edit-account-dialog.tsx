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
import type { Account, AccountType } from "@/types";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const accountTypes: AccountType[] = ["checking", "savings", "credit card", "other"];

const formSchema = z.object({
  name: z.string().min(2, { message: "Account name must be at least 2 characters." }).max(50),
  type: z.enum(accountTypes, { required_error: "Please select an account type." }),
  bankName: z.string().optional(),
  last4: z.string().length(4, {message: "Must be 4 digits"}).regex(/^\d{4}$/, {message: "Must be 4 digits"}).optional().or(z.literal("")),
  balance: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number({ invalid_type_error: "Balance must be a number." })
  ),
});

type EditAccountFormValues = z.infer<typeof formSchema>;

interface EditAccountDialogProps {
  account: Account | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountUpdated: (account: Account) => void;
}

export function EditAccountDialog({ account, isOpen, onOpenChange, onAccountUpdated }: EditAccountDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EditAccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "checking",
      bankName: "",
      last4: "",
      balance: 0,
    },
  });

  // Update form when account changes
  useEffect(() => {
    if (account) {
      form.reset({
        name: account.name,
        type: account.type,
        bankName: account.bankName || "",
        last4: account.last4 || "",
        balance: account.balance,
      });
    }
  }, [account, form]);

  async function onSubmit(values: EditAccountFormValues) {
    if (!account) return;
    
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const updatedAccount: Account = {
      ...account,
      name: values.name,
      type: values.type,
      bankName: values.bankName || undefined,
      last4: values.last4 || undefined,
      balance: values.balance,
    };
    
    onAccountUpdated(updatedAccount);
    setIsLoading(false);
    onOpenChange(false);
  }

  if (!account) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>
            Update the details for &quot;{account.name}&quot;.
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
                    <Input placeholder="e.g., Everyday Checking, Vacation Fund" {...field} />
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
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an account type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accountTypes.map(type => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {type.charAt(0).toUpperCase() + type.slice(1)}
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
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Chase, Bank of America" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last4"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last 4 Digits (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="1234" {...field} maxLength={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Balance *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Update Account
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 