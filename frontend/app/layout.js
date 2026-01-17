import localFont from "next/font/local";
import "./globals.css";
import Header from "@/components/ui/header";
import WalletProvider from "@/components/wallet/WalletProvider";
import NetworkInitializer from "@/components/providers/NetworkInitializer";
import { DegenToastProvider, TransactionProvider } from "@/components/ui";

const threeEyesFont = localFont({
  src: [
    {
      path: "../public/fonts/3EYESSansMonoV2-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/3EYESSansMonoV2-Regular.woff",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-3eyes",
  display: "swap",
});

export const metadata = {
  title: "DegenBox - Multi-Tenant Solana Lootbox Platform",
  description: "Create your own token-based lootbox gambling platform on Solana",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${threeEyesFont.variable} font-sans antialiased`}
      >
        <NetworkInitializer>
          <WalletProvider>
            <DegenToastProvider>
              <TransactionProvider>
                <Header />
                {children}
              </TransactionProvider>
            </DegenToastProvider>
          </WalletProvider>
        </NetworkInitializer>
      </body>
    </html>
  );
}
