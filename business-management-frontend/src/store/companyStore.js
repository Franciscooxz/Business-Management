import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCompanyStore = create(
  persist(
    (set, get) => ({
      activeCompany: null,

      setActiveCompany: (company) => {
        set({ activeCompany: company });
      },

      clearCompany: () => {
        set({ activeCompany: null });
      },

      getCompanyId: () => {
        return get().activeCompany?.id ?? null;
      },

      isHabilitacion: () => {
        return get().activeCompany?.dian_ambiente === 'habilitacion';
      },
    }),
    {
      name: 'company-storage',
    }
  )
);

export default useCompanyStore;
