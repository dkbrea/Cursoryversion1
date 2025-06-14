"use client";

import { SinkingFundWithProgress } from "@/types";
import { AddSinkingFundDialog } from "./add-sinking-fund-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, PiggyBank, MoreVertical, Edit, Trash2, Plus, DollarSign, Target, Calendar, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface SinkingFundsEnvelopePageProps {
  sinkingFunds: SinkingFundWithProgress[];
  onEditSinkingFund: (sinkingFundId: string) => void;
  onDeleteSinkingFund: (sinkingFundId: string) => void;
  onAddContribution: (sinkingFundId: string) => void;
  isDeleting: boolean;
  isAddDialogOpen: boolean;
  onAddDialogChange: (open: boolean) => void;
  onAddSinkingFund: (data: any, keepOpen?: boolean) => void;
}

export function SinkingFundsEnvelopePage({
  sinkingFunds,
  onEditSinkingFund,
  onDeleteSinkingFund,
  onAddContribution,
  isDeleting,
  isAddDialogOpen,
  onAddDialogChange,
  onAddSinkingFund,
}: SinkingFundsEnvelopePageProps) {
  
  // Category-based gradient colors for envelopes
  const getEnvelopeColor = (fund: SinkingFundWithProgress) => {
    const categoryColors = {
      'housing': 'from-[#CABDFF]/70 to-[#CABDFF]/90 border-[#CABDFF]',
      'utilities': 'from-[#9B1BBA]/70 to-[#9B1BBA]/90 border-[#9B1BBA]',
      'transportation': 'from-[#94B3FD]/70 to-[#94B3FD]/90 border-[#94B3FD]',
      'food': 'from-[#B0EACD]/70 to-[#B0EACD]/90 border-[#B0EACD]',
      'health': 'from-[#F3B0AE]/70 to-[#F3B0AE]/90 border-[#F3B0AE]',
      'personal': 'from-[#FFD3BA]/70 to-[#FFD3BA]/90 border-[#FFD3BA]',
      'home-family': 'from-[#F9D87A]/70 to-[#F9D87A]/90 border-[#F9D87A]',
      'media-productivity': 'from-[#AEE7F8]/70 to-[#AEE7F8]/90 border-[#AEE7F8]',
      'gifts': 'from-[#FFB6C1]/70 to-[#FFB6C1]/90 border-[#FFB6C1]',
      'pets': 'from-[#DDA0DD]/70 to-[#DDA0DD]/90 border-[#DDA0DD]',
      'education': 'from-[#87CEEB]/70 to-[#87CEEB]/90 border-[#87CEEB]',
      'subscriptions': 'from-[#98FB98]/70 to-[#98FB98]/90 border-[#98FB98]',
      'self-care': 'from-[#F0E68C]/70 to-[#F0E68C]/90 border-[#F0E68C]',
      'clothing': 'from-[#E6E6FA]/70 to-[#E6E6FA]/90 border-[#E6E6FA]',
      'home-maintenance': 'from-[#D2B48C]/70 to-[#D2B48C]/90 border-[#D2B48C]',
      'car-replacement': 'from-[#FFA07A]/70 to-[#FFA07A]/90 border-[#FFA07A]',
      'vacation': 'from-[#20B2AA]/70 to-[#20B2AA]/90 border-[#20B2AA]',
    };
    
    return categoryColors[fund.category as keyof typeof categoryColors] || 'from-gray-100 to-gray-200 border-gray-300';
  };

  const getCategoryLabel = (categoryValue: string) => {
    const categoryLabels = {
      'housing': 'Housing',
      'utilities': 'Utilities',
      'transportation': 'Transportation',
      'food': 'Food',
      'health': 'Health',
      'personal': 'Personal',
      'home-family': 'Home/Family',
      'media-productivity': 'Media/Productivity',
      'gifts': 'Gifts & Holidays',
      'pets': 'Pets',
      'education': 'Education',
      'subscriptions': 'Other Subscriptions',
      'self-care': 'Self-Care',
      'clothing': 'Clothing & Shoes',
      'home-maintenance': 'Home Maintenance',
      'car-replacement': 'Vehicle Replacement',
      'vacation': 'Vacation & Travel',
    };
    
    return categoryLabels[categoryValue as keyof typeof categoryLabels] || categoryValue;
  };

  const cleanFundName = (name: string) => {
    return name.replace(/\s*Fund\s*$/i, '').replace(/\s*Sinking\s*Fund\s*$/i, '').trim();
  };

  const getStatusBadge = (fund: SinkingFundWithProgress) => {
    if (fund.isFullyFunded) {
      return <Badge variant="default" className="bg-green-600/80 text-white border-green-700 backdrop-blur-sm">Fully Funded</Badge>;
    }
    if (fund.progressPercentage >= 75) {
      return <Badge variant="default" className="bg-blue-600/80 text-white border-blue-700 backdrop-blur-sm">Almost There</Badge>;
    }
    if (fund.progressPercentage >= 50) {
      return <Badge variant="default" className="bg-yellow-600/80 text-white border-yellow-700 backdrop-blur-sm">On Track</Badge>;
    }
    if (fund.progressPercentage >= 25) {
      return <Badge variant="default" className="bg-orange-600/80 text-white border-orange-700 backdrop-blur-sm">Getting Started</Badge>;
    }
    return <Badge variant="default" className="bg-slate-600/80 text-white border-slate-700 backdrop-blur-sm">Just Started</Badge>;
  };

  if (sinkingFunds.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-muted-foreground/30 rounded-lg">
        <PiggyBank className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Start Your First Sinking Fund!</h2>
        <p className="text-muted-foreground mb-6">Create digital cash envelopes for upcoming expenses like vacations, car repairs, or holiday gifts.</p>
        <AddSinkingFundDialog
          isOpen={isAddDialogOpen}
          onOpenChange={onAddDialogChange}
          onSinkingFundAdded={onAddSinkingFund}
        >
          <Button onClick={() => onAddDialogChange(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Sinking Fund
          </Button>
        </AddSinkingFundDialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <PiggyBank className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Envelopes</p>
              <p className="text-xl font-bold">{sinkingFunds.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Saved</p>
              <p className="text-xl font-bold">
                {formatCurrency(sinkingFunds.reduce((sum, fund) => sum + fund.currentAmount, 0))}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Target className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Goals</p>
              <p className="text-xl font-bold">
                {formatCurrency(sinkingFunds.reduce((sum, fund) => sum + fund.targetAmount, 0))}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Contributions</p>
              <p className="text-xl font-bold">
                {formatCurrency(sinkingFunds.reduce((sum, fund) => sum + fund.monthlyContribution, 0))}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Envelope Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sinkingFunds.map((fund) => (
          <Card 
            key={fund.id} 
            className={`envelope-card envelope-hover envelope-shadow envelope-interactive relative overflow-hidden border-2 bg-gradient-to-br ${getEnvelopeColor(fund)}`}
          >
            {/* Envelope Flap */}
            <div className="envelope-flap absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-white/20 to-transparent z-[3]">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-8 bg-gradient-to-b from-white/30 to-white/10 rounded-b-full border-x border-b border-white/20"></div>
            </div>
            
            {/* Paper Texture Overlay */}
            <div className="envelope-paper-texture absolute inset-0 opacity-20 pointer-events-none z-[1]"></div>
            
            {/* Envelope Front */}
            <CardContent className={`pt-16 pb-6 px-6`}>
              {/* Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="absolute top-4 right-4 h-8 w-8 p-0 bg-white/50 hover:bg-white/70 backdrop-blur-sm z-[4]">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onAddContribution(fund.id)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contribution
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEditSinkingFund(fund.id)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Fund
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDeleteSinkingFund(fund.id)}
                    className="text-red-600 focus:text-red-600"
                    disabled={isDeleting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Fund
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Fund Name */}
              <div className="mb-4">
                <h3 className="font-semibold text-lg text-slate-800 mb-1 pr-8 drop-shadow-sm">{cleanFundName(fund.name)}</h3>
                <p className="text-xs text-slate-600 mb-2 font-medium">{getCategoryLabel(fund.category)}</p>
                {getStatusBadge(fund)}
              </div>

              {/* Progress Section */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-slate-700 font-medium">Saved</p>
                    <p className="text-xl font-bold text-slate-800 drop-shadow-sm">{formatCurrency(fund.currentAmount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-700 font-medium">Goal</p>
                    <p className="text-lg font-semibold text-slate-800 drop-shadow-sm">{formatCurrency(fund.targetAmount)}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700 font-medium">Progress</span>
                    <span className="font-semibold text-slate-800">{fund.progressPercentage.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={Math.min(fund.progressPercentage, 100)} 
                    className="h-3 bg-white/60 backdrop-blur-sm border border-white/40"
                  />
                </div>
              </div>

              {/* Monthly Contribution */}
              <div className="border-t border-white/40 pt-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-slate-700 font-medium">Monthly</p>
                    <p className="text-lg font-semibold text-slate-800 drop-shadow-sm">{formatCurrency(fund.monthlyContribution)}</p>
                  </div>
                  {fund.nextExpenseDate && (
                    <div className="text-right">
                      <p className="text-sm text-slate-700 font-medium">Due</p>
                      <p className="text-sm font-medium text-slate-800 drop-shadow-sm">
                        {format(new Date(fund.nextExpenseDate), 'MMM dd')}
                      </p>
                    </div>
                  )}
                </div>
                
                {fund.monthsToTarget && (
                  <div className="mt-2">
                    <p className="text-xs text-slate-600 italic">
                      {fund.monthsToTarget} months to reach goal
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Add Button */}
              <Button 
                onClick={() => onAddContribution(fund.id)}
                size="sm" 
                className="w-full mt-4 bg-white/30 hover:bg-white/40 text-slate-800 border border-white/50 backdrop-blur-sm font-medium shadow-sm"
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Money
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 