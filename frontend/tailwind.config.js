/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Intering-yhteisön sivuilta poimittu paletti
        intering: {
          50: "#e6eef2",
          100: "#bccfd8",
          200: "#8eadbc",
          300: "#5e8ba0",
          400: "#387089",
          500: "#004e71", // pää-CTA, primaari (intering.fi-painikkeet)
          600: "#004566",
          700: "#003b58",
          800: "#00304a",
          900: "#001f31",
        },
        success: "#41D33E",
        warning: "#F8D313",
        danger: "#F73730",
      },
      fontFamily: {
        // Otsikot — sama Inter-fontti jota PDF-template käyttää
        heading: ['Inter', 'system-ui', 'sans-serif'],
        // Leipäteksti — Montserrat kuten intering.fi
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        // intering.fi käyttää 0.5rem painikepyöristystä
        DEFAULT: '0.5rem',
      },
      boxShadow: {
        // Pehmeä kohotus korteille (intering.fi-tyylinen)
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 12px -2px rgb(0 0 0 / 0.08), 0 2px 6px -2px rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
}
