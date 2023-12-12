import path from "path";

export const __dirname = path.dirname(new URL(import.meta.url).pathname);
export const CARD_COMPONENT_PATH = path.resolve(__dirname, "../src/Card.tsx");
export const VITE_ROOT = path.resolve(__dirname, "../");
