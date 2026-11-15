import type { Metadata } from "next";
import { GAME_DESCRIPTIONS, GAME_TITLES } from "@/lib/i18n";
import "./globals.css";
import "./world.css";
import "./kids.css";
import "./readability.css";
export const metadata: Metadata = {
  title: GAME_TITLES.es,
  description: GAME_DESCRIPTIONS.es,
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
