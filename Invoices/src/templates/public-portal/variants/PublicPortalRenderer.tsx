import React from 'react';

interface Template {
  templateType: string;
  primaryColor?: string;
  accentColor?: string;
  reactJSXReturn?: string;
  [key: string]: any;
}

interface PublicPortalRendererProps {
  template: Template;
}

export const PublicPortalRenderer: React.FC<PublicPortalRendererProps> = ({ template }) => {
  if (!template) {
    return (
      <div className="p-8 text-red-500 bg-red-900/20 rounded-lg">
        ❌ Erro: Template não fornecido
      </div>
    );
  }

  if (template.templateType === 'react-custom') {
    return (
      <div 
        style={{ 
          '--primary': template.primaryColor || '#6366f1', 
          '--accent': template.accentColor || '#8b5cf6' 
        } as any}
        dangerouslySetInnerHTML={{ __html: template.reactJSXReturn || '' }}
        className="w-full h-full"
      />
    );
  }

  return (
    <div className="p-8 text-gray-500">
      ⚠️ Tipo de template não suportado: {template.templateType}
    </div>
  );
};

export default PublicPortalRenderer;