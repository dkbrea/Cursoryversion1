import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import Link from "next/link";

export default function AuthSuccessPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-secondary">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 text-green-600">
            <Icons.ShieldCheck className="h-full w-full" />
          </div>
          <CardTitle className="text-2xl font-bold">Email Verified!</CardTitle>
          <CardDescription>Your email has been successfully verified</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              Great! Your email address has been verified and your account is now active. You can start using all the features of Unbroken Pockets.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Ready to take control of your finances?
            </p>
            
            <Link href="/dashboard" className="block">
              <Button className="w-full">
                Go to Dashboard
              </Button>
            </Link>
            
            <Link href="/auth" className="block">
              <Button variant="outline" className="w-full">
                Sign In
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
} 