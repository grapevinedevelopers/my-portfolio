// src/services/personalDetailsService.ts
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { z } from 'zod';

// Define the structure of your personal details data
export interface Experience {
    id?: string; // Optional client-side ID
    title: string;
    company: string;
    period: string; // e.g., "2021 - Present", "2019 - 2021"
    description: string;
}

export interface Education {
    id?: string; // Optional client-side ID
    institution: string;
    degree: string;
    field: string;
}

// Updated interface - profileImageUrl and resumeUrl can be URL or Base64
export interface PersonalDetails {
  name: string;
  title: string;
  location: string;
  bio: string;
  email: string;
  linkedinUrl: string;
  githubUrl?: string;
  twitterUrl?: string;
  profileImageUrl: string; // Can be URL or Base64 Data URI
  resumeUrl?: string; // Can be URL or Base64 PDF Data URI
  experience: Experience[];
  education: Education[];
  updatedAt?: Timestamp | string; // Allow Timestamp from DB or string after serialization
}

// Zod schema for strict validation before saving to Firestore
const experienceDbSchema = z.object({
    title: z.string().min(1),
    company: z.string().min(1),
    period: z.string(), // Period is optional for validation, handle defaults if needed
    description: z.string().min(1),
});

const educationDbSchema = z.object({
    institution: z.string().min(1),
    degree: z.string().min(1),
    field: z.string().min(1),
});

// Updated schema for Firestore data structure - resumeUrl is string (URL or Base64)
const personalDetailsDbSchema = z.object({
    name: z.string().min(1),
    title: z.string().min(1),
    location: z.string().min(1),
    bio: z.string().min(1),
    email: z.string().email(),
    linkedinUrl: z.string().url(),
    githubUrl: z.string().url().optional().or(z.literal('')),
    twitterUrl: z.string().url().optional().or(z.literal('')),
    profileImageUrl: z.string().min(1), // URL or Base64 string
    resumeUrl: z.string().optional().or(z.literal('')), // URL or Base64 string or empty
    experience: z.array(experienceDbSchema),
    education: z.array(educationDbSchema),
    updatedAt: z.any(), // Allow serverTimestamp() placeholder
}).passthrough(); // Allow potential extra fields, though strict is better


// Default placeholder data function - Aligned with Firestore structure
const getDefaultPersonalDetails = (siteId: string): PersonalDetails => ({
  name: `Your Name (${siteId})`, // Indicate default based on site
  title: 'Your Professional Title',
  location: 'Your City, Country',
  bio: `Welcome to the portfolio for ${siteId}. Update this bio in the admin panel.`,
  email: 'your.email@example.com',
  linkedinUrl: '#',
  githubUrl: '#',
  twitterUrl: '#',
  profileImageUrl: '/default-profile.png', // Generic default image
  resumeUrl: undefined,
  experience: [],
  education: [],
  updatedAt: undefined,
});


/**
 * Fetches personal details for a specific site from Firestore.
 * Handles offline errors or missing document by returning default data.
 * @returns {Promise<PersonalDetails>} A promise that resolves with the personal details for the site identified by NEXT_PUBLIC_SITE_ID.
 */
export async function getPersonalDetails(): Promise<PersonalDetails> {
    const siteId = process.env.NEXT_PUBLIC_SITE_ID;

    if (!siteId) {
        console.error("NEXT_PUBLIC_SITE_ID environment variable is not set. Cannot fetch personal details.");
        // Consider throwing an error or returning a specific 'unconfigured' state
        return getDefaultPersonalDetails('unconfigured-site'); // Return defaults for an unconfigured state
    }

  const defaultDetails = getDefaultPersonalDetails(siteId);
  if (!db) {
    console.warn(`Firestore is not initialized for site ${siteId}. Serving default personal details.`);
    return defaultDetails;
  }

  try {
    // Construct the document path using the siteId
    const docRef = doc(db, 'sites', siteId, 'personalDetails', 'main');
    console.log(`Attempting to fetch personal details for site "${siteId}" from Firestore (Document Path: ${docRef.path})...`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log(`Personal details document found for site "${siteId}". Mapping data...`);
      const data = docSnap.data();

      // --- Safe mapping logic (same as before, but applied to site-specific data) ---
       const safeString = (value: any, defaultValue: string): string => (typeof value === 'string' && value) ? value : defaultValue;
       const safeArray = (value: any): any[] => Array.isArray(value) ? value : [];

       const experience = safeArray(data.experience).map((exp: any, index: number): Experience => ({
        id: `exp-${index}-${Date.now()}`, // Client-side ID
        title: safeString(exp.title, 'N/A'),
        company: safeString(exp.company, 'N/A'),
        period: safeString(exp.period, ''), // Make period optional or provide default
        description: safeString(exp.description, 'N/A'),
       }));

       const education = safeArray(data.education).map((edu: any, index: number): Education => ({
        id: `edu-${index}-${Date.now()}`, // Client-side ID
        institution: safeString(edu.institution, 'N/A'),
        degree: safeString(edu.degree, 'N/A'),
        field: safeString(edu.field, 'N/A'),
       }));

       let profileImageUrl = defaultDetails.profileImageUrl;
        if (typeof data.profileImageUrl === 'string' && data.profileImageUrl.length > 0) {
         if (data.profileImageUrl.startsWith('http') || data.profileImageUrl.startsWith('data:image')) {
             profileImageUrl = data.profileImageUrl;
         } else {
             console.warn(`Document 'main' for site "${siteId}" has invalid profileImageUrl. Using default: ${profileImageUrl}`);
         }
        } else {
           console.warn(`Document 'main' for site "${siteId}" is missing profileImageUrl. Using default: ${profileImageUrl}`);
        }

       let resumeUrl = defaultDetails.resumeUrl;
       if (typeof data.resumeUrl === 'string' && data.resumeUrl.length > 0) {
         if (data.resumeUrl.startsWith('http') || data.resumeUrl.startsWith('data:application/pdf;base64,')) {
           resumeUrl = data.resumeUrl;
         } else {
           console.warn(`Document 'main' for site "${siteId}" has an invalid resumeUrl. Using default.`);
         }
       }


      const fetchedDetails: PersonalDetails = {
        name: safeString(data.name, defaultDetails.name),
        title: safeString(data.title, defaultDetails.title),
        location: safeString(data.location, defaultDetails.location),
        bio: safeString(data.bio, defaultDetails.bio),
        email: safeString(data.email, defaultDetails.email),
        linkedinUrl: safeString(data.linkedinUrl, defaultDetails.linkedinUrl),
        githubUrl: safeString(data.githubUrl, defaultDetails.githubUrl || '#'),
        twitterUrl: safeString(data.twitterUrl, defaultDetails.twitterUrl || '#'),
        profileImageUrl: profileImageUrl,
        resumeUrl: resumeUrl,
        // Use fetched arrays if they exist and are valid, otherwise use defaults
        experience: experience.length > 0 ? experience : defaultDetails.experience,
        education: education.length > 0 ? education : defaultDetails.education,
        // Convert timestamp if it exists
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
      };

      const logDetails = {
          ...fetchedDetails,
          profileImageUrl: profileImageUrl?.startsWith('data:image') ? '[Base64 Image Data]' : profileImageUrl,
          resumeUrl: resumeUrl?.startsWith('data:application/pdf') ? '[Base64 PDF Data]' : resumeUrl
       }
      console.log(`Successfully fetched and mapped personal details for site "${siteId}":`, logDetails);
      return fetchedDetails;

    } else {
      console.warn(`Personal details document 'main' not found for site "${siteId}" in Firestore. Serving default data.`);
      return defaultDetails;
    }
  } catch (error: any) {
    console.error(`Error fetching personal details for site "${siteId}" from Firestore:`, error.message || error);
    if (error.code === 'unavailable' || (error.message && error.message.includes('offline'))) {
        console.warn(`Firestore client is offline for site ${siteId}. Serving default personal details data.`);
    } else {
        console.warn(`Serving default personal details data for site "${siteId}" due to an unexpected error:`, error.code);
    }
    return defaultDetails;
  }
}


/**
 * Updates or creates the 'main' document within the specific site's personalDetails subcollection.
 * Stores profile image and resume as Base64 strings or URLs.
 * Relies on Firestore rules for authentication.
 * Removes temporary client-side IDs before saving.
 * @param details - The complete PersonalDetails object to save (validated in action).
 * @returns {Promise<void>}
 * @throws {Error} If Firestore is not initialized, siteId is missing, or the operation fails.
 */
export async function updatePersonalDetails(details: PersonalDetails): Promise<void> {
    const siteId = process.env.NEXT_PUBLIC_SITE_ID;

    if (!siteId) {
        console.error("NEXT_PUBLIC_SITE_ID environment variable is not set. Cannot update personal details.");
        const error = new Error("Site configuration error.");
        (error as any).code = 'site-id-missing';
        throw error;
    }

    if (!db) {
        console.error(`Firestore (db) is not initialized for site ${siteId}. Cannot update.`);
        const error = new Error("Firestore connection error.");
        (error as any).code = 'firestore-not-initialized';
        throw error;
    }

    // Remove temporary client-side IDs before saving
    const cleanedDetails = {
        ...details,
        experience: details.experience.map(({ id, ...rest }) => rest),
        education: details.education.map(({ id, ...rest }) => rest),
        updatedAt: serverTimestamp(),
    };

     // Validate the final data structure against the DB schema
     const validation = personalDetailsDbSchema.safeParse(cleanedDetails);

     if (!validation.success) {
       console.error(`Firestore Save Validation Failed (Personal Details - Site ${siteId}):`, validation.error.flatten().fieldErrors);
       throw new Error(`Personal details data for site "${siteId}" failed validation before saving: ${JSON.stringify(validation.error.flatten().fieldErrors)}`);
     }

    const dataToSave = validation.data; // Use validated data

    // Construct the document path using siteId
    const docRef = doc(db, 'sites', siteId, 'personalDetails', 'main');
     const logData = {
         ...dataToSave,
         profileImageUrl: dataToSave.profileImageUrl?.startsWith('data:image') ? '[Base64 Image Data]' : dataToSave.profileImageUrl,
         resumeUrl: dataToSave.resumeUrl?.startsWith('data:application/pdf') ? '[Base64 PDF Data]' : dataToSave.resumeUrl
     };
    console.log(`Attempting to update personal details in Firestore for site "${siteId}" (Document Path: ${docRef.path}) with data:`, logData);

    try {
        // Use setDoc with merge: true to update or create.
        await setDoc(docRef, dataToSave, { merge: true });
        console.log(`Firestore: Personal details updated successfully for site "${siteId}" document 'main'.`);
    } catch (error: any) {
        console.error(`Firestore Error: Failed to update personal details for site "${siteId}".`);
        console.error("Firestore Error Code:", error.code);
        console.error("Firestore Error Message:", error.message);
        // Re-throw specific errors for the action to handle
        if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
             // If permission denied, log a specific message about rules
             if (error.code === 'permission-denied') {
                 console.error(`Firestore Rule Check Failed for site "${siteId}": Ensure rules allow write: if request.auth != null; for the path '/sites/${siteId}/personalDetails/main'.`);
             }
            throw error; // Let the action handle these specific auth/permission errors
        } else if (error.message?.includes('exceeds the maximum') || error.code === 'resource-exhausted') {
             (error as any).code = 'data-too-large';
             throw error;
        } else {
            // Throw a more generic error for other Firestore issues
            const genericError = new Error(`Failed to update personal details for site "${siteId}" due to Firestore error: ${error.message || 'Unknown Firestore error'}`);
             (genericError as any).code = error.code || 'firestore-unknown-error';
            throw genericError;
        }
    }
}
