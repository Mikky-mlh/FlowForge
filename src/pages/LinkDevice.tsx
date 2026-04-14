import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { QrReader } from 'react-qr-reader';
import { motion } from 'framer-motion';
import { QrCode, Scan, GoogleLogo } from '@phosphor-icons/react';

export const LinkDevice: React.FC = () => {
  const { user, syncId, signIn, linkDevice } = useAuth();
  const [mode, setMode] = useState<'show' | 'scan'>('show');
  const [manualCode, setManualCode] = useState('');

  const handleScan = (result: any, error: any) => {
    if (result?.text) {
      linkDevice(result.text);
    }
  };

  const handleManualLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.length === 12) {
      linkDevice(manualCode);
    }
  };

  if (!user && !syncId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mb-8">
          <QrCode className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-medium tracking-tighter mb-4 text-zinc-950">Sync Devices</h1>
        <p className="text-zinc-500 mb-12">Sign in with Google to create your master sync ID, or scan a code from an existing device.</p>
        
        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-3 bg-zinc-900 text-white px-6 py-4 rounded-xl font-medium hover:bg-zinc-800 transition-colors mb-4"
        >
          <GoogleLogo weight="bold" className="w-5 h-5" />
          Sign in with Google
        </button>

        <div className="relative w-full flex items-center py-4">
          <div className="flex-grow border-t border-zinc-200"></div>
          <span className="flex-shrink-0 mx-4 text-zinc-400 text-sm">or</span>
          <div className="flex-grow border-t border-zinc-200"></div>
        </div>

        <button
          onClick={() => setMode('scan')}
          className="w-full flex items-center justify-center gap-3 bg-white text-zinc-950 px-6 py-4 rounded-xl font-medium hover:bg-zinc-50 transition-colors border border-zinc-200"
        >
          <Scan className="w-5 h-5" />
          Scan QR Code
        </button>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-6xl mx-auto min-h-[100dvh]">
      <header className="mb-12">
        <h1 className="text-[56px] font-bold tracking-[-0.04em] leading-[0.9] text-zinc-950 mb-4">Device Link</h1>
        <p className="text-zinc-500">Connect your devices securely.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="p-8 bg-white border border-zinc-200 rounded-[24px] flex flex-col items-center text-center shadow-sm">
          <h2 className="text-lg font-medium mb-8 text-zinc-950">Your Sync QR</h2>
          <div className="p-4 bg-white border border-zinc-100 rounded-2xl mb-8 shadow-sm">
            <QRCodeSVG value={syncId || ''} size={200} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">Manual Code</p>
            <p className="text-2xl font-mono tracking-widest text-teal-600">{syncId}</p>
          </div>
        </div>

        <div className="p-8 bg-white border border-zinc-200 rounded-[24px] flex flex-col items-center shadow-sm">
          <h2 className="text-lg font-medium mb-8 text-zinc-950">Link New Device</h2>
          
          <div className="w-full space-y-6">
            {mode === 'scan' ? (
              <div className="w-full aspect-square bg-zinc-100 rounded-2xl overflow-hidden border border-zinc-200">
                <QrReader
                  onResult={handleScan}
                  constraints={{ facingMode: 'environment' }}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <button
                onClick={() => setMode('scan')}
                className="w-full aspect-square flex flex-col items-center justify-center gap-4 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 transition-colors bg-zinc-50"
              >
                <Scan className="w-8 h-8" />
                <span>Tap to Scan</span>
              </button>
            )}

            <form onSubmit={handleManualLink} className="w-full">
              <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-2">Or enter manual code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="12-CHAR-CODE"
                  maxLength={12}
                  className="flex-1 bg-white border border-zinc-200 rounded-xl px-4 py-3 text-zinc-950 font-mono focus:border-teal-600 outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={manualCode.length !== 12}
                  className="px-6 bg-teal-600 text-white rounded-xl font-medium disabled:opacity-50"
                >
                  Link
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
