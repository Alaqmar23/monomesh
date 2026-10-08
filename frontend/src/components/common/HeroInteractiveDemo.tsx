import React, { useState, useEffect } from 'react';
import { Box, Image, RotateCw, Check } from 'lucide-react';

interface HeroSample {
  id: string;
  name: string;
  photoUrl: string;
  faceCount: string;
  printTime: string;
  description: string;
}

const HERO_SAMPLES: HeroSample[] = [
  {
    id: 'ceramic-vase',
    name: 'Artisan Vase',
    photoUrl: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=600&auto=format&fit=crop&q=80',
    faceCount: '28,450',
    printTime: '1.4s',
    description: 'Organic curved rim with structured base.'
  },
  {
    id: 'oak-chair',
    name: 'Minimalist Stool',
    photoUrl: 'https://images.unsplash.com/photo-1503602642458-232111445657?w=600&auto=format&fit=crop&q=80',
    faceCount: '34,180',
    printTime: '1.8s',
    description: 'Orthogonal leg joinery resolved without rear camera views.'
  },
  {
    id: 'brass-compass',
    name: 'Mechanical Housing',
    photoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
    faceCount: '46,200',
    printTime: '2.1s',
    description: 'Sharp chamfers and cylindrical cavities preserved.'
  }
];

export const HeroInteractiveDemo: React.FC = () => {
  const [activeSampleIndex, setActiveSampleIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'PHOTO' | 'MESH'>('MESH');
  const [rotationAngle, setRotationAngle] = useState(25);
  const [isAutoRotating, setIsAutoRotating] = useState(true);

  const sample = HERO_SAMPLES[activeSampleIndex];

  // Auto rotation loop for mesh view
  useEffect(() => {
    if (!isAutoRotating || viewMode !== 'MESH') return;
    const interval = setInterval(() => {
      setRotationAngle((prev) => (prev + 1) % 360);
    }, 40);
    return () => clearInterval(interval);
  }, [isAutoRotating, viewMode]);

  return (
    <div className="w-full max-w-[540px] mx-auto lg:max-w-none flat-panel p-5 bg-[#1e2429] border border-[#303840] rounded-lg shadow-xl">
      
      {/* Top Bar: Sample Selector & View Mode Switch */}
      <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-[#303840]">
        
        {/* Sample Switcher Tabs */}
        <div className="flex items-center gap-1.5">
          {HERO_SAMPLES.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setActiveSampleIndex(idx)}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                idx === activeSampleIndex
                  ? 'bg-[#303840] text-[#fff8f1]'
                  : 'text-[#9ca8b4] hover:text-[#fff8f1]'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* 2D Photo vs 3D Mesh Toggle */}
        <div className="flex items-center bg-[#14191d] p-0.5 rounded border border-[#303840] text-xs">
          <button
            onClick={() => setViewMode('PHOTO')}
            className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-medium transition-colors ${
              viewMode === 'PHOTO'
                ? 'bg-[#f0604f] text-[#fff8f1]'
                : 'text-[#9ca8b4] hover:text-[#fff8f1]'
            }`}
          >
            <Image size={13} />
            <span>Photo in</span>
          </button>

          <button
            onClick={() => setViewMode('MESH')}
            className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-medium transition-colors ${
              viewMode === 'MESH'
                ? 'bg-[#f0604f] text-[#fff8f1]'
                : 'text-[#9ca8b4] hover:text-[#fff8f1]'
            }`}
          >
            <Box size={13} />
            <span>3D Mesh out</span>
          </button>
        </div>
      </div>

      {/* Main Visual Display Stage */}
      <div className="relative aspect-[4/3] w-full rounded bg-[#14191d] border border-[#303840] overflow-hidden flex items-center justify-center">
        
        {viewMode === 'PHOTO' ? (
          /* 2D Source Photo View */
          <div className="w-full h-full relative">
            <img 
              src={sample.photoUrl} 
              alt={sample.name} 
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-3 left-3 bg-[#1a1210]/85 px-2.5 py-1 rounded border border-[#352521] text-[11px] font-mono text-[#fff8f1]">
              Single 2D uncalibrated capture
            </div>
          </div>
        ) : (
          /* 3D Mesh Interactive View */
          <div 
            className="w-full h-full relative flex flex-col items-center justify-center p-6 cursor-grab active:cursor-grabbing"
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            title="Click to toggle auto-rotation"
          >
            {/* Fine Wireframe Backdrop Grid */}
            <div 
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(#f0604f 1px, transparent 1px), linear-gradient(90deg, #f0604f 1px, transparent 1px)',
                backgroundSize: '28px 28px'
              }}
            />

            {/* Rotating 3D Geometric Representation */}
            <div 
              className="relative w-40 h-40 md:w-48 md:h-48 flex items-center justify-center transition-transform duration-75"
              style={{ transform: `rotateY(${rotationAngle}deg) rotateX(15deg)` }}
            >
              {/* Wireframe Facet Polygons */}
              <svg viewBox="-80 -80 160 160" className="w-full h-full overflow-visible">
                {/* Simulated 3D Mesh vertices & edges */}
                <g stroke="#f0604f" strokeWidth="1.2" fill="none" opacity="0.85">
                  {/* Outer silhouette wireframe */}
                  <polygon points="0,-65 55,-35 55,35 0,65 -55,35 -55,-35" stroke="#f0604f" strokeWidth="1.8" />
                  
                  {/* Internal isometric tessellation */}
                  <line x1="0" y1="-65" x2="0" y2="65" stroke="#fff8f1" strokeWidth="0.8" opacity="0.6" />
                  <line x1="-55" y1="-35" x2="55" y2="35" stroke="#fff8f1" strokeWidth="0.8" opacity="0.6" />
                  <line x1="-55" y1="35" x2="55" y2="-35" stroke="#fff8f1" strokeWidth="0.8" opacity="0.6" />
                  
                  <polygon points="0,-45 38,-24 38,24 0,45 -38,24 -38,-24" fill="#2d1f1c" fillOpacity="0.6" stroke="#f0604f" />
                  
                  {/* Radial facet lines */}
                  <line x1="0" y1="-65" x2="0" y2="-45" />
                  <line x1="55" y1="-35" x2="38" y2="-24" />
                  <line x1="55" y1="35" x2="38" y2="24" />
                  <line x1="0" y1="65" x2="0" y2="45" />
                  <line x1="-55" y1="35" x2="-38" y2="24" />
                  <line x1="-55" y1="-35" x2="-38" y2="-24" />
                </g>

                {/* Center Vertex Nodes */}
                <circle cx="0" cy="0" r="3" fill="#fff8f1" />
                <circle cx="0" cy="-45" r="2.5" fill="#f0604f" />
                <circle cx="38" cy="-24" r="2.5" fill="#f0604f" />
                <circle cx="38" cy="24" r="2.5" fill="#f0604f" />
                <circle cx="0" cy="45" r="2.5" fill="#f0604f" />
                <circle cx="-38" cy="24" r="2.5" fill="#f0604f" />
                <circle cx="-38" cy="-24" r="2.5" fill="#f0604f" />
              </svg>
            </div>

            {/* Rotation Indicator overlay */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#14191d]/90 px-2 py-1 rounded border border-[#303840] text-[10px] font-mono text-[#9ca8b4]">
              <RotateCw size={11} className={isAutoRotating ? 'animate-spin' : ''} style={{ animationDuration: '4s' }} />
              <span>{rotationAngle}° orbit</span>
            </div>

            {/* Manifold Certification Stamp */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-[#14191d]/90 px-2.5 py-1 rounded border border-[#303840] text-[11px] font-mono text-[#fff8f1]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f0604f]" />
              <span>Ready ✓</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Data Strip */}
      <div className="mt-3.5 pt-3 border-t border-[#303840] flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 text-[#9ca8b4] font-mono text-[11px]">
          <span>{sample.faceCount} faces</span>
          <span>•</span>
          <span>Solved in {sample.printTime}</span>
        </div>
        <div className="text-[11px] text-[#9ca8b4] truncate max-w-[220px]">
          {sample.description}
        </div>
      </div>
    </div>
  );
};
