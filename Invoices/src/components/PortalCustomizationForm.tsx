// src/components/settings/PortalCustomizationForm.tsx
import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { companyApi } from '@/services/api'; // ajuste o caminho
import { ImageUploader } from '@/components/ImageUploader';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronUp, Globe, Save, Loader2, MessageSquare, Info, Target, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Schema Zod completo (já corrigido anteriormente)
const portalSchema = z.object({
  enabled: z.boolean(),

  hero: z.object({
    enabled: z.boolean().default(true),
    headline: z.string().min(1, 'Título principal é obrigatório'),
    subheadline: z.string().min(1, 'Subtítulo é obrigatório'),
    backgroundImage: z.string().optional(),
    backgroundVideo: z.string()
      .url({ message: 'URL inválida' })
      .optional()
      .or(z.literal('')),
    ctaText: z.string().default('Solicitar Serviço'),
    ctaLink: z.string().default('#services'),
  }),

  about: z.object({
    enabled: z.boolean().default(false),
    title: z.string().optional(),
    body: z.string().optional(),
    image: z.string().optional(),
  }),

  clients: z.object({
    enabled: z.boolean().default(false),
    items: z.array(
      z.object({
        name: z.string().min(1, 'Nome do cliente obrigatório'),
        logo: z.string().optional(),
        website: z.string()
          .url({ message: 'URL inválida' })
          .optional()
          .or(z.literal('')),
      })
    ).optional(),
  }),

  testimonials: z.object({
    enabled: z.boolean().default(false),
    items: z.array(
      z.object({
        name: z.string().min(1, 'Nome obrigatório'),
        role: z.string().optional(),
        company: z.string().optional(),
        photo: z.string().optional(),
        text: z.string().min(10, 'Depoimento muito curto'),
        rating: z.number().min(1).max(5).default(5),
      })
    ).optional(),
  }),

missionVision: z.object({
  enabled: z.boolean().default(false),
  mission: z.object({
    title: z.string().default("Missão"),
    content: z.string().optional().or(z.literal('')),
  }).default({ title: 'Missão', content: '' }),
  vision: z.object({
    title: z.string().default("Visão"),
    content: z.string().optional().or(z.literal('')),
  }).default({ title: 'Visão', content: '' }),
  values: z.object({
    title: z.string().default("Valores"),
    items: z.array(z.string()).default([]),
  }).default({ title: 'Valores', items: [] }),
}).optional(),
});

type PortalFormData = z.infer<typeof portalSchema>;

export const PortalCustomizationForm: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('hero');
  const companyId = 'portal';

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PortalFormData>({
    resolver: zodResolver(portalSchema),
    defaultValues: {
      enabled: false,
      hero: {
        enabled: true,
        headline: '',
        subheadline: '',
        backgroundImage: '',
        backgroundVideo: '',
        ctaText: 'Solicitar Serviço',
        ctaLink: '#services',
      },
      about: { enabled: false, title: '', body: '', image: '' },
      clients: { enabled: false, items: [] },
      testimonials: { enabled: false, items: [] },
      missionVision: {
  enabled: false,
  mission: { 
    title: 'Missão', 
    content: '' 
  },
  vision: { 
    title: 'Visão', 
    content: '' 
  },
  values: { 
    title: 'Valores', 
    items: [] 
  },
},
    },
  });

useEffect(() => {
  const fetchData = async () => {
    try {
      const data = await companyApi.getPortalContent();
      
      // Sanitização para garantir que o formato novo seja respeitado
      const formattedData = {
        ...data,
        missionVision: data.missionVision ? {
          ...data.missionVision,
          mission: typeof data.missionVision.mission === 'string' 
            ? { title: 'Missão', content: data.missionVision.mission } 
            : data.missionVision.mission,
          vision: typeof data.missionVision.vision === 'string' 
            ? { title: 'Visão', content: data.missionVision.vision } 
            : data.missionVision.vision,
          values: Array.isArray(data.missionVision.values)
            ? { title: 'Valores', items: data.missionVision.values }
            : data.missionVision.values
        } : undefined
      };

      reset(formattedData || {});
    } catch (err) {
      console.error('Erro ao carregar:', err);
      toast.error('Não foi possível carregar as configurações');
    }
  };
  fetchData();
}, [reset]);

  const onSubmit = async (data: PortalFormData) => {
    setIsSaving(true);
    try {
      await companyApi.updatePortalContent(data);
      toast.success('Configuração salva com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
  if (Object.keys(errors).length > 0) {
    console.log("Erros de Validação:", errors);
  }
}, [errors]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const portalEnabled = watch('enabled');

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personalização do Portal Público</h1>
          <p className="text-gray-600 mt-1">
            Configure o conteúdo que aparece no portal da sua empresa
          </p>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <span className="text-sm font-medium text-gray-700">Ativar Portal</span>
          <input
            type="checkbox"
            {...register('enabled')}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </label>
      </div>

      {!portalEnabled && (
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
          O portal está desativado. Ative acima para editar e publicar.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Hero */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('hero')}
            className="w-full px-6 py-4 text-left bg-gray-50 hover:bg-gray-100 flex justify-between items-center font-medium text-lg"
          >
            <div className="flex items-center gap-3">
              <Globe className="w-6 h-6 text-blue-600" />
              Seção Hero (Obrigatória)
            </div>
            {expandedSection === 'hero' ? <ChevronUp /> : <ChevronDown />}
          </button>

          {expandedSection === 'hero' && (
            <div className="p-6 space-y-6 bg-white">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título Principal *
                </label>
                <input
                  type="text"
                  {...register('hero.headline')}
                  placeholder="Ex: Soluções que Transformam o Seu Negócio"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.hero?.headline ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.hero?.headline && (
                  <p className="mt-1 text-sm text-red-600">{errors.hero.headline.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subtítulo *
                </label>
                <textarea
                  {...register('hero.subheadline')}
                  placeholder="Ex: Serviços rápidos, confiáveis e personalizados"
                  rows={3}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.hero?.subheadline ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.hero?.subheadline && (
                  <p className="mt-1 text-sm text-red-600">{errors.hero.subheadline.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Texto do Botão CTA
                  </label>
                  <input
                    type="text"
                    {...register('hero.ctaText')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link do Botão CTA
                  </label>
                  <input
                    type="text"
                    {...register('hero.ctaLink')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Imagem de Fundo (Hero)
                </label>
               <Controller
                name="hero.backgroundImage"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <ImageUploader
                    itemId="portal-hero"
                    itemType="portal-content"
                    section="hero"
                    existingImages={value ? [value] : []}
                    onImagesUpdated={(urls) => {
                      const newUrl = urls[0] || '';
                      onChange(newUrl);                    // ← react-hook-form recebe o valor
                      setValue('hero.backgroundImage', newUrl, { shouldDirty: true });
                    }}
                  />
                )}
              />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vídeo de Fundo (URL opcional)
                </label>
                <input
                  type="url"
                  {...register('hero.backgroundVideo')}
                  placeholder="https://exemplo.com/video-hero.mp4"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.hero?.backgroundVideo ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.hero?.backgroundVideo && (
                  <p className="mt-1 text-sm text-red-600">{errors.hero.backgroundVideo.message}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* About */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('about')}
            className="w-full px-6 py-4 text-left bg-gray-50 hover:bg-gray-100 flex justify-between items-center font-medium text-lg"
          >
            <div className="flex items-center gap-3">
              <Info className="w-6 h-6 text-blue-600" />
              Seção Sobre Nós
            </div>
            {expandedSection === 'about' ? <ChevronUp /> : <ChevronDown />}
          </button>

          {expandedSection === 'about' && (
            <div className="p-6 space-y-6 bg-white">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('about.enabled')}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Ativar seção Sobre Nós</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título da seção</label>
                <input
                  type="text"
                  {...register('about.title')}
                  placeholder="Quem Somos"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Texto descritivo</label>
                <textarea
                  {...register('about.body')}
                  placeholder="Conte a história da sua empresa, valores e diferencial..."
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Imagem da seção</label>
                <Controller
                  name="about.image"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <ImageUploader
                      itemId="portal-about"
                      itemType="portal-content"
                      section="about"
                      existingImages={value ? [value] : []}
                      onImagesUpdated={(urls) => {
                        const newUrl = urls[0] || '';
                        onChange(newUrl);
                        setValue('about.image', newUrl, { shouldDirty: true });
                      }}
                    />
                  )}
                />
              </div>
            </div>
          )}
        </div>

        {/* Clients (placeholder simples) */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('clients')}
            className="w-full px-6 py-4 text-left bg-gray-50 hover:bg-gray-100 flex justify-between items-center font-medium text-lg"
          >
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-600" />
              Seção Clientes / Parceiros
            </div>
            {expandedSection === 'clients' ? <ChevronUp /> : <ChevronDown />}
          </button>

          {expandedSection === 'clients' && (
            <div className="p-6 bg-white">
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  {...register('clients.enabled')}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Ativar seção de Clientes</span>
              </label>
              <p className="text-sm text-gray-500">
                Em breve: adicionar múltiplos clientes com logos e links
              </p>
            </div>
          )}
        </div>

        {/* Testemunhos (placeholder) */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('testimonials')}
            className="w-full px-6 py-4 text-left bg-gray-50 hover:bg-gray-100 flex justify-between items-center font-medium text-lg"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              Seção Depoimentos
            </div>
            {expandedSection === 'testimonials' ? <ChevronUp /> : <ChevronDown />}
          </button>

          {expandedSection === 'testimonials' && (
            <div className="p-6 bg-white">
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  {...register('testimonials.enabled')}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Ativar depoimentos</span>
              </label>
              <p className="text-sm text-gray-500">
                Em breve: adicionar múltiplos depoimentos com fotos e ratings
              </p>
            </div>
          )}
        </div>

        {/* Mission / Vision */}
<div className="border border-gray-200 rounded-lg overflow-hidden">
  <button
    type="button"
    onClick={() => toggleSection('mission')}
    className="w-full px-6 py-4 text-left bg-gray-50 hover:bg-gray-100 flex justify-between items-center font-medium text-lg"
  >
    <div className="flex items-center gap-3">
      <Target className="w-6 h-6 text-blue-600" />
      Missão, Visão e Valores
    </div>
    {expandedSection === 'mission' ? <ChevronUp /> : <ChevronDown />}
  </button>

  {expandedSection === 'mission' && (
    <div className="p-6 space-y-6 bg-white">
      
      <label className="flex items-center gap-3 cursor-pointer mb-4">
        <input
          type="checkbox"
          {...register('missionVision.enabled')}
          className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
        <span className="text-sm font-medium text-gray-700">Ativar esta seção</span>
      </label>

      {/* MISSION SECTION */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título da Missão</label>
          <input
            type="text"
            {...register('missionVision.mission.title')}
            placeholder="Ex: Nossa Missão"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo da Missão</label>
          <textarea
            {...register('missionVision.mission.content')}
            placeholder="Nossa missão é..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* VISION SECTION */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título da Visão</label>
          <input
            type="text"
            {...register('missionVision.vision.title')}
            placeholder="Ex: Nossa Visão"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo da Visão</label>
          <textarea
            {...register('missionVision.vision.content')}
            placeholder="Nossa visão é..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* VALUES SECTION */}
      <div className="space-y-3">
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">Título dos Valores</label>
    <input
      type="text"
      {...register('missionVision.values.title')}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Valores (um por linha)
    </label>
    <textarea
      // Importante: use o items aqui para o join
      defaultValue={watch('missionVision.values.items')?.join('\n')}
      placeholder="Integridade&#10;Inovação&#10;Excelência"
      rows={5}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      onChange={(e) => {
        const lines = e.target.value.split('\n').filter(l => l.trim() !== '');
        // O erro estava aqui: enviando o array para o objeto 'values' em vez de 'values.items'
        setValue('missionVision.values.items', lines, { shouldDirty: true, shouldValidate: true });
      }}
    />
  </div>
</div>
    </div>
  )}
</div>

        {/* Botão salvar */}
        <div className="pt-8 border-t border-gray-200">
          <button
            type="submit"
            disabled={isSaving}
            className={`w-full md:w-auto px-10 py-4 bg-blue-600 text-white rounded-lg font-bold text-lg flex items-center justify-center gap-3 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isSaving ? 'cursor-wait' : ''
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                A guardar...
              </>
            ) : (
              <>
                <Save className="w-6 h-6" />
                Salvar Configuração do Portal
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};