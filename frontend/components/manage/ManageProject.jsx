// components/manage/ManageProject.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
    DegenButton,
    DegenCard,
    DegenBadge,
    DegenLoadingState,
} from '@/components/ui';
import { DegenWarningMessage } from '@/components/ui/DegenMessage';
import { DegenTabs, DegenTabsList, DegenTabsTrigger, DegenTabsContent } from '@/components/ui/DegenTabs';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

export default function ManageProject({ projectId }) {
    const router = useRouter();
    const { publicKey, connected, signTransaction } = useWallet();
    const { connection } = useConnection();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Withdrawal state
    const [withdrawalInfo, setWithdrawalInfo] = useState(null);
    const [loadingWithdrawal, setLoadingWithdrawal] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);
    const [withdrawError, setWithdrawError] = useState(null);

    // Withdrawal history state
    const [withdrawalHistory, setWithdrawalHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Close project state
    const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
    const [closingProject, setClosingProject] = useState(false);
    const [showReservedInfo, setShowReservedInfo] = useState(false);

    useEffect(() => {
        if (!connected) {
            router.push('/');
            return;
        }

        loadProject();
    }, [projectId, connected]);

    const loadProject = async () => {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (error) throw error;

            // Check ownership
            if (data.owner_wallet !== publicKey.toString()) {
                alert('You do not own this project');
                router.push('/dashboard');
                return;
            }

            setProject(data);
        } catch (error) {
            console.error('Error loading project:', error);
            alert('Failed to load project');
            router.push('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (updates) => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('projects')
                .update(updates)
                .eq('id', projectId);

            if (error) throw error;

            alert('Project updated successfully!');
            loadProject();
        } catch (error) {
            console.error('Error updating project:', error);
            alert('Failed to update project');
        } finally {
            setSaving(false);
        }
    };

    const togglePause = () => {
        handleUpdate({ is_paused: !project.is_paused });
    };

    const toggleActive = () => {
        handleUpdate({ is_active: !project.is_active });
    };

    // Load withdrawal info
    const loadWithdrawalInfo = useCallback(async () => {
        if (!project?.project_numeric_id || !publicKey) return;

        setLoadingWithdrawal(true);
        setWithdrawError(null);

        try {
            const response = await fetch(
                `${backendUrl}/api/vault/withdrawal-info/${project.project_numeric_id}?ownerWallet=${publicKey.toString()}`
            );
            const data = await response.json();

            if (data.success) {
                setWithdrawalInfo(data);
            } else {
                setWithdrawError(data.error || 'Failed to load withdrawal info');
            }
        } catch (error) {
            console.error('Error loading withdrawal info:', error);
            setWithdrawError('Failed to connect to server');
        } finally {
            setLoadingWithdrawal(false);
        }
    }, [project?.project_numeric_id, publicKey]);

    // Load withdrawal info when project loads
    useEffect(() => {
        if (project?.project_numeric_id) {
            loadWithdrawalInfo();
        }
    }, [project?.project_numeric_id, loadWithdrawalInfo]);

    // Load withdrawal history
    const loadWithdrawalHistory = useCallback(async () => {
        if (!project?.project_numeric_id) return;

        setLoadingHistory(true);
        try {
            const response = await fetch(
                `${backendUrl}/api/vault/withdrawal-history/${project.project_numeric_id}?limit=10`
            );
            const data = await response.json();

            if (data.success) {
                setWithdrawalHistory(data.history || []);
            }
        } catch (error) {
            console.error('Error loading withdrawal history:', error);
        } finally {
            setLoadingHistory(false);
        }
    }, [project?.project_numeric_id]);

    // Load withdrawal history when project loads
    useEffect(() => {
        if (project?.project_numeric_id) {
            loadWithdrawalHistory();
        }
    }, [project?.project_numeric_id, loadWithdrawalHistory]);

    // Handle profit withdrawal (withdraws only profit, keeps project active)
    const handleWithdrawProfits = async () => {
        if (!project || !publicKey || !signTransaction || !withdrawalInfo) return;

        // Use profit-only amount (in raw/smallest units)
        const profitAmount = withdrawalInfo.withdrawable.profitOnly.raw;
        if (!profitAmount || BigInt(profitAmount) <= 0) {
            setWithdrawError('No profits available to withdraw');
            return;
        }

        setWithdrawing(true);
        setWithdrawError(null);

        try {
            // Build transaction for profit withdrawal (keeps project active)
            const buildResponse = await fetch(`${backendUrl}/api/vault/build-withdraw-tx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    ownerWallet: publicKey.toString(),
                    amount: profitAmount,
                    withdrawalType: 'profits', // profits type keeps project active
                }),
            });

            const buildData = await buildResponse.json();
            if (!buildData.success) {
                throw new Error(buildData.error || 'Failed to build transaction');
            }

            // Deserialize and sign transaction
            const txBuffer = Buffer.from(buildData.transaction, 'base64');
            const transaction = Transaction.from(txBuffer);
            const signedTx = await signTransaction(transaction);

            // Send transaction
            const signature = await connection.sendRawTransaction(signedTx.serialize());
            console.log('Profit withdrawal transaction sent:', signature);

            // Wait for confirmation
            await connection.confirmTransaction(signature, 'confirmed');

            // Confirm with backend
            await fetch(`${backendUrl}/api/vault/confirm-withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    signature,
                    withdrawalAmount: profitAmount,
                    withdrawalType: 'profits',
                    feeAmount: buildData.fee?.amountInPlatformToken || '0',
                    feePercentage: buildData.fee?.percentage || 2.5,
                    exchangeRate: buildData.fee?.exchangeRate,
                }),
            });

            // Refresh withdrawal info and history
            await loadWithdrawalInfo();
            await loadWithdrawalHistory();

            const formattedAmount = parseFloat(withdrawalInfo.withdrawable.profitOnly.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 });
            alert(`Successfully withdrew ${formattedAmount} ${project.payment_token_symbol} profit!`);

        } catch (error) {
            console.error('Withdrawal error:', error);
            setWithdrawError(error.message || 'Withdrawal failed');
        } finally {
            setWithdrawing(false);
        }
    };

    // Handle close project (withdraws max available and closes project)
    const handleCloseProject = async () => {
        if (!project || !publicKey || !signTransaction || !withdrawalInfo) return;

        // Use max withdrawable amount (accounts for reserved funds)
        const withdrawAmount = withdrawalInfo.withdrawable.maxAmount.raw;
        if (!withdrawAmount || BigInt(withdrawAmount) <= 0) {
            setWithdrawError('No funds available to withdraw');
            return;
        }

        setClosingProject(true);
        setWithdrawError(null);

        try {
            // Build transaction with full_close type
            const buildResponse = await fetch(`${backendUrl}/api/vault/build-withdraw-tx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    ownerWallet: publicKey.toString(),
                    amount: withdrawAmount,
                    withdrawalType: 'full_close',
                }),
            });

            const buildData = await buildResponse.json();
            if (!buildData.success) {
                throw new Error(buildData.error || 'Failed to build transaction');
            }

            // Deserialize and sign transaction
            const txBuffer = Buffer.from(buildData.transaction, 'base64');
            const transaction = Transaction.from(txBuffer);
            const signedTx = await signTransaction(transaction);

            // Send transaction
            const signature = await connection.sendRawTransaction(signedTx.serialize());
            console.log('Close project transaction sent:', signature);

            // Wait for confirmation
            await connection.confirmTransaction(signature, 'confirmed');

            // Confirm with backend
            await fetch(`${backendUrl}/api/vault/confirm-withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    signature,
                    withdrawalAmount: withdrawAmount,
                    withdrawalType: 'full_close',
                    feeAmount: buildData.fee?.amountInPlatformToken || '0',
                    feePercentage: buildData.fee?.percentage || 2.5,
                    exchangeRate: buildData.fee?.exchangeRate,
                }),
            });

            // Refresh project data and withdrawal info
            await loadProject();
            await loadWithdrawalInfo();
            await loadWithdrawalHistory();
            setShowCloseConfirmation(false);
            alert('Project closed successfully! All funds have been withdrawn.');

        } catch (error) {
            console.error('Close project error:', error);
            setWithdrawError(error.message || 'Failed to close project');
        } finally {
            setClosingProject(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-degen-bg">
                <DegenLoadingState text="Loading project..." />
            </div>
        );
    }

    if (!project) return null;

    const projectUrl = `https://${project.subdomain}.degenbox.fun`;
    const isDevnet = project.network === 'devnet';

    return (
        <div className="min-h-screen bg-degen-bg pt-24 pb-12 px-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center text-degen-blue hover:underline mb-4 text-sm uppercase tracking-wider"
                    >
                        Back to Dashboard
                    </Link>
                    <div className="flex items-center gap-4">
                        <h1 className="text-degen-black text-4xl font-medium uppercase tracking-wider">
                            Manage Project
                        </h1>
                        {isDevnet && (
                            <DegenBadge variant="warning" size="sm">DEVNET</DegenBadge>
                        )}
                    </div>
                    <p className="text-degen-text-muted text-lg mt-2">{project.project_name}</p>
                </div>

                {/* Project Info Card */}
                <DegenCard variant="white" padding="lg" className="mb-6">
                    <h2 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-6">Project Details</h2>

                    <div className="space-y-4">
                        <div className="flex justify-between py-3 border-b border-degen-black">
                            <span className="text-degen-text-muted text-sm uppercase">Project Name</span>
                            <span className="text-degen-black font-medium">{project.project_name}</span>
                        </div>

                        <div className="flex justify-between py-3 border-b border-degen-black">
                            <span className="text-degen-text-muted text-sm uppercase">Subdomain</span>
                            <a
                                href={projectUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-degen-blue hover:underline"
                            >
                                {project.subdomain}
                            </a>
                        </div>

                        <div className="flex justify-between py-3 border-b border-degen-black">
                            <span className="text-degen-text-muted text-sm uppercase">Description</span>
                            <span className="text-degen-black text-right max-w-md">{project.description || 'No description'}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <div className="bg-degen-bg p-4 border border-degen-black">
                                <p className="text-degen-text-muted text-xs uppercase mb-1">Box Price</p>
                                <p className="text-degen-black font-medium">
                                    {(project.box_price / Math.pow(10, project.payment_token_decimals || 9)).toFixed(4)} {project.payment_token_symbol || 'TOKEN'}
                                </p>
                            </div>
                            <div className="bg-degen-bg p-4 border border-degen-black">
                                <p className="text-degen-text-muted text-xs uppercase mb-1">Max Boxes</p>
                                <p className="text-degen-black font-medium">{project.max_boxes}</p>
                            </div>
                            <div className="bg-degen-bg p-4 border border-degen-black">
                                <p className="text-degen-text-muted text-xs uppercase mb-1">Created</p>
                                <p className="text-degen-black font-medium">{new Date(project.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="bg-degen-bg p-4 border border-degen-black">
                                <p className="text-degen-text-muted text-xs uppercase mb-1">Boxes Created</p>
                                <p className="text-degen-black font-medium">{project.boxes_created || 0}</p>
                            </div>
                        </div>
                    </div>
                </DegenCard>

                {/* Status Controls */}
                <DegenCard variant="white" padding="lg" className="mb-6">
                    <h2 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-6">Project Status</h2>

                    {project.closed_at ? (
                        <div className="bg-red-50 border border-red-300 p-4 text-center">
                            <DegenBadge variant="danger">Permanently Closed</DegenBadge>
                            <p className="text-degen-text-muted text-sm mt-2">
                                This project was closed on {new Date(project.closed_at).toLocaleDateString()} and cannot be reactivated.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-degen-bg border border-degen-black">
                                <div>
                                    <h3 className="text-degen-black font-medium uppercase tracking-wider">Active Status</h3>
                                    <p className="text-sm text-degen-text-muted">
                                        {project.is_active ? 'Project is live and accepting boxes' : 'Project is inactive'}
                                    </p>
                                </div>
                                <DegenButton
                                    onClick={toggleActive}
                                    disabled={saving}
                                    variant={project.is_active ? 'success' : 'feature'}
                                    size="sm"
                                >
                                    {project.is_active ? 'Active' : 'Inactive'}
                                </DegenButton>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-degen-bg border border-degen-black">
                                <div>
                                    <h3 className="text-degen-black font-medium uppercase tracking-wider">Paused Status</h3>
                                    <p className="text-sm text-degen-text-muted">
                                        {project.is_paused ? 'New boxes are paused' : 'Accepting new boxes'}
                                    </p>
                                </div>
                                <DegenButton
                                    onClick={togglePause}
                                    disabled={saving}
                                    variant={project.is_paused ? 'warning' : 'blue'}
                                    size="sm"
                                >
                                    {project.is_paused ? 'Paused' : 'Running'}
                                </DegenButton>
                            </div>
                        </div>
                    )}
                </DegenCard>

                {/* Vault Withdrawal */}
                <DegenCard variant="white" padding="lg" className="mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-degen-black text-2xl font-medium uppercase tracking-wider">Vault Withdrawal</h2>
                        <DegenButton
                            onClick={loadWithdrawalInfo}
                            disabled={loadingWithdrawal}
                            variant="secondary"
                            size="sm"
                        >
                            {loadingWithdrawal ? 'Loading...' : 'Refresh'}
                        </DegenButton>
                    </div>

                    {loadingWithdrawal && !withdrawalInfo ? (
                        <DegenLoadingState text="Loading vault info..." />
                    ) : withdrawError && !withdrawalInfo ? (
                        <div className="text-red-600 p-4 bg-red-50 border border-red-200">{withdrawError}</div>
                    ) : withdrawalInfo ? (
                        <div className="space-y-6">
                            {/* Vault Balance Overview */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-degen-bg p-4 border border-degen-black">
                                    <p className="text-degen-text-muted text-xs uppercase mb-1">Vault Balance</p>
                                    <p className="text-degen-black font-medium text-lg">
                                        {parseFloat(withdrawalInfo.vault.balance.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                    </p>
                                    <p className="text-degen-text-muted text-xs">{project.payment_token_symbol}</p>
                                </div>
                                <div className="bg-degen-bg p-4 border border-degen-black">
                                    <p className="text-degen-text-muted text-xs uppercase mb-1">Initial Funded</p>
                                    <p className="text-degen-black font-medium text-lg">
                                        {parseFloat(withdrawalInfo.vault.initialFunded.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                    </p>
                                    <p className="text-degen-text-muted text-xs">{project.payment_token_symbol}</p>
                                </div>
                                <div className="bg-degen-bg p-4 border border-degen-black">
                                    {project.closed_at ? (
                                        <>
                                            <p className="text-degen-text-muted text-xs uppercase mb-1">Status</p>
                                            <p className="text-degen-text-muted font-medium text-lg">Project Closed</p>
                                            <p className="text-degen-text-muted text-xs">N/A</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-degen-text-muted text-xs uppercase mb-1">
                                                {withdrawalInfo.withdrawable.isInLoss ? 'Loss' : 'Profit'}
                                            </p>
                                            <p className={`font-medium text-lg ${withdrawalInfo.withdrawable.isInLoss ? 'text-red-600' : 'text-green-600'}`}>
                                                {withdrawalInfo.withdrawable.isInLoss ? '-' : '+'}
                                                {parseFloat(withdrawalInfo.withdrawable.isInLoss
                                                    ? withdrawalInfo.withdrawable.lossAmount.formatted
                                                    : withdrawalInfo.withdrawable.profit.formatted
                                                ).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                            </p>
                                            <p className="text-degen-text-muted text-xs">{project.payment_token_symbol}</p>
                                        </>
                                    )}
                                </div>
                                <div className="bg-blue-50 p-4 border border-blue-300">
                                    <div className="flex items-center gap-1 mb-1">
                                        <p className="text-blue-700 text-xs uppercase">Max Withdrawable</p>
                                        {parseFloat(withdrawalInfo.reserved.total.raw) > 0 && (
                                            <button
                                                onClick={() => setShowReservedInfo(!showReservedInfo)}
                                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                                title="Why can't I withdraw more?"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-blue-800 font-bold text-lg">
                                        {parseFloat(withdrawalInfo.withdrawable.maxAmount.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                    </p>
                                    <p className="text-blue-600 text-xs">{project.payment_token_symbol}</p>
                                </div>
                            </div>

                            {/* Reserved Amounts Info - Collapsible */}
                            {showReservedInfo && parseFloat(withdrawalInfo.reserved.total.raw) > 0 && (
                                <div className="bg-amber-50 border border-amber-300 p-4 animate-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-amber-800 font-medium uppercase text-sm">Reserved for Users</h3>
                                        <button
                                            onClick={() => setShowReservedInfo(false)}
                                            className="text-amber-600 hover:text-amber-800"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <p className="text-amber-700">Unopened Boxes: {withdrawalInfo.boxes.unopenedCount}</p>
                                            <p className="text-amber-600 text-xs">
                                                Reserved: {parseFloat(withdrawalInfo.reserved.forUnopenedBoxes.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })} {project.payment_token_symbol}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-amber-700">Unclaimed Rewards: {withdrawalInfo.boxes.unclaimedCount}</p>
                                            <p className="text-amber-600 text-xs">
                                                Reserved: {parseFloat(withdrawalInfo.reserved.forUnclaimedRewards.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })} {project.payment_token_symbol}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-amber-700">Total Reserved</p>
                                            <p className="text-amber-800 font-medium">
                                                {parseFloat(withdrawalInfo.reserved.total.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })} {project.payment_token_symbol}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-amber-600 text-xs mt-2">
                                        Unopened boxes reserve {withdrawalInfo.reserved.multiplierUsed}x box price to cover expected payouts
                                    </p>
                                </div>
                            )}

                            {/* Withdrawal Options Tabs */}
                            {parseFloat(withdrawalInfo.withdrawable.maxAmount.raw) > 0 && !project.closed_at ? (
                                <DegenTabs defaultValue="profits" className="mt-6">
                                    <DegenTabsList className="w-full">
                                        <DegenTabsTrigger
                                            value="profits"
                                            className="flex-1"
                                            disabled={parseFloat(withdrawalInfo.withdrawable.profitOnly.raw) <= 0}
                                        >
                                            Withdraw Profits
                                        </DegenTabsTrigger>
                                        <DegenTabsTrigger value="close" className="flex-1">
                                            Close & Withdraw All
                                        </DegenTabsTrigger>
                                    </DegenTabsList>

                                    {/* Withdraw Profits Tab */}
                                    <DegenTabsContent value="profits">
                                        {parseFloat(withdrawalInfo.withdrawable.profitOnly.raw) > 0 ? (
                                            <div className="space-y-4">
                                                <p className="text-degen-text-muted text-sm">
                                                    Withdraw profits while keeping the project active. Initial vault funding remains in place.
                                                </p>

                                                {/* Inline info display */}
                                                <div className="bg-green-50 border border-green-300 p-4">
                                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                                        <div>
                                                            <p className="text-green-600 text-xs uppercase">Available Profit</p>
                                                            <p className="text-green-800 font-bold text-xl">
                                                                {parseFloat(withdrawalInfo.withdrawable.profitOnly.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })} {project.payment_token_symbol}
                                                            </p>
                                                        </div>
                                                        {withdrawalInfo.feeEstimate && !withdrawalInfo.feeEstimate.error && (
                                                            <div className="text-right">
                                                                <p className="text-gray-500 text-xs uppercase">Platform Fee ({withdrawalInfo.feeEstimate.feePercentage}%)</p>
                                                                <p className="text-gray-700 font-medium">
                                                                    ~{(() => {
                                                                        const profitAmount = parseFloat(withdrawalInfo.withdrawable.profitOnly.raw);
                                                                        const maxAmount = parseFloat(withdrawalInfo.withdrawable.maxAmount.raw);
                                                                        const maxFee = Number(withdrawalInfo.feeEstimate.feeInPlatformToken) / 1e9;
                                                                        const profitFee = (profitAmount / maxAmount) * maxFee;
                                                                        return profitFee.toLocaleString(undefined, { maximumFractionDigits: 4 });
                                                                    })()} {withdrawalInfo.creatorFeeWallet?.tokenSymbol || '$3EYES'}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {withdrawalInfo?.creatorFeeWallet && (
                                                            <div className="text-right">
                                                                <p className="text-gray-500 text-xs uppercase">Your {withdrawalInfo.creatorFeeWallet.tokenSymbol}</p>
                                                                <p className="text-gray-700 font-medium">
                                                                    {parseFloat(withdrawalInfo.creatorFeeWallet.balance.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {withdrawError && (
                                                    <div className="text-red-600 p-3 bg-red-50 border border-red-200 text-sm">
                                                        {withdrawError}
                                                    </div>
                                                )}

                                                <DegenButton
                                                    onClick={handleWithdrawProfits}
                                                    disabled={withdrawing}
                                                    variant="success"
                                                    size="lg"
                                                    className="w-full"
                                                >
                                                    {withdrawing ? 'Processing Withdrawal...' : `Withdraw ${parseFloat(withdrawalInfo.withdrawable.profitOnly.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${project.payment_token_symbol} Profit`}
                                                </DegenButton>
                                            </div>
                                        ) : (
                                            <div className="bg-amber-50 border border-amber-300 p-4">
                                                <p className="text-amber-800 font-medium">No profits available to withdraw</p>
                                                <p className="text-amber-700 text-sm mt-1">
                                                    Your vault balance is at or below your initial funding amount.
                                                    Use the "Close & Withdraw All" tab to withdraw by permanently closing the project.
                                                </p>
                                            </div>
                                        )}
                                    </DegenTabsContent>

                                    {/* Close & Withdraw All Tab */}
                                    <DegenTabsContent value="close">
                                        {!showCloseConfirmation ? (
                                            <div className="space-y-4">
                                                <DegenWarningMessage title="Permanent Action">
                                                    <p className="mt-1">
                                                        Closing the project will withdraw all available funds ({parseFloat(withdrawalInfo.withdrawable.maxAmount.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })} {project.payment_token_symbol}) and <strong>permanently deactivate</strong> this project. This action cannot be undone.
                                                    </p>
                                                </DegenWarningMessage>

                                                {(withdrawalInfo.boxes.unopenedCount > 0 || withdrawalInfo.boxes.unclaimedCount > 0) && (
                                                    <div className="bg-amber-50 border border-amber-300 p-3 text-sm">
                                                        <p className="text-amber-800 font-medium">Note: Reserved funds will remain for users</p>
                                                        <p className="text-amber-700 mt-1">
                                                            {parseFloat(withdrawalInfo.reserved.total.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })} {project.payment_token_symbol} is reserved for {withdrawalInfo.boxes.unopenedCount} unopened box(es) and {withdrawalInfo.boxes.unclaimedCount} unclaimed reward(s).
                                                            These funds will be paid out as users open/claim their boxes.
                                                        </p>
                                                    </div>
                                                )}

                                                <DegenButton
                                                    onClick={() => setShowCloseConfirmation(true)}
                                                    variant="feature"
                                                    size="md"
                                                >
                                                    Close Project & Withdraw {parseFloat(withdrawalInfo.withdrawable.maxAmount.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })} {project.payment_token_symbol}
                                                </DegenButton>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <DegenWarningMessage title="Confirm Permanent Closure">
                                                    <ul className="list-disc list-inside space-y-1 mt-2">
                                                        <li><strong>{parseFloat(withdrawalInfo.withdrawable.maxAmount.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })} {project.payment_token_symbol}</strong> will be withdrawn to your wallet</li>
                                                        <li>The project will be marked as <strong>closed</strong> and set to <strong>inactive</strong></li>
                                                        <li>Users will no longer be able to purchase new boxes</li>
                                                        <li>This project <strong>cannot be reactivated</strong> after closing</li>
                                                        {(withdrawalInfo.boxes.unopenedCount > 0 || withdrawalInfo.boxes.unclaimedCount > 0) && (
                                                            <li>{parseFloat(withdrawalInfo.reserved.total.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })} {project.payment_token_symbol} will remain reserved until all boxes are settled</li>
                                                        )}
                                                    </ul>
                                                </DegenWarningMessage>

                                                {withdrawalInfo.feeEstimate && !withdrawalInfo.feeEstimate.error && (
                                                    <div className="bg-gray-100 p-3 border border-gray-300 text-sm">
                                                        <p className="text-gray-700">
                                                            Platform fee: ~{(Number(withdrawalInfo.feeEstimate.feeInPlatformToken) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 4 })} {withdrawalInfo.creatorFeeWallet?.tokenSymbol || '$3EYES'}
                                                            <span className="text-gray-500 ml-1">({withdrawalInfo.feeEstimate.feePercentage}%)</span>
                                                        </p>
                                                    </div>
                                                )}

                                                {withdrawError && (
                                                    <div className="text-red-600 p-3 bg-red-50 border border-red-200 text-sm">
                                                        {withdrawError}
                                                    </div>
                                                )}

                                                <div className="flex gap-3">
                                                    <DegenButton
                                                        onClick={() => setShowCloseConfirmation(false)}
                                                        variant="secondary"
                                                        size="md"
                                                        disabled={closingProject}
                                                    >
                                                        Cancel
                                                    </DegenButton>
                                                    <DegenButton
                                                        onClick={handleCloseProject}
                                                        variant="feature"
                                                        size="md"
                                                        disabled={closingProject}
                                                    >
                                                        {closingProject ? 'Closing Project...' : 'Yes, Close Project Permanently'}
                                                    </DegenButton>
                                                </div>
                                            </div>
                                        )}
                                    </DegenTabsContent>
                                </DegenTabs>
                            ) : parseFloat(withdrawalInfo.withdrawable.maxAmount.raw) <= 0 ? (
                                <div className="text-center py-6 text-degen-text-muted mt-6">
                                    <p className="text-lg">No funds available for withdrawal</p>
                                    <p className="text-sm mt-2">
                                        {withdrawalInfo.boxes.unopenedCount > 0 || withdrawalInfo.boxes.unclaimedCount > 0
                                            ? 'Funds are reserved for user boxes. Wait for boxes to be settled.'
                                            : 'Fund your vault to start accepting box purchases.'}
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </DegenCard>

                {/* Withdrawal History */}
                <DegenCard variant="white" padding="lg" className="mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-degen-black text-2xl font-medium uppercase tracking-wider">Withdrawal History</h2>
                        <DegenButton
                            onClick={loadWithdrawalHistory}
                            disabled={loadingHistory}
                            variant="secondary"
                            size="sm"
                        >
                            {loadingHistory ? 'Loading...' : 'Refresh'}
                        </DegenButton>
                    </div>

                    {loadingHistory && withdrawalHistory.length === 0 ? (
                        <DegenLoadingState text="Loading history..." />
                    ) : withdrawalHistory.length === 0 ? (
                        <div className="text-center py-8 text-degen-text-muted">
                            <p>No withdrawals yet</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {withdrawalHistory.map((entry) => (
                                <div
                                    key={entry.id}
                                    className="bg-degen-bg border border-degen-black p-4"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="text-degen-black font-medium text-lg">
                                                {parseFloat(entry.amount.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })} {project.payment_token_symbol}
                                            </p>
                                            <p className="text-degen-text-muted text-xs">
                                                {new Date(entry.confirmedAt || entry.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <DegenBadge variant={entry.type === 'full_close' ? 'danger' : 'success'}>
                                            {entry.type === 'full_close' ? 'Full Close' : 'Withdrawal'}
                                        </DegenBadge>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                                        <div>
                                            <p className="text-degen-text-muted text-xs uppercase">Fee Paid</p>
                                            <p className="text-degen-black">
                                                {parseFloat(entry.fee.amountInPlatformToken.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })} $3EYES
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-degen-text-muted text-xs uppercase">Vault Before</p>
                                            <p className="text-degen-black">{entry.vaultState.balanceBefore}</p>
                                        </div>
                                        <div>
                                            <p className="text-degen-text-muted text-xs uppercase">Vault After</p>
                                            <p className="text-degen-black">{entry.vaultState.balanceAfter}</p>
                                        </div>
                                        <div>
                                            <p className="text-degen-text-muted text-xs uppercase">Unopened Boxes</p>
                                            <p className="text-degen-black">{entry.vaultState.unopenedBoxes}</p>
                                        </div>
                                    </div>

                                    {entry.explorerUrl && (
                                        <a
                                            href={entry.explorerUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                            View Transaction on Solscan
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </a>
                                    )}
                                    <p className="text-degen-text-muted text-xs mt-1">
                                        Transaction includes withdrawal + fee transfer
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </DegenCard>

                {/* Quick Actions */}
                <DegenCard variant="white" padding="lg">
                    <h2 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-6">Quick Actions</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <DegenButton
                            onClick={() => window.open(projectUrl, '_blank')}
                            variant="blue"
                            size="lg"
                        >
                            Visit Live Site
                        </DegenButton>
                        <DegenButton
                            href="/dashboard"
                            variant="secondary"
                            size="lg"
                        >
                            Back to Dashboard
                        </DegenButton>
                    </div>
                </DegenCard>
            </div>
        </div>
    );
}
