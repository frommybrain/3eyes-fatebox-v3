// components/project/ProjectPage.jsx
'use client';

import { useEffect, useState, useTransition, useOptimistic, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import useProjectStore from '@/store/useProjectStore';
import useNetworkStore from '@/store/useNetworkStore';
import useBetaAccessStore, { BETA_MODE_ENABLED } from '@/store/useBetaAccessStore';
import {
    DegenButton,
    DegenCard,
    DegenBadge,
    useToast,
} from '@/components/ui';
import { SkeletonText, SkeletonButton, SkeletonBox } from '@/components/ui/DegenSkeleton';
import WalletButton from '@/components/wallet/WalletButton';
import LoadingOverlay from '@/components/ui/LoadingOverlay';
import ProjectMainCanvas from '@/components/three/projectMainCanvas';
import usePurchasingStore from '@/store/usePurchasingStore';

export default function ProjectPage({ subdomain }) {
    const router = useRouter();
    const { toast } = useToast();
    const [mounted, setMounted] = useState(false);
    const [localPurchasing, setLocalPurchasing] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Loading state - tracks when project data is ready
    const [canvasReady, setCanvasReady] = useState(false);
    const [projectLoadAttempted, setProjectLoadAttempted] = useState(false);

    // Batch purchase state
    const [quantity, setQuantity] = useState(1);
    const [purchaseProgress, setPurchaseProgress] = useState(null);

    // Wallet balances
    const [solBalance, setSolBalance] = useState(null);
    const [tokenBalance, setTokenBalance] = useState(null);

    // Wallet hooks
    const { publicKey, connected, connecting, sendTransaction } = useWallet();
    const { connection } = useConnection();

    // Beta access store
    const { hasAccess, checkAccess, grantAccess } = useBetaAccessStore();

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
            } finally {
                setProjectLoadAttempted(true);
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

    // Check beta access when wallet connects
    useEffect(() => {
        // If beta mode is disabled, grant access immediately
        if (!BETA_MODE_ENABLED) {
            grantAccess('public');
            return;
        }

        // If already has access, nothing to do
        if (hasAccess) return;

        // Wait for wallet connection state to stabilize
        if (connecting) return;

        // If wallet is connected, check allowlist
        if (connected && publicKey) {
            const walletAddress = publicKey.toString();
            if (checkAccess(walletAddress)) {
                grantAccess(walletAddress);
            }
        }
    }, [connected, connecting, publicKey, hasAccess, checkAccess, grantAccess]);

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

        setLocalPurchasing(true);
        usePurchasingStore.getState().startPurchasing(quantity); // Move camera to purchase position, set expected box count
        setPurchaseProgress(null);

        // Track purchases outside try block so catch block can access them
        let totalBoxesPurchased = 0;
        const allPurchasedBoxIds = [];

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

                // Pre-simulate to catch errors before Phantom does
                // This helps us debug the "transaction reverted" warning
                console.log('🔍 Pre-simulating transaction...');
                try {
                    const simulation = await connection.simulateTransaction(transaction);
                    if (simulation.value.err) {
                        console.error('❌ Simulation failed:', simulation.value.err);
                        console.error('Logs:', simulation.value.logs);
                        // Don't throw - let Phantom show the warning, user can still proceed
                        console.warn('⚠️ Simulation failed but proceeding anyway (Phantom will show warning)');
                    } else {
                        console.log('✅ Simulation successful');
                    }
                } catch (simErr) {
                    console.warn('⚠️ Simulation error (non-fatal):', simErr.message);
                }

                console.log('🔑 Requesting wallet signature...');

                // Send transaction using wallet adapter
                const signature = await sendTransaction(transaction, connection, {
                    skipPreflight: true,
                });
                console.log('📤 Transaction sent:', signature);

                // Wait for confirmation
                await connection.confirmTransaction(signature, 'confirmed');

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

                // Queue box drops for this confirmed batch
                usePurchasingStore.getState().queueBoxDrops(txData.boxIds.length);
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

            // Show dashboard link toast after a short delay
            setTimeout(() => {
                toast.info(
                    <span>
                        View your boxes now in your{' '}
                        <a href="/dashboard" className="underline font-medium hover:text-white">
                            dashboard
                        </a>
                    </span>,
                    {
                        title: 'Boxes Ready!',
                        duration: 10000,
                    }
                );
            }, 1000);

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

            // Handle partial success vs total failure
            // Use totalBoxesPurchased directly (not from state which may be stale)
            if (totalBoxesPurchased > 0) {
                // Partial success - update expected count so camera returns after these boxes drop
                usePurchasingStore.getState().startPurchasing(totalBoxesPurchased);

                // Check if user rejected/cancelled vs other error
                const errorLower = (error.message || '').toLowerCase();
                const wasCancelled = errorLower.includes('user rejected') ||
                    errorLower.includes('rejected the request') ||
                    errorLower.includes('user denied');

                if (wasCancelled) {
                    toast.success(`Purchased ${totalBoxesPurchased} boxes. Remaining boxes were cancelled.`, {
                        title: 'Partial Purchase',
                        duration: 8000,
                    });
                } else {
                    toast.success(`Purchased ${totalBoxesPurchased} boxes before error occurred. Check your dashboard for details.`, {
                        title: 'Partial Purchase',
                        duration: 8000,
                    });
                }

                // Show dashboard link after partial purchase
                const purchasedCount = totalBoxesPurchased; // Capture for closure
                setTimeout(() => {
                    toast.info(
                        <span>
                            View your {purchasedCount} boxes in your{' '}
                            <a href="/dashboard" className="underline font-medium hover:text-white">
                                dashboard
                            </a>
                        </span>,
                        {
                            title: 'Boxes Ready!',
                            duration: 10000,
                        }
                    );
                }, 1000);

                // Refresh project data
                startTransition(() => {
                    setOptimisticProject({
                        total_boxes_created: (currentProject.total_boxes_created || 0) + totalBoxesPurchased
                    });
                    refreshCurrentProject(subdomain);
                });
            } else {
                // Total failure - end purchasing immediately since no boxes will drop
                usePurchasingStore.getState().endPurchasing();

                // Show appropriate error message
                const errorLower = (error.message || '').toLowerCase();
                if (errorLower.includes('user rejected') || errorLower.includes('rejected the request')) {
                    toast.info('Transaction cancelled.', {
                        title: 'Cancelled',
                        duration: 4000,
                    });
                } else if (errorLower.includes('insufficient')) {
                    toast.error('Insufficient funds. Please check your wallet balance.', {
                        title: 'Purchase Failed',
                        duration: 6000,
                    });
                } else {
                    toast.error(error.message || 'Failed to purchase boxes. Please try again.', {
                        title: 'Purchase Failed',
                        duration: 6000,
                    });
                }
            }

            // Refresh balances regardless of outcome
            fetchBalances();
        } finally {
            setLocalPurchasing(false);
            setPurchaseProgress(null);
        }
    };

    // Quantity adjustment handlers
    const incrementQuantity = () => setQuantity(q => Math.min(q + 1, 10));
    const decrementQuantity = () => setQuantity(q => Math.max(q - 1, 1));

    // Canvas ready callback
    const handleCanvasReady = useCallback(() => {
        setCanvasReady(true);
    }, []);

    // =========================================================================
    // Determine card state - what content to show in the unified card
    // =========================================================================

    // Still loading initial data (config, project)
    const isInitialLoading = !mounted || configLoading || projectLoading || !projectLoadAttempted;

    // Project not found (after load attempted)
    const isProjectNotFound = projectLoadAttempted && !projectLoading && (projectError || !currentProject);

    // Project is paused/inactive
    const isProjectPaused = displayProject && (!displayProject.is_active || displayProject.is_paused);

    // Beta access check (only relevant if beta mode is enabled)
    const isBetaCheckPending = BETA_MODE_ENABLED && !hasAccess && connecting;
    const isBetaDenied = BETA_MODE_ENABLED && !hasAccess && connected && !connecting;
    const needsWalletForBeta = BETA_MODE_ENABLED && !hasAccess && !connected && !connecting;

    // User needs to connect wallet (not connected and no beta requirement, or beta but needs wallet)
    const needsWalletConnection = !connected && !connecting;

    // Platform is paused (global emergency pause)
    const isPlatformPaused = config?.paused === true;

    // Ready to show purchase UI - all conditions met
    const isReadyForPurchase = !isInitialLoading && !isProjectNotFound && !isProjectPaused &&
        !isPlatformPaused && (!BETA_MODE_ENABLED || hasAccess) && displayProject;

    // Show loading overlay when:
    // 1. Wallet is connected (or connecting) AND
    // 2. We're still loading data OR canvas isn't ready
    // Don't show overlay if user hasn't connected wallet yet
    const isWalletActive = connected || connecting;
    const isStillLoading = isInitialLoading || isBetaCheckPending || (isReadyForPurchase && !canvasReady);
    const showLoadingOverlay = isWalletActive && isStillLoading && !isProjectNotFound && !isProjectPaused && !isBetaDenied;

    // Network badge (show if devnet)
    const showNetworkBadge = config?.network === 'devnet';

    // Format price for display (use safe defaults while loading)
    const unitPrice = displayProject ? displayProject.box_price / Math.pow(10, displayProject.payment_token_decimals || 9) : 0;
    const formattedPrice = unitPrice.toLocaleString();
    const totalPrice = unitPrice * quantity;
    const formattedTotalPrice = totalPrice.toLocaleString();
    const tokenSymbol = displayProject?.payment_token_symbol || 'TOKEN';

    // Calculate number of transactions needed (3 boxes per transaction)
    const transactionsNeeded = Math.ceil(quantity / 3);

    // Check if user has enough tokens for the total purchase
    const hasEnoughTokens = tokenBalance !== null && tokenBalance >= totalPrice;

    // =========================================================================
    // Render card content based on state
    // =========================================================================

    const renderCardContent = () => {
        // If wallet not connected AND beta mode requires wallet, show beta prompt first
        // (before we even try to load project data display)
        if (needsWalletForBeta) {
            return (
                <div className="text-center">
                    <div className="inline-block px-3 py-1 bg-degen-yellow text-degen-black text-xs font-bold uppercase tracking-wider mb-6">
                        Beta Access Required
                    </div>
                    <h1 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-4">
                        DegenBox Beta
                    </h1>
                    <p className="text-degen-text-muted mb-6">
                        Connect your wallet to verify beta access.
                    </p>
                    <div className="mb-4">
                        <WalletButton />
                    </div>
                    <p className="text-xs text-degen-text-muted">
                        Connect your wallet to check if you have beta access
                    </p>
                </div>
            );
        }

        // If wallet not connected and no beta mode, show connect wallet prompt
        if (needsWalletConnection && !BETA_MODE_ENABLED) {
            return (
                <div className="text-center">
                    <h1 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-4">
                        {displayProject?.project_name || 'DegenBox'}
                    </h1>
                    <p className="text-degen-text-muted mb-6">
                        Connect your wallet to purchase boxes.
                    </p>
                    <div className="mb-4">
                        <WalletButton />
                    </div>
                </div>
            );
        }

        // Loading skeleton - only show when wallet is connected and loading
        if (isInitialLoading || isBetaCheckPending) {
            return (
                <>
                    <SkeletonText width="180px" height="1.75rem" className="mx-auto mb-6" />
                    <div className="border-t border-b border-degen-black py-4 mb-4 -mx-6 px-6">
                        <SkeletonText width="60px" height="0.75rem" className="mx-auto mb-2" />
                        <SkeletonText width="120px" height="1.75rem" className="mx-auto" />
                    </div>
                    <div className="border-t border-b border-degen-black py-4 mb-4 -mx-6 px-6">
                        <SkeletonText width="60px" height="0.75rem" className="mx-auto mb-3" />
                        <div className="flex items-center justify-center gap-4">
                            <SkeletonBox className="w-10 h-10 rounded-full" />
                            <SkeletonText width="48px" height="2rem" />
                            <SkeletonBox className="w-10 h-10 rounded-full" />
                        </div>
                    </div>
                    <SkeletonButton fullWidth size="xl" />
                </>
            );
        }

        // Project not found
        if (isProjectNotFound) {
            return (
                <div className="text-center">
                    <h1 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-2">
                        Project Not Found
                    </h1>
                    <p className="text-degen-text-muted mb-6">
                        {projectError || `The project "${subdomain}" does not exist.`}
                    </p>
                    <DegenButton onClick={() => router.push('/')} variant="primary">
                        Go to Homepage
                    </DegenButton>
                </div>
            );
        }

        // Platform paused (global emergency pause)
        if (config?.paused) {
            return (
                <div className="text-center">
                    <div className="inline-block px-3 py-1 bg-red-500 text-white text-xs font-bold uppercase tracking-wider mb-4">
                        Platform Maintenance
                    </div>
                    <h1 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-2">
                        Platform Temporarily Paused
                    </h1>
                    <p className="text-degen-text-muted mb-6">
                        The platform is undergoing maintenance. Box purchases are temporarily disabled.
                        Please check back soon!
                    </p>
                    <DegenButton onClick={() => router.push('/')} variant="primary">
                        Go to Homepage
                    </DegenButton>
                </div>
            );
        }

        // Project paused
        if (isProjectPaused) {
            return (
                <div className="text-center">
                    <h1 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-2">
                        Project Paused
                    </h1>
                    <p className="text-degen-text-muted mb-6">
                        {displayProject.project_name} is currently paused by the creator.
                        Check back later!
                    </p>
                    <DegenButton onClick={() => router.push('/')} variant="primary">
                        Browse Other Projects
                    </DegenButton>
                </div>
            );
        }

        // Beta access denied
        if (isBetaDenied) {
            return (
                <div className="text-center">
                    <div className="inline-block px-3 py-1 bg-degen-yellow text-degen-black text-xs font-bold uppercase tracking-wider mb-6">
                        Beta Access Required
                    </div>
                    <h1 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-4">
                        {displayProject?.project_name || 'DegenBox Beta'}
                    </h1>
                    <div className="bg-red-50 border border-red-200 p-4 mb-4">
                        <p className="text-red-600 text-sm font-medium">Access Denied</p>
                        <p className="text-red-500 text-xs mt-1">
                            Your wallet is not on the beta access list.
                        </p>
                    </div>
                    <p className="text-xs text-degen-text-muted mb-4">
                        Connected: {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}
                    </p>
                    <p className="text-xs text-degen-text-muted">
                        Contact the team on{' '}
                        <a
                            href="https://twitter.com/3eyesworld"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-degen-blue hover:underline"
                        >
                            Twitter
                        </a>
                        {' '}to request beta access.
                    </p>
                </div>
            );
        }

        // Ready for purchase - show full purchase UI
        return (
            <>
                {/* Project Name */}
                <h1 className="text-degen-black text-2xl font-medium uppercase tracking-wider text-center mb-6">
                    {displayProject?.project_name || 'Loading...'}
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
                        <span className="text-degen-black text-2xl font-medium">{formattedPrice}</span>
                        <span className="text-degen-text-muted text-lg">{tokenSymbol}</span>
                    </div>
                </div>

                {/* Quantity Selector */}
                <div className="border-t border-b border-degen-black py-4 mb-4 -mx-6 px-6">
                    <p className="text-degen-text-muted text-xs uppercase tracking-wider mb-3 text-center">Quantity</p>
                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={decrementQuantity}
                            disabled={quantity <= 1 || localPurchasing}
                            className="w-10 h-10 rounded-full border-2 border-degen-black text-degen-black font-bold text-xl
                                     hover:bg-degen-black hover:text-white transition-colors
                                     disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-degen-black"
                        >
                            -
                        </button>
                        <span className="text-degen-black text-3xl font-bold w-12 text-center">{quantity}</span>
                        <button
                            onClick={incrementQuantity}
                            disabled={quantity >= 10 || localPurchasing}
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
                    disabled={!connected || localPurchasing || (connected && !hasEnoughTokens)}
                    variant="warning"
                    size="xl"
                    fullWidth
                >
                    {localPurchasing
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
            </>
        );
    };

    return (
        <>
            {/* Loading Overlay - only shows when loading canvas for valid project */}
            <LoadingOverlay isLoading={showLoadingOverlay} minDuration={800} />

            {/* Network Badge (devnet only) */}
            {showNetworkBadge && (
                <div className="fixed top-16 right-4 z-50">
                    <DegenBadge variant="warning">DEVNET</DegenBadge>
                </div>
            )}

            {/* Project UI Panel */}
            <div className={`fixed top-0 left-0 w-full lg:w-1/3 h-screen z-10 pointer-events-none transition-opacity duration-100 border-r border-degen-black ${isPending ? 'opacity-80' : 'opacity-100'}`}>
                <div className="flex flex-col items-center justify-center h-full pointer-events-auto px-2 md:px-4">
                    <DegenCard variant="white" padding="lg" className="w-full">
                        {renderCardContent()}
                    </DegenCard>
                </div>
            </div>

            {/* Canvas - only render when we have a valid project ready */}
            {isReadyForPurchase && (
                <div className="hidden lg:block">
                    <ProjectMainCanvas onReady={handleCanvasReady} />
                </div>
            )}
        </>
    );
}
