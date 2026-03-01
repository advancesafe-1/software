/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-tertiary': 'var(--bg-tertiary)',
        'bg-card': 'var(--bg-card)',
        'accent-cyan': 'var(--accent-cyan)',
        'status-safe': 'var(--status-safe)',
        'status-warning': 'var(--status-warning)',
        'status-danger': 'var(--status-danger)',
        'status-critical': 'var(--status-critical)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-dim': 'var(--text-dim)',
        'text-mono': 'var(--text-mono)',
      },
      fontFamily: {
        rajdhani: ['Rajdhani', 'sans-serif'],
        'dm-sans': ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
