import { AuthForm } from "@/components/auth/auth-form";
import { Icons } from "@/components/icons"; // Corrected import
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import { EmailConfirmationMessage } from "@/components/auth/email-confirmation-message";

export default function AuthPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-secondary">
      {/* Email confirmation message */}
      <Suspense fallback={null}>
        <EmailConfirmationMessage />
      </Suspense>
      
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 text-primary">
             <Icons.Wallet className="h-full w-full" />
          </div>
          <CardTitle className="text-3xl font-bold">Welcome to Unbroken Pockets</CardTitle>
          <CardDescription className="text-lg">Sign in to manage your finances</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <AuthForm />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
