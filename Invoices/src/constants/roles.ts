// constants/roles.ts (ou roles.ts)
// Carrega dinamicamente os roles da base de dados

import { useState, useEffect } from 'react';
import { rolesApi } from '../services/api'; // ajusta o caminho se necessário
import toast from 'react-hot-toast';

// Interface para cada role (compatível com RolePermission no backend)
export interface AppRole {
  roleName: string;       // nome único do role
  description?: string;
  isActive: boolean;
  allowedMenuItems?: string[]; // opcional, só se precisar no frontend
}

// Exporta a lista atualizada (pode ser usada em componentes)
export let USER_ROLES: AppRole[] = []; // inicial vazio, será preenchido dinamicamente
export let ROLE_VALUES: string[] = [];

// Hook para carregar e atualizar os roles em qualquer componente
export const useRoles = () => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const res = await rolesApi.getAll(); // GET /api/roles
        const fetchedRoles = res.roles || [];

        // Ordena por nome (opcional, mas melhora UX)
        const sorted = fetchedRoles.sort((a: AppRole, b: AppRole) =>
          a.roleName.localeCompare(b.roleName)
        );

        setRoles(sorted);
        USER_ROLES = sorted;           // atualiza export global
        ROLE_VALUES = sorted.map(r => r.roleName); // atualiza valores

      } catch (err: any) {
        console.error('Erro ao carregar roles dinâmicos:', err);
        toast.error('Não foi possível carregar a lista de roles');

        // Fallback: roles padrão mínimos (evita quebra total)
        const fallbackRoles: AppRole[] = [
          { roleName: 'user', description: 'Usuário padrão', isActive: true },
          { roleName: 'admin', description: 'Administrador', isActive: true },
          { roleName: 'superadmin', description: 'Super Administrador', isActive: true },
          { roleName: 'partner', description: 'Parceiro', isActive: true },
        ];
        setRoles(fallbackRoles);
        USER_ROLES = fallbackRoles;
        ROLE_VALUES = fallbackRoles.map(r => r.roleName);
        setError('Usando roles padrão devido a erro na API');
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();

    // Opcional: recarregar quando mudar algo (ex: após criar role)
    // pode usar um event listener ou context se quiser
  }, []);

  return { roles, loading, error };
};

// Função utilitária para usar em componentes sem hook (ex: inicialização)
export const getCurrentRoles = () => USER_ROLES;
export const getCurrentRoleValues = () => ROLE_VALUES;

// Exporta também como array fixo inicial (para compatibilidade com código antigo)
export const DEFAULT_ROLES: AppRole[] = [
  { roleName: 'user', description: 'Usuário padrão', isActive: true },
  { roleName: 'admin', description: 'Administrador', isActive: true },
  { roleName: 'superadmin', description: 'Super Administrador', isActive: true },
  { roleName: 'partner', description: 'Parceiro', isActive: true },
  // adiciona outros que queiras como fallback
];

USER_ROLES = DEFAULT_ROLES; // inicializa com fallback
ROLE_VALUES = DEFAULT_ROLES.map(r => r.roleName);