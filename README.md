# Ankur Khera - Personal Portfolio & Blog

This is a Next.js web application serving as a personal portfolio and blog for Ankur Khera. It features dynamic content management through a Firebase backend and an admin interface for easy updates.

## Features of the Project

*   **Dynamic Content:** Personal details, blog posts, and projects are fetched dynamically from Firestore.
*   **Admin Dashboard:** Secure section (`/admin`) to manage:
    *   Personal Details (name, title, bio, contact info, experience, education, profile image, resume)
    *   Blog Posts (add, edit, delete with rich text content and thumbnail images)
    *   Projects (add, edit, delete with rich text details and thumbnail images)
*   **Firebase Integration:** Uses Firebase Authentication for admin login and Firestore for data storage.
*   **Rich Text Editing:** Utilizes TipTap editor for creating formatted content for blogs and project details.
*   **Image Handling:** Supports uploading images (profile, blog thumbnails, project thumbnails) encoded as Base64 and stored directly in Firestore documents (within Firestore's size limits).
*   **Responsive Design:** Built with Tailwind CSS and ShadCN UI components for a modern, responsive layout.
*   **Pretty URLs:** Uses slugs for user-friendly and SEO-friendly URLs for blog posts and projects.
*   **Server-Side Rendering (SSR) & Static Site Generation (SSG):** Leverages Next.js features for optimal performance.

## Tech Stack

*   **Framework:** Next.js (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **UI Components:** ShadCN UI, Lucide React (Icons)
*   **Backend:** Firebase (Authentication, Firestore)
*   **Rich Text Editor:** TipTap
*   **Form Management:** React Hook Form, Zod (Validation)

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

3.  **Set up Firebase:**
    *   Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/).
    *   Enable **Firestore Database**. Create the required collections (`personalDetails`, `blogPosts`, `projects`) and the `main` document within `personalDetails`.
    *   Enable **Authentication**. Choose desired sign-in methods (e.g., Email/Password, Google).
    *   Configure **Firestore Security Rules**. Start with secure defaults (see `firestore.rules` section below) and deploy them.
    *   Obtain your Firebase project configuration credentials.

4.  **Configure Environment Variables:**
    *   Create a file named `.env.local` in the root of your project.
    *   Add your Firebase configuration details to this file (see `.env.local` section below). **Do not commit this file to Git.**

5.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```
    The application should now be running, typically at `http://localhost:9002`.

## Environment Variables (`.env.local`)

Create a `.env.local` file in the project root and add your Firebase configuration:

```plaintext
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=1:your-app-id:web:your-web-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX # Optional

# Google GenAI (if using Genkit features, otherwise optional)
# GOOGLE_GENAI_API_KEY=your-google-genai-api-key
```

**Important:** Ensure your `.gitignore` file includes `.env.local` to prevent accidentally committing your secret keys.

## Running the Development Server

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) (or the specified port) in your browser.

## Building for Production

```bash
npm run build
npm start
```

## Admin Section

Access the admin dashboard at `/admin`. You will need to log in using the Firebase Authentication method(s) you enabled for your project.

From the dashboard, you can navigate to manage:
*   **Personal Details:** Update your bio, contact info, experience, education, etc.
*   **Blog Posts:** Create new posts, edit existing ones, or delete them.
*   **Projects:** Add new projects, modify details, or remove them.

## Firestore Setup

### Collections

Ensure the following collections exist in your Firestore database:

*   `personalDetails`: Contains a single document with the ID `main` storing your personal information.
*   `blogPosts`: Each document represents a blog post.
*   `projects`: Each document represents a project entry.

### Security Rules (`firestore.rules`)

It is crucial to secure your Firestore database. Start with rules that allow public reads but restrict writes to authenticated users. **Deploy these rules via the Firebase Console.**

**Example Secure Rules:**

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Allow public read access to all collections by default
    match /{document=**} {
      allow read: if true;
      // Deny write access by default unless specified below
      allow write: if false;
    }

    // Allow authenticated users to write their own data
    // Customize paths and conditions based on your specific needs

    // Personal Details: Allow only authenticated users to write to the 'main' document
    match /personalDetails/main {
       allow read: if true;
       allow write: if request.auth != null; // Or more specific checks if needed
    }

    // Blog Posts: Allow authenticated users to create, update, delete
    match /blogPosts/{postId} {
       allow read: if true;
       // Example: Allow create only if user is authenticated
       allow create: if request.auth != null;
       // Example: Allow update/delete only if the user is the author (requires authorId field)
       // allow update, delete: if request.auth != null && request.auth.uid == resource.data.authorId;
       // Simpler rule for now: allow any authenticated user to update/delete
        allow update, delete: if request.auth != null;
    }

    // Projects: Allow authenticated users to create, update, delete
    match /projects/{projectId} {
       allow read: if true;
       // Example: Allow any authenticated user to create/update/delete projects
       allow write: if request.auth != null;
    }
  }
}
```

**Remember to deploy your rules after making changes!**

## Deployment

When deploying to a platform like Vercel, Netlify, or Firebase Hosting:

1.  Ensure all necessary environment variables (especially Firebase keys) are configured in your deployment provider's settings. **Do not** commit your `.env.local` file.
2.  Deploy your application using the provider's standard workflow (e.g., `vercel deploy`, `netlify deploy`, or `firebase deploy`).
3.  Ensure your deployed Firestore rules are up-to-date and secure.
