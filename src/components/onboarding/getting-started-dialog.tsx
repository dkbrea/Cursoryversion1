"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, PiggyBank, Target, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useOnboarding } from "@/hooks/use-onboarding";

interface GettingStartedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GettingStartedDialog({ open, onOpenChange }: GettingStartedDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { completeOnboarding } = useOnboarding();
  
  const steps = [
    {
      title: "Welcome to Unbroken Pockets!",
      description: "Your personal finance management solution. Let's get you started with a quick tour.",
      icon: <Wallet className="h-12 w-12 text-primary" />,
      content: "Unbroken Pockets helps you track expenses, manage budgets, and reach your financial goals all in one place."
    },
    {
      title: "Track Your Expenses",
      description: "Record and categorize your daily transactions.",
      icon: <DollarSign className="h-12 w-12 text-primary" />,
      content: "Add transactions quickly and see where your money is going with detailed categorization and spending analytics."
    },
    {
      title: "Set Budgets",
      description: "Create budgets to keep your spending in check.",
      icon: <PiggyBank className="h-12 w-12 text-primary" />,
      content: "Define monthly budgets for different categories and track your progress. Get notified when you're approaching your limits."
    },
    {
      title: "Plan Your Financial Future",
      description: "Set financial goals and track your progress.",
      icon: <Target className="h-12 w-12 text-primary" />,
      content: "Whether saving for a vacation or planning for retirement, set up goals with target dates and automatic tracking."
    }
  ];

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark onboarding as completed and close dialog
      completeOnboarding();
      onOpenChange(false);
    }
  };

  const handleSkip = () => {
    // Mark onboarding as completed and close dialog
    completeOnboarding();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{currentStepData.title}</DialogTitle>
          <DialogDescription>{currentStepData.description}</DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-4 space-y-4">
          <div className="p-2 bg-primary/10 rounded-full">
            {currentStepData.icon}
          </div>
          
          <Card className="w-full border-2 border-primary/20">
            <CardContent className="p-4 text-center">
              <p>{currentStepData.content}</p>
            </CardContent>
          </Card>
          
          <div className="flex justify-center space-x-1 mt-4">
            {steps.map((_, index) => (
              <div 
                key={index} 
                className={`h-2 w-2 rounded-full ${index === currentStep ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
        </div>
        
        <DialogFooter className="flex justify-between">
          <Button variant="ghost" onClick={handleSkip}>
            Skip Tour
          </Button>
          <Button onClick={handleNext}>
            {currentStep < steps.length - 1 ? "Next" : "Get Started"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
