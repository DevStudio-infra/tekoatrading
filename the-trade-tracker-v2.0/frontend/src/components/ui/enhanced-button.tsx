"use client";

import { forwardRef, useState } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { announceToScreenReader, ariaAttributes, keyboardHandlers } from "@/lib/accessibility-utils";
import { useReducedMotion } from "@/lib/accessibility-utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        xl: "h-12 rounded-md px-10 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-10 w-10",
        "icon-xl": "h-12 w-12",
      },
      state: {
        default: "",
        loading: "cursor-wait",
        success: "bg-green-600 hover:bg-green-700 text-white",
        error: "bg-red-600 hover:bg-red-700 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      state: "default",
    },
  }
);

export interface EnhancedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  success?: boolean;
  successText?: string;
  error?: boolean;
  errorText?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconPosition?: "left" | "right";
  tooltip?: string;
  confirmAction?: boolean;
  confirmText?: string;
  announceOnClick?: string;
  preventDoubleClick?: boolean;
  autoResetState?: number; // milliseconds to auto-reset success/error states
}

const EnhancedButton = forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  (
    {
      className,
      variant,
      size,
      state: stateProp,
      asChild = false,
      loading = false,
      loadingText,
      success = false,
      successText,
      error = false,
      errorText,
      icon: Icon,
      iconPosition = "left",
      tooltip,
      confirmAction = false,
      confirmText = "Are you sure?",
      announceOnClick,
      preventDoubleClick = false,
      autoResetState = 2000,
      children,
      onClick,
      disabled,
      ...props
    },
    ref
  ) => {
    const [internalState, setInternalState] = useState<"default" | "loading" | "success" | "error">("default");
    const [showConfirm, setShowConfirm] = useState(false);
    const [lastClickTime, setLastClickTime] = useState(0);
    const prefersReducedMotion = useReducedMotion();

    const Comp = asChild ? Slot : "button";

    // Determine current state
    const currentState = stateProp || internalState;
    const isLoading = loading || currentState === "loading";
    const isSuccess = success || currentState === "success";
    const isError = error || currentState === "error";
    const isDisabled = disabled || isLoading;

    // Determine display text
    const getDisplayText = () => {
      if (isLoading && loadingText) return loadingText;
      if (isSuccess && successText) return successText;
      if (isError && errorText) return errorText;
      return children;
    };

    // Determine display icon
    const getDisplayIcon = () => {
      if (isLoading) return Loader2;
      if (isSuccess) return Check;
      if (isError) return AlertCircle;
      return Icon;
    };

    const DisplayIcon = getDisplayIcon();

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      // Prevent double-click if enabled
      if (preventDoubleClick) {
        const now = Date.now();
        if (now - lastClickTime < 1000) {
          e.preventDefault();
          return;
        }
        setLastClickTime(now);
      }

      // Handle confirmation
      if (confirmAction && !showConfirm) {
        setShowConfirm(true);
        announceToScreenReader(confirmText);
        return;
      }

      // Reset confirmation state
      if (showConfirm) {
        setShowConfirm(false);
      }

      // Announce to screen reader
      if (announceOnClick) {
        announceToScreenReader(announceOnClick);
      }

      // Set loading state if not controlled externally
      if (!stateProp && onClick) {
        setInternalState("loading");

        try {
          await onClick(e);

          // Set success state
          setInternalState("success");

          // Auto-reset after specified time
          if (autoResetState > 0) {
            setTimeout(() => {
              setInternalState("default");
            }, autoResetState);
          }
        } catch (error) {
          // Set error state
          setInternalState("error");

          // Auto-reset after specified time
          if (autoResetState > 0) {
            setTimeout(() => {
              setInternalState("default");
            }, autoResetState);
          }
        }
      } else if (onClick) {
        onClick(e);
      }
    };

    const handleKeyDown = keyboardHandlers.activateButton(() => {
      const syntheticEvent = new MouseEvent("click") as any;
      handleClick(syntheticEvent);
    });

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, state: currentState }),
          prefersReducedMotion ? "" : "transition-all duration-200",
          showConfirm && "ring-2 ring-yellow-500 ring-offset-2",
          className
        )}
        ref={ref}
        disabled={isDisabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        title={tooltip}
        {...ariaAttributes.describedBy(tooltip ? "button-tooltip" : undefined)}
        {...ariaAttributes.live(isLoading ? "polite" : "off")}
        {...props}>
        {/* Left Icon */}
        {DisplayIcon && iconPosition === "left" && <DisplayIcon className={cn("h-4 w-4", isLoading && !prefersReducedMotion && "animate-spin")} />}

        {/* Button Text */}
        <span className={showConfirm ? "text-yellow-600" : ""}>{showConfirm ? confirmText : getDisplayText()}</span>

        {/* Right Icon */}
        {DisplayIcon && iconPosition === "right" && <DisplayIcon className={cn("h-4 w-4", isLoading && !prefersReducedMotion && "animate-spin")} />}

        {/* Screen Reader Status */}
        <span className="sr-only">
          {isLoading && "Loading"}
          {isSuccess && "Success"}
          {isError && "Error"}
        </span>
      </Comp>
    );
  }
);

EnhancedButton.displayName = "EnhancedButton";

export { EnhancedButton, buttonVariants };
