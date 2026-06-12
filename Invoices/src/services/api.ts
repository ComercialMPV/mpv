
export const API_BS_URL = import.meta.env.VITE_API_BS_URL || 'http://localhost:5000';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  rolePermissions?: string[]; // Permissões específicas do usuário, se existirem
  company: Company;
  isVerified: boolean;
}

export interface Role {
  _id: string;
  name: string;
  description?: string;
  allowedMenuItems?: string[];
  isActive: boolean;
}

export interface PartnerStats {
  totalEarned: number;      // Soma de commissionValue
  pendingAmount: number;    // A pagar
  paidAmount: number;       // Já pago
  totalSalesValue: number;  // Valor bruto total vendido
  totalSalesCount: number;
  commissionRate: number;
  monthlyGrowth?: number;
}
export interface ShareTokenResponse {
  token: string;
  shareUrl: string;
  expiresAt: string;
  documentId: string;
}

export interface ShareDocumentPayload {
  documentId: string;
  recipientEmail: string;
  recipientName?: string;
  message?: string;
  cc?: string[];                // emails em cópia
  expiresInDays?: number;       // opcional - default do backend
}

export interface DocumentShareInfo {
  token: string;
  shareUrl: string;
  createdAt: string;
  expiresAt: string;
  recipientEmail?: string;
  sentBy?: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface ReferralPartner {
  _id: string;
  user: User;
  company?: Company;
  referralCode: string;
  birthYear: number;
  totalReferred: number;
  activeReferred: number;
  totalEarned: number;
  isActive: boolean;
  createdAt: string;
}

export interface ReferralCommission {
  _id: string;
  company: string;
  referralPartner: string | ReferralPartner;
  referredClient: {
    _id: string;
    name: string;
    phone: string;
  };
  sale: {
    _id: string;
    total: number;
    createdAt: string;
  };
  commissionAmount: number;
  commissionRate: number;
  status: 'pending' | 'approved' | 'paid';
  createdAt: string;
}

export interface ReferralDashboardSummary {
  referralCode: string;
  totalReferred: number;
  totalEarned: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  totalCommissions: number;
}

export interface MyReferralsResponse {
  referralCode: string;
  totalReferred: number;
  clients: Array<{
    _id: string;
    name: string;
    phone: string;
    createdAt: string;
    totalCommission: number;
    salesCount: number;
  }>;
}

export interface MyEarningsResponse {
  totalEarned: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  commissions: Array<{
    _id: string;
    saleId: string;
    customerName: string;
    customerPhone: string;
    commissionAmount: number;
    commissionRate: number;
    status: string;
    createdAt: string;
  }>;
}
// Interface para os filtros
export interface SaleFilters {
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  mine?: boolean; // if true, only return sales created by the current user
  sellerId?: string;
}

export interface SalesStats {
  totalSales: number;
  totalRevenue: number;
  todaySalesCount: number;
  todayRevenue: number;
}

export interface SalesDaily {
  date: string; // YYYY-MM-DD
  total: number;
  count: number;
}

export interface CommissionRule {
  _id: string;
  name: string;
  targetType: 'Subscription' | 'Product' | 'Service' | 'Combo' | 'General';
  targetId?: string;
  userRole: {
    _id: string;
    roleName: string;
  };
  conditions: {
    minQuantity: number;
    minMonths: number;
  };
  commissionType: 'percentage' | 'fixed';
  value: number;
  isActive: boolean;
}

// Definição dos estágios para garantir consistência
// api.ts
export type LeadStage = 'new' | 'prospecting' | 'contacted' | 'negotiation' | 'proposal' | 'pending' | 'won' | 'lost';
export interface Lead {
  [x: string]: any;
  _id: string;
  name: string;
  email: string;
  phone?: string;
  stage: LeadStage;
  notes?: string;
  company?: string;
  isPublic?: boolean; // Novo campo para indicar se o lead é público ou privado
  createdAt?: string;
}

// Goals / Metas e Objectivos
export interface GoalBreakdown {
  itemType: 'Product' | 'Service' | 'Combo';
  percentage?: number; // optional when coming from breakdown endpoint
  targetAmount?: number;
  revenue?: number; // for results returned by breakdown aggregation
  count?: number;
}

export interface Goal {
  _id?: string;
  company: string;

  // novos campos enviados pelo formulário
  period: 'monthly' | 'quarterly' | 'semester' | 'annual';
  startDate: string;            // YYYY‑MM‑DD
  endDate: string;              // YYYY‑MM‑DD
  financialTarget: number;      // valor base do período selecionado

  year: number;
  annualTarget: number;
  monthlyTarget: number;
  quarterlyTarget?: number;     // opcional, apenas para conveniência
  semesterTarget: number;

  achievementStrategy: 'products' | 'services' | 'combos' | 'mixed';
  contingencyMargin: number;    // e.g. 0.1 para 10%
  breakdown: GoalBreakdown[];
  status: 'draft' | 'active' | 'completed' | 'archived';
  notes?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface BreakdownItem {
  name: string;
  revenue: number;
  count: number;
}

export interface GoalDistribution {
  _id?: string;
  company: string;
  goal: string;
  role?: string | { _id: string; roleName: string }; // ID ou objeto populado
  assignedUser?: string | { _id: string; firstName: string; lastName: string }; // ID ou objeto populado
  annualTarget: number;
  monthlyBreakdown: Array<{ month: number; target: number }>;
  itemTypeTargets: Array<{ itemType: string; target: number }>;
  actualRevenue: number;
  actualCount: number;
  monthlyPerformance: Array<{ month: number; revenue: number; count: number; percentage: number }>;
  healthStatus: 'on-track' | 'at-risk' | 'critical';
  lastUpdated?: string;
  notes?: string; // Notas adicionais
  category?: string; // Categoria da meta
}

// Customer Unit Economics
export interface CustomerMetrics {
  averageDelayDays: number;
  customerId?: string;
  customerName?: string;
  origin: 'POS' | 'pending-room' | 'internal' | 'external' | 'Partner_Portal'; // Enum conforme Sale.cjs
  totalRevenue: number;
  totalCount: number;
  totalItems: number;
  avgOrderValue: number;
  minOrder: number;
  maxOrder: number;
  lastSale: string;
  firstSale: string; 
  purchaseFrequency: number;  
  avgPaymentDelayDays?: number;
  overdueCount?: number;
  ltv?: number;
  topItems?: Array<{
    name: string;
    quantity: number;
    totalSpent: number;
  }>;
}

export interface CustomerAnalyticsSummary {
  totalRevenue: number;
  totalCustomers: number;
  walkInRevenue: number;
  registeredRevenue: number;
  avgLTV: number;
  avgAOV: number;
  totalTransactions: number;
}

export interface CustomerAnalyticsResponse {
  summary: {
    totalRevenue: number;
    totalCustomers: number;
    avgLTV: number;
    avgAOV: number;
    totalTransactions: number;
    registeredRevenue: number;
    walkInRevenue: number;
  };
  topCustomers: CustomerMetrics[];
  bottomCustomers: CustomerMetrics[];
  allCustomers: CustomerMetrics[];
}


export interface CustomerSourceBreakdown {
  uniqueCustomers: ReactNode;
  origin: 'POS' | 'pending-room' | 'internal' | 'external' | 'Partner_Portal';
  revenue: number;
  count: number;
  percentage: number;
}

export interface CustomerDetailedStats {
  totalRevenue: number;
  totalTransactions: number;
  avgOrderValue: number;
  totalItems: number;
  firstPurchase: string;
  lastPurchase: string;
  daysActive: number;
  purchaseFrequency: number;
}

export interface IndividualCustomerStats {
  customer: {
    _id: string;
    name: string;
    phone?: string;
    email?: string;
    balance?: number;
    createdAt: string;
    createdBy: User;
  };
  ltv: number;
  aov: number;
  cac: number;
  totalTransactions: number;
  totalItems: number;
  firstPurchase: string;
  lastPurchase: string;
  daysActive: number;
  purchaseFrequency: number | string;
  totalPaid: number;
  totalPending: number;
  averagePaymentDelay: number;
  paymentDelayRisk: 'Baixo' | 'Médio' | 'Alto' | 'Crítico';
  delayedTransactions: number;
}

export interface CustomerClient {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
}

export interface PaymentAnalysisResult {
  customerId: string;
  customerName: string;
  totalTransactions: number;
  onTimePayments: number;
  latePayments: number;
  totalDelayDays: number;
  averageDelayDays: number;
  paymentReliability: number;
}

// ── Interfaces de Subscrição ──────────────────────────────────────────────
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
}

export interface Subscription {
  _id?: string | null;
  company: string;
  purchasedBy?: string;
  planId: 'basic' | 'professional' | 'enterprise';
  planName: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'annual';
  billingPricePerCycle: number; // preço específico para o ciclo de faturamento, pode ser igual a price ou diferente em caso de descontos
  features: string[];
  transactionId?: string;
  externalRef?: string;
  paymentMethod?: 'mpesa' | 'emola' | 'visa' | 'card';
  currentPeriodStart: string | Date;
  currentPeriodEnd: string | Date;
  nextBillingDate?: string | Date | null;
  autoRenew: boolean;
  renewalHistory?: Array<{
    date: string | Date;
    transactionId: string;
    externalRef: string;
    status: string;
  }>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface SubscriptionUpdateData {
  autoRenew?: boolean;
  [key: string]: any;
}

// ── Atualizar a interface CheckoutPayload existente ──────────────────────
// (adicionar isSubscription e companyId)
// type for checkout/payment
export interface CheckoutPayload {
  totalAmount: number;
  method: 'mpesa' | 'emola' | 'visa' | 'card' | 'transfer';
  customer: {
    name: string;
    phone?: string;
    email?: string;
  };
  planId?: string;
  companyName?: string; // useful for public portal where no user token is present
  companyId?: string;
  userId?: string;
  isSubscription?: boolean;
  variantId?: string;       // for portal template purchase
  variantName?: string;     // for portal template purchase
  templateId?: string;      // for document template purchase
  templateName?: string;    // for document template purchase
  mobileMoneyPhone?: string;  // for mpesa/emola direct charge
  items?: Array<{
    itemId?: string;
    name: string;
    quantity: number;
    price: number;
    type?: string;
  }>;
}

// ── Atualizar CheckoutResponse existente ────────────────────────────────
export interface CheckoutResponse {
  success: boolean;
  url?: string | null;
  transactionId?: string | null;
  externalRef?: string;
  message?: string; // ← ADICIONAR
}



export interface CheckoutResponse {
  success: boolean;
  url?: string | null;
  transactionId?: string | null;
  externalRef?: string;
}

export interface OnlineSearch {
  term: string;
  count: number;
}

export interface OnlineItem {
  itemId: string | null;
  name: string;
  itemType: string;
  count: number;
}

export interface OnlineAnalytics {
  topSearches: OnlineSearch[];
  topItems: OnlineItem[];
}


// Novos Tipos para Vendas e Promoções
export interface Bundle {
  [x: string]: any;
  _id: string;
  name: string;
  type: 'Combo' | 'Subscription';
  description?: string;
  items: {
    productId: Product | string;
    quantity: number;
    itemType?: 'Product' | 'Service';
  }[];
  isSubscription?: boolean;
    billingPricePerCycle?: number; // para combos de subscrição 
      includedLimits?: [];
        extraBenefits?: string[];
        originalCyclePrice?: number; // para mostrar o preço original sem desconto
  
  price: number;
  billingCycle: 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual' | 'N/A' | 'Custom';
  isActive: boolean;
  image: string; // Guardará a string Base64 ou URL da imagem
  isArchived: boolean; // Para funcionalidade de arquivo

}
export interface CommissionTransaction {
  _id: string;
  company: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  role: string;
  sale: {
    _id: string;
    total: number;
    createdAt: string;
    items?: any[];
    customer?: any;
  };
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  periodStart: string;
  periodEnd: string;
  appliedRule: {
    _id: string;
    name?: string;
    targetType: string;
    targetId?: string;
  };
  targetType: string;
  targetId?: string;
  quantityContributed: number;
  cumulativeQuantity: number;
  tierApplied: {
    minQuantity: number;
    maxQuantity: number | null;
    commissionType: 'percentage' | 'fixed';
    value: number;
    minMonths: number;
  };
  baseAmount: number;
  commissionAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';
  approvedAt?: string;
  createdAt: string;
}
interface MyPendingResponse {
  pendingTransactions: CommissionTransaction[];
  summary: Record<
    'pending' | 'approved' | 'paid',
    { count: number; total: number }
  >;
  recentPeriods: Array<{
    _id: { periodStart: string; periodEnd: string };
    totalCommission: number;
    count: number;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface AdminSummaryResponse {
  transactions: CommissionTransaction[];
  totalsByUser: Array<{
    user: { _id: string; name: string; email: string };
    totalCommission: number;
    count: number;
    pending: number;
    approved: number;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface Sale {
  sale: any;
  data: any;
  _id?: string;
  company?: string;                // which company the sale belongs to
  origin?: 'internal' | 'external'; // internal = created by user, external = public portal/webhook
  items: {
    productId: string;
    name: string;
    quantity: number;
    priceAtSale: number;
    itemType: 'Product' | 'Service' | 'Combo' | 'Subscription';
  }[];
  status: 'Pago 100%'| 'Pago 50%'| 'Reserva'| 'Cancelada'| 'Pendente';
  total: number;
  amountPaid: number;
  discount?: {
    code: string;
    amount: number;
  };
  paymentMethod: 'Cash' | 'Wallet' | 'M-Pesa' | 'E-Mola' | 'POS' | 'Transferência';
  walletDeduction?: number;
  customer?: {
    name: string;
    phone: string;
  };
  
  createdBy?: User;  // User who created the sale
  createdAt?: string;
  updatedAt?: string;
  dueDate: string;
  notifiedBefore?: boolean;
  notifiedAfter?: boolean;
}

export interface Coupon {
  _id: string;
  code: string;
  discountType: 'Percentage' | 'Fixed';
  value: number;
  active: boolean;
  expiryDate?: string;
}
// 1. Atualização da Interface Product para suportar múltiplos setores
export interface Product {
  description: any;
  _id: string;
  company: string;
  name: string;
  sku: string;
  category: 
    | 'Restaurante' | 'Construção' | 'Gráfica' | 'Utensílios' | 'Perfumaria' 
    | 'Calçados' | 'Cabelos' | 'Bijuteria' | 'Plantas' | 'Acessórios Auto' 
    | 'Veículos' | 'Informática' | 'Talho' | 'Geral';
  
  // Base Financeira e Stock
  basePrice: number;
  madeToOrder: boolean;
  orderPrice: number;    // valor inicial de encomenda
  deliveryDays: number;
  costPrice?: number;
  promoPrice?: number;
  stockQuantity: number;
  minStockLevel: number;
  unit: string;
  
  // Descrição e Media
  shortDescription: string;
  fullDescription?: string;
  images: string[];
  
  // Status e Métricas
  isFeatured: boolean;
  isArchived: boolean;
  isActive: boolean;
  view_count: number;
  createdAt: string;
  updatedAt: string;

  // --- Campos Específicos por Categoria (Discriminadores) ---
  
 // Restaurante (Atualizado)
  restaurantItemType?: 'Prato' | 'Bebida' | 'Sobremesa' | 'Entrada' | 'Consumível';
  ingredients?: string[];
  allergens?: string[];
  calories?: number;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  preparationTime?: number;
  serves?: number;
  storageCondition?: 'Fresco' | 'Congelado' | 'Ambiente';
  

  // Veículos / Acessórios Auto
  brand?: string;
  model?: string;
  year?: number;
  fuelType?: 'Gasolina' | 'Gasóleo' | 'Híbrido' | 'Elétrico';
  mileage?: number;
  transmission?: 'Manual' | 'Automática';
  compatibility?: string[];

  // Vestuário / Calçados / Cabelos
  size?: string | number | number[];
  gender?: 'Masculino' | 'Feminino' | 'Unissex';
  material?: string;
  color?: string;
  hairType?: 'Natural' | 'Sintético' | 'Humano';
  length?: number;
  texture?: 'Liso' | 'Ondulado' | 'Cacheado' | 'Crespo';

  // Contrução / Utensílios / Gráfica / Talho

  dimensions?: string; // ex: 60x60cm, 12mm x 6m
    weightPerUnit: number; // em kg (crucial para frete)
    coverageArea: number; // m² por caixa/unidade
    resistanceClass: string; // ex: PEI 4, C30, Classe A
    application: string; // ex: Piso, Parede, Estrutural
    isWeatherResistant: boolean; // Resistente a exterior
    technicalDocUrl: string; // Link para PDF da ficha técnica


  printCategory?: 'Papelaria' | 'Têxtil' | 'Grandes Formatos' | 'Brindes' | 'Outros';
  materialSupport?: string; // Papel Couchê, Algodão, Vinil, Cerâmica (Canecas) 
  printTechnique?: string;  // Offset, Digital, Serigrafia, Sublimação, DTF
  colorType?: string;       // 4x0, 4x4, 1 Cor, Full Color
  productionTime?: string;  // Prazo de produção (ex: 3-5 dias úteis)
  minQuantity?: number;     // Quantidade mínima de pedido

 
  olfactiveFamily?: string; // ex: "Amadeirado, Floral, Cítrico"
  topNotes?: string;    // Notas de Saída
  middleNotes?: string[]; // Notas de Coração
  baseNotes?: string[];   // Notas de Fundo
 
  // Calçados

  sizes: string; // Array de tamanhos disponíveis
  colors: string; // Cores disponíveis
  upperMaterial: string; // Material exterior (Couro, Sintético, Lona)
  soleMaterial: string;  // Material da sola (Borracha, EVA, PVC)
  liningMaterial: string; // Material forro interno
  closureType: string;   // Tipo de fecho (Atacadores, Velcro, Slip-on)
  isOrthopedic: boolean;

  // Cabelos e Extensões

  origin: string; // ex: Brasileiro, Indiano, Vietnamita
  weight: number; // em gramas 
  applicationMethod: string; // ex: Queratina, Tic-Tac, Fita, Tecido
  isChemicalTreated: boolean

  // Bijuteria e Acessórios


    plating: string;  // ex: Banho de Ouro 18k, Prata 925, Ródio
    stoneType: string; // ex: Zircónia, Pérola Cultivada, Cristal
    mainColor: string;
    isHypoallergenic: boolean;
    accessoryType: 'Anel' | 'Colar' | 'Brincos' | 'Pulseira' | 'Tornozeleira' | 'Conjunto';
    sizeLength: string; // ex: "45cm + 5cm extensor" ou "Ajustável"
    careInstructions: string; // Notas breves de conservação

  
  // 9. Plantas e Jardim
  // Plantas e Jardinagem

    scientificName: string;
    sunlightRequirement: 'Sol Pleno' | 'Meia Sombra' | 'Sombra' | 'Luz Indireta';
    wateringFrequency: string; // ex: "2-3 vezes por semana"
    isToxicToPets: boolean;
    isToxicToChildren: boolean;
    potSize: string; // ex: "Vaso 14", "Pote 6"
    currentHeight: number; // em cm
    includesPot: boolean;
    careLevel: 'Fácil' | 'Médio' | 'Avançado';
// Veículos (Carros, Motos, Barcos)

  conservationState: 'Fresco' | 'Congelado' | 'Maturado (Dry Aged)' | 'Vácuo';
   
  maturationDays: number; // Dias de maturação se aplicável
  traceabilityCountry: string; // Origem/Nascimento do animal
  isHalal: boolean;
  isOrganic: boolean;
  fatContent: string; // ex: Magra, Média, Gorda

  
 
  engineSize: string; // Cilindrada (ex: 2000 cm3)
  horsePower: number; // Cavalos (cv)
  vinNumber: string;  // Número de Quadro (importante para transparência)
  colorExterior: string;
  doors: number; // Número de portas
  features: string[]; // Ar condicionado, GPS, Bluetooth, etc.
  condition: 'Novo' | 'Usado' | 'Seminovo'; // default: 'Usado'

  
  // Perfumaria / Talho / Gráfica
  volume?: number | string;
  concentration?: string;
  animalOrigin?: 'Bovino' | 'Suíno' | 'Caprino' | 'Aves';
  cutType?: string;
  paperType?: string;
  finish?: string;
}
// Perfumaria e Cosméticos




export interface BankAccount {
  _id?: string;
  nibOrIban?: string;
  accountNumber?: string;
  accountHolder?: string;
  bankName?: string;
  isPrimary?: boolean;
}

export interface MobileWallets {
  mpesa?: string;
  emola?: string;
  mkesh?: string;
}

export interface Company {
  filter(arg0: (c: any) => boolean): unknown;
  referralProgramEnabled: boolean;
  _id: string;
  name: string;
  email: string;
  phone?: string;
  website?: string;
  logo?: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  subscription: String;
  plan: string;
  
  taxId?: string;
  vatNumber?: string;
  currency: string;
  taxRate: number;
  paymentTerms: string;

  bankAccounts?: BankAccount[];
  mobileWallets?: MobileWallets;
  debitoMerchantId?: string;
  debitoPat?: string;
  debitoWebhookSecret?: string;
}

export interface Client {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  contactPerson?: string;
  billingAddress: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  taxId?: string;
  vatNumber?: string;
  paymentTerms: string;
  currency: string;
  balance?: number; // wallet balance
  notes?: string;
  createdBy: User;
  isActive: boolean;
  isWalkIn?: boolean;
}

export interface Supplier {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  contactPerson?: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  taxId?: string;
  vatNumber?: string;
  paymentTerms: string;
  currency: string;
  notes?: string;
  isActive: boolean;
}

export interface LineItem {
  itemType: string;
  itemId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
}

export interface Document {
  requisition: any;
  _id: string;
  type: 'invoice' | 'quotation' | 'worksheet' | 'purchase_order';
  number: string;
  client?: Client;
  supplier?: Supplier;
  status: string;
  issueDate: string;
  dueDate?: string;
  validUntil?: string;
  currency: string;
  paymentTerms: string;
  lineItems: LineItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  notes?: string;
  terms?: string;
  template?: Template;
  origin?: 'internal' | 'external' | 'partner_portal';
  pdfPath?: string;
  shareToken?: string;
  shareExpiresAt?: string;
  auditTrail: AuditEntry[];
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  _id: string;
  name: string;
  description?: string;
  documentTypes: string[];
  htmlContent: string;
  cssContent?: string;
  isDefault: boolean;
  isBuiltIn: boolean;
  preview?: string;
  createdBy: User;
  // Visibility / monetization
  isPublic?: boolean;
  isPaid?: boolean;
  price?: number; // single unique price when template is paid (in company currency)
  isPurchased?: boolean; // whether current company purchased this template
}

export interface AuditEntry {
  action: string;
  user: User;
  timestamp: string;
  details?: string;
}
export interface Service {
  _id?: string;
  name: string;
  images: string[];
  description: string;
  unit: 'unit' | 'box' | 'set' | 'monthly' | 'weekly' | 'daily' | 'yearly';
  basePrice: number;
  targetAudience: string;
  allowedInstallments: number;
  penaltyPercentagePerInstallment: number;
    includedItems: { description: string; quantity: number; note?: string }[];
  isActive: boolean;
}
export interface RequisitionItem {
  service: string | Service;
  quantity: number;
  priceAtTime?: number;
}
export interface Requisition {
  baseTotal: number | undefined;
  currency: string;
  _id?: string;
  number?: string;
  client: string | Client;
  items: RequisitionItem[];
  requisition?: string | Requisition;
  requestedInstallments: number;
  deliveryDate?: string;
  notes?: string;
  finalTotal?: number;
  status: 'pending' | 'approved' | 'rejected' | 'converted_to_invoice';
  requisitionIntent: 'quotation' | 'invoice' | 'unspecified';
  createdBy?: User;  // User who created the requisition
  createdAt?: string;
  updatedAt?: string;
}
export interface BuiltInPortalVariant {
  _id?: string;
  variantId: string;
  name: string;
  description?: string;
  previewImageUrl?: string;
  category?: string;
  tags?: string[];
  isActive: boolean;
  isPublic: boolean;
  isPaid: boolean;
  price: number;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}
type ApiRequestOptions = RequestInit & { public?: boolean };

class ApiClient {
  interceptors: any;
  get(arg0: string): any {
    throw new Error('Method not implemented.');
  }
    post(arg0: string, arg1: { itemId: any; name: any; price: any; qty: number; type: string; }) {
        throw new Error('Method not implemented.');
    }
    delete(arg0: string) {
        throw new Error('Method not implemented.');
    }
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const { public: isPublic, ...fetchOptions } = options;
    const url = `${this.baseURL}${endpoint}`;
    const token = !isPublic ? localStorage.getItem('accessToken') : null;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...fetchOptions,
    };

    // Add workspace header if active
    try {
      const stored = localStorage.getItem('activeWorkspace');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.companyId) {
          config.headers = {
            ...(config.headers as Record<string, string>),
            'x-workspace-company-id': parsed.companyId,
          };
        }
      }
    } catch (e) {
      // ignore parse errors
    }

    try {
      const response = await fetch(url, config);

      if (response.status === 401 && !isPublic) {
        // Try to refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const refreshResponse = await fetch(`${this.baseURL}/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refreshToken }),
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              localStorage.setItem('accessToken', refreshData.accessToken);
              localStorage.setItem('refreshToken', refreshData.refreshToken);

              // Retry original request
              config.headers = {
                ...config.headers,
                Authorization: `Bearer ${refreshData.accessToken}`,
              };
              const retryResponse = await fetch(url, config);
              if (!retryResponse.ok) {
                throw new Error(`HTTP error! status: ${retryResponse.status}`);
              }
              return retryResponse.json();
            } else {
              throw new Error('Token refresh failed');
            }
          } catch (error) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            throw error;
          }
        } else {
          localStorage.removeItem('accessToken');
          throw new Error('No refresh token available - 401 Unauthorized');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403 && errorData.subscriptionRequired && errorData.redirectTo) {
          window.location.href = errorData.redirectTo;
          throw new Error('Redirecionando para assinatura...');
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  private async requestBlob(endpoint: string, options: RequestInit = {}): Promise<Blob> {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('accessToken');

    const config: RequestInit = {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        // Try to refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const refreshResponse = await fetch(`${this.baseURL}/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refreshToken }),
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              localStorage.setItem('accessToken', refreshData.accessToken);
              localStorage.setItem('refreshToken', refreshData.refreshToken);

              // Retry original request
              config.headers = {
                ...config.headers,
                Authorization: `Bearer ${refreshData.accessToken}`,
              };
              const retryResponse = await fetch(url, config);
              if (!retryResponse.ok) {
                throw new Error(`HTTP error! status: ${retryResponse.status}`);
              }
              return retryResponse.blob();
            } else {
              throw new Error('Token refresh failed');
            }
          } catch (error) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            throw error;
          }
        } else {
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
          throw new Error('No refresh token available');
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.blob();
    } catch (error) {
      console.error('API requestBlob failed:', error);
      throw error;
    }
  }

  private async requestText(endpoint: string, options: RequestInit = {}): Promise<string> {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('accessToken');

    const config: RequestInit = {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        // Try to refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const refreshResponse = await fetch(`${this.baseURL}/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refreshToken }),
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              localStorage.setItem('accessToken', refreshData.accessToken);
              localStorage.setItem('refreshToken', refreshData.refreshToken);

              // Retry original request
              config.headers = {
                ...config.headers,
                Authorization: `Bearer ${refreshData.accessToken}`,
              };
              const retryResponse = await fetch(url, config);
              if (!retryResponse.ok) {
                throw new Error(`HTTP error! status: ${retryResponse.status}`);
              }
              return retryResponse.text();
            } else {
              throw new Error('Token refresh failed');
            }
          } catch (error) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            throw error;
          }
        } else {
          localStorage.removeItem('accessToken');
          throw new Error('No refresh token available');
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.text();
    } catch (error) {
      console.error('API requestText failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  auth = {
    login: (email: string, password: string, rememberMe: boolean = false) =>
    this.request<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe }), // Agora envia o rememberMe
    }),

    // ─────────────────────────────────────────────────────────────
    // NOVO: Registo público com verificação de email
    // ─────────────────────────────────────────────────────────────
    register: (data: any) =>
      this.request<{ message: string; email: string }>('/users/register', {
        method: 'POST',
        body: JSON.stringify(data),
        public: true,                    // ← importante: não envia token
      }),

    // Novo método para verificar o código de email
   verifyEmail: (email: string, code: string) =>
  this.request<{ message: string }>('/users/verify-email', {   // ← /users em vez de /auth
    method: 'POST',
    body: JSON.stringify({ email, token: code }),
    public: true,
  }),

    getProfile: () => this.request<User>('/auth/me'),

    logout: () => this.request('/auth/logout', { method: 'POST' }),
  // Novos métodos para recuperação de senha
  forgotPassword: (email: string) =>
    this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (data: any) =>
    this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data), // Contém email, code e newPassword
    }),

};

  // Company endpoints
  company = {
    getProfile: () => this.request<Company>('/company/profile'),
    getFullProfile: () => 
    this.request<any>('/company/profile?populate=subscription.plan'),
    getReferralEnabledCompanies: () => 
    this.request<CompanyOption[]>('/company/referral-enabled'),
    updateProfile: (data: Partial<Company>) =>
      this.request<Company>('/company/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    getSettings: () => this.request<any>('/company/settings'),
    updateSettings: (data: any) =>
      this.request<any>('/company/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
      getPublicPortalStatus: () => api.request('/company/public-portal/status'),
publishPublicPortal: async (data: { variant: string; customSlug?: string }) => {
  const token = localStorage.getItem('accessToken');  // ← usa a chave correta

  if (!token) {
    throw new Error('Não autenticado – por favor faz login novamente');
  }

  const res = await fetch(`${API_BASE_URL}/company/public-portal/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) {
      throw new Error('Sessão expirada – por favor faz login novamente');
    }
    throw new Error(err.message || 'Falha ao publicar o portal');
  }

  return res.json();
},
unpublishPublicPortal: async () => {
  const res = await fetch(`${API_BASE_URL}/company/public-portal/unpublish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) throw new Error('Falha ao despublicar');
  return res.json();
},
uploadLogo: async (file: File) => {
  const formData = new FormData();
  formData.append('logo', file); // 'logo' deve coincidir com o nome esperado no backend (upload.single('logo'))

  const token = localStorage.getItem('accessToken');

  const response = await fetch(`${this.baseURL}/company/upload-logo`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // IMPORTANTE: Não defina 'Content-Type': 'multipart/form-data' aqui.
      // Deixe o navegador definir o header automaticamente com o boundary correto.
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Falha no upload do logo');
  }

  return response.json();
},
  // ── Subscription Methods ─────────────────────────────────────────────
    /**
     * Obter subscrição atual da empresa
     */
    getSubscription: () => 
      this.request<Subscription>('/subscriptions/current'),

    /**
     * Obter planos disponíveis
     */
    getAvailablePlans: () => 
      this.request<SubscriptionPlan[]>('/subscriptions/plans'),

    /**
     * Ativar plano básico (gratuito)
     */
    activatePlan: (planId: string) => 
      this.request<Subscription>('/subscriptions/activate', {
        method: 'POST',
        body: JSON.stringify({ planId }),
      }),

    /**
     * Cancelar subscrição ativa
     */
    cancelSubscription: () => 
      this.request<Subscription>('/subscriptions/cancel', {
        method: 'POST',
      }),
getUsageLimits: () => this.request('/company/usage-limits'),
    /**
     * Atualizar configurações da subscrição
     */
    updateSubscription: (data: SubscriptionUpdateData) => 
      this.request<Subscription>('/subscriptions/current', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
      getPortalContent: async () => api.request('/company/portal-content', { method: 'GET' }),
updatePortalContent: async (data) => api.request('/company/portal-content', { method: 'PUT', body: JSON.stringify(data) }),
};

  // Users endpoints
  users = {
    // List users for the company (admin)
    getAll: () => this.request<User[]>('/users'),
    getById: (id: string) => this.request<User>(`/users/${id}`),
    create: (data: Partial<User> & { password?: string }) =>
      this.request<User>('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<User> & { password?: string }) =>
      this.request<User>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
      // === NOVAS ROTAS DE PERFORMANCE ===
  getAllPerformance: () => this.request<any>('/users/performance'),
  
  getMyPerformance: () => this.request<any>('/users/my-performance'),
    delete: (id: string) => this.request(`/users/${id}`, { method: 'DELETE' }),
  };

  // Cash closures endpoints
  cashClosures = {
    // regular closure creation (closing day)
    create: (date?: string, notes?: string) =>
      this.request<any>('/cash-closures', {
        method: 'POST',
        body: JSON.stringify({ date, notes }),
      }),
    // open request for new register
    openRequest: (initialFloat?: number, notes?: string) =>
      this.request<any>('/cash-closures/open', {
        method: 'POST',
        body: JSON.stringify({ initialFloat, notes }),
      }),
    // change open request status (admin/supervisor)
    updateOpenStatus: (id: string, status: 'approved'|'denied') =>
      this.request<any>(`/cash-closures/${id}/open-status`, {
        method: 'PUT',
        body: JSON.stringify({ openStatus: status }),
      }),
    getMine: () => this.request<any>('/cash-closures/mine'),
    getAll: (params?: any) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request<any>(`/cash-closures${query}`);
    },
    confirm: (id: string, countedTotal?: number, notes?: string) =>
      this.request<any>(`/cash-closures/${id}/confirm`, {
        method: 'PUT',
        body: JSON.stringify({ countedTotal, notes }),
      }),
    // Expenses endpoints
    createExpense: (closureId: string, description: string, amount: number, category: string = 'other') =>
      this.request<any>(`/cash-closures/${closureId}/expenses`, {
        method: 'POST',
        body: JSON.stringify({ description, amount, category }),
      }),
    getExpenses: (closureId: string) =>
      this.request<any>(`/cash-closures/${closureId}/expenses`),
    deleteExpense: (closureId: string, expenseId: string) =>
      this.request<any>(`/cash-closures/${closureId}/expenses/${expenseId}`, { method: 'DELETE' }),
  };




  // Documents endpoints
  documents = {
    getAll: (params?: any) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request<{ documents: Document[]; pagination: any }>(`/documents${query}`);
    },
    getById: (id: string) => this.request<Document>(`/documents/${id}`),
    create: (data: Partial<Document>) =>
      this.request<Document>('/documents', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Document>) =>
      this.request<Document>(`/documents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: string) =>
      this.request<Document>(`/documents/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    delete: (id: string) => this.request(`/documents/${id}`, { method: 'DELETE' }),
    generateShare: (id: string) =>
      this.request<{ shareUrl: string; expiresAt: string }>(`/documents/${id}/share`, {
        method: 'POST',
      }),
    createShareToken: async (documentId: string, payload: {
    expiresInDays?: number;
    recipientEmail?: string;
  } = {}): Promise<ShareTokenResponse> => {
    return this.request(`/documents/${documentId}/share`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Envia email com link de partilha (usa backend para renderizar email)
   * POST /api/documents/:id/share/email
   */
  sendShareEmail: async (documentId: string, payload: ShareDocumentPayload): Promise<{ success: boolean; message: string }> => {
    return this.request(`/documents/${documentId}/share/email`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Lista todos os tokens de partilha ativos de um documento
   * GET /api/documents/:id/shares
   */
  getShares: async (documentId: string): Promise<DocumentShareInfo[]> => {
    return this.request(`/documents/${documentId}/shares`);
  },

  /**
   * Revoga um token de partilha específico
   * DELETE /api/documents/:docId/shares/:token
   */
  revokeShare: async (documentId: string, token: string): Promise<{ message: string }> => {
    return this.request(`/documents/${documentId}/shares/${token}`, {
      method: 'DELETE',
    });
  },
};

// ── shareApi (para acesso público sem autenticação) ────────────────────────
// Normalmente usado apenas no frontend público / visualização externa

share = {
  getPublicDocument: async (token: string): Promise<any> => {
    // Nota: este endpoint NÃO deve exigir autenticação JWT
    return this.request(`/share/${token}`, { method: 'GET' });
  },
  // Para documentos antigos (se ainda usares)
  getSharedDocument: (token: string) =>
    this.request<any>(`/share/${token}`, { public: true }),

  // ← NOVA: Para propostas (o que estamos a usar agora)
  getSharedProposal: (token: string) =>
    this.request<any>(`/proposals/share/${token}`, { public: true }),
  };

  // Clients endpoints
  clients = {
    getAll: (params?: any) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request<{ clients: Client[]; pagination: any }>(`/clients${query}`);
    },
    getById: (id: string) => this.request<Client>(`/clients/${id}`),
    create: (data: Partial<Client>) =>
      this.request<Client>('/clients', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Client>) =>
      this.request<Client>(`/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    topUp: (id: string, amount: number) =>
      this.request<Client>(`/clients/${id}/top-up`, {
        method: 'PUT',
        body: JSON.stringify({ amount }),
      }),
    delete: (id: string) => this.request(`/clients/${id}`, { method: 'DELETE' }),
  };

  // Suppliers endpoints
  suppliers = {
    getAll: (params?: any) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request<{ suppliers: Supplier[]; pagination: any }>(`/suppliers${query}`);
    },
    getById: (id: string) => this.request<Supplier>(`/suppliers/${id}`),
    create: (data: Partial<Supplier>) =>
      this.request<Supplier>('/suppliers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Supplier>) =>
      this.request<Supplier>(`/suppliers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) => this.request(`/suppliers/${id}`, { method: 'DELETE' }),
  };

  // Templates endpoints
  templates = {
    getAll: (params?: any) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request<Template[]>(`/templates${query}`);
    },
    getById: (id: string) => this.request<Template>(`/templates/${id}`),
    create: (data: Partial<Template>) =>
      this.request<Template>('/templates', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      setDefault: (id: string) => this.request<Template>(`/templates/${id}`, { method: 'PUT' }),
    update: (id: string, data: Partial<Template>) =>
      this.request<Template>(`/templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) => this.request(`/templates/${id}`, { method: 'DELETE' }),
  };

  // Public portal built-in templates (and company-owned)
  publicPortalTemplates = {
    getAll: (params?: any) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request<any>(`/public-portal-templates${query}`);
    },
    getById: (id: string) => this.request<any>(`/public-portal-templates/${id}`),
    create: (data: any) =>
      this.request<any>('/public-portal-templates', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      this.request<any>(`/public-portal-templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) => this.request(`/public-portal-templates/${id}`, { method: 'DELETE' }),
  };

  // PDF endpoints
// PDF endpoints
pdf = {
  /**
   * Gera e descarrega o PDF dinamicamente usando o backend Puppeteer.
   * Rota no backend: GET /generate/:documentId
   */
  generateAndDownload: async (documentId: string): Promise<{ blob: Blob; filename: string }> => {
    try {
      // Alterado para /generate para disparar a lógica do Puppeteer em pdf.cjs
      const blob = await this.requestBlob(`/pdf/generate/${documentId}`, {
        timeout: 45000, 
      });

      if (!blob || blob.size < 2000) {
        throw new Error('O PDF recebido está vazio ou corrompido');
      }

      // O backend define o nome do ficheiro, mas podemos gerar um fallback
      return {
        blob,
        filename: `Documento_${documentId.slice(-6)}_${Date.now()}.pdf`,
      };
    } catch (err) {
      console.error(`Falha ao gerar PDF para ${documentId}:`, err);
      throw new Error('Não foi possível gerar o PDF');
    }
  },

  /**
   * Faz o download de um PDF que já existe no disco do servidor.
   * Rota no backend: GET /download/:documentId
   */
  downloadExistingDocument: async (documentId: string): Promise<{ blob: Blob; filename: string }> => {
    return await this.requestBlob(`/pdf/download/${documentId}`);
  },

  /**
   * Preview de documento (HTML)
   * Rota no backend: GET /preview/:documentId
   */
  getDocumentPreviewHtml: async (documentId: string): Promise<string> => {
    try {
      return await this.requestText(`/pdf/preview/${documentId}`, { timeout: 20000 });
    } catch (err) {
      console.error(`Erro ao obter HTML preview do documento ${documentId}:`, err);
      throw new Error('Não foi possível carregar a pré-visualização');
    }
  },

  /**
   * URL para visualizar no browser (via iframe ou nova aba)
   */
  getDocumentPreviewUrl: (documentId: string): string => {
    const token = localStorage.getItem('accessToken') || '';
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${this.baseURL}/pdf/preview/${documentId}${query}`;
  }
};
  // Inside your ApiClient class, add:
services = {
    getAll: () => this.request<Service[]>('/services'),
    getById: (id: string) => this.request<Service>(`/services/${id}`),
    create: (data: Partial<Service>) =>
      this.request<Service>('/services', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Service>) =>
      this.request<Service>(`/services/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) => this.request(`/services/${id}`, { method: 'DELETE' }),
  };

requisitions = {
  getAll: () => this.request<Requisition[]>('/requisitions'),
  getById: (id: string) => this.request<Requisition>(`/requisitions/${id}`),
  create: (data: any) => this.request<Requisition>('/requisitions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => this.request<Requisition>(`/requisitions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
 submitPublic: (data: any) => 
  fetch(`${API_BASE_URL}/requisitions/public-submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(async res => {
    if (!res.ok) {
      let errorMessage = 'Submission failed';
      try {
        const errorBody = await res.json();
        errorMessage = errorBody.message 
          || errorBody.error 
          || errorBody.errors?.[0]?.msg 
          || `HTTP ${res.status} - ${res.statusText}`;
      } catch (e) {
        // fallback if not json
        errorMessage = `HTTP ${res.status} - Could not parse error response`;
      }
      throw new Error(errorMessage);
    }
    return res.json();
  }),
  updateStatus: (id: string, status: string) =>
    this.request<Requisition>(`/requisitions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  delete: (id: string) => this.request(`/requisitions/${id}`, { method: 'DELETE' }),
};

// simple checkout integration for public portal and admin
checkout = {
  process: (payload: CheckoutPayload, isPublic = false) =>
    this.request<CheckoutResponse>('/checkout/order', {
      method: 'POST',
      body: JSON.stringify(payload),
      ...(isPublic ? { public: true } : {}),
    }),
     template: (payload: CheckoutPayload, isPublic = false) =>
    this.request<CheckoutResponse>('/checkout/template', {
      method: 'POST',
      body: JSON.stringify(payload),
      ...(isPublic ? { public: true } : {}),
    }),
     transactionStatus: (ref: string) =>
    this.request<{found: boolean; transaction?: any; externalRef?: string}>(
      `/checkout/transaction-status?ref=${encodeURIComponent(ref)}`,
      { public: true }
    ),
     finalize: (ref: string) =>
    this.request<{found: boolean; transaction?: any; externalRef?: string; message?: string}>(
      '/checkout/finalize',
      { method: 'POST', body: JSON.stringify({ ref }), public: true }
    ),
};


  // Add near the other grouped endpoints
// api.ts (add/update in public section)

// api.ts (apenas a parte relevante – substitui o bloco public existente)

// api.ts – full relevant part (replace your public & company sections)
products = {
    getAll: (params?: { category?: string; isArchived?: boolean }) => {
      const query = new URLSearchParams();
      if (params?.category) query.append('category', params.category);
      if (params?.isArchived !== undefined) query.append('isArchived', String(params.isArchived));
      
      return this.request<Product[]>(`/products?${query.toString()}`);
    },
    getById: (id: string) => this.request<Product>(`/products/${id}`),
    create: (data: Partial<Product>) => this.request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: Partial<Product>) => this.request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    archive: (id: string) => this.request<Product>(`/products/${id}/archive`, {
      method: 'PATCH',
    }),
    delete: (id: string) => this.request<void>(`/products/${id}`, {
      method: 'DELETE',
    }),
  };
public = {
  logSearch: (slug: string, data: { term: string; catalog?: string }) =>
    this.request('/public/portal/' + slug + '/search', {
      method: 'POST',
      body: JSON.stringify(data),
      public: true,
    }),
  getPortal: async (slug: string): Promise<{
    company: {
      _id: string;
      name: string;
      logo?: string;
      currency?: string;
      bankAccounts?: BankAccount[];
      mobileWallets?: MobileWallets[];
      publicPortal?: {
        enabled: boolean;
        slug: string;
        variant: string;
        variantPurchased?: boolean;
        variantPricePaid?: number;
        variantPurchasedAt?: string;
        customDomain?: string;
        subdomainPrefix?: string;
      };
    };
    services: Service[];
    products: Product[];
    bundles: Bundle[];
    formToken: string;
    portalContent: any;  // Adicionado para incluir o conteúdo dinâmico do portal
  }> => {
    const res = await fetch(`${API_BS_URL}/public/portal/${encodeURIComponent(slug)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // NO Authorization here – intentionally public
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Falha ao carregar portal (${res.status})`);
    }

    return res.json();
  },
};

// Gestão de Combos e Subscrições (Bundles)
  bundles = {
    getAll: (type?: 'Combo' | 'Subscription') => 
      this.request<Bundle[]>(`/bundles${type ? `?type=${type}` : ''}`),
    
    getById: (id: string) => 
      this.request<Bundle>(`/bundles/${id}`),
    
    create: (data: Partial<Bundle>) => 
      this.request<Bundle>('/bundles', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

      archive: (id: string) => 
      this.request<Bundle>(`/bundles/${id}/archive`, {
        method: 'PATCH',
      }),
    
    update: (id: string, data: Partial<Bundle>) => 
      this.request<Bundle>(`/bundles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id: string) => 
      this.request<{ message: string }>(`/bundles/${id}`, { 
        method: 'DELETE' 
      }),
  };

  // Sistema de Vendas (PDV)
 sales = {
  // Agora aceita filtros opcionais
  getAll: (filters?: SaleFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    return this.request<Sale[]>(`/sales?${params.toString()}`);
  },

  getSellers: async () => {
    const response = await api.request('/sales/sellers', {
      method: 'GET'
    });
    return response;
  },


 

   getPartnerStats: async () => {
    const response = await api.request('/sales/partner-stats', {
      method: 'GET'
    });
    return response;
  },
  getPartenerTargets: async () => {
    const response = await api.request('/admin/my-goals-progress', {
      method: 'GET'
    });
    return response;
  },

  // daily series for charts
  getDailyStats: (days?: number, groupBy?: string) =>
    this.request<SalesDaily[]>(`/sales/stats/daily?days=${days || 7}`),

  create: (data: Sale) => 
    this.request<Sale>('/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Cancelamento lógico (usuário comum)
  cancel: (id: string) =>
    this.request<any>(`/sales/${id}/cancel`, {
      method: 'PUT',
    }),

  // Marcar pagamento remanescente como concluído
  payRemaining: (id: string) =>
    this.request<any>(`/sales/${id}/pay-remaining`, {
      method: 'PUT',
      // no body sent, server does not need it
    }),
  // Compartilhar fatura por email (aceita opcionalmente destinatário e cc)
  share: (id: string, body?: { to?: string; cc?: string }) =>
    this.request<any>(`/sales/${id}/share`, {
      method: 'PUT',
      // fetch expects string or FormData; stringify JSON body to avoid '[object Object]' error
      body: body ? JSON.stringify(body) : undefined,
    }),
  // Fazer download da fatura em PDF (usa o mesmo endpoint que documentos)
  downloadInvoice: async (id: string) => {
    try {
      const blob = await this.requestBlob(`/pdf/generate/${id}`);
      return { blob, filename: `Fatura_${id.slice(-6)}.pdf` };
    } catch (err: any) {
      // If server indicates generation moved to client (501 Not Implemented), fallback to preview + html2pdf
      const message = err && err.message ? err.message : '';
      if (
        message.includes('501') ||
        message.includes('Not Implemented') ||
        message.includes('500') ||
        message.includes('Internal Server Error')
      ) {
        // Let the caller perform client-side generation; return a special flag
        return { fallbackClient: true } as any;
      }
      throw err;
    }
  },
  
  // Enviar lembrete / aviso atrasado manualmente
  remind: (id: string) =>
    this.request<any>(`/sales/${id}/remind`, {
      method: 'PUT'
    }),

  // Eliminação física (apenas admin)
  delete: (id: string) =>
    this.request<any>(`/sales/${id}`, {
      method: 'DELETE',
    }),

  getOnlineAnalytics: () =>
    this.request<OnlineAnalytics>('/sales/online-analytics'),

  getStats: () => 
    this.request<SalesStats>('/sales/stats'),
};

  // Sistema de Cupões
  coupons = {
    getAll: () => 
      this.request<Coupon[]>('/coupons'),
    
    validate: (code: string) => 
      this.request<{ valid: boolean; value: number; discountType: string; message?: string }>(
        `/coupons/validate/${code.toUpperCase()}`
      ),
    
    create: (data: Partial<Coupon>) => 
      this.request<Coupon>('/coupons', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      
    delete: (id: string) => 
      this.request<any>(`/coupons/${id}`, { 
        method: 'DELETE' 
      }),
  };

  // Dentro da classe ApiClient

// Dentro de api.ts, no bloco adminBuiltInVariants = { ... }

adminBuiltInVariants = {
  // ... funções existentes que já tens ...
  getAll: async () => this.request('/admin/builtin-variants', { method: 'GET' }),
  getById: async (variantId) => this.request(`/admin/builtin-variants/${variantId}`, { method: 'GET' }),
  create: async (data) => this.request('/admin/builtin-variants', { method: 'POST', body: JSON.stringify(data) }),
  update: async (variantId, data) => this.request(`/admin/builtin-variants/${variantId}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: async (variantId) => this.request(`/admin/builtin-variants/${variantId}`, { method: 'DELETE' }),

  // NOVA FUNÇÃO: upload de imagem de preview para uma variante específica
  uploadPreviewImage: async (variantId: string, file: File): Promise<{ url: string; message: string }> => {
    const formData = new FormData();
    formData.append('file', file);  // nome 'file' — o backend espera este nome

    // Importante: NÃO definir Content-Type manualmente quando usas FormData
    return this.request(`/admin/builtin-variants/${encodeURIComponent(variantId)}/images`, {
      method: 'POST',
      body: formData,
      // Se o teu ApiClient adiciona Authorization automaticamente → ótimo
      // Caso contrário, podes forçar aqui:
      // headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
    });
  },
};




 

  // Goals / Metas e Objectivos
  goals = {
    // Goals CRUD
    getAll: (year?: number, status?: string) => {
      const params = new URLSearchParams();
      if (year) params.append('year', year.toString());
      if (status) params.append('status', status);
      return this.request<Goal[]>(`/goals?${params.toString()}`);
    },
    getById: (id: string) => this.request<Goal>(`/goals/${id}`),
    create: (data: Partial<Goal>) =>
      this.request<Goal>('/goals', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Goal>) =>
      this.request<Goal>(`/goals/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
      

    // Distributions
    getDistributions: (goalId: string) =>
      this.request<GoalDistribution[]>(`/goals/${goalId}/distributions`),
    createDistribution: (goalId: string, data: Partial<GoalDistribution>) =>
      this.request<GoalDistribution>(`/goals/${goalId}/distributions`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
getAllItemsProjection: async (goalId: string) => {
  // Use 'this.request' instead of 'api.get'
  return this.request<any>(`/goals/${goalId}/projection/all-items`, {
    method: 'GET'
  });
},

    updateDistribution: (goalId: string, distId: string, data: Partial<GoalDistribution>) =>
      this.request<GoalDistribution>(`/goals/${goalId}/distributions/${distId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deleteDistribution: (goalId: string, distId: string) =>
      this.request(`/goals/${goalId}/distributions/${distId}`, { method: 'DELETE' }),

    // Performance
    getPerformance: (goalId: string) =>
      this.request<any>(`/goals/${goalId}/performance`),
    getBreakdown: (goalId: string) =>
      this.request<any>(`/goals/${goalId}/breakdown`),
    getBreakdownItems: (goalId: string, itemType: string) =>
      this.request<any>(`/goals/${goalId}/breakdown/${itemType}/items`),

    // daily stats for charts
    getDailyStats: (days?: number) =>
      this.request<SalesDaily[]>(`/sales/stats/daily?days=${days || 7}`),
  };

  // ADICIONE ESTE MÉTODO:
  async patch<T>(endpoint: string, body: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  // Customer Analytics - Unit Economics
  customers = {
    getAnalytics: (limit?: number, sortBy?: 'revenue' | 'count' | 'frequency') => {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (sortBy) params.append('sortBy', sortBy);
      return this.request<CustomerAnalyticsResponse>(`/customers/analytics?${params.toString()}`);
    },
    getBreakdown: () => this.request<CustomerSourceBreakdown[]>(`/customers/breakdown`),
    getDetailedStats: (customerId: string) =>
      this.request<CustomerDetailedStats>(`/customers/${customerId}/stats`),
      getList: () => this.request<CustomerClient[]>(`/customers/list`),
      getIndividualStats: (customerId: string) =>
        this.request<IndividualCustomerStats>(`/customers/${customerId}/individual-stats`),
      getPaymentAnalysis: () =>
        this.request<PaymentAnalysisResult[]>(`/customers/payment-analysis/all`),
  };
// api.ts
leads = {
  getAll: (params: any) => 
    api.request<Lead[]>('/leads', { method: 'GET', params }),

  create: (data: Lead) => 
    api.request<Lead>('/leads', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Lead>) => 
    api.request<Lead>(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  updateStage: (id: string, stage: LeadStage) => 
    api.request<Lead>(`/leads/${id}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }) }),

  convert: (id: string) => 
    api.request(`/leads/${id}/convert`, { method: 'POST' }),

  delete: (id: string) => 
    api.request(`/leads/${id}`, { method: 'DELETE' }),
};
  // Pending Payment Rooms
 // Dentro do objeto pendingRooms (substitui o removeItem atual)
pendingRooms = {
  create: (data: { clientName: string; clientPhone: string }) =>
    this.request<any>('/pending-rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAll: (status?: string) => {
    const params = status ? `?status=${status}` : '';
    return this.request<any[]>(`/pending-rooms${params}`);
  },

  getById: (roomId: string) =>
    this.request<any>(`/pending-rooms/${roomId}`),

  addItem: (roomId: string, item: any) =>
    this.request<any>(`/pending-rooms/${roomId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  // ← ALTERADO / MELHORADO
  removeItem: (roomId: string, itemId: string, reason?: string) => {
    const url = reason
      ? `/pending-rooms/${roomId}/items/${itemId}?reason=${encodeURIComponent(reason)}`
      : `/pending-rooms/${roomId}/items/${itemId}`;

    return this.request<any>(url, { method: 'DELETE' });
  },

 closeRoom: (roomId: string, status: string, notes?: string, payload: Record<string, any> = {}) =>
  this.request<any>(`/pending-rooms/${roomId}/close`, {
    method: 'POST',
    body: JSON.stringify({ status, notes, ...payload }),
  }),

  getByTicket: (ticketCode: string) =>
    this.request<any>(`/pending-rooms/ticket/${ticketCode}`),
};

// ── Roles API ────────────────────────────────────────────────────────────────
roles = {
  /**
   * Lista todos os roles customizados da empresa logada
   * GET /api/roles
   */
  getAll: async (): Promise<{
    map(arg0: (role: any) => { value: any; label: any; }): unknown; roles: any[] 
}> => {
    return api.request('/roles', { method: 'GET' });
  },

  /**
   * Cria um novo role personalizado
   * POST /api/roles
   */
  create: async (data: {
    name: string;
    description?: string;
    allowedMenuItems?: string[];
  }): Promise<{ role: any }> => {
    return api.request('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getById: async (roleId: string): Promise<{ role: any }> => {
  return api.request(`/roles/details/${roleId}`, { method: 'GET' });
},

  /**
   * Atualiza permissões/descrição de um role existente
   * PUT /api/roles/:roleName
   */
  update: async (
    roleName: string,
    data: {
      allowedMenuItems?: string[];
      description?: string;
      isActive?: boolean;
    }
  ): Promise<{ role: any }> => {
    return api.request(`/roles/${encodeURIComponent(roleName)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Remove um role
   * DELETE /api/roles/:roleName
   */
  delete: async (roleName: string): Promise<{ message: string }> => {
    return api.request(`/roles/${encodeURIComponent(roleName)}`, {
      method: 'DELETE',
    });
  },
};

proposals = {
  /**
   * Cria uma proposta (pode ser quotation ou documento temporário)
   */
  createProposal: async (payload: {
    type: 'quotation' | 'promotion';
    recipients: Array<{ type: 'client' | 'lead'; id: string; email: string }>;
    items: Array<{ type: 'product'|'service'|'bundle'; id: string; quantity?: number }>;
    message?: string;
    subject?: string;
    attachments?: File[];          // ficheiros a fazer upload
  }) => {
    // 1. Primeiro upload dos ficheiros (se existirem)
    const attachmentIds: string[] = [];

    if (payload.attachments && payload.attachments.length > 0) {
      for (const file of payload.attachments) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API_BASE_URL}/proposals/temp-proposal/images`, {
          method: 'POST',
          body: formData,
          headers: { /* teu auth header se necessário */ }
        });
        const data = await res.json();
        if (data.attachmentId) attachmentIds.push(data.attachmentId);
      }
    }

    // 2. Cria a proposta com os anexos já subidos
    return this.request('/proposals', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        attachmentIds,
      })
    });
  },

  /**
   * Apenas envia email com link já existente
   */
  sendProposalEmail: async (proposalId: string, payload: {
    subject: string;
    message: string;
    cc?: string[];
  }) => {
    return this.request(`/proposals/${proposalId}/send-email`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
onboarding = {
  getAll: () => 
    this.request<any[]>('/onboarding', { method: 'GET' }),

  update: (menuName: string, data: { 
    shortDescription: string; 
    longDescription: string; 
    videoUrl?: string 
  }) => 
    this.request<any>(`/onboarding/${encodeURIComponent(menuName)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
library = {
  getPublic: () => this.request<any[]>('/library/public', { method: 'GET' }),
  getAll: () => this.request<any[]>('/library', { method: 'GET' }),
  create: (data: any) => this.request<any>('/library', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => this.request<any>(`/library/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => this.request<any>(`/library/${id}`, { 
    method: 'DELETE' 
  }),
};
  // ====================== EXPENSES ======================
  expenses = {
    /**
     * Listar despesas com filtros
     */
    getAll: (filters: ExpenseFilters = {}) => {
      const params = new URLSearchParams();

      if (filters.period) params.append('period', filters.period);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.category) params.append('category', filters.category);
      if (filters.type) params.append('type', filters.type);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      return this.request<{ 
        success: boolean; 
        expenses: Expense[]; 
        summary: ExpenseSummary 
      }>(`/expenses${queryString}`);
    },

    /**
     * Criar nova despesa
     */
    create: (data: CreateExpensePayload) =>
      this.request<{ success: boolean; expense: Expense; message: string }>(
        '/expenses',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      ),

    /**
     * Atualizar despesa
     */
    update: (id: string, data: Partial<CreateExpensePayload>) =>
      this.request<{ success: boolean; expense: Expense; message: string }>(
        `/expenses/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        }
      ),

    /**
     * Eliminar despesa
     */
    delete: (id: string) =>
      this.request<{ success: boolean; message: string }>(
        `/expenses/${id}`,
        { method: 'DELETE' }
      ),

    /**
     * Obter estatísticas rápidas (opcional)
     */
    getStats: () =>
      this.request<{
        totalExpenses: number;
        totalCount: number;
        avgDaily: number;
      }>('/expenses/stats'),
  };

  social = {


  disconnect: (accountId: string) =>
    this.request<{ success: boolean; message: string }>(`/social/disconnect/${accountId}`, {
      method: 'DELETE',
    }),

  // Se ainda não tiveres estes, recomenda-se adicionar também:
  getAccounts: () => 
    this.request<any[]>('/social/accounts'),
};
  // ====================== ORDERS DISPLAY (NOVO) ======================
  orders = {
    /**
     * Tela principal de visualização (TV / Monitor grande)
     * GET /api/orders/display
     */
    getDisplay: () => 
      this.request<any>('/orders/display'),

    /**
     * Tela otimizada para cozinha (apenas pedidos que precisam de atenção)
     * GET /api/orders/kitchen
     */
    getKitchen: () => 
      this.request<any>('/orders/kitchen'),

    /**
     * Marcar pedido como pronto
     * PATCH /api/orders/:type/:id/ready
     */
    markAsReady: (type: 'requisition' | 'sale', id: string, notes?: string) =>
      this.request<any>(`/orders/${type}/${id}/ready`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: notes || '' }),
      }),
  };
  transactions = {
  getAll: (filters: any = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value as string);
    });
    return this.request<any>(`/checkout/transactions?${params.toString()}`);
  },

  getStats: () => this.request<any>('/checkout/transactions/stats'),
};
  
}




export const api = new ApiClient(API_BASE_URL);

export const authApi = api.auth;
export const socialApi = api.social;
export const rolesApi = api.roles;
export const transactionsApi = api.transactions;
export const companyApi = api.company;
export const expensesApi = api.expenses;
export const usersApi = api.users;
export const onboardingApi = api.onboarding;
export const ordersApi = api.orders;
export const documentsApi = api.documents;
export const clientsApi = api.clients;
export const suppliersApi = api.suppliers;
export const templatesApi = {
  ...api.templates,
  purchase: (templateId: string, templateName: string, payload: {
    totalAmount: number;
    method: 'mpesa' | 'emola' | 'visa';
    customer: { name: string; phone: string; email?: string };
    mobileMoneyPhone?: string;
    companyId: string;
  }) =>
    api.request<CheckoutResponse>('/checkout/order', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        templateId,
        templateName,
        items: [{ name: templateName || 'Template de Documento', quantity: 1, price: payload.totalAmount }],
      }),
    }),
};
export const pdfApi = api.pdf;
export const bundlesApi = api.bundles;
export const salesApi = api.sales;
export const libraryApi = api.library;
export const couponsApi = api.coupons;
export const shareApi = api.share;
export const productsApi = api.products;
export const publicApi = api.public;
export const publicPortalTemplatesApi = api.publicPortalTemplates;
export const adminBuiltInVariantsApi = api.adminBuiltInVariants;
export const requisitionsApi = api.requisitions;
export const goalsApi = api.goals;
export const proposalsApi = api.proposals;
export const leadsApi = api.leads;
export const subscriptionsApi = {
  // Métodos existentes (mantidos)
  getSubscription: () => api.company.getSubscription(),
  getAvailablePlans: () => api.company.getAvailablePlans(),
  activatePlan: (planId: string) => api.company.activatePlan(planId),
  cancelSubscription: () => api.company.cancelSubscription(),
  updateSubscription: (data: SubscriptionUpdateData) => api.company.updateSubscription(data),

  // ==================== NOVOS MÉTODOS ADICIONADOS ====================

  /** Obtém a subscrição atual com plano populado (recomendado) */
  getCurrent: () => api.request<any>('/subscriptions/current'),

  /** Alias para getCurrent - mais intuitivo */
  current: () => api.request<any>('/subscriptions/current'),

  /** Lista todos os planos disponíveis (SubscriptionPlan) */
  getPlans: () => api.request<any>('/subscriptions/plans'),

  /** Ativação manual (usado por admins) */
  activate: (data: { planId: string; months?: number; manualActivation?: boolean }) =>
    api.request<any>('/subscriptions/activate', { method: 'POST', data }),

  /** Atualiza o plano atual (upgrade/downgrade) */
  update: (data: { planId: string; billingCycle?: 'monthly' | 'annual'; months?: number }) =>
    api.request<any>('/subscriptions/current', { method: 'PATCH', data }),

  // Novo alias útil para o Layout
  getMySubscription: () => api.request<any>('/subscriptions/current'),

  /** Cancela a subscrição atual */
  cancel: () => api.request<any>('/subscriptions/cancel', { method: 'POST' }),

  /** Verifica limites de utilização (opcional, mas útil) */
  checkLimits: () => api.request<any>('/subscriptions/limits'),
};
export const dashboardApi = {
  getAnalytics: () => api.request<{
    statusDistribution: ChartDataPoint[];
    typeDistribution: ChartDataPoint[];
    salesFunnel: ChartDataPoint[];
  }>('/dashboard/analytics'),
};
export const apiPost = async <T>(endpoint: string, payload: any): Promise<T> => {
  return api.request<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};


export const commissionsApi = {
  // ────────────────────────────────────────────────
  // Regras de comissão (mantidas iguais)
  // ────────────────────────────────────────────────
  getRules: () => api.request<CommissionRule[]>('/commissions/rules'),
  getRoles: () => api.request<any[]>('/commissions/roles'),
  getLookupsRoles: () => api.request<any[]>('/commissions/lookups/roles'),
  getLookupsItems: (type: string) => api.request<any[]>(`/commissions/lookups/items?type=${type}`),
  
  createRule: (data: any) => api.request<CommissionRule>('/commissions/rules', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  updateRule: (id: string, data: any) => api.request<CommissionRule>(`/commissions/rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  deleteRule: (id: string) => api.request(`/commissions/rules/${id}`, { method: 'DELETE' }),

  // ────────────────────────────────────────────────
  // Visão do utilizador logado – com paginação e filtros reais
  // ────────────────────────────────────────────────
 getMyPendingCommissions: (params: {
  page?: number;
  limit?: number;
  status?: string;
  periodStart?: string;
  ruleId?: string;           // ← novo
} = {}) => {
  const query = new URLSearchParams();

  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.periodStart) query.set('periodStart', params.periodStart);
  if (params.ruleId) query.set('ruleId', params.ruleId);

  return api.request(`/commissions/my-pending?${query.toString()}`);
},

  // ────────────────────────────────────────────────
  // Resumo administrativo (admin/owner) – com paginação e filtros
  // ────────────────────────────────────────────────
  getAdminCommissionSummary: (params: {
    userId?: string;
    periodStart?: string;     // YYYY-MM-DD
    periodEnd?: string;       // YYYY-MM-DD
    status?: 'pending' | 'approved' | 'paid' | 'rejected' | 'all';
    page?: number;
    limit?: number;
  } = {}) => {
    const query = new URLSearchParams();

    if (params.userId)         query.set('userId', params.userId);
    if (params.periodStart)    query.set('periodStart', params.periodStart);
    if (params.periodEnd)      query.set('periodEnd', params.periodEnd);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.page !== undefined) query.set('page', params.page.toString());
    if (params.limit !== undefined) query.set('limit', params.limit.toString());

    const qs = query.toString() ? `?${query.toString()}` : '';
    return api.request<AdminSummaryResponse>(`/commissions/admin-summary${qs}`);
  },
  batchUpdateCommissions: (payload: {
    ids: string[];
    action: 'approve' | 'pay' | 'reject';
    approvedBy?: string;
    notes?: string;
  }) => api.request<any>('/commissions/batch-update', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // ────────────────────────────────────────────────
  // Detalhe de uma transação específica
  // ────────────────────────────────────────────────
  getCommissionTransaction: (id: string) =>
    api.request<CommissionTransaction>(`/commissions/${id}`),
};
export const checkoutApi = api.checkout;
export const referralsApi = {
  // Recomendar cliente
  recommendClient: (payload: {
    companyId: string;
    customerName: string;
    customerPhone: string;
  }) =>
    api.request<{ success: boolean; message: string; client?: any }>('/referrals/recommend-client', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Dashboard resumido do parceiro
  getDashboard: () =>
    api.request<ReferralDashboardSummary>('/referrals/dashboard'),

  // Lista de clientes recomendados
  getMyReferrals: () =>
    api.request<MyReferralsResponse>('/referrals/my-referrals'),

  // Ganhos detalhados
  getMyEarnings: () =>
    api.request<MyEarningsResponse>('/referrals/my-earnings'),
  // === NOVA ROTA: Solicitar Pagamento ===
  requestPayment: (payload: {
    companyId: string;
    requestedAmount: number;
    paymentMethod: 'mpesa' | 'emola' | 'mkesh' | 'bank';
    phoneNumber?: string;
    nibOrIban?: string;
    accountHolder?: string;
    bankName?: string;
    notes?: string;
  }) =>
    api.request<{ success: boolean; message: string; requestId?: string }>('/referrals/request-payment', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
// Então o teu checkoutApi fica:

export interface GroupMember {
  _id?: string;
  company: {
    _id: string;
    name: string;
    logo?: string;
    email?: string;
    phone?: string;
  };
  invitedBy?: string;
  invitedAt: string;
  joinedAt?: string;
  status: 'pending' | 'active' | 'declined' | 'removed';
}

export interface Group {
  _id: string;
  name: string;
  description: string;
  createdBy: string;
  ownerCompany: {
    _id: string;
    name: string;
    logo?: string;
    email?: string;
  };
  inviteCode: string;
  members: GroupMember[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupCompanyDashboard {
  company: {
    _id: string;
    name: string;
    logo?: string;
    email?: string;
    phone?: string;
    currency?: string;
  };
  stats: {
    totalSales: number;
    todaySales: number;
    totalDocuments: number;
    totalClients: number;
    totalLeads: number;
    totalGoals: number;
    totalRevenue: number;
  };
}

export const groupsApi = {
  create: (data: { name: string; description?: string }) =>
    api.request<Group>('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: () => api.request<Group[]>('/groups'),

  get: (id: string) => api.request<Group>(`/groups/${id}`),

  update: (id: string, data: { name?: string; description?: string }) =>
    api.request<Group>(`/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    api.request<{ message: string }>(`/groups/${id}`, { method: 'DELETE' }),

  getInviteCode: (id: string) =>
    api.request<{ inviteCode: string }>(`/groups/${id}/invite-code`),

  invite: (id: string, email: string) =>
    api.request<Group>(`/groups/${id}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  join: (inviteCode: string) =>
    api.request<Group>(`/groups/join/${inviteCode}`, { method: 'POST' }),

  acceptInvite: (id: string) =>
    api.request<Group>(`/groups/${id}/accept`, { method: 'POST' }),

  declineInvite: (id: string) =>
    api.request<{ message: string }>(`/groups/${id}/decline`, { method: 'POST' }),

  removeMember: (id: string, companyId: string) =>
    api.request<{ message: string }>(`/groups/${id}/members/${companyId}`, { method: 'DELETE' }),

  getCompanies: (id: string) =>
    api.request<any[]>(`/groups/${id}/companies`),

  getCompanyDashboard: (id: string, targetCompanyId: string) =>
    api.request<GroupCompanyDashboard>(`/groups/${id}/company/${targetCompanyId}/dashboard`),
};

export const customersApi = api.customers;
export const pendingRoomsApi = api.pendingRooms;
