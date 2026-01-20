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
 * Matches: Summary card + Project groups with box grids
 */
export function MyBoxesTabSkeleton() {
    return (
        <div className="space-y-8">
            {/* Summary Card */}
            <SkeletonCard padding="sm">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <SkeletonText width="180px" height="1.5rem" />
                        <SkeletonText width="220px" height="0.875rem" />
                    </div>
                </div>
            </SkeletonCard>

            {/* Project Group 1 */}
            <ProjectBoxesGroupSkeleton boxCount={5} />

            {/* Project Group 2 */}
            <ProjectBoxesGroupSkeleton boxCount={3} />
        </div>
    );
}

/**
 * ProjectBoxesGroupSkeleton - Skeleton for a project's box group
 */
export function ProjectBoxesGroupSkeleton({ boxCount = 5 }) {
    return (
        <div className="bg-degen-container border border-degen-black overflow-hidden">
            {/* Project Header */}
            <div className="p-3 border-b border-degen-black flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <SkeletonBox className="w-12 h-12 border border-degen-black" />
                    <div className="space-y-2">
                        <SkeletonText width="150px" height="1.25rem" />
                        <SkeletonText width="180px" height="0.75rem" />
                    </div>
                </div>
                <div className="text-right space-y-2">
                    <SkeletonText width="80px" height="1rem" className="ml-auto" />
                    <SkeletonText width="120px" height="0.75rem" className="ml-auto" />
                </div>
            </div>

            {/* Boxes Grid */}
            <div className="p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {Array.from({ length: boxCount }).map((_, i) => (
                        <BoxCardSkeleton key={i} />
                    ))}
                </div>
            </div>
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
 */
export function DashboardSkeleton() {
    return (
        <div className="min-h-screen bg-degen-bg pt-24 pb-12 px-4">
            <div className="w-full mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <SkeletonText width="220px" height="2.5rem" className="mb-2" />
                    <SkeletonText width="380px" height="1.25rem" />
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-8 border-b border-degen-black pb-2">
                    <SkeletonButton width="100px" size="md" />
                    <SkeletonButton width="110px" size="md" />
                    <SkeletonButton width="80px" size="md" />
                </div>

                {/* Default Tab Content (Boxes) */}
                <MyBoxesTabSkeleton />
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
    ProjectCard: ProjectCardSkeleton,
    ProjectBoxesGroup: ProjectBoxesGroupSkeleton,
    // Full page skeletons
    Dashboard: DashboardSkeleton,
};
