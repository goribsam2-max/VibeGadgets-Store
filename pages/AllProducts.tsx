
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../components/Icon';
import SEO from '../components/SEO';

const AllProducts: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState(location.state?.category || 'All');
  const [quickViewImg, setQuickViewImg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });
    return unsubscribe;
  }, []);

  const tabs = ['All', 'Mobile', 'Accessories', 'Gadgets', 'Chargers'];

  return (
    <div className="p-6 md:p-12 pb-48 bg-zinc-50 dark:bg-zinc-800 max-w-[1440px] mx-auto min-h-screen font-inter animate-fade-in relative overflow-hidden">
        <SEO 
          title="All Products" 
          description="Browse our vast collection of premium gadgets, mobile phones, chargers, and accessories at VibeGadget." 
        />
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none z-0"></div>
       <div className="flex items-center space-x-6 mb-14 relative z-10 animate-stagger-1">
          <button onClick={() => navigate(-1)} className="w-12 h-12 flex items-center justify-center bg-zinc-50 dark:bg-zinc-800 rounded-full border border-zinc-100 dark:border-zinc-800 shadow-sm hover:bg-[#06331e] hover:text-white transition-all active:scale-95 group hover-tilt">
             <Icon name="chevron-left" className="text-sm group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-xl lg:text-base xl:text-sm font-black tracking-tight uppercase leading-none text-shine">Catalog.</h1>
            <p className="text-[9px] font-bold text-emerald-600/70 uppercase tracking-[0.4em] mt-1 pl-1">Full Stock Access</p>
          </div>
       </div>

       <div className="flex space-x-4 mb-16 overflow-x-auto no-scrollbar pb-3 px-1 relative z-10 animate-stagger-2">
          {tabs.map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-3.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest border transition-all shrink-0 ${activeTab === tab ? 'bg-[#06331e] text-white border-[#06331e] shadow-lg scale-105' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400 border-zinc-100 dark:border-zinc-800 hover:border-[#06331e] hover:text-[#06331e]'}`}
            >
              {tab}
            </button>
          ))}
       </div>

       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6 lg:gap-8 relative z-10 animate-stagger-3">
          {products.filter(p => activeTab === 'All' || p.category === activeTab).map(product => (
            <motion.div 
              layout
              key={product.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <div className="group cursor-pointer relative hover-tilt">
                <div onClick={() => navigate(`/product/${product.id}`)} className="bg-zinc-50 dark:bg-zinc-800/30 rounded-[2rem] mb-4 overflow-hidden relative border border-zinc-100 dark:border-zinc-800 shadow-sm transition-all duration-300 aspect-[4/5] flex items-center justify-center">
                  <img src={product.image} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500 mix-blend-multiply dark:mix-blend-normal" alt={product.name} />
                  <div className="absolute top-4 right-4">
                    <div className="bg-[#06331e] text-white px-3 py-1.5 rounded-full text-[9px] font-bold shadow-md tracking-wider">
                      ৳{product.price}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQuickViewImg(product.image); }}
                  className="absolute top-4 left-4 w-10 h-10 bg-zinc-50 dark:bg-zinc-900/90 backdrop-blur rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-[#06331e] hover:text-white active:scale-90 shadow-lg border border-zinc-100 dark:border-zinc-800/50"
                >
                   <Icon name="expand-alt" className="text-xs" />
                </button>

                <div className="px-2 pb-2" onClick={() => navigate(`/product/${product.id}`)}>
                  <h4 className="font-bold text-sm md:text-base truncate mb-1 tracking-tight group-hover:text-emerald-700 transition-colors">{product.name}</h4>
                  <div className="flex items-center text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                    <Icon name="star" className="text-emerald-500 mr-1.5 text-[10px]" />{product.rating || 5.0} • {product.category}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
       </div>

       {products.filter(p => activeTab === 'All' || p.category === activeTab).length === 0 && (
         <div className="py-40 text-center opacity-30 flex flex-col items-center">
            <Icon name="box-open" className="text-6xl mb-8" />
            <p className="text-[12px] font-black uppercase tracking-[0.5em]">No Data in this sector</p>
         </div>
       )}

       <AnimatePresence>
        {quickViewImg && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#06331e]/60 backdrop-blur-[50px] z-[1000] flex items-center justify-center p-6"
            onClick={() => setQuickViewImg(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 30 }}
              className="relative w-full max-w-2xl aspect-square bg-zinc-50 dark:bg-zinc-800 rounded-[4rem] shadow-2xl p-12 md:p-20 flex items-center justify-center border border-white/20"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setQuickViewImg(null)} className="absolute top-8 right-8 w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center hover:bg-[#06331e] hover:text-white transition-all shadow-sm">
                 <Icon name="times" />
              </button>
              <img src={quickViewImg} className="max-w-full max-h-full object-contain" alt="Quick preview" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AllProducts;
