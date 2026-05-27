import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export const SocialCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      toast.error('Autorização negada ou erro no Facebook');
      navigate('/social-publish?success=false');
      return;
    }

    if (!code) {
      toast.error('Código não recebido');
      navigate('/social-publish');
      return;
    }

    // Enviar o code para o backend processar
    const exchangeCode = async () => {
      try {
        const res = await api.request('/social/exchange', {
          method: 'POST',
          body: JSON.stringify({ code })
        });

        if (res.success) {
          toast.success('Conta conectada com sucesso!');
          navigate('/social-publish?success=true');
        } else {
          toast.error(res.message || 'Erro ao conectar conta');
          navigate('/social-publish?success=false');
        }
      } catch (err: any) {
        console.error(err);
        toast.error('Erro ao processar o login com Facebook');
        navigate('/social-publish?success=false');
      } finally {
        setLoading(false);
      }
    };

    exchangeCode();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg font-medium">A processar a conexão com o Instagram...</p>
          <p className="text-sm text-gray-500 mt-2">Por favor aguarde</p>
        </div>
      </div>
    );
  }

  return null;
};