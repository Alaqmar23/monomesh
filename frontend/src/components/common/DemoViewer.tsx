import React, { useState, useMemo, Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stage, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Sliders } from 'lucide-react';

interface GLTFModelProps {
  modelUrl: string;
  confidenceModelUrl: string;
  sliderValue: number;
}

const DualModelClipper = ({ modelUrl, confidenceModelUrl, sliderValue }: GLTFModelProps) => {
  const { scene: normalScene } = useGLTF(modelUrl);
  const { scene: confScene } = useGLTF(confidenceModelUrl);
  
  const normalClone = useMemo(() => {
    const clone = normalScene.clone();
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = child.material.clone();
        child.material.side = THREE.DoubleSide; 
      }
    });
    return clone;
  }, [normalScene]);
  
  const confClone = useMemo(() => {
    const clone = confScene.clone();
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = child.material.clone();
        child.material.side = THREE.DoubleSide;
      }
    });
    return clone;
  }, [confScene]);

  const normalPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), []);
  const confPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), []);

  useMemo(() => {
    normalClone.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        child.material.clippingPlanes = [normalPlane];
        child.material.clipShadows = true;
        child.material.needsUpdate = true;
      }
    });
    confClone.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        child.material.clippingPlanes = [confPlane];
        child.material.clipShadows = true;
        child.material.needsUpdate = true;
      }
    });
  }, [normalClone, confClone, normalPlane, confPlane]);

  useFrame(({ camera }) => {
    const normalizedSlider = (sliderValue / 100) * 2 - 1;
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const pt = new THREE.Vector3(normalizedSlider, 0, 0.5).unproject(camera);
    
    normalPlane.normal.copy(right).negate();
    normalPlane.constant = -normalPlane.normal.dot(pt);
    
    confPlane.normal.copy(right);
    confPlane.constant = -confPlane.normal.dot(pt);
  });

  return (
    <group>
      <primitive object={normalClone} />
      <primitive object={confClone} />
    </group>
  );
};

interface DemoViewerProps {
  imageSrc: string;
  modelSrc: string;
  confidenceModelSrc: string;
  title: string;
  description: string;
}

export const DemoViewer = ({ imageSrc, modelSrc, confidenceModelSrc, title, description }: DemoViewerProps) => {
  const [sliderValue, setSliderValue] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons === 1 && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      setSliderValue((x / rect.width) * 100);
    }
  };

  return (
    <div className="flat-panel p-6 md:p-8 bg-[#241d1a]/95 backdrop-blur-md border border-[#453a34] rounded-lg shadow-2xl mb-8">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        
        {/* Left: 2D Original Photo */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#8f8077] uppercase tracking-wider">Input image</span>
            <span className="px-2 py-1 bg-[#1a1210] text-[#c4b5aa] text-[10px] font-mono rounded border border-[#453a34]">2D SOURCE</span>
          </div>
          <div className="relative aspect-square rounded-lg overflow-hidden bg-[#1a1210] border border-[#453a34]">
            <img 
              src={imageSrc} 
              alt={title}
              className="w-full h-full object-contain p-4 opacity-90 hover:opacity-100 transition-opacity"
            />
            {/* Corner brackets */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-[#f0604f]/50"></div>
            <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-[#f0604f]/50"></div>
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-[#f0604f]/50"></div>
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-[#f0604f]/50"></div>
          </div>
          <div className="pt-2">
            <h4 className="text-[#fff8f1] font-medium">{title}</h4>
            <p className="text-[#8f8077] text-xs mt-1">{description}</p>
          </div>
        </div>

        {/* Right: Interactive 3D Viewer */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#f0604f] uppercase tracking-wider">Interactive Comparison</span>
            <span className="text-xs font-mono text-[#8f8077]">Drag slider & model</span>
          </div>
          
          <div 
            ref={containerRef}
            className="relative aspect-square rounded-lg overflow-hidden bg-[#1a1210] border border-[#453a34] cursor-grab active:cursor-grabbing group"
          >
            <div className="absolute inset-0 z-10 pointer-events-none shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]"></div>
            
            {/* 3D Canvas */}
            <Canvas gl={{ localClippingEnabled: true }} camera={{ position: [0, 0, 5], fov: 45 }}>
              <Suspense fallback={null}>
                <Stage environment="city" intensity={0.6}>
                  <DualModelClipper 
                    modelUrl={modelSrc} 
                    confidenceModelUrl={confidenceModelSrc} 
                    sliderValue={sliderValue}
                  />
                </Stage>
                <OrbitControls autoRotate={false} enableZoom={true} />
              </Suspense>
            </Canvas>
            
            {/* Slider UI */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              {/* Divider Line */}
              <div 
                className="absolute top-0 bottom-0 w-[2px] bg-[#f0604f] shadow-[0_0_10px_rgba(240,96,79,0.8)] transition-none"
                style={{ left: `${sliderValue}%` }}
              ></div>
              
              {/* Draggable Thumb */}
              <div 
                className="absolute top-1/2 -mt-4 w-8 h-8 -ml-4 rounded-full bg-[#f0604f] flex items-center justify-center pointer-events-auto cursor-ew-resize shadow-lg border-2 border-[#fff8f1] hover:scale-110 active:scale-95 transition-transform"
                style={{ left: `${sliderValue}%` }}
                onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
                onPointerMove={handlePointerMove}
              >
                <Sliders size={14} className="text-[#fff8f1] rotate-90" />
              </div>
              
              {/* Labels */}
              <div className="absolute bottom-3 left-3 px-2 py-1 bg-[#1a1210]/80 text-[#c4b5aa] text-[10px] font-mono rounded border border-[#453a34] backdrop-blur">
                NORMAL MESH
              </div>
              <div className="absolute bottom-3 right-3 px-2 py-1 bg-[#1a1210]/80 text-[#f0604f] text-[10px] font-mono rounded border border-[#f0604f]/30 backdrop-blur">
                CONFIDENCE MAP
              </div>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
};
