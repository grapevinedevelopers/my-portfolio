import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm", // Added subtle shadow
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm", // Added subtle shadow
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm", // Added subtle shadow
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm", // Added subtle shadow
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80", // Adjusted link hover
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8 text-base", // Slightly larger text for lg
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    if (asChild) {
      // When asChild is true, Slot clones its single child and merges props.
      // Explicitly use React.Children.only to ensure Slot receives a single valid element child.
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }), "transition-shadow duration-200")}
          ref={ref}
          {...props}
        >
          {React.Children.only(children)}
        </Slot>
      );
    }

    // When asChild is false, render a regular button with children inside.
    const Comp = "button"; // Default to button if not asChild
    return <Comp className={cn(buttonVariants({ variant, size, className }), "transition-shadow duration-200")} ref={ref} {...props}>{children}</Comp>;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
