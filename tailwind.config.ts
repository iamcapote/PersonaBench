import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        brand: {
          azure: {
            200: "hsl(var(--brand-azure-200) / <alpha-value>)",
            400: "hsl(var(--brand-azure-400) / <alpha-value>)",
            500: "hsl(var(--brand-azure-500) / <alpha-value>)",
          },
          emerald: {
            200: "hsl(var(--brand-emerald-200) / <alpha-value>)",
            500: "hsl(var(--brand-emerald-500) / <alpha-value>)",
          },
          amber: {
            500: "hsl(var(--brand-amber-500) / <alpha-value>)",
          },
          rose: {
            500: "hsl(var(--brand-rose-500) / <alpha-value>)",
          },
        },
        ink: {
          100: "hsl(var(--ink-100))",
          200: "hsl(var(--ink-200))",
          400: "hsl(var(--ink-400))",
          600: "hsl(var(--ink-600))",
          800: "hsl(var(--ink-800))",
          900: "hsl(var(--ink-900))",
        },
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius)",
        xl: "var(--radius-xl)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        card: "var(--shadow-card)",
      },
      spacing: {
        gutter: "var(--space-6)",
        "section": "var(--space-12)",
        "section-xl": "var(--space-16)",
      },
      fontSize: {
        xs: ["var(--font-size-xs)", { lineHeight: "var(--line-height-snug)" }],
        sm: ["var(--font-size-sm)", { lineHeight: "var(--line-height-base)" }],
        base: ["var(--font-size-md)", { lineHeight: "var(--line-height-base)" }],
        lg: ["var(--font-size-lg)", { lineHeight: "var(--line-height-snug)" }],
        xl: ["var(--font-size-xl)", { lineHeight: "var(--line-height-tight)" }],
        "2xl": ["var(--font-size-2xl)", { lineHeight: "var(--line-height-tight)" }],
      },
    },
  },
  plugins: [],
};

export default config;
