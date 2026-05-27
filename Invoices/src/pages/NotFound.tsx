"use client";
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search, ghost } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-[#020210] flex items-center justify-center px-6 relative overflow-hidden">
      {/* Efeito de Luz de Fundo (Blur) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative z-10 text-center max-w-2xl">
        {/* Elemento Visual Central */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="mb-8 relative"
        >
          <h1 className="text-[12rem] md:text-[18rem] font-medium leading-none tracking-tighter text-white/5 select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
             <motion.div 
               animate={{ y: [0, -20, 0] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               className="bg-indigo-500/10 p-6 rounded-full border border-indigo-500/20 backdrop-blur-sm"
             >
               <Search className="w-12 h-12 text-indigo-400" />
             </motion.div>
          </div>
        </motion.div>

        {/* Texto Informativo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-3xl md:text-4xl font-medium text-white mb-4 tracking-tight">
            Perdido no <span className="text-indigo-400 italic font-light">espaço digital?</span>
          </h2>
          <p className="text-gray-500 font-light mb-12 max-w-md mx-auto leading-relaxed">
            A página que procura foi movida, removida ou nunca existiu. Deixe-nos guiá-lo de volta ao caminho certo.
          </p>
        </motion.div>

        {/* Botões de Ação */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col md:flex-row items-center justify-center gap-4"
        >
          <Link
            to="/"
            className="group relative px-8 py-4 bg-white text-black rounded-2xl font-medium text-sm transition-all hover:bg-indigo-50 flex items-center gap-2 overflow-hidden"
          >
            <Home className="w-4 h-4" />
            Voltar à Home
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-medium text-sm transition-all hover:bg-white/10 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Página Anterior
          </button>
        </motion.div>

        {/* Rodapé da 404 */}
        <div className="mt-24 pt-8 border-t border-white/5">
          <p className="text-[10px] text-gray-600 uppercase tracking-[0.3em]">
            Meu Ponto de Venda • Maputo, MZ
          </p>
        </div>
      </div>

      {/* Grid de fundo sutil */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
      />
    </div>
  );
};

export default NotFound;