import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Social | Tecnosocialismo",
  description: "Uno spazio comune, cronologico e senza pubblicità.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it"><body>{children}</body></html>;
}
