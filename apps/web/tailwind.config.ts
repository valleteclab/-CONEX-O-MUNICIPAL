import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        municipal: {
          600: "#00a28d",
          700: "#058172",
        },
        marinha: {
          500: "#627d98",
          900: "#102a43",
        },
        cerrado: {
          500: "#f59e0b",
          600: "#d97706",
        },
        sucesso: {
          500: "#10b981",
        },
        alerta: {
          500: "#ef4444",
        },
        surface: {
          DEFAULT: "#fafcfe",
          card: "#ffffff",
        },
      },
      fontFamily: {
        sans: ["var(--font-source-sans)", "Segoe UI", "system-ui", "sans-serif"],
        serif: ["var(--font-dm-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        btn: "12px",
        card: "12px",
      },
      boxShadow: {
        card: "0 1px 3px rgb(16 42 67 / 0.06), 0 1px 2px rgb(16 42 67 / 0.04)",
        "card-hover":
          "0 10px 25px -5px rgb(16 42 67 / 0.08), 0 4px 10px -4px rgb(16 42 67 / 0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
