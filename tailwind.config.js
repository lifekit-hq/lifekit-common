/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('./projects/tokens/tailwind/preset.cjs')],
  content: ['./projects/**/src/**/*.{ts,html}'],
};
