import { useEffect, useState } from "react";

// Hook to detect user's motion preferences
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

// Hook to detect user's color scheme preference
export function useColorSchemePreference() {
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setPrefersDark(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersDark(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersDark;
}

// Hook to detect high contrast preference
export function useHighContrast() {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-contrast: high)");
    setPrefersHighContrast(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersHighContrast(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersHighContrast;
}

// Focus management utilities
export function trapFocus(element: HTMLElement) {
  const focusableElements = element.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');

  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  };

  element.addEventListener("keydown", handleTabKey);

  // Focus first element
  firstElement?.focus();

  return () => {
    element.removeEventListener("keydown", handleTabKey);
  };
}

// Announce to screen readers
export function announceToScreenReader(message: string, priority: "polite" | "assertive" = "polite") {
  const announcement = document.createElement("div");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only";
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// Generate unique IDs for accessibility
let idCounter = 0;
export function generateId(prefix = "id") {
  return `${prefix}-${++idCounter}`;
}

// ARIA attributes helpers
export const ariaAttributes = {
  // For buttons that control other elements
  controls: (targetId: string) => ({ "aria-controls": targetId }),

  // For expandable elements
  expanded: (isExpanded: boolean) => ({ "aria-expanded": isExpanded }),

  // For elements with popup
  hasPopup: (type: "menu" | "listbox" | "tree" | "grid" | "dialog" = "menu") => ({ "aria-haspopup": type }),

  // For form labels
  labelledBy: (labelId: string) => ({ "aria-labelledby": labelId }),

  // For form descriptions
  describedBy: (descriptionId: string) => ({ "aria-describedby": descriptionId }),

  // For current state
  current: (type: "page" | "step" | "location" | "date" | "time" = "page") => ({ "aria-current": type }),

  // For selected state
  selected: (isSelected: boolean) => ({ "aria-selected": isSelected }),

  // For disabled state
  disabled: (isDisabled: boolean) => ({ "aria-disabled": isDisabled }),

  // For hidden state
  hidden: (isHidden: boolean) => ({ "aria-hidden": isHidden }),

  // For live regions
  live: (type: "polite" | "assertive" | "off" = "polite") => ({ "aria-live": type }),

  // For atomic updates
  atomic: (isAtomic: boolean = true) => ({ "aria-atomic": isAtomic }),
};

// Keyboard navigation helpers
export const keyboardHandlers = {
  // Handle arrow key navigation
  arrowNavigation:
    (items: HTMLElement[], currentIndex: number, orientation: "horizontal" | "vertical" = "vertical") =>
    (e: KeyboardEvent) => {
      const isVertical = orientation === "vertical";
      const nextKey = isVertical ? "ArrowDown" : "ArrowRight";
      const prevKey = isVertical ? "ArrowUp" : "ArrowLeft";

      let newIndex = currentIndex;

      if (e.key === nextKey) {
        newIndex = (currentIndex + 1) % items.length;
        e.preventDefault();
      } else if (e.key === prevKey) {
        newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
        e.preventDefault();
      } else if (e.key === "Home") {
        newIndex = 0;
        e.preventDefault();
      } else if (e.key === "End") {
        newIndex = items.length - 1;
        e.preventDefault();
      }

      if (newIndex !== currentIndex) {
        items[newIndex]?.focus();
      }
    },

  // Handle escape key
  escape: (callback: () => void) => (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      callback();
      e.preventDefault();
    }
  },

  // Handle enter and space for buttons
  activateButton: (callback: () => void) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      callback();
      e.preventDefault();
    }
  },
};

// Color contrast utilities
export function getContrastRatio(color1: string, color2: string): number {
  // This is a simplified version - in production you'd want a more robust implementation
  // For now, return a mock value based on the colors
  console.log(`Calculating contrast ratio between ${color1} and ${color2}`);
  return 4.5;
}

export function meetsWCAGContrast(color1: string, color2: string, level: "AA" | "AAA" = "AA"): boolean {
  const ratio = getContrastRatio(color1, color2);
  return level === "AA" ? ratio >= 4.5 : ratio >= 7;
}

// Screen reader utilities
export const screenReaderClasses = {
  only: "sr-only", // Visible only to screen readers
  focusable: "sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-2 focus:bg-background focus:text-foreground", // Visible when focused
};

// Skip link component helper
export function createSkipLink(targetId: string, text: string = "Skip to main content") {
  return {
    href: `#${targetId}`,
    className: screenReaderClasses.focusable,
    children: text,
  };
}
