import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import { themeScript } from "@/lib/theme";
import { FreelasProvider } from "@/lib/store/freelas-store";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Freelas — Seu freela na hora certa",
  description:
    "Marketplace que conecta restaurantes, buffets e eventos a garçons, cumins, barmen e recepcionistas freelancers.",
  applicationName: "Freelas",
  appleWebApp: { capable: true, title: "Freelas", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1E293B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme is set by themeScript before hydration.
    <html
      lang="pt-BR"
      className={`${jakarta.variable} ${inter.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <FreelasProvider>{children}</FreelasProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
