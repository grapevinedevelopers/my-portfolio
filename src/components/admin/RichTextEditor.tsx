// src/components/admin/RichTextEditor.tsx
'use client';

import { useEditor, EditorContent, type EditorOptions } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
// Remove duplicate Code import as StarterKit includes it.
// import Code from '@tiptap/extension-code'; 
import TextAlign from '@tiptap/extension-text-align'; // Import TextAlign
import RichTextEditorToolbar from './RichTextEditorToolbar';
import { cn } from '@/lib/utils';
import { useEffect } from 'react'; // Import useEffect

interface RichTextEditorProps {
  value: string; // Expect HTML string
  onChange: (value: string) => void; // This prop is needed for react-hook-form integration
  placeholder?: string;
  className?: string;
  editorClassName?: string;
}

const RichTextEditor = ({
  value,
  onChange,
  placeholder,
  className,
  editorClassName,
}: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // StarterKit includes 'code' by default, configure it if needed, or leave as is.
        // Explicitly disable codeBlock if you only want inline code from StarterKit
        codeBlock: false, 
        heading: {
          levels: [2, 3],
        },
        // Other StarterKit defaults like bold, italic, strike, bulletList, orderedList are enabled
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      // Remove the separate Code extension since StarterKit includes inline code.
      // Code.configure({}), 
      TextAlign.configure({ // Add and configure TextAlign
        types: ['heading', 'paragraph'], // Apply alignment to headings and paragraphs
      }),
    ],
    content: value, // Initial content as HTML
    // Update the form state on blur (when user clicks away)
    onBlur: ({ editor }) => {
        onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg focus:outline-none min-h-[150px] max-w-full p-4 border border-input rounded-b-md',
          editorClassName
        ),
      },
    },
    // Set immediatelyRender to false to prevent SSR hydration mismatches
    immediatelyRender: false,
  });

  // Ensure editor content updates if the external 'value' prop changes (e.g., form reset)
  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.getHTML() !== value) {
      // Update the editor's content directly if the prop changes,
      // but DO NOT trigger the onChange prop here to prevent infinite loops.
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);


  return (
    <div className={cn('border rounded-md border-input ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2', className)}>
      <RichTextEditorToolbar editor={editor} />
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
};

export default RichTextEditor;
