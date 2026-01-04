// public/app/src/types/assets.d.ts
declare module "*.svg" {
  const src: string; // Vite will turn this into a URL string
  export default src;
}
declare module "*.png" {
  const src: string;
  export default src;
}
declare module "*.jpg" {
  const src: string;
  export default src;
}