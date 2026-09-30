import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { systemService } from '../services/systemService';
import { ProjectSummary, SystemStatus } from '../types';

export const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [system, setSystem] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = () => {
    Promise.all([projectService.getProjects(), systemService.getStatus()])
      .then(([projs, sys]) => {
        setProjects(projs);
        setSystem(sys);
      })
      .catch((err) => console.error("Error loading dashboard data:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this project? All images and 3D reconstructions will be removed.")) {
      await projectService.deleteProject(id);
      loadData();
    }
  };

  const totalReconstructions = projects.filter((p) => p.status === 'completed').length;
  const avgConfidence = projects.filter((p) => p.latest_confidence !== null).length > 0
    ? Math.round(
        projects.reduce((acc, p) => acc + (p.latest_confidence || 0), 0) /
        projects.filter((p) => p.latest_confidence !== null).length
      )
    : 0;

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <header className="mb-16 border-b border-surface-border pb-10">
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-4xl font-serif tracking-tight text-white">Sparse3D Workspace</h1>
          <div className="flex gap-8 text-sm">
            <Link to="/new" className="text-brand-400 hover:text-brand-300 transition-colors relative group">
              Start reconstruction
              <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-brand-400/50 group-hover:bg-brand-400 transition-colors"></span>
            </Link>
            <Link to="/experiments" className="text-slate-400 hover:text-slate-200 transition-colors relative group">
              Experiments
              <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-slate-700 group-hover:bg-slate-400 transition-colors"></span>
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
          <p className="text-lg text-slate-400 font-light leading-relaxed max-w-xl">
            Reconstruct and analyze surface geometry from minimal viewpoints. Built for highly constrained environments.
          </p>
          {system && (
            <div className="text-right text-sm text-slate-500 font-mono">
              <span className="block text-slate-300 mb-1">
                Engine: {system.recommended_engine === 'vggt' ? 'VGGT Geometric' : 'Classical Multi-View Stereo'}
              </span>
              <span>
                {system.gpu.name} &middot; {system.gpu.vram_total_gb}GB VRAM
              </span>
            </div>
          )}
        </div>
      </header>

      <section className="mb-16">
        <div className="grid grid-cols-3 gap-12 text-sm">
          <div>
            <div className="text-slate-500 mb-1">Active projects</div>
            <div className="text-2xl font-serif text-white">{projects.length}</div>
          </div>
          <div>
            <div className="text-slate-500 mb-1">Completed exports</div>
            <div className="text-2xl font-serif text-white">{totalReconstructions}</div>
          </div>
          <div>
            <div className="text-slate-500 mb-1">Mean geometry confidence</div>
            <div className="text-2xl font-serif text-white">{avgConfidence > 0 ? `${avgConfidence}%` : 'N/A'}</div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-serif tracking-tight text-white mb-6">Recent Projects</h2>
        
        {projects.length === 0 ? (
          <div className="py-12 border-t border-surface-border">
            <p className="text-slate-400">No reconstructions in workspace.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border border-t border-surface-border">
            {projects.map((proj) => (
              <Link
                key={proj.id}
                to={`/project/${proj.id}`}
                className="group block py-6 hover:bg-surface/50 transition-colors -mx-4 px-4"
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-5">
                    <h3 className="text-base text-slate-200 group-hover:text-white transition-colors mb-1">
                      {proj.name}
                    </h3>
                    <p className="text-sm text-slate-500 truncate pr-4">
                      {proj.description || 'No description provided.'}
                    </p>
                  </div>
                  
                  <div className="col-span-2 text-sm text-slate-400 font-mono">
                    {proj.image_count} views
                  </div>
                  
                  <div className="col-span-2 text-sm font-mono">
                    {proj.latest_confidence ? (
                      <span className="text-brand-400">{proj.latest_confidence}% conf.</span>
                    ) : (
                      <span className="text-slate-600">&mdash;</span>
                    )}
                  </div>
                  
                  <div className="col-span-2 text-sm text-slate-500 font-mono">
                    {new Date(proj.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>

                  <div className="col-span-1 text-right">
                    <button
                      onClick={(e) => handleDeleteProject(proj.id, e)}
                      className="text-slate-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 p-2"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
