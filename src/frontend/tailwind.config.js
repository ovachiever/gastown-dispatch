/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // === Colors ===
      colors: {
        // Gas Town theme colors (legacy)
        gt: {
          bg: "#0f0f0f",
          surface: "#1a1a1a",
          border: "#2a2a2a",
          text: "#e5e5e5",
          muted: "#737373",
          accent: "#f59e0b",
          success: "#22c55e",
          warning: "#f59e0b",
          error: "#ef4444",
        },
        // Semantic colors using CSS variables
        background: "hsl(var(--background, 0 0% 6%))",
        foreground: "hsl(var(--foreground, 0 0% 90%))",
        card: {
          DEFAULT: "hsl(var(--card, 0 0% 10%))",
          foreground: "hsl(var(--card-foreground, 0 0% 90%))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover, 0 0% 10%))",
          foreground: "hsl(var(--popover-foreground, 0 0% 90%))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary, 45 93% 47%))",
          foreground: "hsl(var(--primary-foreground, 0 0% 0%))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary, 0 0% 15%))",
          foreground: "hsl(var(--secondary-foreground, 0 0% 90%))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted, 0 0% 15%))",
          foreground: "hsl(var(--muted-foreground, 0 0% 45%))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent, 45 93% 47%))",
          foreground: "hsl(var(--accent-foreground, 0 0% 0%))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        border: "hsl(var(--border, 0 0% 17%))",
        input: "hsl(var(--input, 0 0% 17%))",
        ring: "hsl(var(--ring, 45 93% 47%))",
        // Status colors
        status: {
          online: "hsl(var(--status-online))",
          offline: "hsl(var(--status-offline))",
          pending: "hsl(var(--status-pending))",
          idle: "hsl(var(--status-idle))",
        },
      },

      // === Typography ===
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "SF Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }], // 10px
        xs: ["0.75rem", { lineHeight: "1rem" }], // 12px
        sm: ["0.875rem", { lineHeight: "1.25rem" }], // 14px
        base: ["1rem", { lineHeight: "1.5rem" }], // 16px
        lg: ["1.125rem", { lineHeight: "1.75rem" }], // 18px
        xl: ["1.25rem", { lineHeight: "1.75rem" }], // 20px
        "2xl": ["1.5rem", { lineHeight: "2rem" }], // 24px
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }], // 30px
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }], // 36px
        "5xl": ["3rem", { lineHeight: "1" }], // 48px
        "6xl": ["3.75rem", { lineHeight: "1" }], // 60px
        "7xl": ["4.5rem", { lineHeight: "1" }], // 72px
        // Display scale
        "display-sm": ["2rem", { lineHeight: "2.5rem", letterSpacing: "-0.02em" }],
        "display-md": ["2.5rem", { lineHeight: "3rem", letterSpacing: "-0.02em" }],
        "display-lg": ["3rem", { lineHeight: "3.5rem", letterSpacing: "-0.02em" }],
        "display-xl": ["3.75rem", { lineHeight: "4rem", letterSpacing: "-0.02em" }],
        // Body scale
        "body-xs": ["0.75rem", { lineHeight: "1.125rem" }],
        "body-sm": ["0.875rem", { lineHeight: "1.375rem" }],
        "body-md": ["1rem", { lineHeight: "1.5rem" }],
        "body-lg": ["1.125rem", { lineHeight: "1.75rem" }],
        // Label scale
        "label-xs": ["0.625rem", { lineHeight: "0.75rem", letterSpacing: "0.02em" }],
        "label-sm": ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        "label-md": ["0.875rem", { lineHeight: "1.25rem" }],
        "label-lg": ["1rem", { lineHeight: "1.5rem" }],
      },
      letterSpacing: {
        tightest: "-0.05em",
        tighter: "-0.025em",
        tight: "-0.015em",
        normal: "0",
        wide: "0.01em",
        wider: "0.02em",
        widest: "0.05em",
      },

      // === Animations ===
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "blur-fade-in": {
          "0%": { opacity: "0", filter: "blur(8px)" },
          "100%": { opacity: "1", filter: "blur(0)" },
        },
        "blur-fade-out": {
          "0%": { opacity: "1", filter: "blur(0)" },
          "100%": { opacity: "0", filter: "blur(8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "scale-out": {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.95)" },
        },
        "slide-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-down": {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 5px currentColor" },
          "50%": { boxShadow: "0 0 20px currentColor, 0 0 30px currentColor" },
        },
        spin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        ping: {
          "75%, 100%": { transform: "scale(2)", opacity: "0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        bounce: {
          "0%, 100%": {
            transform: "translateY(-25%)",
            animationTimingFunction: "cubic-bezier(0.8, 0, 1, 1)",
          },
          "50%": {
            transform: "translateY(0)",
            animationTimingFunction: "cubic-bezier(0, 0, 0.2, 1)",
          },
        },
      },
      animation: {
        "fade-in": "fade-in var(--duration-normal, 200ms) var(--ease-out) forwards",
        "fade-out": "fade-out var(--duration-normal, 200ms) var(--ease-out) forwards",
        "blur-fade-in": "blur-fade-in var(--duration-slow, 300ms) var(--ease-out) forwards",
        "blur-fade-out": "blur-fade-out var(--duration-slow, 300ms) var(--ease-out) forwards",
        shimmer: "shimmer 2s linear infinite",
        "scale-in": "scale-in var(--duration-normal, 200ms) var(--ease-out-expo) forwards",
        "scale-out": "scale-out var(--duration-fast, 100ms) var(--ease-out) forwards",
        "slide-in-up": "slide-in-up var(--duration-normal, 200ms) var(--ease-out-expo) forwards",
        "slide-in-down": "slide-in-down var(--duration-normal, 200ms) var(--ease-out-expo) forwards",
        "slide-in-left": "slide-in-left var(--duration-normal, 200ms) var(--ease-out-expo) forwards",
        "slide-in-right": "slide-in-right var(--duration-normal, 200ms) var(--ease-out-expo) forwards",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        spin: "spin 1s linear infinite",
        ping: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        bounce: "bounce 1s infinite",
      },
      transitionTimingFunction: {
        "ease-out-expo": "var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1))",
        "ease-spring": "var(--ease-spring, cubic-bezier(0.68, -0.55, 0.265, 1.55))",
        "ease-out-smooth": "var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1))",
      },
      transitionDuration: {
        instant: "var(--duration-instant, 50ms)",
        fast: "var(--duration-fast, 100ms)",
        normal: "var(--duration-normal, 200ms)",
        slow: "var(--duration-slow, 300ms)",
        slower: "var(--duration-slower, 500ms)",
      },

      // === Shadows ===
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        inner: "var(--shadow-inner)",
        glow: "var(--shadow-glow)",
        focus: "var(--shadow-focus)",
        "glow-success": "var(--shadow-glow-success)",
        "glow-warning": "var(--shadow-glow-warning)",
        "glow-error": "var(--shadow-glow-error)",
        "glow-info": "var(--shadow-glow-info)",
        // Elevation aliases
        "elevation-1": "var(--elevation-1)",
        "elevation-2": "var(--elevation-2)",
        "elevation-3": "var(--elevation-3)",
        "elevation-4": "var(--elevation-4)",
        "elevation-5": "var(--elevation-5)",
      },

      // === Spacing ===
      spacing: {
        // Touch target utilities
        touch: "44px", // Minimum touch target size (WCAG)
        "touch-sm": "36px", // Smaller touch target
        "touch-lg": "48px", // Larger touch target
      },
      minHeight: {
        touch: "44px",
        "touch-sm": "36px",
        "touch-lg": "48px",
      },
      minWidth: {
        touch: "44px",
        "touch-sm": "36px",
        "touch-lg": "48px",
      },

      // === Border Radius ===
      borderRadius: {
        lg: "var(--radius, 0.5rem)",
        md: "calc(var(--radius, 0.5rem) - 2px)",
        sm: "calc(var(--radius, 0.5rem) - 4px)",
      },

      // === Background Image (Gradients) ===
      backgroundImage: {
        "gradient-surface": "var(--gradient-surface)",
        "gradient-surface-subtle": "var(--gradient-surface-subtle)",
        "gradient-shine": "var(--gradient-shine)",
        "gradient-border": "var(--gradient-border)",
        "gradient-overlay": "var(--gradient-overlay)",
        shimmer:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)",
      },
    },
  },
  plugins: [],
};
