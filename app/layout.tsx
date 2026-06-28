import "./globals.css";
import localFont from "next/font/local";
import { type Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "react-hot-toast";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Yale DegreeIntelligence",
  description:
    "Organize your Yale academic life. Stress-free. Always. Built by yalies, for yalies.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  openGraph: {
    title: "Yale DegreeIntelligence",
    description:
      "Organize your Yale academic life. Stress-free. Always. Built by yalies, for yalies.",
    url: "https://degreeint.com",
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
      "Your Yale degree, made easy. Stress-free. Always. Built by yalies, for yalies.",
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
    <html
      lang="en"
      className={`${louize.variable} ${sf.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('di-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){document.documentElement.classList.add('dark');}})();`,
          }}
        />
      </head>
      <AuthProvider>
        <ThemeProvider>
          <body className="bg-white text-gray-900 dark:bg-black dark:text-white transition-colors duration-300">
            <Toaster
              position="top-center"
              toastOptions={{
                className:
                  "!bg-white !text-gray-900 dark:!bg-[#1f1f1f] dark:!text-white !border !border-gray-200 dark:!border-white/10",
                style: {
                  fontSize: "0.875rem",
                  borderRadius: "8px",
                  padding: "12px 16px",
                },
                success: {
                  iconTheme: {
                    primary: "#ec4899",
                    secondary: "#ffffff",
                  },
                },
                error: {
                  iconTheme: {
                    primary: "#ef4444",
                    secondary: "#ffffff",
                  },
                },
              }}
            />
            {children}
            <Script
              src="https://cdn.amplitude.com/script/3294f81bbb47cf20adaf628c010b1866.js"
              strategy="afterInteractive"
            />
            <Script id="amplitude-init" strategy="lazyOnload">
              {`
                (function initAmplitude() {
                  if (window.amplitude && window.sessionReplay) {
                    window.amplitude.add(window.sessionReplay.plugin({ sampleRate: 1 }));
                    window.amplitude.init('3294f81bbb47cf20adaf628c010b1866', {
                      fetchRemoteConfig: true,
                      autocapture: true
                    });
                  } else {
                    setTimeout(initAmplitude, 100);
                  }
                })();
              `}
            </Script>
            <Analytics />
          </body>
        </ThemeProvider>
      </AuthProvider>
    </html>
  );
}
