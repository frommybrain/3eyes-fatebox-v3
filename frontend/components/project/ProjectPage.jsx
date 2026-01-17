// components/project/ProjectPage.jsx
'use client';

import { useEffect, useState, useTransition, useOptimistic, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import MainCanvas from '@/components/three/mainCanvas';
import useProjectStore from '@/store/useProjectStore';
import useNetworkStore from '@/store/useNetworkStore';
import {
    DegenButton,
    DegenCard,
    DegenBadge,
    DegenLoadingState,
    useToast,
} from '@/components/ui';

export default function ProjectPage({ subdomain }) {
    const router = useRouter();
    const { toast } = useToast();
    const [mounted, setMounted] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Batch purchase state
    const [quantity, setQuantity] = useState(1);
    const [purchaseProgress, setPurchaseProgress] = useState(null); // { current: 1, total: 4, boxesPurchased: 3 }

    // Wallet balances
    const [solBalance, setSolBalance] = useState(null);
    const [tokenBalance, setTokenBalance] = useState(null);

    // Wallet hooks
    const { publicKey, connected, signTransaction } = useWallet();
    const { connection } = useConnection();

    // Zustand stores
    const {
        currentProject,
        projectLoading,
        projectError,
        loadProjectBySubdomain,
        refreshCurrentProject,
        clearCurrentProject,
        subscribeToProject,
    } = useProjectStore();

    const { config, configLoading, loadConfig } = useNetworkStore();

    // Optimistic project stats for instant UI feedback after purchase
    const [optimisticProject, setOptimisticProject] = useOptimistic(
        currentProject,
        (current, update) => current ? { ...current, ...update } : current
    );

    // Use optimistic state for rendering
    const displayProject = optimisticProject || currentProject;

    // Fetch wallet balances
    const fetchBalances = useCallback(async () => {
        if (!connected || !publicKey || !connection) return;

        try {
            // Fetch SOL balance
            const lamports = await connection.getBalance(publicKey);
            setSolBalance(lamports / LAMPORTS_PER_SOL);

            // Fetch token balance if project is loaded
            if (currentProject?.payment_token_mint) {
                try {
                    const mint = new PublicKey(currentProject.payment_token_mint);
                    const ata = await getAssociatedTokenAddress(mint, publicKey);
                    const tokenAccountInfo = await connection.getTokenAccountBalance(ata);
                    setTokenBalance(parseFloat(tokenAccountInfo.value.uiAmountString));
                } catch {
                    // Token account doesn't exist - user has 0 tokens
                    setTokenBalance(0);
                }
            }
        } catch (error) {
            console.error('Failed to fetch balances:', error);
        }
    }, [connected, publicKey, connection, currentProject?.payment_token_mint]);

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

    // Fetch balances when wallet connects or project loads
    useEffect(() => {
        fetchBalances();
    }, [fetchBalances]);

    // Handle batch box purchase
    const handleBuyBoxes = async () => {
        if (!connected || !publicKey) {
            toast.warning('Please connect your wallet first to purchase boxes');
            return;
        }

        if (!currentProject?.project_numeric_id) {
            toast.error('Project data not loaded. Please refresh and try again.');
            return;
        }

        setPurchasing(true);
        setPurchaseProgress(null);

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

            console.log(`🎲 Purchasing ${quantity} box(es)...`);

            // Step 1: Build batch transactions
            const buildResponse = await fetch(`${backendUrl}/api/program/build-create-boxes-batch-tx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentProject.project_numeric_id,
                    buyerWallet: publicKey.toString(),
                    quantity,
                }),
            });

            const buildResult = await buildResponse.json();

            if (!buildResult.success) {
                throw new Error(buildResult.details || buildResult.error || 'Failed to build transactions');
            }

            console.log('✅ Batch transactions built:', buildResult);
            console.log(`   Total transactions: ${buildResult.transactions.length}`);
            console.log(`   Total boxes: ${buildResult.totalBoxes}`);

            const { transactions } = buildResult;
            let totalBoxesPurchased = 0;
            const allPurchasedBoxIds = [];

            // Step 2: Process each transaction sequentially
            for (let i = 0; i < transactions.length; i++) {
                const txData = transactions[i];

                setPurchaseProgress({
                    current: i + 1,
                    total: transactions.length,
                    boxesPurchased: totalBoxesPurchased,
                    currentBoxes: txData.boxIds,
                });

                console.log(`\n📝 Processing transaction ${i + 1}/${transactions.length} (boxes ${txData.boxIds.join(', ')})...`);

                // Deserialize transaction
                const transaction = Transaction.from(Buffer.from(txData.transaction, 'base64'));

                // Get fresh blockhash for each transaction
                const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
                transaction.recentBlockhash = blockhash;
                transaction.lastValidBlockHeight = lastValidBlockHeight;
                transaction.feePayer = publicKey;

                console.log('🔑 Requesting wallet signature...');

                // Sign with user's wallet
                const signedTransaction = await signTransaction(transaction);

                console.log('📤 Sending signed transaction...');

                // Send the signed transaction
                // Note: We skip preflight to avoid "already processed" errors during simulation
                // The actual transaction will still be validated by validators
                let signature;
                try {
                    signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
                        skipPreflight: true, // Skip simulation to avoid "already processed" errors
                        maxRetries: 3,
                    });
                    console.log('📤 Transaction sent:', signature);
                } catch (sendError) {
                    // Check if error is "already processed" - this means the tx succeeded
                    if (sendError.message?.includes('already been processed') ||
                        sendError.message?.includes('AlreadyProcessed')) {
                        console.log('⚠️ Transaction was already processed - checking status...');
                        // Get signature from the signed transaction
                        // The signature is the first signature in the signatures array
                        const txSig = signedTransaction.signatures[0];
                        if (txSig) {
                            signature = bs58.encode(txSig);
                            console.log('📋 Retrieved signature from signed tx:', signature);
                        } else {
                            throw sendError;
                        }
                    } else {
                        throw sendError;
                    }
                }

                // Wait for confirmation
                const confirmation = await connection.confirmTransaction(signature, 'confirmed');

                if (confirmation.value.err) {
                    throw new Error(`Transaction ${i + 1} failed: ${JSON.stringify(confirmation.value.err)}`);
                }

                console.log('✅ Transaction confirmed!');

                // Confirm with backend (batch endpoint)
                const confirmResponse = await fetch(`${backendUrl}/api/program/confirm-boxes-batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectId: currentProject.project_numeric_id,
                        boxIds: txData.boxIds,
                        buyerWallet: publicKey.toString(),
                        signature,
                        boxInstancePDAs: txData.boxInstancePDAs,
                    }),
                });

                const confirmResult = await confirmResponse.json();

                if (!confirmResult.success) {
                    console.warn('Warning: Failed to record boxes in database:', confirmResult.details);
                }

                totalBoxesPurchased += txData.boxIds.length;
                allPurchasedBoxIds.push(...txData.boxIds);
            }

            // Success!
            setPurchaseProgress(null);

            if (quantity === 1) {
                toast.success(`Box #${allPurchasedBoxIds[0]} purchased!`, {
                    title: 'Purchase Complete',
                    duration: 8000,
                });
            } else {
                toast.success(`Successfully purchased ${totalBoxesPurchased} boxes!`, {
                    title: 'Batch Purchase Complete',
                    duration: 8000,
                });
            }

            // Optimistic update + silent refresh for smooth UI
            startTransition(() => {
                setOptimisticProject({
                    total_boxes_created: (currentProject.total_boxes_created || 0) + totalBoxesPurchased
                });
                refreshCurrentProject(subdomain);
            });

            // Refresh balances
            fetchBalances();

        } catch (error) {
            console.error('❌ Box purchase failed:', error);

            // Check if partial success
            if (purchaseProgress && purchaseProgress.boxesPurchased > 0) {
                toast.warning(`Purchased ${purchaseProgress.boxesPurchased} boxes before error occurred.`, {
                    title: 'Partial Purchase',
                    duration: 8000,
                });
            } else {
                toast.error(error.message || 'Failed to purchase boxes. Please try again.', {
                    title: 'Purchase Failed',
                    duration: 6000,
                });
            }
        } finally {
            setPurchasing(false);
            setPurchaseProgress(null);
        }
    };

    // Quantity adjustment handlers
    const incrementQuantity = () => setQuantity(q => Math.min(q + 1, 10));
    const decrementQuantity = () => setQuantity(q => Math.max(q - 1, 1));

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
    if (!displayProject.is_active || displayProject.is_paused) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-degen-bg">
                <DegenCard variant="white" padding="lg" className="max-w-md mx-auto text-center">
                    <div className="text-6xl mb-4">⏸️</div>
                    <h1 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-2">
                        Project Paused
                    </h1>
                    <p className="text-degen-text-muted mb-6">
                        {displayProject.project_name} is currently paused by the creator.
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

    // Format price for display
    const unitPrice = displayProject.box_price / Math.pow(10, displayProject.payment_token_decimals || 9);
    const formattedPrice = unitPrice.toLocaleString();
    const totalPrice = unitPrice * quantity;
    const formattedTotalPrice = totalPrice.toLocaleString();
    const tokenSymbol = displayProject.payment_token_symbol || 'TOKEN';

    // Calculate number of transactions needed (3 boxes per transaction)
    const transactionsNeeded = Math.ceil(quantity / 3);

    // Check if user has enough tokens for the total purchase
    const hasEnoughTokens = tokenBalance !== null && tokenBalance >= totalPrice;

    return (
        <>
            {/* Network Badge (devnet only) */}
            {showNetworkBadge && (
                <div className="fixed top-16 right-4 z-50">
                    <DegenBadge variant="warning">DEVNET</DegenBadge>
                </div>
            )}

            {/* Project UI Overlay */}
            <div className={`fixed top-0 left-0 w-screen h-screen z-10 pointer-events-none transition-opacity duration-100 ${isPending ? 'opacity-80' : 'opacity-100'}`}>
                <div className="flex flex-col items-center justify-center h-full pointer-events-auto px-4">

                    {/* Main Container */}
                    <DegenCard variant="white" padding="lg" className="w-full max-w-sm">
                        {/* Project Name */}
                        <h1 className="text-degen-black text-2xl font-medium uppercase tracking-wider text-center mb-6">
                            {displayProject.project_name}
                        </h1>

                        {/* Wallet Info (if connected) */}
                        {connected && (
                            <div className="border-t border-b border-degen-black py-3 mb-6 -mx-6 px-6">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-degen-text-muted uppercase tracking-wider">Your Balance</span>
                                    <div className="text-right">
                                        <div className="text-degen-black font-medium">
                                            {tokenBalance !== null ? tokenBalance.toLocaleString() : '...'} {tokenSymbol}
                                        </div>
                                        <div className="text-degen-text-light text-xs">
                                            {solBalance !== null ? solBalance.toFixed(4) : '...'} SOL
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Box Price */}
                        <div className="text-center mb-4">
                            <p className="text-degen-text-muted text-xs uppercase tracking-wider mb-2">Box Price</p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-degen-black text-2xl font-medium">
                                    {formattedPrice}
                                </span>
                                <span className="text-degen-text-muted text-lg">
                                    {tokenSymbol}
                                </span>
                            </div>
                        </div>

                        {/* Quantity Selector */}
                        <div className="border-t border-b border-degen-black py-4 mb-4 -mx-6 px-6">
                            <p className="text-degen-text-muted text-xs uppercase tracking-wider mb-3 text-center">Quantity</p>
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    onClick={decrementQuantity}
                                    disabled={quantity <= 1 || purchasing}
                                    className="w-10 h-10 rounded-full border-2 border-degen-black text-degen-black font-bold text-xl
                                             hover:bg-degen-black hover:text-white transition-colors
                                             disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-degen-black"
                                >
                                    -
                                </button>
                                <span className="text-degen-black text-3xl font-bold w-12 text-center">
                                    {quantity}
                                </span>
                                <button
                                    onClick={incrementQuantity}
                                    disabled={quantity >= 10 || purchasing}
                                    className="w-10 h-10 rounded-full border-2 border-degen-black text-degen-black font-bold text-xl
                                             hover:bg-degen-black hover:text-white transition-colors
                                             disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-degen-black"
                                >
                                    +
                                </button>
                            </div>
                            {/* Total Price */}
                            <div className="mt-3 text-center">
                                <span className="text-degen-text-muted text-xs uppercase tracking-wider">Total: </span>
                                <span className="text-degen-black font-bold text-lg">{formattedTotalPrice} {tokenSymbol}</span>
                            </div>
                            {/* Transaction hint */}
                            {quantity > 1 && (
                                <p className="text-degen-text-light text-xs text-center mt-2">
                                    {transactionsNeeded} transaction{transactionsNeeded > 1 ? 's' : ''} required
                                </p>
                            )}
                        </div>

                        {/* Purchase Progress */}
                        {purchaseProgress && (
                            <div className="mb-4 p-3 bg-degen-bg rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-degen-text-muted text-xs uppercase">Progress</span>
                                    <span className="text-degen-black text-sm font-medium">
                                        {purchaseProgress.current}/{purchaseProgress.total}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-degen-warning h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${(purchaseProgress.current / purchaseProgress.total) * 100}%` }}
                                    />
                                </div>
                                <p className="text-degen-text-light text-xs text-center mt-2">
                                    {purchaseProgress.boxesPurchased} box{purchaseProgress.boxesPurchased !== 1 ? 'es' : ''} purchased
                                </p>
                            </div>
                        )}

                        {/* Buy Box Button */}
                        <DegenButton
                            onClick={handleBuyBoxes}
                            disabled={!connected || purchasing || (connected && !hasEnoughTokens)}
                            variant="warning"
                            size="xl"
                            fullWidth
                        >
                            {purchasing
                                ? (purchaseProgress
                                    ? `Purchasing (${purchaseProgress.current}/${purchaseProgress.total})...`
                                    : 'Preparing...')
                                : !connected
                                    ? 'Connect Wallet'
                                    : !hasEnoughTokens
                                        ? `Insufficient ${tokenSymbol}`
                                        : quantity === 1
                                            ? 'Buy Box'
                                            : `Buy ${quantity} Boxes`
                            }
                        </DegenButton>

                        {/* Insufficient balance hint */}
                        {connected && !hasEnoughTokens && tokenBalance !== null && (
                            <p className="text-degen-text-muted text-xs text-center mt-3">
                                You need {formattedTotalPrice} {tokenSymbol} to buy {quantity} box{quantity > 1 ? 'es' : ''}
                            </p>
                        )}
                    </DegenCard>
                </div>
            </div>

            {/* 3D Canvas Background */}
            {/*<MainCanvas purchasing={purchasing} />*/}
        </>
    );
}
