import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, LogIn, UserPlus } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Login form schema
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Signup form schema
const signupSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  fullName: z.string().optional(),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { login, loginWithGoogleRedirect } = useAuth();
  const [_, setLocation] = useLocation();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    
    try {
      await login(data.email, data.password);
      // Redirect will happen automatically after successful login via the auth state change listener
      setLocation("/");
    } catch (err) {
      // Error handling is already done in auth context
      form.setError("root", { 
        message: err instanceof Error ? err.message : "Login failed" 
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogleRedirect();
      // Redirect and auth handling happens automatically
    } catch (err) {
      // Error handling is already done in auth context
      form.setError("root", {
        message: err instanceof Error ? err.message : "Google sign-in failed"
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Login</CardTitle>
        <CardDescription>
          Sign in to access your AC unit service information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {form.formState.errors.root && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input placeholder="••••••••" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              <LogIn className="mr-2 h-4 w-4" />
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </Form>
        
        <div className="text-center text-sm">
          <p className="text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
        
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-2 text-xs text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          type="button"
          disabled={isGoogleLoading}
          className="w-full"
          onClick={handleGoogleSignIn}
        >
          <FcGoogle className="mr-2 h-4 w-4" />
          {isGoogleLoading ? "Signing in with Google..." : "Sign in with Google"}
        </Button>
        
        <div className="text-center text-sm text-muted-foreground">
          <p>By logging in, you agree to our Terms of Service and Privacy Policy.</p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-center">
        <p className="text-sm text-gray-600 mt-2">
          Need help?{" "}
          <a href="mailto:support@cooltrack.com" className="text-primary hover:underline">
            Contact Support
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}

export function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signup, loginWithGoogleRedirect } = useAuth();
  const [_, setLocation] = useLocation();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      fullName: "",
    },
  });

  async function onSubmit(data: SignupFormValues) {
    setIsLoading(true);
    
    try {
      await signup({
        username: data.username,
        email: data.email,
        password: data.password,
        fullName: data.fullName || data.username,
      });
      // Redirect will happen automatically after successful signup via the auth state change listener
      setLocation("/");
    } catch (err) {
      // Error handling is already done in auth context
      form.setError("root", { 
        message: err instanceof Error ? err.message : "Signup failed" 
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogleRedirect();
      // Redirect and auth handling happens automatically
    } catch (err) {
      // Error handling is already done in auth context
      form.setError("root", {
        message: err instanceof Error ? err.message : "Google sign-in failed"
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
        <CardDescription>
          Sign up to start tracking your AC unit service information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {form.formState.errors.root && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input placeholder="••••••••" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        </Form>
        
        <div className="text-center text-sm">
          <p className="text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
        
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-2 text-xs text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          type="button"
          disabled={isGoogleLoading}
          className="w-full"
          onClick={handleGoogleSignIn}
        >
          <FcGoogle className="mr-2 h-4 w-4" />
          {isGoogleLoading ? "Signing up with Google..." : "Sign up with Google"}
        </Button>
        
        <div className="text-center text-sm text-muted-foreground">
          <p>By signing up, you agree to our Terms of Service and Privacy Policy.</p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-center">
        <p className="text-sm text-gray-600 mt-2">
          Need help?{" "}
          <a href="mailto:support@cooltrack.com" className="text-primary hover:underline">
            Contact Support
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}
