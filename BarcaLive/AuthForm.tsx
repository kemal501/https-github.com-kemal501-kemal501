import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { googleSignIn } from '../lib/auth';

export default function AuthForm() {
  const [isLogin, setIsLogin] = React.useState(true);
  const [isForgotPassword, setIsForgotPassword] = React.useState(false);
  const [resetSent, setResetSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [profilePictureUrl, setProfilePictureUrl] = React.useState('');
  const [isHost, setIsHost] = React.useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isForgotPassword) {
        if (!email) {
          setError('Email address is required to reset password.');
          setLoading(false);
          return;
        }
        await sendPasswordResetEmail(auth, email);
        setResetSent(true);
      } else if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: displayName || email.split('@')[0],
          photoURL: (isHost && profilePictureUrl) ? profilePictureUrl : undefined
        });

        if (isHost) {
          try {
            const newUserDoc = {
              uid: userCredential.user.uid,
              displayName: displayName || email.split('@')[0],
              role: 'user', // Default role
              coins: 1000, // Initial coins
              isVerified: false,
              createdAt: serverTimestamp(),
              bio: bio,
              isHost: true,
              photoURL: profilePictureUrl
            };
            await setDoc(doc(db, 'users', userCredential.user.uid), newUserDoc);
          } catch (err: any) {
            handleFirestoreError(err, OperationType.CREATE, `users/${userCredential.user.uid}`);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      let message = 'An error occurred during authentication.';
      const errStr = String(err?.code || err?.message || err).toLowerCase();
      if (
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/invalid-credential' ||
        errStr.includes('invalid-credential') ||
        errStr.includes('user-not-found') ||
        errStr.includes('wrong-password')
      ) {
        message = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use' || errStr.includes('email-already-in-use')) {
        message = 'This email is already in use.';
      } else if (err.code === 'auth/weak-password' || errStr.includes('weak-password')) {
        message = 'Password should be at least 6 characters.';
      } else {
        message = err?.message || String(err);
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await googleSignIn();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black font-sans text-white p-6 flex flex-col items-center justify-center space-y-8 relative overflow-hidden" id="auth-form">
      {/* Background Accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-400/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/10 blur-[120px] rounded-full" />
      
      <div className="text-center space-y-4 z-10">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-600 rounded-3xl mx-auto flex items-center justify-center font-black text-4xl shadow-2xl shadow-orange-600/20"
        >
          B
        </motion.div>
        <div className="space-y-1">
          <h1 className="text-4xl font-black italic tracking-tighter uppercase">Barca-live</h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em]">The Protocol of Voice</p>
        </div>
      </div>

      <motion.div 
        layout
        className="w-full max-w-sm bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 space-y-6 z-10"
      >
        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">
            {isForgotPassword ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-zinc-500 text-xs font-medium">
            {isForgotPassword ? 'Enter your email address to transfer a security reset link.' : isLogin ? 'Enter your credentials to access the protocol.' : 'Join the elite voice network today.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <AnimatePresence mode="popLayout">
            {!isLogin && !isForgotPassword && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text"
                    placeholder="Full Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required={!isLogin && !isForgotPassword}
                    className="w-full bg-black/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-amber-400 transition-all placeholder:text-zinc-700"
                  />
                </div>

                <label className="flex items-center gap-2 text-zinc-400 text-xs font-black uppercase tracking-widest cursor-pointer hover:text-white transition-colors">
                  <input 
                    type="checkbox" 
                    checked={isHost} 
                    onChange={(e) => setIsHost(e.target.checked)}
                    className="accent-amber-400"
                  />
                  Register as Host
                </label>

                {isHost && (
                  <>
                    <textarea 
                      placeholder="Bio (Short description for your profile)"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full bg-black/50 border border-white/5 rounded-2xl py-4 px-4 text-sm font-bold focus:outline-none focus:border-amber-400 transition-all placeholder:text-zinc-700 min-h-[100px]"
                    />
                    <input 
                      type="url"
                      placeholder="Profile Picture URL"
                      value={profilePictureUrl}
                      onChange={(e) => setProfilePictureUrl(e.target.value)}
                      className="w-full bg-black/50 border border-white/5 rounded-2xl py-4 px-4 text-sm font-bold focus:outline-none focus:border-amber-400 transition-all placeholder:text-zinc-700"
                    />
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-amber-400 transition-all placeholder:text-zinc-700"
              />
            </div>
          </div>

          {!isForgotPassword && (
            <div className="space-y-1">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!isForgotPassword}
                  className="w-full bg-black/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-amber-400 transition-all placeholder:text-zinc-700"
                />
              </div>
            </div>
          )}

          {isLogin && !isForgotPassword && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(true);
                  setError(null);
                  setResetSent(false);
                }}
                className="text-amber-400 hover:text-amber-300 text-[10px] font-black uppercase tracking-wider bg-transparent outline-none border-none cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
          )}

          {isForgotPassword && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError(null);
                  setResetSent(false);
                }}
                className="text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-wider bg-transparent outline-none border-none cursor-pointer"
              >
                ← Return to Login
              </button>
            </div>
          )}

          <AnimatePresence>
            {resetSent && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-green-400 text-[10px] font-black uppercase tracking-wider bg-green-500/10 p-3 rounded-xl border border-green-500/20"
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Instructions sent! Please check your email inbox.
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-red-400 text-[10px] font-black uppercase tracking-wider bg-red-400/10 p-3 rounded-xl border border-red-400/20"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-amber-400 text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-amber-300 active:scale-[0.98] transition-all shadow-xl shadow-amber-400/10 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <>
                {isForgotPassword ? 'Send Reset Link' : isLogin ? 'Authorize' : 'Register'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/5" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-zinc-700">
            <span className="bg-zinc-900 px-4">Secondary Access</span>
          </div>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          type="button"
          className="w-full bg-[#f2f2f2] text-[#1f1f1f] hover:bg-[#eee] py-3 px-4 rounded-full font-medium text-sm flex items-center justify-center gap-3 transition-colors duration-200 border border-[#dadce0]"
        >
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            <path fill="none" d="M0 0h48v48H0z"></path>
          </svg>
          Sign in with Google
        </button>

        <p className="text-center text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
          {isLogin ? "Don't have access?" : "Already a member?"}{' '}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-amber-400 hover:underline"
          >
            {isLogin ? 'Request Registration' : 'Return to Login'}
          </button>
        </p>
      </motion.div>

      <p className="max-w-xs text-center text-zinc-700 text-[8px] font-black uppercase tracking-[0.3em] leading-loose z-10">
        By accessing Barca-live you agree to our terms of service and encrypted data protocol.
      </p>
    </div>
  );
}
