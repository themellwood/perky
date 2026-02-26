import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        perky: {
          50: '#eefff4',
          100: '#d0ffe2',
          200: '#a3ffc8',
          300: '#6bffa6',
          400: '#2bff7e',
          500: '#00e65c',
          600: '#00b848',
          700: '#008f38',
          800: '#006f2c',
          900: '#004d1e',
        },
        fight: {
          50: '#fffef0',
          100: '#fffbcc',
          200: '#fff599',
          300: '#ffed5c',
          400: '#ffe333',
          500: '#ffd500',
          600: '#ccaa00',
          700: '#997f00',
          800: '#665500',
          900: '#332a00',
        },
        ink: '#1a1a1a',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'brutal-sm': '2px 2px 0px 0px #1a1a1a',
        'brutal': '4px 4px 0px 0px #1a1a1a',
        'brutal-md': '6px 6px 0px 0px #1a1a1a',
        'brutal-lg': '8px 8px 0px 0px #1a1a1a',
        'brutal-none': '0px 0px 0px 0px #1a1a1a',
      },
      borderWidth: {
        '3': '3px',
      },
      borderRadius: {
        brutal: '6px',
      },
    },
  },
  plugins: [],
} satisfies Config;
