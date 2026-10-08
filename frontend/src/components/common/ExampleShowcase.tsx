import React, { useState, useMemo, Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Center, Environment, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Sliders, Image as ImageIcon, Box, RotateCw } from 'lucide-react';

export interface GLTFModelProps {
  modelUrl: string;
  confidenceModelUrl: string;
  sliderValue: number;
  initialRotation?: [number, number, number];
  autoRotate: boolean;
}

const EnableClipping = () => {
  const { gl } = useThree();
  useEffect(() => {
    gl.localClippingEnabled = true;
  }, [gl]);
  return null;
};

export const DualModelClipper = ({ modelUrl, confidenceModelUrl, sliderValue, initialRotation, autoRotate }: GLTFModelProps) => {
  const { scene: normalScene } = useGLTF(modelUrl);
  const { scene: confScene } = useGLTF(confidenceModelUrl);
  const groupRef = useRef<THREE.Group>(null);

  const normalPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), []);
  const confPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), []);

  const normalClone = useMemo(() => {
    const clone = normalScene.clone();
    clone.traverse((child) => {
      child.raycast = () => null; // Disable expensive CPU raycasting for this mesh
      if (child instanceof THREE.Mesh) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map(m => {
            const mc = m.clone();
            mc.side = THREE.DoubleSide;
            mc.clippingPlanes = [normalPlane];
            mc.clipShadows = true;
            return mc;
          });
        } else if (child.material) {
          child.material = child.material.clone();
          child.material.side = THREE.DoubleSide;
          child.material.clippingPlanes = [normalPlane];
          child.material.clipShadows = true;
        }
      }
    });
    return clone;
  }, [normalScene, normalPlane]);

  const confClone = useMemo(() => {
    const clone = confScene.clone();
    clone.traverse((child) => {
      child.raycast = () => null; // Disable expensive CPU raycasting for this mesh
      if (child instanceof THREE.Mesh) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map(m => {
            const mc = m.clone();
            mc.side = THREE.DoubleSide;
            mc.clippingPlanes = [confPlane];
            mc.clipShadows = true;
            return mc;
          });
        } else if (child.material) {
          child.material = child.material.clone();
          child.material.side = THREE.DoubleSide;
          child.material.clippingPlanes = [confPlane];
          child.material.clipShadows = true;
        }
      }
    });
    return clone;
  }, [confScene, confPlane]);

  const sliderRef = useRef(sliderValue);
  useEffect(() => {
    sliderRef.current = sliderValue;
  }, [sliderValue]);

  useFrame(({ camera }, delta) => {
    // Fix: OrbitControls updates camera position/quaternion but matrixWorld might be stale 
    // when useFrame runs, causing raycaster to compute a slanted plane when rotating.
    camera.updateMatrixWorld();

    const normalizedSlider = (sliderRef.current / 100) * 2 - 1;

    // Cast a ray from the camera through the slider's screen position
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(normalizedSlider, 0), camera);
    const rayDir = raycaster.ray.direction;

    // Get the camera's local up vector in world space
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();

    // The normal of the perspective-correct clipping plane is perpendicular to both the ray and the camera's up vector.
    // up (Y) cross rayDir (-Z) = -X (Left). So this normal points LEFT.
    const leftNormal = new THREE.Vector3().crossVectors(up, rayDir).normalize();

    // The clipping plane must pass directly through the camera's optical center.
    const cameraPos = camera.position;

    // normalPlane keeps everything to the LEFT of the slider.
    normalPlane.normal.copy(leftNormal);
    normalPlane.constant = -normalPlane.normal.dot(cameraPos);

    // confPlane keeps everything to the RIGHT of the slider.
    confPlane.normal.copy(leftNormal).negate();
    confPlane.constant = -confPlane.normal.dot(cameraPos);
  });

  return (
    <group ref={groupRef}>
      <group rotation={initialRotation}>
        <primitive object={normalClone} />
        <primitive object={confClone} />
      </group>
    </group>
  );
};

export interface ExampleItem {
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

interface ExampleShowcaseProps {
  examples: ExampleItem[];
}

export const ExampleShowcase = ({ examples }: ExampleShowcaseProps) => {
  const [selectedExample, setSelectedExample] = useState(0);

  const [sliderValue, setSliderValue] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isInView, setIsInView] = useState(false);
  const showcaseRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy-mount 3D Canvas only when scrolled near the showcase to keep main page refresh 100% stutter-free
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { rootMargin: '300px' }
    );
    if (showcaseRef.current) observer.observe(showcaseRef.current);
    return () => observer.disconnect();
  }, []);

  // Sync state cleanly when changing examples to avoid slider jumps
  useEffect(() => {
    setSliderValue(50);
    setAutoRotate(true);
  }, [selectedExample]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      setSliderValue((x / rect.width) * 100);
    }
  };

  const currentExample = examples[selectedExample];

  return (
    <div ref={showcaseRef} className="flat-panel bg-[#241d1a]/40 backdrop-blur-md border border-[#f0604f]/40 rounded-lg shadow-2xl flex flex-col w-full overflow-hidden">

      {/* TOP BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 py-1.5 border-b border-[#f0604f]/30 gap-2">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-[#1a1210]/60 p-0.5 rounded-md border border-[#f0604f]/30">
          {examples.map((ex, idx) => (
            <button
              key={ex.id}
              onClick={() => setSelectedExample(idx)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${idx === selectedExample
                ? 'bg-[#342a25] text-[#fff8f1]'
                : 'text-[#8f8077] hover:text-[#fff8f1] hover:bg-[#342a25]/50'
                }`}
            >
              {ex.name}
            </button>
          ))}
        </div>

      </div>

      {/* MAIN VIEW AREA */}
      <div className="relative aspect-[21/9] w-full bg-[#16110f]/40 overflow-hidden group" style={{
        backgroundImage: 'linear-gradient(to right, #453a34 1px, transparent 1px), linear-gradient(to bottom, #453a34 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        backgroundPosition: 'center center'
      }}>

          <div
            ref={containerRef}
            className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
          >
              <Canvas 
                gl={{ localClippingEnabled: true, powerPreference: 'high-performance', antialias: false }} 
                dpr={[1, 1.25]} 
                camera={{ position: [0, 0, 5], fov: 45 }}
                frameloop={isInView ? 'always' : 'demand'}
              >
                <Suspense fallback={null}>
                  <ambientLight intensity={0.8} />
                  <directionalLight position={[10, 10, 5]} intensity={1.2} />
                  <Environment preset="city" />
                  <Center>
                    <DualModelClipper
                      modelUrl={currentExample.modelUrl}
                      confidenceModelUrl={currentExample.confidenceModelUrl}
                      sliderValue={sliderValue}
                      initialRotation={currentExample.initialRotation}
                      autoRotate={autoRotate}
                    />
                  </Center>
                  <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    autoRotate={autoRotate}
                    autoRotateSpeed={2.0}
                  />
                </Suspense>
              </Canvas>

            {/* Slider UI */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              {/* Divider Line */}
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-[#f0604f] shadow-[0_0_10px_rgba(240,96,79,0.8)] transition-none"
                style={{ left: `${sliderValue}%`, transform: 'translateX(-50%)' }}
              ></div>

              {/* Draggable Thumb */}
              <div
                className={`absolute top-1/2 -mt-4 w-8 h-8 -ml-4 rounded-full bg-[#f0604f] flex items-center justify-center pointer-events-auto cursor-ew-resize shadow-lg border-2 border-[#fff8f1] transition-transform touch-none ${isDragging ? 'scale-95' : 'hover:scale-110'}`}
                style={{ left: `${sliderValue}%` }}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerMove={handlePointerMove}
              >
                <Sliders size={14} className="text-[#fff8f1] rotate-90" />
              </div>
            </div>

            {/* Photo Thumbnail */}
            <div className="absolute top-4 left-4 z-10 pointer-events-none showcase-thumb-wrapper">
              <div className="bg-[#1a1210]/90 p-1.5 rounded-md border border-[#453a34] backdrop-blur shadow-xl">
                <div 
                  className="w-36 h-36 sm:w-48 sm:h-48 bg-contain bg-center bg-no-repeat rounded"
                  style={{ backgroundImage: `url(${currentExample.photoUrl})`, backgroundColor: '#e6dac3' }}
                />
              </div>
            </div>

            {/* Top Right Confidence Legend */}
            <div className="absolute top-4 right-4 z-10 pointer-events-none confidence-legend-wrapper">
              <div className="bg-[#1a1210]/90 p-3 rounded-md border border-[#453a34] backdrop-blur shadow-xl flex flex-col gap-2">
                <div className="text-[10px] font-mono tracking-widest text-[#c4b5aa] uppercase mb-1">Confidence Scale</div>
                <div className="flex items-center gap-2 text-xs text-[#fff8f1]">
                  <span className="text-green-500 text-lg leading-none">■</span> Exact Reconstruction
                </div>
                <div className="flex items-center gap-2 text-xs text-[#fff8f1]">
                  <span className="text-yellow-500 text-lg leading-none">■</span> Doubtful Details
                </div>
                <div className="flex items-center gap-2 text-xs text-[#fff8f1]">
                  <span className="text-red-500 text-lg leading-none">■</span> Unknown / Generative Fill
                </div>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 z-10 pointer-events-none mesh-label-left">
              <div className="flex flex-col gap-2">

                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1210]/90 border border-[#453a34] rounded text-xs font-mono text-[#c4b5aa] backdrop-blur w-fit">
                  NORMAL MESH
                </div>
              </div>
            </div>

            <div className="absolute bottom-4 right-4 z-10 pointer-events-none flex flex-col justify-end mesh-label-right">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1210]/90 border border-[#453a34] rounded text-xs font-mono text-[#f0604f] backdrop-blur w-fit self-end">
                CONFIDENCE MAP
              </div>
            </div>
          </div>
      </div>

      {/* FOOTER BAR */}
      <div className="border-t border-[#f0604f]/30 bg-[#1a1210]/85 h-2">
        {/* Information removed per user request */}
      </div>

    </div>
  );
};
