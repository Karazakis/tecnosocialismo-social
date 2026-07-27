import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://social.tecnosocialismo.com"),
  title: "Social — Persone, idee, possibilità",
  description: "Una rete che appartiene a chi la usa: niente pubblicità, feed controllabili e connessioni reali.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Social — Persone, idee, possibilità",
    description: "Una rete che appartiene a chi la usa.",
    url: "/",
    siteName: "Tecnosocialismo Social",
    locale: "it_IT",
    type: "website",
    images: [{ url: "/og.png", width: 1736, height: 908, alt: "Social — Persone, idee, possibilità" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Social — Persone, idee, possibilità",
    description: "Una rete che appartiene a chi la usa.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = { colorScheme: "dark", themeColor: "#090a09" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it"><body>{children}</body></html>;
}
