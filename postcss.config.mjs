/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // This is the new, correct package name for v4.0
    "@tailwindcss/postcss": {},
    "autoprefixer": {},
  },
};

export default config;