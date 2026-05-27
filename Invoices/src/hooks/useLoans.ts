// src/hooks/useLoans.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api'; // teu api client já existente
import toast from 'react-hot-toast';

// ────────────────────────────────────────────────
// Tipagens (ajusta conforme o teu backend retorna exatamente)
// ────────────────────────────────────────────────
export interface Loan {
  _id: string;
  client: {
    _id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  loanAmountRequested: number;
  loanAmountApproved?: number;
  purpose: string;
  termMonths: number;
  interestRate: number;
  interestType?: 'Simples' | 'Composto' | 'Flat' | 'Decrescente';
  paymentFrequency: 'Diário' | 'Semanal' | 'Quinzenal' | 'Mensal' | 'Trimestral';
  gracePeriodDays: number;
  guaranteeType: string;
  guarantors?: Array<{ name: string; identification: string; phone?: string }>;
  approvalStatus: 'Pendente' | 'Aprovado' | 'Rejeitado' | 'Cancelado';
  disbursementDate?: string;
  firstPaymentDate?: string;
  totalPaid: number;
  outstandingBalance: number;
  daysOverdue: number;
  lastPaymentDate?: string;
  payments?: Array<{
    date: string;
    amount: number;
    method: string;
    notes?: string;
    receivedBy?: { firstName: string; lastName: string };
  }>;
  approvedBy?: { firstName: string; lastName: string };
  approvalDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LoanFilters {
  status?: 'Pendente' | 'Aprovado' | 'Rejeitado' | 'Em curso' | 'Atrasado' | 'Quitado';
  clientId?: string;
  overdue?: boolean;
  page?: number;
  limit?: number;
}

// ────────────────────────────────────────────────
// Hooks de Leitura (Queries)
// ────────────────────────────────────────────────

/** Lista todos os microcréditos com filtros */
export const useLoans = (filters: LoanFilters = {}) => {
  return useQuery<Loan[]>({
    queryKey: ['loans', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.overdue) params.append('overdue', 'true');
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const queryString = params.toString() ? `?${params.toString()}` : '';
      return api.request<Loan[]>(`/loans${queryString}`);
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
};

/** Detalhe de um microcrédito específico */
export const useLoan = (loanId: string | undefined) => {
  return useQuery<Loan>({
    queryKey: ['loan', loanId],
    queryFn: () => api.request<Loan>(`/loans/${loanId}`),
    enabled: !!loanId,
    staleTime: 1 * 60 * 1000, // 1 minuto
  });
};

// ────────────────────────────────────────────────
// Hooks de Escrita (Mutations)
// ────────────────────────────────────────────────

const useLoanMutation = <T,>(
  mutationFn: (data: T) => Promise<any>,
  successMessage: string,
  invalidateKeys: string[] = ['loans']
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      invalidateKeys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
      toast.success(successMessage);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Ocorreu um erro');
      console.error(error);
    },
  });
};

/** Criar novo pedido de microcrédito */
export const useCreateLoan = () => {
  return useLoanMutation(
    (data: Partial<Loan>) => api.request('/loans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    'Pedido de crédito registado com sucesso!'
  );
};

/** Aprovar microcrédito */
export const useApproveLoan = (loanId: string) => {
  return useLoanMutation(
    (data: { loanAmountApproved?: number; notes?: string }) =>
      api.request(`/loans/${loanId}/approve`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    'Crédito aprovado com sucesso!',
    ['loans', ['loan', loanId]]
  );
};

/** Rejeitar microcrédito */
export const useRejectLoan = (loanId: string) => {
  return useLoanMutation(
    (data: { reason?: string }) =>
      api.request(`/loans/${loanId}/reject`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    'Crédito rejeitado',
    ['loans', ['loan', loanId]]
  );
};

/** Registar desembolso */
export const useDisburseLoan = (loanId: string) => {
  return useLoanMutation(
    () => api.request(`/loans/${loanId}/disburse`, { method: 'PATCH' }),
    'Desembolso registado com sucesso!',
    ['loans', ['loan', loanId]]
  );
};

/** Registar pagamento / prestação */
export const useRegisterPayment = (loanId: string) => {
  return useLoanMutation(
    (data: {
      amount: number;
      paymentDate?: string;
      method?: string;
      notes?: string;
    }) =>
      api.request(`/loans/${loanId}/payments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    'Pagamento registado com sucesso!',
    ['loans', ['loan', loanId]]
  );
};

/** Forçar atualização de atrasos (admin) */
export const useUpdateOverdue = () => {
  return useLoanMutation(
    () => api.request('/loans/update-overdue', { method: 'POST' }),
    'Atrasos atualizados com sucesso',
    ['loans']
  );
};



export default {
  useLoans,
  useLoan,
  useCreateLoan,
  useApproveLoan,
  useRejectLoan,
  useDisburseLoan,
  useRegisterPayment,
  useUpdateOverdue,
};