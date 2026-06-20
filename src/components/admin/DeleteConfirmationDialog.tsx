// src/components/admin/DeleteConfirmationDialog.tsx
'use client';

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface DeleteConfirmationDialogProps {
  itemId: string;
  itemName: string;
  itemType: string; // e.g., 'blog post', 'project'
  deleteAction: (id: string) => Promise<{ success: boolean; message?: string; error?: string }>; // Server action prop
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  itemId,
  itemName,
  itemType,
  deleteAction,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteAction(itemId);
      if (result.success) {
        toast({
          title: 'Success',
          description: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} "${itemName}" deleted successfully.`,
          variant: 'default',
        });
        setIsOpen(false); // Close dialog on success
        // Optionally refresh the page or revalidate data
         router.refresh(); // Refresh server components on the current route
      } else {
        toast({
          title: `Error Deleting ${itemType}`,
          description: result.message || 'An unknown error occurred.',
          variant: 'destructive',
        });
        console.error(`Server Action Error deleting ${itemType} ${itemId}:`, result.error);
      }
    } catch (error) {
      console.error(`Client-side error deleting ${itemType} ${itemId}:`, error);
      toast({
        title: 'Deletion Error',
        description: `Could not delete the ${itemType}. Please check your connection or server logs.`,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-1 h-4 w-4" /> Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the {itemType}: <br />
            <strong className="text-foreground">"{itemName}"</strong> (ID: {itemId}).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
            {isDeleting ? 'Deleting...' : 'Yes, delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmationDialog;
