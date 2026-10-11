import { WorkspaceIntro } from "@/components/WorkspaceIntro";
import { PlanFormView } from "@/components/PlanFormView";
export default function StrategyStudio() {
  return (
    <div className="workspace-page space-y-6">
      <WorkspaceIntro
        index="STRATEGY STUDIO"
        title="Intent, made explicit."
        description="Review the original instruction beside its structured interpretation. Saving a recurring plan records configuration; it does not authorize a trade."
      />
      <PlanFormView />
    </div>
  );
}
