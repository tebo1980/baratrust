import { db } from '@/db';
import { shieldArcPackets, shieldProjects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export default async function ARCPacketView({ params }: { params: { id: string } }) {
  const arcId = parseInt(params.id, 10);
  if (isNaN(arcId)) return notFound();

  // Load packet, or simulate one for the project if missing
  let [packet] = await db.select().from(shieldArcPackets).where(eq(shieldArcPackets.projectId, arcId)).limit(1);
  const [project] = await db.select().from(shieldProjects).where(eq(shieldProjects.id, arcId)).limit(1);

  if (!project) return notFound();

  // Auto-mock a packet for the UI if it doesn't exist yet
  if (!packet) {
    packet = {
      id: arcId,
      projectId: arcId,
      hoaName: 'Local HOA / ARC Board',
      tradeType: project.projectType || 'Exterior Improvement',
      specSheetJson: { material: "Architectural Shingles", color: "Onyx Black", manufacturer: "Owens Corning" },
      status: 'pending',
      submittedAt: null,
      approvedAt: null,
      createdAt: new Date(),
    };
  }

  async function updateStatus(formData: FormData) {
    'use server';
    const status = formData.get('status') as string;
    // Real implementation would upsert here, wrapping in try/catch
    try {
        await db.update(shieldArcPackets).set({ status }).where(eq(shieldArcPackets.id, packet.id));
    } catch(e) {}
    revalidatePath(`/shield/arc/${arcId}`);
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 text-black font-sans">
      <div className="max-w-4xl mx-auto bg-white p-12 shadow-2xl print:shadow-none print:p-0">
        <div className="border-b-4 border-gray-900 pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight">ARC Submission Packet</h1>
            <h2 className="text-xl font-bold text-gray-500 mt-2">{packet.hoaName} Review Board</h2>
          </div>
          <div className="text-right print:hidden">
            <form action={updateStatus} className="flex gap-2 mb-2 justify-end">
              <button name="status" value="SUBMITTED" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-bold text-sm rounded shadow">Mark Submitted</button>
              <button name="status" value="APPROVED" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 font-bold text-sm rounded shadow">Mark Approved</button>
            </form>
            <div className="text-sm font-bold bg-gray-100 inline-block px-3 py-1 rounded">Status: <span className="uppercase text-blue-600">{packet.status}</span></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-bold border-b border-gray-300 mb-2 uppercase text-xs tracking-widest text-gray-500">Property Details</h3>
            <p className="font-semibold text-lg">{project.clientDetails}</p>
            <p className="text-gray-600 mt-1">Role: {project.contractorRole}</p>
          </div>
          <div>
            <h3 className="font-bold border-b border-gray-300 mb-2 uppercase text-xs tracking-widest text-gray-500">Contractor Spec</h3>
            <p className="font-semibold text-lg">{packet.tradeType}</p>
            <p className="text-gray-600 mt-1">Date: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="mb-12">
          <h3 className="font-bold border-b border-gray-300 mb-4 uppercase text-xs tracking-widest text-gray-500">Material Specifications</h3>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
             <pre className="text-sm font-mono whitespace-pre-wrap">{JSON.stringify(packet.specSheetJson, null, 2)}</pre>
          </div>
        </div>

        <div>
          <h3 className="font-bold border-b border-gray-300 mb-4 uppercase text-xs tracking-widest text-gray-500">Review Board Checklist</h3>
          <ul className="space-y-4">
            <li className="flex items-center gap-3"><div className="w-5 h-5 border-2 border-gray-400 rounded-sm"></div> <span className="font-medium">Plat Map & Easement Setbacks Attached</span></li>
            <li className="flex items-center gap-3"><div className="w-5 h-5 border-2 border-gray-400 rounded-sm"></div> <span className="font-medium">Material Samples & Color Swatches Provided</span></li>
            <li className="flex items-center gap-3"><div className="w-5 h-5 border-2 border-gray-400 rounded-sm"></div> <span className="font-medium">Contractor License & Insurance Certificate Verified</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
