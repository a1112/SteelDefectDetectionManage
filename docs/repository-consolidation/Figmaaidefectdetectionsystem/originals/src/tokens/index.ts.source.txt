/**
 * =============================================================================
 * DESIGN TOKENS
 * Steel Defect Detection Management System
 *
 * A centralized design token system for modern industrial interfaces.
 * All design values are defined here and used throughout the application.
 * =============================================================================
 */

// =============================================================================
// COLOR TOKENS
// =============================================================================

export type ColorToken =
  | "primary"
  | "primary-foreground"
  | "secondary"
  | "secondary-foreground"
  | "accent"
  | "accent-foreground"
  | "muted"
  | "muted-foreground"
  | "destructive"
  | "destructive-foreground"
  | "success"
  | "success-foreground"
  | "warning"
  | "warning-foreground"
  | "info"
  | "info-foreground"
  | "background"
  | "foreground"
  | "card"
  | "card-foreground"
  | "popover"
  | "popover-foreground"
  | "border"
  | "input"
  | "ring";

export const colorTokens: Record<ColorToken, string> = {
  "primary": "var(--primary)",
  "primary-foreground": "var(--primary-foreground)",
  "secondary": "var(--secondary)",
  "secondary-foreground": "var(--secondary-foreground)",
  "accent": "var(--accent)",
  "accent-foreground": "var(--accent-foreground)",
  "muted": "var(--muted)",
  "muted-foreground": "var(--muted-foreground)",
  "destructive": "var(--destructive)",
  "destructive-foreground": "var(--destructive-foreground)",
  "success": "var(--success)",
  "success-foreground": "var(--success-foreground)",
  "warning": "var(--warning)",
  "warning-foreground": "var(--warning-foreground)",
  "info": "var(--info)",
  "info-foreground": "var(--info-foreground)",
  "background": "var(--background)",
  "foreground": "var(--foreground)",
  "card": "var(--card)",
  "card-foreground": "var(--card-foreground)",
  "popover": "var(--popover)",
  "popover-foreground": "var(--popover-foreground)",
  "border": "var(--border)",
  "input": "var(--input)",
  "ring": "var(--ring)",
} as const;

// =============================================================================
// SPACING TOKENS
// =============================================================================

export type SpacingToken =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl";

export const spacingTokens: Record<SpacingToken, string> = {
  "xs": "var(--spacing-xs)",    // 4px
  "sm": "var(--spacing-sm)",     // 8px
  "md": "var(--spacing-md)",     // 16px
  "lg": "var(--spacing-lg)",     // 24px
  "xl": "var(--spacing-xl)",     // 32px
  "2xl": "var(--spacing-2xl)",   // 40px
  "3xl": "var(--spacing-3xl)",   // 48px
  "4xl": "var(--spacing-4xl)",   // 64px
} as const;

// =============================================================================
// RADIUS TOKENS
// =============================================================================

export type RadiusToken =
  | "none"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "full";

export const radiusTokens: Record<RadiusToken, string> = {
  "none": "var(--radius-none)",
  "sm": "var(--radius-sm)",
  "md": "var(--radius-md)",
  "lg": "var(--radius-lg)",
  "xl": "var(--radius-xl)",
  "2xl": "var(--radius-2xl)",
  "full": "var(--radius-full)",
} as const;

// =============================================================================
// SHADOW TOKENS
// =============================================================================

export type ShadowToken =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "inner"
  | "glow"
  | "glow-lg"
  | "none";

export const shadowTokens: Record<ShadowToken, string> = {
  "sm": "var(--shadow-sm)",
  "md": "var(--shadow-md)",
  "lg": "var(--shadow-lg)",
  "xl": "var(--shadow-xl)",
  "2xl": "var(--shadow-2xl)",
  "inner": "var(--shadow-inner)",
  "glow": "var(--shadow-glow)",
  "glow-lg": "var(--shadow-glow-lg)",
  "none": "none",
} as const;

// =============================================================================
// ANIMATION TOKENS
// =============================================================================

export type DurationToken =
  | "instant"
  | "fast"
  | "normal"
  | "slow"
  | "slower";

export const durationTokens: Record<DurationToken, string> = {
  "instant": "var(--duration-instant)",   // 100ms
  "fast": "var(--duration-fast)",         // 150ms
  "normal": "var(--duration-normal)",     // 200ms
  "slow": "var(--duration-slow)",         // 300ms
  "slower": "var(--duration-slower)",     // 500ms
} as const;

export type EasingToken =
  | "linear"
  | "in"
  | "out"
  | "in-out"
  | "bounce"
  | "elastic";

export const easingTokens: Record<EasingToken, string> = {
  "linear": "var(--easing-linear)",
  "in": "var(--easing-in)",
  "out": "var(--easing-out)",
  "in-out": "var(--easing-in-out)",
  "bounce": "var(--easing-bounce)",
  "elastic": "var(--easing-elastic)",
} as const;

export type AnimationToken = `${DurationToken} ${EasingToken}`;

// =============================================================================
// Z-INDEX TOKENS
// =============================================================================

export type ZIndexToken =
  | "base"
  | "dropdown"
  | "sticky"
  | "fixed"
  | "modal-backdrop"
  | "modal"
  | "popover"
  | "tooltip"
  | "toast"
  | "max";

export const zIndexTokens: Record<ZIndexToken, number> = {
  "base": 0,
  "dropdown": 10,
  "sticky": 20,
  "fixed": 30,
  "modal-backdrop": 40,
  "modal": 50,
  "popover": 60,
  "tooltip": 70,
  "toast": 80,
  "max": 9999,
} as const;

// =============================================================================
// FONT SIZE TOKENS
// =============================================================================

export type FontSizeToken =
  | "xs"
  | "sm"
  | "base"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl";

export const fontSizeTokens: Record<FontSizeToken, string> = {
  "xs": "var(--font-size-xs)",      // 12px
  "sm": "var(--font-size-sm)",      // 14px
  "base": "var(--font-size-base)",  // 16px
  "lg": "var(--font-size-lg)",      // 18px
  "xl": "var(--font-size-xl)",      // 20px
  "2xl": "var(--font-size-2xl)",    // 24px
  "3xl": "var(--font-size-3xl)",    // 30px
  "4xl": "var(--font-size-4xl)",    // 36px
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get a CSS color token value
 */
export function color(token: ColorToken): string {
  return colorTokens[token];
}

/**
 * Get a CSS spacing token value
 */
export function spacing(token: SpacingToken): string {
  return spacingTokens[token];
}

/**
 * Get a CSS radius token value
 */
export function radius(token: RadiusToken): string {
  return radiusTokens[token];
}

/**
 * Get a CSS shadow token value
 */
export function shadow(token: ShadowToken): string {
  return shadowTokens[token];
}

/**
 * Get a CSS duration token value
 */
export function duration(token: DurationToken): string {
  return durationTokens[token];
}

/**
 * Get a CSS easing token value
 */
export function easing(token: EasingToken): string {
  return easingTokens[token];
}

/**
 * Get a z-index numeric value
 */
export function zIndex(token: ZIndexToken): number {
  return zIndexTokens[token];
}

/**
 * Get a CSS font-size token value
 */
export function fontSize(token: FontSizeToken): string {
  return fontSizeTokens[token];
}

/**
 * Build a transition string using duration and easing tokens
 */
export function transition(
  properties: string[],
  durationToken: DurationToken = "normal",
  easingToken: EasingToken = "out"
): string {
  return properties
    .map((prop) => `${prop} ${duration(durationToken)} ${easing(easingToken)}`)
    .join(", ");
}

// =============================================================================
// TOKEN COLLECTION
// =============================================================================

export const designTokens = {
  color: colorTokens,
  spacing: spacingTokens,
  radius: radiusTokens,
  shadow: shadowTokens,
  duration: durationTokens,
  easing: easingTokens,
  zIndex: zIndexTokens,
  fontSize: fontSizeTokens,
} as const;

export type DesignTokens = typeof designTokens;
