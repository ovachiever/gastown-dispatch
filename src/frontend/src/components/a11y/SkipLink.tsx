import { useEffect, useRef } from 'react';

export interface SkipLinkProps {
  /**
   * The ID of the target element to skip to
   */
  targetId: string;
  /**
   * The text to display in the skip link
   */
  children?: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * SkipLink component for keyboard navigation accessibility
 *
 * Provides a "skip to main content" link that's visible only on focus.
 * Helps keyboard users bypass repetitive navigation elements.
 *
 * @example
 * ```tsx
 * <SkipLink targetId="main-content">
 *   Skip to main content
 * </SkipLink>
 *
 * // Later in the DOM...
 * <main id="main-content" tabIndex={-1}>
 *   {content}
 * </main>
 * ```
 */
export const SkipLink = ({
  targetId,
  children = 'Skip to main content',
  className = '',
}: SkipLinkProps) => {
  const linkRef = useRef<HTMLAnchorElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    const target = document.getElementById(targetId);
    if (!target) {
      console.warn(`SkipLink: Target element with id "${targetId}" not found`);
      return;
    }

    // Focus the target element
    target.focus();

    // If the element is not focusable by default, make it temporarily focusable
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
      target.addEventListener(
        'blur',
        () => {
          target.removeAttribute('tabindex');
        },
        { once: true }
      );
    }

    // Scroll into view
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <a
      ref={linkRef}
      href={`#${targetId}`}
      onClick={handleClick}
      className={`
        sr-only-focusable
        fixed top-4 left-4 z-50
        bg-white dark:bg-gray-800
        text-gray-900 dark:text-gray-100
        px-4 py-2 rounded-md
        shadow-lg
        focus:not-sr-only
        focus:outline-none
        focus:ring-2
        focus:ring-blue-500
        focus:ring-offset-2
        transition-all
        ${className}
      `}
    >
      {children}
    </a>
  );
};

/**
 * Hook to ensure a target element is focusable
 *
 * Automatically adds tabindex="-1" to the target element if it's not
 * naturally focusable, enabling programmatic focus.
 *
 * @param targetId - The ID of the element to make focusable
 */
export const useSkipTarget = (targetId: string) => {
  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) {
      console.warn(`useSkipTarget: Element with id "${targetId}" not found`);
      return;
    }

    // If the element is not naturally focusable, make it focusable
    const isNaturallyFocusable =
      target.tagName === 'A' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.hasAttribute('tabindex');

    if (!isNaturallyFocusable) {
      target.setAttribute('tabindex', '-1');

      // Add outline on focus for visual feedback
      const handleFocus = () => {
        target.style.outline = '2px solid rgb(59 130 246)';
        target.style.outlineOffset = '2px';
      };

      const handleBlur = () => {
        target.style.outline = '';
        target.style.outlineOffset = '';
      };

      target.addEventListener('focus', handleFocus);
      target.addEventListener('blur', handleBlur);

      return () => {
        target.removeEventListener('focus', handleFocus);
        target.removeEventListener('blur', handleBlur);
      };
    }
  }, [targetId]);
};
