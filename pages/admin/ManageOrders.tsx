
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Order, OrderStatus } from '../../types';
import { useNotify } from '../../components/Notifications';
import { motion } from 'framer-motion';
import Icon from '../../components/Icon';

const ManageOrders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const notify = useNotify();

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const order = orders.find(o => o.id === orderId);
      await updateDoc(doc(db, 'orders', orderId), { status });
      notify(`Order status: ${status}`, "success");

      // Affiliate Commission Logic
      if (status === OrderStatus.DELIVERED && order?.affiliateRef && !order.commissionPaid) {
        try {
           const { where, getDocs, limit, addDoc, increment } = await import('firebase/firestore');
           // Find user with this affiliateCode
           const q = query(collection(db, 'users'), where('affiliateCode', '==', order.affiliateRef), limit(1));
           const snap = await getDocs(q);
           if (!snap.empty) {
              const affiliateDoc = snap.docs[0];
              // Add balance
              await updateDoc(doc(db, 'users', affiliateDoc.id), {
                 walletBalance: increment(50)
              });
              // Log
              await addDoc(collection(db, 'affiliates_log'), {
                 affiliateId: affiliateDoc.id,
                 orderId: order.id,
                 customerName: order.customerName,
                 commission: 50,
                 createdAt: Date.now()
              });
              // Mark order as paid
              await updateDoc(doc(db, 'orders', orderId), { commissionPaid: true });
           }
        } catch(e) {
           console.error('Affiliate sync failed:', e);
        }
      }
    } catch (e) {
      notify("Update failed", "error");
    }
  };

  const updateTrackingId = async (orderId: string, trackingId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { trackingId: trackingId.trim() });
      notify("Tracking ID synced", "success");
    } catch (e) {
      notify("Update failed", "error");
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-10 pb-32 min-h-screen bg-zinc-50 dark:bg-zinc-800">
      <div className="flex items-center space-x-6 mb-12">
        <button onClick={() => navigate('/admin')} className="w-12 h-12 flex items-center justify-center bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[#06331e] rounded-full shadow-sm hover:bg-[#06331e] hover:text-white transition-all active:scale-95"><Icon name="chevron-left" className="text-xs" /></button>
        <div>
           <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#06331e] mb-1.5">Orders Overview</h1>
           <p className="text-zinc-400 text-[10px] md:text-xs font-bold tracking-widest uppercase">Manual Logistics Management</p>
        </div>
      </div>

      <div className="space-y-6">
        {orders.map(order => (
          <div key={order.id} className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-8 shadow-sm flex flex-col lg:flex-row gap-10 transition-all hover:border-zinc-200 dark:border-zinc-700 hover:shadow-md">
             <div className="lg:w-1/3">
                <div className="flex justify-between items-start mb-6">
                   <div>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Ref Node</p>
                      <p className="font-mono font-bold text-xs uppercase bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 px-2 py-1 rounded-md text-zinc-600 dark:text-zinc-400">#{order.id.slice(0,10)}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Status</p>
                      <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${order.status === OrderStatus.DELIVERED ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'}`}>{order.status}</span>
                   </div>
                </div>
                <div className="space-y-2 mb-8 p-5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800/50 rounded-xl">
                   <p className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{order.customerName}</p>
                   <p className="text-xs font-medium text-zinc-500">{order.contactNumber}</p>
                   <p className="text-[10px] text-zinc-400 font-medium leading-relaxed italic line-clamp-2 mt-2">{order.shippingAddress}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Phase Transition</label>
                  <select 
                    className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer focus:border-black transition-all"
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)}
                  >
                    {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
             </div>

             <div className="flex-1 space-y-8">
                <div className="flex flex-col md:flex-row gap-6">
                   <div className="flex-1 space-y-4">
                      <div>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2 px-1">Manual Tracking ID</p>
                        <input 
                          type="text" 
                          placeholder="Assign Custom ID..."
                          className="w-full bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl text-[11px] font-bold outline-none border border-zinc-200 dark:border-zinc-700 focus:border-black transition-all uppercase"
                          defaultValue={order.trackingId}
                          onBlur={(e) => updateTrackingId(order.id, e.target.value)}
                        />
                      </div>
                      
                      {order.status === OrderStatus.ON_THE_WAY && (
                        <div className="grid grid-cols-2 gap-4 animate-fade-in">
                          <div>
                            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-2 px-1">Rider Number</p>
                            <input 
                              type="text" 
                              placeholder="Phone..."
                              className="w-full bg-emerald-50/50 p-4 rounded-xl text-[11px] font-bold outline-none border border-emerald-100 focus:border-emerald-500 transition-all"
                              defaultValue={order.riderNumber || ''}
                              onBlur={(e) => updateDoc(doc(db, 'orders', order.id), { riderNumber: e.target.value.trim() })}
                            />
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-2 px-1">Courier Name</p>
                            <input 
                              type="text" 
                              placeholder="e.g. Pathao"
                              className="w-full bg-emerald-50/50 p-4 rounded-xl text-[11px] font-bold outline-none border border-emerald-100 focus:border-emerald-500 transition-all uppercase"
                              defaultValue={order.courierName || ''}
                              onBlur={(e) => updateDoc(doc(db, 'orders', order.id), { courierName: e.target.value.trim() })}
                            />
                          </div>
                        </div>
                      )}
                   </div>
                   <div className="text-right flex flex-col justify-end">
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Grand Total</p>
                      <p className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100">৳{order.total}</p>
                   </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-8 border-t border-zinc-100 dark:border-zinc-800">
                   {order.items.map((item, i) => (
                      <div key={i} className="flex flex-col items-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:border-zinc-700 shadow-sm group">
                         <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800/50 rounded-lg p-2 mb-3 group-hover:scale-105 transition-transform">
                            <img src={item.image} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" alt="" />
                         </div>
                         <p className="text-[9px] font-bold text-center truncate w-full uppercase text-zinc-700 dark:text-zinc-300">{item.name}</p>
                         <p className="text-[8px] font-medium text-zinc-400 mt-1">QTY: {item.quantity}</p>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        ))}
        {orders.length === 0 && <div className="py-32 text-center text-zinc-400 font-bold uppercase tracking-[0.2em] text-[11px]">No log found in database</div>}
      </div>
    </div>
  );
};

export default ManageOrders;
