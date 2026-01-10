// components/project/ProjectPage.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, Keypair } from '@solana/web3.js';
import MainCanvas from '@/components/three/mainCanvas';
import useProjectStore from '@/store/useProjectStore';
import useNetworkStore from '@/store/useNetworkStore';
import {
    DegenButton,
    DegenCard,
    DegenBadge,
    DegenLoadingState,
} from '@/components/ui';

export default function ProjectPage({ subdomain }) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [purchasing, setPurchasing] = useState(false);

    // Wallet hooks
    const { publicKey, connected, signTransaction } = useWallet();
    const { connection } = useConnection();

    // Zustand stores
    const {
        currentProject,
        projectLoading,
        projectError,
        loadProjectBySubdomain,
        clearCurrentProject,
        subscribeToProject,
    } = useProjectStore();

    const { config, configLoading, loadConfig } = useNetworkStore();

    // Load network config and project data on mount
    useEffect(() => {
        setMounted(true);

        async function init() {
            try {
                // Load network config first
                if (!config) {
                    await loadConfig();
                }

                // Load project by subdomain
                await loadProjectBySubdomain(subdomain);
            } catch (error) {
                console.error('Failed to initialize project page:', error);
            }
        }

        init();

        // Subscribe to project updates
        const unsubscribe = subscribeToProject(subdomain);

        // Cleanup
        return () => {
            clearCurrentProject();
            unsubscribe();
        };
    }, [subdomain]);

    // Handle box purchase
    const handleBuyBox = async () => {
        if (!connected || !publicKey) {
            alert('Please connect your wallet first to purchase a box');
            return;
        }

        if (!currentProject?.project_numeric_id) {
            alert('Project data not loaded. Please refresh and try again.');
            return;
        }

        setPurchasing(true);

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

            console.log('🎲 Purchasing box...');

            // Step 1: Build transaction
            const buildResponse = await fetch(`${backendUrl}/api/program/build-create-box-tx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentProject.project_numeric_id,
                    buyerWallet: publicKey.toString(),
                }),
            });

            const buildResult = await buildResponse.json();

            if (!buildResult.success) {
                throw new Error(buildResult.details || buildResult.error || 'Failed to build transaction');
            }

            console.log('✅ Transaction built:', buildResult);

            // Step 2: Deserialize transaction
            const transaction = Transaction.from(Buffer.from(buildResult.transaction, 'base64'));

            // Get fresh blockhash
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;
            transaction.feePayer = publicKey;

            // Step 3: Sign with randomness keypair (required for Switchboard VRF)
            // The randomness keypair is generated on the backend and must sign the transaction
            if (buildResult.randomnessKeypair) {
                console.log('🎲 Signing with Switchboard randomness keypair...');
                const randomnessSecretKey = Buffer.from(buildResult.randomnessKeypair, 'base64');
                const randomnessKeypair = Keypair.fromSecretKey(randomnessSecretKey);
                transaction.partialSign(randomnessKeypair);
                console.log('   Randomness account:', randomnessKeypair.publicKey.toString());
            }

            console.log('🔑 Requesting wallet signature...');

            // Step 4: Sign with user's wallet
            const signedTransaction = await signTransaction(transaction);

            console.log('📤 Sending signed transaction...');

            // Step 5: Send the fully signed transaction
            const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
            });

            console.log('📤 Transaction sent:', signature);

            // Step 4: Wait for confirmation
            const confirmation = await connection.confirmTransaction(signature, 'confirmed');

            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }

            console.log('✅ Transaction confirmed!');

            // Step 6: Confirm with backend
            const confirmResponse = await fetch(`${backendUrl}/api/program/confirm-box-creation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentProject.project_numeric_id,
                    boxId: buildResult.boxId,
                    buyerWallet: publicKey.toString(),
                    signature,
                    boxInstancePDA: buildResult.boxInstancePDA,
                    randomnessAccount: buildResult.randomnessAccount,
                }),
            });

            const confirmResult = await confirmResponse.json();

            if (!confirmResult.success) {
                console.warn('Warning: Failed to record box in database:', confirmResult.details);
            }

            // Success!
            alert(
                `Box #${buildResult.boxId} purchased successfully! 🎉\n\n` +
                `Transaction: ${signature}\n\n` +
                `View on Solana Explorer: ${confirmResult.explorerUrl || `https://explorer.solana.com/tx/${signature}?cluster=${config.network}`}`
            );

            // Reload project to update stats
            await loadProjectBySubdomain(subdomain);

        } catch (error) {
            console.error('❌ Box purchase failed:', error);
            alert(`Failed to purchase box: ${error.message}\n\nPlease try again.`);
        } finally {
            setPurchasing(false);
        }
    };

    // Show loading state
    if (!mounted || configLoading || projectLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-degen-bg">
                <DegenLoadingState text={`Loading ${subdomain}...`} />
            </div>
        );
    }

    // Show error state
    if (projectError || !currentProject) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-degen-bg">
                <DegenCard variant="white" padding="lg" className="max-w-md mx-auto text-center">
                    <div className="text-6xl mb-4">🚫</div>
                    <h1 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-2">
                        Project Not Found
                    </h1>
                    <p className="text-degen-text-muted mb-6">
                        {projectError || `The project "${subdomain}" does not exist.`}
                    </p>
                    <DegenButton
                        onClick={() => router.push('/')}
                        variant="primary"
                    >
                        Go to Homepage
                    </DegenButton>
                </DegenCard>
            </div>
        );
    }

    // Check if project is active
    if (!currentProject.is_active || currentProject.is_paused) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-degen-bg">
                <DegenCard variant="white" padding="lg" className="max-w-md mx-auto text-center">
                    <div className="text-6xl mb-4">⏸️</div>
                    <h1 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-2">
                        Project Paused
                    </h1>
                    <p className="text-degen-text-muted mb-6">
                        {currentProject.project_name} is currently paused by the creator.
                        Check back later!
                    </p>
                    <DegenButton
                        onClick={() => router.push('/')}
                        variant="primary"
                    >
                        Browse Other Projects
                    </DegenButton>
                </DegenCard>
            </div>
        );
    }

    // Network badge (show if devnet)
    const showNetworkBadge = config?.network === 'devnet';

    return (
        <>
            {/* Network Badge (devnet only) */}
            {showNetworkBadge && (
                <div className="fixed top-4 right-4 z-50">
                    <DegenBadge variant="warning">DEVNET MODE</DegenBadge>
                </div>
            )}

            {/* Project UI Overlay */}
            <div className="fixed top-0 left-0 w-screen h-screen z-10 pointer-events-none">
                <div className="flex flex-col items-center justify-center h-full pointer-events-auto">
                    {/* Project Header */}
                    <div className="text-center mb-8">
                        {currentProject.logo_url && (
                            <img
                                src={currentProject.logo_url}
                                alt={currentProject.project_name}
                                className="w-24 h-24 mx-auto mb-4 border-2 border-degen-black"
                            />
                        )}
                        <h1 className="text-degen-black text-4xl font-medium uppercase tracking-wider mb-2">
                            {currentProject.project_name}
                        </h1>
                        {currentProject.description && (
                            <p className="text-degen-text-muted text-lg max-w-md mx-auto">
                                {currentProject.description}
                            </p>
                        )}
                    </div>

                    {/* Box Price Display */}
                    <DegenCard variant="white" padding="md" className="mb-6">
                        <div className="text-center">
                            <p className="text-degen-text-muted text-sm uppercase tracking-wider mb-1">Box Price</p>
                            <div className="flex items-center justify-center gap-2">
                                {currentProject.payment_token_logo && (
                                    <img
                                        src={currentProject.payment_token_logo}
                                        alt={currentProject.payment_token_symbol}
                                        className="w-6 h-6 border border-degen-black"
                                    />
                                )}
                                <p className="text-degen-black text-3xl font-medium">
                                    {(currentProject.box_price / Math.pow(10, currentProject.payment_token_decimals || 9)).toLocaleString()}
                                </p>
                                <p className="text-degen-text-muted text-xl">
                                    {currentProject.payment_token_symbol || 'TOKEN'}
                                </p>
                            </div>
                        </div>
                    </DegenCard>

                    {/* Buy Box Button */}
                    <DegenButton
                        onClick={handleBuyBox}
                        disabled={!connected || purchasing}
                        variant="feature"
                        size="lg"
                    >
                        {purchasing ? 'Purchasing...' : !connected ? 'Connect Wallet' : 'Buy Box'}
                    </DegenButton>

                    
                </div>
            </div>

            {/* 3D Canvas Background */}
            <MainCanvas />
        </>
    );
}
