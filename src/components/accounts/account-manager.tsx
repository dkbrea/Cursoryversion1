"use client";

import type { Account, DebtAccount } from "@/types";
import { useState, useEffect } from "react";
import { AccountList } from "./account-list";
import { AddAccountDialog } from "./add-account-dialog";
import { EditAccountDialog } from "./edit-account-dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { getAccounts, createAccount, updateAccount, deleteAccount } from "@/lib/api/accounts";
import { getDebtAccounts } from "@/lib/api/debts";
import { useIsMobile } from "@/hooks/use-mobile";

export function AccountManager() {
  const [assetAccounts, setAssetAccounts] = useState<Account[]>([]);
  const [debtAccountsList, setDebtAccountsList] = useState<DebtAccount[]>([]);
  const [isAddAccountDialogOpen, setIsAddAccountDialogOpen] = useState(false);
  const [isEditAccountDialogOpen, setIsEditAccountDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Fetch accounts from the database
  useEffect(() => {
    async function fetchAccounts() {
      if (!user?.id) return;
      
      setIsLoading(true);
      
      try {
        // Fetch asset accounts
        const { accounts: fetchedAssetAccounts, error: assetError } = await getAccounts(user.id);
        
        if (assetError) {
          console.error("Error fetching asset accounts:", assetError);
          toast({
            title: "Error",
            description: "Failed to load your accounts. Please try again.",
            variant: "destructive"
          });
          return;
        }
        
        // Fetch debt accounts
        const { accounts: fetchedDebtAccounts, error: debtError } = await getDebtAccounts(user.id);
        
        if (debtError) {
          console.error("Error fetching debt accounts:", debtError);
          toast({
            title: "Error",
            description: "Failed to load your debt accounts. Please try again.",
            variant: "destructive"
          });
          return;
        }
        
        setAssetAccounts(fetchedAssetAccounts || []);
        setDebtAccountsList(fetchedDebtAccounts || []);
      } catch (err) {
        console.error("Unexpected error fetching accounts:", err);
        toast({
          title: "Error",
          description: "An unexpected error occurred while loading your accounts.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchAccounts();
  }, [user?.id, toast]);

  const handleAddAccount = async (newAccountData: Omit<Account, "id" | "userId" | "createdAt" | "isPrimary">, keepOpen = false) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to add an account.",
        variant: "destructive"
      });
      return;
    }
    
    setIsUpdating(true);
    
    try {
      // Determine if this should be the primary account
      const shouldBePrimary = assetAccounts.filter(acc => acc.type !== 'credit card' || acc.balance >= 0).length === 0;
      
      // Create the account in the database
      const { account: newAccount, error } = await createAccount({
        ...newAccountData,
        userId: user.id,
        isPrimary: shouldBePrimary
      });
      
      if (error || !newAccount) {
        throw new Error(error || "Failed to create account");
      }
      
      // Update local state
      setAssetAccounts((prevAccounts) => {
        if (newAccount.isPrimary) {
          return [
            ...prevAccounts.map(acc => ({ ...acc, isPrimary: false })),
            newAccount
          ];
        }
        return [...prevAccounts, newAccount];
      });
      
      toast({
        title: "Account Added",
        description: `Account "${newAccount.name}" has been successfully created.`,
      });
      
      if (!keepOpen) {
        setIsAddAccountDialogOpen(false);
      }
    } catch (err: any) {
      console.error("Error adding account:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to add your account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    // This handler currently only manages asset accounts.
    // Deletion of debt accounts should be handled in the Debt Plan section.
    if (!user?.id) return;
    
    const accountToDelete = assetAccounts.find(acc => acc.id === accountId);
    if (!accountToDelete) return;
    
    setIsUpdating(true);
    
    try {
      // Delete the account from the database
      const { success, error } = await deleteAccount(accountId);
      
      if (error || !success) {
        throw new Error(error || "Failed to delete account");
      }
      
      // Update local state
      setAssetAccounts((prevAccounts) => prevAccounts.filter(acc => acc.id !== accountId));
      
      toast({
        title: "Account Deleted",
        description: `Account "${accountToDelete.name}" has been deleted.`,
        variant: "destructive",
      });
    } catch (err: any) {
      console.error("Error deleting account:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete your account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetPrimaryAccount = async (accountId: string) => {
    if (!user?.id) return;
    
    const accountToSetPrimary = assetAccounts.find(acc => acc.id === accountId);
    if (!accountToSetPrimary) return;
    
    setIsUpdating(true);
    
    try {
      // First, update all accounts to not be primary
      for (const account of assetAccounts) {
        if (account.isPrimary && account.id !== accountId) {
          await updateAccount(account.id, { isPrimary: false });
        }
      }
      
      // Then set the selected account as primary
      const { account: updatedAccount, error } = await updateAccount(accountId, { isPrimary: true });
      
      if (error || !updatedAccount) {
        throw new Error(error || "Failed to update primary account");
      }
      
      // Update local state
      setAssetAccounts((prevAccounts) =>
        prevAccounts.map(acc => ({
          ...acc,
          isPrimary: acc.id === accountId,
        }))
      );
      
      toast({
        title: "Primary Account Updated",
        description: `"${accountToSetPrimary.name}" is now your primary account.`,
      });
    } catch (err: any) {
      console.error("Error setting primary account:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to update your primary account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setIsEditAccountDialogOpen(true);
  };
  
  const handleAccountUpdate = async (updatedAccount: Account) => {
    // This handler updates the account via API
    if (!user?.id) return;
    
    setIsUpdating(true);
    
    try {
      // Update the account in the database
      const { account: savedAccount, error } = await updateAccount(updatedAccount.id, {
        name: updatedAccount.name,
        type: updatedAccount.type,
        bankName: updatedAccount.bankName,
        last4: updatedAccount.last4,
        balance: updatedAccount.balance,
        isPrimary: updatedAccount.isPrimary
      });
      
      if (error || !savedAccount) {
        throw new Error(error || "Failed to update account");
      }
      
      // Update local state
      setAssetAccounts(prevAccounts => 
        prevAccounts.map(acc => acc.id === updatedAccount.id ? savedAccount : acc)
      );
      
      toast({
        title: "Account Updated",
        description: `Account "${updatedAccount.name}" has been updated.`,
      });
    } catch (err: any) {
      console.error("Error updating account:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to update your account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const allDisplayAccounts = [...assetAccounts, ...debtAccountsList];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <AddAccountDialog
          isOpen={isAddAccountDialogOpen}
          onOpenChange={setIsAddAccountDialogOpen}
          onAccountAdded={handleAddAccount}
        >
          <Button onClick={() => setIsAddAccountDialogOpen(true)} disabled={isUpdating}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Asset Account
          </Button>
        </AddAccountDialog>
      </div>

      <EditAccountDialog
        account={editingAccount}
        isOpen={isEditAccountDialogOpen}
        onOpenChange={setIsEditAccountDialogOpen}
        onAccountUpdated={handleAccountUpdate}
      />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading your accounts...</p>
        </div>
      ) : (
        <>
          <AccountList
            accounts={allDisplayAccounts}
            onDeleteAccount={handleDeleteAccount} // Only affects asset accounts from here
            onSetPrimaryAccount={handleSetPrimaryAccount} // Only affects asset accounts from here
            onEditAccount={handleEditAccount} // Only affects asset accounts from here
            isUpdating={isUpdating}
            isMobile={isMobile}
          />
          {allDisplayAccounts.length === 0 && (
            <div className="text-center text-muted-foreground py-10">
              <p className="text-lg">No accounts yet.</p>
              <p>Click "Add New Asset Account" to get started or manage debts in the Debt Plan section.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
