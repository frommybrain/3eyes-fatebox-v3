// components/dashboard/Dashboard.jsx
'use client';

import { useEffect, useState, useCallback, useTransition, useOptimistic } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useProjectStore from '@/store/useProjectStore';
import useNetworkStore from '@/store/useNetworkStore';
import {
    DegenButton,
    DegenCard,
    DegenCardHeader,
    DegenCardTitle,
    DegenCardContent,
    DegenTabs,
    DegenTabsList,
    DegenTabsTrigger,
    DegenTabsContent,
    DegenBadge,
    DegenLoadingState,
    DegenEmptyState,
    CardDropdown,
    useToast,
} from '@/components/ui';

export default function Dashboard() {
    const router = useRouter();
    const { publicKey, connected } = useWallet();
    const [activeTab, setActiveTab] = useState('boxes');

    const {
        projects,
        projectsLoading,
        projectsError,
        loadProjectsByOwner,
    } = useProjectStore();

    const { config, configLoading } = useNetworkStore();

    // Handle redirects and data loading
    useEffect(() => {
        // Redirect if not connected
        if (!connected) {
            router.push('/');
            return;
        }

        // Load user's projects
        if (publicKey && config) {
            loadProjectsByOwner(publicKey.toString());
        }
    }, [publicKey, connected, config, router, loadProjectsByOwner]);

    if (configLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-degen-bg">
                <DegenLoadingState text="Loading..." />
            </div>
        );
    }

    if (!connected) {
        return null; // Will redirect
    }

    // Network badge
    const isDevnet = config?.network === 'devnet';

    return (
        <div className="min-h-screen bg-degen-bg pt-24 pb-12 px-6">
            <div className="max-w-7xl mx-auto">
                {/* Network Badge */}
                {isDevnet && (
                    <div className="mb-6">
                        <DegenBadge variant="warning" size="lg">
                            DEVNET MODE
                        </DegenBadge>
                    </div>
                )}

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-degen-black text-4xl font-medium uppercase tracking-wider mb-2">Dashboard</h1>
                    <p className="text-degen-text-muted text-lg">
                        Manage your projects and view your purchased boxes
                    </p>
                </div>

                {/* Tab Navigation */}
                <DegenTabs value={activeTab} onValueChange={setActiveTab}>
                    <DegenTabsList className="mb-8">
                        <DegenTabsTrigger value="boxes">
                            My Boxes
                        </DegenTabsTrigger>
                        <DegenTabsTrigger value="projects">
                            My Projects
                        </DegenTabsTrigger>
                    </DegenTabsList>

                    <DegenTabsContent value="projects">
                        <MyProjectsTab
                            projects={projects}
                            projectsLoading={projectsLoading}
                            projectsError={projectsError}
                            config={config}
                        />
                    </DegenTabsContent>

                    <DegenTabsContent value="boxes">
                        <MyBoxesTab
                            walletAddress={publicKey?.toString()}
                            config={config}
                        />
                    </DegenTabsContent>
                </DegenTabs>
            </div>
        </div>
    );
}

function MyProjectsTab({ projects, projectsLoading, projectsError, config }) {
    return (
        <>
            {/* Create New Project Button */}
            <DegenButton href="/dashboard/create" size="lg" className="mb-8">
                + Create New Project
            </DegenButton>

            {/* Projects List */}
            {projectsLoading ? (
                <DegenLoadingState text="Loading your projects..." />
            ) : projectsError ? (
                <DegenCard variant="feature" padding="md">
                    <p className="text-white text-center">Error loading projects: {projectsError}</p>
                </DegenCard>
            ) : projects.length === 0 ? (
                <DegenEmptyState
                    title="No Projects Yet"
                    description="Create your first lootbox project to get started!"
                    action="Create Your First Project"
                    actionHref="/dashboard/create"
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <ProjectCard key={project.id} project={project} config={config} />
                    ))}
                </div>
            )}
        </>
    );
}

function MyBoxesTab({ walletAddress, config }) {
    const { publicKey, signTransaction } = useWallet();
    const { connection } = useConnection();
    const [boxesData, setBoxesData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPending, startTransition] = useTransition();

    const platformDomain = config?.network === 'devnet' ? 'degenbox.fun' : 'degenbox.fun';

    // Fetch boxes data
    const fetchUserBoxes = useCallback(async () => {
        if (!walletAddress) {
            setLoading(false);
            return;
        }

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
            const response = await fetch(`${backendUrl}/api/projects/boxes/by-owner/${walletAddress}`);
            const data = await response.json();

            if (data.success) {
                setBoxesData(data);
            } else {
                setError(data.error || 'Failed to fetch boxes');
            }
        } catch (err) {
            console.error('Error fetching boxes:', err);
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    }, [walletAddress]);

    // Refresh boxes with transition (non-blocking update)
    const refreshBoxes = useCallback(() => {
        startTransition(() => {
            fetchUserBoxes();
        });
    }, [fetchUserBoxes]);

    // Initial load
    useEffect(() => {
        fetchUserBoxes();
    }, [fetchUserBoxes]);

    if (loading) {
        return <DegenLoadingState text="Loading your boxes..." />;
    }

    if (error) {
        return (
            <DegenCard variant="feature" padding="md">
                <p className="text-white text-center">Error: {error}</p>
            </DegenCard>
        );
    }

    if (!boxesData || boxesData.totalBoxes === 0) {
        return (
            <DegenEmptyState
                icon=""
                title="No Boxes Yet"
                description="You haven't purchased any lootboxes yet. Browse projects to get started!"
            />
        );
    }

    return (
        <div className={`space-y-8 transition-opacity duration-150 ${isPending ? 'opacity-70' : 'opacity-100'}`}>
            {/* Summary */}
            <DegenCard variant="default" padding="md">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-degen-black text-xl font-medium uppercase tracking-wider">Your Collection</h2>
                        <p className="text-degen-text-muted text-sm">
                            {boxesData.totalBoxes} box{boxesData.totalBoxes !== 1 ? 'es' : ''} across {boxesData.projectCount} project{boxesData.projectCount !== 1 ? 's' : ''}
                        </p>
                    </div>
                    {isPending && (
                        <div className="text-degen-text-muted text-sm animate-pulse">
                            Updating...
                        </div>
                    )}
                </div>
            </DegenCard>

            {/* Projects with Boxes */}
            {boxesData.projectsWithBoxes.map((projectGroup) => (
                <ProjectBoxesGroup
                    key={projectGroup.project.id}
                    projectGroup={projectGroup}
                    platformDomain={platformDomain}
                    walletAddress={walletAddress}
                    publicKey={publicKey}
                    signTransaction={signTransaction}
                    connection={connection}
                    onRefresh={refreshBoxes}
                />
            ))}
        </div>
    );
}

function ProjectBoxesGroup({ projectGroup, platformDomain, walletAddress, publicKey, signTransaction, connection, onRefresh }) {
    const { project, boxes } = projectGroup;

    const projectUrl = typeof window !== 'undefined' && window.location.hostname.includes('localhost')
        ? `http://localhost:3000/project/${project.subdomain}`
        : `https://${project.subdomain}.${platformDomain}`;

    // Count box states
    const pendingBoxes = boxes.filter(b => b.box_result === 0).length;
    const revealedBoxes = boxes.filter(b => b.box_result !== 0).length;

    return (
        <DegenCard variant="default" padding="none" className="overflow-hidden">
            {/* Project Header */}
            <div className="p-6 border-b border-degen-black flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-degen-black flex items-center justify-center text-xl text-degen-white">
                        
                    </div>
                    <div>
                        <h3 className="text-degen-black text-lg font-medium uppercase tracking-wider">{project.project_name}</h3>
                        <a
                            href={projectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-degen-blue hover:underline text-sm"
                        >
                            {project.subdomain}.{platformDomain}
                        </a>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-degen-black font-medium">{boxes.length} box{boxes.length !== 1 ? 'es' : ''}</p>
                    <p className="text-degen-text-muted text-sm">
                        {pendingBoxes} pending, {revealedBoxes} revealed
                    </p>
                </div>
            </div>

            {/* Boxes Grid */}
            <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {boxes.map((box) => (
                        <BoxCard
                            key={box.id}
                            box={box}
                            project={project}
                            walletAddress={walletAddress}
                            publicKey={publicKey}
                            signTransaction={signTransaction}
                            connection={connection}
                            onRefresh={onRefresh}
                        />
                    ))}
                </div>
            </div>
        </DegenCard>
    );
}

// Pie clock timer component for expiry countdown
function ExpiryPieClock({ expiryCountdown, formatExpiryTime }) {
    const [showTooltip, setShowTooltip] = useState(false);

    // Calculate remaining time as a fraction (1 = full, 0 = empty)
    const totalSeconds = 60 * 60; // 1 hour
    const remaining = expiryCountdown > 0 ? (expiryCountdown / totalSeconds) : 0;

    // SVG arc calculation for pie slice
    const size = 20;
    const center = size / 2;
    const radius = 7;

    // Calculate the arc path for REMAINING time (black portion)
    // Starts at 12 o'clock, draws counter-clockwise to show remaining time
    // 60 mins = full black circle, 30 mins = left half black, 15 mins = top-left quarter black
    const getRemainingArcPath = () => {
        if (remaining <= 0) return '';
        if (remaining >= 1) {
            // Full circle
            return `M ${center} ${center - radius} A ${radius} ${radius} 0 1 1 ${center - 0.001} ${center - radius} Z`;
        }

        // Draw arc counter-clockwise from 12 o'clock for remaining time
        // This makes the black portion shrink clockwise as time passes
        const angle = remaining * 360;
        const radians = (-angle - 90) * (Math.PI / 180); // Negative for counter-clockwise
        const x = center + radius * Math.cos(radians);
        const y = center + radius * Math.sin(radians);
        const largeArc = angle > 180 ? 1 : 0;

        // Draw counter-clockwise (sweep-flag = 0)
        return `M ${center} ${center} L ${center} ${center - radius} A ${radius} ${radius} 0 ${largeArc} 0 ${x} ${y} Z`;
    };

    const handleClick = (e) => {
        e.stopPropagation();
        setShowTooltip(prev => !prev);
    };

    const handleClose = (e) => {
        e.stopPropagation();
        setShowTooltip(false);
    };

    return (
        <div className="relative">
            <button
                onClick={handleClick}
                className="w-5 h-5 flex items-center justify-center cursor-pointer"
            >
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {/* Background circle - white (elapsed/empty time) */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="#ffffff"
                    />
                    {/* Remaining time pie slice - black, shrinks clockwise as time passes */}
                    <path
                        d={getRemainingArcPath()}
                        fill="#1a1a1a"
                    />
                    {/* Border circle */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="#1a1a1a"
                        strokeWidth="1"
                    />
                </svg>
            </button>
            {showTooltip && (
                <>
                    <div className="fixed inset-0 z-10" onClick={handleClose} />
                    <div className="absolute right-0 top-full mt-1 z-20 min-w-[100px] bg-degen-white border border-degen-black shadow-sm">
                        <div className="px-3 py-2 text-sm text-degen-black">
                            {formatExpiryTime(expiryCountdown)} remaining
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function BoxCard({ box, project, walletAddress, publicKey, signTransaction, connection, onRefresh, network = 'devnet' }) {
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState(null); // 'commit' | 'reveal' | 'claim'
    const [revealResult, setRevealResult] = useState(null);
    const [error, setError] = useState(null);
    const [revealCountdown, setRevealCountdown] = useState(null); // seconds until reveal enabled
    const [expiryCountdown, setExpiryCountdown] = useState(null); // seconds until commit expires
    const [, startBoxTransition] = useTransition();

    // Optimistic box state for instant UI feedback
    const [optimisticBox, setOptimisticBox] = useOptimistic(
        box,
        (currentBox, update) => ({ ...currentBox, ...update })
    );

    // Use optimistic state for rendering
    const displayBox = optimisticBox;

    // Box states (using optimistic state)
    const isRevealed = displayBox.box_result > 0;
    const isCommitted = displayBox.randomness_committed && !isRevealed;
    const isPending = displayBox.box_result === 0 && !displayBox.randomness_committed;
    const hasReward = displayBox.payout_amount > 0;
    const isJackpot = displayBox.box_result === 5;

    // Check if commit has expired (1 hour limit)
    const isExpired = isCommitted && box.committed_at &&
        (Date.now() - new Date(box.committed_at).getTime() > 60 * 60 * 1000);

    // Countdown timers for committed boxes
    useEffect(() => {
        if (!isCommitted || !box.committed_at) return;

        const committedTime = new Date(box.committed_at).getTime();
        const REVEAL_DELAY = 30 * 1000; // 30 seconds before reveal enabled (oracles need time to process)
        const EXPIRY_TIME = 60 * 60 * 1000; // 1 hour

        const updateCountdowns = () => {
            const now = Date.now();
            const timeSinceCommit = now - committedTime;

            // Reveal countdown (10 seconds after commit)
            if (timeSinceCommit < REVEAL_DELAY) {
                setRevealCountdown(Math.ceil((REVEAL_DELAY - timeSinceCommit) / 1000));
            } else {
                setRevealCountdown(0);
            }

            // Expiry countdown
            const timeUntilExpiry = EXPIRY_TIME - timeSinceCommit;
            if (timeUntilExpiry > 0) {
                setExpiryCountdown(Math.ceil(timeUntilExpiry / 1000));
            } else {
                setExpiryCountdown(0);
            }
        };

        updateCountdowns();
        const interval = setInterval(updateCountdowns, 1000);
        return () => clearInterval(interval);
    }, [isCommitted, box.committed_at]);

    // Format expiry countdown as MM:SS
    const formatExpiryTime = (seconds) => {
        if (seconds <= 0) return 'Expired';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Format payout amount
    const payoutFormatted = box.payout_amount
        ? (box.payout_amount / Math.pow(10, project.payment_token_decimals || 9)).toFixed(2)
        : '0';

    // Solscan URLs (more user-friendly than Solana Explorer)
    const getSolscanTxUrl = (signature) => {
        const base = 'https://solscan.io/tx';
        return network === 'mainnet-beta'
            ? `${base}/${signature}`
            : `${base}/${signature}?cluster=${network}`;
    };

    const getSolscanAccountUrl = (address) => {
        const base = 'https://solscan.io/account';
        return network === 'mainnet-beta'
            ? `${base}/${address}`
            : `${base}/${address}?cluster=${network}`;
    };

    // Build menu items for on-chain proof
    const getMenuItems = () => {
        const items = [];

        // Purchase transaction
        if (box.purchase_tx_signature) {
            items.push({
                label: 'Purchase Tx',
                onClick: () => window.open(getSolscanTxUrl(box.purchase_tx_signature), '_blank'),
            });
        }

        // Reveal transaction (if revealed)
        if (box.reveal_tx_signature) {
            items.push({
                label: 'Reveal Tx',
                onClick: () => window.open(getSolscanTxUrl(box.reveal_tx_signature), '_blank'),
            });
        }

        // Settle/Claim transaction (if claimed)
        if (box.settle_tx_signature) {
            items.push({
                label: 'Claim Tx',
                onClick: () => window.open(getSolscanTxUrl(box.settle_tx_signature), '_blank'),
            });
        }

        // Box PDA account (if we have it)
        if (box.box_pda) {
            items.push({
                label: 'Box Account',
                onClick: () => window.open(getSolscanAccountUrl(box.box_pda), '_blank'),
            });
        }

        // If revealed, show the result details
        if (isRevealed && (box.luck_value !== undefined || box.random_percentage !== undefined)) {
            items.push({
                label: `Luck: ${box.luck_value || '?'}/${box.max_luck || '?'}`,
                onClick: () => {},
            });
            if (box.random_percentage !== undefined) {
                items.push({
                    label: `Random: ${box.random_percentage?.toFixed(2) || '?'}%`,
                    onClick: () => {},
                });
            }
        }

        return items;
    };

    // Get tier name from result
    const getTierName = (result) => {
        switch (result) {
            case 1: return 'Dud';
            case 2: return 'Rebate';
            case 3: return 'Break-even';
            case 4: return 'Profit';
            case 5: return 'Jackpot';
            default: return 'Pending';
        }
    };

    // Handle commit box (Open Box - step 1)
    const handleCommit = async () => {
        if (!publicKey || !signTransaction) return;

        setIsProcessing(true);
        setProcessingStep('commit');
        setError(null);

        // Optimistic update: immediately show as "committed" state (wrapped in transition)
        startBoxTransition(() => {
            setOptimisticBox({ randomness_committed: true, committed_at: new Date().toISOString() });
        });

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

            // Step 1: Build commit transaction
            const buildResponse = await fetch(`${backendUrl}/api/program/build-commit-box-tx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    boxId: box.box_number,
                    ownerWallet: walletAddress,
                }),
            });

            const buildResult = await buildResponse.json();
            if (!buildResult.success) {
                throw new Error(buildResult.details || buildResult.error);
            }

            // Step 2: Deserialize transaction
            const transaction = Transaction.from(Buffer.from(buildResult.transaction, 'base64'));

            // Step 3: Add randomness keypair as signer (base64 encoded from backend)
            const { Keypair } = await import('@solana/web3.js');
            const secretKeyBytes = Buffer.from(buildResult.randomnessKeypair, 'base64');
            const randomnessKeypair = Keypair.fromSecretKey(secretKeyBytes);

            // Get fresh blockhash
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;
            transaction.feePayer = publicKey;

            // Partially sign with randomness keypair first
            transaction.partialSign(randomnessKeypair);

            // Step 4: Sign with user's wallet
            const signedTransaction = await signTransaction(transaction);

            // Step 5: Send the signed transaction
            const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
                skipPreflight: true,
                preflightCommitment: 'confirmed',
            });

            // Step 6: Wait for confirmation
            await connection.confirmTransaction(signature, 'confirmed');

            // Step 7: Confirm with backend
            await fetch(`${backendUrl}/api/program/confirm-commit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    boxId: box.box_number,
                    signature,
                    randomnessAccount: buildResult.randomnessAccount,
                }),
            });

            // Refresh boxes list to show committed state
            if (onRefresh) onRefresh();

        } catch (err) {
            console.error('Error committing box:', err);
            let errorMessage = err.message;
            if (err.logs) {
                console.error('Transaction logs:', err.logs);
            }
            setError(errorMessage);
        } finally {
            setIsProcessing(false);
            setProcessingStep(null);
        }
    };

    // Handle reveal box (step 2 - after commit)
    const handleReveal = async () => {
        if (!publicKey || !signTransaction) return;

        // Check if reveal is too soon (need to wait ~10 seconds for oracle)
        if (revealCountdown > 0) {
            setError(`Please wait ${revealCountdown} seconds for oracle...`);
            return;
        }

        setIsProcessing(true);
        setProcessingStep('reveal');
        setError(null);

        // Note: We don't optimistically update reveal since we don't know the result yet
        // The result comes from the blockchain/mock, so we wait for the actual response

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

            // Step 1: Build reveal transaction
            const buildResponse = await fetch(`${backendUrl}/api/program/build-reveal-box-tx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    boxId: box.box_number,
                    ownerWallet: walletAddress,
                }),
            });

            const buildResult = await buildResponse.json();

            if (!buildResult.success) {
                // Check if expired
                if (buildResult.expired) {
                    setError('Reveal window expired - box is now a Dud');
                    if (onRefresh) onRefresh();
                    return;
                }
                throw new Error(buildResult.details || buildResult.error);
            }

            // Step 2: Deserialize transaction
            const transaction = Transaction.from(Buffer.from(buildResult.transaction, 'base64'));
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;
            transaction.feePayer = publicKey;

            // Step 3: Sign with user's wallet
            const signedTransaction = await signTransaction(transaction);

            // Step 4: Send the signed transaction
            const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
                skipPreflight: false, // Enable preflight to catch errors early
                preflightCommitment: 'confirmed',
            });

            // Step 5: Wait for confirmation and check for errors
            const confirmation = await connection.confirmTransaction(signature, 'confirmed');

            // Check if transaction actually succeeded
            if (confirmation.value?.err) {
                console.error('Transaction failed:', confirmation.value.err);
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }

            // Step 6: Confirm with backend to read on-chain reward
            const confirmResponse = await fetch(`${backendUrl}/api/program/confirm-reveal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    boxId: box.box_number,
                    ownerWallet: walletAddress,
                    signature,
                }),
            });

            const confirmResult = await confirmResponse.json();
            if (confirmResult.success && confirmResult.reward) {
                // Optimistic update with reveal result (wrapped in transition)
                startBoxTransition(() => {
                    setOptimisticBox({
                        box_result: confirmResult.reward?.tier || 1,
                        payout_amount: confirmResult.reward?.payoutAmount || 0,
                        randomness_committed: false
                    });
                });
                setRevealResult(confirmResult.reward);
            }

            // Refresh boxes list
            if (onRefresh) onRefresh();

        } catch (err) {
            console.error('Error revealing box:', err);

            let errorMessage = err.message;
            if (err.logs) {
                console.error('Transaction logs:', err.logs);
                errorMessage = err.logs.join('\n');
            }
            if (err.message?.includes('custom program error')) {
                errorMessage = `Program error: ${err.message}`;
            }
            // Provide helpful message for Switchboard errors
            if (err.message?.includes('0x1780') || err.message?.includes('InvalidSecpSignature')) {
                errorMessage = 'Switchboard oracle error. Please wait a few seconds and try again.';
            }
            setError(errorMessage);
            setRevealResult(null);
        } finally {
            setIsProcessing(false);
            setProcessingStep(null);
        }
    };

    // Handle claim reward (settle)
    const handleClaim = async () => {
        if (!publicKey || !signTransaction) return;

        setIsProcessing(true);
        setProcessingStep('claim');
        setError(null);

        // Optimistic update: immediately show as "claimed" state (wrapped in transition)
        startBoxTransition(() => {
            setOptimisticBox({ settled_at: new Date().toISOString() });
        });

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

            // Step 1: Build settle transaction
            const buildResponse = await fetch(`${backendUrl}/api/program/build-settle-box-tx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    boxId: box.box_number,
                    ownerWallet: walletAddress,
                }),
            });

            const buildResult = await buildResponse.json();

            if (!buildResult.success) {
                throw new Error(buildResult.details || buildResult.error);
            }

            // Step 2: Deserialize transaction and update blockhash
            const transaction = Transaction.from(Buffer.from(buildResult.transaction, 'base64'));
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;

            // Step 3: Sign with user's wallet
            const signedTransaction = await signTransaction(transaction);

            // Step 4: Send the signed transaction
            const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
            });

            // Step 5: Wait for confirmation and check for errors
            const confirmation = await connection.confirmTransaction(signature, 'confirmed');

            // Check if transaction actually succeeded
            if (confirmation.value?.err) {
                console.error('Transaction failed:', confirmation.value.err);
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }

            // Step 6: Confirm with backend
            await fetch(`${backendUrl}/api/program/confirm-settle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    boxId: box.box_number,
                    signature,
                }),
            });

            // Show success and refresh
            toast.success(`Successfully claimed ${payoutFormatted} ${project.payment_token_symbol}!`);
            if (onRefresh) onRefresh();

        } catch (err) {
            console.error('Error claiming reward:', err);
            // Extract more detailed error info if available
            let errorMessage = err.message;
            if (err.logs) {
                console.error('Transaction logs:', err.logs);
                errorMessage = err.logs.join('\n');
            }
            if (err.message?.includes('custom program error')) {
                errorMessage = `Program error: ${err.message}`;
            }
            setError(errorMessage);
        } finally {
            setIsProcessing(false);
            setProcessingStep(null);
        }
    };

    // Get box status text (no emojis)
    const getBoxStatusText = () => {
        if (isProcessing) return 'Processing';
        if (isExpired) return 'Expired';
        if (isCommitted) return 'Opened';
        if (isPending) return 'Sealed';
        if (isJackpot) return 'JACKPOT';
        if (box.box_result === 4) return 'Profit';
        if (hasReward) return 'Winner';
        return 'Dud';
    };

    // Get badge variant for tier
    const getTierBadgeVariant = () => {
        if (isJackpot) return 'warning';
        if (hasReward) return 'success';
        return 'default';
    };

    const menuItems = getMenuItems();

    // Calculate reveal button progress (for the loading bar effect) - 30 second delay
    const revealProgress = revealCountdown !== null && revealCountdown > 0
        ? ((30 - revealCountdown) / 30) * 100
        : 100;

    return (
        <div
            className={`
                relative p-4 text-center transition-all duration-100
                border
                ${isPending ? 'bg-degen-yellow/10 border-degen-yellow hover:bg-degen-yellow/20' : ''}
                ${isCommitted && !isExpired ? 'bg-degen-yellow/10 border-degen-yellow hover:bg-degen-yellow/20' : ''}
                ${isExpired ? 'bg-degen-feature/10 border-degen-feature' : ''}
                ${isJackpot ? 'bg-degen-yellow/20 border-degen-yellow' : ''}
                ${hasReward && !isJackpot ? 'bg-degen-green/10 border-degen-green hover:bg-degen-green/20' : ''}
                ${isRevealed && !hasReward ? 'bg-degen-container border-degen-black hover:bg-degen-white' : ''}
            `}
        >
            {/* Top right icons: Pie clock (for committed) + Proof Menu Dropdown */}
            <div className="absolute top-1 right-1 flex items-center gap-1">
                {/* Pie clock for committed boxes */}
                {isCommitted && !isExpired && expiryCountdown !== null && expiryCountdown > 0 && (
                    <ExpiryPieClock expiryCountdown={expiryCountdown} formatExpiryTime={formatExpiryTime} />
                )}
                {/* Proof Menu Dropdown */}
                {menuItems.length > 0 && (
                    <CardDropdown items={menuItems} />
                )}
            </div>

            {/* Box Status Text (no emojis) */}
            <div className="text-sm font-medium text-degen-text-muted mb-1 mt-2">
                {getBoxStatusText()}
            </div>
            <p className="text-degen-black font-medium">Box #{box.box_number}</p>

            {/* Status / Result */}
            {isPending ? (
                <DegenBadge variant="warning" size="sm" className="mt-2">
                    Ready to Open
                </DegenBadge>
            ) : isExpired ? (
                <DegenBadge variant="danger" size="sm" className="mt-2">
                    Expired - Dud
                </DegenBadge>
            ) : isCommitted ? (
                <div className="mt-2">
                    <DegenBadge variant="warning" size="sm">
                        Awaiting Reveal
                    </DegenBadge>
                </div>
            ) : (
                <div className="mt-2">
                    <DegenBadge variant={getTierBadgeVariant()} size="sm">
                        {getTierName(box.box_result)}
                    </DegenBadge>
                    {hasReward && (
                        <p className="text-degen-black text-xs mt-1 font-medium">
                            {payoutFormatted} {project.payment_token_symbol}
                        </p>
                    )}
                </div>
            )}

            {/* Error Display */}
            {error && (
                <p className="text-degen-feature text-xs mt-1 truncate font-medium" title={error}>
                    Error
                </p>
            )}

            {/* Action Button */}
            <div className="mt-3">
                {isPending ? (
                    // Step 1: Open Box (commit randomness)
                    <DegenButton
                        onClick={handleCommit}
                        disabled={isProcessing}
                        variant="primary"
                        size="sm"
                        fullWidth
                    >
                        {isProcessing && processingStep === 'commit' ? 'Opening...' : 'Open Box'}
                    </DegenButton>
                ) : isExpired ? (
                    // Expired - show dud state
                    <span className="text-degen-text-muted text-xs">Reveal window expired</span>
                ) : isCommitted ? (
                    // Step 2: Reveal Box (after commit) - with progress bar
                    <div className="relative w-full">
                        <button
                            onClick={handleReveal}
                            disabled={isProcessing || revealCountdown > 0}
                            className={`
                                relative w-full px-4 py-2 text-sm font-medium uppercase tracking-wider
                                border border-degen-black overflow-hidden
                                transition-all duration-100
                                ${revealCountdown > 0 ? 'bg-degen-container text-degen-text-muted cursor-not-allowed' : 'bg-degen-yellow text-degen-black hover:bg-degen-black hover:text-degen-white'}
                            `}
                        >
                            {/* Progress bar that fills from left to right */}
                            {revealCountdown > 0 && (
                                <div
                                    className="absolute inset-y-0 left-0 bg-degen-yellow/60 transition-all duration-1000 ease-linear"
                                    style={{ width: `${revealProgress}%` }}
                                />
                            )}
                            <span className="relative z-10">
                                {isProcessing && processingStep === 'reveal'
                                    ? 'Revealing...'
                                    : revealCountdown > 0
                                        ? `Reveal in ${revealCountdown}s`
                                        : 'Reveal Box'}
                            </span>
                        </button>
                    </div>
                ) : hasReward && !box.settled_at ? (
                    // Revealed with reward - claim button
                    <DegenButton
                        onClick={handleClaim}
                        disabled={isProcessing}
                        variant="success"
                        size="sm"
                        fullWidth
                    >
                        {isProcessing && processingStep === 'claim' ? 'Claiming...' : 'Claim'}
                    </DegenButton>
                ) : hasReward ? (
                    // Already claimed
                    <DegenBadge variant="success" size="sm">Claimed</DegenBadge>
                ) : (
                    // Revealed but no reward (dud)
                    <span className="text-degen-text-muted text-xs">No reward</span>
                )}
            </div>

            {/* Purchase Date */}
            <p className="text-degen-text-light text-xs mt-2">
                {new Date(box.created_at).toLocaleDateString()}
            </p>
        </div>
    );
}

function ProjectCard({ project, config }) {
    const router = useRouter();
    const [vaultBalance, setVaultBalance] = useState(null);
    const [balanceLoading, setBalanceLoading] = useState(true);

    const isDevnet = project.network === 'devnet';
    const platformDomain = config?.network === 'devnet'
        ? 'degenbox.fun'  // Will be localhost:3000 in dev
        : 'degenbox.fun';

    // Generate project URL
    const projectUrl = typeof window !== 'undefined' && window.location.hostname.includes('localhost')
        ? `http://localhost:3000/project/${project.subdomain}`
        : `https://${project.subdomain}.${platformDomain}`;

    // Fetch vault balance
    useEffect(() => {
        async function fetchVaultBalance() {
            if (!project.project_numeric_id) {
                setBalanceLoading(false);
                return;
            }

            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
                const response = await fetch(`${backendUrl}/api/vault/balance/${project.project_numeric_id}`);
                const data = await response.json();

                if (data.success) {
                    setVaultBalance(data.balance);
                } else {
                    setVaultBalance(0);
                }
            } catch (error) {
                console.error('Failed to fetch vault balance:', error);
                setVaultBalance(0);
            } finally {
                setBalanceLoading(false);
            }
        }

        fetchVaultBalance();
    }, [project.project_numeric_id]);

    return (
        <DegenCard variant="white" hover className="flex flex-col">
            {/* Network Badge */}
            {isDevnet && (
                <div className="mb-3">
                    <DegenBadge variant="warning" size="sm">
                        DEVNET
                    </DegenBadge>
                </div>
            )}

            {/* Project Logo */}
            {project.logo_url && (
                <img
                    src={project.logo_url}
                    alt={project.name}
                    className="w-16 h-16 mb-4 border border-degen-black"
                />
            )}

            {/* Project Name */}
            <h3 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-2">{project.name}</h3>

            {/* Description */}
            {project.description && (
                <p className="text-degen-text-muted text-sm mb-4 line-clamp-2">
                    {project.description}
                </p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="text-center bg-degen-bg p-2 border border-degen-black">
                    <p className="text-degen-text-muted text-xs uppercase">Boxes</p>
                    <p className="text-degen-black font-medium">{project.total_boxes_created || 0}</p>
                </div>
                <div className="text-center bg-degen-bg p-2 border border-degen-black">
                    <p className="text-degen-text-muted text-xs uppercase">Jackpots</p>
                    <p className="text-degen-black font-medium">{project.total_jackpots_hit || 0}</p>
                </div>
                <div className="text-center bg-degen-bg p-2 border border-degen-black">
                    <p className="text-degen-text-muted text-xs uppercase">Vault Balance</p>
                    <p className="text-degen-black font-medium">
                        {balanceLoading
                            ? '...'
                            : `${(vaultBalance / Math.pow(10, project.payment_token_decimals || 9)).toFixed(2)} ${project.payment_token_symbol || 'tokens'}`}
                    </p>
                </div>
                <div className="text-center bg-degen-bg p-2 border border-degen-black">
                    <p className="text-degen-text-muted text-xs uppercase">Status</p>
                    <DegenBadge
                        variant={project.closed_at ? 'default' : (project.is_active ? 'success' : 'danger')}
                        size="sm"
                        dot
                    >
                        {project.closed_at ? 'Permanently Closed' : (project.is_active ? 'Active' : 'Paused')}
                    </DegenBadge>
                </div>
            </div>

            {/* Subdomain */}
            <div className="mb-4 p-3 bg-degen-bg border border-degen-black">
                <p className="text-degen-text-muted text-xs uppercase mb-1">Your Subdomain</p>
                <a
                    href={projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-degen-blue hover:underline text-sm break-all font-medium"
                >
                    {project.subdomain}.{platformDomain}
                </a>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-auto">
                <DegenButton
                    onClick={() => window.open(projectUrl, '_blank')}
                    variant="blue"
                    size="sm"
                    className="flex-1"
                >
                    Visit Site
                </DegenButton>
                <DegenButton
                    onClick={() => router.push(`/dashboard/manage/${project.id}`)}
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                >
                    Manage
                </DegenButton>
            </div>
        </DegenCard>
    );
}
