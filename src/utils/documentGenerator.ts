export function generateIndianaPreLienNoticeHTML(
  contractorName: string,
  ownerName: string,
  address: string,
  clientDetails: string
): string {
  return `
    <div class="print:m-12 p-8 max-w-3xl mx-auto bg-white text-black font-serif border border-gray-200">
      <h1 class="text-2xl font-bold text-center mb-6 uppercase underline">Pre-Lien Notice to Owner</h1>
      <div class="text-right mb-6 text-sm">
        <strong>Date:</strong> ${new Date().toLocaleDateString()}
      </div>
      <div class="mb-6">
        <p><strong>To:</strong> ${ownerName}</p>
        <p><strong>Property Address:</strong> ${address}</p>
        <p><strong>Client/Entity:</strong> ${clientDetails}</p>
      </div>
      <p class="mb-4">
        Notice is hereby given pursuant to <strong>Indiana Code IC § 32-28-3-1</strong> that the undersigned, <strong>${contractorName}</strong>, 
        intends to hold a statutory lien on the above-described real estate.
      </p>
      <p class="mb-4">
        This notice is provided to inform you that we have furnished materials, labor, or machinery to the property. 
        If payment is not secured, we reserve the right to perfect our mechanic's lien.
      </p>
      <div class="mt-12">
        <p class="mb-2">Sincerely,</p>
        <div class="w-48 h-px bg-black mb-1"></div>
        <p class="font-bold">${contractorName}</p>
      </div>
    </div>
  `;
}

export function generateKentuckyNoticeOfIntentHTML(
  contractorName: string,
  ownerName: string,
  contractAmount: number
): string {
  return `
    <div class="print:m-12 p-8 max-w-3xl mx-auto bg-white text-black font-serif border border-gray-200">
      <h1 class="text-2xl font-bold text-center mb-6 uppercase underline">Notice of Intent to Hold Property Liable</h1>
      <p class="mb-4 text-sm font-bold">Pursuant to KRS § 376.010</p>
      <p class="mb-4">
        To: <strong>${ownerName}</strong>
      </p>
      <p class="mb-4">
        You are hereby notified that <strong>${contractorName}</strong> has been contracted to furnish labor/materials 
        for improvements on your property.
      </p>
      <p class="mb-4">
        The total authorized contract amount or estimated value of materials/labor is <strong>$${(contractAmount / 100).toFixed(2)}</strong>.
      </p>
      <div class="mt-12">
        <p class="mb-2">Authorized Signature:</p>
        <div class="w-64 h-px bg-black mb-1"></div>
        <p>${contractorName} Representative</p>
      </div>
    </div>
  `;
}

export function generateLienWaiverHTML(
  contractorName: string,
  ownerName: string,
  amount: number,
  isFinal: boolean
): string {
  const type = isFinal ? 'FINAL UNCONDITIONAL' : 'PARTIAL CONDITIONAL';
  return `
    <div class="print:m-12 p-8 max-w-3xl mx-auto bg-white text-black font-sans border border-gray-200">
      <h1 class="text-2xl font-black text-center mb-8 uppercase">${type} WAIVER AND RELEASE OF LIEN</h1>
      <p class="mb-4 leading-relaxed">
        For and in consideration of the sum of <strong>$${(amount / 100).toFixed(2)}</strong>, the receipt and sufficiency of which is hereby acknowledged, 
        <strong>${contractorName}</strong> hereby waives and releases any and all liens or claims or right of lien 
        on the property owned by <strong>${ownerName}</strong>.
      </p>
      <p class="mb-8 font-bold italic text-sm text-gray-700">
        ${isFinal 
          ? 'This is a full and final waiver. All claims are unconditionally released.' 
          : 'This waiver is conditioned upon receipt and clearance of funds for the amount stated above.'}
      </p>
      <div class="mt-16 flex justify-between">
        <div class="w-1/2 pr-4">
          <div class="w-full h-px bg-black mb-2"></div>
          <p class="text-sm font-semibold">Contractor Signature</p>
        </div>
        <div class="w-1/3">
          <div class="w-full h-px bg-black mb-2"></div>
          <p class="text-sm font-semibold">Date</p>
        </div>
      </div>
    </div>
  `;
}

export function generateCertifiedMailCoverSheet(
  contractorName: string,
  ownerName: string,
  trackingNumber: string,
  statuteReference: string
): string {
  return `
    <div class="print:m-0 w-full h-[11in] max-w-[8.5in] mx-auto bg-white text-black font-sans relative" style="page-break-after: always; padding: 0.5in;">
      
      <!-- Top Window / Return Address -->
      <div class="absolute top-[0.5in] left-[0.6in] text-xs font-medium leading-snug text-gray-800">
        <p class="font-bold text-sm mb-1">${contractorName}</p>
        <p>123 Contractor Way, Suite 100</p>
        <p>Indianapolis, IN 46204</p>
        <p>Ph: (555) 123-4567</p>
        <p>License: #GC-9901</p>
      </div>

      <!-- USPS Certified Mail Header Block -->
      <div class="absolute top-[0.5in] right-[0.5in] border-4 border-black p-4 text-center w-[3.5in]">
        <h2 class="font-black text-xl tracking-tighter uppercase mb-2">USPS CERTIFIED MAIL™</h2>
        <p class="font-bold text-sm tracking-widest bg-black text-white py-1 uppercase mb-3">Return Receipt Requested</p>
        
        <div class="flex justify-center items-center h-12 bg-gray-100 border border-dashed border-gray-400 mb-2">
          <p class="font-mono text-lg font-bold tracking-[0.2em] text-black">
            ${trackingNumber || '____ ____ ____ ____ ____'}
          </p>
        </div>
        <p class="text-[10px] uppercase font-bold text-gray-500">Attach Article Number Barcode Here</p>
      </div>

      <!-- Bottom Window / Recipient Address (Positioned for standard #10 double-window envelope) -->
      <div class="absolute top-[3.75in] left-[1.2in] text-sm font-semibold leading-relaxed w-[4in]">
        <p class="font-bold text-base mb-1">${ownerName}</p>
        <p class="whitespace-pre-line">${ownerName}</p>
      </div>

      <!-- Statutory Reference Banner (Placed below the fold / bottom window) -->
      <div class="absolute top-[6.5in] left-[0.5in] right-[0.5in] border-2 border-black p-6">
        <h3 class="font-black text-2xl uppercase mb-2 border-b-2 border-black pb-2">Enclosed: Statutory Notice</h3>
        <p class="font-bold text-lg mb-4 text-gray-800">
          Pursuant to <span class="bg-yellow-200 px-2 py-1">${statuteReference}</span>
        </p>
        <p class="text-sm font-medium text-gray-700 leading-relaxed">
          <strong>IMPORTANT:</strong> This envelope contains a time-sensitive legal notice regarding the property referenced above. Please open immediately and retain for your records. Do not discard.
        </p>
      </div>
      
    </div>
  `;
}
