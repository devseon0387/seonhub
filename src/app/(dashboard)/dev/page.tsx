import DevWorkspaceClient from './DevWorkspaceClient';
import { getDevProjects } from '@/lib/dev/projects-source';

export const dynamic = 'force-dynamic';

export default async function DevWorkspacePage() {
  const { root, projects } = await getDevProjects();
  return <DevWorkspaceClient initialData={{ root, projects }} />;
}
