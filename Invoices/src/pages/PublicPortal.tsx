// src/pages/PublicPortal.tsx
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { publicApi, Service, Company } from '../services/api';
import toast from 'react-hot-toast';
import { VARIANT_MAP } from '../config/portalRegistry';



// Definição da interface das props que todos os variants devem aceitar
export interface VariantProps {
  company: Company;
  slug: string;
  services: Service[];
  products: any[];
  bundles: any[];
  portalContent: any; // Conteúdo dinâmico do portal, pode ser tipado melhor conforme estrutura definida
}



export const PublicPortal: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [bundles, setBundles] = useState<any[]>([]);
  const [portalContent, setPortalContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPortal = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        const data = await publicApi.getPortal(slug);

        if (!data?.company) {
          throw new Error('Empresa não encontrada');
        }

        setCompany(data.company);
        setServices(data.services || []);
        setProducts(data.products || []);
        setBundles(data.bundles || []);
        setPortalContent(data.portalContent || {});
      } catch (err: any) {
        const msg = err.message || 'Não foi possível carregar o portal';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    loadPortal();
  }, [slug]);

  // Memoriza o componente para evitar re-renderizações desnecessárias
  const SelectedVariant = useMemo(() => {
    const variantName = company?.publicPortal?.variant || 'default';
    return VARIANT_MAP[variantName] || VARIANT_MAP['default'];
  }, [company]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-700">A carregar o portal...</p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-10 text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Erro</h1>
          <p className="text-gray-700 text-lg mb-8">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="inline-block px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition"
          >
            Voltar à página inicial
          </button>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Preparando layout...</div>
      </div>
    }>
      <SelectedVariant 
        company={company} 
        slug={slug!} 
        services={services}
        products={products || []}
        bundles={bundles}
        portalContent={portalContent}
      />
    </Suspense>
  );
};