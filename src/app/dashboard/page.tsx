import DashboardMetrics from "@/components/DashboardMetrics";
import RecentBidsTable from "@/components/RecentBidsTable";
import RunBrixButton from "@/components/RunBrixButton";

export default function DashboardPage() {
  return (
    <div className="w-full">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-200 drop-shadow-sm">
            Financial Overview
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Monitor your real-time pipeline, secured grants, and collected cash flow.
          </p>
        </div>
        <RunBrixButton />
      </div>

      <div className="w-full">
        <DashboardMetrics />
        <RecentBidsTable />
      </div>
    </div>
  );
}
