import { useEffect, useState } from 'react';

/**
 * Accessibility utilities for focus management, screen readers, and motion preferences
 */

/**
 * Focus ring utility classes for different scenarios
 */
export const focusRing = {
  /**
   * Default focus ring (blue)
   */
  default:
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-blue-400',
  /**
   * Focus ring for dark backgrounds
   */
  light:
    'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800',
  /**
   * Focus ring for light backgrounds
   */
  dark: 'focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2',
  /**
   * Visible focus ring for interactive elements
   */
  visible:
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-blue-400',
  /**
   * Focus ring that only shows when using keyboard navigation
   */
  keyboard: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
};

/**
 * Adds visible focus indicators only for keyboard navigation
 */
export const focusVisibleClasses = [
  'focus:outline-none',
  'focus-visible:outline-2',
  'focus-visible:outline-offset-2',
  'focus-visible:outline-blue-500',
  'dark:focus-visible:outline-blue-400',
].join(' ');

/**
 * Screen reader only CSS class
 * Visually hides content while keeping it accessible to screen readers
 */
export const srOnlyClass = 'sr-only';

/**
 * Screen reader only on focus CSS class
 * Shows content when focused (e.g., skip links)
 */
export const srOnlyFocusableClass = 'sr-only-focusable';

/**
 * Utility function to check if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Hook to detect user's motion preference
 *
 * @returns boolean indicating if user prefers reduced motion
 *
 * @example
 * ```tsx
 * const reducedMotion = usePrefersReducedMotion();
 *
 * <motion.div
 *   animate={{ opacity: 1 }}
 *   transition={{ duration: reducedMotion ? 0 : 0.3 }}
 * />
 * ```
 */
export const usePrefersReducedMotion = (): boolean => {
  const [prefersReducedMotionValue, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotionValue;
};

/**
 * useFocusRing - Hook to manage focus ring visibility
 *
 * Adds a class to track keyboard vs mouse focus for better UX.
 * Shows focus rings only for keyboard navigation.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useFocusRing();
 *
 *   return <button>Click me</button>
 * }
 * ```
 */
export const useFocusRing = () => {
  useEffect(() => {
    const handleMouseDown = () => {
      document.body.classList.add('no-focus-ring');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        document.body.classList.remove('no-focus-ring');
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
};

/**
 * Hook to manage focus trap within a container
 *
 * Useful for modals and dialogs to keep focus contained within a specific region
 *
 * @param containerRef - Ref to the container element
 * @param active - Whether the trap is active
 */
export const useFocusTrap = (containerRef: React.RefObject<HTMLElement>, active = true) => {
  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      // Trap focus within the region
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, active]);
};

/**
 * Utility to check if element is visible to screen readers
 */
export const isAriaHidden = (element: HTMLElement): boolean => {
  if (element.getAttribute('aria-hidden') === 'true') {
    return true;
  }

  const parent = element.parentElement;
  if (parent) {
    return isAriaHidden(parent);
  }

  return false;
};

/**
 * Utility to get accessible name for an element
 */
export const getAccessibleName = (element: HTMLElement): string => {
  // Check aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  // Check aria-labelledby
  const ariaLabelledby = element.getAttribute('aria-labelledby');
  if (ariaLabelledby) {
    const labelElement = document.getElementById(ariaLabelledby);
    if (labelElement) return labelElement.textContent || '';
  }

  // Check title
  const title = element.getAttribute('title');
  if (title) return title;

  // Fallback to text content
  return element.textContent || '';
};
