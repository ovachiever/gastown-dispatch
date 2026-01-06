import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Play, Square, Activity, Truck, CircleDot, Users } from "lucide-react";
import { getStatus, startTown, shutdownTown } from "@/lib/api";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  icon: Icon,
  color = "text-gt-text",
}: {
  label: string;
  value: number | string;
  icon: typeof Activity;
  color?: string;
}) {
  return (
    <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gt-muted">{label}</p>
          <p className={cn("text-2xl font-semibold mt-1", color)}>{value}</p>
        </div>
        <Icon className="text-gt-muted" size={24} />
      </div>
    </div>
  );
}

function AgentCard({
  name,
  role,
  running,
  hasWork,
  workTitle,
}: {
  name: string;
  role: string;
  running: boolean;
  hasWork: boolean;
  workTitle?: string;
}) {
  return (
    <div className="bg-gt-surface border border-gt-border rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              running ? "bg-green-400" : "bg-gray-500"
            )}
          />
          <span className="font-medium">{name}</span>
          <span className="text-xs text-gt-muted bg-gt-bg px-2 py-0.5 rounded">
            {role}
          </span>
        </div>
      </div>
      {hasWork && workTitle && (
        <p className="text-sm text-gt-muted mt-2 truncate">📌 {workTitle}</p>
      )}
    </div>
  );
}

function RigCard({
  name,
  polecatCount,
  crewCount,
  hasWitness,
  hasRefinery,
}: {
  name: string;
  polecatCount: number;
  crewCount: number;
  hasWitness: boolean;
  hasRefinery: boolean;
}) {
  return (
    <div className="bg-gt-surface border border-gt-border rounded-lg p-4">
      <h3 className="font-medium">{name}</h3>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gt-muted">Polecats:</span>{" "}
          <span>{polecatCount}</span>
        </div>
        <div>
          <span className="text-gt-muted">Crew:</span> <span>{crewCount}</span>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        {hasWitness && (
          <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded">
            Witness
          </span>
        )}
        {hasRefinery && (
          <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded">
            Refinery
          </span>
        )}
      </div>
    </div>
  );
}

export default function Overview() {
  const {
    data: status,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["status"],
    queryFn: getStatus,
    refetchInterval: 10_000,
  });

  const handleStart = async () => {
    await startTown();
    refetch();
  };

  const handleShutdown = async () => {
    if (confirm("Are you sure you want to shutdown Gas Town?")) {
      await shutdownTown();
      refetch();
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <RefreshCw className="animate-spin text-gt-muted" size={24} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">Failed to load status: {error.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm text-red-300 hover:text-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const deaconRunning = status?.agents.some(
    (a) => a.role === "deacon" && a.running
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{status?.name || "Gas Town"}</h1>
          <p className="text-sm text-gt-muted">{status?.location}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg bg-gt-surface hover:bg-gt-border transition-colors"
            title="Refresh"
          >
            <RefreshCw
              size={18}
              className={cn(isFetching && "animate-spin")}
            />
          </button>
          {deaconRunning ? (
            <button
              onClick={handleShutdown}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
            >
              <Square size={16} />
              Shutdown
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 transition-colors"
            >
              <Play size={16} />
              Start
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Rigs"
          value={status?.summary.rig_count || 0}
          icon={Activity}
        />
        <StatCard
          label="Convoys"
          value={status?.summary.active_hooks || 0}
          icon={Truck}
          color="text-gt-accent"
        />
        <StatCard
          label="Polecats"
          value={status?.summary.polecat_count || 0}
          icon={CircleDot}
        />
        <StatCard
          label="Crew"
          value={status?.summary.crew_count || 0}
          icon={Users}
        />
      </div>

      {/* Global Agents */}
      <section className="mb-6">
        <h2 className="text-lg font-medium mb-3">Global Agents</h2>
        <div className="grid grid-cols-2 gap-3">
          {status?.agents.map((agent) => (
            <AgentCard
              key={agent.address}
              name={agent.name}
              role={agent.role}
              running={agent.running}
              hasWork={agent.has_work}
              workTitle={agent.work_title}
            />
          ))}
        </div>
      </section>

      {/* Rigs */}
      <section>
        <h2 className="text-lg font-medium mb-3">Rigs</h2>
        {status?.rigs.length === 0 ? (
          <div className="bg-gt-surface border border-gt-border rounded-lg p-6 text-center">
            <p className="text-gt-muted">No rigs configured yet.</p>
            <p className="text-sm text-gt-muted mt-1">
              Add a rig to start managing projects.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {status?.rigs.map((rig) => (
              <RigCard
                key={rig.name}
                name={rig.name}
                polecatCount={rig.polecat_count}
                crewCount={rig.crew_count}
                hasWitness={rig.has_witness}
                hasRefinery={rig.has_refinery}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
