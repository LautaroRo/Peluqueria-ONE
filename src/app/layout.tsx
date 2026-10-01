import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

const DESCRIPCION =
  "Peluquería y barbería ONE en Argüello, Córdoba. Cortes clásicos y modernos con Héctor Rodríguez. Reservá tu turno online.";

export const metadata: Metadata = {
  title: { default: "ONE · Peluquería y Barbería", template: "%s · ONE Peluquería" },
  description: DESCRIPCION,
  openGraph: {
    title: "ONE · Peluquería y Barbería",
    description: DESCRIPCION,
    type: "website",
    locale: "es_AR",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
