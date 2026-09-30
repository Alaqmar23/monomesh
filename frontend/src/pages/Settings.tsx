import React, { useEffect, useState } from 'react';
import { Cpu, HardDrive, Server, ShieldCheck, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { systemService } from '../services/systemService';
import { SystemStatus } from '../types';

export const Settings: React.FC = () => {
  const [system, setSystem] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = () => {
    setIsLoading(true);
    systemService.getStatus()
      .then(setSystem)
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <header className="mb-12 border-b border-surface-border pb-8 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-serif tracking-tight text-white mb-2">System Telemetry</h1>
          <p className="text-sm font-mono text-slate-500">
            Real backend hardware telemetry queried directly from system APIs
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white border border-surface-border hover:border-brand-400 transition-colors disabled:opacity-50 disabled:hover:border-surface-border"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh state</span>
        </button>
      </header>

      {system ? (
        <div className="space-y-16">
          <section>
            <h2 className="text-xl font-serif text-white mb-6 border-b border-surface-border pb-4">Hardware Specifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="border border-surface-border p-6 bg-[#0a0a0a]">
                <div className="flex items-center justify-between mb-6">
                  <span className="font-medium text-white flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-brand-400" /> Graphics
                  </span>
                  <span className={`text-xs px-2 py-0.5 border ${
                    system.gpu.cuda_available ? 'border-brand-400 text-brand-400' : 'border-slate-600 text-slate-500'
                  }`}>
                    {system.gpu.cuda_available ? 'CUDA Active' : 'CPU Only'}
                  </span>
                </div>
                <dl className="space-y-4 text-sm">
                  <div>
                    <dt className="text-slate-500 text-xs mb-1">Processor</dt>
                    <dd className="text-white font-medium">{system.gpu.name}</dd>
                  </div>
                  <div className="flex justify-between border-t border-surface-border pt-3">
                    <dt className="text-slate-500">Total VRAM</dt>
                    <dd className="text-white font-mono">{system.gpu.vram_total_gb} GB</dd>
                  </div>
                  <div className="flex justify-between border-t border-surface-border pt-3">
                    <dt className="text-slate-500">VRAM Allocated</dt>
                    <dd className="text-white font-mono">{system.gpu.vram_used_gb} GB</dd>
                  </div>
                  <div className="flex justify-between border-t border-surface-border pt-3">
                    <dt className="text-slate-500">PyTorch Version</dt>
                    <dd className="text-white font-mono">{system.gpu.torch_version || 'N/A'}</dd>
                  </div>
                </dl>
              </div>

              <div className="border border-surface-border p-6 bg-[#0a0a0a]">
                <div className="flex items-center justify-between mb-6">
                  <span className="font-medium text-white flex items-center gap-2">
                    <Server className="w-5 h-5 text-purple-400" /> Compute
                  </span>
                  <span className="text-xs text-slate-500">Host system</span>
                </div>
                <dl className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Logical Cores</dt>
                    <dd className="text-white font-mono">{system.cpu.cores}</dd>
                  </div>
                  <div className="flex justify-between border-t border-surface-border pt-3">
                    <dt className="text-slate-500">Total RAM</dt>
                    <dd className="text-white font-mono">{system.ram.total_gb} GB</dd>
                  </div>
                  <div className="flex justify-between border-t border-surface-border pt-3">
                    <dt className="text-slate-500">Available RAM</dt>
                    <dd className="text-white font-mono">{system.ram.available_gb} GB</dd>
                  </div>
                  <div className="flex justify-between border-t border-surface-border pt-3">
                    <dt className="text-slate-500">RAM Utilization</dt>
                    <dd className="text-white font-mono">{system.ram.usage_percent}%</dd>
                  </div>
                </dl>
              </div>

              <div className="border border-surface-border p-6 bg-[#0a0a0a]">
                <div className="flex items-center justify-between mb-6">
                  <span className="font-medium text-white flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-emerald-400" /> Storage
                  </span>
                  <span className="text-xs text-emerald-400 border border-emerald-400 px-2 py-0.5">Healthy</span>
                </div>
                <dl className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Total Capacity</dt>
                    <dd className="text-white font-mono">{system.storage.total_gb} GB</dd>
                  </div>
                  <div className="flex justify-between border-t border-surface-border pt-3">
                    <dt className="text-slate-500">Free Disk Space</dt>
                    <dd className="text-emerald-400 font-mono">{system.storage.free_gb} GB</dd>
                  </div>
                  <div className="flex justify-between border-t border-surface-border pt-3">
                    <dt className="text-slate-500">Database</dt>
                    <dd className="text-white font-mono">SQLite3</dd>
                  </div>
                  <div className="flex justify-between border-t border-surface-border pt-3">
                    <dt className="text-slate-500">Storage Root</dt>
                    <dd className="text-white font-mono truncate max-w-[120px]">/storage</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between border-b border-surface-border pb-4 mb-6">
              <h2 className="text-xl font-serif text-white">Engine Availability Matrix</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(system.engines).map(([id, eng]) => (
                <div
                  key={id}
                  className={`border p-6 ${
                    eng.available
                      ? 'border-surface-border bg-[#0a0a0a]'
                      : 'border-surface-border/50 bg-black opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-white">{eng.name}</h3>
                    <span className={`flex items-center gap-1 text-xs ${
                      eng.available ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                      {eng.available ? (
                        <><CheckCircle2 className="w-4 h-4" /> Available</>
                      ) : (
                        <><XCircle className="w-4 h-4" /> Unavailable</>
                      )}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                    {eng.description}
                  </p>
                  <div className="flex items-center gap-6 text-sm font-mono text-slate-500 pt-4 border-t border-surface-border">
                    <span>VRAM: {eng.min_vram_gb} GB</span>
                    <span>Device: {eng.device}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="text-center py-24 text-slate-500 text-sm">
          Loading hardware state...
        </div>
      )}
    </div>
  );
};
