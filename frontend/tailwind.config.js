/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Intering.fi-paletti
        // Pää-CTA: tumma sininen #004e71
        intering: {
          50: "#e6eef2",
          100: "#bccfd8",
          200: "#8eadbc",
          300: "#5e8ba0",
          400: "#387089",
          500: "#004e71",
          600: "#004566",
          700: "#003b58",
          800: "#00304a",
          900: "#001f31",
        },
        // Sekundäärinen aksentti: turkoosi (intering.fi "Varaa tapaaminen"/"Liity mukaan" -painikkeet)
        teal: {
          50: "#e0f7fa",
          100: "#b3ecf3",
          200: "#80e0ec",
          300: "#4dd4e4",
          400: "#26c9dc",
          500: "#00bcd4",
          600: "#00a5bc",
          700: "#008a9d",
          800: "#006e7e",
          900: "#00525f",
        },
        // Lämpimät kuvitukseen
        accent: {
          orange: "#FF8B3D",
          yellow: "#F7C61F",
          peach: "#FFD4B8",
          mint: "#B8E8DE",
        },
        success: "#41D33E",
        warning: "#F8D313",
        danger: "#F73730",
      },
      fontFamily: {
        heading: ['Inter', 'system-ui', 'sans-serif'],
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 12px -2px rgb(0 0 0 / 0.08), 0 2px 6px -2px rgb(0 0 0 / 0.04)',
      },
      fontSize: {
        // Suuremmat hero-koot intering.fi-tyyliin
        'hero': ['clamp(2.25rem, 5vw, 3.75rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'hero-sm': ['clamp(1.875rem, 4vw, 2.75rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },
    },
  },
  plugins: [],
}
