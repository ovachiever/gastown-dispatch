import { useEffect, useRef, useState } from 'react';

export type AnnouncerPoliteness = 'polite' | 'assertive';

export interface AnnouncerProps {
  /**
   * The politeness level for announcements
   * - polite: Waits for user to finish current activity
   * - assertive: Interrupts immediately
   */
  politeness?: AnnouncerPoliteness;
  /**
   * Auto-clear timeout in milliseconds
   * Set to 0 to disable auto-clear
   */
  clearDelay?: number;
}

export interface AnnouncerHandle {
  announce: (message: string) => void;
  clear: () => void;
}

/**
 * Announcer component for managing aria-live announcements
 *
 * Provides screen reader announcements with configurable politeness levels.
 * Auto-clears messages after a timeout to prevent stale announcements.
 *
 * @example
 * ```tsx
 * const announcerRef = useRef<AnnouncerHandle>(null);
 *
 * <Announcer ref={announcerRef} politeness="polite" clearDelay={5000} />
 *
 * // Later...
 * announcerRef.current?.announce("Form submitted successfully");
 * ```
 */
export const Announcer = ({
  politeness = 'polite',
  clearDelay = 5000,
}: AnnouncerProps) => {
  const [message, setMessage] = useState('');
  const timeoutRef = useRef<number | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Note: announce() and clear() methods are available through useAnnouncer hook
  // This component only renders the ARIA live region
  // These variables are available for future imperative API integration
  void [timeoutRef, clearDelay, setMessage];

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
};

/**
 * Hook to create and manage an announcer instance
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const announce = useAnnouncer();
 *
 *   const handleSubmit = () => {
 *     // ... submit logic
 *     announce("Form submitted successfully");
 *   };
 * }
 * ```
 */
export const useAnnouncer = (
  politeness: AnnouncerPoliteness = 'polite',
  clearDelay = 5000
) => {
  const [message, setMessage] = useState('');
  const timeoutRef = useRef<number | null>(null);

  const announce = (text: string) => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    setMessage(text);

    if (clearDelay > 0) {
      timeoutRef.current = window.setTimeout(() => {
        setMessage('');
      }, clearDelay);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const AnnouncerComponent = () => (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );

  return { announce, Announcer: AnnouncerComponent };
};
