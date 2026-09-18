'use client'

import React, { useState } from 'react';

export default function SiteProofModal({ projectId, onClose, onSuccess }: { projectId: number, onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [loc, setLoc] = useState<{lat: number, lng: number} | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string>('');

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("Geolocation failed:", err),
        { enableHighAccuracy: true }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoBase64(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!loc || !photoBase64) return;
    setLoading(true);
    try {
      await fetch('/api/shield/proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, lat: loc.lat, lng: loc.lng, photoUrl: photoBase64 })
      });
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1E1B16] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold mb-4 text-white">Record First Furnishing Proof</h2>
        <p className="text-sm text-gray-400 mb-6">Anchor the legal clock by securely hashing your physical presence and site conditions onto the project record.</p>
        
        <div className="flex flex-col gap-4">
          <button 
            onClick={getLocation} 
            className={`p-3 rounded-lg border text-sm font-bold flex justify-center items-center gap-2 transition-colors ${loc ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'}`}
          >
            {loc ? `✓ GPS Secured (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})` : '📍 Grab GPS Coordinates'}
          </button>

          <div className="bg-[#2A261F] p-4 rounded-lg border border-white/5">
            <label className="text-xs text-gray-400 block mb-2 font-bold uppercase tracking-wider">Snap Job Site Photo (Required)</label>
            <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="text-sm text-gray-300 w-full file:bg-[#1E1B16] file:border-white/10 file:text-white file:px-3 file:py-1.5 file:rounded file:mr-3 file:cursor-pointer" />
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={onClose} disabled={loading} className="flex-1 bg-white/5 p-3 rounded-lg font-bold text-sm text-white hover:bg-white/10 transition-colors">Cancel</button>
            <button 
              onClick={handleSubmit} 
              disabled={!loc || !photoBase64 || loading}
              className="flex-1 bg-[#C17B2A] text-[#1E1B16] p-3 rounded-lg font-bold text-sm shadow-lg disabled:opacity-50 transition-all hover:bg-[#D48F3D]"
            >
              {loading ? 'Securing Hash...' : 'Anchor Legal Clock'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
