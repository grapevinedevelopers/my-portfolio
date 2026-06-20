// src/actions/updatePersonalDetailsAction.ts
'use server';

import type { PersonalDetails } from '@/services/personalDetailsService';
import { updatePersonalDetails } from '@/services/personalDetailsService'; // Service now handles siteId implicitly
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// --- Zod Schemas (Remain the same, validating form data) ---
const experienceSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  company: z.string().min(1, 'Company is required'),
  period: z.string(), // Keep optional validation, service/UI handles defaults
  description: z.string().min(1, 'Description is required'),
});

const educationSchema = z.object({
  id: z.string().optional(),
  institution: z.string().min(1, 'Institution is required'),
  degree: z.string().min(1, 'Degree is required'),
  field: z.string().min(1, 'Field of study is required'),
});

const personalDetailsActionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  title: z.string().min(1, 'Title is required'),
  location: z.string().min(1, 'Location is required'),
  bio: z.string().min(1, 'Bio is required'),
  email: z.string().email('Invalid email address'),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').min(1),
  githubUrl: z.string().url('Invalid GitHub URL').optional().or(z.literal('')),
  twitterUrl: z.string().url('Invalid Twitter URL').optional().or(z.literal('')),
  profileImageUrl: z.string().min(1, 'Profile Image is required'), // URL or Base64
  resumeUrl: z.string().optional().or(z.literal('')), // URL or Base64 or empty
  experience: z.array(experienceSchema),
  education: z.array(educationSchema),
});
// --- ActionResult Interface (Remains the same) ---
interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  errorCode?: string;
}

// --- updatePersonalDetailsAction (No significant changes needed here, siteId handled by service) ---
export async function updatePersonalDetailsAction(
  details: PersonalDetails // Data from the form, including potential Base64 strings
): Promise<ActionResult> {
  // Get siteId from environment - used mainly for logging context here
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'unknown-site';

  // Log received data (mask Base64)
  const logData = {
      ...details,
      profileImageUrl: details.profileImageUrl?.startsWith('data:image') ? '[Base64 Image Data]' : details.profileImageUrl,
      resumeUrl: details.resumeUrl?.startsWith('data:application/pdf') ? '[Base64 PDF Data]' : details.resumeUrl
  };
  console.log(`Server Action: Received details update for site "${siteId}":`, logData);

  // **1. Validate incoming data**
  const validation = personalDetailsActionSchema.safeParse(details);
  if (!validation.success) {
      console.error(`Server Action: Personal details validation failed for site "${siteId}":`, validation.error.flatten().fieldErrors);
      return {
          success: false,
          message: 'Invalid data provided. Please check the fields.',
          error: JSON.stringify(validation.error.flatten().fieldErrors),
          errorCode: 'validation-error'
      };
  }

  const validatedData = validation.data; // Use validated data

  // Optional: Check Base64 string length (Firestore limit)
  let totalBase64Size = 0;
  if (validatedData.profileImageUrl.startsWith('data:image')) {
      totalBase64Size += validatedData.profileImageUrl.length;
  }
  if (validatedData.resumeUrl?.startsWith('data:application/pdf')) {
      totalBase64Size += validatedData.resumeUrl.length;
  }
  if (totalBase64Size > 700 * 1024) { // Approx 700KB safe limit for JS string length
      console.warn(`Server Action (Site ${siteId}): Total Base64 data size (${totalBase64Size} chars) might exceed Firestore limits.`);
      // Allow proceeding, let Firestore handle final limit check
  }

  // **2. Authentication/Authorization - Implicitly handled by Firestore Rules**
  // The service call below will interact with Firestore, which enforces the rules.

  try {
    // **3. Call the service function**
    // The `updatePersonalDetails` service now implicitly uses the siteId from its environment.
    await updatePersonalDetails(validatedData); // Pass validated data

    // Revalidate paths - These paths might now need site-specific slugs if applicable,
    // but for general details, revalidating '/' and the admin page is usually sufficient.
    revalidatePath('/'); // Revalidate home page (assuming it displays details)
    revalidatePath('/admin/details'); // Revalidate the details form page for the current site

    console.log(`Server Action: Personal details update successful for site "${siteId}". Image: ${validatedData.profileImageUrl.startsWith('data:image') ? 'Base64' : 'URL'}, Resume: ${validatedData.resumeUrl ? (validatedData.resumeUrl.startsWith('data:application/pdf') ? 'Base64' : 'URL') : 'None'}`);
    return { success: true, message: 'Personal details updated successfully!' };

  } catch (error: any) {
    console.error(`Server Action: Error updating personal details for site "${siteId}":`, error);
    console.error('Server Action: Error Code:', error.code);

    // Provide more user-friendly and specific error messages based on the error code
    if (error.code === 'permission-denied' || error.message?.includes('Permission denied')) {
        console.error(`Firestore Rule Check Failed (Site ${siteId}): Ensure rules allow write: if request.auth != null; for /sites/${siteId}/personalDetails/main`);
        return {
            success: false,
            message: 'Authentication failed or permission denied. Ensure you are logged in and rules allow writes.',
            error: `Firestore permission denied for site "${siteId}". Check security rules and user authentication status.`,
            errorCode: error.code || 'permission-denied'
        };
    } else if (error.code === 'unauthenticated') {
         console.error(`User is not authenticated according to Firebase (Site ${siteId}).`);
         return {
             success: false,
             message: 'Authentication required. Please ensure you are logged in.',
             error: 'User not authenticated.',
             errorCode: 'unauthenticated'
        };
    } else if (error.code === 'unavailable' || error.message?.includes('Network error')) {
        console.error(`Network error connecting to Firestore (Site ${siteId}).`);
         return {
             success: false,
             message: 'Network error. Please check your connection and try again.',
             error: error.message,
             errorCode: error.code || 'unavailable'
        };
     } else if (error.code === 'data-too-large') { // Specific code from service
        console.error(`Firestore document size limit likely exceeded for site "${siteId}".`);
        return {
            success: false,
            message: 'Failed to save details. The data (likely profile image or resume PDF) exceeds the database size limit (approx 1MB). Please optimize files or use external URLs.',
            error: error.message,
            errorCode: 'data-too-large'
        };
     } else if (error.code === 'site-id-missing') { // Specific code from service
          console.error(`Server Action: Site ID missing in environment for updatePersonalDetailsAction.`);
           return {
               success: false,
               message: 'Internal server configuration error. Site ID is missing.',
               error: 'NEXT_PUBLIC_SITE_ID environment variable not set on the server.',
               errorCode: 'site-id-missing'
           };
     }
     // Generic fallback error
     console.error(`An unexpected error occurred during the update action for site "${siteId}".`);
     return {
        success: false,
        message: 'An unexpected error occurred while saving. Please try again later.',
        error: error.message || 'An unknown error occurred.',
        errorCode: error.code || 'unknown'
     };
  }
}
