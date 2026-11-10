import type { Metadata } from "next";
import { connection } from "next/server";
import { Poppins } from "next/font/google";
import "./globals.css";
import MainProviders from "@/Providers/MainProviders";
import Provider from "@/Providers/Provider";
import { Toaster } from "sonner";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "sktch Labs",
  description:
    "Design amazing digital experiences that create more happy in the world.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // A fresh CSP nonce requires rendering each document per request.
  await connection();
  return (
    <html lang="en">
      <body className={`${poppins.variable} antialiased`}>
        <MainProviders>
          <Provider> {children} </Provider>
        </MainProviders>
        <Toaster position="top-right" closeButton />
      </body>
    </html>
  );
}
