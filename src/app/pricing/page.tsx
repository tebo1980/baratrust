'use client';

import { useState } from 'react';

export default function PricingPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      // Calls the backend route we (theoretically) built in Step 1
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url; // Redirects to Stripe securely
      }
    } catch (error) {
      console.error('Failed to load checkout:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-white sm:text-5xl">
          Join BaraTrustAds
        </h1>
        <p className="mt-4 text-xl text-gray-400">
          Unlock the full power of the Fortress.
        </p>
      </div>

      <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 w-full max-w-md p-8 text-center">
        <h2 className="text-2xl font-semibold text-white mb-4">Founding Member</h2>
        <div className="flex justify-center items-baseline mb-8">
          <span className="text-5xl font-extrabold text-white">$99</span>
          <span className="text-xl text-gray-400 ml-1">/mo</span>
        </div>

        <ul className="text-gray-300 space-y-4 mb-8 text-left">
          <li className="flex items-center">
            <svg className="w-5 h-5 text-indigo-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            Full Dashboard Access
          </li>
          <li className="flex items-center">
            <svg className="w-5 h-5 text-indigo-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            Unlimited AI Commercials
          </li>
          <li className="flex items-center">
            <svg className="w-5 h-5 text-indigo-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            Priority Support
          </li>
        </ul>

        <button
          onClick={handleCheckout}
          disabled={isLoading}
          className={`w-full py-4 px-6 rounded-lg text-white font-bold text-lg transition-all ${
            isLoading 
              ? 'bg-indigo-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30'
          }`}
        >
          {isLoading ? 'Opening Vault...' : 'Upgrade Now'}
        </button>
      </div>
    </div>
  );
}