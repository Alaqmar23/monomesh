import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PlusCircle, Sparkles, BookOpen, Terminal } from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Reconstruction Dashboard';
      case '/new':
        return 'Sparse-View Reconstruction Pipeline';
      case '/experiments':
        return 'Research Experiments & Scaling';
      case '/evaluation':
        return 'Scientific Evaluation & Benchmarks';
      case '/docs':
        return 'Platform Documentation & Theory';
      case '/settings':
        return 'System & Engine Configuration';
      default:
        if (location.pathname.startsWith('/project/')) return 'Reconstruction Workstation';
        return 'Sparse3D Laboratory';
    }
  };

  return (
    <header className="h-16 bg-surface/90 backdrop-blur-md border-b border-surface-border fixed top-0 left-64 right-0 z-20 flex items-center justify-between px-8">
      <div>
        <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
          {getPageTitle()}
        </h1>
        <p className="text-xs text-slate-400 font-mono">
          Final-Year CSE Major Project | Multi-View Visual Geometry + AI Uncertainty Mapping
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link
          to="/docs"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-surface-hover hover:bg-surface-active border border-surface-border transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Guide</span>
        </Link>

        <Link
          to="/new"
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 shadow-glow-brand transition-all duration-150"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New Reconstruction</span>
        </Link>
      </div>
    </header>
  );
};
