import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Bros Executive Hotel",
    template: "%s | Bros Executive Hotel",
  },
  description: "Hotel operations platform for Bros Executive Hotel.",
  icons: {
    icon: "/brand/bros-executive-logo.jpg",
    apple: "/brand/bros-executive-logo.jpg",
  },
};

const themeInitScript = `
(() => {
  try {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored === 'light' || stored === 'dark' ? stored : (prefersDark ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
  } catch (_) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#e5aa00",
              colorPrimaryForeground: "#151515",
              colorForeground: "#151515",
              colorBackground: "#ffffff",
              colorInput: "#fffdf6",
              colorInputForeground: "#151515",
              colorNeutral: "#151515",
              borderRadius: "0.65rem",
              fontFamily: "DM Sans, Segoe UI, sans-serif",
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}