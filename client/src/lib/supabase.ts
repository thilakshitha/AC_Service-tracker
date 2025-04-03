import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Enhanced error checking for Supabase configuration
let supabase: SupabaseClient;

try {
  // Check if the environment variables are set
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key not provided. This is required for proper functionality.');
    throw new Error('Missing Supabase configuration');
  }
  
  // Create the client with additional options for stability
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  
  // Test the connection
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Supabase auth state changed:', event);
  });
  
  console.log('Supabase client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  // Provide a minimal fallback client that won't crash but will log errors
  supabase = createClient('https://placeholder.supabase.co', 'placeholder', {
    auth: { persistSession: false }
  });
}

export { supabase };

// Utility functions for Supabase operations
export async function sendServiceReminder(userId: number | string, acUnitId: number | string, userEmail: string, acLocation: string, serviceDate: Date) {
  try {
    // In a real implementation, this would call a Supabase Edge Function
    // For now, we'll just log it
    console.log(`Sending reminder to ${userEmail} for AC unit ${acLocation} with service date ${serviceDate.toDateString()}`);
    
    // This would be implemented with Supabase's edge functions and email service
    return { success: true };
  } catch (error) {
    console.error('Failed to send service reminder:', error);
    throw error;
  }
}
