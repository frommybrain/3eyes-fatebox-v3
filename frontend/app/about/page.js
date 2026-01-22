// app/about/page.js
'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-degen-bg">
            {/* Header */}
            <header className="fixed top-0 left-0 w-full h-14 flex items-center justify-between px-4 md:px-8 bg-white border-b border-degen-black z-50">
                <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
                    <Image
                        src="/images/degenboxlogo.svg"
                        alt="DegenBox"
                        width={150}
                        height={35}
                        className="h-[35px] w-auto"
                    />
                </Link>
                <Link
                    href="/"
                    className="px-4 py-2 text-degen-black/80 hover:text-degen-black hover:bg-degen-black/5 transition-colors font-medium text-sm uppercase tracking-wider"
                >
                    Back to Home
                </Link>
            </header>

            {/* Main Content */}
            <main className="pt-24 pb-16 px-4 md:px-8 max-w-4xl mx-auto">
                <h1 className="text-degen-black text-4xl md:text-5xl font-medium uppercase tracking-wider mb-8">
                    What is DegenBox?
                </h1>

                <div className="space-y-8 text-degen-black">
                    {/* Intro */}
                    <section className="bg-white border border-degen-black p-6 md:p-8">
                        <h2 className="text-2xl font-medium uppercase tracking-wider mb-4">
                            The On-Chain Lootbox Platform
                        </h2>
                        <p className="text-lg leading-relaxed text-degen-text-muted">
                            DegenBox is a provably fair, on-chain lootbox platform built on Solana.
                            We enable token communities to create engaging lootbox experiences where
                            users can purchase mystery boxes using their favorite tokens and win prizes
                            based on transparent, verifiable odds.
                        </p>
                    </section>

                    {/* How It Works */}
                    <section className="bg-white border border-degen-black p-6 md:p-8">
                        <h2 className="text-2xl font-medium uppercase tracking-wider mb-6">
                            How It Works
                        </h2>
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-10 h-10 bg-degen-yellow border border-degen-black flex items-center justify-center font-bold text-lg">
                                    1
                                </div>
                                <div>
                                    <h3 className="font-medium text-lg mb-1">Buy a Box</h3>
                                    <p className="text-degen-text-muted">
                                        Purchase lootboxes using the project&apos;s token. Each box has a set price
                                        determined by the project creator.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-10 h-10 bg-degen-yellow border border-degen-black flex items-center justify-center font-bold text-lg">
                                    2
                                </div>
                                <div>
                                    <h3 className="font-medium text-lg mb-1">Build Your Luck</h3>
                                    <p className="text-degen-text-muted">
                                        Your luck increases over time while holding unopened boxes. Higher luck
                                        means better odds of winning bigger prizes.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-10 h-10 bg-degen-yellow border border-degen-black flex items-center justify-center font-bold text-lg">
                                    3
                                </div>
                                <div>
                                    <h3 className="font-medium text-lg mb-1">Open & Win</h3>
                                    <p className="text-degen-text-muted">
                                        Open your box to reveal your prize. Outcomes include rebates, break-even,
                                        profit multipliers, and jackpots - all determined by on-chain randomness.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Provably Fair */}
                    <section className="bg-white border border-degen-black p-6 md:p-8">
                        <h2 className="text-2xl font-medium uppercase tracking-wider mb-4">
                            Provably Fair
                        </h2>
                        <p className="text-degen-text-muted leading-relaxed mb-4">
                            Every lootbox outcome is determined by on-chain randomness using Solana&apos;s
                            slot hashes. The odds are transparent and stored on-chain, meaning anyone
                            can verify that the game is fair.
                        </p>
                        <ul className="list-disc list-inside text-degen-text-muted space-y-2">
                            <li>All prize distributions are publicly visible on-chain</li>
                            <li>Randomness is derived from unpredictable blockchain data</li>
                            <li>Smart contract code determines outcomes - no human intervention</li>
                        </ul>
                    </section>

                    {/* For Token Communities */}
                    <section className="bg-white border border-degen-black p-6 md:p-8">
                        <h2 className="text-2xl font-medium uppercase tracking-wider mb-4">
                            For Token Communities
                        </h2>
                        <p className="text-degen-text-muted leading-relaxed mb-4">
                            Project creators can launch their own branded lootbox experiences on DegenBox.
                            Create engagement, add utility to your token, and give your community a fun
                            way to interact with your project.
                        </p>
                        <Link
                            href="/dashboard/create"
                            className="inline-block px-6 py-3 bg-degen-yellow text-degen-black font-medium uppercase tracking-wider border border-degen-black hover:bg-degen-black hover:text-degen-yellow transition-colors"
                        >
                            Create Your Project
                        </Link>
                    </section>

                    {/* $3EYES Token */}
                    <section className="bg-degen-yellow border border-degen-black p-6 md:p-8">
                        <h2 className="text-2xl font-medium uppercase tracking-wider mb-4">
                            The $3EYES Token
                        </h2>
                        <p className="text-degen-black leading-relaxed mb-4">
                            $3EYES is the native token of the DegenBox ecosystem. Platform fees are used
                            for $3EYES buybacks, creating sustainable tokenomics that benefit holders.
                        </p>
                        <a
                            href="https://pump.fun/coin/G63pAYWkZd71Jdy83bbdvs6HMQxaYVWy5jsS1hK3pump"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-6 py-3 bg-degen-black text-degen-yellow font-medium uppercase tracking-wider hover:bg-white hover:text-degen-black transition-colors"
                        >
                            Buy $3EYES
                        </a>
                    </section>
                </div>
            </main>
        </div>
    );
}
