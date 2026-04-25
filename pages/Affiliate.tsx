import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { UserProfile, AffiliateLog } from '../types';
import Icon from '../components/Icon';
import { useNotify } from '../components/Notifications';
import { sendAffiliateRequestToTelegram } from '../services/telegram';
import { motion } from 'framer-motion';

const AffiliatePage: React.FC<{ userData: UserProfile | null }> = ({ userData }) => {
  const navigate = useNavigate();
  const notify = useNotify();
  const [logs, setLogs] = useState<AffiliateLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCopying, setIsCopying] = useState(false);
  
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [tempCode, setTempCode] = useState('');
  const [savingCode, setSavingCode] = useState(false);
  
  const [formData, setFormData] = useState({
     fullName: '',
     phone: '',
     socialUrl: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!userData) {
      if (!auth.currentUser) navigate('/auth-selector');
      return;
    }
    setTempCode(userData.affiliateCode || '');
    
    if (userData.isAffiliate) {
      const unsub = onSnapshot(query(collection(db, 'affiliates_log'), where('affiliateId', '==', userData.uid), orderBy('createdAt', 'desc')), (snapshot) => {
          const l: AffiliateLog[] = [];
          snapshot.forEach(doc => l.push({ id: doc.id, ...doc.data() } as AffiliateLog));
          setLogs(l);
          setLoading(false);
      });
      return () => unsub();
    } else {
      setLoading(false);
    }
  }, [userData, navigate]);

  if (loading || !userData) {
    return <div className="min-h-screen flex items-center justify-center"><Icon name="spinner-third" className="animate-spin text-4xl text-zinc-900" /></div>;
  }

  const handleApplyAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.fullName || !formData.phone) return notify("Please fill in required fields", "error");
    
    setSubmitting(true);
    try {
      const requestData = {
         userId: auth.currentUser!.uid,
         email: userData.email,
         displayName: userData.displayName,
         fullName: formData.fullName,
         phone: formData.phone,
         socialUrl: formData.socialUrl,
         status: 'pending',
         createdAt: Date.now()
      };
      await addDoc(collection(db, 'affiliate_requests'), requestData);
      
      await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
         affiliateStatus: 'pending'
      });
      
      await sendAffiliateRequestToTelegram(requestData);
      
      notify("Application submitted successfully!", "success");
    } catch(e) {
      notify("Error submitting application", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!userData.isAffiliate) {
    if (userData.affiliateStatus === 'pending') {
      return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-800 p-6 md:p-12 mb-20 flex items-center justify-center flex-col text-center">
            <div className="w-24 h-24 bg-amber-100 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner border border-amber-200 text-amber-500 text-4xl">
               <Icon name="clock" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white mb-4 uppercase tracking-tighter">Application Pending</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm md:text-base font-medium max-w-md mx-auto">Your affiliate application is currently under review by our team. We'll notify you once it's approved!</p>
            <button onClick={() => navigate('/profile')} className="mt-8 px-6 py-3 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors">
               Return to Profile
            </button>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#FDFDFD] dark:bg-zinc-900 p-6 md:p-12 pb-32">
        <div className="max-w-xl mx-auto mt-10 mb-10">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-[#06331e] text-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-900/20">
               <Icon name="rocket" className="text-3xl" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white mb-4 uppercase tracking-tighter">Join Affiliate Network</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm md:text-base font-medium leading-relaxed">Partner with us, share your custom code, and earn <strong className="text-[#06331e] dark:text-emerald-400">৳50</strong> directly to your wallet for each successful sale. Your audience gets 5% OFF!</p>
          </div>
          
          <form onSubmit={handleApplyAffiliate} className="bg-white dark:bg-zinc-800 p-8 md:p-10 rounded-[3rem] shadow-xl border border-zinc-100 dark:border-zinc-700/50 space-y-6">
             <div>
               <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2 block px-2">Full Legal Name *</label>
               <input 
                 type="text" 
                 required
                 placeholder="e.g. John Doe"
                 className="w-full bg-zinc-50 dark:bg-zinc-900 px-6 py-4 rounded-[1.5rem] font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-white"
                 value={formData.fullName}
                 onChange={e => setFormData(p => ({...p, fullName: e.target.value}))}
               />
             </div>
             <div>
               <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2 block px-2">Phone Number *</label>
               <input 
                 type="tel" 
                 required
                 placeholder="01XXXXXXXXX"
                 className="w-full bg-zinc-50 dark:bg-zinc-900 px-6 py-4 rounded-[1.5rem] font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-white"
                 value={formData.phone}
                 onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
               />
             </div>
             <div>
               <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2 block px-2">Social Media / Website (Optional)</label>
               <input 
                 type="url" 
                 placeholder="https://facebook.com/yourprofile"
                 className="w-full bg-zinc-50 dark:bg-zinc-900 px-6 py-4 rounded-[1.5rem] font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-white"
                 value={formData.socialUrl}
                 onChange={e => setFormData(p => ({...p, socialUrl: e.target.value}))}
               />
               <p className="text-[9px] text-zinc-400 font-bold px-2 mt-2">Help us verify your audience reach.</p>
             </div>
             
             <button disabled={submitting} type="submit" className="w-full mt-4 py-5 bg-[#06331e] text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-900/20 disabled:opacity-50 active:scale-95 transition-all">
                {submitting ? "Submitting..." : "Submit Application"}
             </button>
          </form>
        </div>
      </div>
    );
  }

  const affiliateCode = userData.affiliateCode || `AFF-${userData.uid.substring(0, 6).toUpperCase()}`;
  const shareLink = `${window.location.origin}/#/?ref=${affiliateCode}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setIsCopying(true);
      notify("Link copied!", "success");
      setTimeout(() => setIsCopying(false), 2000);
    } catch(err) {
      notify("Failed to copy link", "error");
    }
  };

  const handleSaveCode = async () => {
     const code = tempCode.trim().toUpperCase();
     if (!code || code.length < 3) return notify("Code must be at least 3 characters", "error");
     if (!/^[A-Z0-9_-]+$/.test(code)) return notify("Only letters, numbers, hyphens and underscores allowed", "error");
     if (code === userData.affiliateCode) {
        setIsEditingCode(false);
        return;
     }

     setSavingCode(true);
     try {
       // Check if coupon exists
       const couponQ = query(collection(db, 'coupons'), where('code', '==', code));
       const snap = await getDocs(couponQ);
       if (!snap.empty) {
          notify("This promo code is already taken!", "error");
          setSavingCode(false);
          return;
       }

       // Update user document
       await updateDoc(doc(db, 'users', userData.uid), { affiliateCode: code });
       
       // Add new coupon
       await addDoc(collection(db, 'coupons'), {
          code: code,
          discount: 5,
          type: 'percent',
          maxUses: 999999,
          usedCount: 0,
          isActive: true,
          isAffiliate: true,
          affiliateId: userData.uid,
          createdAt: Date.now()
       });

       notify("Custom promo code saved!", "success");
       setIsEditingCode(false);
     } catch(e) {
       notify("Failed to save code", "error");
     }
     setSavingCode(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 min-h-screen font-inter">
      <div className="flex items-center space-x-4 mb-8">
        <button onClick={() => navigate('/profile')} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-900 hover:text-white transition-colors">
          <Icon name="arrow-left" />
        </button>
        <h1 className="text-2xl font-black tracking-tight uppercase">Affiliate Portal</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
         <div className="bg-[#06331e] text-white p-8 rounded-3xl relative overflow-hidden shadow-xl shadow-emerald-900/20">
            <div className="absolute -right-10 -top-10 opacity-10"><Icon name="wallet" className="text-9xl" /></div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#4ade80] mb-2">Available Balance</p>
            <h2 className="text-5xl font-black mb-6 tracking-tighter">৳{userData.walletBalance || 0}</h2>
            <div className="flex gap-3">
               <button 
                 onClick={() => navigate('/withdraw')} 
                 className="bg-zinc-50 dark:bg-zinc-800 text-[#06331e] px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-zinc-100 dark:bg-zinc-800 transition-colors"
               >
                 Withdraw Funds
               </button>
            </div>
         </div>

         <div className="bg-zinc-50 dark:bg-zinc-800 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
            <div>
               <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-black uppercase tracking-tight text-zinc-800 dark:text-zinc-200">Your Custom Promo Code</h2>
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest">Active</span>
               </div>
               <p className="text-xs text-zinc-500 mb-6 font-medium">Give this promo code to your friends or audience. They get 5% OFF, and you get ৳50 per successful order!</p>
               
               <div className="flex flex-col gap-3">
                 {isEditingCode ? (
                    <div className="flex items-center bg-zinc-50 dark:bg-zinc-800 border-2 border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/20 p-2 rounded-xl transition-all">
                      <input type="text" value={tempCode} onChange={e => setTempCode(e.target.value.toUpperCase())} className="flex-1 bg-transparent px-3 text-lg font-black text-zinc-800 dark:text-zinc-200 outline-none uppercase tracking-widest text-center" placeholder="e.g. YOURNAME" />
                      <button onClick={handleSaveCode} disabled={savingCode} className="h-12 w-12 flex items-center justify-center bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shrink-0 shadow-md active:scale-95 disabled:opacity-50">
                        {savingCode ? <Icon name="spinner-third" className="animate-spin" /> : <Icon name="check" />}
                      </button>
                      <button onClick={() => { setIsEditingCode(false); setTempCode(userData.affiliateCode || ''); }} className="h-12 w-12 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg hover:bg-zinc-200 transition-colors shrink-0 ml-2">
                        <Icon name="times" />
                      </button>
                    </div>
                 ) : (
                    <div className="flex items-center bg-emerald-50 border-2 border-emerald-500/20 p-2 rounded-xl group relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                      <input type="text" readOnly value={affiliateCode} className="flex-1 bg-transparent px-3 text-lg font-black text-emerald-700 outline-none uppercase tracking-widest text-center relative z-10" />
                      <button onClick={() => setIsEditingCode(true)} className="h-12 w-12 flex items-center justify-center bg-transparent text-emerald-600 hover:bg-emerald-200 rounded-lg transition-colors shrink-0 mr-1 relative z-10">
                        <Icon name="edit" />
                      </button>
                      <button 
                        onClick={copyToClipboard}
                        className="h-12 px-6 flex items-center justify-center bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shrink-0 shadow-md active:scale-95 text-xs font-bold uppercase tracking-widest relative z-10"
                      >
                        {isCopying ? <Icon name="check" /> : 'Copy'}
                      </button>
                    </div>
                 )}
               </div>
               
               <div className="mt-4">
                 <p className="text-[10px] font-bold text-zinc-400 mb-2 uppercase">Shareable Link:</p>
                 <div className="flex items-center bg-zinc-50 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 p-2 rounded-xl group relative overflow-hidden">
                    <input type="text" readOnly value={shareLink} className="flex-1 bg-transparent px-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 outline-none truncate relative z-10" />
                    <button 
                      onClick={copyToClipboard}
                      className="h-8 px-4 flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors shrink-0 shadow-sm active:scale-95 text-[10px] font-bold uppercase tracking-widest relative z-10"
                    >
                      {isCopying ? <Icon name="check" className="text-[10px]" /> : 'Copy'}
                    </button>
                 </div>
               </div>
            </div>
         </div>
      </div>

      <div>
        <h3 className="text-sm font-black uppercase tracking-widest mb-4">Earning History</h3>
        {logs.length === 0 ? (
           <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-800 rounded-3xl border text-zinc-400 border-zinc-200 dark:border-zinc-700 text-sm font-bold uppercase tracking-widest">
              No earnings yet. Start sharing!
           </div>
        ) : (
           <div className="space-y-3">
              {logs.map(log => (
                 <div key={log.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl hover:border-black/20 transition-colors">
                    <div>
                       <div className="flex items-center space-x-3 mb-1">
                         <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Completed</span>
                         <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Order from: {log.customerName}</span>
                       </div>
                       <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest ml-1">{new Date(log.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="mt-3 md:mt-0 text-right">
                       <span className="text-lg font-black text-emerald-600 tracking-tight">+৳{log.commission}</span>
                    </div>
                 </div>
              ))}
           </div>
        )}
      </div>
    </div>
  );
};

export default AffiliatePage;
