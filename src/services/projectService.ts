// src/services/projectService.ts
import { db } from '@/lib/firebase';
import {
    collection, getDocs, doc, getDoc, orderBy, query, limit, Timestamp, where,
    addDoc, updateDoc, deleteDoc, serverTimestamp, getDocsFromServer
} from 'firebase/firestore';
import { z } from 'zod';

// Define the Project structure expected from Firestore
export interface Project {
  id: string; // Firestore document ID
  slug: string;
  title: string;
  description: string; // Short summary
  details?: string; // Rich text details
  privacyPolicy?: string; // Rich text privacy policy
  imageUrl: string; // URL or Base64 Data URI string
  link: string;
  tags: string[];
  dataAiHint?: string;
  order?: number;
  createdAt?: string; // ISO string for client
  updatedAt?: string; // ISO string for client
}

// Zod schema for strict validation before saving to Firestore
const projectDbSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with dashes'),
    description: z.string().min(1, 'Short description is required').max(150, 'Short description must be 150 characters or less'),
    details: z.string().optional(),
    privacyPolicy: z.string().optional(), // Add privacy policy
    imageUrl: z.string().min(1, 'Image URL or Base64 is required'),
    link: z.string().min(1, 'Project link is required (use # if none)'),
    tags: z.array(z.string()).min(1, 'At least one tag is required'),
    dataAiHint: z.string().optional(),
    order: z.number().int().min(0, 'Order must be a non-negative integer').default(999),
    createdAt: z.any().optional(), // Allow serverTimestamp
    updatedAt: z.any().optional(), // Allow serverTimestamp
}).passthrough();

// Zod schema for creating a project (omitting server-generated timestamps)
const projectCreateDbSchema = projectDbSchema.omit({ createdAt: true, updatedAt: true });
type ProjectCreateData = z.infer<typeof projectCreateDbSchema>;

// Helper function to safely convert Timestamps or date strings to ISO strings
const safeToISOString = (dateInput: any): string | undefined => {
  // ... (same implementation as in blogService)
    if (dateInput instanceof Timestamp) {
        try {
        return dateInput.toDate().toISOString();
        } catch (e) {
        console.error("Error converting Timestamp to ISO string:", e);
        return undefined;
        }
    }
    if (typeof dateInput === 'string') {
        if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/.test(dateInput)) {
            return dateInput;
        }
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

// Helper to map Firestore doc data to Project interface for client use
const mapFirestoreDocToProject = (docSnap: any): Project => {
    // ... (same implementation as in blogService, adapting field names)
    const data = docSnap.data() as Partial<Omit<Project, 'createdAt' | 'updatedAt'> & { createdAt: Timestamp | string; updatedAt: Timestamp | string }>;
    const defaults: Partial<Project> = {
        title: 'Untitled Project',
        slug: `untitled-${docSnap.id}`,
        description: 'No description available.',
        details: '',
        privacyPolicy: '',
        imageUrl: 'https://picsum.photos/seed/default-project/600/400',
        link: '#',
        tags: [],
        dataAiHint: 'project technology application',
        order: 9999,
    };

    if (typeof data.title !== 'string' || !data.title) console.warn(`Project ${docSnap.id} missing title.`);
    if (typeof data.slug !== 'string' || !data.slug) console.warn(`Project ${docSnap.id} missing slug.`);
    if (!Array.isArray(data.tags)) console.warn(`Project ${docSnap.id} has invalid tags.`);
    if (typeof data.imageUrl !== 'string' || (!data.imageUrl.startsWith('http') && !data.imageUrl.startsWith('data:image'))) {
        console.warn(`Project ${docSnap.id} has invalid imageUrl. Using default.`);
    }

   return {
      id: docSnap.id,
      title: typeof data.title === 'string' && data.title ? data.title : defaults.title!,
      slug: typeof data.slug === 'string' && data.slug ? data.slug : defaults.slug!,
      description: typeof data.description === 'string' ? data.description : defaults.description!,
      details: typeof data.details === 'string' ? data.details : defaults.details!,
      privacyPolicy: typeof data.privacyPolicy === 'string' ? data.privacyPolicy : defaults.privacyPolicy,
      imageUrl: typeof data.imageUrl === 'string' && (data.imageUrl.startsWith('http') || data.imageUrl.startsWith('data:image')) ? data.imageUrl : defaults.imageUrl!,
      link: typeof data.link === 'string' ? data.link : defaults.link!,
      tags: Array.isArray(data.tags) ? data.tags.filter(tag => typeof tag === 'string') : defaults.tags!,
      dataAiHint: typeof data.dataAiHint === 'string' ? data.dataAiHint : defaults.dataAiHint!,
      order: typeof data.order === 'number' ? data.order : defaults.order!,
      createdAt: data.createdAt ? safeToISOString(data.createdAt) : undefined,
      updatedAt: data.updatedAt ? safeToISOString(data.updatedAt) : undefined,
   };
}

// --- Helper to get site-specific projects collection reference ---
const getSiteProjectCollectionRef = () => {
    const siteId = process.env.NEXT_PUBLIC_SITE_ID;
    if (!siteId) {
        console.error("NEXT_PUBLIC_SITE_ID environment variable is not set. Cannot access projects collection.");
        throw new Error("Site configuration error: Site ID is missing.");
    }
     if (!db) {
        console.error(`Firestore (db) is not initialized for site ${siteId}. Cannot access projects collection.`);
        throw new Error("Firestore connection error.");
    }
    return collection(db, 'sites', siteId, 'projects');
}

// --- Public Read Functions (Updated for Site Scoping) ---

export async function getAllProjects(): Promise<Project[]> {
    let projectsCollection;
    const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'unknown-site';
    try {
        projectsCollection = getSiteProjectCollectionRef();
    } catch (error: any) {
         console.error(`Error getting site project collection ref in getAllProjects (Site ${siteId}):`, error.message);
         return [];
    }
    let querySnapshot;
    try {
        const q = query(projectsCollection, orderBy('createdAt', 'desc'));
        querySnapshot = await getDocsFromServer(q); // Force server fetch

        if (querySnapshot.empty) {
            console.warn(`No projects found for site "${siteId}". Serving empty array.`);
            return [];
        }
        return querySnapshot.docs.map(mapFirestoreDocToProject);
    } catch (error: any) {
        console.error(`Error fetching projects for site "${siteId}" (possibly due to ordering field):`, error.message || error);
        // Fallback fetch without ordering ONLY if the specific error is 'failed-precondition'
         if (error.code === 'failed-precondition') {
            try {
                console.log(`Attempting fallback fetch for projects for site "${siteId}" without ordering...`);
                querySnapshot = await getDocsFromServer(projectsCollection); // Force server fetch
                if (querySnapshot.empty) {
                    console.warn(`No projects found for site "${siteId}" (fallback fetch).`);
                    return [];
                }
                console.log(`Fallback fetch successful for site "${siteId}", found ${querySnapshot.size} projects.`);
                return querySnapshot.docs.map(mapFirestoreDocToProject).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            } catch (fallbackError: any) {
                console.error(`Error fetching projects for site "${siteId}" (fallback):`, fallbackError.message || fallbackError);
                console.warn(`Serving empty project array for site "${siteId}" as final fallback.`);
                return [];
            }
        }
        console.warn(`Serving empty project array for site "${siteId}" due to error:`, error.code);
        return [];
    }
}

export async function getFeaturedProjects(count: number = 3): Promise<Project[]> {
     let projectsCollection;
     const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'unknown-site';
    try {
        projectsCollection = getSiteProjectCollectionRef();
    } catch (error: any) {
        console.error(`Error getting site project collection ref in getFeaturedProjects (Site ${siteId}):`, error.message);
        return [];
    }
   let querySnapshot;
   try {
    const q = query(projectsCollection, orderBy('createdAt', 'desc'), limit(count));
    querySnapshot = await getDocsFromServer(q); // Force server fetch

     if (querySnapshot.empty && count > 0) {
      console.warn(`No featured projects found for site "${siteId}".`);
       return [];
    }
    return querySnapshot.docs.map(mapFirestoreDocToProject);

  } catch (error: any) {
    console.error(`Error fetching ${count} featured projects for site "${siteId}" (ordering issue?):`, error.message || error);
     if (error.code === 'failed-precondition') {
         try {
             console.log(`Attempting fallback fetch for ${count} featured projects for site "${siteId}" without ordering...`);
            const q = query(projectsCollection, limit(count));
            querySnapshot = await getDocsFromServer(q); // Force server fetch
             if (querySnapshot.empty && count > 0) {
                console.warn(`No projects found for site "${siteId}" (fallback fetch).`);
                 return [];
            }
             console.log(`Fallback fetch successful for site "${siteId}", found ${querySnapshot.size} featured projects.`);
            return querySnapshot.docs.map(mapFirestoreDocToProject).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, count);
        } catch (fallbackError: any) {
            console.error(`Error fetching featured projects for site "${siteId}" (fallback):`, fallbackError.message || fallbackError);
            console.warn(`Serving empty featured project array for site "${siteId}" as final fallback.`);
             return [];
        }
    }
    console.warn(`Serving empty featured project array for site "${siteId}" due to error:`, error.code);
     return [];
  }
}

export async function getProjectById(id: string): Promise<(Omit<Project, 'createdAt' | 'updatedAt'> & { createdAt?: Timestamp, updatedAt?: Timestamp }) | null> {
    const siteId = process.env.NEXT_PUBLIC_SITE_ID;
    if (!siteId) {
        console.error("NEXT_PUBLIC_SITE_ID missing in getProjectById.");
        return null;
    }
    if (!db) {
        console.warn(`Firestore (db) is not initialized for site ${siteId}. Cannot fetch project by ID "${id}".`);
        return null;
    }
  try {
    const docRef = doc(db, 'sites', siteId, 'projects', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.warn(`Project with ID "${id}" not found for site "${siteId}".`);
       return null;
    }
    // Return data with original Timestamps for server-side use (e.g., editing)
    return { id: docSnap.id, ...docSnap.data() } as (Omit<Project, 'createdAt' | 'updatedAt'> & { createdAt?: Timestamp, updatedAt?: Timestamp });

  } catch (error: any) {
    console.error(`Error fetching project with ID "${id}" for site "${siteId}":`, error);
    return null;
  }
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
     let projectsCollection;
     const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'unknown-site';
     try {
        projectsCollection = getSiteProjectCollectionRef();
    } catch (error: any) {
        console.error(`Error getting site project collection ref in getProjectBySlug (Site ${siteId}, Slug ${slug}):`, error.message);
        return null;
    }
   if (!slug || typeof slug !== 'string') {
      console.error("Invalid slug provided to getProjectBySlug:", slug);
      return null;
   }
   try {
    console.log(`Firestore query (Site ${siteId}): Fetching project where slug == "${slug}"`);
    const q = query(projectsCollection, where('slug', '==', slug), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.warn(`Project with slug "${slug}" not found for site "${siteId}".`);
       return null;
    }

    const docSnap = querySnapshot.docs[0];
    console.log(`Found project with ID: ${docSnap.id} for site "${siteId}", slug: "${slug}"`);
    return mapFirestoreDocToProject(docSnap); // Convert Timestamps for client

   } catch (error: any) {
    console.error(`Error fetching project with slug "${slug}" for site "${siteId}":`, error.message || error);
    throw error; // Re-throw for page-level handling (e.g., notFound())
   }
}


// --- Admin Functions (Protected - Rely on Firestore Rules, Updated for Site Scoping) ---

export async function createProject(projectData: ProjectCreateData): Promise<string> {
    let projectsCollection;
    const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'unknown-site';
    try {
        projectsCollection = getSiteProjectCollectionRef();
    } catch (error: any) {
        console.error(`Error creating project for site "${siteId}":`, error.message);
        const serviceError = new Error(error.message);
        (serviceError as any).code = (error as any).code || 'service-setup-error';
        throw serviceError;
    }

    // Validate data using the DB schema (already validated by action, but good practice)
    const validation = projectCreateDbSchema.safeParse(projectData);
     if (!validation.success) {
      console.error(`Service: Validation failed before Firestore create for project on site "${siteId}":`, validation.error.flatten().fieldErrors);
      throw new Error(`Internal data validation failed before creating project for site "${siteId}": ${JSON.stringify(validation.error.flatten().fieldErrors)}`);
    }

    const logData = { ...validation.data, imageUrl: validation.data.imageUrl?.startsWith('data:image') ? '[Base64 Data]' : validation.data.imageUrl };
    console.log(`Service: Attempting to create project for site "${siteId}". Data:`, logData);

    const dataToSave = {
      ...validation.data, // Use validated data
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(projectsCollection, dataToSave);
      console.log(`Project created for site "${siteId}" with ID: ${docRef.id}. Final write depends on rules.`);
      return docRef.id;
    } catch (error: any) {
      console.error(`Error creating project document for site "${siteId}" in Firestore:`, error);
        if (error.code === 'permission-denied') {
             console.error(`Firestore Rule Check Failed (Create Project - Site ${siteId}): Ensure rules allow write: if request.auth != null;`);
             throw new Error('Permission denied. Check Firestore rules for the projects collection.');
        } else if (error.message?.includes('exceeds the maximum')) {
            (error as any).code = 'data-too-large';
             throw new Error('Failed to save project. The data (likely the image) exceeds the database size limit.');
         } else if (error.code) {
             throw error; // Re-throw other Firestore errors
        }
      throw new Error(`Failed to create project for site "${siteId}" due to database error.`);
    }
  }

export async function updateProject(projectId: string, projectData: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<void> {
   const siteId = process.env.NEXT_PUBLIC_SITE_ID;
    if (!siteId) {
        console.error("NEXT_PUBLIC_SITE_ID missing in updateProject.");
        throw new Error("Site configuration error.");
    }
    if (!db) {
        console.warn(`Firestore (db) is not initialized for site ${siteId}. Cannot update project.`);
        throw new Error("Firestore connection error.");
    }

   const docRef = doc(db, 'sites', siteId, 'projects', projectId);

   const logData = { ...projectData, imageUrl: projectData.imageUrl?.startsWith('data:image') ? '[Base64 Data]' : projectData.imageUrl };
   console.log(`Service: Attempting to update project ID: ${projectId} for site "${siteId}". Data:`, logData);

   const dataToUpdate: { [key: string]: any } = {
     ...projectData,
     updatedAt: serverTimestamp(),
   };

   // Validate against partial schema before update
   const validation = projectDbSchema
      .omit({ createdAt: true }) // createdAt is not updated
      .partial()
      .extend({ updatedAt: z.any() })
      .safeParse(dataToUpdate);

    if (!validation.success) {
       console.error(`Firestore Update Validation Failed (Update Project - Site ${siteId}):`, validation.error.flatten().fieldErrors);
       throw new Error(`Project data for site "${siteId}" failed validation before updating Firestore: ${JSON.stringify(validation.error.flatten().fieldErrors)}`);
   }

   try {
     await updateDoc(docRef, validation.data);
     console.log(`Project ${projectId} for site "${siteId}" update submitted to Firestore. Final result depends on rules.`);
   } catch (error: any) {
       console.error(`Error updating project ${projectId} for site "${siteId}" in Firestore:`, error);
        if (error.code === 'permission-denied') {
            console.error(`Firestore Rule Check Failed (Update Project - Site ${siteId}): Ensure rules allow update.`);
             throw new Error('Permission denied. Check Firestore rules for the projects collection.');
        } else if (error.message?.includes('exceeds the maximum')) {
            (error as any).code = 'data-too-large';
             throw new Error('Failed to save project update. The data (likely the image) exceeds the database size limit.');
         } else if (error.code) {
            throw error; // Re-throw Firestore error
        }
       throw new Error(`Failed to update project for site "${siteId}" due to database error.`);
   }
}

export async function deleteProject(projectId: string): Promise<void> {
   const siteId = process.env.NEXT_PUBLIC_SITE_ID;
    if (!siteId) {
        console.error("NEXT_PUBLIC_SITE_ID missing in deleteProject.");
        throw new Error("Site configuration error.");
    }
    if (!db) {
        console.warn(`Firestore (db) is not initialized for site ${siteId}. Cannot delete project.`);
        throw new Error("Firestore connection error.");
    }

   console.log(`Service: Attempting to delete project ID: ${projectId} for site "${siteId}". Auth check relies on rules.`);
   const docRef = doc(db, 'sites', siteId, 'projects', projectId);

   try {
     await deleteDoc(docRef);
     console.log(`Project ${projectId} for site "${siteId}" delete request submitted to Firestore. Final result depends on rules.`);
   } catch (error: any) {
       console.error(`Error deleting project ${projectId} for site "${siteId}" in Firestore:`, error);
        if (error.code === 'permission-denied') {
            console.error(`Firestore Rule Check Failed (Delete Project - Site ${siteId}): Ensure rules allow delete.`);
             throw new Error('Permission denied. Check Firestore rules.');
        } else if (error.code) {
           throw error; // Re-throw Firestore errors
        }
       throw new Error(`Failed to delete project for site "${siteId}" due to database error.`);
   }
}
