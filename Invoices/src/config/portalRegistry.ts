// Novo arquivo: registry central das variantes

import DefaultPortal from '../templates/public-portal/variants/DefaultPortal';
import MinimalPortal from '../templates/public-portal/variants/MinimalPortal';
import ModernPortal from '../templates/public-portal/variants/ModernPortal';
import RestaurantPortal from '../templates/public-portal/variants/CardapioDigital';
import HairStylePortal from '../templates/public-portal/variants/Hairstyle';
import CateringPortal from '../templates/public-portal/variants/Catering';
import LogisticsPortal from '../templates/public-portal/variants/LogisticPortal';
import EcommercePortal from '../templates/public-portal/variants/Ecommerce';
import PlansPortal from '../templates/public-portal/variants/PlansPortal';
import BoutiquePortal from '../templates/public-portal/variants/BoutiquePortal';
import CosmeticsPortal from '../templates/public-portal/variants/CosmeticsPortal';
import TakeawayPortal from '../templates/public-portal/variants/TakeawayDigital';
import LawyerPortal from '../templates/public-portal/variants/LawyerDigital';
import BarPortal from '../templates/public-portal/variants/BarDigital';
import ClinicaPortal from '../templates/public-portal/variants/ClinicaPortal';
import ConsultingPortal from '../templates/public-portal/variants/ConsultingPortal';
import RetreatPortal from '../templates/public-portal/variants/RetreatPortal';
import ShoestorePortal from '../templates/public-portal/variants/Shoestore';
import CuidadorPortal from '../templates/public-portal/variants/Cuidador';

export const VARIANTS_META = [
  { id: 'default', name: 'Padrão (Sidebar Escura)', description: 'Layout clássico com sidebar escura à direita' },
  { id: 'minimal', name: 'Minimalista', description: 'Design limpo, sem sidebar fixa, tudo em coluna única' },
  { id: 'modern', name: 'Moderno', description: 'Estilo mais atual, cores vibrantes, animações leves' },
  { id: 'restaurant', name: 'Restaurante', description: 'Design especializado para restaurantes, com foco em apresentação de cardápio e pedidos' },
  { id: 'hairstyle', name: 'Estilo de Cabelo', description: 'Design especializado para salões de beleza, com foco em apresentação de serviços de cabelo' },
  { id: 'catering', name: 'Catering', description: 'Design especializado para eventos de catering, com foco em apresentação de serviços e pacotes' },
  { id: 'ecommerce', name: 'Ecommerce', description: 'Design especializado para lojas virtuais e catálogos de produtos' },
  { id: 'logistic', name: 'Logística', description: 'Design especializado para empresas de logística e transporte, com foco em apresentação de serviços e rastreamento de entregas' },
  { id: 'plans', name: 'Planos de subscrição', description: 'Design especializado para empresas de subscrição e assinaturas' },
  { id: 'boutique', name: 'Loja Virtual', description: 'Design especializado para lojas virtuais e catálogos de produtos' },
  { id: 'cosmetics', name: 'Cosméticos', description: 'Design especializado para lojas de cosméticos e produtos de beleza' },
    { id: 'takeaway', name: 'Takeaway Digital', description: 'Design especializado para restaurantes e lanchonetes, com foco em cardápio digital para pedidos de retirada ou delivery' },
    { id: 'lawyer', name: 'Advogado', description: 'Design especializado para escritórios de advocacia, com foco em apresentação de serviços jurídicos e áreas de atuação' },
    { id: 'bar', name: 'Bar', description: 'Design especializado para bares e pubs, com foco em apresentação de cardápio de bebidas e eventos' },
 { id: 'clinica', name: 'Clinica', description: 'Especifico para clinica' },
 { id: 'consulting', name: 'Consultoria', description: 'Design especializado para escritórios de consultoria, com foco em apresentação de serviços e áreas de atuação' },
 { id: 'retreat', name: 'Retiro', description: 'Design especializado para centros de retiros e bem-estar' },
 { id: 'shoestore', name: 'Loja de Sapatos', description: 'Design especializado para lojas de sapatos e calçados' },
  { id: 'cuidador', name: 'Cuidador', description: 'Design especializado para cuidadores de lar e prestadores de serviços domésticos' },
] as const;

export const VARIANT_MAP: Record<string, React.ComponentType<any>> = {
  default: DefaultPortal,
  minimal: MinimalPortal,
  modern: ModernPortal,
  hairstyle: HairStylePortal,
  ecommerce: EcommercePortal,
  catering: CateringPortal,
  logistic: LogisticsPortal,
  restaurant: RestaurantPortal,
  plans: PlansPortal,
  boutique: BoutiquePortal,
    cosmetics: CosmeticsPortal,
    takeaway: TakeawayPortal,
    lawyer: LawyerPortal,
    bar: BarPortal,
    clinica: ClinicaPortal,
    consulting: ConsultingPortal,
    retreat: RetreatPortal,
    shoestore: ShoestorePortal,
    cuidador: CuidadorPortal,
};

// re-export a lista dinâmica com loaders (mantém compatibilidade)
export const PUBLIC_PORTAL_VARIANTS = [
  { id: 'default', name: 'Padrão (Sidebar Escura)', description: 'Layout clássico', component: () => import('../templates/public-portal/variants/DefaultPortal') },
  { id: 'minimal', name: 'Minimalista', description: 'Design limpo', component: () => import('../templates/public-portal/variants/MinimalPortal') },
  { id: 'modern', name: 'Moderno', description: 'Estilo atual', component: () => import('../templates/public-portal/variants/ModernPortal') },
  { id: 'restaurant', name: 'Restaurante', description: 'Cardápio digital', component: () => import('../templates/public-portal/variants/CardapioDigital') },
  { id: 'hairstyle', name: 'Estilo de Cabelo', description: 'Salão de beleza', component: () => import('../templates/public-portal/variants/Hairstyle') },
  { id: 'catering', name: 'Catering', description: 'Eventos', component: () => import('../templates/public-portal/variants/Catering') },
  { id: 'ecommerce', name: 'Ecommerce', description: 'Lojas online', component: () => import('../templates/public-portal/variants/Ecommerce') },
  { id: 'logistic', name: 'Logística', description: 'Transporte', component: () => import('../templates/public-portal/variants/LogisticPortal') },
  { id: 'plans', name: 'Planos de subscrição', description: 'Assinaturas', component: () => import('../templates/public-portal/variants/PlansPortal') },
  { id: 'boutique', name: 'Loja Virtual', description: 'Catálogos de produtos', component: () => import('../templates/public-portal/variants/BoutiquePortal') },
    { id: 'cosmetics', name: 'Cosméticos', description: 'Produtos de beleza', component: () => import('../templates/public-portal/variants/CosmeticsPortal') },
   { id: 'takeaway', name: 'Takeaway Digital', description: 'Cardápio digital para delivery', component: () => import('../templates/public-portal/variants/TakeawayDigital') },
   { id: 'lawyer', name: 'Advogado', description: 'Design especializado para escritórios de advocacia', component: () => import('../templates/public-portal/variants/LawyerDigital') },
   {id: 'bar', name: 'Bar', description: 'Design especializado para bares e pubs, com foco em apresentação de cardápio de bebidas e eventos', component: () => import('../templates/public-portal/variants/BarDigital') },
   {id: 'clinica', name: 'Clinica', description: 'Especifico para Clinicas', component: () => import('../templates/public-portal/variants/ClinicaPortal') },
    {id: 'consulting', name: 'Consultoria', description: 'Design especializado para escritórios de consultoria, com foco em apresentação de serviços e áreas de atuação', component: () => import('../templates/public-portal/variants/ConsultingPortal') },
    {id: 'retreat', name: 'Retiro', description: 'Design especializado para centros de retiros e bem-estar', component: () => import('../templates/public-portal/variants/RetreatPortal') },
    {id: 'shoestore', name: 'Loja de Sapatos', description: 'Design especializado para lojas de sapatos e calçados', component: () => import('../templates/public-portal/variants/Shoestore') },
    {id: 'cuidador', name: 'Cuidador', description: 'Design especializado para cuidadores de lar e prestadores de serviços domésticos', component: () => import('../templates/public-portal/variants/Cuidador') },
] as const;

export type PortalVariantId = typeof VARIANTS_META[number]['id'];