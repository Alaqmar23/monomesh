import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ExternalLink,
  Layers,
  Sliders,
  ShieldCheck,
  Camera,
  RotateCw
} from 'lucide-react';
import { InteractiveBackground } from '../components/common/InteractiveBackground';
import { ScrollReveal } from '../components/common/ScrollReveal';
import { MonomeshLogo } from '../components/common/MonomeshLogo';
import { ExampleShowcase } from '../components/common/ExampleShowcase';

interface ExampleItem {
  id: string;
  name: string;
  category: string;
  photoUrl: string;
  modelUrl: string;
  confidenceModelUrl: string;
  faces: string;
  format: string;
  note: string;
  initialRotation?: [number, number, number];
}

const EXAMPLES: ExampleItem[] = [
  {
    id: 'demo1',
    name: 'Rubber Ducky',
    category: 'Toys',
    photoUrl: '/demos/ducky.png',
    modelUrl: '/demos/ducky.glb',
    confidenceModelUrl: '/demos/duckycon.glb',
    faces: '22,480',
    format: 'GLB / OBJ',
    note: 'Smooth organic curves captured from sparse views.',
    initialRotation: [Math.PI / 2, 0, 0] // Positive pitch to stand upright on its feet
  },
  {
    id: 'demo2',
    name: 'Wooden Chair',
    category: 'Furniture',
    photoUrl: '/demos/demo1.png',
    modelUrl: '/demos/demo1.glb',
    confidenceModelUrl: '/demos/demo1con.glb',
    faces: '34,180',
    format: 'GLB / OBJ',
    note: 'Planar surfaces and sharp chamfers preserved.',
    initialRotation: [Math.PI / 2, 0, 0] // Chair was bottom-facing, pitch +90 to make upright
  }
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full relative selection:bg-[#f0604f]/30 selection:text-[#fff8f1] bg-transparent text-[#fff8f1]">
      {/* 3D Textured Origami Architectural Room & Floating Artifact (with 3D back wall relief) */}
      <InteractiveBackground />

      {/* Unboxed Header Directly on Website */}
      <div className="relative z-40 px-6 md:px-12 pt-6 pb-4">
        <header className="max-w-[1320px] mx-auto flex items-center justify-between">
          {/* Logo Lockup - Scaled Up with Dark Theme Wordmark */}
          <MonomeshLogo size="md" showWordmark={true} theme="dark" onClick={() => navigate('/')} />

          {/* Navigation & Action Button */}
          <div className="flex items-center gap-8">
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#c4b5aa]">
              <a href="#how-it-works" className="hover:text-[#fff8f1] transition-colors">How it works</a>
              <a href="#demo" className="hover:text-[#fff8f1] transition-colors">Demo</a>
              <a href="#pipeline" className="hover:text-[#fff8f1] transition-colors">Under the hood</a>
              <a href="#about" className="hover:text-[#fff8f1] transition-colors">About</a>
            </nav>

            <button
              onClick={() => navigate('/create')}
              className="btn-coral px-5 py-2.5 text-sm font-medium flex items-center gap-2"
            >
              <span>Open studio</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </header>
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-[1320px] mx-auto px-6 md:px-12 pt-6 sm:pt-10 pb-24">

        {/* HERO SECTION: Centered Layout (borderless to let hero breathe) */}
        <section className="pt-4 sm:pt-8 md:pt-12 pb-20 sm:pb-28">
          <div className="flex flex-col items-center text-center">

            {/* Top Text Section */}
            <div className="space-y-4 sm:space-y-5 max-w-4xl">
              <ScrollReveal delay={0}>
                <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[84px] font-normal tracking-tight text-[#fff8f1] leading-[0.98]">
                  Flat to <em className="italic text-[#f0604f] font-normal">fully dimensional</em>—from just one glance.
                </h1>
              </ScrollReveal>

              <ScrollReveal delay={80}>
                <p className="text-[#c4b5aa] text-base sm:text-lg md:text-xl leading-relaxed max-w-2xl mx-auto font-normal">
                  Drop any snapshot of a solid object. Monomesh figures out the blind side, cleans the surface noise, and hands you a clean, complete mesh ready for 3D workflows.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={140}>
                <div className="flex flex-wrap items-center justify-center gap-4 pt-5 sm:pt-7">
                  <button
                    onClick={() => navigate('/create')}
                    className="btn-coral px-7 py-3.5 sm:px-9 sm:py-4 text-base sm:text-lg font-medium flex items-center gap-2.5 shadow-lg shadow-[#f0604f]/15 hover:shadow-[#f0604f]/25 transition-all"
                  >
                    <span>Open studio</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              </ScrollReveal>

              {/* Minimal Trust Strip - Anchored toward bottom of viewport */}
              <ScrollReveal delay={200}>
                <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8 pt-7 sm:pt-9 text-xs sm:text-sm font-mono text-[#c4b5aa]">
                  <div className="flex items-center gap-2">
                    <Check size={16} className="text-[#f0604f]" />
                    <span>Complete geometry</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={16} className="text-[#f0604f]" />
                    <span>Export GLB / OBJ / PLY</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={16} className="text-[#f0604f]" />
                    <span>No subscription needed</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>

          </div>
        </section>

        {/* 3-STEP "HOW IT WORKS" STRIP */}
        <section className="py-24 md:py-32 border-b border-[#453a34]">
          <ScrollReveal>
            <div id="how-it-works" className="mb-10 scroll-mt-24">
              <span className="text-xs font-mono uppercase tracking-wider text-[#f0604f]">Simple three-step workflow</span>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#fff8f1] mt-1.5">
                From camera snapshot to clean mesh.
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8">
            <ScrollReveal delay={100}>
              <div className="border-t border-[#453a34] hover:border-[#f0604f] transition-all duration-300 hover:-translate-y-1.5 pt-6 cursor-default group">
                <span className="text-xs font-mono text-[#8f8077] group-hover:text-[#f0604f] transition-colors duration-300 block mb-2">01 / Input</span>
                <h3 className="text-lg font-medium text-[#fff8f1] group-hover:text-[#f0604f] transition-colors duration-300 mb-2">Drop a photo</h3>
                <p className="text-sm text-[#c4b5aa] group-hover:text-[#fff8f1] transition-colors duration-300 leading-relaxed">
                  Snap any object on your desk or pull an image from your camera roll. A plain background and even lighting give the cleanest silhouettes.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={260}>
              <div className="border-t border-[#453a34] hover:border-[#f0604f] transition-all duration-300 hover:-translate-y-1.5 pt-6 cursor-default group">
                <span className="text-xs font-mono text-[#8f8077] group-hover:text-[#f0604f] transition-colors duration-300 block mb-2">02 / Solve</span>
                <h3 className="text-lg font-medium text-[#fff8f1] group-hover:text-[#f0604f] transition-colors duration-300 mb-2">We build the shape</h3>
                <p className="text-sm text-[#c4b5aa] group-hover:text-[#fff8f1] transition-colors duration-300 leading-relaxed">
                  The model predicts the hidden backside, resolves volume across six virtual views, and stitches every vertex into a closed, complete hull.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={420}>
              <div className="border-t border-[#453a34] hover:border-[#f0604f] transition-all duration-300 hover:-translate-y-1.5 pt-6 cursor-default group">
                <span className="text-xs font-mono text-[#8f8077] group-hover:text-[#f0604f] transition-colors duration-300 block mb-2">03 / Result</span>
                <h3 className="text-lg font-medium text-[#fff8f1] group-hover:text-[#f0604f] transition-colors duration-300 mb-2">Download and print</h3>
                <p className="text-sm text-[#c4b5aa] group-hover:text-[#fff8f1] transition-colors duration-300 leading-relaxed">
                  Download a standard .glb, .obj, or .ply file. Open it in Blender, drop it into your 3D slicer, or send it directly to your 3D printer.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Real 3D Showcase - Placed between How It Works and Under the Hood */}
        <section className="py-24 md:py-32 border-b border-[#453a34]">
          <div id="demo" className="w-full relative z-20 scroll-mt-24">
            <ExampleShowcase examples={EXAMPLES} />
          </div>
        </section>

        {/* UNDER THE HOOD: Honest, Demystified Pipeline */}
        <section className="py-24 md:py-32 border-b border-[#453a34]">
          <ScrollReveal>
            <div id="pipeline" className="max-w-2xl mb-12 scroll-mt-24">
              <span className="text-xs font-mono uppercase tracking-wider text-[#f0604f]">Under the hood</span>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#fff8f1] mt-1.5">
                How we turn one image into sealed volume.
              </h2>
              <p className="text-sm sm:text-base text-[#c4b5aa] mt-2 leading-relaxed">
                Single-image reconstruction is tricky because the backside of any object is hidden. Here is how monomesh solves it deterministically without hallucinating messy artifacts.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-10 items-start">

            {/* Pipeline Steps */}
            <ScrollReveal delay={100}>
              <div className="border-l-2 border-[#453a34] hover:border-[#f0604f] transition-colors duration-300 pl-5 py-2 cursor-default group">
                <h4 className="text-base font-medium text-[#fff8f1] group-hover:text-[#f0604f] transition-colors duration-300">1. Six-view synthetic projection</h4>
                <p className="text-xs sm:text-sm text-[#c4b5aa] group-hover:text-[#fff8f1] transition-colors duration-300 mt-1 leading-relaxed">
                  We condition a multi-view model on your single input image to predict the remaining five perspectives (rear, sides, top, bottom), giving every face of the object complete geometric coverage.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={240}>
              <div className="border-l-2 border-[#453a34] hover:border-[#f0604f] transition-colors duration-300 pl-5 py-2 cursor-default group">
                <h4 className="text-base font-medium text-[#fff8f1] group-hover:text-[#f0604f] transition-colors duration-300">2. Continuous volumetric surface extraction</h4>
                <p className="text-xs sm:text-sm text-[#c4b5aa] group-hover:text-[#fff8f1] transition-colors duration-300 mt-1 leading-relaxed">
                  The views are correlated into a continuous signed distance field. An isosurface algorithm extracts a dense polygonal shell, keeping acute edges and chamfers intact.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={380}>
              <div className="border-l-2 border-[#453a34] hover:border-[#f0604f] transition-colors duration-300 pl-5 py-2 cursor-default group">
                <h4 className="text-base font-medium text-[#fff8f1] group-hover:text-[#f0604f] transition-colors duration-300">3. Taubin dual-step smoothing</h4>
                <p className="text-xs sm:text-sm text-[#c4b5aa] group-hover:text-[#fff8f1] transition-colors duration-300 mt-1 leading-relaxed">
                  Standard smoothing shrinks delicate features like cup handles or thin walls. Taubin filtering alternates positive and negative Laplacian passes to kill noise without volume loss.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={520}>
              <div className="border-l-2 border-[#453a34] hover:border-[#f0604f] transition-colors duration-300 pl-5 py-2 cursor-default group">
                <h4 className="text-base font-medium text-[#fff8f1] group-hover:text-[#f0604f] transition-colors duration-300">4. Geometry verification</h4>
                <p className="text-xs sm:text-sm text-[#c4b5aa] group-hover:text-[#fff8f1] transition-colors duration-300 mt-1 leading-relaxed">
                  Every edge is checked to make sure it borders exactly two triangles. A clean structure means your software won't complain about inverted normals or holes.
                </p>
              </div>
            </ScrollReveal>

          </div>
        </section>

      </main>
      
      {/* FOOTER */}
      <footer id="about" className="pt-16 pb-8 border-t border-[#453a34] mt-12 relative z-10">
        <div className="max-w-[1320px] mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-2 gap-12 md:gap-24 mb-16">
            {/* Left: About */}
            <ScrollReveal delay={100}>
              <div>
                <h4 className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#f0604f] mb-5">About the platform</h4>
                <p className="text-sm text-[#c4b5aa] leading-relaxed max-w-md">
                  Monomesh is a state-of-the-art 3D reconstruction platform designed to bridge the gap between 2D photography and functional 3D models. By leveraging multi-view synthesis and volumetric extraction, we provide specialized geometry generation for CAD and 3D printing.
                </p>
              </div>
            </ScrollReveal>

            {/* Right: Reach Out */}
            <ScrollReveal delay={250}>
              <div>
                <h4 className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#f0604f] mb-5">Reach out</h4>
                <div className="space-y-4 text-sm text-[#c4b5aa]">
                  <div className="flex items-center gap-3">
                    <span className="text-[#f0604f] font-mono text-[11px] uppercase tracking-wider w-16">GitHub</span>
                    <span className="text-[#8f8077] font-mono text-[11px]">//</span>
                    <a href="https://github.com/alaqmar23" target="_blank" rel="noopener noreferrer" className="text-[#fff8f1] hover:text-[#f0604f] transition-colors">@alaqmar23</a>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#f0604f] font-mono text-[11px] uppercase tracking-wider w-16">Enquiry</span>
                    <span className="text-[#8f8077] font-mono text-[11px]">//</span>
                    <a href="mailto:monomesh.web@gmail.com" className="text-[#fff8f1] hover:text-[#f0604f] transition-colors">monomesh.web@gmail.com</a>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#f0604f] font-mono text-[11px] uppercase tracking-wider w-16">Personal</span>
                    <span className="text-[#8f8077] font-mono text-[11px]">//</span>
                    <a href="mailto:alaqmarkanchwala4@gmail.com" className="text-[#fff8f1] hover:text-[#f0604f] transition-colors">alaqmarkanchwala4@gmail.com</a>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Bottom Copyright */}
          <div className="text-center border-t border-[#453a34]/50 pt-8">
            <span className="text-xs text-[#8f8077]">
              © 2026 Monomesh // Single-image 3D reconstruction
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
