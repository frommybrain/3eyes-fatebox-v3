// app/dashboard/page.js
// User dashboard - manage your projects

import { Suspense } from 'react';
import Dashboard from '@/components/dashboard/Dashboard';
import BetaGate from '@/components/auth/BetaGate';

export const metadata = {
    title: 'My Projects | DegenBox',
    description: 'Manage your lootbox projects',
};

function DashboardLoading() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <BetaGate>
            <Suspense fallback={<DashboardLoading />}>
                <Dashboard />
            </Suspense>
        </BetaGate>
    );
}
