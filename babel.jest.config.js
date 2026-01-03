// Babel config for Jest only. Allows Next.js to use SWC.
module.exports = {
  presets: [
    ["next/babel", { "preset-react": { "runtime": "automatic" } }],
    "@babel/preset-typescript"
  ],
};