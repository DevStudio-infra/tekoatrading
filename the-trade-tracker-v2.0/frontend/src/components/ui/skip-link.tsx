"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { screenReaderClasses } from "@/lib/accessibility-utils";

interface SkipLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  targetId: string;
  children?: React.ReactNode;
}

const SkipLink = forwardRef<HTMLAnchorElement, SkipLinkProps>(({ targetId, children = "Skip to main content", className, ...props }, ref) => {
  return (
    <a
      ref={ref}
      href={`#${targetId}`}
      className={cn(
        screenReaderClasses.focusable,
        "z-50 bg-primary text-primary-foreground font-medium px-4 py-2 rounded-md shadow-lg",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className
      )}
      {...props}>
      {children}
    </a>
  );
});

SkipLink.displayName = "SkipLink";

export { SkipLink };
