"use client";

import { useEffect, useCallback, useRef } from "react";

interface UseKeyboardNavigationOptions {
  enabled?: boolean;
  orientation?: "horizontal" | "vertical";
  loop?: boolean;
  autoFocus?: boolean;
  onEscape?: () => void;
  onEnter?: (index: number) => void;
  onSelect?: (index: number) => void;
}

export function useKeyboardNavigation(itemsSelector: string, options: UseKeyboardNavigationOptions = {}) {
  const { enabled = true, orientation = "vertical", loop = true, autoFocus = false, onEscape, onEnter, onSelect } = options;

  const containerRef = useRef<HTMLElement>(null);
  const currentIndexRef = useRef(0);

  const getItems = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(containerRef.current.querySelectorAll(itemsSelector)) as HTMLElement[];
  }, [itemsSelector]);

  const focusItem = useCallback(
    (index: number) => {
      const items = getItems();
      if (items[index]) {
        items[index].focus();
        currentIndexRef.current = index;
      }
    },
    [getItems]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const items = getItems();
      if (items.length === 0) return;

      const currentIndex = currentIndexRef.current;
      let newIndex = currentIndex;

      const isVertical = orientation === "vertical";
      const nextKey = isVertical ? "ArrowDown" : "ArrowRight";
      const prevKey = isVertical ? "ArrowUp" : "ArrowLeft";

      switch (e.key) {
        case nextKey:
          newIndex = loop ? (currentIndex + 1) % items.length : Math.min(currentIndex + 1, items.length - 1);
          e.preventDefault();
          break;

        case prevKey:
          newIndex = loop ? (currentIndex === 0 ? items.length - 1 : currentIndex - 1) : Math.max(currentIndex - 1, 0);
          e.preventDefault();
          break;

        case "Home":
          newIndex = 0;
          e.preventDefault();
          break;

        case "End":
          newIndex = items.length - 1;
          e.preventDefault();
          break;

        case "Enter":
        case " ":
          onEnter?.(currentIndex);
          onSelect?.(currentIndex);
          e.preventDefault();
          break;

        case "Escape":
          onEscape?.();
          e.preventDefault();
          break;

        default:
          return;
      }

      if (newIndex !== currentIndex) {
        focusItem(newIndex);
      }
    },
    [enabled, orientation, loop, onEscape, onEnter, onSelect, getItems, focusItem]
  );

  // Set up keyboard event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);

  // Auto-focus first item if enabled
  useEffect(() => {
    if (autoFocus && enabled) {
      const items = getItems();
      if (items.length > 0) {
        focusItem(0);
      }
    }
  }, [autoFocus, enabled, getItems, focusItem]);

  // Update current index when focus changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    const handleFocusIn = (e: FocusEvent) => {
      const items = getItems();
      const focusedIndex = items.indexOf(e.target as HTMLElement);
      if (focusedIndex !== -1) {
        currentIndexRef.current = focusedIndex;
      }
    };

    container.addEventListener("focusin", handleFocusIn);
    return () => container.removeEventListener("focusin", handleFocusIn);
  }, [enabled, getItems]);

  return {
    containerRef,
    focusItem,
    getCurrentIndex: () => currentIndexRef.current,
    getItems,
  };
}

// Hook for managing focus within a modal or dialog
export function useFocusTrap(enabled = true) {
  const containerRef = useRef<HTMLElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    // Store the previously focused element
    previousActiveElementRef.current = document.activeElement as HTMLElement;

    // Get all focusable elements
    const getFocusableElements = () => {
      return container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') as NodeListOf<HTMLElement>;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    // Focus the first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      // Restore focus to the previously focused element
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [enabled]);

  return containerRef;
}

// Hook for managing roving tabindex
export function useRovingTabIndex(itemsSelector: string, enabled = true) {
  const containerRef = useRef<HTMLElement>(null);
  const currentIndexRef = useRef(0);

  const updateTabIndices = useCallback(
    (activeIndex: number) => {
      if (!containerRef.current || !enabled) return;

      const items = Array.from(containerRef.current.querySelectorAll(itemsSelector)) as HTMLElement[];

      items.forEach((item, index) => {
        item.tabIndex = index === activeIndex ? 0 : -1;
      });

      currentIndexRef.current = activeIndex;
    },
    [itemsSelector, enabled]
  );

  // Initialize tabindex values
  useEffect(() => {
    updateTabIndices(0);
  }, [updateTabIndices]);

  // Handle focus changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    const handleFocusIn = (e: FocusEvent) => {
      const items = Array.from(container.querySelectorAll(itemsSelector)) as HTMLElement[];
      const focusedIndex = items.indexOf(e.target as HTMLElement);

      if (focusedIndex !== -1) {
        updateTabIndices(focusedIndex);
      }
    };

    container.addEventListener("focusin", handleFocusIn);
    return () => container.removeEventListener("focusin", handleFocusIn);
  }, [itemsSelector, enabled, updateTabIndices]);

  return {
    containerRef,
    updateTabIndices,
    getCurrentIndex: () => currentIndexRef.current,
  };
}
