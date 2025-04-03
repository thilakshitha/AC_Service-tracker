import emailjs from '@emailjs/browser';

// Initialize EmailJS with user ID
export const initEmailJS = () => {
  emailjs.init('9NvuHL4FBYA3FGrd-');
};

/**
 * Sends a service reminder email to a user
 * @param params Email template parameters
 * @returns Promise that resolves when email is sent
 */
export const sendServiceReminderEmail = async (params: {
  user_email: string; // recipient's email
  user_name: string; // recipient's name
  ac_location: string; // AC unit location
  service_date: string; // Next service date in human-readable format
  days_until_service: string; // Days until next service
  [key: string]: unknown; // Index signature to satisfy EmailJS
}) => {
  try {
    // Validate email address
    if (!params.user_email || !params.user_email.includes('@')) {
      console.error('Invalid email address provided:', params.user_email);
      return { success: false, message: 'Invalid email address' };
    }
    
    // Ensure required fields are present
    const emailParams = {
      user_email: params.user_email,
      user_name: params.user_name || params.user_email.split('@')[0] || 'User',
      ac_location: params.ac_location || 'your air conditioner',
      service_date: params.service_date || 'soon',
      days_until_service: params.days_until_service || 'a few'
    };
    
    console.log('Sending reminder email to', emailParams.user_email, 'for AC unit', emailParams.ac_location);
    
    const response = await emailjs.send(
      'service_3dt8ceh',  // Replace with actual EmailJS Service ID
      'template_hqcbwsb', // Replace with actual EmailJS Template ID
      emailParams
    );
    
    console.log('Email sent successfully!', response.status, response.text);
    return { success: true, message: 'Email sent successfully!' };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, message: 'Failed to send email. Please try again later.' };
  }
};

/**
 * Formats a date for display in emails
 * @param date Date to format
 * @returns Formatted date string (e.g., "Monday, April 1, 2025")
 */
export const formatDateForEmail = (date: Date): string => {
  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid date provided to formatDateForEmail, using current date instead');
    date = new Date(); // Fallback to current date
  }
  
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Calculates days between two dates
 * @param futureDate Future date
 * @param fromDate Base date (defaults to today)
 * @returns Number of days between dates
 */
export const calculateDaysUntil = (futureDate: Date, fromDate: Date = new Date()): number => {
  // Check if future date is valid
  if (isNaN(futureDate.getTime())) {
    console.warn('Invalid futureDate provided to calculateDaysUntil, using current date + 7 days');
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    futureDate = nextWeek;
  }
  
  // Check if from date is valid
  if (isNaN(fromDate.getTime())) {
    console.warn('Invalid fromDate provided to calculateDaysUntil, using current date');
    fromDate = new Date();
  }
  
  const diffTime = futureDate.getTime() - fromDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0; // Ensure we don't return negative days
};