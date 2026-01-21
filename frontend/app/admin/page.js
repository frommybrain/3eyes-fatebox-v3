// app/admin/page.js
// Super admin dashboard

import AdminDashboard from '@/components/admin/AdminDashboard';

export const metadata = {
    title: 'Admin Dashboard | DegenBox',
    description: 'Platform administration',
};

export default function AdminPage() {
    return (
        <AdminDashboard />
    );
}
