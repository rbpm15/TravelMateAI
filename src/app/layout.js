import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "TravelMate AI - Planea tu viaje ideal",
  description: "Encuentra el mejor viaje según tu presupuesto en segundos. Recomendaciones personalizadas de hoteles, vuelos, y atracciones.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${inter.variable}`}>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
