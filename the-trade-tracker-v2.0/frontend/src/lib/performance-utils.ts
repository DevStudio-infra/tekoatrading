import { useCallback, useEffect, useRef, useState } from "react";

// Debounce hook for performance optimization
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle hook for performance optimization
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number>(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(elementRef: React.RefObject<Element>, options: IntersectionObserverInit = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, options]);

  return isIntersecting;
}

// Virtual scrolling hook for large lists
export function useVirtualScroll<T>({ items, itemHeight, containerHeight, overscan = 5 }: { items: T[]; itemHeight: number; containerHeight: number; overscan?: number }) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length - 1, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    handleScroll,
  };
}

// Memoization utilities
export function createMemoizedSelector<T, R>(selector: (state: T) => R, equalityFn?: (a: R, b: R) => boolean) {
  let lastArgs: T | undefined;
  let lastResult: R;

  return (state: T): R => {
    if (lastArgs === undefined || !equalityFn?.(selector(state), lastResult)) {
      lastArgs = state;
      lastResult = selector(state);
    }
    return lastResult;
  };
}

// Image lazy loading hook
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || "");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const isInView = useIntersectionObserver(imgRef as React.RefObject<Element>);

  useEffect(() => {
    if (isInView && src) {
      const img = new Image();
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      img.onerror = () => {
        setIsError(true);
      };
      img.src = src;
    }
  }, [isInView, src]);

  return {
    imgRef,
    imageSrc,
    isLoaded,
    isError,
    isInView,
  };
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMeasure(name: string): void {
    performance.mark(`${name}-start`);
  }

  endMeasure(name: string): number {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    const measure = performance.getEntriesByName(name, "measure")[0];
    const duration = measure.duration;

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);

    // Clean up marks and measures
    performance.clearMarks(`${name}-start`);
    performance.clearMarks(`${name}-end`);
    performance.clearMeasures(name);

    return duration;
  }

  getAverageTime(name: string): number {
    const times = this.metrics.get(name) || [];
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  getMetrics(): Record<string, { average: number; count: number; total: number }> {
    const result: Record<string, { average: number; count: number; total: number }> = {};

    this.metrics.forEach((times, name) => {
      const total = times.reduce((a, b) => a + b, 0);
      result[name] = {
        average: total / times.length,
        count: times.length,
        total,
      };
    });

    return result;
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

// React performance hook
export function usePerformanceMonitor(name: string) {
  const monitor = PerformanceMonitor.getInstance();

  const startMeasure = useCallback(() => {
    monitor.startMeasure(name);
  }, [monitor, name]);

  const endMeasure = useCallback(() => {
    return monitor.endMeasure(name);
  }, [monitor, name]);

  return { startMeasure, endMeasure };
}

// Memory usage monitoring
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null>(null);

  useEffect(() => {
    const updateMemoryInfo = () => {
      // Check if performance.memory exists (Chrome-specific)
      if ("memory" in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000);

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
}

// Bundle size analyzer utilities
export function analyzeBundleSize() {
  const scripts = Array.from(document.querySelectorAll("script[src]"));
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));

  return {
    scripts: scripts.map((script) => ({
      src: (script as HTMLScriptElement).src,
      async: (script as HTMLScriptElement).async,
      defer: (script as HTMLScriptElement).defer,
    })),
    styles: styles.map((style) => ({
      href: (style as HTMLLinkElement).href,
    })),
  };
}

// Render optimization utilities
export function shouldComponentUpdate<T extends Record<string, unknown>>(prevProps: T, nextProps: T, keys?: (keyof T)[]): boolean {
  const keysToCheck = keys || Object.keys(nextProps);

  return keysToCheck.some((key) => prevProps[key] !== nextProps[key]);
}

// FPS monitoring
export function useFPSMonitor() {
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    let animationId: number;

    const updateFPS = () => {
      frameCount.current++;
      const currentTime = performance.now();

      if (currentTime - lastTime.current >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / (currentTime - lastTime.current)));
        frameCount.current = 0;
        lastTime.current = currentTime;
      }

      animationId = requestAnimationFrame(updateFPS);
    };

    animationId = requestAnimationFrame(updateFPS);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return fps;
}
