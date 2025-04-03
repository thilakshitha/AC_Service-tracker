import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  auth, 
  loginWithEmail, 
  signUpWithEmail, 
  logoutUser, 
  onAuthStateChanged,
  db,
  getAcUnits,
  getNotificationPreferences,
  loginWithGoogle,
  handleRedirectResult
} from "./firebase";
import { User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  phone?: string;
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogleRedirect: () => Promise<void>;
  signup: (userData: { username: string; password: string; email: string; fullName?: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to convert Firebase user to our app User format
const convertFirebaseUser = (firebaseUser: FirebaseUser): User => {
  return {
    id: firebaseUser.uid,
    username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    email: firebaseUser.email || '',
    fullName: firebaseUser.displayName || '',
    createdAt: new Date(Number(firebaseUser.metadata.creationTime) || Date.now())
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Check for redirect result on page load
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const user = await handleRedirectResult();
        if (user) {
          toast({
            title: "Google sign-in successful",
            description: `Welcome, ${user.displayName || 'User'}!`,
          });
        }
      } catch (error) {
        console.error("Error handling Google redirect:", error);
        toast({
          title: "Google sign-in failed",
          description: error instanceof Error ? error.message : "Could not sign in with Google",
          variant: "destructive",
        });
      }
    };
    
    checkRedirectResult();
  }, [toast]);

  // Check for Firebase authentication
  useEffect(() => {
    // Get user data from Firestore
    async function getUserFromFirestore(firebaseUser: FirebaseUser) {
      try {
        // Check if user exists in Firestore
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          return {
            id: firebaseUser.uid,
            username: userData.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: userData.email || firebaseUser.email || '',
            fullName: userData.displayName || firebaseUser.displayName || '',
            phone: userData.phone || '',
            createdAt: userData.createdAt ? new Date(userData.createdAt.toDate()) : new Date()
          };
        } else {
          // User document doesn't exist in Firestore yet
          return convertFirebaseUser(firebaseUser);
        }
      } catch (error) {
        console.error("Error getting user from Firestore:", error);
        // Fall back to auth user
        return convertFirebaseUser(firebaseUser);
      }
    }
    
    // Set up Firebase auth state listener
    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      setIsLoading(true);
      
      if (firebaseUser) {
        // We have a Firebase user
        try {
          // Get user data from Firestore
          const userData = await getUserFromFirestore(firebaseUser);
          setUser(userData);
        } catch (error) {
          console.error("Failed to process authenticated user:", error);
          setUser(null);
        }
      } else {
        // No user logged in
        setUser(null);
      }
      
      setIsLoading(false);
    });
    
    // Cleanup subscription
    return () => unsubscribe();
  }, [toast]);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Login with Firebase
      await loginWithEmail(email, password);
      
      // Auth state listener will handle setting the user
      toast({
        title: "Logged in successfully",
        description: "Welcome back!",
      });
    } catch (error) {
      console.error("Login failed:", error);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid email or password",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const loginWithGoogleRedirect = async () => {
    try {
      setIsLoading(true);
      
      // Trigger Google sign-in redirect
      await loginWithGoogle();
      
      // The actual sign-in happens after redirect
      // The handleRedirectResult effect will process the result
    } catch (error) {
      console.error("Google sign-in redirect failed:", error);
      toast({
        title: "Sign-in failed",
        description: error instanceof Error ? error.message : "Could not initiate Google sign-in",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: { username: string; password: string; email: string; fullName?: string; phone?: string }) => {
    try {
      setIsLoading(true);
      
      // Sign up with Firebase
      const displayName = userData.fullName || userData.username;
      await signUpWithEmail(userData.email, userData.password, displayName);
      
      // Auth state listener will handle setting the user
      toast({
        title: "Account created successfully",
        description: `Welcome, ${displayName}!`,
      });
    } catch (error) {
      console.error("Signup failed:", error);
      toast({
        title: "Signup failed",
        description: error instanceof Error ? error.message : "Could not create account",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Logout from Firebase
      await logoutUser();
      
      toast({
        title: "Logged out successfully",
      });
      
      // Auth state listener will set user to null
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        title: "Logout failed",
        description: "An error occurred during logout",
        variant: "destructive",
      });
    }
  };

  const updateProfile = async (userData: Partial<User>) => {
    try {
      if (user) {
        // This would be implemented with Firebase user profile update
        // For simplicity, we're just updating the local state
        setUser({
          ...user,
          ...userData
        });
        
        toast({
          title: "Profile updated successfully",
        });
      } else {
        throw new Error("No user logged in");
      }
    } catch (error) {
      console.error("Profile update failed:", error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Could not update profile",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        loginWithGoogleRedirect,
        signup,
        logout,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}