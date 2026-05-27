// src/pages/admin/OnboardingManagement.tsx
import React, { useState, useEffect } from 'react';
import { Save, Info, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const navigationNames = [
  'Dashboard', 'Dashboard de Despesas', 'Minhas Empresas', 'Painel do Parceiro', 'Gestão de Comissões',
  'Minhas comissões', 'Dashboard Comissões', 'Dashboard de Recomendação',
  'Gerenciamento de Parceiros', 'Recomendar Clientes', 'Meus ganhos',
  'Gestão de cargos', 'Vendas', 'Metas', 'Rentabilidade', 'Requisições',
  'Serviços', 'Documentos', 'Clientes', 'Leads', 'Propostas', 'Fornecedores',
  'Modelos documentos', 'Portais Públicos', 'Empresa', 'Definições',
  'Configurar Website Público', 'Social media', 'Gestão de Usuários', 'Display de Pedidos', 'Confirmação da Cozinha',
  'Performance dos Usuários', 'Configurações de Pagamento', 'Hub do Empreendedor'
];

const OnboardingManagement: React.FC = () => {
  const { user } = useAuth();
  const [contents, setContents] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadContents();
  }, []);

  const loadContents = async () => {
    try {
      const data = await api.onboarding.getAll();
      const formatted: Record<string, any> = {};

      data.forEach((item: any) => {
        formatted[item.menuName] = item;
      });

      setContents(formatted);
    } catch (err) {
      console.error('Erro ao carregar onboarding:', err);
    } finally {
      setLoading(false);
    }
  };

  const getItem = (name: string) => {
    return contents[name] || {
      menuName: name,
      shortDescription: '',
      longDescription: '',
      videoUrl: ''
    };
  };

  const updateField = (name: string, field: string, value: string) => {
    setContents(prev => ({
      ...prev,
      [name]: {
        ...getItem(name),
        [field]: value
      }
    }));
  };

  const handleSave = async (name: string) => {
    const item = getItem(name);

    if (!item.shortDescription?.trim() || !item.longDescription?.trim()) {
      alert('As descrições curta e longa são obrigatórias.');
      return;
    }

    setSaving(prev => ({ ...prev, [name]: true }));

    try {
      await api.onboarding.update(name, {
        shortDescription: item.shortDescription,
        longDescription: item.longDescription,
        videoUrl: item.videoUrl || ''
      });

      // Atualiza apenas o item salvo (sem recarregar tudo)
      setContents(prev => ({
        ...prev,
        [name]: { ...item }
      }));

    } catch (err) {
      console.error(err);
      alert('Erro ao guardar as alterações. Tente novamente.');
    } finally {
      setSaving(prev => ({ ...prev, [name]: false }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-12">
        <div className="bg-indigo-100 p-4 rounded-3xl">
          <Info className="h-10 w-10 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Gestão de Onboarding</h1>
          <p className="text-lg text-slate-600 mt-2">
            Personalize as mensagens de ajuda contextual para cada secção do sistema
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="space-y-8">
          {navigationNames.map((name) => {
            const item = getItem(name);
            const isSaving = saving[name];

            return (
              <div
                key={name}
                className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Nome do Menu */}
                  <div className="lg:w-64 flex-shrink-0">
                    <h3 className="text-xl font-semibold text-slate-800 mb-1">{name}</h3>
                    <p className="text-sm text-slate-500">Configuração de ajuda contextual</p>
                  </div>

                  {/* Campos de Edição */}
                  <div className="flex-1 space-y-6">
                    {/* Descrição Curta */}
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">
                        Descrição Curta (Bubble)
                      </label>
                      <textarea
                        value={item.shortDescription}
                        onChange={(e) => updateField(name, 'shortDescription', e.target.value)}
                        rows={3}
                        className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y min-h-[90px]"
                        placeholder="Texto breve que aparece no bubble..."
                      />
                    </div>

                    {/* Descrição Longa */}
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">
                        Descrição Longa (Modal)
                      </label>
                      <textarea
                        value={item.longDescription}
                        onChange={(e) => updateField(name, 'longDescription', e.target.value)}
                        rows={6}
                        className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y min-h-[140px]"
                        placeholder="Texto completo que aparece no modal de tutorial..."
                      />
                    </div>

                    {/* URL do Vídeo */}
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">
                        Link do Vídeo (YouTube ou Vimeo Embed)
                      </label>
                      <input
                        type="text"
                        value={item.videoUrl || ''}
                        onChange={(e) => updateField(name, 'videoUrl', e.target.value)}
                        className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        placeholder="https://www.youtube.com/embed/xxxxxxxxxx"
                      />
                    </div>
                  </div>

                  {/* Botão Guardar */}
                  <div className="lg:w-40 flex-shrink-0 flex items-end">
                    <button
                      onClick={() => handleSave(name)}
                      disabled={isSaving}
                      className="w-full lg:w-auto flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium px-10 py-4 rounded-2xl transition-all"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save size={20} />
                          Guardar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-center text-xs text-slate-400 mt-12">
        Cada secção é guardada individualmente • As alterações refletem imediatamente no bubble e modal
      </div>
    </div>
  );
};

export default OnboardingManagement;