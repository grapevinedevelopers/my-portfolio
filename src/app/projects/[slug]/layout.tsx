// src/app/projects/[slug]/layout.tsx
import { type ReactNode } from 'react';

export default function ProjectLayout({ children }: { children: ReactNode }) {
  // This layout wraps the individual project page ([slug]/page.tsx)
  // You can add common elements for project pages here if needed,
  // or keep it simple like this.
  return <>{children}</>;
}
