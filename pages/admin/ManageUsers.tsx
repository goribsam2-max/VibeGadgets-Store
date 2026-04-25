
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserProfile } from '../../types';
import { useNotify } from '../../components/Notifications';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../components/Icon';

const ManageUsers: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; user: UserProfile | null }>({ isOpen: false, user: null });
  const [customWalletAmount, setCustomWalletAmount] = useState<string>('');
  const notify = useNotify();

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(d => ({ ...d.data() } as UserProfile)));
    });
    return unsubscribe;
  }, []);

  const toggleBan = async (uid: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'users', uid), { isBanned: !currentStatus });
    notify(currentStatus ? "User unblocked" : "User blocked", "info");
  };

  const updateWalletBalance = async (uid: string, newBalance: number) => {
    try {
       await updateDoc(doc(db, 'users', uid), { walletBalance: Math.max(0, newBalance) });
       if (detailModal.user && detailModal.user.uid === uid) {
          setDetailModal({ ...detailModal, user: { ...detailModal.user, walletBalance: Math.max(0, newBalance) } });
       }
       notify("Wallet balance updated", "success");
    } catch(e) {
       notify("Failed to update wallet", "error");
    }
  };

  const removeAffiliate = async (uid: string) => {
     if(window.confirm("Are you sure you want to remove this user from the affiliate program?")) {
        try {
           await updateDoc(doc(db, 'users', uid), {
              isAffiliate: false,
              affiliateStatus: 'rejected'
           });
           if (detailModal.user && detailModal.user.uid === uid) {
              setDetailModal({ ...detailModal, user: { ...detailModal.user, isAffiliate: false, affiliateStatus: 'rejected' } });
           }
           notify("User removed from affiliate program", "success");
        } catch(e) {
           notify("Error removing affiliate", "error");
        }
     }
  };

  const addAffiliate = async (uid: string) => {
     if(window.confirm("Are you sure you want to add this user to the affiliate program?")) {
        try {
           await updateDoc(doc(db, 'users', uid), {
              isAffiliate: true,
              affiliateStatus: 'approved'
           });
           if (detailModal.user && detailModal.user.uid === uid) {
              setDetailModal({ ...detailModal, user: { ...detailModal.user, isAffiliate: true, affiliateStatus: 'approved' } });
           }
           notify("User added to affiliate program", "success");
        } catch(e) {
           notify("Error adding affiliate", "error");
        }
     }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.ipAddress?.includes(search)
  );

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-10 pb-32 min-h-screen bg-[#FDFDFD]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
        <div className="flex items-center space-x-6">
           <button onClick={() => navigate('/admin')} className="p-4 bg-zinc-900 text-white rounded-2xl shadow-xl active:scale-90 transition-all">
             <Icon name="chevron-left" className="text-xs" />
           </button>
           <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100">User List</h1>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Manage Customer Access</p>
           </div>
        </div>
        <div className="relative w-full sm:max-w-md group">
           <input 
             type="text" 
             placeholder="Search by name, email or IP..." 
             className="w-full p-5 bg-zinc-50 dark:bg-zinc-800 rounded-2xl outline-none border border-zinc-100 dark:border-zinc-800 focus:border-zinc-900 transition-all font-bold text-sm pl-14 shadow-sm"
             value={search}
             onChange={e => setSearch(e.target.value)}
           />
           <Icon name="search" className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-300" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map(user => (
          <motion.div 
            layout
            key={user.uid} 
            className="bg-white dark:bg-[#121212] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-300"
          >
             <div className="flex justify-between items-start mb-6">
                <div className="flex items-center space-x-4">
                   <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=000&color=fff`} className="w-12 h-12 rounded-full border-2 border-zinc-100 dark:border-zinc-800" alt="" />
                   <div>
                      <p className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 truncate max-w-[140px]">{user.displayName}</p>
                      <p className="text-[10px] text-zinc-500 truncate max-w-[140px]">{user.email}</p>
                   </div>
                </div>
                <div className="flex items-center space-x-2">
                   <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${user.role === 'admin' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'}`}>{user.role}</span>
                   <div className={`w-2 h-2 rounded-full ${user.isBanned ? 'bg-white border-2 border-red-500' : 'bg-green-500'}`}></div>
                </div>
             </div>

             <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center text-[10px] font-medium text-zinc-500">
                   <span>IP Address</span>
                   <code className="text-zinc-900 dark:text-zinc-300">{user.ipAddress || 'UNKNOWN'}</code>
                </div>
                <div className="flex justify-between items-center text-[10px] font-medium text-zinc-500">
                   <span>Last Online</span>
                   <span className="text-zinc-900 dark:text-zinc-300">{user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'N/A'}</span>
                </div>
             </div>

             <div className="flex items-center space-x-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                <button 
                  onClick={() => setDetailModal({ isOpen: true, user })}
                  className="flex-1 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors"
                >
                  Profile
                </button>
                <button 
                  onClick={() => toggleBan(user.uid, user.isBanned)}
                  className={`p-2 rounded-lg transition-colors border ${user.isBanned ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100'}`}
                  title={user.isBanned ? 'Unban User' : 'Ban User'}
                >
                  <Icon name={user.isBanned ? 'unlock' : 'user-slash'} className="text-xs" />
                </button>
             </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {detailModal.isOpen && detailModal.user && (
          <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xl z-[1000] flex items-center justify-center p-6 md:p-12" onClick={() => setDetailModal({ isOpen: false, user: null })}>
            <motion.div 
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               className="bg-white dark:bg-[#121212] w-full max-w-4xl rounded-2xl overflow-hidden shadow-xl flex flex-col md:flex-row h-full max-h-[90vh]"
               onClick={e => e.stopPropagation()}
            >
               <div className="w-full md:w-1/3 bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-10 flex flex-col items-center justify-between text-center relative">
                  <div className="w-full">
                        <img src={detailModal.user.photoURL || `https://ui-avatars.com/api/?name=${detailModal.user.displayName}&background=fff&color=000`} className="w-24 h-24 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-sm mx-auto mb-6" alt="" />
                    <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-1">{detailModal.user.displayName}</h3>
                    <p className="text-xs text-zinc-500">{detailModal.user.email}</p>
                    {detailModal.user.isAffiliate && (
                       <div className="mt-8 bg-emerald-50 dark:bg-emerald-900/10 px-4 py-4 rounded-xl border border-emerald-200 dark:border-emerald-800/30">
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest mb-2">Affiliate Wallet</p>
                          <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">৳{detailModal.user.walletBalance || 0}</p>
                       </div>
                    )}
                  </div>
                  <button onClick={() => setDetailModal({ isOpen: false, user: null })} className="w-full py-3 mt-8 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">Close</button>
               </div>
               <div className="flex-1 p-8 md:p-12 overflow-y-auto">
                  <h2 className="text-xl font-bold tracking-tight mb-6 text-zinc-900 dark:text-zinc-100">User Information</h2>
                  
                  <div className="mb-8 p-6 bg-zinc-50 dark:bg-[#1A1A1A] border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-6">
                     <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-3">Wallet & Affiliate Settings</h4>
                     
                     <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Update Wallet Balance</label>
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                             <input 
                               type="number" 
                               placeholder="Amount..." 
                               value={customWalletAmount}
                               onChange={e => setCustomWalletAmount(e.target.value)}
                               className="flex-1 bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-700 px-4 py-3 rounded-lg text-sm font-medium outline-none"
                             />
                             <button 
                               onClick={() => {
                                 if(customWalletAmount) updateWalletBalance(detailModal.user!.uid, (detailModal.user!.walletBalance || 0) + Number(customWalletAmount));
                                 setCustomWalletAmount('');
                               }}
                               className="px-5 py-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg font-bold text-xs hover:bg-emerald-100 transition-colors"
                             >Add</button>
                             <button 
                               onClick={() => {
                                 if(customWalletAmount) updateWalletBalance(detailModal.user!.uid, (detailModal.user!.walletBalance || 0) - Number(customWalletAmount));
                                 setCustomWalletAmount('');
                               }}
                               className="px-5 py-3 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg font-bold text-xs hover:bg-red-100 transition-colors"
                             >Deduct</button>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => updateWalletBalance(detailModal.user!.uid, 0)}
                              className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-colors"
                            >Reset to 0</button>
                            <button 
                              onClick={() => {
                                if(customWalletAmount) updateWalletBalance(detailModal.user!.uid, Number(customWalletAmount));
                                setCustomWalletAmount('');
                              }}
                              className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-colors"
                            >Exact Set</button>
                          </div>
                        </div>
                     </div>

                     {detailModal.user.isAffiliate ? (
                       <button 
                         onClick={() => removeAffiliate(detailModal.user!.uid)}
                         className="w-full py-3 mt-2 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-red-100 transition-colors"
                       >
                          Remove from Affiliate Program
                       </button>
                     ) : (
                       <button 
                         onClick={() => addAffiliate(detailModal.user!.uid)}
                         className="w-full py-3 mt-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-colors"
                       >
                          Add to Affiliate Program
                       </button>
                     )}
                  </div>

                  <section className="space-y-4">
                    <DetailBit label="IP Address" value={detailModal.user.ipAddress} />
                    <DetailBit label="ISP" value={detailModal.user.isp} />
                    <DetailBit label="Time Zone" value={detailModal.user.timeZone} />
                    <DetailBit label="Operating System" value={detailModal.user.osName} />
                    <DetailBit label="Browser" value={detailModal.user.browserName} />
                    <DetailBit label="Last Location" value={detailModal.user.locationName} />
                    <DetailBit label="Joined Date" value={new Date(detailModal.user.createdAt).toLocaleString()} />
                  </section>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DetailBit = ({ label, value }: { label: string; value?: any }) => (
  <div className="flex justify-between items-center py-4 border-b border-zinc-50">
    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</span>
    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{value || 'N/A'}</span>
  </div>
);

export default ManageUsers;
