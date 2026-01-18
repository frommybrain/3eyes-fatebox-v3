// app/dashboard/create/page.js
// Create new project flow

import CreateProject from '@/components/create/CreateProject';
import BetaGate from '@/components/auth/BetaGate';

export const metadata = {
    title: 'Create Project | DegenBox',
    description: 'Launch your own lootbox project',
};

export default function CreatePage() {
    return (
        <BetaGate>
            <CreateProject />
        </BetaGate>
    );
}
