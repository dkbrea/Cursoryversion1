import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-secondary">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 text-destructive">
            <Icons.AlertCircle className="h-full w-full" />
          </div>
          <CardTitle className="text-2xl font-bold">Authentication Error</CardTitle>
          <CardDescription>There was a problem with your authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              Your email verification link has expired or is invalid. This can happen if:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>The link is older than 24 hours</li>
                <li>You've already used the link</li>
                <li>The link was copied incorrectly</li>
              </ul>
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              To fix this issue, please try signing up again with a new email verification.
            </p>
            
            <Link href="/auth" className="block">
              <Button className="w-full">
                Try Again
              </Button>
            </Link>
            
            <Link href="/landing" className="block">
              <Button variant="outline" className="w-full">
                Go Back to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
} 