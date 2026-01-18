// app/dashboard/manage/[projectId]/page.js
import ManageProject from '@/components/manage/ManageProject';
import BetaGate from '@/components/auth/BetaGate';

export default async function ManageProjectPage({ params }) {
    const { projectId } = await params;
    return (
        <BetaGate>
            <ManageProject projectId={projectId} />
        </BetaGate>
    );
}
