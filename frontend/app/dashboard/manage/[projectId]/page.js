// app/dashboard/manage/[projectId]/page.js
import ManageProject from '@/components/manage/ManageProject';

export default async function ManageProjectPage({ params }) {
    const { projectId } = await params;
    return <ManageProject projectId={projectId} />;
}
