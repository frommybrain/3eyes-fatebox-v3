// components/dashboard/Dashboard.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
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
} from '@/components/ui';

export default function Dashboard() {
    const router = useRouter();
    const { publicKey, connected } = useWallet();
    const [activeTab, setActiveTab] = useState('projects');

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
                        <DegenTabsTrigger value="projects">
                            My Projects
                        </DegenTabsTrigger>
                        <DegenTabsTrigger value="boxes">
                            My Boxes
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
    const { publicKey, sendTransaction, signTransaction } = useWallet();
    const { connection } = useConnection();
    const [boxesData, setBoxesData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const platformDomain = config?.network === 'devnet' ? 'degenbox.fun' : 'degenbox.fun';

    // Refresh boxes data
    const refreshBoxes = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);

    useEffect(() => {
        async function fetchUserBoxes() {
            if (!walletAddress) {
                setLoading(false);
                return;
            }

            setLoading(true);
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
        }

        fetchUserBoxes();
    }, [walletAddress, refreshKey]);

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
        <div className="space-y-8">
            {/* Summary */}
            <DegenCard variant="default" padding="md">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-degen-black text-xl font-medium uppercase tracking-wider">Your Collection</h2>
                        <p className="text-degen-text-muted text-sm">
                            {boxesData.totalBoxes} box{boxesData.totalBoxes !== 1 ? 'es' : ''} across {boxesData.projectCount} project{boxesData.projectCount !== 1 ? 's' : ''}
                        </p>
                    </div>
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
                    sendTransaction={sendTransaction}
                    signTransaction={signTransaction}
                    connection={connection}
                    onRefresh={refreshBoxes}
                />
            ))}
        </div>
    );
}

function ProjectBoxesGroup({ projectGroup, platformDomain, walletAddress, publicKey, sendTransaction, signTransaction, connection, onRefresh }) {
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {boxes.map((box) => (
                        <BoxCard
                            key={box.id}
                            box={box}
                            project={project}
                            walletAddress={walletAddress}
                            publicKey={publicKey}
                            sendTransaction={sendTransaction}
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

function BoxCard({ box, project, walletAddress, publicKey, sendTransaction, signTransaction, connection, onRefresh, network = 'devnet' }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [revealResult, setRevealResult] = useState(null);
    const [error, setError] = useState(null);

    const isPending = box.box_result === 0;
    // box_result: 1=dud, 2=rebate, 3=break-even, 4=profit, 5=jackpot
    const isRevealed = box.box_result > 0;
    const hasReward = box.payout_amount > 0;
    const isJackpot = box.box_result === 5;

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

    // Handle reveal box
    const handleReveal = async () => {
        if (!publicKey || !signTransaction) return;

        setIsProcessing(true);
        setError(null);

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
            // Skip preflight to get actual on-chain error if simulation fails
            const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
                skipPreflight: true,
                preflightCommitment: 'confirmed',
            });

            // Step 5: Wait for confirmation
            await connection.confirmTransaction(signature, 'confirmed');

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
                setRevealResult(confirmResult.reward);
            }

            // Refresh boxes list
            if (onRefresh) onRefresh();

        } catch (err) {
            console.error('Error revealing box:', err);
            // Try to extract more useful error message
            let errorMessage = err.message;
            if (err.logs) {
                console.error('Transaction logs:', err.logs);
                errorMessage = err.logs.join('\n');
            }
            if (err.message?.includes('custom program error')) {
                errorMessage = `Program error: ${err.message}`;
            }
            setError(errorMessage);
            setRevealResult(null);
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle claim reward (settle)
    const handleClaim = async () => {
        if (!publicKey || !sendTransaction) return;

        setIsProcessing(true);
        setError(null);

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

            // Step 2: Deserialize and sign transaction
            const transaction = Transaction.from(Buffer.from(buildResult.transaction, 'base64'));
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;

            // Step 3: Send transaction
            const signature = await sendTransaction(transaction, connection, {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
            });

            // Step 4: Wait for confirmation
            await connection.confirmTransaction(signature, 'confirmed');

            // Step 5: Confirm with backend
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
            alert(`Successfully claimed ${payoutFormatted} ${project.payment_token_symbol}!`);
            if (onRefresh) onRefresh();

        } catch (err) {
            console.error('Error claiming reward:', err);
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // Get box icon
    const getBoxIcon = () => {
        if (isPending) return '';
        if (isJackpot) return '';
        if (box.box_result === 4) return ''; // Profit
        if (hasReward) return '';
        return ''; // Dud
    };

    // Get badge variant for tier
    const getTierBadgeVariant = () => {
        if (isJackpot) return 'warning';
        if (hasReward) return 'success';
        return 'default';
    };

    const menuItems = getMenuItems();

    return (
        <div
            className={`
                relative p-4 text-center transition-all duration-100
                border
                ${isPending ? 'bg-degen-yellow/10 border-degen-yellow hover:bg-degen-yellow/20' : ''}
                ${isJackpot ? 'bg-degen-yellow/20 border-degen-yellow' : ''}
                ${hasReward && !isJackpot ? 'bg-degen-green/10 border-degen-green hover:bg-degen-green/20' : ''}
                ${!isPending && !hasReward ? 'bg-degen-container border-degen-black hover:bg-degen-white' : ''}
            `}
        >
            {/* Proof Menu Dropdown */}
            {menuItems.length > 0 && (
                <div className="absolute top-1 right-1">
                    <CardDropdown items={menuItems} />
                </div>
            )}

            {/* Box Icon */}
            <div className="text-2xl mb-2">
                {isProcessing ? '⏳' : getBoxIcon()}
            </div>
            <p className="text-degen-black font-medium">Box #{box.box_number}</p>

            {/* Status / Result */}
            {isPending ? (
                <DegenBadge variant="warning" size="sm" className="mt-2">
                    Ready to Open
                </DegenBadge>
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
                    <DegenButton
                        onClick={handleReveal}
                        disabled={isProcessing}
                        variant="primary"
                        size="sm"
                        fullWidth
                    >
                        {isProcessing ? 'Opening...' : 'Open Box'}
                    </DegenButton>
                ) : hasReward && !box.settled_at ? (
                    <DegenButton
                        onClick={handleClaim}
                        disabled={isProcessing}
                        variant="success"
                        size="sm"
                        fullWidth
                    >
                        {isProcessing ? 'Claiming...' : 'Claim'}
                    </DegenButton>
                ) : hasReward ? (
                    <DegenBadge variant="success" size="sm">Claimed</DegenBadge>
                ) : (
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
                    <DegenBadge variant={project.is_active ? 'success' : 'danger'} size="sm" dot>
                        {project.is_active ? 'Active' : 'Paused'}
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
