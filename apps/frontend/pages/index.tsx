import { NextPage } from 'next';
import Head from 'next/head';

const Home: NextPage = () => {
  return (
    <div>
      <Head>
        <title>ShadowSwap - Privacy-Preserving DEX</title>
        <meta name="description" content="ShadowSwap: Privacy-first DEX on Solana" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1>ShadowSwap</h1>
        <p>Privacy-Preserving Decentralized Exchange</p>
        <p>Coming Soon...</p>
      </main>
    </div>
  );
};

export default Home;

