// src/actions/blogActions.ts
'use server';

import type { BlogPost } from '@/services/blogService';
import { createBlogPost, updateBlogPost, deleteBlogPost } from '@/services/blogService'; // Services now handle siteId implicitly
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

// Define Zod schema for validation coming *from the form*
// This schema should align with what BlogPostFormData provides.
// imageUrl is a string (URL or Base64). authorId/Name are added programmatically.
const blogPostActionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with dashes'),
  summary: z.string().min(1, 'Summary is required').max(200, 'Summary must be 200 characters or less'),
  content: z.string().min(1, 'Content is required'), // HTML from editor
  imageUrl: z.string().min(1, 'Image URL or upload is required'), // URL or Base64 string
  dataAiHint: z.string().optional(),
  // Date comes as ISO string from form
  date: z.string().refine((date) => !isNaN(new Date(date).getTime()), {
    message: 'Invalid date format',
  }),
  // These are added right before calling the action, so make them optional here
  authorId: z.string().optional(),
  authorName: z.string().optional(),
});

// Define Zod schema for the data structure expected by the *service* (for create)
// Service expects Date as Timestamp, and imageUrl as string (URL/Base64).
// Author info is required by the service.
const blogPostServiceCreateSchema = blogPostActionSchema.extend({
  date: z.instanceof(Timestamp), // Service expects Timestamp
  authorId: z.string().min(1), // Service requires this, ensure non-empty
  authorName: z.string().min(1), // Service requires this, ensure non-empty
});
// Explicitly omit server-generated fields from the service schema input type
type BlogPostServiceCreateData = z.infer<typeof blogPostServiceCreateSchema>;


// Define the shape of the action result
interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  errorCode?: string;
  postId?: string; // Include created post ID on success
}

// --- Create Blog Post Action ---
export async function createBlogPostAction(
  // Expect form data (validated client-side) + author info added here
  formData: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ActionResult> {
    const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'unknown-site';
    const logData = { ...formData, imageUrl: formData.imageUrl?.startsWith('data:image') ? '[Base64 Data]' : formData.imageUrl };
    console.log(`Server Action (Site ${siteId}): Received data for new blog post:`, logData);

  // 1. Validate incoming data against the action schema (which requires author info now)
   const validation = blogPostActionSchema.extend({
        authorId: z.string().min(1), // Now required for validation within the action
        authorName: z.string().min(1),
    }).safeParse(formData);


  if (!validation.success) {
      console.error(`Server Action (Site ${siteId}): Blog post form data validation failed (Create):`, validation.error.flatten().fieldErrors);
      return {
          success: false,
          message: 'Invalid data provided. Please check the fields.',
          error: JSON.stringify(validation.error.flatten().fieldErrors), // Send structured errors
          errorCode: 'validation-error'
      };
  }

   // Optional: Check Base64 string length (Firestore limit is ~1MB)
   if (validation.data.imageUrl.startsWith('data:image') && validation.data.imageUrl.length > 1048576 * 0.95) {
       console.warn(`Server Action (Site ${siteId}): Base64 image string is potentially too large for Firestore document limit.`);
   }


  // 2. Prepare data for the service (convert date string to Timestamp)
  let serviceData: BlogPostServiceCreateData; // Use the derived type
  try {
    // Data validated above includes required authorId and authorName.
    const potentialServiceData = {
      ...validation.data, // Use validated form data
      date: Timestamp.fromDate(new Date(validation.data.date)), // Convert validated string date to Timestamp
    };

     // Validate the prepared service data against the *required* service schema
     const serviceValidation = blogPostServiceCreateSchema.safeParse(potentialServiceData);
     if (!serviceValidation.success) {
         console.error(`Server Action (Site ${siteId}): Service data validation failed before create call:`, serviceValidation.error.flatten().fieldErrors);
         throw new Error(`Internal error: Data prepared for service is invalid: ${JSON.stringify(serviceValidation.error.flatten().fieldErrors)}`);
     }
     // Use the fully validated service data
     serviceData = serviceValidation.data;


  } catch (error: any) {
     console.error(`Server Action (Site ${siteId}): Error preparing data for create service:`, error);
     return {
            success: false,
            message: 'Error processing data before saving.',
            error: error.message || 'Could not prepare data.',
            errorCode: 'data-preparation-error'
        };
  }


  // 3. Call the service function with correctly formatted data
  // The service function relies solely on Firestore rules for auth check now and uses siteId from env.
  try {
    const newPostId = await createBlogPost(serviceData); // Service handles siteId

    // Revalidate paths - these need to be aware of the site context if slugs/routes depend on it
    // For now, assume generic paths are sufficient, but site-specific revalidation might be needed later
    revalidatePath('/blog');
    revalidatePath(`/blog/${serviceData.slug}`);
    revalidatePath('/admin/blog'); // This admin path is implicitly for the current site
    revalidatePath('/');

    console.log(`Server Action (Site ${siteId}): Blog post creation submitted to Firestore with ID: ${newPostId}. Image stored as ${serviceData.imageUrl.startsWith('data:image') ? 'Base64' : 'URL'}. Final success depends on rules.`);
    return { success: true, message: 'Blog post created successfully!', postId: newPostId };

  } catch (error: any) {
    console.error(`Server Action (Site ${siteId}): Error calling createBlogPost service:`, error);
    console.error('Server Action: Error Code:', error.code); // Log specific error code

     // Consistent Error Handling Pattern
     if (error.code === 'permission-denied' || error.message?.includes('Permission denied')) {
       console.error(`Firestore Rule Check Failed (Create Blog Post - Site ${siteId}): Ensure rules allow write: if request.auth != null; and potentially ownership checks within the site's subcollection.`);
       return {
           success: false,
           message: 'Permission denied. Ensure you are logged in and Firestore rules allow creation.',
           error: `Firestore permission denied for site "${siteId}". Check security rules for the /sites/${siteId}/blogPosts collection.`,
           errorCode: error.code || 'permission-denied'
       };
    } else if (error.code === 'unauthenticated') {
        console.error(`User is not authenticated according to Firebase (Create Blog Post - Site ${siteId}).`);
        return {
            success: false,
            message: 'Authentication required. Please log in again.',
            error: 'User not authenticated.',
            errorCode: 'unauthenticated'
        };
     } else if (error.code === 'unavailable' || error.message?.includes('Network error')) {
        console.error(`Network error connecting to Firestore (Create Blog Post - Site ${siteId}).`);
         return {
             success: false,
             message: 'Network error. Please check your connection and try again.',
             error: error.message,
             errorCode: error.code || 'unavailable'
        };
     } else if (error.message?.includes('exceeds the maximum')) { // Catch Firestore size limit error
        return {
            success: false,
            message: 'Failed to save post. The data (likely the image) exceeds the database size limit.',
            error: error.message,
            errorCode: 'data-too-large'
        };
    } else if (error.message?.includes("Site configuration error")) { // Catch error from service if siteId missing
         return { success: false, message: "Internal configuration error.", error: error.message, errorCode: 'config-error' };
    }
    // Generic fallback error
    console.error(`An unexpected error occurred during the create blog post action for site "${siteId}".`);
    return {
      success: false,
      message: 'An unexpected error occurred while creating the blog post.',
      error: error.message || 'An unknown error occurred during service call.',
      errorCode: error.code || 'unknown-service-error'
    };
  }
}

// --- Update Blog Post Action ---
export async function updateBlogPostAction(
  postId: string,
  formData: Partial<Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt' | 'authorId' | 'authorName'>>
): Promise<ActionResult> {
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'unknown-site';
  const logData = { ...formData, imageUrl: formData.imageUrl?.startsWith('data:image') ? '[Base64 Data]' : formData.imageUrl };
  console.log(`Server Action (Site ${siteId}): Received data for updating blog post ID: ${postId}`, logData);

   // 1. Validate incoming partial form data
  const validation = blogPostActionSchema.omit({ authorId: true, authorName: true }).partial().safeParse(formData);
   if (!validation.success) {
      console.error(`Server Action (Site ${siteId}): Blog post update data validation failed:`, validation.error.flatten().fieldErrors);
      return {
          success: false,
          message: 'Invalid data provided for update. Please check the fields.',
          error: JSON.stringify(validation.error.flatten().fieldErrors),
          errorCode: 'validation-error'
      };
  }

  // 2. Prepare partial data for the service
  const serviceData: Partial<Omit<BlogPost, 'id' | 'createdAt' | 'authorId' | 'authorName' | 'date'> & { date?: Timestamp }> = {};
  const validatedData = validation.data;

  if (validatedData.title !== undefined) serviceData.title = validatedData.title;
  if (validatedData.slug !== undefined) serviceData.slug = validatedData.slug;
  if (validatedData.summary !== undefined) serviceData.summary = validatedData.summary;
  if (validatedData.content !== undefined) serviceData.content = validatedData.content;
  if (validatedData.imageUrl !== undefined) serviceData.imageUrl = validatedData.imageUrl;
  if (validatedData.dataAiHint !== undefined) serviceData.dataAiHint = validatedData.dataAiHint;
  if (validatedData.date !== undefined) {
     try {
        serviceData.date = Timestamp.fromDate(new Date(validatedData.date));
     } catch (dateError) {
         console.error(`Server Action (Site ${siteId}): Invalid date format received during update:`, validatedData.date);
         return {
              success: false,
              message: 'Invalid date format provided.',
              error: 'Invalid date format.',
              errorCode: 'validation-error'
         };
     }
  }

    if (Object.keys(serviceData).length === 0) {
        console.log(`Server Action (Site ${siteId}): No changes detected in update payload for post ${postId}.`);
        return { success: true, message: 'No changes detected to update.' };
    }
    if (serviceData.imageUrl?.startsWith('data:image') && serviceData.imageUrl.length > 1048576 * 0.95) {
       console.warn(`Server Action (Site ${siteId}): Base64 image string is potentially too large during update for post ${postId}.`);
    }

  console.log(`Server Action (Site ${siteId}): Prepared service data for update ID ${postId}:`, { ...serviceData, imageUrl: serviceData.imageUrl?.startsWith('data:image') ? '[Base64 Data]' : serviceData.imageUrl });

  // 3. Call the service function (relies on Firestore rules for auth/ownership within the site)
  try {
    await updateBlogPost(postId, serviceData); // Service handles siteId

    // Revalidate relevant paths (consider site-specific paths if needed)
    revalidatePath('/blog');
    if (serviceData.slug) {
        revalidatePath(`/blog/${serviceData.slug}`);
    }
    revalidatePath(`/admin/blog/${postId}/edit`); // Admin path implicitly for current site
    revalidatePath('/admin/blog');
    revalidatePath('/');

    console.log(`Server Action (Site ${siteId}): Blog post ${postId} update submitted to Firestore. Final success depends on rules.`);
    return { success: true, message: 'Blog post updated successfully!' };

  } catch (error: any) {
    console.error(`Server Action (Site ${siteId}): Error calling updateBlogPost service for ${postId}:`, error);
    console.error('Server Action: Error Code:', error.code);

     // Consistent Error Handling Pattern
     if (error.code === 'permission-denied' || error.message?.includes('Permission denied')) {
       console.error(`Firestore Rule Check Failed (Update Blog Post - Site ${siteId}): Ensure rules allow update for the authenticated user and potentially ownership.`);
       return {
           success: false,
           message: 'Permission denied. Ensure you are logged in and own this post or have edit rights.',
           error: `Firestore permission denied for site "${siteId}". Check security rules and ownership.`,
           errorCode: error.code || 'permission-denied'
       };
    } else if (error.code === 'unauthenticated') {
        console.error(`User is not authenticated according to Firebase (Update Blog Post - Site ${siteId}).`);
        return {
            success: false,
            message: 'Authentication required. Please log in again.',
            error: 'User not authenticated.',
            errorCode: 'unauthenticated'
        };
    } else if (error.code === 'unavailable' || error.message?.includes('Network error')) {
        console.error(`Network error connecting to Firestore (Update Blog Post - Site ${siteId}).`);
         return {
             success: false,
             message: 'Network error. Please check your connection and try again.',
             error: error.message,
             errorCode: error.code || 'unavailable'
        };
    } else if (error.message?.includes('exceeds the maximum')) {
        return {
            success: false,
            message: 'Failed to save post update. The data (likely the image) exceeds the database size limit.',
            error: error.message,
            errorCode: 'data-too-large'
        };
     } else if (error.message?.includes("Site configuration error")) {
         return { success: false, message: "Internal configuration error.", error: error.message, errorCode: 'config-error' };
    }
    // Generic fallback error
    console.error(`An unexpected error occurred during the update blog post action for site "${siteId}".`);
    return {
      success: false,
      message: 'An unexpected error occurred while updating the blog post.',
      error: error.message || 'An unknown error occurred during service call.',
      errorCode: error.code || 'unknown-service-error'
    };
  }
}


// --- Delete Blog Post Action ---
export async function deleteBlogPostAction(postId: string): Promise<ActionResult> {
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'unknown-site';
  console.log(`Server Action (Site ${siteId}): Attempting to delete blog post ID: ${postId}`);

  if (!postId) {
      return { success: false, message: 'Post ID is required for deletion.', errorCode: 'missing-id' };
  }

  // Call the service function (relies on Firestore rules for auth/ownership within the site)
  try {
    await deleteBlogPost(postId); // Service handles siteId

    // Revalidate relevant paths
    revalidatePath('/blog');
    revalidatePath('/admin/blog'); // Admin path implicitly for current site
    revalidatePath('/');

    console.log(`Server Action (Site ${siteId}): Blog post ${postId} delete request submitted to Firestore. Final success depends on rules.`);
    return { success: true, message: 'Blog post deleted successfully!' };

  } catch (error: any) {
    console.error(`Server Action (Site ${siteId}): Error calling deleteBlogPost service for ${postId}:`, error);
    console.error('Server Action: Error Code:', error.code);

     // Consistent Error Handling Pattern
    if (error.code === 'permission-denied' || error.message?.includes('Permission denied')) {
        console.error(`Firestore Rule Check Failed (Delete Blog Post - Site ${siteId}): Ensure rules allow delete for the authenticated user and potentially ownership.`);
       return {
           success: false,
           message: 'Permission denied. Ensure you are logged in and own this post or have delete rights.',
           error: `Firestore permission denied for site "${siteId}". Check security rules and ownership.`,
           errorCode: error.code || 'permission-denied'
       };
    } else if (error.code === 'unauthenticated') {
        console.error(`User is not authenticated according to Firebase (Delete Blog Post - Site ${siteId}).`);
        return {
            success: false,
            message: 'Authentication required. Please log in again.',
            error: 'User not authenticated.',
            errorCode: 'unauthenticated'
        };
     } else if (error.code === 'unavailable' || error.message?.includes('Network error')) {
        console.error(`Network error connecting to Firestore (Delete Blog Post - Site ${siteId}).`);
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
    console.error(`An unexpected error occurred during the delete blog post action for site "${siteId}".`);
    return {
      success: false,
      message: 'An unexpected error occurred while deleting the blog post.',
      error: error.message || 'An unknown error occurred during service call.',
      errorCode: error.code || 'unknown-service-error'
    };
  }
}
