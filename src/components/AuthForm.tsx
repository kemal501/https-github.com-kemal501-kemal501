import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, Github } from 'lucide-react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { cn } from '../lib/utils';

export default function AuthForm() {
  const [isLogin, setIsLogin] = React.useState(true);
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
      if (isLogin) {
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
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        message = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'This email is already in use.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black font-sans text-white p-6 flex flex-col items-center justify-center space-y-8 relative overflow-hidden">
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
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-zinc-500 text-xs font-medium">
            {isLogin ? 'Enter your credentials to access the protocol.' : 'Join the elite voice network today.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <AnimatePresence mode="popLayout">
            {!isLogin && (
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
                    required={!isLogin}
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

          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-black/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-amber-400 transition-all placeholder:text-zinc-700"
              />
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-red-400 text-[10px] font-black uppercase tracking-wider bg-red-400/10 p-3 rounded-xl border border-red-400/20"
              >
                <AlertCircle className="w-3 h-3" />
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
                {isLogin ? 'Authorize' : 'Register'}
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
          className="w-full bg-white/5 text-white border border-white/5 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-4 hover:bg-white/10 active:scale-[0.98] transition-all"
        >
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
          Continue with Google
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
