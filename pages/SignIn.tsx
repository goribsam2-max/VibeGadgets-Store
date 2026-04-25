
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useNotify } from '../components/Notifications';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../components/Icon';
import { getFriendlyErrorMessage } from '../lib/firebaseErrorMapper';

const SignIn: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();
  const notify = useNotify();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      await setDoc(doc(db, 'users', user.uid), {
        lastActive: Date.now()
      }, { merge: true });

      notify("Welcome back!", "success");
      navigate('/');
    } catch (err: any) {
      console.error(err);
      notify(getFriendlyErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return notify("Please enter your email", "error");
    setResetLoading(true);
    try {
      const actionCodeSettings = {
        url: window.location.origin + '/signin', // will redirect here after reset if using default firebase UI
        handleCodeInApp: true
      };
      await sendPasswordResetEmail(auth, resetEmail, actionCodeSettings);
      notify("Password reset link has been sent to your email! Please check your inbox (and spam).", "success");
      setShowForgot(false);
      setResetEmail('');
    } catch (err: any) {
      notify(getFriendlyErrorMessage(err), "error");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-800/30 flex flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)} 
          className="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center mb-8 shadow-sm hover:bg-zinc-50 dark:bg-zinc-800 transition-all text-zinc-600 dark:text-zinc-400"
        >
          <Icon name="arrow-left" className="text-xs" />
        </motion.button>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-500 font-medium">Welcome back! Please enter your details.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-zinc-50 dark:bg-zinc-800 py-8 px-6 shadow-sm border border-zinc-100 dark:border-zinc-800 rounded-3xl sm:px-10">
          <form onSubmit={handleSignIn} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 tracking-wide mb-2">Email address</label>
              <input 
                type="email" 
                placeholder="name@example.com" 
                className="w-full bg-zinc-50 dark:bg-zinc-800 px-4 py-3.5 rounded-xl outline-none border border-zinc-200 dark:border-zinc-700 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all font-medium text-sm shadow-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 tracking-wide">Password</label>
                <button type="button" onClick={() => setShowForgot(true)} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors">Forgot Password?</button>
              </div>
              <input 
                type="password" 
                placeholder="••••••••" 
                className="w-full bg-zinc-50 dark:bg-zinc-800 px-4 py-3.5 rounded-xl outline-none border border-zinc-200 dark:border-zinc-700 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all font-medium text-sm shadow-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button disabled={loading} className="w-full py-4 mt-2 bg-[#06331e] text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-md hover:bg-[#0a4a2b] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center">
              {loading ? <Icon name="spinner" className="mr-2 animate-spin" /> : null}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          
          <p className="mt-8 text-center text-xs font-medium text-zinc-500">
            Don't have an account? <Link to="/signup" className="text-emerald-600 font-bold underline decoration-emerald-200 underline-offset-4 ml-1 hover:decoration-emerald-500 transition-colors">Create Account</Link>
          </p>
        </div>
      </div>

      <AnimatePresence>
        {showForgot && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-50 dark:bg-zinc-800 rounded-3xl overflow-hidden w-full max-w-sm shadow-2xl border border-zinc-100 dark:border-zinc-800"
            >
               <div className="p-6">
                 <div className="flex justify-between items-center mb-6">
                   <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">Reset Password</h2>
                   <button onClick={() => setShowForgot(false)} className="w-8 h-8 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full hover:bg-zinc-900 hover:text-white transition-colors">
                     <Icon name="times" className="text-sm" />
                   </button>
                 </div>
                 <p className="text-sm text-zinc-500 mb-6 leading-relaxed">Enter your email address and we'll send you a secure link to reset your password directly from Google Firebase.</p>
                 <form onSubmit={handleResetPassword} className="space-y-4">
                   <div>
                     <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">Email Address</label>
                     <input 
                       type="email" 
                       required
                       value={resetEmail}
                       onChange={e => setResetEmail(e.target.value)}
                       placeholder="Enter your account email" 
                       className="w-full bg-zinc-50 dark:bg-zinc-800 px-4 py-4 rounded-xl outline-none border border-zinc-200 dark:border-zinc-700 focus:border-black transition-all font-bold text-sm"
                     />
                   </div>
                   <button disabled={resetLoading} type="submit" className="w-full btn-primary py-4 text-sm mt-4 disabled:opacity-50 flex items-center justify-center">
                     {resetLoading ? <Icon name="spinner" className="mr-2 animate-spin" /> : null}
                     {resetLoading ? "Sending Link..." : "Send Reset Link"}
                   </button>
                 </form>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SignIn;
