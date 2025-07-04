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
import type { Account, AccountType } from "@/types";
import { useState, type ReactNode } from "react";
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

type AddAccountFormValues = z.infer<typeof formSchema>;

interface AddAccountDialogProps {
  children: ReactNode; // Trigger button
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountAdded: (accountData: Omit<Account, "id" | "userId" | "createdAt" | "isPrimary">, keepOpen?: boolean) => void;
  // existingAccount?: Account; // For editing, implement later
}

export function AddAccountDialog({ children, isOpen, onOpenChange, onAccountAdded }: AddAccountDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AddAccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: undefined,
      bankName: "",
      last4: "",
      balance: 0,
    },
  });

  async function onSubmit(values: AddAccountFormValues, keepOpen: boolean = false) {
    console.log('=== AddAccountDialog: Form Submission Started ===');
    console.log('Form values:', JSON.stringify(values, null, 2));
    
    setIsLoading(true);
    
    try {
      const accountData = {
        name: values.name,
        type: values.type,
        bankName: values.bankName || undefined,
        last4: values.last4 || undefined,
        balance: values.balance,
      };
      
      console.log('Transformed account data:', JSON.stringify(accountData, null, 2));
      
      // Wrap the onAccountAdded call in a Promise to properly catch errors
      await Promise.resolve(onAccountAdded(accountData, keepOpen));
      
      // Only reset form and close dialog if successful
      form.reset({
        name: "",
        type: undefined,
        bankName: "",
        last4: "",
        balance: 0,
      });
      
      console.log('Form reset completed');
      
      // Only close the dialog if not keeping it open
      if (!keepOpen) {
        onOpenChange(false); 
      }
    } catch (err) {
      console.error('Error in form submission:', err);
      // Don't reset form or close dialog on error
      throw err; // Re-throw to be handled by the parent
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) form.reset(); // Reset form if dialog is closed
      onOpenChange(open);
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add New Account</DialogTitle>
          <DialogDescription>
            Enter the details for your new financial account.
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
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  disabled={isLoading}
                  onClick={() => form.handleSubmit(values => onSubmit(values, true))()}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save & Add Another
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
