import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set) => ({
      isDark: false,
      
      toggleTheme: () => set((state) => {
        const newIsDark = !state.isDark;
        
        // Actualizar clase en el HTML
        if (newIsDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        
        return { isDark: newIsDark };
      }),
      
      setTheme: (isDark) => set(() => {
        // Actualizar clase en el HTML
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        
        return { isDark };
      }),
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        // Aplicar tema guardado al cargar
        if (state?.isDark) {
          document.documentElement.classList.add('dark');
        }
      },
    }
  )
);

export default useThemeStore;