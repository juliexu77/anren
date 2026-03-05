import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[var(--sanctuary-surface)] text-foreground border border-[var(--glass-border)] shadow-[var(--depth-shadow),var(--inner-highlight)] hover:bg-[var(--sanctuary-surface-hover)] active:scale-[0.97]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-foreground/20 bg-transparent hover:bg-foreground/10 hover:border-foreground/30 text-foreground",
        secondary: "bg-foreground/5 text-foreground border border-foreground/10 hover:bg-foreground/10",
        ghost: "hover:bg-foreground/10 text-foreground",
        link: "text-foreground underline-offset-4 hover:underline",
        cta: "bg-transparent text-foreground font-medium border border-amber-400/40 shadow-[0_0_12px_rgba(212,175,55,0.2)] hover:border-amber-400/60 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] uppercase tracking-[0.2em] text-[11px]",
        glow: "relative w-full px-8 py-3 rounded-full text-[11px] font-medium uppercase tracking-[0.2em] transition-all duration-300 hover:scale-105 active:scale-95 text-foreground/70 disabled:opacity-50 disabled:pointer-events-none bg-foreground/5",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-lg px-4",
        lg: "h-12 rounded-xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
