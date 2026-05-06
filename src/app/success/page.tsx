export default function SuccessPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-950 text-white">
      <div className="p-8 border border-green-800 rounded-xl bg-gray-900 text-center max-w-md w-full shadow-2xl">
        <h1 className="text-4xl font-bold mb-4 text-green-400">Payment Secured</h1>
        <p className="text-gray-400 mb-8">Atlas has confirmed your transaction. The Acoustic BGM Module is now active.</p>
        <a 
          href="/" 
          className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
        >
          Return to Dashboard
        </a>
      </div>
    </main>
  );
}