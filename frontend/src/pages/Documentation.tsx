import React from 'react';
import { BookOpen, CheckCircle, ShieldCheck, Camera, Cpu, Layers, HelpCircle } from 'lucide-react';

export const Documentation: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto text-slate-200">
      {/* Header */}
      <div className="border-b border-surface-border pb-5 space-y-2">
        <div className="flex items-center gap-2 text-brand-400 text-xs font-mono">
          <BookOpen className="w-4 h-4" />
          <span>CSE Major Project Technical Documentation</span>
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          Sparse3D System Architecture & Scientific Foundations
        </h2>
        <p className="text-xs text-slate-400 font-mono">
          Theoretical principles of sparse-view multi-view geometry, visual transformer pipelines, and spatial uncertainty estimation.
        </p>
      </div>

      {/* Section 1: Overview */}
      <div className="glass-panel p-6 rounded-2xl border border-surface-border space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent-cyan" />
          1. What is Sparse3D?
        </h3>
        <p className="text-xs leading-relaxed text-slate-300">
          Sparse3D is an intelligent sparse-view 3D reconstruction platform designed for final-year CSE research. While classical Structure-from-Motion (SfM) and Neural Radiance Fields (NeRF) typically require 50–200 dense overlapping images, Sparse3D focuses on the extreme sparse regime of <strong>2 to 5 photographs</strong>.
        </p>
        <p className="text-xs leading-relaxed text-slate-300">
          Rather than fabricating an ungrounded synthetic 3D shape, Sparse3D couples pretrained feed-forward visual geometry models with classical epipolar constraints, explicitly isolates observed surfaces from blind spots, maps spatial confidence across the reconstructed mesh, and suggests the optimal next camera angle to improve reconstruction fidelity.
        </p>
      </div>

      {/* Section 2: Why Sparse Reconstruction is Difficult */}
      <div className="glass-panel p-6 rounded-2xl border border-surface-border space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          2. The Ill-Posed Nature of Sparse-View 3D Vision
        </h3>
        <p className="text-xs leading-relaxed text-slate-300">
          In traditional photogrammetry, multiple dense baseline viewpoints ensure that every surface point is triangulated by 3 or more optical rays. In a sparse setting with only 2–4 views:
        </p>
        <ul className="text-xs space-y-1.5 text-slate-300 pl-5 list-disc">
          <li><strong>Large Baseline Disparity:</strong> Wide angular changes between photos cause severe perspective deformation, preventing classical feature descriptors from matching identical physical points.</li>
          <li><strong>Occlusion Ambiguity:</strong> Back-facing and bottom surfaces are completely hidden from the camera, leaving half of the object unobserved.</li>
          <li><strong>Depth Scale Ambiguity:</strong> Without calibrated camera intrinsics, monocular depth models predict scale up to an arbitrary scale factor.</li>
        </ul>
      </div>

      {/* Section 3: VGGT & Geometric Reconstruction */}
      <div className="glass-panel p-6 rounded-2xl border border-surface-border space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-brand-400" />
          3. VGGT Geometric Reconstruction Pipeline
        </h3>
        <p className="text-xs leading-relaxed text-slate-300">
          Sparse3D leverages the <strong>VGGT (Visual Geometry Grounded Transformer)</strong> paradigm. Instead of slow iterative bundle adjustment or 30-minute NeRF optimization, feed-forward visual transformers predict relative camera extrinsics and dense multi-view point maps in seconds.
        </p>
        <p className="text-xs leading-relaxed text-slate-300">
          To operate strictly within the <strong>4GB VRAM ceiling</strong> of the NVIDIA RTX 3050 Laptop GPU:
        </p>
        <ul className="text-xs space-y-1 text-slate-300 pl-5 list-disc font-mono">
          <li>Single-view sequential execution (Batch Size = 1)</li>
          <li>FP16 half-precision tensor operations with torch.cuda.amp</li>
          <li>Resolution scaling (capped to 512×512)</li>
          <li>Immediate CUDA memory cache deallocation between viewpoints</li>
        </ul>
      </div>

      {/* Section 4: Scientific Distinction: Geometry vs Visual Quality */}
      <div className="glass-panel p-6 rounded-2xl border border-surface-border space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          4. Scientific Distinction: Geometry Confidence vs Visual Quality
        </h3>
        <p className="text-xs leading-relaxed text-slate-300">
          A fundamental principle of Sparse3D is that <strong>visual realism does not equal geometric accuracy</strong>. Generative diffusion models (such as Hunyuan3D or TRELLIS) can hallucinate intricate rear details that look convincing to the human eye, but which have zero physical evidence in the input photographs.
        </p>
        <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-1">
          <div className="p-3 rounded-xl bg-black/40 border border-surface-border">
            <span className="text-emerald-400 font-bold block mb-1">Geometry Confidence</span>
            <span className="text-slate-400">
              Evaluated from optical ray intersections, RANSAC inlier ratios, and angular baseline coverage. High in front, Low/Unknown in rear.
            </span>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-surface-border">
            <span className="text-purple-400 font-bold block mb-1">Visual Quality</span>
            <span className="text-slate-400">
              Evaluated from image sharpness, pixel contrast, and surface normal continuity across the reconstructed mesh.
            </span>
          </div>
        </div>
      </div>

      {/* Section 5: Best Practices Capture Guidance */}
      <div className="glass-panel p-6 rounded-2xl border border-surface-border space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Camera className="w-4 h-4 text-accent-cyan" />
          5. Best Practices Capture Guidance
        </h3>
        <p className="text-xs text-slate-300">
          For highest reconstruction fidelity when capturing 2 to 5 photographs:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-surface/80 border border-surface-border flex items-center gap-2 text-emerald-300">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Keep the object completely stationary</span>
          </div>
          <div className="p-2.5 rounded-lg bg-surface/80 border border-surface-border flex items-center gap-2 text-emerald-300">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Avoid motion blur and maintain sharp focus</span>
          </div>
          <div className="p-2.5 rounded-lg bg-surface/80 border border-surface-border flex items-center gap-2 text-emerald-300">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Ensure 40–60° angular spacing between photos</span>
          </div>
          <div className="p-2.5 rounded-lg bg-surface/80 border border-surface-border flex items-center gap-2 text-emerald-300">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Use diffused, uniform illumination</span>
          </div>
          <div className="p-2.5 rounded-lg bg-surface/80 border border-surface-border flex items-center gap-2 text-emerald-300">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Capture textured or patterned surfaces</span>
          </div>
          <div className="p-2.5 rounded-lg bg-surface/80 border border-surface-border flex items-center gap-2 text-emerald-300">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Avoid mirrors and specular transparent glass</span>
          </div>
        </div>
      </div>
    </div>
  );
};
