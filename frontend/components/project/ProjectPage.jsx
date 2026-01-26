// components/project/ProjectPage.jsx
'use client';

import Image from 'next/image';
import { useEffect, useState, useTransition, useOptimistic, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import {
    getAssociatedTokenAddressSync,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import useProjectStore from '@/store/useProjectStore';
import useNetworkStore from '@/store/useNetworkStore';
import { markTransition } from '@/lib/usePageTransition';
import { useTransitionOverlay } from '@/components/ui/TransitionOverlay';
import {
    DegenButton,
    DegenCard,
    DegenBadge,
    DegenCarousel,
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
    // Start as null to indicate "not yet determined" - prevents flash of wrong state
    const [isMobile, setIsMobile] = useState(null);

    // Purchase state (quantity fixed at 1 for unified open flow)
    const quantity = 1;
    const [purchaseProgress, setPurchaseProgress] = useState(null);
    const [purchasedBoxId, setPurchasedBoxId] = useState(null);

    // Unified open flow state (Open Immediately)
    const [openFlowActive, setOpenFlowActive] = useState(false);
    const [openFlowStep, setOpenFlowStep] = useState(null); // 'choice' | 'committing' | 'waiting' | 'revealing' | 'complete'
    const [openFlowCountdown, setOpenFlowCountdown] = useState(0);
    const [openFlowLog, setOpenFlowLog] = useState(''); // Single line log
    const [openFlowError, setOpenFlowError] = useState(null);
    const [openFlowResult, setOpenFlowResult] = useState(null); // { tier, multiplier, amount, tokenSymbol }

    // Wallet balances
    const [solBalance, setSolBalance] = useState(null);
    const [tokenBalance, setTokenBalance] = useState(null);

    // Wallet hooks
    const { publicKey, connected, connecting, sendTransaction, signTransaction } = useWallet();
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

    // Transition overlay for subdomain changes
    const { startTransition: startOverlayTransition } = useTransitionOverlay();

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

                    // Detect token program (Token vs Token-2022)
                    const mintAccountInfo = await connection.getAccountInfo(mint);
                    const tokenProgram = mintAccountInfo?.owner.equals(TOKEN_2022_PROGRAM_ID)
                        ? TOKEN_2022_PROGRAM_ID
                        : TOKEN_PROGRAM_ID;

                    // Get ATA with correct token program
                    const ata = getAssociatedTokenAddressSync(
                        mint,
                        publicKey,
                        false,
                        tokenProgram,
                        ASSOCIATED_TOKEN_PROGRAM_ID
                    );

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

    // Detect mobile on mount (matches lg: breakpoint at 1024px)
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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

            console.log(`🎲 Purchasing ${quantity} box(es)`);

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

                console.log(`\n📝 Processing transaction ${i + 1}/${transactions.length} (boxes ${txData.boxIds.join(', ')})`);

                // Deserialize transaction
                const transaction = Transaction.from(Buffer.from(txData.transaction, 'base64'));

                // Get fresh blockhash for each transaction
                const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
                transaction.recentBlockhash = blockhash;
                transaction.lastValidBlockHeight = lastValidBlockHeight;

                // Pre-simulate to catch errors before Phantom does
                // This helps us debug the "transaction reverted" warning
                console.log('🔍 Pre-simulating transaction');
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

                console.log('🔑 Requesting wallet signature');

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

            // Show the unified modal with choice step
            setPurchasedBoxId(allPurchasedBoxIds[0]);
            setOpenFlowActive(true);
            setOpenFlowStep('choice');
            setOpenFlowError(null);
            setOpenFlowResult(null);
            setOpenFlowLog('');

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
                            <a href="https://degenbox.fun/dashboard" className="underline font-medium hover:text-white">
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

    // Handle "Open Now" from choice step - start the open flow
    const handleOpenNow = () => {
        // Start the unified open flow directly
        handleUnifiedOpen(purchasedBoxId);
    };

    // Handle "Hold & Grow Luck" from choice step - close modal and go to dashboard
    const handleHoldForLuck = () => {
        closeOpenFlow();
        // Start overlay transition, then navigate after it covers
        startOverlayTransition(() => {
            markTransition('dashboard-entrance');
            // Navigate to dashboard (on production this changes subdomains)
            window.location.href = '/dashboard';
        });
    };

    // Helper: Set current log message (single line)
    const setLog = (message) => {
        setOpenFlowLog(message);
    };

    // Helper: Get payout multiplier string from reward amount and box price
    const getPayoutMultiplier = (payoutAmount, boxPrice) => {
        if (!boxPrice || boxPrice === 0) return '0x';
        const multiplier = payoutAmount / boxPrice;
        // Format nicely: 0.5x, 1x, 1.5x, 4x, 8x etc.
        if (multiplier === 0) return '0x';
        if (Number.isInteger(multiplier)) return `${multiplier}x`;
        return `${multiplier.toFixed(1)}x`;
    };

    // Unified Open Flow - opens box immediately after purchase (commit → reveal → settle)
    const handleUnifiedOpen = async (boxId) => {
        if (!publicKey || !signTransaction || !sendTransaction) {
            toast.error('Wallet not connected properly');
            return;
        }

        setOpenFlowActive(true);
        setOpenFlowStep('committing');
        setOpenFlowLog('');
        setOpenFlowError(null);
        setOpenFlowResult(null);

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
        // Get cooldown from config (default 10s if not loaded)
        const revealCooldown = config?.revealBoxCooldown || 10;
        console.log('🕐 Oracle cooldown from config:', config?.revealBoxCooldown, '→ using:', revealCooldown, '+ 2s buffer =', revealCooldown + 2);

        try {
            // ============================================
            // STEP 1: COMMIT (Create VRF request, freeze luck)
            // ============================================
            setLog('Generating randomness');

            const { Keypair } = await import('@solana/web3.js');
            const randomnessKeypair = Keypair.generate();
            const randomnessPublicKey = randomnessKeypair.publicKey.toString();

            setLog('Building transaction');
            const commitBuildResponse = await fetch(`${backendUrl}/api/program/build-commit-box-tx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentProject.project_numeric_id,
                    boxId: boxId,
                    ownerWallet: publicKey.toString(),
                    randomnessPublicKey,
                }),
            });

            const commitBuildResult = await commitBuildResponse.json();
            if (!commitBuildResult.success) {
                throw new Error(commitBuildResult.details || commitBuildResult.error);
            }

            const commitTx = Transaction.from(Buffer.from(commitBuildResult.transaction, 'base64'));

            setLog('Waiting for wallet approval');
            const walletSignedTx = await signTransaction(commitTx);
            walletSignedTx.partialSign(randomnessKeypair);

            setLog('Sending transaction');
            const commitSignature = await connection.sendRawTransaction(walletSignedTx.serialize(), {
                skipPreflight: true,
                preflightCommitment: 'confirmed',
            });

            setLog('Confirming on-chain');
            await connection.confirmTransaction(commitSignature, 'confirmed');

            // Confirm with backend (silent)
            await fetch(`${backendUrl}/api/program/confirm-commit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentProject.project_numeric_id,
                    boxId: boxId,
                    signature: commitSignature,
                    randomnessAccount: commitBuildResult.randomnessAccount,
                }),
            });

            // ============================================
            // STEP 2: WAIT FOR ORACLE
            // ============================================
            setOpenFlowStep('waiting');

            // Use cooldown from config + 2s buffer
            const waitTime = revealCooldown + 2;
            for (let i = waitTime; i >= 0; i--) {
                setOpenFlowCountdown(i);
                setLog(i > 0 ? 'Oracle generating randomness' : 'Ready to reveal!');
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // ============================================
            // STEP 3: REVEAL + SETTLE (Combined - one signature!)
            // ============================================
            setOpenFlowStep('revealing');
            setLog('Building transaction');

            // Use combined reveal+settle endpoint for single signature
            const revealBuildResponse = await fetch(`${backendUrl}/api/program/build-reveal-and-settle-tx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentProject.project_numeric_id,
                    boxId: boxId,
                    ownerWallet: publicKey.toString(),
                }),
            });

            const revealBuildResult = await revealBuildResponse.json();

            if (!revealBuildResult.success) {
                if (revealBuildResult.refundEligible) {
                    setOpenFlowError('Oracle unavailable - refund available in dashboard');
                    setTimeout(() => {
                        startOverlayTransition(() => {
                            markTransition('dashboard-entrance');
                            window.location.href = '/dashboard';
                        });
                    }, 3000);
                    return;
                }
                throw new Error(revealBuildResult.details || revealBuildResult.error);
            }

            const combinedTx = Transaction.from(Buffer.from(revealBuildResult.transaction, 'base64'));
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            combinedTx.recentBlockhash = blockhash;
            combinedTx.lastValidBlockHeight = lastValidBlockHeight;

            setLog('Waiting for wallet approval');
            const signature = await sendTransaction(combinedTx, connection, { skipPreflight: true });

            setLog('Confirming transaction');
            await connection.confirmTransaction(signature, 'confirmed');

            // Confirm reveal with backend to get reward result
            setLog('Reading result');
            const confirmRevealResponse = await fetch(`${backendUrl}/api/program/confirm-reveal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentProject.project_numeric_id,
                    boxId: boxId,
                    ownerWallet: publicKey.toString(),
                    signature: signature,
                }),
            });

            const confirmRevealResult = await confirmRevealResponse.json();
            if (!confirmRevealResult.success || !confirmRevealResult.reward) {
                throw new Error('Failed to read reveal result');
            }

            const reward = confirmRevealResult.reward;
            const multiplier = getPayoutMultiplier(reward.payoutAmount, currentProject.box_price);
            const payoutFormatted = (reward.payoutAmount / Math.pow(10, currentProject.payment_token_decimals || 9)).toFixed(2);

            // Confirm settle with backend (silent - box was settled in same tx)
            if (reward.tier > 1 && reward.payoutAmount > 0) {
                await fetch(`${backendUrl}/api/program/confirm-settle`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectId: currentProject.project_numeric_id,
                        boxId: boxId,
                        signature: signature,
                    }),
                });
            }

            // Show result
            if (reward.tier > 1 && reward.payoutAmount > 0) {
                setOpenFlowResult({ tier: reward.tier, multiplier, amount: payoutFormatted, tokenSymbol: currentProject.payment_token_symbol, claimed: true });
            } else {
                // Dud
                setOpenFlowResult({ tier: reward.tier, multiplier: '0x', amount: '0', tokenSymbol: currentProject.payment_token_symbol, claimed: true });
            }
            setOpenFlowStep('complete');

            // Refresh balances
            fetchBalances();

        } catch (err) {
            console.error('Unified open flow error:', err);

            const errorLower = (err.message || '').toLowerCase();
            let errorMessage = err.message;

            if (errorLower.includes('user rejected') || errorLower.includes('rejected the request')) {
                errorMessage = 'Transaction cancelled';
            } else if (errorLower.includes('insufficient')) {
                errorMessage = 'Insufficient SOL for transaction fees';
            }

            setOpenFlowError(errorMessage);
        }
    };

    // Close the open flow modal and reset state
    const closeOpenFlow = () => {
        setOpenFlowActive(false);
        setOpenFlowStep(null);
        setOpenFlowCountdown(0);
        setOpenFlowLog('');
        setOpenFlowError(null);
        setOpenFlowResult(null);
    };

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

    // User needs to connect wallet
    const needsWalletConnection = !connected && !connecting;

    // Platform is paused (global emergency pause)
    const isPlatformPaused = config?.paused === true;

    // Ready to show purchase UI - all conditions met
    const isReadyForPurchase = !isInitialLoading && !isProjectNotFound && !isProjectPaused &&
        !isPlatformPaused && displayProject;

    // Show loading overlay when:
    // 1. Wallet is connected (or connecting) AND
    // 2. We're still loading data OR canvas isn't ready
    // Don't show overlay if user hasn't connected wallet yet
    // On mobile (isMobile === true), don't wait for canvas since it's not rendered
    // While isMobile is null (not yet determined), treat as loading
    const isWalletActive = connected || connecting;
    const mobileCheckComplete = isMobile !== null;
    const needsCanvasReady = isMobile === false && isReadyForPurchase && !canvasReady;
    const isStillLoading = isInitialLoading || !mobileCheckComplete || needsCanvasReady;
    const showLoadingOverlay = isWalletActive && isStillLoading && !isProjectNotFound && !isProjectPaused;

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
        // Show skeleton while still determining initial state (mobile check, loading data)
        // This prevents flash of "connect wallet" before we know the actual state
        if (isInitialLoading || !mobileCheckComplete) {
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

        // If wallet not connected, show connect wallet prompt with how-to carousel
        if (needsWalletConnection) {
            const howToSlides = [
                {
                    image: '/images/degenbox_about1.jpeg',
                    title: 'Buy a Box',
                    description: 'Purchase your box using the project token. Multiple boxes may be acquired.',
                },
                {
                    image: '/images/degenbox_about2.jpeg',
                    title: 'Build Your Luck',
                    description: 'Your box is assigned a Luck Score that increases over time until it is opened.',
                },
                {
                    image: '/images/degenbox_about3.jpeg',
                    title: 'Open & Win',
                    description: 'Open your box when you feel most fortunate. This process may take up to 45 seconds.',
                },
                {
                    image: '/images/degenbox_about4.jpeg',
                    title: 'Get Paid',
                    description: 'Payouts are issued directly to your wallet upon reveal.',
                },
            ];

            return (
                <div className="text-center">
                    <h1 className="text-degen-black text-2xl font-bold uppercase tracking-wider mb-2">
                        {displayProject?.project_name || 'DegenBox'}
                    </h1>
                    <p className="text-degen-text-muted text-sm mb-4">
                        Connect your wallet to buy lootboxes from the vending machine.
                    </p>
                    <div className="mb-4">
                        <WalletButton variant="success" fullWidth />
                    </div>

                    {/* How To Carousel */}
                    <div className="border-t border-degen-black pt-4 mt-4 -mx-6 px-6">
                        <p className="text-degen-text-muted text-xs uppercase tracking-wider mb-3">
                            How it works
                        </p>
                        <DegenCarousel
                            slides={howToSlides}
                            showArrows={true}
                            showDots={true}
                        />
                    </div>
                </div>
            );
        }

        // Loading skeleton - show when wallet is connected but still waiting for canvas (desktop only)
        if (needsCanvasReady) {
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

        // Platform paused (global emergency pause)
        if (config?.paused) {
            return (
                <div className="text-center">
                    <div className="inline-block px-3 py-1 bg-red-500 text-white text-xs font-bold uppercase tracking-wider mb-4">
                        Platform Maintenance
                    </div>
                    <h1 className="text-degen-black text-xl font-bold uppercase tracking-wider mb-2">
                        Platform Temporarily Paused
                    </h1>
                    <p className="text-degen-text-muted mb-6 text-sm">
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
                    <Image
                        src="/images/degenbox_paused.jpeg"
                        alt="Project Paused"
                        width={500}
                        height={500}
                        className="mx-auto mb-4"
                    />
                    <h1 className="text-degen-black text-xl font-bold uppercase tracking-wider mb-2">
                        Project Paused
                    </h1>
                    <p className="text-degen-text-muted mb-6 text-sm">
                        <strong>{displayProject.project_name}</strong> has been paused by the project creator
                        Check back later!
                    </p>

                </div>
            );
        }

        // Ready for purchase - show carousel with purchase and open flow slides
        return (
            <div className="overflow-hidden">
                <div
                    className="flex transition-transform duration-300 ease-in-out"
                    style={{ transform: openFlowActive ? 'translateX(-100%)' : 'translateX(0)' }}
                >
                    {/* SLIDE 1: Purchase UI */}
                    <div className="w-full flex-shrink-0">
                        {/* Project Name & Online Status */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                {/* Project Logo */}
                                {displayProject?.logo_url ? (
                                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-degen-black">
                                        <Image
                                            src={displayProject.logo_url}
                                            alt={displayProject.project_name || 'Project'}
                                            width={40}
                                            height={40}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-degen-black flex items-center justify-center flex-shrink-0">
                                        <span className="text-degen-white text-sm font-bold">
                                            {displayProject?.project_name?.charAt(0) || '?'}
                                        </span>
                                    </div>
                                )}
                                <h1 className="text-degen-black text-2xl font-medium uppercase tracking-wider">
                                    {displayProject?.project_name || 'Loading'}
                                </h1>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-degen-green animate-pulse" />
                                <span className="text-degen-text-muted text-xs uppercase tracking-wider">Online</span>
                            </div>
                        </div>

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
                        <div className="border-t border-b border-degen-black py-4 mb-4 -mx-6 px-6">
                            <p className="text-degen-text-muted text-xs uppercase tracking-wider mb-2 text-center">Box Price</p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-degen-black text-2xl font-medium">{formattedPrice}</span>
                                <span className="text-degen-text-muted text-lg">{tokenSymbol}</span>
                            </div>
                        </div>

                        {/* Buy Box Button */}
                        <DegenButton
                            onClick={handleBuyBoxes}
                            disabled={!connected || localPurchasing || (connected && !hasEnoughTokens)}
                            variant="success"
                            size="xl"
                            fullWidth
                        >
                            {localPurchasing
                                ? 'Purchasing'
                                : !connected
                                    ? 'Connect Wallet'
                                    : !hasEnoughTokens
                                        ? `Insufficient ${tokenSymbol}`
                                        : 'Buy Box'
                            }
                        </DegenButton>

                        {/* Insufficient balance warning */}
                        {connected && !hasEnoughTokens && tokenBalance !== null && (
                            <p className="text-degen-text-muted text-xs text-center mt-3">
                                You need {formattedPrice} {tokenSymbol} to buy a box
                            </p>
                        )}

                        {/* Buy token link - always visible when connected */}
                        {connected && displayProject?.payment_token_mint && (
                            <div className="text-center mt-2">
                                <a
                                    href={`https://jup.ag/?sell=So11111111111111111111111111111111111111112&buy=${displayProject.payment_token_mint}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-degen-primary hover:underline"
                                >
                                    Buy more ${tokenSymbol}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </a>
                            </div>
                        )}
                    </div>

                    {/* SLIDE 2: Open Flow UI */}
                    <div className="w-full flex-shrink-0 flex flex-col items-center text-center min-h-[300px]">
                        {/* Circle Area */}
                        <div className="h-28 flex items-center justify-center shrink-0">
                            {openFlowStep === 'complete' && openFlowResult ? (
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
                                    openFlowResult.tier === 5 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 animate-pulse' :
                                    openFlowResult.tier === 4 ? 'bg-gradient-to-br from-green-400 to-green-600' :
                                    openFlowResult.tier === 3 ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                                    openFlowResult.tier === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                                    'bg-gradient-to-br from-gray-500 to-gray-600'
                                }`}>
                                    <span className="text-white text-3xl">
                                        {openFlowResult.tier === 5 ? '🏆' :
                                         openFlowResult.tier === 4 ? '🎉' :
                                         openFlowResult.tier === 3 ? '✅' :
                                         openFlowResult.tier === 2 ? '👌' : '❌'}
                                    </span>
                                </div>
                            ) : openFlowError ? (
                                <div className="w-24 h-24 rounded-full flex items-center justify-center bg-red-500/20">
                                    <span className="text-red-500 text-4xl">!</span>
                                </div>
                            ) : openFlowStep === 'choice' ? (
                                <div className="w-24 h-24 rounded-full flex items-center justify-center border-4 border-degen-success bg-degen-success/10">
                                    <span className="text-4xl">📦</span>
                                </div>
                            ) : (
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all ${
                                    openFlowStep === 'waiting' ? 'border-degen-success bg-degen-success/10' : 'border-degen-black/30 bg-degen-black/5'
                                }`}>
                                    {openFlowStep === 'waiting' && openFlowCountdown > 0 ? (
                                        <span className="text-4xl font-bold text-degen-success">{openFlowCountdown}</span>
                                    ) : (
                                        <span className="text-4xl font-bold text-degen-black">
                                            {openFlowStep === 'committing' ? '1' :
                                             openFlowStep === 'waiting' ? '2' : '3'}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Title */}
                        <div className="h-9 flex items-center justify-center shrink-0 mt-2">
                            {openFlowStep === 'complete' && openFlowResult ? (
                                <h2 className="font-bold uppercase tracking-wider text-degen-black">
                                    <span className="text-4xl">{openFlowResult.multiplier?.replace(/x$/i, '')}</span>
                                    <span className="text-xl text-degen-text-muted">x</span>
                                </h2>
                            ) : openFlowError ? (
                                <h2 className="text-xl font-bold uppercase tracking-wider text-red-500">
                                    Error
                                </h2>
                            ) : openFlowStep === 'choice' ? (
                                <h2 className="text-xl font-bold uppercase tracking-wider text-degen-black">
                                    Box Purchased!
                                </h2>
                            ) : (
                                <h2 className="text-xl font-bold uppercase tracking-wider text-degen-black">
                                    {openFlowStep === 'committing' ? 'Opening' :
                                     openFlowStep === 'waiting' ? 'Looking inside' : 'Revealing'}
                                </h2>
                            )}
                        </div>

                        {/* Description */}
                        <div className="h-8 flex items-center justify-center shrink-0 text-sm mb-4">
                            {openFlowStep === 'complete' && openFlowResult ? (
                                openFlowResult.tier > 1 ? (
                                    <p className="text-degen-text-muted">
                                        You won <span className="font-bold text-degen-black text-lg">{openFlowResult.amount} {openFlowResult.tokenSymbol}</span>
                                    </p>
                                ) : (
                                    <p className="text-degen-text-muted">Better luck next time</p>
                                )
                            ) : openFlowError ? (
                                <p className="text-sm text-degen-text-muted line-clamp-2 px-2">{openFlowError}</p>
                            ) : openFlowStep === 'choice' ? (
                                <p className="text-sm text-degen-text-muted">What would you like to do?</p>
                            ) : (
                                <p className="text-sm text-degen-text-muted">
                                    {/*}
                                    {openFlowStep === 'committing' ? 'Creating randomness request' :
                                     openFlowStep === 'waiting' ? 'Oracle generating random number' :
                                     openFlowStep === 'revealing' ? 'Reading result from blockchain' :
                                     'Sending reward to your wallet'}
                                     */}
                                </p>
                            )}
                        </div>

                        {/* Action Area */}
                        <div className="w-full flex-1 flex flex-col justify-center">
                            {openFlowStep === 'complete' && openFlowResult ? (
                                <div className="space-y-2">
                                    {openFlowResult.tier > 1 && !openFlowResult.claimed && (
                                        <p className="text-sm text-degen-warning">
                                            Visit your dashboard to claim
                                        </p>
                                    )}
                                    <DegenButton
                                        onClick={closeOpenFlow}
                                        variant="success"
                                        size="lg"
                                        fullWidth
                                    >
                                        Play Again
                                    </DegenButton>
                                </div>
                            ) : openFlowError ? (
                                <DegenButton
                                    onClick={() => {
                                        startOverlayTransition(() => {
                                            markTransition('dashboard-entrance');
                                            window.location.href = '/dashboard';
                                        });
                                    }}
                                    variant="primary"
                                    size="lg"
                                    fullWidth
                                >
                                    Go to Dashboard
                                </DegenButton>
                            ) : openFlowStep === 'choice' ? (
                                <div className="space-y-3">
                                    <DegenButton
                                        onClick={handleOpenNow}
                                        variant="success"
                                        size="lg"
                                        fullWidth
                                    >
                                        Open Now
                                    </DegenButton>
                                    <DegenButton
                                        onClick={handleHoldForLuck}
                                        variant="secondary"
                                        size="lg"
                                        fullWidth
                                    >
                                        Hold & Grow Luck
                                    </DegenButton>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Current Process Log */}
                                    <div className="h-6 flex items-center justify-center">
                                        <p className="text-xs text-degen-text-muted font-mono truncate animate-pulse">
                                            {openFlowLog || '...'}
                                        </p>
                                    </div>
                                    {/* Progress Dots */}
                                    <div className="flex justify-center gap-2">
                                        {['committing', 'waiting', 'revealing'].map((step, i) => {
                                            const currentIndex = ['committing', 'waiting', 'revealing'].indexOf(openFlowStep);
                                            const isActive = openFlowStep === step;
                                            const isCompleted = currentIndex > i;
                                            return (
                                                <div
                                                    key={step}
                                                    className={`w-2 h-2 rounded-full transition-all ${
                                                        isActive ? 'bg-degen-success scale-125' :
                                                        isCompleted ? 'bg-degen-success' :
                                                        'bg-degen-black/10'
                                                    }`}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Project not found - show centered full-page message
    if (isProjectNotFound) {
        return (
            <div className="fixed inset-0 flex items-center justify-center z-10 bg-degen-bg">
                <DegenCard variant="white" padding="md" className="max-w-md mx-4">
                    <div className="text-center">
                        <Image
                            src="/images/degenbox_not_found.jpeg"
                            alt="Project Not Found"
                            width={300}
                            height={300}
                            className="mx-auto mb-4"
                        />
                        <h1 className="text-degen-black text-xl font-bold uppercase tracking-wider mb-2">
                            Project Not Found
                        </h1>
                        <p className="text-degen-text-muted mb-6 text-sm">
                            {projectError || `The project "${subdomain}" does not exist.`}
                        </p>
                        <DegenButton onClick={() => router.push('/')} variant="primary">
                            Go to Homepage
                        </DegenButton>
                    </div>
                </DegenCard>
            </div>
        );
    }

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
                    <DegenCard variant="white" padding="sm" className="w-full">
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
