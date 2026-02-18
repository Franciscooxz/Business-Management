import { Moon, Sun } from 'lucide-react';
import useThemeStore from '../store/themeStore';


export default function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-7 rounded-full bg-gray-200 dark:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
      aria-label="Toggle theme"
    >
      <div
        className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white dark:bg-gray-800 shadow-md transform transition-transform duration-200 flex items-center justify-center ${
          isDark ? 'translate-x-7' : 'translate-x-0'
        }`}
      >
        {isDark ? (
          <Moon className="w-4 h-4 text-blue-500" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
      </div>
    </button>
  );
}