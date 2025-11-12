'use client';

import { RefreshCw, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface HeaderProps {
  title: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function Header({ title, onRefresh, isRefreshing }: HeaderProps) {
  const { toggleTheme } = useTheme();

  console.log('Header rendered');

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-4 flex items-center justify-between">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h2>
      
      <div className="flex items-center gap-3">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
        
        {/* CSS-only theme toggle - both icons rendered, CSS controls visibility */}
        <button
          onClick={() => {
            console.log('Theme button clicked!');
            toggleTheme();
          }}
          className="p-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          aria-label="Toggle theme"
        >
          <Sun className="w-5 h-5 dark:hidden" />
          <Moon className="w-5 h-5 hidden dark:block" />
        </button>
      </div>
    </header>
  );
}
