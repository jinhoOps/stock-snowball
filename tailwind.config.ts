import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          primary: "rgb(var(--color-primary) / <alpha-value>)",
          "primary-focus": "rgb(var(--color-primary-focus) / <alpha-value>)",
          "primary-on-dark": "rgb(var(--color-primary-on-dark) / <alpha-value>)",
          ink: "rgb(var(--color-ink) / <alpha-value>)",
          body: "rgb(var(--color-ink) / <alpha-value>)",
          secondary: "rgb(var(--color-secondary) / <alpha-value>)",
          "ink-muted-80": "rgb(var(--color-ink-strong) / <alpha-value>)",
          // Existing chart and view consumers retain these names at readable contrast.
          "ink-muted-64": "rgb(var(--color-secondary) / <alpha-value>)",
          "ink-muted-48": "rgb(var(--color-secondary) / <alpha-value>)",
          error: "rgb(var(--color-error) / <alpha-value>)",
          success: "rgb(var(--color-success) / <alpha-value>)",
          "divider-soft": "rgb(var(--color-divider) / <alpha-value>)",
          hairline: "rgb(var(--color-hairline) / <alpha-value>)",
          canvas: "rgb(var(--color-canvas) / <alpha-value>)",
          "canvas-parchment": "rgb(var(--color-canvas-parchment) / <alpha-value>)",
          "surface-pearl": "rgb(var(--color-surface-pearl) / <alpha-value>)",
          "surface-white": "rgb(var(--color-white) / <alpha-value>)",
          "surface-black": "rgb(var(--color-black) / <alpha-value>)",
          // Keep the translucent default; Tailwind can still override it with /80, etc.
          "surface-chip-translucent": "rgb(var(--color-chip) / 0.64)",
          "on-primary": "rgb(var(--color-white) / <alpha-value>)",
          "on-dark": "rgb(var(--color-on-dark) / <alpha-value>)",
        }
      },
      fontFamily: {
        display: ["SF Pro Display", "Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        text: ["SF Pro Text", "Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      fontSize: {
        'hero': ['56px', { lineHeight: '1.07', letterSpacing: '-0.28px', fontWeight: '600' }],
        'display-lg': ['40px', { lineHeight: '1.1', letterSpacing: '0', fontWeight: '600' }],
        'display-md': ['34px', { lineHeight: '1.47', letterSpacing: '-0.374px', fontWeight: '600' }],
        'display-sm': ['28px', { lineHeight: '1.2', letterSpacing: '-0.28px', fontWeight: '600' }],
        'title-md': ['24px', { lineHeight: '1.25', letterSpacing: '-0.24px', fontWeight: '600' }],
        'title-sm': ['20px', { lineHeight: '1.3', letterSpacing: '-0.2px', fontWeight: '600' }],
        'lead': ['28px', { lineHeight: '1.14', letterSpacing: '0.196px', fontWeight: '400' }],
        'lead-airy': ['24px', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '300' }],
        'tagline': ['21px', { lineHeight: '1.19', letterSpacing: '0.231px', fontWeight: '600' }],
        'body-strong': ['17px', { lineHeight: '1.24', letterSpacing: '-0.374px', fontWeight: '600' }],
        'body': ['17px', { lineHeight: '1.47', letterSpacing: '-0.374px', fontWeight: '400' }],
        'dense-link': ['17px', { lineHeight: '2.41', letterSpacing: '0', fontWeight: '400' }],
        'caption': ['14px', { lineHeight: '1.43', letterSpacing: '-0.224px', fontWeight: '400' }],
        'caption-strong': ['14px', { lineHeight: '1.29', letterSpacing: '-0.224px', fontWeight: '600' }],
        'button-large': ['18px', { lineHeight: '1.0', letterSpacing: '0', fontWeight: '300' }],
        'button-utility': ['14px', { lineHeight: '1.29', letterSpacing: '-0.224px', fontWeight: '400' }],
        'fine-print': ['12px', { lineHeight: '1.0', letterSpacing: '-0.12px', fontWeight: '400' }],
        'micro-legal': ['10px', { lineHeight: '1.3', letterSpacing: '-0.08px', fontWeight: '400' }],
        'nav-link': ['12px', { lineHeight: '1.0', letterSpacing: '-0.12px', fontWeight: '400' }],
      },
      borderRadius: {
        'xs': '5px',
        'sm': '8px',
        'md': '11px',
        'lg': '18px',
        'card': '18px',
        'pill': '9999px',
      },
      maxWidth: {
        content: '1000px',
        analysis: '1200px',
      },
      minHeight: {
        control: '44px',
      },
      height: {
        field: '48px',
      },
      zIndex: {
        nav: '40',
        overlay: '60',
        dialog: '70',
      },
      boxShadow: {
        card: '0 2px 8px rgb(var(--color-ink) / 0.04)',
      },
      spacing: {
        'xxs': '4px',
        'xs': '8px',
        'sm': '12px',
        'md': '17px',
        'lg': '24px',
        'xl': '32px',
        'xxl': '48px',
        'section': '80px',
      }
    },
  },
  plugins: [],
}

export default config
