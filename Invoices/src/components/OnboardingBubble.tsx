// src/components/OnboardingTooltip.tsx
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X } from 'lucide-react';
import { useOnboarding } from '../constants/onboarding';

interface Props {
  itemName: string;
  targetElement: HTMLElement | null;
  onSkip: () => void;
  onViewDetails: () => void;
}

const OnboardingTooltip: React.FC<Props> = ({ 
  itemName, 
  targetElement, 
  onSkip, 
  onViewDetails 
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { onboardingData } = useOnboarding();

  const content = onboardingData[itemName];
  if (!content || !targetElement) return null;

  useEffect(() => {
    if (!tooltipRef.current || !targetElement) return;

    const rect = targetElement.getBoundingClientRect();
    const tooltip = tooltipRef.current;
    const viewportWidth = window.innerWidth;

    tooltip.style.position = 'fixed';
    tooltip.style.zIndex = '9999';
    tooltip.style.width = 'auto';
    tooltip.style.maxWidth = '340px';

    // ==================== DESKTOP (≥ 1024px) ====================
    if (viewportWidth >= 1024) {
      tooltip.style.top = `${rect.bottom + 25}%`;                  
      tooltip.style.left = '15%';             
      tooltip.style.transform = 'none';
    } 
    // ==================== TABLET (768px - 1023px) ====================
    else if (viewportWidth >= 768) {
      tooltip.style.top = `${rect.bottom + 14}px`;                  
      tooltip.style.left = '5%';
      tooltip.style.transform = 'none';
      tooltip.style.maxWidth = '320px';
    } 
    // ==================== MOBILE (< 768px) ====================
    else {
      tooltip.style.top = `${rect.bottom + 120}px`;                  
      tooltip.style.left = '1%';
      tooltip.style.transform = 'translateX(-50%)';
      tooltip.style.maxWidth = '92%';
      tooltip.style.width = '92%';
    }

    // Garantia extra: ajustar se ficar fora da tela
    setTimeout(() => {
      if (!tooltipRef.current) return;
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      // Se sair pela direita no desktop/tablet
      if (tooltipRect.right > window.innerWidth - 20) {
        tooltip.style.left = `${rect.left - tooltipRect.width - 20}px`;
      }

      // Se sair por baixo no mobile
      if (tooltipRect.bottom > window.innerHeight - 20) {
        tooltip.style.top = `${rect.top - tooltipRect.height - 20}px`;
      }
    }, 10);

  }, [targetElement]);

  return (
    <AnimatePresence>
      <motion.div
        ref={tooltipRef}
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-white shadow-xl rounded-2xl p-5 border border-slate-100 max-w-[300px]"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 bg-indigo-100 text-indigo-600 p-1.5 rounded-xl">
            <Info size={18} />
          </div>
          <div className="flex-1">
            <p className="text-slate-700 text-[15px] leading-snug">
              {content.shortDescription}
            </p>
          </div>
          <button 
            onClick={onSkip}
            className="text-slate-400 hover:text-slate-500 -mt-1 -mr-1 p-1"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onSkip}
            className="flex-1 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Ignorar
          </button>
          <button
            onClick={onViewDetails}
            className="flex-1 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Ver tutorial
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingTooltip;