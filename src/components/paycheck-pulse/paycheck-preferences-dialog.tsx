"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Calendar, Target, Zap, Info } from "lucide-react";
import type { PaycheckPreferences, PaycheckTimingMode } from "@/types";

interface PaycheckPreferencesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: PaycheckPreferences;
  onPreferencesChanged: (preferences: PaycheckPreferences) => void;
  children?: React.ReactNode;
}

export function PaycheckPreferencesDialog({ 
  isOpen, 
  onOpenChange, 
  preferences, 
  onPreferencesChanged, 
  children 
}: PaycheckPreferencesDialogProps) {
  const [formData, setFormData] = useState<PaycheckPreferences>(preferences);

  const handleSave = () => {
    onPreferencesChanged(formData);
    onOpenChange(false);
  };

  const handleReset = () => {
    setFormData(preferences);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Paycheck Pulse Preferences
          </DialogTitle>
          <DialogDescription>
            Customize how expenses and savings are allocated across your paychecks. 
            These settings affect timing, priorities, and sinking fund contributions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Timing Mode Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Expense Timing Mode
              </CardTitle>
              <CardDescription>
                Choose whether to budget for expenses occurring during this paycheck period or the next one.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Allocation Mode</Label>
                <Select 
                  value={formData.timingMode} 
                  onValueChange={(value: PaycheckTimingMode) => setFormData(prev => ({ ...prev, timingMode: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current-period">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Current Period</span>
                        <span className="text-xs text-muted-foreground">
                          Budget for expenses due during this paycheck period
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="next-period">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Next Period</span>
                        <span className="text-xs text-muted-foreground">
                          Budget for expenses coming in the next paycheck period
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Buffer Days</Label>
                <Select 
                  value={formData.includeBufferDays.toString()} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, includeBufferDays: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No buffer</SelectItem>
                    <SelectItem value="1">1 day buffer</SelectItem>
                    <SelectItem value="3">3 days buffer (recommended)</SelectItem>
                    <SelectItem value="5">5 days buffer</SelectItem>
                    <SelectItem value="7">1 week buffer</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Include expenses due slightly outside the paycheck period to account for timing variations.
                </p>
              </div>

              {/* Timing Mode Explanation */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    {formData.timingMode === 'current-period' ? (
                      <>
                        <strong>Current Period Mode:</strong> More intuitive for tight budgets. 
                        You'll see exactly what bills need to be paid from this specific paycheck.
                      </>
                    ) : (
                      <>
                        <strong>Next Period Mode:</strong> Better for forward planning. 
                        Use this paycheck to prepare for upcoming expenses, providing better cash flow.
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Sinking Funds Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Sinking Funds Integration
              </CardTitle>
              <CardDescription>
                Configure how sinking fund contributions are prioritized and calculated for paycheck-based budgeting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Prioritize Sinking Fund Contributions</Label>
                  <p className="text-xs text-muted-foreground">
                    Allocate to sinking funds before variable expenses
                  </p>
                </div>
                <Switch
                  checked={formData.prioritizeSinkingFunds}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, prioritizeSinkingFunds: checked }))}
                />
              </div>

              <div className="space-y-3">
                <Label>Sinking Fund Strategy</Label>
                <Select 
                  value={formData.sinkingFundStrategy} 
                  onValueChange={(value: typeof formData.sinkingFundStrategy) => setFormData(prev => ({ ...prev, sinkingFundStrategy: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frequency-based">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Frequency-Based</span>
                        <span className="text-xs text-muted-foreground">
                          Prioritize funds that match your paycheck frequency
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="deadline-priority">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Deadline Priority</span>
                        <span className="text-xs text-muted-foreground">
                          Prioritize funds with the nearest expense dates
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="proportional">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Proportional</span>
                        <span className="text-xs text-muted-foreground">
                          Distribute contributions proportionally by target amount
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Strategy Explanation */}
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-green-800">
                    {formData.sinkingFundStrategy === 'frequency-based' && (
                      <>
                        <strong>Frequency-Based:</strong> Matches contribution timing to your paycheck schedule. 
                        Bi-weekly funds get priority if you're paid bi-weekly.
                      </>
                    )}
                    {formData.sinkingFundStrategy === 'deadline-priority' && (
                      <>
                        <strong>Deadline Priority:</strong> Funds with sooner deadlines get allocated first. 
                        Great for ensuring urgent expenses are covered.
                      </>
                    )}
                    {formData.sinkingFundStrategy === 'proportional' && (
                      <>
                        <strong>Proportional:</strong> Larger target amounts get proportionally more allocation. 
                        Balanced approach for steady progress on all funds.
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Section */}
          <Card className="bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Current Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Timing Mode:</span>
                  <Badge variant="outline">
                    {formData.timingMode === 'current-period' ? 'Current Period' : 'Next Period'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Buffer Days:</span>
                  <Badge variant="outline">{formData.includeBufferDays} days</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sinking Fund Priority:</span>
                  <Badge variant={formData.prioritizeSinkingFunds ? "default" : "secondary"}>
                    {formData.prioritizeSinkingFunds ? 'High Priority' : 'Standard'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Strategy:</span>
                  <Badge variant="outline">
                    {formData.sinkingFundStrategy === 'frequency-based' && 'Frequency-Based'}
                    {formData.sinkingFundStrategy === 'deadline-priority' && 'Deadline Priority'}
                    {formData.sinkingFundStrategy === 'proportional' && 'Proportional'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} className="flex-1">
            Save Preferences
          </Button>
          <Button onClick={handleReset} variant="outline">
            Reset
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 