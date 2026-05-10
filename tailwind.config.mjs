/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      typography: {
        invert: {
          css: {
            '--tw-prose-body': '#cbd5e1',
            '--tw-prose-headings': '#f1f5f9',
            '--tw-prose-lead': '#94a3b8',
            '--tw-prose-links': '#818cf8',
            '--tw-prose-bold': '#f1f5f9',
            '--tw-prose-counters': '#94a3b8',
            '--tw-prose-bullets': '#475569',
            '--tw-prose-hr': '#1e293b',
            '--tw-prose-quotes': '#f1f5f9',
            '--tw-prose-quote-borders': '#4f46e5',
            '--tw-prose-captions': '#94a3b8',
            '--tw-prose-code': '#c4b5fd',
            '--tw-prose-pre-code': '#e2e8f0',
            '--tw-prose-pre-bg': '#1e293b',
            '--tw-prose-th-borders': '#334155',
            '--tw-prose-td-borders': '#1e293b',
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
