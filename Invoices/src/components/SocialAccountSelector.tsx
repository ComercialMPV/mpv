// src/components/SocialAccountSelector.tsx
import React from 'react';

interface Props {
  accounts: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const SocialAccountSelector: React.FC<Props> = ({ accounts, selectedId, onSelect }) => {
  if (accounts.length === 0) return null;

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Conta a usar
      </label>
      <select
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-purple-500"
      >
        {accounts.map(acc => (
          <option key={acc._id} value={acc._id}>
            {acc.instagramUsername || acc.pageName} (@{acc.instagramUsername || 'conta'})
          </option>
        ))}
      </select>
    </div>
  );
};