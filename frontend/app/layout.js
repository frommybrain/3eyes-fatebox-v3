import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/ui/header";
import WalletProvider from "@/components/wallet/WalletProvider";
import NetworkInitializer from "@/components/providers/NetworkInitializer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "DegenBox - Multi-Tenant Solana Lootbox Platform",
  description: "Create your own token-based lootbox gambling platform on Solana",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NetworkInitializer>
          <WalletProvider>
            <Header />
            {children}
          </WalletProvider>
        </NetworkInitializer>
      </body>
    </html>
  );
}
