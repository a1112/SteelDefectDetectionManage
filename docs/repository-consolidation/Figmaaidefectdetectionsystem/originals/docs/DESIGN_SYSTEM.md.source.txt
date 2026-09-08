# Design System

**Steel Defect Detection Management System**

A comprehensive design system for modern industrial interfaces.

---

## Table of Contents

- [Overview](#overview)
- [Design Tokens](#design-tokens)
- [Color System](#color-system)
- [Typography](#typography)
- [Spacing](#spacing)
- [Component Variants](#component-variants)
- [Themes](#themes)
- [Animation](#animation)
- [Usage Examples](#usage-examples)

---

## Overview

This design system provides a unified visual language for the Steel Defect Detection Management System. It's built on top of:

- **TailwindCSS v4** - Utility-first CSS framework
- **CVA (Class Variance Authority)** - Component variant system
- **OKLCH** - Modern color space for better color consistency

### File Structure

```
src/
├── index.css              # Design token definitions & global styles
├── tokens/
│   ├── index.ts           # Design token utilities
│   └── variants.ts        # Component variant definitions
├── components/
│   ├── ThemeContext.tsx   # Theme system & presets
│   └── ui/                # shadcn/ui components
└── docs/
    └── DESIGN_SYSTEM.md   # This file
```

---

## Design Tokens

Design tokens are the visual design atoms of the system. They are stored as CSS custom properties and TypeScript constants.

### Accessing Tokens

#### CSS (in templates)

```css
.my-element {
  color: oklch(var(--primary));
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
}
```

#### TypeScript

```typescript
import { color, spacing, radius } from "@/tokens";

const myStyle = {
  color: color("primary"),
  padding: spacing("md"),
  borderRadius: radius("lg"),
};
```

---

## Color System

### Color Tokens

| Token | Description | Usage |
|-------|-------------|-------|
| `--primary` | Brand primary color | CTAs, links, key interactive elements |
| `--accent` | Brand accent color | Highlights, supplementary elements |
| `--background` | Page background | Main background color |
| `--foreground` | Primary text | Body text, headings |
| `--muted` | Muted background | Cards, panels, secondary areas |
| `--border` | Border color | Dividers, borders |
| `--success` | Success state | Success messages, positive indicators |
| `--warning` | Warning state | Warnings, caution indicators |
| `--info` | Info state | Informational messages |
| `--destructive` | Error/Danger state | Error messages, destructive actions |

### Color Usage Guidelines

```tsx
// Primary actions
<button className="bg-primary text-primary-foreground">Save</button>

// Secondary actions
<button className="bg-secondary text-secondary-foreground">Cancel</button>

// Destructive actions
<button className="bg-destructive text-destructive-foreground">Delete</button>

// Status indicators
<Badge variant="success">Completed</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="destructive">Failed</Badge>
```

---

## Typography

### Font Sizes

| Token | Size | CSS Value | Usage |
|-------|------|-----------|-------|
| `--font-size-xs` | 12px | 0.75rem | Captions, labels |
| `--font-size-sm` | 14px | 0.875rem | Small text, helper text |
| `--font-size-base` | 16px | 1rem | Body text |
| `--font-size-lg` | 18px | 1.125rem | Subheadings |
| `--font-size-xl` | 20px | 1.25rem | Section headings |
| `--font-size-2xl` | 24px | 1.5rem | Page headings |
| `--font-size-3xl` | 30px | 1.875rem | Large titles |
| `--font-size-4xl` | 36px | 2.25rem | Hero titles |

### Typography Hierarchy

```tsx
<h1 className="text-4xl font-bold">Page Title</h1>
<h2 className="text-2xl font-semibold">Section Title</h2>
<h3 className="text-xl font-medium">Subsection Title</h3>
<p className="text-base">Body text content</p>
<span className="text-sm text-muted-foreground">Helper text</span>
```

---

## Spacing

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-xs` | 4px | Tight spacing, icon gaps |
| `--spacing-sm` | 8px | Small gaps, compact layouts |
| `--spacing-md` | 16px | Default spacing, standard padding |
| `--spacing-lg` | 24px | Section spacing, large padding |
| `--spacing-xl` | 32px | Large gaps, component separation |
| `--spacing-2xl` | 40px | Extra large spacing |
| `--spacing-3xl` | 48px | Major sections |
| `--spacing-4xl` | 64px | Hero sections |

### Usage Examples

```tsx
// Tailwind classes (mapped to tokens)
<div className="p-4">        // padding: var(--spacing-md)
<div className="gap-2">      // gap: var(--spacing-sm)
<div className="space-y-4">  // margin-bottom: var(--spacing-md)

// Direct token usage
<div style={{ padding: "var(--spacing-lg)" }}>
```

---

## Component Variants

The component variant system provides consistent styling across all UI components using CVA.

### Button Variants

```tsx
import { buttonVariants } from "@/tokens/variants";

// Variant
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Close</Button>
<Button variant="link">Learn More</Button>
<Button variant="success">Confirm</Button>
<Button variant="warning">Retry</Button>
<Button variant="glow">Special</Button>

// Size
<Button size="xs">Extra Small</Button>
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>
<Button size="icon">
  <Icon />
</Button>

// Full width
<Button fullWidth>Full Width</Button>
```

### Input Variants

```tsx
import { inputVariants } from "@/tokens/variants";

// Size
<Input size="sm" />
<Input size="md" />
<Input size="lg" />

// State
<Input state="default" />
<Input state="error" />
<Input state="success" />
<Input state="warning" />
```

### Card Variants

```tsx
import { cardVariants } from "@/tokens/variants";

// Variant
<Card variant="default">Default</Card>
<Card variant="elevated">Elevated</Card>
<Card variant="outlined">Outlined</Card>
<Card variant="ghost">Ghost</Card>
<Card variant="glow">Glow</Card>

// Size
<Card size="sm">Small padding</Card>
<Card size="md">Medium padding</Card>
<Card size="lg">Large padding</Card>
<Card size="xl">Extra large padding</Card>

// Interactive
<Card interactive>Clickable card</Card>
```

### Badge Variants

```tsx
import { badgeVariants } from "@/tokens/variants";

// Variant
<Badge variant="default">Default</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="info">Info</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="glow">Glow</Badge>

// Size
<Badge size="xs">XS</Badge>
<Badge size="sm">SM</Badge>
<Badge size="md">MD</Badge>
<Badge size="lg">LG</Badge>

// With indicator dot
<Badge dot>New</Badge>
```

---

## Themes

### Available Themes

| ID | Name | Description |
|----|------|-------------|
| `industrial-blue` | 工业深蓝 | Classic industrial interface, professional |
| `midnight-dark` | 科技暗夜 | High contrast black, minimalist |
| `forest-dark` | 深林绿意 | Eye-friendly green tones, natural |
| `amber-alert` | 工业警示 | Attention-grabbing orange |
| `cyber-neon` | 赛博霓虹 | Futuristic neon style |
| `steel-gray` | 高级灰 | Neutral gray, understated |
| `business-light` | 简约浅色 | Bright, office-friendly |

### Using Themes

```tsx
import { useTheme, themePresets } from "@/components/ThemeContext";

function ThemeSwitcher() {
  const { currentTheme, applyThemeById } = useTheme();

  return (
    <select
      value={currentTheme.id}
      onChange={(e) => applyThemeById(e.target.value)}
    >
      {themePresets.map((theme) => (
        <option key={theme.id} value={theme.id}>
          {theme.name}
        </option>
      ))}
    </select>
  );
}
```

### Creating Custom Themes

```tsx
import type { ThemePreset } from "@/components/ThemeContext";

const customTheme: ThemePreset = {
  id: "custom-theme",
  name: "Custom Theme",
  description: "My custom theme",
  colors: {
    primary: "#3b82f6",
    accent: "#8b5cf6",
    background: "#0a0a0a",
    foreground: "#ffffff",
    muted: "#1a1a1a",
    border: "#2a2a2a",
    success: "#10b981",
    warning: "#f59e0b",
    info: "#3b82f6",
    destructive: "#ef4444",
  },
};
```

---

## Animation

### Duration Tokens

| Token | Duration | Usage |
|-------|----------|-------|
| `--duration-instant` | 100ms | Instant feedback |
| `--duration-fast` | 150ms | Quick transitions |
| `--duration-normal` | 200ms | Standard transitions (default) |
| `--duration-slow` | 300ms | Deliberate transitions |
| `--duration-slower` | 500ms | Major state changes |

### Easing Tokens

| Token | Curve | Usage |
|-------|-------|-------|
| `--easing-linear` | linear | Continuous motion |
| `--easing-in` | ease-in | Entering from off-screen |
| `--easing-out` | ease-out | Exiting, dismissals |
| `--easing-in-out` | ease-in-out | Standard transitions |
| `--easing-bounce` | bounce | Playful interactions |
| `--easing-elastic` | elastic | Attention-grabbing effects |

### Animation Classes

```tsx
// Fade animations
<div className="animate-fade-in">Fade in</div>
<div className="animate-fade-out">Fade out</div>

// Slide animations
<div className="animate-slide-in-top">Slide from top</div>
<div className="animate-slide-in-bottom">Slide from bottom</div>
<div className="animate-slide-in-left">Slide from left</div>
<div className="animate-slide-in-right">Slide from right</div>

// Scale animations
<div className="animate-scale-in">Scale in</div>
<div className="animate-scale-out">Scale out</div>

// Looping animations
<div className="animate-spin">Spinner</div>
<div className="animate-spin-slow">Slow spinner</div>
<div className="animate-pulse">Pulse</div>
<div className="animate-bounce">Bounce</div>
```

### Custom Transitions

```tsx
import { transition } from "@/tokens";

const buttonStyle = {
  transition: transition(
    ["background-color", "transform", "box-shadow"],
    "fast",
    "out"
  ),
};
```

---

## Utility Classes

### Patterns

```tsx
// Grid pattern background
<div className="bg-grid-pattern" />

// Dots pattern
<div className="bg-dots-pattern" />

// Glass morphism
<div className="glass-panel" />
<div className="glass-card" />

// Glow effects
<div className="glow" />
<div className="glow-lg" />
<div className="glow-primary" />

// Shimmer loading
<div className="shimmer" />

// Scanline effect
<div className="scanline" />

// Hide scrollbar
<div className="scrollbar-hide" />
```

---

## Usage Examples

### Styled Button with Variants

```tsx
import { buttonVariants, type ButtonVariants } from "@/tokens/variants";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariants["variant"];
  size?: ButtonVariants["size"];
}

export function Button({
  variant = "default",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
```

### Status Indicator Component

```tsx
import { statusColors, type StatusState } from "@/tokens";

interface StatusIndicatorProps {
  state: StatusState;
  label: string;
}

export function StatusIndicator({ state, label }: StatusIndicatorProps) {
  const colors = statusColors[state];

  return (
    <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1", colors.bg, colors.border)}>
      <div className={cn("h-2 w-2 rounded-full", colors.text)} />
      <span className={cn("text-sm font-medium", colors.text)}>{label}</span>
    </div>
  );
}
```

### Card with Hover Effect

```tsx
import { cardVariants, type CardVariants } from "@/tokens/variants";
import { cn } from "@/lib/utils";

interface CardProps {
  variant?: CardVariants["variant"];
  size?: CardVariants["size"];
  interactive?: boolean;
  children: React.ReactNode;
}

export function Card({
  variant = "default",
  size = "md",
  interactive = false,
  children,
}: CardProps) {
  return (
    <div className={cn(cardVariants({ variant, size, interactive }))}>
      {children}
    </div>
  );
}
```

---

## Best Practices

### DO ✅

- Use design tokens for all visual values
- Follow the component variant system
- Use semantic color tokens (e.g., `--success`) over hard colors
- Respect the spacing scale
- Use appropriate animation durations
- Ensure proper contrast ratios for accessibility

### DON'T ❌

- Don't hardcode colors, spacing, or sizes
- Don't skip the variant system
- Don't use arbitrary values (e.g., `p-[13px]`)
- Don't mix color spaces unnecessarily
- Don't override design tokens without good reason

---

## Contributing

When adding new components or modifying existing ones:

1. **Use variants from `tokens/variants.ts`** - Don't create new styling patterns
2. **Follow the existing structure** - Use CVA for component variants
3. **Document new tokens** - Update this file if adding new tokens
4. **Test in all themes** - Ensure components work in all 7 themes
5. **Check accessibility** - Verify contrast ratios and keyboard navigation

---

## Resources

- [TailwindCSS v4 Documentation](https://tailwindcss.com/docs)
- [CVA Documentation](https://cva.style/docs)
- [OKLCH Color Picker](https://oklch.com)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
