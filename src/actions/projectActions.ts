// src/actions/projectActions.ts
'use server';

import type { Project } from '@/services/projectService';
import { createProject, updateProject, deleteProject } from '@/services/projectService'; // Services are now site-aware
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Define Zod schema for Project validation (matching form input)
const projectActionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with dashes'),
  description: z.string().min(1, 'Short description is required').max(150, 'Short description must be 150 chars or less'),
  details: z.string().optional(), // HTML from Rich Text Editor
  privacyPolicy: z.string().optional(), // HTML from Rich Text Editor for privacy policy
  imageUrl: z.string().min(1, 'Image URL or Base64 is required'), // URL or Base64 Data URI
  link: z.string().min(1, 'Project link is required (use # if none)'),
  tags: z.array(z.string()).min(1, 'At least one tag is required'),
  dataAiHint: z.string().optional(),
  order: z.number().int().min(0).default(999),
});
// Type for data expected by createProject service (matches schema minus server fields)
type ProjectCreateServiceData = z.infer<typeof projectActionSchema>;

// Define the shape of the action result
interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  errorCode?: string;
  projectId?: string; // Include created project ID on success
}

// --- Create Project Action ---
export async function createProjectAction(
  // Expect data that might have Base64 image in imageUrl
  projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> // Use the Project interface shape from service
): Promise<ActionResult> {
   const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'unknown-site';
   console.log(`Server Action (Site ${siteId}): Received data for new project:`, { ...projectData, imageUrl: projectData.imageUrl?.startsWith('data:image') ? '[Base64 Data]' : projectData.imageUrl });

  // **1. Authentication/Authorization (RELY ON FIRESTORE RULES)**

  // 2. Validate incoming data
  const validation = projectActionSchema.safeParse(projectData);
  if (!validation.success) {
      console.error(`Server Action (Site ${siteId}): Project data validation failed (Create):`, validation.error.flatten().fieldErrors);
      return {
          success: false,
          message: 'Invalid data provided. Please check the fields.',
          error: JSON.stringify(validation.error.flatten().fieldErrors),
          errorCode: 'validation-error'
      };
  }

   // Check Base64 string length
    if (validation.data.imageUrl.startsWith('data:image') && validation.data.imageUrl.length > 1048576 * 0.95) { // ~996KB
        console.warn(`Server Action (Site ${siteId}): Base64 image string is potentially too large for Firestore document limit.`);
        // Allow proceeding, Firestore write might fail.
    }

  // 3. Call the service function (which now saves to the site-specific subcollection)
  try {
    // Pass validated data - service handles siteId implicitly
    const newProjectId = await createProject(validation.data as ProjectCreateServiceData);

    // Revalidate paths - Adjust if paths become site-specific
    revalidatePath('/'); // Revalidate home page
    revalidatePath('/#projects');
    revalidatePath('/admin/projects'); // Admin path implicitly for current site
    revalidatePath('/projects');
    revalidatePath(`/projects/${validation.data.slug}`);
    revalidatePath(`/projects/${validation.data.slug}/privacy`);

    console.log(`Server Action (Site ${siteId}): Project creation submitted with ID: ${newProjectId}. Image stored as ${validation.data.imageUrl.startsWith('data:image') ? 'Base64' : 'URL'}. Final result depends on rules.`);
    return { success: true, message: 'Project created successfully!', projectId: newProjectId };

  } catch (error: any) {
    console.error(`Server Action (Site ${siteId}): Error creating project:`, error);
    console.error('Server Action: Error Code:', error.code);

    // **Consistent Error Handling Pattern**
     if (error.code === 'permission-denied' || error.message?.includes('Permission denied')) {
        console.error(`Firestore Rule Check Failed (Create Project - Site ${siteId}): Ensure rules allow write.`);
       return {
           success: false,
           message: 'Permission denied. Ensure you are logged in and Firestore rules allow creation.',
           error: `Permission denied for site "${siteId}". Check security rules for /sites/${siteId}/projects collection.`,
           errorCode: error.code || 'permission-denied'
       };
    } else if (error.code === 'unauthenticated') {
         console.error(`User is not authenticated according to Firebase (Create Project - Site ${siteId}).`);
        return {
            success: false,
            message: 'Authentication check failed at database level. Please log in.',
            error: error.message,
            errorCode: 'unauthenticated'
        };
     } else if (error.code === 'unavailable' || error.message?.includes('Network error')) {
         console.error(`Network error connecting to Firestore (Create Project - Site ${siteId}).`);
         return {
             success: false,
             message: 'Network error. Please check your connection and try again.',
             error: error.message,
             errorCode: error.code || 'unavailable'
        };
    } else if (error.code === 'data-too-large') {
        return {
            success: false,
            message: 'Failed to save project. The data (likely the image) exceeds the database size limit.',
            error: error.message,
            errorCode: 'data-too-large'
        };
     } else if (error.message?.includes("Site configuration error")) {
         return { success: false, message: "Internal configuration error.", error: error.message, errorCode: 'config-error' };
    }
    // Generic fallback error
    console.error(`An unexpected error occurred during the create project action for site "${siteId}".`);
    return {
      success: false,
      message: 'An unexpected error occurred while creating the project.',
      error: error.message || 'An unknown error occurred.',
      errorCode: error.code || 'unknown-service-error'
    };
  }
}

// --- Update Project Action ---
export async function updateProjectAction(
  projectId: string,
  projectData: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>> // Use service Project type shape
): Promise<ActionResult> {
   const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'unknown-site';
   console.log(`Server Action (Site ${siteId}): Received data for updating project ID: ${projectId}`, { ...projectData, imageUrl: projectData.imageUrl?.startsWith('data:image') ? '[Base64 Data]' : projectData.imageUrl });

   // **1. Authentication/Authorization (RELY ON FIRESTORE RULES)**

   // 2. Validate incoming data (use partial schema)
   const validation = projectActionSchema.partial().safeParse(projectData);
   if (!validation.success) {
      console.error(`Server Action (Site ${siteId}): Project update data validation failed:`, validation.error.flatten().fieldErrors);
      return {
          success: false,
          message: 'Invalid data provided for update. Please check the fields.',
          error: JSON.stringify(validation.error.flatten().fieldErrors),
          errorCode: 'validation-error'
      };
  }

   // Optional: Check Base64 string length if imageUrl is being updated
    if (validation.data.imageUrl?.startsWith('data:image') && validation.data.imageUrl.length > 1048576 * 0.95) { // ~996KB
        console.warn(`Server Action (Site ${siteId}): Base64 image string is potentially too large for Firestore document limit during update for project ${projectId}.`);
    }

  // 3. Call the service function (saves Base64 directly if provided, uses siteId implicitly)
  try {
    // Pass validated (potentially partial) data - service handles siteId
    await updateProject(projectId, validation.data);

    // Revalidate relevant paths (adjust if site-specific)
    revalidatePath('/'); // Revalidate home page
    revalidatePath('/#projects');
    revalidatePath('/admin/projects'); // Admin path implicitly for current site
    revalidatePath(`/admin/projects/${projectId}/edit`);
    revalidatePath('/projects');
    if (validation.data.slug) {
        revalidatePath(`/projects/${validation.data.slug}`);
        revalidatePath(`/projects/${validation.data.slug}/privacy`);
    }

    console.log(`Server Action (Site ${siteId}): Project ${projectId} update submitted. Image stored as ${validation.data.imageUrl?.startsWith('data:image') ? 'Base64' : 'URL or unchanged'}. Slug: ${validation.data.slug ?? 'unchanged'}`);
    return { success: true, message: 'Project updated successfully!' };

  } catch (error: any) {
    console.error(`Server Action (Site ${siteId}): Error updating project ${projectId}:`, error);
    console.error('Server Action: Error Code:', error.code);

     // **Consistent Error Handling Pattern**
     if (error.code === 'permission-denied' || error.message?.includes('Permission denied')) {
         console.error(`Firestore Rule Check Failed (Update Project - Site ${siteId}): Ensure rules allow update.`);
       return {
           success: false,
           message: 'Permission denied. Ensure you are logged in and authorized.',
           error: `Permission denied for site "${siteId}". Check security rules for /sites/${siteId}/projects collection.`,
           errorCode: error.code || 'permission-denied'
       };
    } else if (error.code === 'unauthenticated') {
         console.error(`User is not authenticated according to Firebase (Update Project - Site ${siteId}).`);
        return {
            success: false,
            message: 'Authentication check failed at database level. Please log in.',
            error: error.message,
            errorCode: 'unauthenticated'
        };
     } else if (error.code === 'unavailable' || error.message?.includes('Network error')) {
         console.error(`Network error connecting to Firestore (Update Project - Site ${siteId}).`);
         return {
             success: false,
             message: 'Network error. Please check your connection and try again.',
             error: error.message,
             errorCode: error.code || 'unavailable'
        };
    } else if (error.code === 'data-too-large') {
        return {
            success: false,
            message: 'Failed to save project update. The data (likely the image) exceeds the database size limit.',
            error: error.message,
            errorCode: 'data-too-large'
        };
      } else if (error.message?.includes("Site configuration error")) {
         return { success: false, message: "Internal configuration error.", error: error.message, errorCode: 'config-error' };
     }
    // Generic fallback error
    console.error(`An unexpected error occurred during the update project action for site "${siteId}".`);
    return {
      success: false,
      message: 'An unexpected error occurred while updating the project.',
      error: error.message || 'An unknown error occurred.',
      errorCode: error.code || 'unknown-service-error'
    };
  }
}


// --- Delete Project Action ---
export async function deleteProjectAction(projectId: string): Promise<ActionResult> {
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'unknown-site';
  console.log(`Server Action (Site ${siteId}): Attempting to delete project ID: ${projectId}`);

  // **1. Authentication/Authorization (RELY ON FIRESTORE RULES)**

  if (!projectId) {
      return { success: false, message: 'Project ID is required for deletion.', errorCode: 'missing-id' };
  }

  // 2. Call the service function (service handles siteId)
  try {
    await deleteProject(projectId);

    // Revalidate relevant paths
    revalidatePath('/'); // Revalidate home page
    revalidatePath('/#projects');
    revalidatePath('/admin/projects'); // Implicitly for current site
    revalidatePath('/projects');


    console.log(`Server Action (Site ${siteId}): Project ${projectId} delete submitted.`);
    return { success: true, message: 'Project deleted successfully!' };

  } catch (error: any) {
    console.error(`Server Action (Site ${siteId}): Error deleting project ${projectId}:`, error);
     console.error('Server Action: Error Code:', error.code);

     // **Consistent Error Handling Pattern**
     if (error.code === 'permission-denied' || error.message?.includes('Permission denied')) {
         console.error(`Firestore Rule Check Failed (Delete Project - Site ${siteId}): Ensure rules allow delete.`);
       return {
           success: false,
           message: 'Permission denied. Ensure you are logged in and authorized.',
           error: `Permission denied for site "${siteId}". Check security rules.`,
           errorCode: error.code || 'permission-denied'
       };
    } else if (error.code === 'unauthenticated') {
         console.error(`User is not authenticated according to Firebase (Delete Project - Site ${siteId}).`);
        return {
            success: false,
            message: 'Authentication check failed at database level. Please log in.',
            error: error.message,
            errorCode: 'unauthenticated'
        };
     } else if (error.code === 'unavailable' || error.message?.includes('Network error')) {
        console.error(`Network error connecting to Firestore (Delete Project - Site ${siteId}).`);
         return {
             success: false,
             message: 'Network error. Please check your connection and try again.',
             error: error.message,
             errorCode: error.code || 'unavailable'
        };
    } else if (error.message?.includes("Site configuration error")) {
         return { success: false, message: "Internal configuration error.", error: error.message, errorCode: 'config-error' };
    }
     // Generic fallback error
     console.error(`An unexpected error occurred during the delete project action for site "${siteId}".`);
    return {
      success: false,
      message: 'An unexpected error occurred while deleting the project.',
      error: error.message || 'An unknown error occurred.',
      errorCode: error.code || 'unknown-service-error'
    };
  }
}
