import "./globals.css";
import localFont from "next/font/local";
import { type Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Yale DegreeIntelligence",
  description:
    "Organize your Yale academic life. Stress-free. Always. Built by yalies, for yalies.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  openGraph: {
    title: "Yale DegreeIntelligence",
    description:
      "Organize your Yale academic life. Stress-free. Always. Built by yalies, for yalies.",
    url: "https://filippofonseca.com",
    siteName: "Yale DegreeIntelligence",
    images: [
      {
        url: "/thumbnail.png",
        width: 1100,
        height: 630,
        alt: "Yale DegreeIntelligence Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Yale DegreeIntelligence",
    description:
      "Organize your Yale academic life. Stress-free. Always. Built by yalies, for yalies.",
    images: ["/thumbnail.png"],
  },
};

const louize = localFont({
  src: [
    {
      path: "../public/fonts/louize-regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/louize-medium.otf",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-louize",
});

const sf = localFont({
  src: [
    {
      path: "../public/fonts/sf-thin.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/sf-regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/sf-medium.otf",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-sf",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${louize.variable} ${sf.variable}`}>
      <AuthProvider>
        <body className="bg-black text-white">{children}</body>
      </AuthProvider>
    </html>
  );
}
