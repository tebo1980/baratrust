import { UserButton } from "@clerk/nextjs";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-950 p-10 text-gray-100">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-800 mb-8">
          <h1 className="text-2xl font-bold font-fraunces text-white tracking-wide">
            BaraTrust Operations
          </h1>
          {/* Clerk's profile button */}
          <UserButton afterSignOutUrl="/sign-in" />
        </div>

        <div className="bg-gray-900 p-8 rounded-xl shadow-lg border border-gray-800">
          <h2 className="text-xl font-semibold mb-4 text-white">
            Welcome to the Command Center
          </h2>
          <p className="text-gray-400">
            Authentication verified. Your AI agents are standing by and ready to get to work.
          </p>
        </div>
      </div>
    </div>
  );
}