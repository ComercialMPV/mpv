import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface WorkspaceContextType {
  activeWorkspaceCompanyId: string | null;
  activeWorkspaceCompanyName: string | null;
  switchWorkspace: (companyId: string, companyName: string) => void;
  clearWorkspace: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

const STORAGE_KEY = 'activeWorkspace';

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeWorkspaceCompanyId, setActiveWorkspaceCompanyId] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.companyId || null;
      }
    } catch {}
    return null;
  });
  const [activeWorkspaceCompanyName, setActiveWorkspaceCompanyName] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.companyName || null;
      }
    } catch {}
    return null;
  });

  const switchWorkspace = useCallback((companyId: string, companyName: string) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ companyId, companyName }));
    window.dispatchEvent(new CustomEvent('workspaceChanged', { detail: { companyId, companyName } }));
    // Full page reload clears all React cached state so every page fetches fresh data
    window.location.reload();
  }, []);

  const clearWorkspace = useCallback(() => {
    setActiveWorkspaceCompanyId(null);
    setActiveWorkspaceCompanyName(null);
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('workspaceChanged', { detail: { companyId: null, companyName: null } }));
  }, []);

  useEffect(() => {
    window.addEventListener('clearWorkspace', clearWorkspace);
    return () => window.removeEventListener('clearWorkspace', clearWorkspace);
  }, [clearWorkspace]);

  return (
    <WorkspaceContext.Provider value={{
      activeWorkspaceCompanyId,
      activeWorkspaceCompanyName,
      switchWorkspace,
      clearWorkspace,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};
