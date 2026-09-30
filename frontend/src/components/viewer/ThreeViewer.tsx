import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Grid, Center, Html } from '@react-three/drei';
import * as THREE from 'three';
import { ViewerControls, ViewerMode } from './ViewerControls';
import { ConfidenceLegend } from './ConfidenceLegend';
import { Point3D } from '../../types';
import { Loader2 } from 'lucide-react';

interface ThreeViewerProps {
  modelUrl: string;
  confidenceModelUrl?: string;
  confidenceSummary?: any;
  onPointSelected?: (point: Point3D) => void;
  selectedPointA?: Point3D | null;
  selectedPointB?: Point3D | null;
  distanceResult?: string | null;
}

// Model renderer inside Canvas
const ModelMesh: React.FC<{
  url: string;
  mode: ViewerMode;
  onMeshClick?: (pt: THREE.Vector3) => void;
}> = ({ url, mode, onMeshClick }) => {
  const { scene } = useGLTF(url);
  const clonedScene = React.useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    clonedScene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (mode === 'wireframe') {
          child.material = new THREE.MeshBasicMaterial({
            wireframe: true,
            color: 0x3077ff,
          });
        } else if (mode === 'solid') {
          child.material = new THREE.MeshStandardMaterial({
            color: 0xd1d5db,
            roughness: 0.35,
            metalness: 0.15,
          });
        } else if (mode === 'point_cloud') {
          const geometry = child.geometry;
          child.material = new THREE.PointsMaterial({
            size: 0.025,
            vertexColors: Boolean(geometry.attributes.color),
            color: geometry.attributes.color ? 0xffffff : 0x00f2fe,
          });
        }
      }
    });

    return () => {
      clonedScene.traverse((child: any) => {
        if (child.isMesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m: any) => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    };
  }, [clonedScene, mode]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (onMeshClick && e.point) {
      onMeshClick(e.point);
    }
  };

  return (
    <primitive
      object={clonedScene}
      onClick={handleClick}
    />
  );
};

// 3D Measurement Visualizer Component
const MeasurementVisualizer: React.FC<{
  pointA: Point3D | null;
  pointB: Point3D | null;
  distanceLabel: string | null;
}> = ({ pointA, pointB, distanceLabel }) => {
  if (!pointA && !pointB) return null;

  const vA = pointA ? new THREE.Vector3(pointA.x, pointA.y, pointA.z) : null;
  const vB = pointB ? new THREE.Vector3(pointB.x, pointB.y, pointB.z) : null;

  return (
    <group>
      {vA && (
        <mesh position={vA}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color="#00f2fe" />
          <Html position={[0, 0.08, 0]} center>
            <div className="bg-accent-cyan text-black text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow">
              Point A
            </div>
          </Html>
        </mesh>
      )}

      {vB && (
        <mesh position={vB}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color="#a855f7" />
          <Html position={[0, 0.08, 0]} center>
            <div className="bg-purple-500 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow">
              Point B
            </div>
          </Html>
        </mesh>
      )}

      {vA && vB && (
        <>
          <line>
            <bufferGeometry
              attach="geometry"
              onUpdate={(geo) => {
                const points = [vA, vB];
                geo.setFromPoints(points);
              }}
            />
            <lineBasicMaterial attach="material" color="#f59e0b" linewidth={2} />
          </line>
          {distanceLabel && (
            <Html position={vA.clone().add(vB).multiplyScalar(0.5)} center>
              <div className="bg-amber-500 text-black text-[11px] font-mono font-bold px-2 py-0.5 rounded-full shadow-lg border border-amber-300">
                {distanceLabel}
              </div>
            </Html>
          )}
        </>
      )}
    </group>
  );
};

export const ThreeViewer: React.FC<ThreeViewerProps> = ({
  modelUrl,
  confidenceModelUrl,
  confidenceSummary,
  onPointSelected,
  selectedPointA = null,
  selectedPointB = null,
  distanceResult = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<any>(null);
  const [mode, setMode] = useState<ViewerMode>('textured');
  const [isMeasurementActive, setIsMeasurementActive] = useState(false);

  // Active GLB url: if in confidence mode, load confidence-colored model if available
  const activeModelUrl = mode === 'confidence' && confidenceModelUrl ? confidenceModelUrl : modelUrl;

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleScreenshot = () => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `sparse3d_render_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleMeshClick = (point: THREE.Vector3) => {
    if (isMeasurementActive && onPointSelected) {
      onPointSelected({
        x: Number(point.x.toFixed(4)),
        y: Number(point.y.toFixed(4)),
        z: Number(point.z.toFixed(4)),
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[540px] bg-[#07080c] rounded-2xl overflow-hidden border border-surface-border shadow-2xl select-none"
    >
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [2.5, 2.0, 3.2], fov: 45 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
      >
        <color attach="background" args={['#07080c']} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 8, 5]} intensity={1.4} castShadow />
        <directionalLight position={[-5, 5, -5]} intensity={0.6} />
        <pointLight position={[0, -3, 0]} intensity={0.4} />

        <Suspense
          fallback={
            <Html center>
              <div className="flex items-center gap-2 text-slate-300 text-xs font-mono bg-surface/90 px-3 py-2 rounded-lg border border-surface-border">
                <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                <span>Streaming 3D Geometry...</span>
              </div>
            </Html>
          }
        >
          <Center top>
            <ModelMesh
              url={activeModelUrl}
              mode={mode}
              onMeshClick={handleMeshClick}
            />
          </Center>

          {/* Measurement Visualizer */}
          <MeasurementVisualizer
            pointA={selectedPointA}
            pointB={selectedPointB}
            distanceLabel={distanceResult}
          />
        </Suspense>

        {/* Reference Floor Grid */}
        <Grid
          position={[0, -0.01, 0]}
          args={[12, 12]}
          cellSize={0.5}
          cellThickness={0.6}
          cellColor="#1e2433"
          sectionSize={2.0}
          sectionThickness={1.2}
          sectionColor="#2d374d"
          fadeDistance={18}
          fadeStrength={1.5}
        />

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          maxDistance={12}
          minDistance={0.5}
        />
      </Canvas>

      {/* Confidence Legend (Visible only in confidence mode) */}
      {mode === 'confidence' && (
        <ConfidenceLegend summary={confidenceSummary} />
      )}

      {/* Measurement Mode Prompt Banner */}
      {isMeasurementActive && (
        <div className="absolute top-4 right-4 z-10 bg-purple-950/80 backdrop-blur-md px-3 py-2 rounded-xl border border-purple-500/40 text-xs font-mono text-purple-200 shadow-glass flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
          <span>Click any 2 points on the 3D surface to measure Euclidean distance.</span>
        </div>
      )}

      {/* Floating Bottom Viewport Controls */}
      <ViewerControls
        mode={mode}
        onModeChange={setMode}
        onResetCamera={handleResetCamera}
        onToggleFullscreen={handleToggleFullscreen}
        onScreenshot={handleScreenshot}
        isMeasurementActive={isMeasurementActive}
        onToggleMeasurement={() => setIsMeasurementActive(!isMeasurementActive)}
      />
    </div>
  );
};
