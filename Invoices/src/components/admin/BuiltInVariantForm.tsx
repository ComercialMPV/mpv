import React, { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';// ou react-hot-toast, conforme teu projeto
 // Import useForm from react-hook-form
  import { useForm } from 'react-hook-form';
// Import do service que criamos
import { adminBuiltInVariantsApi } from '@/services/api'; // ajuste o caminho se necessário

// Schema Zod (igual ao anterior)
const formSchema = z.object({
  variantId: z
    .string()
    .min(3, 'O ID deve ter pelo menos 3 caracteres')
    .max(50, 'ID muito longo')
    .regex(/^[a-z0-9-]+$/i, 'Apenas letras minúsculas, números e hífen'),
  name: z.string().min(3, 'Nome é obrigatório').max(100),
  description: z.string().max(500).optional(),
  previewImageUrl: z.string().url({ message: 'URL inválida' }).optional().or(z.literal('')),
  category: z.string().max(50).optional(),
  tags: z
    .string()
    .transform((val) => val.split(',').map((t) => t.trim()).filter(Boolean))
    .optional(),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
  isPaid: z.boolean().default(false),
  price: z.number().min(0).default(0),
});

type FormValues = z.infer<typeof formSchema>;

export const BuiltInVariantForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

 

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variantId: '',
      name: '',
      description: '',
      previewImageUrl: '',
      category: '',
      tags: '',
      isActive: true,
      isPublic: true,
      isPaid: false,
      price: 0,
    },
  });

  // Carregar dados em modo edição
  useEffect(() => {
    if (isEdit && id) {
      loadVariant(id);
    }
  }, [id]);

  const loadVariant = async (variantId: string) => {
    try {
      const data = await adminBuiltInVariantsApi.getById(variantId);
      reset({
        ...data,
        tags: data.tags?.join(', ') || '',
      });
    } catch (err) {
      toast.error('Não foi possível carregar a variante');
      navigate('/admin/builtin-variants');
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        ...values,
        tags: Array.isArray(values.tags) ? values.tags : [],
      };

      if (isEdit) {
        await adminBuiltInVariantsApi.update(id!, payload);
        toast.success('Variante atualizada com sucesso');
      } else {
        await adminBuiltInVariantsApi.create(payload);
        toast.success('Variante criada com sucesso');
      }
      navigate('/admin/builtin-variants');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar variante');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja remover esta variante built-in?')) return;
    try {
      await adminBuiltInVariantsApi.delete(id!);
      toast.success('Variante removida');
      navigate('/admin/builtin-variants');
    } catch (err) {
      toast.error('Erro ao remover variante');
    }
  };

  const isPaid = watch('isPaid');

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Editar Variante Built-in' : 'Criar Nova Variante Built-in'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEdit
                ? 'Atualize as informações desta variante'
                : 'Crie uma nova variante para os utilizadores escolherem'}
            </p>
          </div>
        </div>

        {isEdit && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Remover
          </button>
        )}
      </div>

      {/* Formulário */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* variantId */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID único (variantId) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="ex: clinica-2026, modern-v2"
              disabled={isEdit} // não permite alterar depois de criado
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.variantId ? 'border-red-500' : 'border-gray-300'
              }`}
              {...register('variantId')}
            />
            {errors.variantId && (
              <p className="mt-1 text-sm text-red-600">{errors.variantId.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Usado para ligar ao componente React. Não altere após criação.
            </p>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome visível <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Clínica Moderna 2026"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              {...register('name')}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <input
              type="text"
              placeholder="ex: health, food, ecommerce"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register('category')}
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              rows={4}
              placeholder="Descreva o estilo, público-alvo, características principais..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register('description')}
            />
          </div>

          {/* Preview Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL da imagem de pré-visualização
            </label>
            <input
              type="url"
              placeholder="https://exemplo.com/preview-clinica.jpg"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register('previewImageUrl')}
            />
            <p className="mt-1 text-xs text-gray-500">
              Recomendado: imagem 400×300 ou quadrada
            </p>
            {errors.previewImageUrl && (
              <p className="mt-1 text-sm text-red-600">{errors.previewImageUrl.message}</p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (separadas por vírgula)
            </label>
            <input
              type="text"
              placeholder="clinica, saude, moderno, consulta"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register('tags')}
            />
            <p className="mt-1 text-xs text-gray-500">Ex: clinica, dental, estetica</p>
          </div>

          <hr className="my-6 border-gray-200" />

          {/* Switches */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* isActive */}
            <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
              <div>
                <label className="text-base font-medium text-gray-900">Ativo</label>
                <p className="text-sm text-gray-500">Aparece na lista de templates</p>
              </div>
              <input
                type="checkbox"
                checked={watch('isActive')}
                onChange={(e) => setValue('isActive', e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </div>

            {/* isPublic */}
            <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
              <div>
                <label className="text-base font-medium text-gray-900">Público</label>
                <p className="text-sm text-gray-500">Visível para todos os utilizadores</p>
              </div>
              <input
                type="checkbox"
                checked={watch('isPublic')}
                onChange={(e) => setValue('isPublic', e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </div>

            {/* isPaid */}
            <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
              <div>
                <label className="text-base font-medium text-gray-900">Pago</label>
                <p className="text-sm text-gray-500">Requer pagamento para usar</p>
              </div>
              <input
                type="checkbox"
                checked={watch('isPaid')}
                onChange={(e) => setValue('isPaid', e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </div>
          </div>

          {/* Preço condicional */}
          {isPaid && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço (MT)</label>
              <input
                type="number"
                min={0}
                step={1}
                className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('price', { valueAsNumber: true })}
              />
              {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>}
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex justify-end gap-4 pt-6">
            <button
              type="button"
              onClick={() => navigate('/admin/builtin-variants')}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                isSubmitting ? 'cursor-wait' : ''
              }`}
            >
              <Save className="h-5 w-5" />
              {isSubmitting
                ? 'A guardar...'
                : isEdit
                ? 'Atualizar Variante'
                : 'Criar Variante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};