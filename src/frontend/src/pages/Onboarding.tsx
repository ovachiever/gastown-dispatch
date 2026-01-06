import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Rocket,
  Check,
  ChevronRight,
  FolderOpen,
  GitBranch,
  Users,
  Truck,
} from "lucide-react";
import { addRig, addCrew, createConvoy, slingWork } from "@/lib/api";
import { cn } from "@/lib/utils";

type Step = "town" | "rig" | "crew" | "convoy" | "done";

interface WizardState {
  townPath: string;
  rigName: string;
  rigUrl: string;
  crewName: string;
  firstTask: string;
}

export default function Onboarding() {
  const [step, setStep] = useState<Step>("town");
  const [state, setState] = useState<WizardState>({
    townPath: "",
    rigName: "",
    rigUrl: "",
    crewName: "",
    firstTask: "",
  });
  const [error, setError] = useState<string | null>(null);

  const addRigMutation = useMutation({
    mutationFn: () => addRig({ name: state.rigName, url: state.rigUrl }),
    onSuccess: () => setStep("crew"),
    onError: (e) => setError(e.message),
  });

  const addCrewMutation = useMutation({
    mutationFn: () => addCrew({ name: state.crewName, rig: state.rigName }),
    onSuccess: () => setStep("convoy"),
    onError: (e) => setError(e.message),
  });

  const steps: { id: Step; label: string; icon: typeof Rocket }[] = [
    { id: "town", label: "Select Town", icon: FolderOpen },
    { id: "rig", label: "Add Rig", icon: GitBranch },
    { id: "crew", label: "Add Crew", icon: Users },
    { id: "convoy", label: "First Task", icon: Truck },
    { id: "done", label: "Complete", icon: Check },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  i < currentStepIndex
                    ? "bg-gt-accent text-black"
                    : i === currentStepIndex
                    ? "bg-gt-accent/20 text-gt-accent border border-gt-accent"
                    : "bg-gt-surface text-gt-muted"
                )}
              >
                {i < currentStepIndex ? (
                  <Check size={16} />
                ) : (
                  <s.icon size={16} />
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "w-12 h-0.5 mx-2",
                    i < currentStepIndex ? "bg-gt-accent" : "bg-gt-border"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div className="bg-gt-surface border border-gt-border rounded-lg p-6">
          {step === "town" && (
            <>
              <h2 className="text-xl font-semibold mb-2">
                Welcome to Gas Town Dispatch
              </h2>
              <p className="text-gt-muted mb-6">
                Let's get you set up with your AI agent workspace. First, we need
                to connect to your Gas Town installation.
              </p>

              <div className="mb-6">
                <label className="block text-sm mb-2">Town Directory</label>
                <input
                  type="text"
                  value={state.townPath}
                  onChange={(e) =>
                    setState({ ...state, townPath: e.target.value })
                  }
                  placeholder="~/gt"
                  className="w-full bg-gt-bg border border-gt-border rounded-lg px-4 py-2 focus:outline-none focus:border-gt-accent"
                />
                <p className="text-xs text-gt-muted mt-1">
                  The directory where your Gas Town is installed (default: ~/gt)
                </p>
              </div>

              <button
                onClick={() => setStep("rig")}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gt-accent text-black rounded-lg hover:bg-gt-accent/90 transition-colors"
              >
                Continue
                <ChevronRight size={16} />
              </button>
            </>
          )}

          {step === "rig" && (
            <>
              <h2 className="text-xl font-semibold mb-2">Add Your First Rig</h2>
              <p className="text-gt-muted mb-6">
                A rig is a project container. Add a git repository to start
                managing it with AI agents.
              </p>

              {error && (
                <div className="bg-red-900/20 border border-red-500 rounded-lg p-3 mb-4 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm mb-2">Rig Name</label>
                  <input
                    type="text"
                    value={state.rigName}
                    onChange={(e) =>
                      setState({ ...state, rigName: e.target.value })
                    }
                    placeholder="myproject"
                    className="w-full bg-gt-bg border border-gt-border rounded-lg px-4 py-2 focus:outline-none focus:border-gt-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Git URL</label>
                  <input
                    type="text"
                    value={state.rigUrl}
                    onChange={(e) =>
                      setState({ ...state, rigUrl: e.target.value })
                    }
                    placeholder="https://github.com/you/repo.git"
                    className="w-full bg-gt-bg border border-gt-border rounded-lg px-4 py-2 focus:outline-none focus:border-gt-accent"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep("town")}
                  className="px-4 py-2 bg-gt-bg border border-gt-border rounded-lg hover:bg-gt-border transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => addRigMutation.mutate()}
                  disabled={
                    !state.rigName || !state.rigUrl || addRigMutation.isPending
                  }
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gt-accent text-black rounded-lg hover:bg-gt-accent/90 transition-colors disabled:opacity-50"
                >
                  {addRigMutation.isPending ? "Adding..." : "Add Rig"}
                  <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}

          {step === "crew" && (
            <>
              <h2 className="text-xl font-semibold mb-2">Create Your Workspace</h2>
              <p className="text-gt-muted mb-6">
                A crew workspace is your personal working directory in the rig.
                This is where you'll work on the project.
              </p>

              {error && (
                <div className="bg-red-900/20 border border-red-500 rounded-lg p-3 mb-4 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm mb-2">Your Name</label>
                <input
                  type="text"
                  value={state.crewName}
                  onChange={(e) =>
                    setState({ ...state, crewName: e.target.value })
                  }
                  placeholder="yourname"
                  className="w-full bg-gt-bg border border-gt-border rounded-lg px-4 py-2 focus:outline-none focus:border-gt-accent"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep("rig")}
                  className="px-4 py-2 bg-gt-bg border border-gt-border rounded-lg hover:bg-gt-border transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => addCrewMutation.mutate()}
                  disabled={!state.crewName || addCrewMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gt-accent text-black rounded-lg hover:bg-gt-accent/90 transition-colors disabled:opacity-50"
                >
                  {addCrewMutation.isPending ? "Creating..." : "Create Workspace"}
                  <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}

          {step === "convoy" && (
            <>
              <h2 className="text-xl font-semibold mb-2">Ready to Work!</h2>
              <p className="text-gt-muted mb-6">
                Your workspace is set up. You can now go to the Dispatch page to
                start interacting with the Mayor, or create your first convoy to
                track work.
              </p>

              <div className="bg-gt-bg rounded-lg p-4 mb-6">
                <h3 className="font-medium mb-2">What's Next?</h3>
                <ul className="text-sm text-gt-muted space-y-2">
                  <li>• Go to <strong>Dispatch</strong> to talk to the Mayor</li>
                  <li>• Create <strong>Convoys</strong> to track batched work</li>
                  <li>• View <strong>Beads</strong> to see available tasks</li>
                  <li>• Check <strong>Agents</strong> to monitor workers</li>
                </ul>
              </div>

              <button
                onClick={() => setStep("done")}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gt-accent text-black rounded-lg hover:bg-gt-accent/90 transition-colors"
              >
                Complete Setup
                <Check size={16} />
              </button>
            </>
          )}

          {step === "done" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="text-green-400" size={32} />
              </div>
              <h2 className="text-xl font-semibold mb-2">You're All Set!</h2>
              <p className="text-gt-muted mb-6">
                Gas Town Dispatch is ready. Head to the Overview to see your
                workspace status.
              </p>
              <a
                href="/overview"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gt-accent text-black rounded-lg hover:bg-gt-accent/90 transition-colors"
              >
                Go to Overview
                <ChevronRight size={16} />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
