// app/roadmap/page.js
'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function RoadmapPage() {
    const phases = [
        {
            phase: 'Phase 1',
            title: 'Crack On',
            status: 'completed',
            items: [
                'Launch $3EYES token on pump.fun',
                'Deploy core smart contracts on Solana devnet',
                'Migrate lootbox purchase and settlement system from v1',
                'Implement provably fair randomness',
                'Create project dashboard for creators',
            ],
        },
        {
            phase: 'Phase 2',
            title: 'Beta Testing',
            status: 'completed',
            items: [
                'Launch beta on mainnet with select community members',
                'Refine UI/UX based on user feedback',
                'Test all endpoints and smart contract mechanisms',
                'Treasury and buyback automation',
            ],
        },
        {
            phase: 'Phase 3.1',
            title: 'Public Launch',
            status: 'in-progress',
            items: [
                'Open platform with single $3EYES project',
                'Launch marketing campaigns',
                'Look for major projects to partner with in exchange for reduced platform fee',
                'Iterate on user feedback',
            ],
        },
        {
            phase: 'Phase 3.2',
            title: 'Public Launch',
            status: 'in-progress',
            items: [
                'Open platform for users to launch their own projects for their communities',
                'Implement gaming "presets" for project owners',
                'Report publically platform stats and income',
            ],
        },
        {
            phase: 'Phase 4',
            title: 'Expansion',
            status: 'upcoming',
            items: [
                'Jackpot winner privileges',
                'Leaderboard',
                'SOL based boxes',
                'Voting on treasury buybacks',
            ],
        },
    ];

    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return (
                    <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold uppercase tracking-wider">
                        Completed
                    </span>
                );
            case 'in-progress':
                return (
                    <span className="px-3 py-1 bg-degen-yellow text-degen-black text-xs font-bold uppercase tracking-wider">
                        In Progress
                    </span>
                );
            default:
                return (
                    <span className="px-3 py-1 bg-degen-black/20 text-degen-black text-xs font-bold uppercase tracking-wider">
                        Upcoming
                    </span>
                );
        }
    };

    return (
        <div className="min-h-screen bg-degen-bg">
            

            {/* Main Content */}
            <main className="pt-24 pb-16 px-2 md:px-3  mx-auto">
                <h1 className="text-degen-black text-4xl md:text-4xl font-medium uppercase tracking-wider mb-1">
                    Roadmap
                </h1>
                <p className="text-degen-black text-sm mb-12">
                DegenBox is a fun gambling mechanism that is provably fair onchain and that can be applied to any project with fees buying back the main token, powered by $3EYES
                </p>

                {/* Timeline */}
                <div className="space-y-8">
                    {phases.map((phase, index) => (
                        <div
                            key={phase.phase}
                            className={`relative bg-white border border-degen-black p-3 md:p-3 ${
                                phase.status === 'in-progress' ? 'border-2 border-degen-yellow' : ''
                            }`}
                        >
                            {/* Connector line */}
                            {index < phases.length - 1 && (
                                <div className="absolute left-8 top-full w-0.5 h-8 bg-degen-black/20" />
                            )}

                            <div className="flex flex-wrap items-center gap-4 mb-4">
                                <span className="text-degen-text-muted font-medium uppercase tracking-wider text-sm">
                                    {phase.phase}
                                </span>
                                {getStatusBadge(phase.status)}
                            </div>

                            <h2 className="text-xl font-medium uppercase tracking-wider mb-4 text-degen-black">
                                {phase.title}
                            </h2>

                            <ul className="space-y-3">
                                {phase.items.map((item, itemIndex) => (
                                    <li key={itemIndex} className="flex items-start gap-3">
                                        <span
                                            className={`flex-shrink-0 w-5 h-5 mt-0.5 border flex items-center justify-center ${
                                                phase.status === 'completed'
                                                    ? 'bg-green-500 border-green-500 text-white'
                                                    : 'border-degen-black/30'
                                            }`}
                                        >
                                            {phase.status === 'completed' && (
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </span>
                                        <span className={`text-degen-text-muted ${phase.status === 'completed' ? 'line-through opacity-60 text-sm' : 'text-sm'}`}>
                                            {item}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                
            </main>
        </div>
    );
}
