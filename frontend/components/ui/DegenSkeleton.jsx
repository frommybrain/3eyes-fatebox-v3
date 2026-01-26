'use client';

/**
 * DegenSkeleton - Base skeleton building blocks
 *
 * All skeletons use a subtle shimmer animation for a polished loading feel.
 * Layout dimensions should exactly match their loaded counterparts to prevent shifts.
 */

// Base shimmer animation class
const shimmerClass = 'animate-pulse bg-degen-container';

// ============================================================================
// Base Skeleton Elements
// ============================================================================

/**
 * SkeletonBox - A basic rectangular skeleton
 */
export function SkeletonBox({ className = '', style = {} }) {
    return (
        <div
            className={`${shimmerClass} ${className}`}
            style={style}
        />
    );
}

/**
 * SkeletonText - A text-like skeleton line
 */
export function SkeletonText({ width = '100%', height = '1rem', className = '' }) {
    return (
        <div
            className={`${shimmerClass} rounded ${className}`}
            style={{ width, height }}
        />
    );
}

/**
 * SkeletonCircle - A circular skeleton (for avatars, icons)
 */
export function SkeletonCircle({ size = 40, className = '' }) {
    return (
        <div
            className={`${shimmerClass} rounded-full ${className}`}
            style={{ width: size, height: size }}
        />
    );
}

/**
 * SkeletonButton - A button-shaped skeleton
 */
export function SkeletonButton({ width = 'auto', size = 'md', className = '' }) {
    const heights = {
        sm: 'h-8',
        md: 'h-10',
        lg: 'h-12',
        xl: 'h-14',
    };

    return (
        <div
            className={`${shimmerClass} border border-degen-black ${heights[size]} ${className}`}
            style={{ width: width === 'auto' ? undefined : width, minWidth: width === 'auto' ? '100px' : undefined }}
        />
    );
}

/**
 * SkeletonBadge - A badge-shaped skeleton
 */
export function SkeletonBadge({ width = 60, className = '' }) {
    return (
        <div
            className={`${shimmerClass} h-5 rounded-sm ${className}`}
            style={{ width }}
        />
    );
}

// ============================================================================
// Composite Skeleton Components
// ============================================================================

/**
 * SkeletonCard - A card with skeleton content
 */
export function SkeletonCard({ children, className = '', padding = 'md' }) {
    const paddingSizes = {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
    };

    return (
        <div className={`bg-degen-white border border-degen-black ${paddingSizes[padding]} ${className}`}>
            {children}
        </div>
    );
}

// ============================================================================
// Dashboard Tab Skeletons
// ============================================================================

/**
 * MyBoxesTabSkeleton - Skeleton for the boxes tab
 * Matches: Summary card + InlineTransactionStatus + Project groups with row layout
 */
export function MyBoxesTabSkeleton() {
    return (
        <div className="space-y-3">
            {/* Summary Card - matches DegenCard variant="default" padding="sm" */}
            <div className="bg-degen-container border border-degen-black p-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        {/* Boxes stat */}
                        <div className="flex flex-col items-center">
                            <SkeletonText width="24px" height="1.125rem" />
                            <SkeletonText width="36px" height="0.625rem" className="mt-1" />
                        </div>
                        {/* Projects stat */}
                        <div className="flex flex-col items-center">
                            <SkeletonText width="24px" height="1.125rem" />
                            <SkeletonText width="48px" height="0.625rem" className="mt-1" />
                        </div>
                    </div>
                </div>
            </div>

            {/* InlineTransactionStatus placeholder */}
            <div className="flex items-center gap-2 py-2 px-2">
                <SkeletonCircle size={8} />
                <SkeletonText width="48px" height="0.75rem" />
            </div>

            {/* Project Group 1 */}
            <ProjectBoxesGroupSkeleton boxCount={3} />

            {/* Project Group 2 */}
            <ProjectBoxesGroupSkeleton boxCount={2} />
        </div>
    );
}

/**
 * ProjectBoxesGroupSkeleton - Skeleton for a project's box group
 * Matches the actual row-based layout with filters
 */
export function ProjectBoxesGroupSkeleton({ boxCount = 3 }) {
    return (
        <div className="bg-degen-container border border-degen-black">
            {/* Project Header - matches actual layout */}
            <div className="p-3 border-b border-degen-black flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Project logo */}
                    <SkeletonBox className="w-12 h-12 rounded-lg" />
                    <div>
                        <div className="flex items-center gap-2">
                            <SkeletonText width="120px" height="1.125rem" />
                            <SkeletonText width="40px" height="0.75rem" />
                        </div>
                        <SkeletonText width="140px" height="0.875rem" className="mt-1 hidden md:block" />
                    </div>
                </div>
                {/* Stats and collapse */}
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-4">
                        <div className="flex flex-col items-center">
                            <SkeletonText width="20px" height="1.125rem" />
                            <SkeletonText width="36px" height="0.625rem" className="mt-1" />
                        </div>
                        <div className="flex flex-col items-center">
                            <SkeletonText width="20px" height="1.125rem" />
                            <SkeletonText width="48px" height="0.625rem" className="mt-1" />
                        </div>
                    </div>
                    <SkeletonBox className="w-5 h-5" />
                </div>
            </div>

            {/* Filter tabs */}
            <div className="px-3 pt-3 pb-2 border-b border-degen-border">
                <div className="flex items-center gap-3">
                    <SkeletonBox className="w-4 h-4 shrink-0" />
                    <div className="hidden sm:flex gap-1">
                        <SkeletonButton width="60px" size="sm" />
                        <SkeletonButton width="80px" size="sm" />
                        <SkeletonButton width="55px" size="sm" />
                    </div>
                </div>
            </div>

            {/* Box rows */}
            <div className="p-3">
                <div className="space-y-2">
                    {Array.from({ length: boxCount }).map((_, i) => (
                        <BoxRowSkeleton key={i} />
                    ))}
                </div>
            </div>
        </div>
    );
}

/**
 * BoxRowSkeleton - Skeleton for a single box row
 * Matches BoxCardRow layout
 */
export function BoxRowSkeleton() {
    return (
        <div className="bg-degen-white border border-degen-black p-3 flex items-center gap-3">
            {/* State indicator dot */}
            <SkeletonCircle size={8} />
            {/* Box number */}
            <SkeletonText width="50px" height="0.875rem" />
            {/* Status text */}
            <SkeletonText width="70px" height="0.875rem" />
            {/* Spacer */}
            <div className="flex-1" />
            {/* Luck or payout */}
            <SkeletonText width="40px" height="0.875rem" className="hidden sm:block" />
            {/* Action button */}
            <SkeletonButton width="80px" size="sm" />
            {/* Dropdown */}
            <SkeletonBox className="w-7 h-7" />
        </div>
    );
}

/**
 * BoxCardSkeleton - Skeleton for a single box card
 * Fixed height matching actual BoxCard to prevent layout shifts
 */
export function BoxCardSkeleton() {
    return (
        <div className="bg-degen-white border border-degen-black p-3 text-center">
            {/* Box icon area */}
            <SkeletonBox className="w-16 h-16 mx-auto border border-degen-black" />

            {/* Status text */}
            <div className="mt-2 mb-1">
                <SkeletonText width="60px" height="0.875rem" className="mx-auto" />
            </div>

            {/* Box number */}
            <SkeletonText width="70px" height="1rem" className="mx-auto" />

            {/* Status badge area - fixed height */}
            <div className="mt-2 h-[42px] flex flex-col items-center justify-center">
                <SkeletonBadge width={80} className="mx-auto" />
            </div>

            {/* Error area - fixed height */}
            <div className="h-[48px] mt-2" />

            {/* Action button - fixed height */}
            <div className="h-[36px] flex items-center justify-center">
                <SkeletonButton width="100%" size="sm" />
            </div>

            {/* Date */}
            <div className="mt-2">
                <SkeletonText width="80px" height="0.75rem" className="mx-auto" />
            </div>
        </div>
    );
}

/**
 * MyProjectsTabSkeleton - Skeleton for the projects tab
 */
export function MyProjectsTabSkeleton() {
    return (
        <>
            {/* Create button placeholder */}
            <SkeletonButton width="200px" size="lg" className="mb-8" />

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                    <ProjectCardSkeleton key={i} />
                ))}
            </div>
        </>
    );
}

/**
 * ProjectCardSkeleton - Skeleton for a project card
 */
export function ProjectCardSkeleton() {
    return (
        <SkeletonCard padding="md" className="flex flex-col h-full">
            {/* Header with badge */}
            <div className="flex items-start justify-between mb-4">
                <SkeletonText width="150px" height="1.5rem" />
                <SkeletonBadge width={60} />
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-degen-bg p-2 border border-degen-black">
                        <SkeletonText width="60px" height="0.625rem" className="mb-1" />
                        <SkeletonText width="40px" height="1.25rem" />
                    </div>
                ))}
            </div>

            {/* URL */}
            <div className="mb-4">
                <SkeletonText width="50px" height="0.625rem" className="mb-1" />
                <SkeletonText width="180px" height="0.875rem" />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-auto">
                <SkeletonButton className="flex-1" size="sm" />
                <SkeletonButton className="flex-1" size="sm" />
                <SkeletonButton width="40px" size="sm" />
            </div>
        </SkeletonCard>
    );
}

/**
 * MyProfileTabSkeleton - Skeleton for the profile tab
 * Matches the exact layout of MyProfileTab to prevent layout shifts
 */
export function MyProfileTabSkeleton() {
    return (
        <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Sidebar */}
            <div className="w-full lg:w-1/3 space-y-4">
                {/* Profile Info Card - matches DegenCard variant="white" padding="md" */}
                <SkeletonCard padding="md">
                    {/* Avatar - w-20 h-20 mx-auto mb-4 */}
                    <SkeletonBox className="w-20 h-20 mx-auto mb-4 border border-degen-black" />
                    {/* Username - text-xl mb-2 */}
                    <SkeletonText width="120px" height="1.5rem" className="mx-auto mb-2" />
                    {/* X Handle - text-sm mb-3 */}
                    <SkeletonText width="80px" height="0.875rem" className="mx-auto mb-3" />
                    {/* Wallet - text-xs font-mono mb-4 */}
                    <SkeletonText width="90px" height="0.75rem" className="mx-auto mb-4" />
                </SkeletonCard>

                {/* Quick Stats Card - matches DegenCard variant="default" padding="md" */}
                <div className="bg-degen-container border border-degen-black p-4">
                    {/* Title - text-sm uppercase mb-3 */}
                    <SkeletonText width="80px" height="0.875rem" className="mb-3" />
                    <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-degen-white border border-degen-black p-2 text-center">
                                {/* Label - text-xs */}
                                <SkeletonText width="40px" height="0.75rem" className="mx-auto mb-1" />
                                {/* Value - text-lg */}
                                <SkeletonText width="30px" height="1.5rem" className="mx-auto" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Badges Preview Card - matches DegenCard variant="default" padding="md" */}
                <div className="bg-degen-container border border-degen-black p-4">
                    {/* Title - text-sm uppercase mb-3 */}
                    <SkeletonText width="70px" height="0.875rem" className="mb-3" />
                    <div className="flex flex-wrap gap-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <SkeletonBox key={i} className="w-10 h-10 border border-degen-black" />
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel */}
            <div className="w-full lg:w-2/3">
                {/* Tabs - matches DegenTabsList: inline-flex border border-degen-black */}
                <div className="inline-flex border border-degen-black mb-4">
                    <div className={`${shimmerClass} px-4 py-2 w-[85px] h-[38px] border-r border-degen-black`} />
                    <div className={`${shimmerClass} px-4 py-2 w-[60px] h-[38px] border-r border-degen-black`} />
                    <div className={`${shimmerClass} px-4 py-2 w-[75px] h-[38px] border-r border-degen-black`} />
                    <div className={`${shimmerClass} px-4 py-2 w-[75px] h-[38px]`} />
                </div>

                {/* Content area - Trophy cabinet: DegenCard variant="white" padding="md" */}
                {/* mt-4 matches DegenTabsContent margin */}
                <div className="mt-4">
                    <SkeletonCard padding="md">
                        {/* Header with title - text-xl uppercase mb-4 */}
                        <SkeletonText width="180px" height="1.5rem" className="mb-4" />
                        {/* Trophy grid - grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 */}
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <SkeletonBox key={i} className="aspect-square border-2 border-degen-black" />
                            ))}
                        </div>
                    </SkeletonCard>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// Full Page Skeletons
// ============================================================================

/**
 * DashboardSkeleton - Full dashboard page skeleton
 * Shows header, tab navigation, and default tab content (boxes)
 * Used during initial config loading to prevent layout shifts
 * Matches: min-h-screen bg-degen-bg pt-24 pb-12 px-2 md:px-4
 */
export function DashboardSkeleton() {
    return (
        <div className="min-h-screen bg-degen-bg pt-24 pb-12 px-2 md:px-4">
            <div className="w-full mx-auto">
                {/* Header - matches mb-4 */}
                <div className="mb-4">
                    <SkeletonText width="180px" height="2.25rem" className="mb-2" />
                </div>

                {/* Main Content Grid - 3/4 dashboard, 1/4 leaderboard */}
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Main Dashboard Content - 3/4 */}
                    <div className="w-full lg:w-3/4">
                        {/* Tab Navigation - matches DegenTabsList */}
                        <div className="inline-flex border border-degen-black mb-4">
                            <div className={`${shimmerClass} px-4 py-2 w-[80px] h-[38px] border-r border-degen-black`} />
                            <div className={`${shimmerClass} px-4 py-2 w-[100px] h-[38px] border-r border-degen-black`} />
                            <div className={`${shimmerClass} px-4 py-2 w-[70px] h-[38px]`} />
                        </div>

                        {/* Default Tab Content (Boxes) */}
                        <MyBoxesTabSkeleton />
                    </div>

                    {/* Leaderboard Sidebar - 1/4 */}
                    <div className="w-full lg:w-1/4 lg:self-start lg:sticky lg:top-16">
                        <LeaderboardSkeleton />
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * LeaderboardSkeleton - Skeleton for the leaderboard sidebar
 */
export function LeaderboardSkeleton() {
    return (
        <div className="space-y-4">
            {/* Top Projects */}
            <div className="bg-degen-container border border-degen-black">
                <div className="p-3 border-b border-degen-black">
                    <SkeletonText width="90px" height="0.875rem" />
                </div>
                <div className="p-2 space-y-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-2">
                            <SkeletonText width="16px" height="0.625rem" />
                            <SkeletonCircle size={32} />
                            <div className="flex-1 min-w-0">
                                <SkeletonText width="80px" height="0.875rem" className="mb-1" />
                                <SkeletonText width="50px" height="0.75rem" />
                            </div>
                            <SkeletonText width="32px" height="0.75rem" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Luckiest Users */}
            <div className="bg-degen-container border border-degen-black">
                <div className="p-3 border-b border-degen-black">
                    <SkeletonText width="100px" height="0.875rem" />
                </div>
                <div className="p-2 space-y-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-2">
                            <SkeletonText width="20px" height="0.75rem" />
                            <SkeletonCircle size={32} />
                            <div className="flex-1 min-w-0">
                                <SkeletonText width="70px" height="0.875rem" className="mb-1" />
                                <SkeletonText width="40px" height="0.75rem" />
                            </div>
                            <SkeletonText width="45px" height="0.75rem" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Default export
export default {
    Box: SkeletonBox,
    Text: SkeletonText,
    Circle: SkeletonCircle,
    Button: SkeletonButton,
    Badge: SkeletonBadge,
    Card: SkeletonCard,
    // Tab skeletons
    MyBoxesTab: MyBoxesTabSkeleton,
    MyProjectsTab: MyProjectsTabSkeleton,
    MyProfileTab: MyProfileTabSkeleton,
    // Component skeletons
    BoxCard: BoxCardSkeleton,
    BoxRow: BoxRowSkeleton,
    ProjectCard: ProjectCardSkeleton,
    ProjectBoxesGroup: ProjectBoxesGroupSkeleton,
    Leaderboard: LeaderboardSkeleton,
    // Full page skeletons
    Dashboard: DashboardSkeleton,
};
