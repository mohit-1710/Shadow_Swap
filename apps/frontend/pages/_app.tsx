import type { AppProps } from 'next/app';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import '../styles/globals.css';

// Dynamically import WalletConnectionProvider to avoid SSR issues
const WalletConnectionProvider = dynamic(
  () => import('../components/WalletConnectionProvider'),
  { ssr: false }
);

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>ShadowSwap - Privacy-Preserving DEX</title>
        <meta name="description" content="Privacy-preserving decentralized exchange on Solana" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <WalletConnectionProvider>
        <Component {...pageProps} />
      </WalletConnectionProvider>
    </>
  );
}
