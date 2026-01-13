import { ReactNode } from 'react';

export type LiveRegionPoliteness = 'polite' | 'assertive' | 'off';
export type LiveRegionRole = 'status' | 'alert' | 'log' | 'none';

export interface LiveRegionProps {
  /**
   * The content to announce
   */
  children: ReactNode;
  /**
   * The politeness level for announcements
   * - polite: Waits for user to finish current activity (default)
   * - assertive: Interrupts immediately
   * - off: No announcement
   */
  politeness?: LiveRegionPoliteness;
  /**
   * The ARIA role for the region
   * - status: General status update (default for polite)
   * - alert: Important, time-sensitive information (default for assertive)
   * - log: Sequential updates (chat messages, logs)
   * - none: No specific role
   */
  role?: LiveRegionRole;
  /**
   * Whether to announce the entire region or only changes
   * - true: Announce entire region (default)
   * - false: Announce only changes
   */
  atomic?: boolean;
  /**
   * Whether the region content is relevant
   * - true: Relevant (default)
   * - false: Not relevant (hidden from assistive tech)
   */
  relevant?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether to visually hide the region (screen reader only)
   */
  visuallyHidden?: boolean;
}

/**
 * LiveRegion component for ARIA live announcements
 *
 * A flexible wrapper for aria-live regions with configurable politeness,
 * roles, and announcement behavior. Use this for dynamic content that
 * should be announced to screen readers.
 *
 * @example
 * ```tsx
 * // Polite status update
 * <LiveRegion politeness="polite" role="status">
 *   {statusMessage}
 * </LiveRegion>
 *
 * // Assertive alert
 * <LiveRegion politeness="assertive" role="alert">
 *   Error: {errorMessage}
 * </LiveRegion>
 *
 * // Log region for chat messages
 * <LiveRegion politeness="polite" role="log" atomic={false}>
 *   {chatMessages.map(msg => <div key={msg.id}>{msg.text}</div>)}
 * </LiveRegion>
 * ```
 */
export const LiveRegion = ({
  children,
  politeness = 'polite',
  role,
  atomic = true,
  relevant = true,
  className = '',
  visuallyHidden = false,
}: LiveRegionProps) => {
  // Auto-select role based on politeness if not specified
  const effectiveRole = role || (politeness === 'assertive' ? 'alert' : 'status');

  // Build aria-relevant value
  const ariaRelevant = relevant ? 'additions text' : undefined;

  return (
    <div
      role={effectiveRole === 'none' ? undefined : effectiveRole}
      aria-live={politeness === 'off' ? undefined : politeness}
      aria-atomic={atomic}
      aria-relevant={ariaRelevant}
      className={`${visuallyHidden ? 'sr-only' : ''} ${className}`.trim()}
    >
      {children}
    </div>
  );
};

/**
 * StatusRegion - Polite status updates
 *
 * @example
 * ```tsx
 * <StatusRegion>{statusMessage}</StatusRegion>
 * ```
 */
export const StatusRegion = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <LiveRegion politeness="polite" role="status" className={className} visuallyHidden>
    {children}
  </LiveRegion>
);

/**
 * AlertRegion - Assertive alerts for critical information
 *
 * @example
 * ```tsx
 * <AlertRegion>{errorMessage}</AlertRegion>
 * ```
 */
export const AlertRegion = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <LiveRegion politeness="assertive" role="alert" className={className} visuallyHidden>
    {children}
  </LiveRegion>
);

/**
 * LogRegion - Sequential updates like chat messages or activity logs
 *
 * @example
 * ```tsx
 * <LogRegion>
 *   {messages.map(msg => <div key={msg.id}>{msg.text}</div>)}
 * </LogRegion>
 * ```
 */
export const LogRegion = ({
  children,
  className = '',
  visuallyHidden = false,
}: {
  children: ReactNode;
  className?: string;
  visuallyHidden?: boolean;
}) => (
  <LiveRegion politeness="polite" role="log" atomic={false} className={className} visuallyHidden={visuallyHidden}>
    {children}
  </LiveRegion>
);
