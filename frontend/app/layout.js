import localFont from "next/font/local";
import "./globals.css";
import Header from "@/components/ui/header";
import WalletProvider from "@/components/wallet/WalletProvider";
import NetworkInitializer from "@/components/providers/NetworkInitializer";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { DegenToastProvider, TransactionProvider } from "@/components/ui";
import TransitionOverlay from "@/components/ui/TransitionOverlay";

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
        <ThemeProvider>
          <NetworkInitializer>
            <WalletProvider>
              <DegenToastProvider>
                <TransactionProvider>
                  <Header />
                  {children}
                  <TransitionOverlay />
                </TransactionProvider>
              </DegenToastProvider>
            </WalletProvider>
          </NetworkInitializer>
        </ThemeProvider>
      </body>
    </html>
  );
}
