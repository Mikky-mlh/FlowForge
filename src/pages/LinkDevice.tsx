import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { QrScanner } from '@yudiel/react-qr-scanner';
import { motion } from 'framer-motion';
import { QrCode, Scan, GoogleLogo } from '@phosphor-icons/react';

export const LinkDevice: React.FC = () => {
  const { user, syncId, signIn, linkDevice, error: authError } = useAuth();
  const [mode, setMode] = useState<'show' | 'scan'>('show');
  const [manualCode, setManualCode] = useState('');

  const handleScan = (result: string) => {
    linkDevice(result);
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
        <div className="w-16 h-16 bg-app-primary/10 text-app-primary rounded-2xl flex items-center justify-center mb-8">
          <QrCode className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-medium tracking-tighter mb-4 text-app-text">Sync Devices</h1>
        <p className="text-app-muted mb-8">Sign in with Google to create your master sync ID, or scan a code from an existing device.</p>
        
        {authError && (
          <div className="w-full bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-8 text-sm text-left">
            <p className="font-bold mb-1">Sign-in Error:</p>
            <p>{authError}</p>
            {authError.includes('auth/unauthorized-domain') && (
              <p className="mt-2 text-xs">
                <strong>Fix:</strong> Go to Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains, and add this app's URL.
              </p>
            )}
            {authError.includes('auth/invalid-api-key') && (
              <p className="mt-2 text-xs">
                <strong>Fix:</strong> Check your firebase-applet-config.json. The API key is invalid.
              </p>
            )}
            {authError.includes('auth/popup-closed-by-user') && (
              <p className="mt-2 text-xs">
                The popup was closed before completing sign in. Please try again.
              </p>
            )}
          </div>
        )}

        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-3 bg-app-text text-app-bg px-6 py-4 rounded-xl font-medium hover:opacity-90 transition-colors mb-4"
        >
          <GoogleLogo weight="bold" className="w-5 h-5" />
          Sign in with Google
        </button>

        <div className="relative w-full flex items-center py-4">
          <div className="flex-grow border-t border-app-border"></div>
          <span className="flex-shrink-0 mx-4 text-app-muted/80 text-sm">or</span>
          <div className="flex-grow border-t border-app-border"></div>
        </div>

        {mode === 'scan' ? (
          <div className="w-full space-y-4">
            <div className="w-full aspect-square bg-app-surface rounded-2xl overflow-hidden border border-app-border">
              <QrScanner
                onDecode={handleScan}
                onError={(error) => console.log(error?.message)}
              />
            </div>
            <button
              onClick={() => setMode('show')}
              className="text-sm text-app-muted hover:text-app-text"
            >
              Cancel Scan
            </button>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <button
              onClick={() => setMode('scan')}
              className="w-full flex items-center justify-center gap-3 bg-app-card text-app-text px-6 py-4 rounded-xl font-medium hover:bg-app-surface transition-colors border border-app-border"
            >
              <Scan className="w-5 h-5" />
              Scan QR Code
            </button>
            <form onSubmit={handleManualLink} className="w-full flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="12-CHAR-CODE"
                maxLength={12}
                className="flex-1 bg-app-card border border-app-border rounded-xl px-4 py-3 text-app-text font-mono focus:border-app-primary outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={manualCode.length !== 12}
                className="px-6 bg-app-primary text-app-primary-fg rounded-xl font-medium disabled:opacity-50"
              >
                Link
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-10 max-w-6xl mx-auto min-h-[100dvh]">
      <header className="mb-12">
        <h1 className="text-[56px] font-bold tracking-[-0.04em] leading-[0.9] text-app-text mb-4">Device Link</h1>
        <p className="text-app-muted">Connect your devices securely.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="p-8 bg-app-card border border-app-border rounded-[24px] flex flex-col items-center text-center shadow-sm">
          <h2 className="text-lg font-medium mb-8 text-app-text">Your Sync QR</h2>
          <div className="p-4 bg-app-card border border-app-surface rounded-2xl mb-8 shadow-sm">
            <QRCodeSVG value={syncId || ''} size={200} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-app-muted uppercase tracking-widest">Manual Code</p>
            <p className="text-2xl font-mono tracking-widest text-app-primary">{syncId}</p>
          </div>
        </div>

        <div className="p-8 bg-app-card border border-app-border rounded-[24px] flex flex-col items-center shadow-sm">
          <h2 className="text-lg font-medium mb-8 text-app-text">Link New Device</h2>
          
          <div className="w-full space-y-6">
            {mode === 'scan' ? (
              <div className="w-full aspect-square bg-app-surface rounded-2xl overflow-hidden border border-app-border">
                <QrScanner
                  onDecode={handleScan}
                  onError={(error) => console.log(error?.message)}
                />
              </div>
            ) : (
              <button
                onClick={() => setMode('scan')}
                className="w-full aspect-square flex flex-col items-center justify-center gap-4 border-2 border-dashed border-app-border rounded-2xl text-app-muted/80 hover:text-app-muted hover:border-app-muted transition-colors bg-app-bg"
              >
                <Scan className="w-8 h-8" />
                <span>Tap to Scan</span>
              </button>
            )}

            <form onSubmit={handleManualLink} className="w-full">
              <label className="block text-xs text-app-muted uppercase tracking-widest mb-2">Or enter manual code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="12-CHAR-CODE"
                  maxLength={12}
                  className="flex-1 bg-app-card border border-app-border rounded-xl px-4 py-3 text-app-text font-mono focus:border-app-primary outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={manualCode.length !== 12}
                  className="px-6 bg-app-primary text-app-primary-fg rounded-xl font-medium disabled:opacity-50"
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
