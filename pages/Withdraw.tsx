import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, updateDoc, collection, addDoc, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '../types';
import Icon from '../components/Icon';
import { useNotify } from '../components/Notifications';

const WithdrawPage: React.FC<{ userData: UserProfile | null }> = ({ userData }) => {
  const navigate = useNavigate();
  const notify = useNotify();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bkashNumber, setBkashNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    if (!userData) {
      if (!auth.currentUser) navigate('/auth-selector');
      return;
    }

    const unsub = onSnapshot(query(collection(db, 'withdrawals'), where('userId', '==', userData.uid), orderBy('createdAt', 'desc')), (snapshot) => {
        const list: any[] = [];
        snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setWithdrawals(list);
    });

    return () => unsub();
  }, [userData, navigate]);

  const handleWithdraw = async () => {
    if (!userData) return;
    const amount = Number(withdrawAmount);
    if (!amount || amount < 500) return notify("Minimum withdraw is ৳500", "error");
    if (amount > (userData.walletBalance || 0)) return notify("Insufficient balance", "error");
    if (!bkashNumber || bkashNumber.length < 11) return notify("Enter valid bKash number", "error");
    if (!accountName) return notify("Enter account name", "error");

    setSubmittingWithdraw(true);
    try {
       await addDoc(collection(db, 'withdrawals'), {
         userId: userData.uid,
         amount,
         bkashNumber,
         accountName,
         status: 'Pending',
         createdAt: Date.now()
       });
       await updateDoc(doc(db, 'users', userData.uid), {
          walletBalance: (userData.walletBalance || 0) - amount
       });
       notify("Withdraw request submitted successfully", "success");
       setWithdrawAmount('');
       setBkashNumber('');
       setAccountName('');
    } catch(e) {
       notify("Failed to submit request", "error");
    }
    setSubmittingWithdraw(false);
  };

  if (!userData) return <div className="min-h-screen flex items-center justify-center"><Icon name="spinner-third" className="animate-spin text-3xl" /></div>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 min-h-screen font-inter bg-zinc-50 dark:bg-zinc-800">
      <div className="flex items-center space-x-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-900 hover:text-white transition-colors">
          <Icon name="arrow-left" />
        </button>
        <h1 className="text-2xl font-black tracking-tight uppercase">Withdraw Funds</h1>
      </div>

      <div className="bg-[#06331e] text-white p-8 rounded-3xl relative overflow-hidden shadow-xl mb-8">
         <div className="absolute -right-10 -top-10 opacity-10"><Icon name="wallet" className="text-9xl" /></div>
         <p className="text-[10px] font-bold uppercase tracking-widest text-[#4ade80] mb-2">Available Balance</p>
         <h2 className="text-5xl font-black tracking-tighter">৳{userData.walletBalance || 0}</h2>
      </div>

      <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-8 rounded-3xl shadow-sm mb-10">
         <h3 className="text-sm font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-200 mb-6">Request Withdrawal</h3>
         <div className="space-y-4 mb-6">
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Amount (Min ৳500)</label>
              <input type="number" min="500" value={withdrawAmount} onChange={e=>setWithdrawAmount(e.target.value)} placeholder="0" className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-4 py-4 rounded-xl outline-none font-bold" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">bKash Number</label>
              <input type="text" value={bkashNumber} onChange={e=>setBkashNumber(e.target.value)} placeholder="01XXX..." className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-4 py-4 rounded-xl outline-none font-bold" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Account Name</label>
              <input type="text" value={accountName} onChange={e=>setAccountName(e.target.value)} placeholder="John Doe" className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-4 py-4 rounded-xl outline-none font-bold" />
            </div>
         </div>
         <button onClick={handleWithdraw} disabled={submittingWithdraw} className="w-full bg-zinc-900 dark:bg-zinc-50 dark:text-black text-white py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors shadow-lg active:scale-95">
            {submittingWithdraw ? <Icon name="spinner-third" className="animate-spin" /> : 'Submit Request'}
         </button>
      </div>

      <div>
        <h3 className="text-sm font-black uppercase tracking-widest mb-4">Withdrawal History</h3>
        {withdrawals.length === 0 ? (
           <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-800 rounded-3xl border text-zinc-400 border-zinc-200 dark:border-zinc-700 text-sm font-bold uppercase tracking-widest">
              No withdrawals yet.
           </div>
        ) : (
           <div className="space-y-4">
              {withdrawals.map(w => (
                 <div key={w.id} className="flex flex-col md:flex-row justify-between p-5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl">
                    <div>
                       <div className="flex items-center space-x-3 mb-1">
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${w.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : w.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{w.status}</span>
                         <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{w.bkashNumber}</span>
                       </div>
                       <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest ml-1">{new Date(w.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="mt-3 md:mt-0 text-right">
                       <span className="text-lg font-black text-zinc-800 dark:text-zinc-200 tracking-tight">৳{w.amount}</span>
                    </div>
                 </div>
              ))}
           </div>
        )}
      </div>
    </div>
  );
};

export default WithdrawPage;
