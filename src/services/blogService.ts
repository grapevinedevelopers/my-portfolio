// src/services/blogService.ts
import { db } from '@/lib/firebase'; // Import db only
import {
    collection, getDocs, doc, getDoc, query, where, orderBy, limit, Timestamp,
    addDoc, updateDoc, deleteDoc, serverTimestamp, getDocsFromServer // Import Firestore mutation functions
} from 'firebase/firestore';
import { z } from 'zod';

// Define the Blog Post structure expected from Firestore (used for reading)
// Date can be Timestamp | string after fetch, client needs string
export interface BlogPost {
  id: string; // Firestore document ID
  slug: string;
  title: string;
  summary: string;
  content: string; // Store content as HTML string or Markdown
  date: string; // Store date as ISO string for consistency when reading/passing to client
  imageUrl: string; // URL or Base64 Data URI string for thumbnail
  dataAiHint?: string; // Hint for AI image generation/search if using placeholders
  authorId?: string;
  authorName?: string;
  createdAt?: string; // Use string for client-side representation
  updatedAt?: string; // Use string for client-side representation
}

// Zod schema for validating data *before saving* to Firestore (used internally by services)
// Note: `date` is Timestamp here, as expected by Firestore writes.
// imageUrl is string (URL or Base64).
const blogPostDbSchema = z.object({
    title: z.string().min(1),
    slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with dashes'),
    summary: z.string().min(1).max(200),
    content: z.string().min(1), // HTML content from Rich Text Editor
    imageUrl: z.string().min(1, 'Image URL or Base64 is required'), // Store URL or Base64 string
    dataAiHint: z.string().optional(),
    date: z.instanceof(Timestamp), // Expect Timestamp before saving
    authorId: z.string().min(1, 'Author ID is required'), // Ensure non-empty
    authorName: z.string().min(1, 'Author Name is required'), // Ensure non-empty
    createdAt: z.any().optional(), // Handled by serverTimestamp on create
    updatedAt: z.any().optional(), // Handled by serverTimestamp on create/update
});

// Use the schema defined above to define the creation type
// Exclude timestamps as they are handled by Firestore serverTimestamp
const blogPostCreateDbSchema = blogPostDbSchema.omit({ createdAt: true, updatedAt: true });


// Define the type for data used to create a blog post in the service
// This type now directly matches the validated schema structure
type BlogPostCreateData = z.infer<typeof blogPostCreateDbSchema>;


// Function to safely convert Firestore Timestamps or date strings to ISO strings for client-side use
const safeToISOString = (dateInput: any): string | undefined => {
  if (dateInput instanceof Timestamp) {
    try {
      return dateInput.toDate().toISOString();
    } catch (e) {
      console.error("Error converting Timestamp to ISO string:", e);
      return undefined;
    }
  }
  if (typeof dateInput === 'string') {
    // Check if it's already an ISO string
    if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/.test(dateInput)) {
        return dateInput;
    }
     // Attempt to parse other common date string formats
     try {
       const parsedDate = new Date(dateInput);
       if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toISOString();
       }
       console.warn(`Could not parse date string: "${dateInput}". Invalid format.`);
       return undefined;
     } catch {
       console.warn(`Error parsing date string: "${dateInput}".`);
       return undefined;
     }
  }
   // Handle potential ServerTimestamp placeholder before it's resolved
   if (dateInput && typeof dateInput.toDate === 'function') {
     try {
        return dateInput.toDate().toISOString();
     } catch {
        console.warn("Error converting server timestamp placeholder to Date object.");
        return undefined;
     }
  }
  console.warn(`Invalid date type received: ${typeof dateInput}. Expected Timestamp or ISO string.`);
  return undefined;
};

// Helper to map Firestore doc data to BlogPost for client-side use, providing defaults
const mapFirestoreDocToBlogPost = (docSnap: any): BlogPost => {
    const data = docSnap.data() as Partial<BlogPost & { date: Timestamp | string, createdAt: Timestamp | string, updatedAt: Timestamp | string }>; // Allow Timestamp or string during mapping
    const dateString = safeToISOString(data.date);

    if (!dateString) {
       console.warn(`Document ${docSnap.id} has an invalid or missing date. Using current date as fallback.`);
    }
     if (typeof data.slug !== 'string' || !data.slug) {
        console.warn(`Document ${docSnap.id} is missing a valid slug. Generating fallback slug.`);
    }
    if (typeof data.title !== 'string' || !data.title) {
        console.warn(`Document ${docSnap.id} is missing a title. Using 'Untitled Post'.`);
    }
     if (typeof data.imageUrl !== 'string' || (!data.imageUrl.startsWith('http') && !data.imageUrl.startsWith('data:image'))) {
        console.warn(`Document ${docSnap.id} has invalid or missing imageUrl. Using default placeholder.`);
     }

    return {
        id: docSnap.id,
        slug: typeof data.slug === 'string' && data.slug ? data.slug : `untitled-${docSnap.id}`,
        title: typeof data.title === 'string' && data.title ? data.title : 'Untitled Post',
        summary: typeof data.summary === 'string' ? data.summary : '',
        content: typeof data.content === 'string' ? data.content : '<p>No content available.</p>',
        imageUrl: typeof data.imageUrl === 'string' && (data.imageUrl.startsWith('http') || data.imageUrl.startsWith('data:image')) ? data.imageUrl : 'https://picsum.photos/seed/default-blog/600/400', // Fallback image
        dataAiHint: typeof data.dataAiHint === 'string' ? data.dataAiHint : 'blog post cover image article', // Default AI hint
        date: dateString || new Date().toISOString(), // Use fallback date if conversion failed
        authorId: typeof data.authorId === 'string' ? data.authorId : undefined,
        authorName: typeof data.authorName === 'string' ? data.authorName : undefined,
        // Convert timestamps to ISO strings for client-side consistency
        createdAt: data.createdAt ? safeToISOString(data.createdAt) : undefined,
        updatedAt: data.updatedAt ? safeToISOString(data.updatedAt) : undefined,
    };
};

// --- Helper to get site-specific collection reference ---
const getSiteBlogCollectionRef = () => {
    const siteId = process.env.NEXT_PUBLIC_SITE_ID;
    if (!siteId) {
        console.error("NEXT_PUBLIC_SITE_ID environment variable is not set. Cannot access blog collection.");
        // Throw an error or return null/undefined based on how you want to handle this globally
        throw new Error("Site configuration error: Site ID is missing.");
    }
     if (!db) {
        console.error(`Firestore (db) is not initialized for site ${siteId}. Cannot access blog collection.`);
        throw new Error("Firestore connection error.");
    }
    return collection(db, 'sites', siteId, 'blogPosts');
}


// --- Public Read Functions (Updated for Site Scoping) ---

export async function getAllBlogPosts(): Promise<BlogPost[]> {
    let postsCollection;
    try {
        postsCollection = getSiteBlogCollectionRef();
    } catch (error: any) {
         console.error("Error getting site blog collection ref in getAllBlogPosts:", error.message);
        return []; // Return empty if site ID or DB is missing/invalid
    }

  try {
    const q = query(postsCollection, orderBy('date', 'desc'));
    const querySnapshot = await getDocsFromServer(q); // Force server fetch

    if (querySnapshot.empty) {
      console.warn(`No blog posts found for site "${process.env.NEXT_PUBLIC_SITE_ID}" in Firestore. Serving empty array.`);
      return [];
    }

    return querySnapshot.docs.map(mapFirestoreDocToBlogPost);

  } catch (error: any) {
     console.error(`Error fetching blog posts for site "${process.env.NEXT_PUBLIC_SITE_ID}" from Firestore:`, error.message || error);
     console.warn("Serving empty blog post array due to an error.");
    return [];
  }
}

export async function getLatestBlogPosts(count: number = 3): Promise<BlogPost[]> {
    let postsCollection;
    try {
        postsCollection = getSiteBlogCollectionRef();
    } catch (error: any) {
         console.error("Error getting site blog collection ref in getLatestBlogPosts:", error.message);
        return [];
    }
   try {
    const q = query(postsCollection, orderBy('date', 'desc'), limit(count));
    const querySnapshot = await getDocsFromServer(q); // Force server fetch

     if (querySnapshot.empty && count > 0) {
      console.warn(`No blog posts found for site "${process.env.NEXT_PUBLIC_SITE_ID}". Serving empty array.`);
      return [];
    }

    return querySnapshot.docs.map(mapFirestoreDocToBlogPost);

  } catch (error: any) {
    console.error(`Error fetching latest ${count} blog posts for site "${process.env.NEXT_PUBLIC_SITE_ID}" from Firestore:`, error.message || error);
    console.warn(`Serving empty latest posts array due to an error.`);
    return [];
  }
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
    let postsCollection;
    try {
        postsCollection = getSiteBlogCollectionRef();
    } catch (error: any) {
         console.error(`Error getting site blog collection ref in getBlogPostBySlug (slug: ${slug}):`, error.message);
        return null;
    }
   try {
    const q = query(postsCollection, where('slug', '==', slug), limit(1));
    const querySnapshot = await getDocsFromServer(q); // Force server fetch

    if (querySnapshot.empty) {
      console.warn(`Blog post with slug "${slug}" not found for site "${process.env.NEXT_PUBLIC_SITE_ID}" in Firestore.`);
       return null;
    }

    const docSnap = querySnapshot.docs[0];
    return mapFirestoreDocToBlogPost(docSnap);

  } catch (error: any) {
    console.error(`Error fetching blog post with slug "${slug}" for site "${process.env.NEXT_PUBLIC_SITE_ID}" from Firestore:`, error.message || error);
    console.warn(`Returning null for slug "${slug}" due to an error.`);
    return null;
  }
}

/**
 * Fetches a single blog post by its Firestore document ID for a specific site.
 * Returns raw data, converting Timestamps to strings for Client Components.
 * @param {string} id - The Firestore document ID of the post.
 * @returns {Promise<BlogPost | null>} The blog post with date/timestamps as strings, or null if not found.
 */
export async function getBlogPostById(id: string): Promise<BlogPost | null> {
     const siteId = process.env.NEXT_PUBLIC_SITE_ID;
    if (!siteId) {
        console.error("NEXT_PUBLIC_SITE_ID missing in getBlogPostById.");
        return null;
    }
    if (!db) {
        console.warn(`Firestore (db) is not initialized for site ${siteId}. Cannot fetch blog post by ID "${id}".`);
        return null;
    }
  try {
    // Construct path using siteId
    const docRef = doc(db, 'sites', siteId, 'blogPosts', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.warn(`Blog post with ID "${id}" not found for site "${siteId}".`);
      return null;
    }
     // Use the helper function which converts Timestamps to ISO strings
     return mapFirestoreDocToBlogPost(docSnap);

  } catch (error: any) {
    console.error(`Error fetching blog post with ID "${id}" for site "${siteId}":`, error);
    return null;
  }
}


// --- Admin Functions (Protected - Rely on Firestore Rules, Updated for Site Scoping) ---

/**
 * Creates a new blog post in the specified site's subcollection in Firestore.
 * Relies on Firestore rules for authentication/authorization within the site context.
 * @param postData - Data for the new post, matching the service type (date as Timestamp, authorId/Name provided, imageUrl as string).
 * @returns {Promise<string>} The ID of the newly created post.
 * @throws {Error} If siteId is missing, Firestore is not initialized, or the operation fails.
 */
export async function createBlogPost(
  postData: BlogPostCreateData // This type already expects validated data
): Promise<string> {
  let postsCollection;
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'unknown-site'; // Fallback for logging
  try {
      postsCollection = getSiteBlogCollectionRef(); // Throws if siteId or db missing
  } catch (error: any) {
       console.error(`Error creating blog post for site "${siteId}":`, error.message);
       // Re-throw with a potential custom code if needed by the action
       const serviceError = new Error(error.message);
        (serviceError as any).code = (error as any).code || 'service-setup-error';
       throw serviceError;
  }

  // Validate data again just before Firestore operation (redundant if action validation is robust, but safe)
  const validation = blogPostCreateDbSchema.safeParse(postData);
  if (!validation.success) {
      console.error(`Service: Validation failed before Firestore create for site "${siteId}":`, validation.error.flatten().fieldErrors);
      throw new Error(`Internal data validation failed before creating post for site "${siteId}": ${JSON.stringify(validation.error.flatten().fieldErrors)}`);
  }

  const logData = { ...validation.data, imageUrl: validation.data.imageUrl?.startsWith('data:image') ? '[Base64 Data]' : validation.data.imageUrl };
  console.log(`Service: Attempting to create blog post for site "${siteId}" with authorId: ${validation.data.authorId}. Data:`, logData);

  try {
      const dataToSave = {
          ...validation.data, // Use validated data (includes imageUrl string)
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(postsCollection, dataToSave);
      console.log(`Service: Blog post created for site "${siteId}" with ID: ${docRef.id} by author ${postData.authorId}. Image stored as ${dataToSave.imageUrl.startsWith('data:image') ? 'Base64' : 'URL'}. Final write depends on rules.`);
      return docRef.id;

  } catch (error: any) {
      console.error(`Service: Error creating blog post in Firestore for site "${siteId}":`, error);
      if (error.code === 'permission-denied') {
         console.error(`Firestore Rule Check Failed (Create Blog Post - Site ${siteId}): Ensure rules allow write: if request.auth != null; and potentially ownership checks.`);
      }
      // Re-throw original Firestore error with code if possible
      if (error.code) throw error;
      // Fallback generic error
      throw new Error(`Failed to create blog post for site "${siteId}" due to database error.`);
  }
}


/**
 * Updates an existing blog post in the specified site's subcollection in Firestore.
 * Relies on Firestore rules for authentication/authorization.
 * @param postId - The ID of the post to update.
 * @param postData - Partial data to update the post with (date should be Timestamp if included, imageUrl is string).
 * @throws {Error} If siteId is missing, Firestore is not initialized, or the operation fails.
 */
export async function updateBlogPost(
    postId: string,
    postData: Partial<Omit<BlogPost, 'id' | 'createdAt' | 'authorId' | 'authorName' | 'date'> & { date?: Timestamp }>
): Promise<void> {
    const siteId = process.env.NEXT_PUBLIC_SITE_ID;
     if (!siteId) {
        console.error("NEXT_PUBLIC_SITE_ID missing in updateBlogPost.");
         throw new Error("Site configuration error.");
    }
    if (!db) {
        console.warn(`Firestore (db) is not initialized for site ${siteId}. Cannot update blog post.`);
         throw new Error("Firestore connection error.");
    }

   const docRef = doc(db, 'sites', siteId, 'blogPosts', postId);

   const logData = { ...postData, imageUrl: postData.imageUrl?.startsWith('data:image') ? '[Base64 Data]' : postData.imageUrl };
   console.log(`Service: Attempting to update blog post ID: ${postId} for site "${siteId}" with data:`, logData);


   // Prepare the final update payload for Firestore
    const dataToUpdate: { [key: string]: any } = {
     ...postData, // Spread the incoming partial data (includes imageUrl string)
     updatedAt: serverTimestamp(), // Always update the timestamp
   };

   // Validate the final data structure against the partial DB schema
   const validation = blogPostDbSchema
      .partial() // Allow partial updates
      .omit({ createdAt: true, authorId: true, authorName: true }) // These shouldn't be updated directly
      .extend({ updatedAt: z.any() }) // Expect serverTimestamp placeholder
      .safeParse(dataToUpdate);

   if (!validation.success) {
       console.error(`Firestore Update Validation Failed (Update Blog Post - Site ${siteId}):`, validation.error.flatten().fieldErrors);
       throw new Error(`Blog post data for site "${siteId}" failed validation before updating Firestore: ${JSON.stringify(validation.error.flatten().fieldErrors)}`);
   }


   try {
     await updateDoc(docRef, validation.data); // Use validated data
     console.log(`Service: Blog post ${postId} for site "${siteId}" update submitted to Firestore. Image stored as ${validation.data.imageUrl?.startsWith('data:image') ? 'Base64' : 'URL or unchanged'}. Final result depends on rules.`);
   } catch (error: any) {
       console.error(`Service: Error updating blog post ${postId} for site "${siteId}" in Firestore:`, error);
       if (error.code === 'permission-denied') {
          console.error(`Firestore Rule Check Failed (Update Blog Post - Site ${siteId}): Ensure rules allow update for the authenticated user.`);
       }
        if (error.code) throw error; // Re-throw Firestore errors
        throw new Error(`Failed to update blog post for site "${siteId}" due to database error.`);
   }
}

/**
 * Deletes a blog post from the specified site's subcollection in Firestore.
 * Relies on Firestore rules for authentication/authorization.
 * @param postId - The ID of the post to delete.
 * @throws {Error} If siteId is missing, Firestore is not initialized, or the operation fails.
 */
export async function deleteBlogPost(postId: string): Promise<void> {
     const siteId = process.env.NEXT_PUBLIC_SITE_ID;
    if (!siteId) {
        console.error("NEXT_PUBLIC_SITE_ID missing in deleteBlogPost.");
        throw new Error("Site configuration error.");
    }
    if (!db) {
        console.warn(`Firestore (db) is not initialized for site ${siteId}. Cannot delete blog post.`);
        throw new Error("Firestore connection error.");
    }

   console.log(`Service: Attempting to delete blog post ID: ${postId} for site "${siteId}". Auth check relies on rules.`);

   const docRef = doc(db, 'sites', siteId, 'blogPosts', postId);
   try {
     await deleteDoc(docRef);
     console.log(`Service: Blog post ${postId} for site "${siteId}" delete request submitted to Firestore. Final result depends on rules.`);
   } catch (error: any) {
       console.error(`Service: Error deleting blog post ${postId} for site "${siteId}" in Firestore:`, error);
       if (error.code === 'permission-denied') {
           console.error(`Firestore Rule Check Failed (Delete Blog Post - Site ${siteId}): Ensure rules allow delete for the authenticated user.`);
       }
        if (error.code) throw error; // Re-throw Firestore errors
       throw new Error(`Failed to delete blog post for site "${siteId}" due to database error.`);
   }
}
