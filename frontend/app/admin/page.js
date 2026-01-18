// app/admin/page.js
// Super admin dashboard

import AdminDashboard from '@/components/admin/AdminDashboard';
import BetaGate from '@/components/auth/BetaGate';

export const metadata = {
    title: 'Admin Dashboard | DegenBox',
    description: 'Platform administration',
};

export default function AdminPage() {
    return (
        <BetaGate>
            <AdminDashboard />
        </BetaGate>
    );
}
