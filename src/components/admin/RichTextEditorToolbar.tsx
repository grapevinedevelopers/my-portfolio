// src/components/admin/RichTextEditorToolbar.tsx
import type { Editor } from '@tiptap/react';
import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Heading2, Link, Unlink, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react'; // Added alignment icons
import { Button } from '@/components/ui/button';
import { useCallback } from 'react';
import { cn } from '@/lib/utils'; // Import cn

interface RichTextEditorToolbarProps {
  editor: Editor | null;
}

const RichTextEditorToolbar = ({ editor }: RichTextEditorToolbarProps) => {
  if (!editor) {
    return null;
  }

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    // Use a more robust prompt or a custom dialog for better UX
    const url = window.prompt('Enter URL', previousUrl || '');

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  // Helper to focus editor and toggle marks/nodes
  const toggleCommand = (commandName: keyof ReturnType<Editor['chain']>) => {
    const command = editor.chain().focus()[commandName];
    if (typeof command === 'function') {
        (command as Function)().run();
    }
  };

  const toggleHeading = (level: 2 | 3) => {
      editor.chain().focus().toggleHeading({ level }).run();
  }

  const setTextAlign = (alignment: 'left' | 'center' | 'right' | 'justify') => {
     editor.chain().focus().setTextAlign(alignment).run();
  };

  const isButtonActive = (type: string, options?: Record<string, any>) => editor.isActive(type, options);
  const canExecuteCommand = (commandName: keyof ReturnType<Editor['can']>) => {
       const command = editor.can().chain()[commandName];
       return typeof command === 'function' ? (command as Function)() : false;
  }
  const canExecuteHeading = (level: 2 | 3) => editor.can().chain().toggleHeading({ level }).run();
  const canExecuteTextAlign = (alignment: 'left' | 'center' | 'right' | 'justify') => editor.can().chain().focus().setTextAlign(alignment).run();


  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-input bg-muted/50 rounded-t-md">
      {/* Use individual Toggle components for better state management */}
       <Button
        variant="outline"
        size="sm"
        onClick={() => toggleCommand('toggleBold')}
        aria-pressed={isButtonActive('bold')}
        disabled={!canExecuteCommand('toggleBold')}
        className={cn("p-2", {"bg-accent text-accent-foreground": isButtonActive('bold')})} // Added padding
        aria-label="Toggle bold"
       >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => toggleCommand('toggleItalic')}
        aria-pressed={isButtonActive('italic')}
        disabled={!canExecuteCommand('toggleItalic')}
        className={cn("p-2", {"bg-accent text-accent-foreground": isButtonActive('italic')})} // Added padding
        aria-label="Toggle italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => toggleCommand('toggleStrike')}
        aria-pressed={isButtonActive('strike')}
        disabled={!canExecuteCommand('toggleStrike')}
        className={cn("p-2", {"bg-accent text-accent-foreground": isButtonActive('strike')})} // Added padding
        aria-label="Toggle strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
       <Button
        variant="outline"
        size="sm"
        onClick={() => toggleCommand('toggleCode')}
        aria-pressed={isButtonActive('code')}
        disabled={!canExecuteCommand('toggleCode')}
        className={cn("p-2", {"bg-accent text-accent-foreground": isButtonActive('code')})} // Added padding
        aria-label="Toggle code"
       >
        <Code className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => toggleHeading(2)}
        aria-pressed={isButtonActive('heading', { level: 2 })}
        disabled={!canExecuteHeading(2)}
        className={cn("p-2", {"bg-accent text-accent-foreground": isButtonActive('heading', { level: 2 })})} // Added padding
        aria-label="Toggle heading level 2"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
       <Button
        variant="outline"
        size="sm"
        onClick={() => toggleCommand('toggleBulletList')}
        aria-pressed={isButtonActive('bulletList')}
        disabled={!canExecuteCommand('toggleBulletList')}
        className={cn("p-2", {"bg-accent text-accent-foreground": isButtonActive('bulletList')})} // Added padding
        aria-label="Toggle bullet list"
       >
        <List className="h-4 w-4" />
      </Button>
       <Button
        variant="outline"
        size="sm"
        onClick={() => toggleCommand('toggleOrderedList')}
        aria-pressed={isButtonActive('orderedList')}
        disabled={!canExecuteCommand('toggleOrderedList')}
        className={cn("p-2", {"bg-accent text-accent-foreground": isButtonActive('orderedList')})} // Added padding
        aria-label="Toggle ordered list"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

       {/* Alignment Buttons */}
       <div className="flex gap-1 ml-auto md:ml-0"> {/* Adjust alignment on mobile */}
           <Button
              variant="outline"
              size="sm"
              onClick={() => setTextAlign('left')}
              aria-pressed={editor.isActive({ textAlign: 'left' })}
              disabled={!canExecuteTextAlign('left')}
              className={cn("p-2", {"bg-accent text-accent-foreground": editor.isActive({ textAlign: 'left' })})}
              aria-label="Align left"
           >
              <AlignLeft className="h-4 w-4" />
           </Button>
           <Button
              variant="outline"
              size="sm"
              onClick={() => setTextAlign('center')}
              aria-pressed={editor.isActive({ textAlign: 'center' })}
              disabled={!canExecuteTextAlign('center')}
               className={cn("p-2", {"bg-accent text-accent-foreground": editor.isActive({ textAlign: 'center' })})}
              aria-label="Align center"
           >
              <AlignCenter className="h-4 w-4" />
           </Button>
           <Button
              variant="outline"
              size="sm"
              onClick={() => setTextAlign('right')}
              aria-pressed={editor.isActive({ textAlign: 'right' })}
              disabled={!canExecuteTextAlign('right')}
              className={cn("p-2", {"bg-accent text-accent-foreground": editor.isActive({ textAlign: 'right' })})}
              aria-label="Align right"
           >
              <AlignRight className="h-4 w-4" />
           </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTextAlign('justify')}
              aria-pressed={editor.isActive({ textAlign: 'justify' })}
              disabled={!canExecuteTextAlign('justify')}
              className={cn("p-2", {"bg-accent text-accent-foreground": editor.isActive({ textAlign: 'justify' })})}
              aria-label="Justify text"
           >
              <AlignJustify className="h-4 w-4" />
           </Button>
       </div>


      {/* Link Buttons remain the same */}
       <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={setLink}
          data-active={isButtonActive('link')}
          disabled={!editor.can().chain().focus().extendMarkRange('link').run()} // Check if link mark can be applied/extended
          className="data-[active=true]:bg-accent data-[active=true]:text-accent-foreground p-2" // Added padding
          aria-label="Set link"
        >
          <Link className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!isButtonActive('link')} // Only enable if a link is active
          className="p-2" // Added padding
          aria-label="Unset link"
        >
          <Unlink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default RichTextEditorToolbar;
