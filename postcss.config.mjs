// Tailwind CSS through PostCSS, as the Next.js docs set it up: it works with
// Turbopack and webpack alike, so every build, local or on Vercel, gets the
// same styles.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
