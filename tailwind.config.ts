import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // "Copperline Rayfin" brand palette (from distillery-ops/fabric/theme/
        // CopperlineRayfin.json — the user's actual Power BI report theme).
        // Light dashboard style: light-gray page, dark blue-gray text, a
        // copper/orange accent for CTAs, blue for headings. `amber` and `teal`
        // are kept as token names (used throughout components as e.g.
        // `text-amber-900`, `bg-teal-700`) but repointed to this palette so
        // every component picks it up without a per-file rewrite.
        amber: {
          50: '#eef1f4', // secondaryBackground — subtle panel bg
          100: '#eef1f4', // inactive pill bg
          200: '#e2e6ea', // theme border color — hairline border
          300: '#e2e6ea',
          400: '#e08b2d', // copper accent
          500: '#e08b2d', // copper accent
          600: '#a35f1c', // darker copper — readable unit-hint text on light bg
          700: '#667085', // theme "label" color — helper/secondary text
          800: '#475467', // body text inside info boxes
          900: '#36597f', // theme "header"/"callout" color — headings & labels
        },
        teal: {
          50: '#ffffff',
          100: '#e2e6ea',
          200: 'rgba(224,139,45,0.25)',
          500: '#e08b2d', // focus border copper
          600: '#e2e6ea', // default card border
          700: '#e08b2d', // primary CTA copper
          800: '#c67722', // CTA hover
          900: '#a35f1c', // CTA active
        },
        success: '#59a14f', // theme "good"
        danger: '#d65a57', // theme "bad"
        warn: '#e08b2d', // theme "neutral" — doubles as warning/copper accent
        parchment: '#ffffff', // card/input background, also text-on-copper-button color
        ink: '#2b3137', // theme foreground — body text on the light background
      },
      fontFamily: {
        display: ['var(--font-brand)', 'sans-serif'],
        body: ['var(--font-brand)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
