import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut, 
  User,
  updateProfile,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp, 
  Timestamp,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { sendServiceReminderEmail, formatDateForEmail, calculateDaysUntil } from './emailService';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDPdjDE7dKhq0WWOdqWwl43Dmk4EMeLin8",
  authDomain: "ac-reminder.firebaseapp.com",
  projectId: "ac-reminder",
  storageBucket: "ac-reminder.firebasestorage.app",
  messagingSenderId: "903987713635",
  appId: "1:903987713635:web:badcdd4716532721f78a56",
  measurementId: "G-MSZ190HC2K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Auth functions
export const signUpWithEmail = async (email: string, password: string, displayName: string) => {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Set the display name
    await updateProfile(user, { displayName });
    
    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email,
      displayName,
      createdAt: serverTimestamp(),
    });
    
    return user;
  } catch (error) {
    console.error("Error signing up with email:", error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error("Error signing in with email:", error);
    throw error;
  }
};

export const loginWithGoogle = async () => {
  try {
    // Configure Google provider
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    // Trigger Google sign-in popup
    await signInWithRedirect(auth, googleProvider);
    return true;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const handleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    
    // The signed-in user info.
    const user = result.user;
    
    // Check if user document exists in Firestore
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      // Create a new user document if it doesn't exist
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        createdAt: serverTimestamp(),
        provider: 'google'
      });
    }
    
    return user;
  } catch (error) {
    console.error("Error handling redirect result:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

// Firestore functions for AC Units
export const createAcUnit = async (userId: string, acUnitData: {
  location: string;
  lastServiceDate?: Date | null;
  nextServiceDate: Date;
  notes?: string;
}) => {
  try {
    const acUnitsCollection = collection(db, "users", userId, "acUnits");
    const docRef = doc(acUnitsCollection);
    
    await setDoc(docRef, {
      id: docRef.id,
      userId,
      location: acUnitData.location,
      lastServiceDate: acUnitData.lastServiceDate ? Timestamp.fromDate(acUnitData.lastServiceDate) : null,
      nextServiceDate: Timestamp.fromDate(acUnitData.nextServiceDate),
      notes: acUnitData.notes || "",
      createdAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error("Error creating AC unit:", error);
    throw error;
  }
};

export const updateAcUnit = async (userId: string, acUnitId: string, acUnitData: {
  location?: string;
  lastServiceDate?: Date | null;
  nextServiceDate?: Date;
  notes?: string;
}) => {
  try {
    const acUnitRef = doc(db, "users", userId, "acUnits", acUnitId);
    
    const updateData: any = {
      updatedAt: serverTimestamp()
    };
    
    if (acUnitData.location !== undefined) updateData.location = acUnitData.location;
    if (acUnitData.notes !== undefined) updateData.notes = acUnitData.notes;
    if (acUnitData.lastServiceDate !== undefined) {
      updateData.lastServiceDate = acUnitData.lastServiceDate 
        ? Timestamp.fromDate(acUnitData.lastServiceDate) 
        : null;
    }
    if (acUnitData.nextServiceDate !== undefined) {
      updateData.nextServiceDate = Timestamp.fromDate(acUnitData.nextServiceDate);
    }
    
    await updateDoc(acUnitRef, updateData);
    
    return acUnitId;
  } catch (error) {
    console.error("Error updating AC unit:", error);
    throw error;
  }
};

export const getAcUnits = async (userId: string) => {
  try {
    const acUnitsCollection = collection(db, "users", userId, "acUnits");
    const querySnapshot = await getDocs(acUnitsCollection);
    
    const acUnits = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        location: data.location,
        lastServiceDate: data.lastServiceDate ? data.lastServiceDate.toDate().toISOString() : null,
        nextServiceDate: data.nextServiceDate.toDate().toISOString(),
        notes: data.notes,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString()
      };
    });
    
    return acUnits;
  } catch (error) {
    console.error("Error getting AC units:", error);
    throw error;
  }
};

// Helper functions
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  return auth.onAuthStateChanged(callback);
};

// Create notification preferences in Firestore
export const createOrUpdateNotificationPreferences = async (userId: string, preferences: {
  emailEnabled: boolean;
  smsEnabled: boolean;
  daysBeforeService: number;
}) => {
  try {
    const prefRef = doc(db, "users", userId, "settings", "notifications");
    await setDoc(prefRef, {
      ...preferences,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return prefRef.id;
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    throw error;
  }
};

// Get notification preferences from Firestore
export const getNotificationPreferences = async (userId: string) => {
  try {
    const prefRef = doc(db, "users", userId, "settings", "notifications");
    const docSnap = await getDoc(prefRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // Default preferences
      return {
        emailEnabled: true,
        smsEnabled: false,
        daysBeforeService: 7
      };
    }
  } catch (error) {
    console.error("Error getting notification preferences:", error);
    throw error;
  }
};

// Get dashboard stats from Firebase
export const getDashboardStats = async (userId: string) => {
  try {
    const acUnits = await getAcUnits(userId);
    const today = new Date();
    
    // Calculate stats
    const totalUnits = acUnits.length;
    let upcomingServices = 0;
    let overdueServices = 0;
    let servicesCompleted = 0;
    
    acUnits.forEach(unit => {
      const nextServiceDate = new Date(unit.nextServiceDate);
      
      // Check if service is upcoming (within next 30 days)
      const daysTillService = Math.floor((nextServiceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysTillService < 0) {
        // Overdue
        overdueServices++;
      } else if (daysTillService <= 30) {
        // Upcoming (within 30 days)
        upcomingServices++;
      }
      
      // Count services completed (units with lastServiceDate)
      if (unit.lastServiceDate) {
        servicesCompleted++;
      }
    });
    
    return {
      totalUnits,
      upcomingServices,
      overdueServices,
      servicesCompleted
    };
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    throw error;
  }
};

// Send service reminder using EmailJS
export const sendServiceReminder = async (
  userId: string | number, 
  acUnitId: string | number, 
  userEmail: string, 
  userName: string,
  acLocation: string, 
  serviceDate: Date
) => {
  try {
    console.log(`Preparing to send reminder email for AC unit ${acLocation}`);
    
    // Create a record of this reminder in Firestore
    const remindersCollection = collection(db, "users", String(userId), "reminders");
    const docRef = doc(remindersCollection);
    
    // Get valid dates and name
    const validDate = isNaN(serviceDate.getTime()) ? new Date() : serviceDate;
    const formattedDate = formatDateForEmail(validDate);
    const daysUntil = calculateDaysUntil(validDate);
    const validName = userName?.trim() ? userName : userEmail.split('@')[0];
    
    console.log(`Sending reminder email to ${userEmail} (${validName}) for AC unit ${acLocation} due ${formattedDate}`);
    
    // Send the email
    const emailResult = await sendServiceReminderEmail({
      user_email: userEmail,
      user_name: validName,
      ac_location: acLocation,
      service_date: formattedDate,
      days_until_service: daysUntil.toString()
    });
    
    // Store record in Firestore
    await setDoc(docRef, {
      id: docRef.id,
      userId: String(userId),
      acUnitId: String(acUnitId),
      acLocation: acLocation,
      serviceDate: Timestamp.fromDate(validDate),
      sentTo: userEmail,
      sentAt: serverTimestamp(),
      status: emailResult.success ? "sent" : "failed",
      errorMessage: emailResult.success ? "" : emailResult.message
    });
    
    return { 
      success: emailResult.success,
      id: docRef.id,
      message: emailResult.message
    };
  } catch (error) {
    console.error("Error sending service reminder:", error);
    throw error;
  }
};

export { auth, db };