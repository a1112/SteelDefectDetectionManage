/**
 * =============================================================================
 * COMPONENT VARIANTS SYSTEM
 * Steel Defect Detection Management System
 *
 * A consistent variant system for component styling using CVA (Class Variance Authority).
 * Provides standardized sizes, states, and visual styles across all components.
 * =============================================================================
 */

import { cva, type VariantProps } from "class-variance-authority";

// =============================================================================
// SIZE VARIANTS
// =============================================================================

export const sizeVariants = {
  xs: {
    padding: "0.5rem 0.75rem",
    fontSize: "0.75rem",
    height: "1.75rem",
    gap: "0.25rem",
  },
  sm: {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    height: "2rem",
    gap: "0.375rem",
  },
  md: {
    padding: "0.625rem 1.25rem",
    fontSize: "0.9375rem",
    height: "2.5rem",
    gap: "0.5rem",
  },
  lg: {
    padding: "0.75rem 1.5rem",
    fontSize: "1rem",
    height: "2.75rem",
    gap: "0.5rem",
  },
  xl: {
    padding: "1rem 2rem",
    fontSize: "1.125rem",
    height: "3.25rem",
    gap: "0.625rem",
  },
  icon: {
    padding: "0",
    fontSize: "1rem",
    height: "2.5rem",
    width: "2.5rem",
    gap: "0",
  },
} as const;

export type Size = keyof typeof sizeVariants;

// =============================================================================
// ICON SIZE VARIANTS
// =============================================================================

export const iconSizes = {
  xs: "0.75rem",   // 12px
  sm: "0.875rem",  // 14px
  md: "1rem",      // 16px
  lg: "1.25rem",   // 20px
  xl: "1.5rem",    // 24px
  "2xl": "1.75rem", // 28px
  "3xl": "2rem",   // 32px
} as const;

export type IconSize = keyof typeof iconSizes;

// =============================================================================
// BUTTON VARIANTS
// =============================================================================

export const buttonVariants = cva(
  [
    "inline-flex",
    "items-center",
    "justify-center",
    "gap-2",
    "whitespace-nowrap",
    "rounded-md",
    "font-medium",
    "transition-all",
    "duration-200",
    "ease-out",
    "focus-visible:outline-none",
    "focus-visible:ring-2",
    "focus-visible:ring-ring",
    "focus-visible:ring-offset-2",
    "disabled:pointer-events-none",
    "disabled:opacity-50",
    "[&_svg]:pointer-events-none",
    "[&_svg]:size-4",
    "[&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-primary",
          "text-primary-foreground",
          "shadow-sm",
          "hover:bg-primary/90",
          "hover:shadow-md",
          "active:shadow-sm",
          "active:scale-[0.98]",
        ],
        destructive: [
          "bg-destructive",
          "text-destructive-foreground",
          "shadow-sm",
          "hover:bg-destructive/90",
          "hover:shadow-md",
        ],
        outline: [
          "border",
          "border-border",
          "bg-background",
          "hover:bg-accent",
          "hover:text-accent-foreground",
        ],
        secondary: [
          "bg-secondary",
          "text-secondary-foreground",
          "hover:bg-secondary/80",
        ],
        ghost: [
          "hover:bg-accent",
          "hover:text-accent-foreground",
        ],
        link: [
          "text-primary",
          "underline-offset-4",
          "hover:underline",
        ],
        success: [
          "bg-[var(--success)]",
          "text-white",
          "hover:bg-[var(--success)]/90",
          "shadow-sm",
        ],
        warning: [
          "bg-[var(--warning)]",
          "text-white",
          "hover:bg-[var(--warning)]/90",
          "shadow-sm",
        ],
        info: [
          "bg-[var(--info)]",
          "text-white",
          "hover:bg-[var(--info)]/90",
          "shadow-sm",
        ],
        glow: [
          "bg-primary",
          "text-primary-foreground",
          "shadow-[var(--shadow-glow)]",
          "hover:shadow-[var(--shadow-glow-lg)]",
          "hover:bg-primary/90",
        ],
      },
      size: {
        xs: "h-7 px-2 text-xs",
        sm: "h-8 px-3 text-sm",
        md: "h-9 px-4 text-sm",
        lg: "h-10 px-5 text-base",
        xl: "h-12 px-6 text-lg",
        icon: "h-9 w-9",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      fullWidth: false,
    },
  }
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

// =============================================================================
// INPUT VARIANTS
// =============================================================================

export const inputVariants = cva(
  [
    "flex",
    "w-full",
    "rounded-md",
    "border",
    "border-border",
    "bg-background",
    "px-3",
    "py-2",
    "text-sm",
    "ring-offset-background",
    "file:border-0",
    "file:bg-transparent",
    "file:text-sm",
    "file:font-medium",
    "placeholder:text-muted-foreground",
    "focus-visible:outline-none",
    "focus-visible:ring-2",
    "focus-visible:ring-ring",
    "focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed",
    "disabled:opacity-50",
    "transition-all",
    "duration-200",
  ],
  {
    variants: {
      size: {
        sm: "h-8 text-xs",
        md: "h-9 text-sm",
        lg: "h-10 text-base",
      },
      state: {
        default: "",
        error: "border-destructive focus-visible:ring-destructive",
        success: "border-[var(--success)] focus-visible:ring-[var(--success)]",
        warning: "border-[var(--warning)] focus-visible:ring-[var(--warning)]",
      },
    },
    defaultVariants: {
      size: "md",
      state: "default",
    },
  }
);

export type InputVariants = VariantProps<typeof inputVariants>;

// =============================================================================
// CARD VARIANTS
// =============================================================================

export const cardVariants = cva(
  [
    "rounded-lg",
    "border",
    "bg-card",
    "text-card-foreground",
    "transition-all",
    "duration-200",
  ],
  {
    variants: {
      variant: {
        default: "border-border",
        elevated: "border-transparent shadow-md hover:shadow-lg",
        outlined: "border-border bg-background",
        ghost: "border-transparent bg-transparent hover:bg-accent/50",
        glow: "border-primary/50 shadow-[var(--shadow-glow)]",
      },
      size: {
        sm: "p-3",
        md: "p-4",
        lg: "p-6",
        xl: "p-8",
      },
      interactive: {
        true: "cursor-pointer hover:border-primary/50",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      interactive: false,
    },
  }
);

export type CardVariants = VariantProps<typeof cardVariants>;

// =============================================================================
// BADGE VARIANTS
// =============================================================================

export const badgeVariants = cva(
  [
    "inline-flex",
    "items-center",
    "rounded-full",
    "border",
    "px-2.5",
    "py-0.5",
    "text-xs",
    "font-semibold",
    "transition-colors",
    "focus:outline-none",
    "focus:ring-2",
    "focus:ring-ring",
    "focus:ring-offset-2",
  ],
  {
    variants: {
      variant: {
        default: [
          "border-transparent",
          "bg-primary",
          "text-primary-foreground",
        ],
        secondary: [
          "border-transparent",
          "bg-secondary",
          "text-secondary-foreground",
        ],
        destructive: [
          "border-transparent",
          "bg-destructive",
          "text-destructive-foreground",
        ],
        outline: [
          "border-border",
          "text-foreground",
        ],
        success: [
          "border-transparent",
          "bg-[var(--success)]",
          "text-white",
        ],
        warning: [
          "border-transparent",
          "bg-[var(--warning)]",
          "text-white",
        ],
        info: [
          "border-transparent",
          "bg-[var(--info)]",
          "text-white",
        ],
        glow: [
          "border-transparent",
          "bg-primary/20",
          "text-primary",
          "shadow-[var(--shadow-glow)]",
        ],
      },
      size: {
        xs: "px-1.5 py-0 text-[10px]",
        sm: "px-2 py-0 text-xs",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
      dot: {
        true: "relative pl-4",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      dot: false,
    },
  }
);

export type BadgeVariants = VariantProps<typeof badgeVariants>;

// =============================================================================
// ALERT VARIANTS
// =============================================================================

export const alertVariants = cva(
  [
    "relative",
    "w-full",
    "rounded-lg",
    "border",
    "p-4",
    "[&>svg~*]:pl-7",
    "[&>svg+div]:translate-y-[-3px]",
    "[&>svg]:absolute",
    "[&>svg]:left-4",
    "[&>svg]:top-4",
    "[&>svg]:text-foreground",
  ],
  {
    variants: {
      variant: {
        default: "bg-background text-foreground border-border",
        destructive: [
          "border-destructive/50",
          "text-destructive",
          "bg-destructive/10",
          "[&>svg]:text-destructive",
        ],
        success: [
          "border-[var(--success)]/50",
          "text-[var(--success)]",
          "bg-[var(--success)]/10",
          "[&>svg]:text-[var(--success)]",
        ],
        warning: [
          "border-[var(--warning)]/50",
          "text-[var(--warning)]",
          "bg-[var(--warning)]/10",
          "[&>svg]:text-[var(--warning)]",
        ],
        info: [
          "border-[var(--info)]/50",
          "text-[var(--info)]",
          "bg-[var(--info)]/10",
          "[&>svg]:text-[var(--info)]",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export type AlertVariants = VariantProps<typeof alertVariants>;

// =============================================================================
// TABLE VARIANTS
// =============================================================================

export const tableVariants = cva(
  [
    "w-full",
    "caption-bottom",
    "text-sm",
  ],
  {
    variants: {
      variant: {
        default: "",
        bordered: "border",
        striped: "[&_tr:nth-child(odd)]:bg-muted/50",
        hover: "[&_tr:hover]:bg-muted/50",
      },
      size: {
        sm: "[&_th]:h-8 [&_td]:h-8 [&_th]:px-2 [&_td]:px-2 [&_th]:text-xs [&_td]:text-xs",
        md: "[&_th]:h-10 [&_td]:h-10 [&_th]:px-3 [&_td]:px-3",
        lg: "[&_th]:h-12 [&_td]:h-12 [&_th]:px-4 [&_td]:px-4 [&_th]:text-base [&_td]:text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export type TableVariants = VariantProps<typeof tableVariants>;

// =============================================================================
// STATUS STATE
// =============================================================================

export type StatusState = "idle" | "loading" | "success" | "error" | "warning";

export const statusColors: Record<StatusState, { bg: string; text: string; border: string }> = {
  idle: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
  },
  loading: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
  },
  success: {
    bg: "bg-[var(--success)]/10",
    text: "text-[var(--success)]",
    border: "border-[var(--success)]/20",
  },
  error: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/20",
  },
  warning: {
    bg: "bg-[var(--warning)]/10",
    text: "text-[var(--warning)]",
    border: "border-[var(--warning)]/20",
  },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Merge variant props with custom classes
 */
export function mergeVariants<T extends Record<string, unknown>>(
  baseClass: string,
  variants: T,
  customClasses?: string
): string {
  const variantClasses = Object.values(variants).filter(Boolean).join(" ");
  return [baseClass, variantClasses, customClasses].filter(Boolean).join(" ");
}

/**
 * Get responsive size classes
 */
export function responsiveSize(base: Size, sm?: Size, md?: Size, lg?: Size, xl?: Size): string {
  const classes = [`size-${base}`];
  if (sm) classes.push(`sm:size-${sm}`);
  if (md) classes.push(`md:size-${md}`);
  if (lg) classes.push(`lg:size-${lg}`);
  if (xl) classes.push(`xl:size-${xl}`);
  return classes.join(" ");
}

/**
 * Animation variant classes
 */
export const animationVariants = {
  fade: "animate-fade-in",
  "fade-in": "animate-fade-in",
  "fade-out": "animate-fade-out",
  "slide-top": "animate-slide-in-top",
  "slide-bottom": "animate-slide-in-bottom",
  "slide-left": "animate-slide-in-left",
  "slide-right": "animate-slide-in-right",
  scale: "animate-scale-in",
  "scale-in": "animate-scale-in",
  "scale-out": "animate-scale-out",
  spin: "animate-spin",
  "spin-slow": "animate-spin-slow",
  pulse: "animate-pulse",
  bounce: "animate-bounce",
} as const;

export type AnimationVariant = keyof typeof animationVariants;

// =============================================================================
// EXPORT ALL
// =============================================================================

export const variants = {
  button: buttonVariants,
  input: inputVariants,
  card: cardVariants,
  badge: badgeVariants,
  alert: alertVariants,
  table: tableVariants,
  sizes: sizeVariants,
  iconSizes,
  status: statusColors,
  animation: animationVariants,
} as const;
