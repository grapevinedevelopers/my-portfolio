// src/app/admin/details/page.tsx
import PersonalDetailsForm from '@/components/admin/PersonalDetailsForm';
import { getPersonalDetails } from '@/services/personalDetailsService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { User } from 'lucide-react';

export default async function AdminDetailsPage() {
  // Fetch initial data for the form
  const personalDetails = await getPersonalDetails();

  return (
    <div className="container mx-auto max-w-screen-lg px-4 py-12 md:py-16 lg:py-20">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <User className="w-6 h-6 text-primary" />
            <CardTitle className="text-2xl font-bold">Edit Personal Details</CardTitle>
          </div>
          <CardDescription>
            Update your personal information, bio, social links, experience, and education.
            Changes will be reflected on the public portfolio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PersonalDetailsForm initialData={personalDetails} />
        </CardContent>
      </Card>
    </div>
  );
}
