"use client";

import type { InvestmentAccount, InvestmentAccountType, Holding } from "@/types";
import { useState, useEffect, useMemo } from "react";
import { AddInvestmentAccountDialog } from "./add-investment-account-dialog";
import { EditInvestmentAccountDialog } from "./edit-investment-account-dialog";
import { AddHoldingDialog } from "./add-holding-dialog";
import { EditHoldingDialog } from "./edit-holding-dialog";
import { InvestmentAccountList } from "./investment-account-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Icons } from "@/components/icons"; // Corrected import
import { PlusCircle, TrendingUp, LineChart, Clock, RefreshCw, BarChartBig, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MarketOverviewCard } from "./market-overview-card";
import { PortfolioSummaryCard } from "./portfolio-summary-card";
import { TopHoldingsTable } from "./top-holdings-table";
import { useAuth } from "@/contexts/auth-context";
import { 
  getInvestmentAccounts,
  getHoldings,
  createInvestmentAccount,
  updateInvestmentAccount,
  deleteInvestmentAccount as deleteInvestmentAccountAPI,
  createHolding,
  updateHolding,
  deleteHolding as deleteHoldingAPI
} from "@/lib/api/investment-accounts";

export function InvestmentManager() {
  const { user } = useAuth();
  const [investmentAccounts, setInvestmentAccounts] = useState<InvestmentAccount[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isAddAccountDialogOpen, setIsAddAccountDialogOpen] = useState(false);
  const [isEditAccountDialogOpen, setIsEditAccountDialogOpen] = useState(false);
  const [isAddHoldingDialogOpen, setIsAddHoldingDialogOpen] = useState(false);
  const [isEditHoldingDialogOpen, setIsEditHoldingDialogOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<InvestmentAccount | null>(null);
  const [holdingToEdit, setHoldingToEdit] = useState<Holding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const totalPortfolioValue = useMemo(() => {
    return investmentAccounts.reduce((sum, acc) => sum + acc.currentValue, 0);
  }, [investmentAccounts]);

  // Load data when component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const [accountsResult, holdingsResult] = await Promise.all([
        getInvestmentAccounts(user.id),
        getHoldings(user.id)
      ]);

      if (accountsResult.error) {
        console.error("Error loading investment accounts:", accountsResult.error);
        toast({
          title: "Error Loading Accounts",
          description: accountsResult.error,
          variant: "destructive",
        });
      } else {
        setInvestmentAccounts(accountsResult.accounts || []);
      }

      if (holdingsResult.error) {
        console.error("Error loading holdings:", holdingsResult.error);
        toast({
          title: "Error Loading Holdings",
          description: holdingsResult.error,
          variant: "destructive",
        });
      } else {
        setHoldings(holdingsResult.holdings || []);
      }
    } catch (error) {
      console.error("Error loading investment data:", error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load investment data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddInvestmentAccount = async (newAccountData: Omit<InvestmentAccount, "id" | "userId" | "createdAt">) => {
    if (!user?.id) return;

    try {
      const { account, error } = await createInvestmentAccount({
        ...newAccountData,
        userId: user.id,
      });

      if (error) {
        console.error("Error creating investment account:", error);
        toast({
          title: "Error Creating Account",
          description: error,
          variant: "destructive",
        });
        return;
      }

      if (account) {
        setInvestmentAccounts((prevAccounts) => [...prevAccounts, account]);
        toast({
          title: "Investment Account Added",
          description: `Account "${account.name}" has been successfully created.`,
        });
        setIsAddAccountDialogOpen(false);
      }
    } catch (error) {
      console.error("Error creating investment account:", error);
      toast({
        title: "Error Creating Account",
        description: "Failed to create investment account. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddHolding = async (newHoldingData: Omit<Holding, "id">) => {
    if (!user?.id) return;

    try {
      const { holding, error } = await createHolding({
        ...newHoldingData,
        userId: user.id,
      });

      if (error) {
        console.error("Error creating holding:", error);
        toast({
          title: "Error Creating Holding",
          description: error,
          variant: "destructive",
        });
        return;
      }

      if (holding) {
        setHoldings((prevHoldings) => [...prevHoldings, holding]);
        toast({
          title: "Holding Added",
          description: `Holding "${holding.name}" has been successfully added.`,
        });
        setIsAddHoldingDialogOpen(false);
      }
    } catch (error) {
      console.error("Error creating holding:", error);
      toast({
        title: "Error Creating Holding",
        description: "Failed to create holding. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditInvestmentAccount = (account: InvestmentAccount) => {
    setAccountToEdit(account);
    setIsEditAccountDialogOpen(true);
  };

  const handleEditHolding = (holding: Holding) => {
    setHoldingToEdit(holding);
    setIsEditHoldingDialogOpen(true);
  };

  const handleUpdateInvestmentAccount = (updatedAccount: InvestmentAccount) => {
    setInvestmentAccounts((prevAccounts) =>
      prevAccounts.map((acc) => (acc.id === updatedAccount.id ? updatedAccount : acc))
    );
    toast({
      title: "Investment Account Updated",
      description: `Account "${updatedAccount.name}" has been successfully updated.`,
    });
  };

  const handleUpdateHolding = (updatedHolding: Holding) => {
    setHoldings((prevHoldings) =>
      prevHoldings.map((holding) => (holding.id === updatedHolding.id ? updatedHolding : holding))
    );
    toast({
      title: "Holding Updated",
      description: `Holding "${updatedHolding.name}" has been successfully updated.`,
    });
  };

  const handleDeleteInvestmentAccount = async (accountId: string) => {
    const accountToDelete = investmentAccounts.find(acc => acc.id === accountId);
    if (!accountToDelete) return;

    try {
      const { error } = await deleteInvestmentAccountAPI(accountId);

      if (error) {
        console.error("Error deleting investment account:", error);
        toast({
          title: "Error Deleting Account",
          description: error,
          variant: "destructive",
        });
        return;
      }

      setInvestmentAccounts((prevAccounts) => prevAccounts.filter(acc => acc.id !== accountId));
      setHoldings((prevHoldings) => prevHoldings.filter(h => h.accountId !== accountId)); // Also remove associated holdings
      toast({
        title: "Investment Account Deleted",
        description: `Account "${accountToDelete.name}" and its holdings have been deleted.`,
        variant: "destructive",
      });
    } catch (error) {
      console.error("Error deleting investment account:", error);
      toast({
        title: "Error Deleting Account",
        description: "Failed to delete investment account. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteHolding = async (holdingId: string) => {
    const holdingToDelete = holdings.find(h => h.id === holdingId);
    if (!holdingToDelete) return;

    try {
      const { error } = await deleteHoldingAPI(holdingId);

      if (error) {
        console.error("Error deleting holding:", error);
        toast({
          title: "Error Deleting Holding",
          description: error,
          variant: "destructive",
        });
        return;
      }

      setHoldings(prev => prev.filter(h => h.id !== holdingId));
      toast({ 
        title: "Holding Removed", 
        description: `Holding "${holdingToDelete.name}" removed.`
      });
    } catch (error) {
      console.error("Error deleting holding:", error);
      toast({
        title: "Error Deleting Holding",
        description: "Failed to delete holding. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading investment data...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show message if user is not authenticated
  if (!user) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <Icons.AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            Please log in to view your investment accounts.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-700 [&>svg]:text-blue-700">
        <Icons.Info className="h-4 w-4" />
        <AlertTitle>Portfolio Data</AlertTitle>
        <AlertDescription>
          Market data and holdings are updated manually. Automated updates coming soon.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <MarketOverviewCard />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <PortfolioSummaryCard 
            totalPortfolioValue={totalPortfolioValue} 
            holdings={holdings} 
            investmentAccounts={investmentAccounts}
          />
        </div>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
                <CardTitle className="text-xl flex items-center gap-2"><Icons.BarChartBig className="h-5 w-5 text-primary"/> Investment Accounts</CardTitle>
                <CardDescription>Manage your individual investment accounts.</CardDescription>
            </div>
            <AddInvestmentAccountDialog
                isOpen={isAddAccountDialogOpen}
                onOpenChange={setIsAddAccountDialogOpen}
                onAccountAdded={handleAddInvestmentAccount}
            >
                <Button onClick={() => setIsAddAccountDialogOpen(true)} variant="outline" className="bg-card hover:bg-muted">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Account
                </Button>
            </AddInvestmentAccountDialog>
        </CardHeader>
        <CardContent>
            {investmentAccounts.length > 0 ? (
                <InvestmentAccountList
                    accounts={investmentAccounts}
                    onDeleteAccount={handleDeleteInvestmentAccount}
                    onEditAccount={handleEditInvestmentAccount}
                />
            ) : (
                 <div className="text-center text-muted-foreground py-12 border-2 border-dashed border-border rounded-lg bg-muted/30">
                    <Icons.Clock className="mx-auto h-12 w-12 text-muted-foreground/70 mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">No Investment Accounts Yet</h3>
                    <p className="text-muted-foreground mb-6">Add your brokerage, retirement, or other investment accounts to start tracking your portfolio.</p>
                    <AddInvestmentAccountDialog
                        isOpen={isAddAccountDialogOpen}
                        onOpenChange={setIsAddAccountDialogOpen}
                        onAccountAdded={handleAddInvestmentAccount}
                    >
                        <Button onClick={() => setIsAddAccountDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Account
                        </Button>
                    </AddInvestmentAccountDialog>
                </div>
            )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
                <CardTitle className="text-xl flex items-center gap-2"><Icons.TrendingUp className="h-5 w-5 text-primary"/> Top Holdings</CardTitle>
                <CardDescription>Overview of your major investment positions.</CardDescription>
            </div>
            <AddHoldingDialog
                isOpen={isAddHoldingDialogOpen}
                onOpenChange={setIsAddHoldingDialogOpen}
                onHoldingAdded={handleAddHolding}
                investmentAccounts={investmentAccounts}
            >
                <Button onClick={() => setIsAddHoldingDialogOpen(true)} variant="outline" className="bg-card hover:bg-muted">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Holding
                </Button>
            </AddHoldingDialog>
        </CardHeader>
        <CardContent>
           {holdings.length > 0 ? (
             <TopHoldingsTable 
               holdings={holdings} 
               onDeleteHolding={handleDeleteHolding}
               onEditHolding={handleEditHolding}
             />
           ) : (
             <div className="text-center text-muted-foreground py-12 border-2 border-dashed border-border rounded-lg bg-muted/30">
                <Icons.LineChartIcon className="mx-auto h-12 w-12 text-muted-foreground/70 mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No Holdings Tracked</h3>
                <p className="text-muted-foreground mb-6">Add individual stocks, ETFs, or crypto to see your positions here.</p>
                <AddHoldingDialog
                    isOpen={isAddHoldingDialogOpen}
                    onOpenChange={setIsAddHoldingDialogOpen}
                    onHoldingAdded={handleAddHolding}
                    investmentAccounts={investmentAccounts}
                >
                    <Button onClick={() => setIsAddHoldingDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Holding
                    </Button>
                </AddHoldingDialog>
             </div>
           )}
        </CardContent>
      </Card>

      <EditInvestmentAccountDialog
        account={accountToEdit}
        isOpen={isEditAccountDialogOpen}
        onOpenChange={setIsEditAccountDialogOpen}
        onAccountUpdated={handleUpdateInvestmentAccount}
      />

      <EditHoldingDialog
        holding={holdingToEdit}
        isOpen={isEditHoldingDialogOpen}
        onOpenChange={setIsEditHoldingDialogOpen}
        onHoldingUpdated={handleUpdateHolding}
        investmentAccounts={investmentAccounts}
      />
    </div>
  );
}
