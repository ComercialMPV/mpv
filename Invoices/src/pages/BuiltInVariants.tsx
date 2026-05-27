import React from 'react';
import { PortalVariantsSection } from '@/components/PortalVariantsSection';

export default function BuiltInVariants() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Gestão de Variantes Built-in</h1>
      <PortalVariantsSection />
    </div>
  );
}