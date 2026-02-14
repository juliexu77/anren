import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Card Component - Dusk Theme
 * - Liquid glass effect
 * - Subtle borders with transparency
 * - Diffused shadows
 */

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Shape: Rounded corners
      "rounded-xl text-card-foreground",
      // Border: Glass effect using theme tokens
      "border border-[var(--glass-border)]",
      // Background: Glass overlay
      "bg-[image:linear-gradient(180deg,var(--glass-overlay-start),var(--glass-overlay-end))]",
      // Shadow: Glass depth
      "shadow-[0_8px_20px_var(--glass-shadow),inset_0_1px_0_var(--glass-highlight)]",
      // Backdrop blur
      "backdrop-blur-sm",
      // Transition
      "transition-shadow duration-300",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    // Generous vertical padding for tactile feel
    <div ref={ref} className={cn("flex flex-col space-y-2 p-6 pb-4", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    // Weight 600, tracking -0.02em per Rare Beauty typography
    <h3 ref={ref} className={cn("text-lg font-semibold leading-tight tracking-[-0.02em]", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    // Body weight 400, increased line-height
    <p ref={ref} className={cn("text-sm text-muted-foreground font-normal leading-relaxed", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    // Generous horizontal padding
    <div ref={ref} className={cn("px-6 pb-2", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center px-6 pb-6 pt-2", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
