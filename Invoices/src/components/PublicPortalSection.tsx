// src/components/PublicPortalSection.tsx
import React, { useEffect, useState } from 'react';
import { Eye, Globe, Link2, Copy, Check } from 'lucide-react';
import { companyApi } from '../services/api';
import { PortalCustomizationForm } from './PortalCustomizationForm';
import toast from 'react-hot-toast';

const PUBLIC_BASE_URL = import.meta.env.VITE_PUBLIC_PORTAL_BASE_URL || 'http://localhost:5173/public';
import { VARIANTS_META } from '../config/portalRegistry';


// Variantes fixas (hard-coded)
const DEFAULT_VARIANTS = VARIANTS_META;

export const PublicPortalSection: React.FC = () => {
  const [portalLoading, setPortalLoading] = useState(true);
  const [portalPublishing, setPortalPublishing] = useState(false);
  const [portalStatus, setPortalStatus] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('default');
  const [customSlug, setCustomSlug] = useState<string>('');
  const [slugError, setSlugError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadPortalStatus();
  }, []);

  const loadPortalStatus = async () => {
    try {
      setPortalLoading(true);
      const status = await companyApi.getPortalStatus();
      setPortalStatus(status);
      setCustomSlug(status.slug || '');
      setSelectedVariant(status.variant || 'default');
    } catch (error) {
      console.error('Error loading portal status:', error);
      toast.error('Falha ao carregar status do portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const validateSlug = (slug: string) => {
    if (!slug) return null;
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return 'Slug deve conter apenas letras minúsculas, números e hifens';
    }
    if (slug.length < 3) {
      return 'Slug deve ter pelo menos 3 caracteres';
    }
    return null;
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSlug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').trim('-');
    setCustomSlug(newSlug);
    setSlugError(validateSlug(newSlug));
  };

  const handlePublishPortal = async () => {
    if (slugError) return toast.error(slugError);
    try {
      setPortalPublishing(true);
      const newStatus = await companyApi.publishPortal({
        slug: customSlug,
        variant: selectedVariant,
      });
      setPortalStatus(newStatus);
      toast.success('Portal publicado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Falha ao publicar portal');
    } finally {
      setPortalPublishing(false);
    }
  };

  const handleCopyUrl = () => {
    if (!portalStatus?.slug) return;
    const url = `${PUBLIC_BASE_URL}/${portalStatus.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('URL copiada!');
  };

  const getPublicUrl = () => {
    return portalStatus?.slug ? `${PUBLIC_BASE_URL}/${portalStatus.slug}` : '';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-7">
      <div className="flex items-center mb-6">
        <Globe className="h-6 w-6 text-gray-500 mr-3" />
        <h2 className="text-xl font-semibold text-gray-900">Portal Público de Requisições</h2>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Publique um portal público para seus clientes fazerem requisições de produtos e serviços.
      </p>
            <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Personalização do Portal Público</h1>
      <PortalCustomizationForm />
    </div>
      {portalLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Variante do Layout</label>
            <select
              value={selectedVariant}
              onChange={(e) => setSelectedVariant(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {DEFAULT_VARIANTS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Slug Personalizado</label>
            <div className="flex rounded-md shadow-sm">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                {PUBLIC_BASE_URL}/
              </span>
              <input
                type="text"
                value={customSlug}
                onChange={handleSlugChange}
                className={`flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  slugError ? 'border-red-500' : ''
                }`}
                placeholder="meu-portal"
              />
            </div>
            {slugError && <p className="mt-1 text-sm text-red-600">{slugError}</p>}
          </div>

          <button
            onClick={handlePublishPortal}
            disabled={portalPublishing || !!slugError}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {portalPublishing ? 'Publicando...' : 'Publicar Portal'}
          </button>

          {portalStatus?.published && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center mb-2">
                <Check className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="font-medium text-green-800">Portal Publicado</h3>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={getPublicUrl()}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm"
                />
                <button
                  onClick={handleCopyUrl}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition"
                >
                  {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5 text-gray-600" />}
                </button>
              </div>
       
            </div>
          
          )}
        </div>
     
      )}

    </div>
  );
};