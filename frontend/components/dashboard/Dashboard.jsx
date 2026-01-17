// components/dashboard/Dashboard.jsx
'use client';

import { useEffect, useState, useCallback, useTransition, useOptimistic } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { useRouter, useSearchParams } from 'next/navigation';
import useProjectStore from '@/store/useProjectStore';
import useNetworkStore from '@/store/useNetworkStore';
import { getProjectUrl } from '@/lib/getNetworkConfig';
import {
    DegenButton,
    DegenCard,
    DegenTabs,
    DegenTabsList,
    DegenTabsTrigger,
    DegenTabsContent,
    DegenBadge,
    DegenLoadingState,
    DegenEmptyState,
    CardDropdown,
    useToast,
    useTransaction,
} from '@/components/ui';

export default function Dashboard() {
    const { publicKey, connected } = useWallet();
    const searchParams = useSearchParams();
    const initialTab = searchParams.get('tab') || 'boxes';
    const [activeTab, setActiveTab] = useState(initialTab);

    const {
        projects,
        projectsLoading,
        projectsError,
        loadProjectsByOwner,
    } = useProjectStore();

    const { config, configLoading } = useNetworkStore();

    // Load data when connected
    useEffect(() => {
        // Load user's projects when connected
        if (publicKey && config && connected) {
            loadProjectsByOwner(publicKey.toString());
        }
    }, [publicKey, connected, config, loadProjectsByOwner]);

    if (configLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-degen-bg">
                <DegenLoadingState text="Loading..." />
            </div>
        );
    }

    if (!connected) {
        return (
            <div className="min-h-screen bg-degen-bg pt-24 pb-12 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-degen-black text-4xl font-medium uppercase tracking-wider mb-2">Dashboard</h1>
                        <p className="text-degen-text-muted text-lg">
                            Manage your projects and view your purchased boxes
                        </p>
                    </div>
                    <DegenCard variant="white" padding="lg" className="text-center">
                        <h2 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-4">
                            Connect Your Wallet
                        </h2>
                        <p className="text-degen-text-muted mb-6">
                            Please connect your wallet to view your dashboard, projects, and boxes.
                        </p>
                    </DegenCard>
                </div>
            </div>
        );
    }

    // Network badge
    const isDevnet = config?.network === 'devnet';

    return (
        <div className="min-h-screen bg-degen-bg pt-24 pb-12 px-4">
            <div className="w-full mx-auto">
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
                        />
                    </DegenTabsContent>

                    <DegenTabsContent value="boxes">
                        <MyBoxesTab walletAddress={publicKey?.toString()} />
                    </DegenTabsContent>
                </DegenTabs>
            </div>
        </div>
    );
}

function MyProjectsTab({ projects, projectsLoading, projectsError }) {
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
                        <ProjectCard key={project.id} project={project} />
                    ))}
                </div>
            )}
        </>
    );
}

function MyBoxesTab({ walletAddress }) {
    const [boxesData, setBoxesData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPending, startTransition] = useTransition();

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
                    onRefresh={refreshBoxes}
                />
            ))}
        </div>
    );
}

function ProjectBoxesGroup({ projectGroup, onRefresh }) {
    const { project, boxes } = projectGroup;
    const projectUrl = getProjectUrl(project.subdomain);

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
                            {project.subdomain}.degenbox.fun
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

function BoxCard({ box, project, onRefresh }) {
    const { publicKey, signTransaction } = useWallet();
    const { connection } = useConnection();
    const { config } = useNetworkStore();
    const { toast } = useToast();
    const { startTransaction, addLog, endTransaction } = useTransaction();

    const walletAddress = publicKey?.toString();
    const network = config?.network || 'devnet';
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState(null); // 'commit' | 'reveal' | 'claim'
    const [revealResult, setRevealResult] = useState(null);
    const [error, setError] = useState(null);
    const [revealCountdown, setRevealCountdown] = useState(null); // seconds until reveal enabled
    const [expiryCountdown, setExpiryCountdown] = useState(null); // seconds until commit expires
    const [commitCooldown, setCommitCooldown] = useState(null); // seconds until "Open Box" enabled after purchase
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

    // Cooldown timer for pending boxes (must wait 30s after purchase before opening)
    useEffect(() => {
        if (!isPending || !box.created_at) return;

        const createdTime = new Date(box.created_at).getTime();
        const COMMIT_COOLDOWN = 30 * 1000; // 30 seconds after purchase before commit/open is allowed

        const updateCooldown = () => {
            const now = Date.now();
            const timeSincePurchase = now - createdTime;

            if (timeSincePurchase < COMMIT_COOLDOWN) {
                setCommitCooldown(Math.ceil((COMMIT_COOLDOWN - timeSincePurchase) / 1000));
            } else {
                setCommitCooldown(0);
            }
        };

        updateCooldown();
        const interval = setInterval(updateCooldown, 1000);
        return () => clearInterval(interval);
    }, [isPending, box.created_at]);

    // Countdown timers for committed boxes
    useEffect(() => {
        if (!isCommitted || !box.committed_at) return;

        const committedTime = new Date(box.committed_at).getTime();
        const REVEAL_DELAY = 10 * 1000; // 10 seconds before reveal enabled (oracles need time to process)
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
                onClick: () => { },
            });
            if (box.random_percentage !== undefined) {
                items.push({
                    label: `Random: ${box.random_percentage?.toFixed(2) || '?'}%`,
                    onClick: () => { },
                });
            }
        }

        return items;
    };

    // Get tier name from result
    // DB values: 0=pending, 1=dud, 2=rebate, 3=break-even, 4=profit, 5=jackpot
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
        startTransaction(`Opening Box #${box.box_number}...`);

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

            // Step 0: Check oracle health before committing
            addLog('Checking oracle status...');
            try {
                const healthResponse = await fetch(`${backendUrl}/api/oracle-health`);
                const healthResult = await healthResponse.json();

                if (!healthResult.healthy) {
                    setError(`Oracle service unavailable: ${healthResult.message}. Please wait a few minutes before opening boxes.`);
                    endTransaction(false, 'Oracle unavailable');
                    return;
                }
                addLog('Oracle healthy');
            } catch (healthErr) {
                // If health check fails, warn but allow user to proceed
                console.warn('Oracle health check failed:', healthErr);
                addLog('Oracle check skipped (proceeding anyway)');
            }

            // Optimistic update: immediately show as "committed" state (wrapped in transition)
            startBoxTransition(() => {
                setOptimisticBox({ randomness_committed: true, committed_at: new Date().toISOString() });
            });

            // Step 1: Build commit transaction
            addLog('Building transaction...');
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
            addLog('Transaction built');

            // Step 2: Deserialize transaction
            const transaction = Transaction.from(Buffer.from(buildResult.transaction, 'base64'));

            // Step 3: Add randomness keypair as signer (base64 encoded from backend)
            addLog('Creating randomness account...');
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
            addLog('Requesting wallet signature...');
            const signedTransaction = await signTransaction(transaction);

            // Step 5: Send the signed transaction
            addLog('Submitting to Solana...');
            const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
                skipPreflight: true,
                preflightCommitment: 'confirmed',
            });
            addLog(`TX: ${signature.slice(0, 8)}...`);

            // Step 6: Wait for confirmation
            addLog('Waiting for confirmation...');
            await connection.confirmTransaction(signature, 'confirmed');

            // Step 7: Confirm with backend
            addLog('Confirming with backend...');
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

            endTransaction(true, 'Box opened! Wait 10s then reveal.');
            // Refresh boxes list to show committed state
            if (onRefresh) onRefresh();

        } catch (err) {
            console.error('Error committing box:', err);
            let errorMessage = err.message;
            if (err.logs) {
                console.error('Transaction logs:', err.logs);
            }
            setError(errorMessage);
            endTransaction(false, errorMessage);
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
        startTransaction(`Revealing Box #${box.box_number}...`);

        // Note: We don't optimistically update reveal since we don't know the result yet
        // The result comes from the blockchain/mock, so we wait for the actual response

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

            // Step 1: Build reveal transaction
            addLog('Building reveal transaction...');
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
                // Handle specific error codes from backend
                const errorCode = buildResult.errorCode;

                // Check if expired
                if (buildResult.expired || errorCode === 'REVEAL_EXPIRED') {
                    endTransaction(false, 'Reveal window expired - box is now a Dud');
                    if (onRefresh) onRefresh();
                    return;
                }

                // Handle oracle unavailability with helpful messaging
                if (errorCode === 'ORACLE_UNAVAILABLE' || errorCode === 'ORACLE_TIMEOUT') {
                    const timeRemaining = buildResult.timeRemainingSeconds;
                    let timeMsg = '';
                    if (timeRemaining && timeRemaining > 0) {
                        const mins = Math.floor(timeRemaining / 60);
                        const secs = timeRemaining % 60;
                        timeMsg = ` You have ${mins}m ${secs}s remaining to retry.`;
                    }
                    const retryMsg = buildResult.retryAfterSeconds
                        ? ` Try again in ${buildResult.retryAfterSeconds} seconds.`
                        : ' Please try again shortly.';

                    const fullErrorMsg = buildResult.error + timeMsg + retryMsg;
                    setError(fullErrorMsg);
                    endTransaction(false, 'Oracle temporarily unavailable');
                    return;
                }

                // Handle insufficient funds
                if (errorCode === 'INSUFFICIENT_FUNDS') {
                    setError(buildResult.error);
                    endTransaction(false, 'Insufficient SOL for fees');
                    return;
                }

                throw new Error(buildResult.details || buildResult.error);
            }

            // Check if result was recovered from on-chain (already revealed)
            if (buildResult.alreadyRevealed && buildResult.reward) {
                addLog('Result recovered from on-chain!');

                // Update UI with recovered result
                startBoxTransition(() => {
                    setOptimisticBox({
                        box_result: buildResult.reward.tier,
                        payout_amount: buildResult.reward.payoutAmount,
                        randomness_committed: false
                    });
                });
                setRevealResult(buildResult.reward);

                const tierName = getTierName(buildResult.reward.tier);
                const payout = buildResult.reward.payoutAmount
                    ? (buildResult.reward.payoutAmount / Math.pow(10, project.payment_token_decimals || 9)).toFixed(2)
                    : '0';
                endTransaction(true, `Recovered: ${tierName}! Payout: ${payout} ${project.payment_token_symbol}`);

                // Refresh boxes list
                if (onRefresh) onRefresh();
                return;
            }

            addLog('Reveal transaction built');

            // Step 2: Deserialize transaction
            const transaction = Transaction.from(Buffer.from(buildResult.transaction, 'base64'));
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;
            transaction.feePayer = publicKey;

            // Step 3: Sign with user's wallet
            addLog('Requesting wallet signature...');
            const signedTransaction = await signTransaction(transaction);

            // Step 4: Send the signed transaction
            addLog('Submitting to Solana...');
            const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
                skipPreflight: false, // Enable preflight to catch errors early
                preflightCommitment: 'confirmed',
            });
            addLog(`TX: ${signature.slice(0, 8)}...`);

            // Step 5: Wait for confirmation and check for errors
            addLog('Waiting for confirmation...');
            const confirmation = await connection.confirmTransaction(signature, 'confirmed');

            // Check if transaction actually succeeded
            if (confirmation.value?.err) {
                console.error('Transaction failed:', confirmation.value.err);
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }

            // Step 6: Confirm with backend to read on-chain reward
            addLog('Reading on-chain result...');
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

                const tierName = getTierName(confirmResult.reward?.tier);
                const payout = confirmResult.reward?.payoutAmount
                    ? (confirmResult.reward.payoutAmount / Math.pow(10, project.payment_token_decimals || 9)).toFixed(2)
                    : '0';
                endTransaction(true, `Result: ${tierName}! Payout: ${payout} ${project.payment_token_symbol}`);
            } else {
                endTransaction(true, 'Revealed!');
            }

            // Refresh boxes list
            if (onRefresh) onRefresh();

        } catch (err) {
            console.error('Error revealing box:', err);

            // Check if this is "already processed" error - means the reveal happened but we missed it
            // Retry the reveal call to trigger backend's recovery flow
            if (err.message?.includes('already been processed') || err.message?.includes('AlreadyProcessed')) {
                console.log('Transaction already processed - retrying to trigger recovery flow...');
                addLog('Recovering result...');

                try {
                    const retryResponse = await fetch(`${backendUrl}/api/program/build-reveal-box-tx`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            projectId: project.project_numeric_id,
                            boxId: box.box_number,
                            ownerWallet: walletAddress,
                        }),
                    });

                    const retryResult = await retryResponse.json();

                    if (retryResult.alreadyRevealed && retryResult.reward) {
                        // Recovery succeeded!
                        startBoxTransition(() => {
                            setOptimisticBox({
                                box_result: retryResult.reward.tier,
                                payout_amount: retryResult.reward.payoutAmount,
                                randomness_committed: false
                            });
                        });
                        setRevealResult(retryResult.reward);

                        const tierName = getTierName(retryResult.reward.tier);
                        const payout = retryResult.reward.payoutAmount
                            ? (retryResult.reward.payoutAmount / Math.pow(10, project.payment_token_decimals || 9)).toFixed(2)
                            : '0';
                        endTransaction(true, `Recovered: ${tierName}! Payout: ${payout} ${project.payment_token_symbol}`);

                        if (onRefresh) onRefresh();
                        return;
                    }
                } catch (retryErr) {
                    console.error('Recovery retry failed:', retryErr);
                }
            }

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
            endTransaction(false, errorMessage);
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

        startTransaction(`Claiming reward from Box #${box.box_number}...`);

        // Optimistic update: immediately show as "claimed" state (wrapped in transition)
        startBoxTransition(() => {
            setOptimisticBox({ settled_at: new Date().toISOString() });
        });

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

            // Step 1: Build settle transaction
            addLog('Building settle transaction...');
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
            addLog('Transaction built');

            // Step 2: Deserialize transaction and update blockhash
            const transaction = Transaction.from(Buffer.from(buildResult.transaction, 'base64'));
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;

            // Step 3: Sign with user's wallet
            addLog('Requesting wallet signature...');
            const signedTransaction = await signTransaction(transaction);

            // Step 4: Send the signed transaction
            addLog('Submitting to Solana...');
            const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
            });
            addLog(`TX: ${signature.slice(0, 8)}...`);

            // Step 5: Wait for confirmation and check for errors
            addLog('Waiting for confirmation...');
            const confirmation = await connection.confirmTransaction(signature, 'confirmed');

            // Check if transaction actually succeeded
            if (confirmation.value?.err) {
                console.error('Transaction failed:', confirmation.value.err);
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }
            // Step 6: Confirm with backend
            addLog('Confirming with backend...');
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
            endTransaction(true, `Claimed ${payoutFormatted} ${project.payment_token_symbol}!`);
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
            endTransaction(false, errorMessage);
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

    // Calculate reveal button progress (for the loading bar effect) - 10 second delay
    const revealProgress = revealCountdown !== null && revealCountdown > 0
        ? ((10 - revealCountdown) / 10) * 100
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
                <div className="bg-red-50 border border-red-200 rounded px-2 py-1.5 mt-2">
                    <p className="text-red-700 text-xs font-medium">
                        {error.includes('oracle') || error.includes('Oracle')
                            ? 'Oracle Service Issue'
                            : error.includes('Insufficient')
                                ? 'Insufficient Funds'
                                : 'Error'}
                    </p>
                    <p className="text-red-600 text-xs mt-0.5 break-words">
                        {error.length > 150 ? error.slice(0, 147) + '...' : error}
                    </p>
                </div>
            )}

            {/* Action Button */}
            <div className="mt-3">
                {isPending ? (
                    // Step 1: Open Box (commit randomness) - with cooldown after purchase
                    <div className="relative w-full">
                        <button
                            onClick={handleCommit}
                            disabled={isProcessing || (commitCooldown !== null && commitCooldown > 0)}
                            className={`
                                relative w-full px-4 py-2 text-sm font-medium uppercase tracking-wider
                                border border-degen-black overflow-hidden
                                transition-all duration-100
                                ${commitCooldown > 0 ? 'bg-degen-white cursor-not-allowed' : 'bg-degen-black text-degen-white hover:bg-degen-primary'}
                            `}
                        >
                            {/* Progress bar that fills from left to right - black background */}
                            {commitCooldown > 0 && (
                                <div
                                    className="absolute inset-y-0 left-0 bg-degen-black transition-all duration-1000 ease-linear"
                                    style={{ width: `${((30 - commitCooldown) / 30) * 100}%` }}
                                />
                            )}
                            {/* Text with mix-blend-difference - black on white, white on black */}
                            <span className={`relative z-10 ${commitCooldown > 0 ? 'mix-blend-difference text-white' : ''}`}>
                                {isProcessing && processingStep === 'commit'
                                    ? 'Opening...'
                                    : commitCooldown > 0
                                        ? `Open in ${commitCooldown}s`
                                        : 'Open Box'}
                            </span>
                        </button>
                    </div>
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

function ProjectCard({ project }) {
    const router = useRouter();
    const [vaultBalance, setVaultBalance] = useState(null);
    const [balanceLoading, setBalanceLoading] = useState(true);

    const isDevnet = project.network === 'devnet';
    const projectUrl = getProjectUrl(project.subdomain);

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
        <DegenCard variant="white" className="flex flex-col">
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
                    <p className="text-degen-text-muted text-xs uppercase">Settled</p>
                    <p className="text-degen-black font-medium">{project.total_boxes_settled || 0}</p>
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
                    {project.subdomain}.degenbox.fun
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
