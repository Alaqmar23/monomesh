import React, { useEffect, useState } from 'react';
import {
  FlaskConical,
  Play,
  Download,
  BarChart2,
  TrendingUp,
  Cpu,
  Layers
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { evaluationService } from '../services/evaluationService';
import { ExperimentData } from '../types';

export const Experiments: React.FC = () => {
  const [experiments, setExperiments] = useState<ExperimentData[]>([]);
  const [selectedExp, setSelectedExp] = useState<ExperimentData | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const loadExperiments = () => {
    evaluationService.getExperiments()
      .then((data) => {
        setExperiments(data);
        if (data.length > 0 && !selectedExp) {
          setSelectedExp(data[0]);
        }
      })
      .catch((err) => console.error("Error loading experiments:", err));
  };

  useEffect(() => {
    loadExperiments();
  }, []);

  const handleRunNewBenchmark = async () => {
    setIsRunning(true);
    try {
      const newExp = await evaluationService.runScalingExperiment("CSE Major Project Sparse Benchmark");
      setExperiments([newExp, ...experiments]);
      setSelectedExp(newExp);
    } catch (err: any) {
      alert("Failed to run benchmark: " + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleExportCSV = () => {
    if (!selectedExp) return;
    const headers = ["View_Count", "Coverage_Pct", "Confidence_Pct", "Processing_Time_Sec", "Peak_Memory_MB", "Vertex_Count", "Face_Count", "Chamfer_Distance"];
    const rows = selectedExp.results.map((r) => [
      r.view_count,
      r.view_coverage_pct,
      r.geometry_confidence_pct,
      r.processing_time_sec,
      r.peak_memory_mb,
      r.vertex_count,
      r.face_count,
      r.chamfer_distance
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sparse3d_experiment_${selectedExp.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (!selectedExp) return;
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedExp, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", jsonStr);
    link.setAttribute("download", `sparse3d_experiment_${selectedExp.id}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-6">
      <header className="mb-12 border-b border-surface-border pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-serif tracking-tight text-white mb-2 flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-brand-400" />
            Research Experiments
          </h1>
          <p className="text-sm font-mono text-slate-500 max-w-2xl">
            RQ1: Investigating reconstruction accuracy, coverage, and confidence scaling across 2, 3, 4, and 5 viewpoints.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleExportCSV}
            disabled={!selectedExp}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 border border-surface-border hover:border-slate-400 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> CSV
          </button>

          <button
            onClick={handleExportJSON}
            disabled={!selectedExp}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 border border-surface-border hover:border-slate-400 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> JSON
          </button>

          <button
            onClick={handleRunNewBenchmark}
            disabled={isRunning}
            className="flex items-center gap-2 px-6 py-2 bg-white text-black text-sm font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            <Play className="w-4 h-4" fill="currentColor" />
            {isRunning ? 'Executing...' : 'Run Benchmark'}
          </button>
        </div>
      </header>

      {selectedExp ? (
        <div className="space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Chart 1 */}
            <div className="border border-surface-border p-6 bg-[#0a0a0a]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-medium text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-400" /> Confidence & Coverage
                </h3>
                <span className="text-xs text-slate-500 font-mono">Scale: 0-100%</span>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedExp.results}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" vertical={false} />
                    <XAxis dataKey="view_count" stroke="#64748b" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v} views`} axisLine={false} tickLine={false} />
                    <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#2d374d', color: '#fff', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="view_coverage_pct" name="Coverage %" stroke="#3077ff" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="geometry_confidence_pct" name="Confidence %" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2 */}
            <div className="border border-surface-border p-6 bg-[#0a0a0a]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-medium text-white flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-rose-400" /> Chamfer Error
                </h3>
                <span className="text-xs text-slate-500 font-mono">Lower is better</span>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedExp.results}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" vertical={false} />
                    <XAxis dataKey="view_count" stroke="#64748b" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v} views`} axisLine={false} tickLine={false} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#2d374d', color: '#fff', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="chamfer_distance" name="Chamfer Distance" stroke="#f43f5e" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3 */}
            <div className="border border-surface-border p-6 bg-[#0a0a0a]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-medium text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-400" /> Processing Time
                </h3>
                <span className="text-xs text-slate-500 font-mono">Seconds</span>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={selectedExp.results}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" vertical={false} />
                    <XAxis dataKey="view_count" stroke="#64748b" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v} views`} axisLine={false} tickLine={false} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#2d374d', color: '#fff', fontSize: '12px' }} />
                    <Bar dataKey="processing_time_sec" name="Time (s)" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4 */}
            <div className="border border-surface-border p-6 bg-[#0a0a0a]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-medium text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" /> Mesh Complexity
                </h3>
                <span className="text-xs text-slate-500 font-mono">Total Faces</span>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={selectedExp.results}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" vertical={false} />
                    <XAxis dataKey="view_count" stroke="#64748b" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v} views`} axisLine={false} tickLine={false} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#2d374d', color: '#fff', fontSize: '12px' }} />
                    <Bar dataKey="face_count" name="Faces" fill="#a855f7" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <section>
            <h2 className="text-xl font-serif text-white mb-6 border-b border-surface-border pb-4">Raw benchmark data</h2>
            <div className="border border-surface-border overflow-hidden">
              <table className="w-full text-left text-sm font-mono">
                <thead>
                  <tr className="bg-surface border-b border-surface-border text-slate-400">
                    <th className="py-4 px-6 font-medium">Views</th>
                    <th className="py-4 px-6 font-medium">Coverage</th>
                    <th className="py-4 px-6 font-medium">Confidence</th>
                    <th className="py-4 px-6 font-medium">Chamfer Dist</th>
                    <th className="py-4 px-6 font-medium">Vertices</th>
                    <th className="py-4 px-6 font-medium">Faces</th>
                    <th className="py-4 px-6 font-medium">Time</th>
                    <th className="py-4 px-6 font-medium">Peak RAM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-[#0a0a0a]">
                  {selectedExp.results.map((r) => (
                    <tr key={r.view_count} className="hover:bg-white/5 transition-colors text-slate-300">
                      <td className="py-4 px-6 font-medium text-white">{r.view_count} views</td>
                      <td className="py-4 px-6 text-brand-400">{r.view_coverage_pct}%</td>
                      <td className="py-4 px-6 text-emerald-400">{r.geometry_confidence_pct}%</td>
                      <td className="py-4 px-6 text-rose-400">{r.chamfer_distance}</td>
                      <td className="py-4 px-6">{r.vertex_count.toLocaleString()}</td>
                      <td className="py-4 px-6">{r.face_count.toLocaleString()}</td>
                      <td className="py-4 px-6 text-amber-400">{r.processing_time_sec}s</td>
                      <td className="py-4 px-6">{r.peak_memory_mb} MB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <div className="text-center py-24 text-slate-500 font-mono text-sm">
          Loading benchmark results...
        </div>
      )}
    </div>
  );
};
