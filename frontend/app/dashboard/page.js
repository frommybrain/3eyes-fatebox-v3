// app/dashboard/page.js
// User dashboard - manage your projects

import Dashboard from '@/components/dashboard/Dashboard';

export const metadata = {
    title: 'My Projects | DegenBox',
    description: 'Manage your lootbox projects',
};

export default function DashboardPage() {
    return <Dashboard />;
}
