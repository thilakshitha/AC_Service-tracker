import { useEffect } from "react";
import { useLocation } from "wouter";
import { SignupForm } from "@/components/auth/auth-form";
import { useAuth } from "@/lib/auth";

export default function Signup() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            <span className="text-primary">Cool</span>
            <span className="text-gray-900">Track</span>
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Create an account to track your AC service dates
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
