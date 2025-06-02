"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

const registerSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export function AuthForm() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    setError(null);
    
    // Set a safety timeout to reset loading state if login takes too long
    const safetyTimeout = setTimeout(() => {
      if (setIsLoading) {
        console.log('Login safety timeout triggered - resetting loading state');
        setIsLoading(false);
        setError('Login timed out. Please try again.');
      }
    }, 10000); // 10 seconds timeout
    
    try {
      console.log('Attempting login for:', values.email);
      const result = await login(values.email, values.password);
      
      clearTimeout(safetyTimeout); // Clear timeout on success/error
      
      console.log('Login result:', result);
      
      if (!result.success && result.error) {
        setError(result.error);
        setIsLoading(false);
      } else if (result.success) {
        // Success case - we'll let the redirect happen
        console.log('Login successful, waiting for redirect');
        // Still set a backup timeout in case redirect doesn't happen
        setTimeout(() => {
          setIsLoading(false);
        }, 3000);
      } else {
        // Unknown result state
        setError('Unknown login error occurred');
        setIsLoading(false);
      }
    } catch (err: any) {
      clearTimeout(safetyTimeout); // Clear timeout on exception
      console.error('Login exception:', err);
      setError(err.message || "An error occurred during login");
      setIsLoading(false);
    }
  }

  async function onRegisterSubmit(values: z.infer<typeof registerSchema>) {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            first_name: values.firstName,
          }
        }
      });
      
      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }
      
      // Email confirmation check
      if (data?.user) {
        // Create a user profile in our users table using the existing name column
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email || '',
            name: values.firstName, // Use the name column
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't prevent registration if profile creation fails
        }

        // If identities length is 0, email confirmation is required
        if (data.user.identities?.length === 0) {
          setError("Please check your email for a confirmation link. You must verify your email before logging in.");
          setIsLoading(false);
          return;
        }
        
        // If email is not confirmed
        if (!data.user.email_confirmed_at) {
          setError("Email verification required! Please check your inbox and confirm your email before logging in.");
          setIsLoading(false);
          return;
        }
      }
      
      // Only attempt auto-login if we've passed the checks above
      const result = await login(values.email, values.password);
      
      if (!result.success && result.error) {
        // Handle specific auth errors more clearly
        if (result.error.includes("Email not confirmed")) {
          setError("Your email address has not been verified. Please check your inbox for a verification link.");
        } else {
          setError(result.error);
        }
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during registration");
      setIsLoading(false);
    }
  }

  return (
    <Tabs defaultValue="login" className="w-full" onValueChange={(value) => setAuthMode(value as "login" | "register")}>
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="register">Register</TabsTrigger>
      </TabsList>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <TabsContent value="login">
        <Form {...loginForm}>
          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
            <FormField
              control={loginForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="your@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={loginForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>
        </Form>
      </TabsContent>
      
      <TabsContent value="register">
        <Form {...registerForm}>
          <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
            <FormField
              control={registerForm.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={registerForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="your@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={registerForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={registerForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign Up"}
            </Button>
          </form>
        </Form>
      </TabsContent>
    </Tabs>
  );
}
