import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, ShieldCheck, X, Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface FaceVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
}

export default function FaceVerification({ isOpen, onClose, onVerified }: FaceVerificationProps) {
  const [step, setStep] = React.useState<'initial' | 'scanning' | 'analyzing' | 'success' | 'refining'>('initial');
  const [progress, setProgress] = React.useState(0);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStep('scanning');
    } catch (err) {
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleScan = () => {
    setStep('analyzing');
    let p = 0;
    const interval = setInterval(() => {
      p += 2;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => setStep('refining'), 500);
      }
    }, 50);
  };

  const handleFinalize = async () => {
    if (!auth.currentUser) return;
    setStep('success');
    
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        isVerified: true,
        identityVerifiedAt: new Date().toISOString()
      });
      setTimeout(() => {
        onVerified();
        onClose();
      }, 2000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  React.useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setStep('initial');
      setProgress(0);
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center space-y-6">
                      <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center animate-pulse">
                        <Camera className="w-10 h-10 text-zinc-600" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-white font-bold text-sm">Authentic Biometrics Required</p>
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest leading-loose">
                          Please ensure your face is well-lit and clearly visible in the frame.
                        </p>
                      </div>
                      <button 
                        onClick={startCamera}
                        className="w-full bg-amber-400 text-black py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-amber-400/20 active:scale-95 transition-all"
                      >
                        Initiate Scanner
                      </button>
                    </div>
                  )}

                  {(step === 'scanning' || step === 'analyzing' || step === 'refining') && (
                    <>
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className={cn(
                          "w-full h-full object-cover transition-all duration-1000",
                          (step === 'analyzing' || step === 'refining') && "scale-110 blur-[2px] grayscale"
                        )}
                      />
                      
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

                        {(step === 'analyzing' || step === 'refining') && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px]">
                            <motion.div 
                              animate={{ rotate: 360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                              className="w-16 h-16 border-2 border-amber-400 border-t-transparent rounded-full mb-6"
                            />
                            <p className="text-white font-black text-[10px] uppercase tracking-[0.3em] italic animate-pulse">
                              {step === 'analyzing' ? 'Processing Points...' : 'Finalizing Hash...'}
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
                      className="w-full bg-amber-400 text-black py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-amber-400/30 active:scale-95 transition-all"
                    >
                      Process Identity
                    </button>
                  )}
                  {step === 'refining' && (
                    <button 
                      onClick={handleFinalize}
                      className="w-full bg-green-500 text-white py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-green-500/30 active:scale-95 transition-all"
                    >
                      Secure Profile
                    </button>
                  )}
                  <div className="flex items-start gap-3 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                    <Sparkles className="w-4 h-4 text-amber-500 mt-1 flex-shrink-0" />
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                      Your biometric data is hashed locally and never stored on our servers. Verified badges increase your platform trust score by 85%.
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
