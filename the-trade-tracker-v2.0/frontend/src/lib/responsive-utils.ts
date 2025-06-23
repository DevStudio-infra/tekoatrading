import { useEffect, useState } from "react";

// Breakpoint definitions (mobile-first approach)
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

// Hook to detect current breakpoint
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("lg");

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;

      if (width >= breakpoints["2xl"]) setBreakpoint("2xl");
      else if (width >= breakpoints.xl) setBreakpoint("xl");
      else if (width >= breakpoints.lg) setBreakpoint("lg");
      else if (width >= breakpoints.md) setBreakpoint("md");
      else if (width >= breakpoints.sm) setBreakpoint("sm");
      else setBreakpoint("xs");
    };

    updateBreakpoint();
    window.addEventListener("resize", updateBreakpoint);

    return () => window.removeEventListener("resize", updateBreakpoint);
  }, []);

  return breakpoint;
}

// Hook to check if screen is mobile
export function useIsMobile() {
  const breakpoint = useBreakpoint();
  return breakpoint === "xs" || breakpoint === "sm";
}

// Hook to check if screen is tablet
export function useIsTablet() {
  const breakpoint = useBreakpoint();
  return breakpoint === "md";
}

// Hook to check if screen is desktop
export function useIsDesktop() {
  const breakpoint = useBreakpoint();
  return breakpoint === "lg" || breakpoint === "xl" || breakpoint === "2xl";
}

// Enhanced hook to detect touch device with better detection
export function useIsTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      // More comprehensive touch detection
      const hasTouchSupport =
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-expect-error - msMaxTouchPoints is legacy IE property
        navigator.msMaxTouchPoints > 0 ||
        // Check for touch APIs
        "TouchEvent" in window ||
        // Check for mobile user agents as fallback
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      setIsTouchDevice(hasTouchSupport);
    };

    checkTouchDevice();

    // Listen for touch events to dynamically detect touch usage
    const handleTouchStart = () => {
      setIsTouchDevice(true);
      window.removeEventListener("touchstart", handleTouchStart);
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
    };
  }, []);

  return isTouchDevice;
}

// Enhanced touch-friendly size utilities with better spacing
export const touchSizes = {
  small: "min-h-[44px] min-w-[44px] p-2", // iOS minimum + padding
  medium: "min-h-[48px] min-w-[48px] p-3", // Android minimum + padding
  large: "min-h-[56px] min-w-[56px] p-4", // Comfortable + padding
  xlarge: "min-h-[64px] min-w-[64px] p-5", // Extra comfortable for primary actions
} as const;

// Get touch-friendly classes based on device
export function getTouchFriendlyClasses(isTouchDevice: boolean, size: keyof typeof touchSizes = "medium") {
  if (!isTouchDevice) return "";

  const baseClasses = touchSizes[size];
  const interactionClasses = "active:scale-95 transition-transform duration-150";

  return `${baseClasses} ${interactionClasses}`;
}

// Enhanced responsive grid classes generator with better mobile handling
export function getResponsiveGridClasses(config: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number; "2xl"?: number; gap?: string; mobileFirst?: boolean }) {
  const classes: string[] = [];

  // Mobile-first approach
  if (config.mobileFirst !== false) {
    classes.push("grid");
    if (config.gap) classes.push(`gap-${config.gap}`);
  }

  if (config.xs) classes.push(`grid-cols-${config.xs}`);
  if (config.sm) classes.push(`sm:grid-cols-${config.sm}`);
  if (config.md) classes.push(`md:grid-cols-${config.md}`);
  if (config.lg) classes.push(`lg:grid-cols-${config.lg}`);
  if (config.xl) classes.push(`xl:grid-cols-${config.xl}`);
  if (config["2xl"]) classes.push(`2xl:grid-cols-${config["2xl"]}`);

  return classes.join(" ");
}

// Enhanced responsive spacing classes generator
export function getResponsiveSpacingClasses(config: { xs?: string; sm?: string; md?: string; lg?: string; xl?: string; "2xl"?: string; type?: "padding" | "margin" | "gap" }) {
  const classes: string[] = [];
  const prefix = config.type ? (config.type === "padding" ? "p" : config.type === "margin" ? "m" : "gap") : "";

  if (config.xs) classes.push(`${prefix}-${config.xs}`);
  if (config.sm) classes.push(`sm:${prefix}-${config.sm}`);
  if (config.md) classes.push(`md:${prefix}-${config.md}`);
  if (config.lg) classes.push(`lg:${prefix}-${config.lg}`);
  if (config.xl) classes.push(`xl:${prefix}-${config.xl}`);
  if (config["2xl"]) classes.push(`2xl:${prefix}-${config["2xl"]}`);

  return classes.join(" ");
}

// Enhanced responsive text size utilities
export const responsiveTextSizes = {
  xs: "text-xs sm:text-sm",
  sm: "text-sm sm:text-base",
  base: "text-base sm:text-lg",
  lg: "text-lg sm:text-xl",
  xl: "text-xl sm:text-2xl",
  "2xl": "text-2xl sm:text-3xl",
  "3xl": "text-3xl sm:text-4xl",
} as const;

// Mobile-first container utilities
export const containerClasses = {
  mobile: "px-4 sm:px-6",
  tablet: "px-6 md:px-8",
  desktop: "px-8 lg:px-12",
  full: "px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16",
} as const;

// Mobile navigation utilities
export function getMobileNavClasses(isOpen: boolean) {
  return {
    overlay: `fixed inset-0 bg-black/50 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"} z-40`,
    panel: `fixed inset-y-0 left-0 w-80 bg-background shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"} z-50`,
    backdrop: "md:hidden",
  };
}

// Responsive table utilities for mobile-first data tables
export function getResponsiveTableClasses(isMobile: boolean) {
  if (isMobile) {
    return {
      container: "space-y-4",
      card: "bg-card border rounded-lg p-4 shadow-sm",
      row: "space-y-2",
      label: "text-sm font-medium text-muted-foreground",
      value: "text-sm font-mono",
      actions: "flex gap-2 pt-2 border-t",
    };
  }

  return {
    container: "overflow-x-auto",
    table: "min-w-full divide-y divide-border",
    header: "bg-muted/50",
    row: "hover:bg-muted/50 transition-colors",
    cell: "px-6 py-4 whitespace-nowrap text-sm",
    actions: "flex gap-2",
  };
}

// Responsive form utilities
export function getResponsiveFormClasses(isMobile: boolean) {
  return {
    container: isMobile ? "space-y-6" : "space-y-8",
    section: isMobile ? "space-y-4" : "space-y-6",
    group: isMobile ? "space-y-2" : "grid grid-cols-2 gap-4",
    input: isMobile ? "w-full" : "col-span-1",
    fullWidth: "col-span-2",
    actions: isMobile ? "space-y-2" : "flex gap-4 justify-end",
  };
}

// Enhanced viewport utilities
export function useViewportSize() {
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1024,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
  });

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return viewportSize;
}

// Safe area utilities for devices with notches/rounded corners
export function useSafeArea() {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    const updateSafeArea = () => {
      if (typeof window !== "undefined" && CSS.supports("padding-top: env(safe-area-inset-top)")) {
        const computedStyle = getComputedStyle(document.documentElement);
        setSafeArea({
          top: parseInt(computedStyle.getPropertyValue("--safe-area-inset-top") || "0"),
          right: parseInt(computedStyle.getPropertyValue("--safe-area-inset-right") || "0"),
          bottom: parseInt(computedStyle.getPropertyValue("--safe-area-inset-bottom") || "0"),
          left: parseInt(computedStyle.getPropertyValue("--safe-area-inset-left") || "0"),
        });
      }
    };

    updateSafeArea();
    window.addEventListener("resize", updateSafeArea);
    return () => window.removeEventListener("resize", updateSafeArea);
  }, []);

  return safeArea;
}

// Device orientation utilities
export function useDeviceOrientation() {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? "portrait" : "landscape");
    };

    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);

    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  return orientation;
}

// Performance-optimized responsive image utilities
export function getResponsiveImageProps(src: string, alt: string, sizes?: string) {
  return {
    src,
    alt,
    sizes: sizes || "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
    loading: "lazy" as const,
    className: "w-full h-auto object-cover",
    style: { aspectRatio: "16/9" },
  };
}

// Mobile-first CSS-in-JS utilities
export function createResponsiveStyles(styles: { mobile?: Record<string, string>; tablet?: Record<string, string>; desktop?: Record<string, string> }) {
  return {
    ...styles.mobile,
    "@media (min-width: 768px)": styles.tablet,
    "@media (min-width: 1024px)": styles.desktop,
  };
}
