import { WorkspaceIntro } from "@/components/WorkspaceIntro";
import { ProbeDashboardView } from "@/components/ProbeDashboardView";
export default function Observations() {
  return (
    <div className="workspace-page space-y-6">
      <WorkspaceIntro
        index="OBSERVATIONS"
        title="Measurements, with context."
        description="Inspect stored probe samples and their benchmarks. Missing evidence remains unknown."
      />
      <ProbeDashboardView />
    </div>
  );
}
