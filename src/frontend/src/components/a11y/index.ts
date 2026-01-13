/**
 * Accessibility components and utilities
 *
 * Provides React components and utilities for building accessible user interfaces.
 * Adapted from gastown_ui accessibility patterns (Svelte -> React).
 */

// Components
export { Announcer, useAnnouncer } from './Announcer';
export type { AnnouncerProps, AnnouncerPoliteness, AnnouncerHandle } from './Announcer';

export { SkipLink, useSkipTarget } from './SkipLink';
export type { SkipLinkProps } from './SkipLink';

export { LiveRegion, StatusRegion, AlertRegion, LogRegion } from './LiveRegion';
export type { LiveRegionProps, LiveRegionPoliteness, LiveRegionRole } from './LiveRegion';

// Utilities
export {
  focusRing,
  focusVisibleClasses,
  srOnlyClass,
  srOnlyFocusableClass,
  prefersReducedMotion,
  usePrefersReducedMotion,
  useFocusRing,
  useFocusTrap,
  isAriaHidden,
  getAccessibleName,
} from './utils';
