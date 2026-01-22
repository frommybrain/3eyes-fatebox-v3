// app/about/page.js
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { DegenTooltip } from '@/components/ui';
import SiteFooter from '@/components/ui/SiteFooter';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-[#e7e7e7]">

            {/* Safety Card Style Layout */}
            <main className="pt-20 pb-16 mb-16 px-2 md:px-3">
                <div className="mx-auto">
                    {/* Card Container - mimics folded safety card look */}
                    <div className="bg-white border border-degen-black shadow-[2px_2px_0_0_#1a1a1a]">

                        {/* Card Header */}
                        <div className="border-b border-degen-black p-4 md:p-6 text-center bg-degen-yellow">
                            <p className="text-xs uppercase tracking-[0.3em] text-degen-black/70 mb-1">Safety Information</p>
                            <h1 className="text-xl md:text-2xl uppercase tracking-wider text-degen-black">
                                How to DegenBox
                            </h1>
                        </div>

                        {/* Step Grid - 4 columns on desktop, 2 on medium, 1 on mobile */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 divide-degen-black">

                            {/* Step 1 */}
                            <div className="p-6 md:p-8 md:border-r md:border-degen-black">
                                <div className="text-center">
                                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-degen-black text-white font-bold text-sm mb-4">
                                        1
                                    </div>

                                    <div className="w-full aspect-square relative mb-4">
                                        <Image
                                            src="/images/degenbox_about1.jpeg"
                                            alt="Buy a Box"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>

                                    <h2 className="font-bold uppercase tracking-wider text-degen-black mb-2 inline-flex items-center gap-1.5">
                                        Buy a Box
                                        <DegenTooltip
                                            content="A small amount of SOL is required to cover transaction costs. Any unused balance will be returned upon opening."
                                            position="top"
                                            maxWidth={240}
                                        >
                                            <span className="w-4 h-4 rounded-full bg-degen-text-muted text-white text-xs flex items-center justify-center cursor-help">
                                                ?
                                            </span>
                                        </DegenTooltip>
                                    </h2>

                                    <p className="text-sm text-degen-text-muted">
                                        Purchase your box using the project token. Multiple boxes may be acquired.
                                    </p>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="p-6 md:p-8 lg:border-r lg:border-degen-black">
                                <div className="text-center">
                                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-degen-black text-white font-bold text-sm mb-4">
                                        2
                                    </div>

                                    <div className="w-full aspect-square relative mb-4">
                                        <Image
                                            src="/images/degenbox_about2.jpeg"
                                            alt="Build Your Luck"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>

                                    <h2 className="font-bold uppercase tracking-wider text-degen-black mb-2 inline-flex items-center gap-1.5">
                                        Build Your Luck
                                        <DegenTooltip
                                            content="Luck Score timing is determined by the project. Maximum Luck is 60. Luck directly influences the contents of your container."
                                            position="top"
                                            maxWidth={240}
                                        >
                                            <span className="w-4 h-4 rounded-full bg-degen-text-muted text-white text-xs flex items-center justify-center cursor-help">
                                                ?
                                            </span>
                                        </DegenTooltip>
                                    </h2>

                                    <p className="text-sm text-degen-text-muted">
                                        Your box is assigned a Luck Score that increases over time until it is opened.
                                    </p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="p-6 md:p-8 md:border-r md:border-degen-black md:border-t lg:border-t-0">
                                <div className="text-center">
                                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-degen-black text-white font-bold text-sm mb-4">
                                        3
                                    </div>

                                    <div className="w-full aspect-square relative mb-4">
                                        <Image
                                            src="/images/degenbox_about3.jpeg"
                                            alt="Open and Win"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>

                                    <h2 className="font-bold uppercase tracking-wider text-degen-black mb-2 inline-flex items-center gap-1.5">
                                        Open &amp; Win
                                        <DegenTooltip
                                            content="Two transactions are required to open and reveal a container. The reveal must be completed within 1 hour of opening, or the container will expire."
                                            position="top"
                                            maxWidth={240}
                                        >
                                            <span className="w-4 h-4 rounded-full bg-degen-text-muted text-white text-xs flex items-center justify-center cursor-help">
                                                ?
                                            </span>
                                        </DegenTooltip>
                                    </h2>

                                    <p className="text-sm text-degen-text-muted">
                                        Open your box when you feel most fortunate. Please remain attentive during the reveal. This process may take up to 45 seconds.
                                    </p>
                                </div>
                            </div>

                            {/* Step 4 */}
                            <div className="p-6 md:p-8 md:border-t lg:border-t-0">
                                <div className="text-center">
                                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-degen-black text-white font-bold text-sm mb-4">
                                        4
                                    </div>

                                    <div className="w-full aspect-square relative mb-4">
                                        <Image
                                            src="/images/degenbox_about4.jpeg"
                                            alt="Get Paid"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>

                                    <h2 className="font-bold uppercase tracking-wider text-degen-black mb-2">
                                        Get Paid
                                    </h2>

                                    <p className="text-sm text-degen-text-muted">
                                        Payouts are issued directly to your wallet upon reveal. Any unused SOL from transactions will be returned.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Card Footer */}
                        <div className="border-t border-degen-black p-4 md:p-6 bg-gray-50">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <p className="text-xs text-degen-text-muted uppercase tracking-wider text-center md:text-left">
                                    In case of massive gains, please remain calm
                                </p>
                                <div className="flex gap-3">
                                    <Link
                                        href="https://3eyes.degenbox.fun"
                                        className="px-4 py-2 bg-degen-yellow text-degen-black font-medium text-sm uppercase tracking-wider border border-degen-black hover:bg-degen-black hover:text-degen-yellow transition-colors"
                                    >
                                        Try a Box
                                    </Link>
                                    <a
                                        href="https://jup.ag/?sell=So11111111111111111111111111111111111111112&buy=G63pAYWkZd71Jdy83bbdvs6HMQxaYVWy5jsS1hK3pump"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-red-500 text-white font-medium text-sm uppercase tracking-wider border border-red-500 hover:bg-red-600 transition-colors"
                                    >
                                        Buy $3EYES
                                    </a>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>

            {/* Site footer with marquee and navigation */}
            <SiteFooter />
        </div>
    );
}
