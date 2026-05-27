// src/components/OnboardingModal.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PlayCircle } from 'lucide-react';
import { useOnboarding } from '../constants/onboarding';

interface Props {
  itemName: string;
  isOpen: boolean;
  onClose: () => void;
}

const OnboardingModal: React.FC<Props> = ({ itemName, isOpen, onClose }) => {
  const { onboardingData } = useOnboarding();
  const content = onboardingData[itemName];
  if (!content) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden"
            onClick={(e) => e.stopImmediatePropagation()}
          >
            <div className="p-8">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">{content.name}</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                  <X size={28} />
                </button>
              </div>

              {/* Vídeo */}
              {content.videoUrl && (
                <div className="aspect-video bg-black rounded-2xl overflow-hidden mb-8 shadow-inner">
                  <iframe
                    src={content.videoUrl}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              )}

              {/* Descrição longa */}
              <div className="prose text-slate-600 max-h-[320px] overflow-y-auto pr-2">
                <p className="text-base leading-relaxed">{content.longDescription}</p>
              </div>

              <div className="mt-10 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-8 py-3.5 bg-slate-900 text-white font-medium rounded-2xl hover:bg-slate-800 transition-colors"
                >
                  Entendi, vamos lá!
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingModal;