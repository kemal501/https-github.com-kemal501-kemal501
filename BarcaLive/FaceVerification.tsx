import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, ShieldCheck, X, Loader2, Sparkles, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface FaceVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
}

export default function FaceVerification({ isOpen, onClose, onVerified }: FaceVerificationProps) {
  const [step, setStep] = React.useState<'initial' | 'scanning' | 'analyzing' | 'success' | 'failed'>('initial');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = React.useState<'user' | 'environment'>('user');

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setFacingMode(mode);
      setStep('scanning');
      setErrorMsg(null);
    } catch (err) {
      console.error('Camera error:', err);
      setErrorMsg("Camera access denied or unavailable.");
    }
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera(nextMode);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleScan = async () => {
    if (!videoRef.current || !canvasRef.current || !auth.currentUser) return;
    
    setStep('analyzing');
    setProgress(10);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      setProgress(30);

      try {
        const response = await fetch('/api/verify-face', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imageData,
            userId: auth.currentUser.uid
          })
        });

        setProgress(70);
        const result = await response.json();
        setProgress(100);

        if (result.success) {
          setStep('success');
          setTimeout(() => {
            onVerified();
            onClose();
          }, 2500);
        } else {
          setStep('failed');
          setErrorMsg(result.reason || "We couldn't verify your face. Please try again in a well-lit area.");
        }
      } catch (err) {
        console.error('Verification error:', err);
        setStep('failed');
        setErrorMsg("Network error during verification. Please check your connection.");
      }
    }
  };

  React.useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setStep('initial');
      setProgress(0);
      setErrorMsg(null);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200]"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="fixed inset-0 flex items-center justify-center p-6 z-[210] pointer-events-none"
          >
            <div className="bg-zinc-950 border border-zinc-900 rounded-[3rem] w-full max-w-md overflow-hidden pointer-events-auto shadow-2xl relative">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 bg-zinc-900 p-2 rounded-xl text-zinc-500 hover:text-white transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-8 space-y-8">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-amber-400/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8 text-amber-400" />
                  </div>
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">Identity Vault</h2>
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Biometric Protocol Verification</p>
                </div>

                <div className="relative aspect-square bg-zinc-900 rounded-[2.5rem] overflow-hidden border border-zinc-800">
                  {step === 'initial' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4">
                      <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center animate-pulse">
                        <Camera className="w-8 h-8 text-amber-400" />
                      </div>
                      <div className="space-y-2 max-w-[280px]">
                        <p className="text-white font-black text-xs uppercase tracking-wider">Face Biometric Setup</p>
                        <ul className="text-zinc-500 text-[9px] font-bold uppercase tracking-wide text-left space-y-1 md:space-y-1.5 list-none pl-0">
                          <li className="flex items-center gap-1.5 leading-snug">
                            <span className="w-1 h-1 bg-amber-400 rounded-full flex-shrink-0" />
                            <span>Allow camera to front & back view</span>
                          </li>
                          <li className="flex items-center gap-1.5 leading-snug">
                            <span className="w-1 h-1 bg-amber-400 rounded-full flex-shrink-0" />
                            <span>Look directly into the camera</span>
                          </li>
                          <li className="flex items-center gap-1.5 leading-snug">
                            <span className="w-1 h-1 bg-amber-400 rounded-full flex-shrink-0" />
                            <span>Open mouth to show scan real person</span>
                          </li>
                          <li className="flex items-center gap-1.5 leading-snug">
                            <span className="w-1 h-1 bg-amber-400 rounded-full flex-shrink-0" />
                            <span>Brightly lit environment</span>
                          </li>
                          <li className="flex items-center gap-1.5 leading-snug">
                            <span className="w-1 h-1 bg-amber-400 rounded-full flex-shrink-0" />
                            <span>AI verified human presence</span>
                          </li>
                        </ul>
                      </div>
                      <button 
                        onClick={() => startCamera()}
                        className="w-full bg-amber-400 text-black py-3.5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-amber-400/20 active:scale-95 transition-all"
                      >
                        Initiate Scanner
                      </button>
                    </div>
                  )}

                  {(step === 'scanning' || step === 'analyzing' || step === 'failed') && (
                    <>
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className={cn(
                          "w-full h-full object-cover transition-all duration-1000",
                          (step === 'analyzing') && "scale-110 blur-[2px] grayscale"
                        )}
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      
                      {step === 'scanning' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFacingMode();
                          }}
                          className="absolute bottom-4 right-4 z-20 bg-black/85 hover:bg-black border border-zinc-800 px-3 py-1.5 rounded-xl text-amber-400 font-black text-[8px] uppercase tracking-widest flex items-center gap-1 shadow-lg shadow-black/50 pointer-events-auto cursor-pointer"
                        >
                          <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                          <span>Switch Mode ({facingMode === 'user' ? 'Front' : 'Back'})</span>
                        </button>
                      )}

                      {step === 'scanning' && (
                        <div className="absolute top-4 left-4 right-4 bg-black/80 backdrop-blur border border-zinc-800/80 px-3 py-1.5 rounded-xl text-center z-10 pointer-events-none">
                          <p className="text-amber-400 font-extrabold text-[8px] uppercase tracking-wider animate-pulse leading-normal">
                            instruction: look directly into the camera and open your mouth
                          </p>
                        </div>
                      )}
                      
                      {/* Scanning UI Overlays */}
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Frame corner brackets */}
                        <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-amber-400" />
                        <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-amber-400" />
                        <div className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-amber-400" />
                        <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-amber-400" />

                        {step === 'scanning' && (
                          <motion.div 
                            animate={{ top: ['10%', '90%', '10%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                            className="absolute left-0 right-0 h-0.5 bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.8)] z-10"
                          />
                        )}

                        {step === 'analyzing' && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px]">
                            <motion.div 
                              animate={{ rotate: 360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                              className="w-16 h-16 border-2 border-amber-400 border-t-transparent rounded-full mb-6"
                            />
                            <p className="text-white font-black text-[10px] uppercase tracking-[0.3em] italic animate-pulse">
                              Analyzing Biometrics...
                            </p>
                            <div className="mt-8 w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className="h-full bg-amber-400"
                              />
                            </div>
                          </div>
                        )}

                        {step === 'failed' && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-[#09090b]/95 backdrop-blur-md text-center z-30">
                            <div className="w-12 h-12 bg-red-500/15 border border-red-500/30 rounded-2xl flex items-center justify-center mb-4">
                              <AlertCircle className="w-6 h-6 text-red-500 duration-300" />
                            </div>
                            <h4 className="text-white font-black text-xs uppercase tracking-widest mb-1">Verification Failed</h4>
                            <p className="text-zinc-400 text-[10px] leading-relaxed max-w-[240px] mb-5">
                              {errorMsg}
                            </p>
                            <button
                              type="button"
                              onClick={() => startCamera()}
                              className="bg-amber-400 text-black font-black uppercase text-[8px] tracking-[0.15em] px-4 py-2.5 rounded-xl hover:bg-amber-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-400/15 pointer-events-auto"
                            >
                              <RefreshCw className="w-3 h-3 shrink-0" />
                              Reset Scanner Feed
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {step === 'success' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-12 bg-zinc-950">
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-green-500/20"
                      >
                        <CheckCircle2 className="w-12 h-12 text-white" />
                      </motion.div>
                      <div className="text-center space-y-2">
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Verified</h3>
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Protocol Sync Complete</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {step === 'scanning' && (
                    <button 
                      onClick={handleScan}
                      className="w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs bg-amber-400 text-black shadow-2xl shadow-amber-400/30 active:scale-95 transition-all cursor-pointer"
                    >
                      Process Identity
                    </button>
                  )}
                  {step === 'failed' && (
                    <button 
                      onClick={() => startCamera()}
                      className="w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs bg-red-500 hover:bg-red-600 text-white shadow-2xl shadow-red-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Rescan Face & Retry
                    </button>
                  )}
                  <div className="flex items-start gap-3 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                    <Sparkles className="w-4 h-4 text-amber-500 mt-1 flex-shrink-0" />
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                      Please look directly into the camera and open your mouth to show and scan a real person face using either the front or back camera in a brightly lit environment. Your biometric scan is verified by AI to ensure real human presence.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
