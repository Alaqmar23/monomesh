import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Layers,
  PlusCircle,
  FolderKanban,
  FlaskConical,
  BarChart3,
  BookOpen,
  Settings,
  Cpu,
  Activity,
  HardDrive,
  Box
} from 'lucide-react';
import { systemService } from '../../services/systemService';
import { SystemStatus } from '../../types';

export const Sidebar: React.FC = () => {
  const [system, setSystem] = useState<SystemStatus | null>(null);

  useEffect(() => {
    systemService.getStatus()
      .then(setSystem)
      .catch((err) => console.error("Telemetry error:", err));

    const interval = setInterval(() => {
      systemService.getStatus().then(setSystem).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: Layers, exact: true },
    { to: '/new', label: 'New Reconstruction', icon: PlusCircle },
    { to: '/experiments', label: 'Research Experiments', icon: FlaskConical },
    { to: '/evaluation', label: 'Evaluation & Benchmarks', icon: BarChart3 },
    { to: '/docs', label: 'Documentation', icon: BookOpen },
    { to: '/settings', label: 'System & Hardware', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-surface border-r border-surface-border flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-surface-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-cyan p-0.5 shadow-glow-brand flex items-center justify-center">
          <Box className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-wider text-base text-white">SPARSE3D</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-brand-500/20 text-brand-300 rounded border border-brand-500/30">AI CV</span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">Sparse-View 3D Lab</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
          Workstation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${isActive
                  ? 'bg-brand-600/15 text-brand-400 border border-brand-500/30 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-surface-hover border border-transparent'
                }
              `}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Hardware Telemetry Panel (Bottom) */}
      <div className="p-3 border-t border-surface-border bg-black/20">
        <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2 px-1 flex items-center justify-between">
          <span>Telemetry</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Online
          </span>
        </div>

        <div className="space-y-2 text-xs font-mono bg-surface/80 p-2.5 rounded-lg border border-surface-border">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Cpu className="w-3.5 h-3.5 text-brand-400" /> GPU
            </span>
            <span className="text-slate-200 truncate max-w-[110px]" title={system?.gpu.name || 'Detecting...'}>
              {system?.gpu.cuda_available ? 'RTX 3050 (4GB)' : 'CPU Mode'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Activity className="w-3.5 h-3.5 text-accent-cyan" /> VRAM
            </span>
            <span className="text-slate-200">
              {system ? `${system.gpu.vram_used_gb} / ${system.gpu.vram_total_gb} GB` : '—'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-400">
              <HardDrive className="w-3.5 h-3.5 text-purple-400" /> RAM
            </span>
            <span className="text-slate-200">
              {system ? `${system.ram.used_gb} / ${system.ram.total_gb} GB` : '—'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
