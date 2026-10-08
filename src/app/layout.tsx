import type { Metadata, Viewport } from "next";
import { Barlow, Chakra_Petch } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// Chakra Petch: sus terminales en chaflán repiten el corte de los paneles. Barlow para lectura.
const display = Chakra_Petch({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--ff-display", display: "swap" });
const body = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--ff-body", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Inventario Pro", template: "%s · Inventario Pro" },
  description: "Inventario de componentes electrónicos: stock, préstamos, compras y proyectos.",
};

export const viewport: Viewport = { themeColor: "#070a10", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
