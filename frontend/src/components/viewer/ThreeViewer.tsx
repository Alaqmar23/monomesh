import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Grid, Center, Html } from '@react-three/drei';
import * as THREE from 'three';
import { ViewerMode } from './ViewerControls';
import { Point3D } from '../../types';
import { Loader2 } from 'lucide-react';

interface ThreeViewerProps {
  modelUrl: string;
  confidenceModelUrl?: string;
  generatedModelUrl?: string | null;
  confidenceSummary?: any;
  onPointSelected?: (point: Point3D) => void;
  selectedPointA?: Point3D | null;
  selectedPointB?: Point3D | null;
  distanceResult?: string | null;
  viewerMode?: ViewerMode;
}

// Model renderer inside Canvas
const ModelMesh: React.FC<{
  url: string;
  mode: string;
  colorOverride?: number;
  onMeshClick?: (pt: THREE.Vector3) => void;
}> = ({ url, mode, colorOverride, onMeshClick }) => {
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
            color: colorOverride || 0x00ff00,
          });
        } else if (mode === 'solid') {
          child.material = new THREE.MeshStandardMaterial({
            color: colorOverride || 0x888888,
            roughness: 0.35,
            metalness: 0.15,
          });
        } else if (mode === 'point_cloud') {
          const geometry = child.geometry;
          child.material = new THREE.PointsMaterial({
            size: 0.025,
            vertexColors: Boolean(geometry.attributes.color),
            color: geometry.attributes.color ? 0xffffff : (colorOverride || 0x00ff00),
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
  }, [clonedScene, mode, colorOverride]);

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

// ... MeasurementVisualizer omitted for brevity if unchanged ...
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
          <meshBasicMaterial color="#00ff00" />
          <Html position={[0, 0.08, 0]} center>
            <div className="bg-black text-[#00ff00] border border-[#00ff00] text-[10px] font-mono font-bold px-1.5 py-0.5 shadow">
              Point A
            </div>
          </Html>
        </mesh>
      )}

      {vB && (
        <mesh position={vB}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color="#ff00ff" />
          <Html position={[0, 0.08, 0]} center>
            <div className="bg-black text-[#ff00ff] border border-[#ff00ff] text-[10px] font-mono font-bold px-1.5 py-0.5 shadow">
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
            <lineBasicMaterial attach="material" color="#ffff00" linewidth={2} />
          </line>
          {distanceLabel && (
            <Html position={vA.clone().add(vB).multiplyScalar(0.5)} center>
              <div className="bg-black text-[#ffff00] border border-[#ffff00] text-[11px] font-mono font-bold px-2 py-0.5 shadow-lg">
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
  generatedModelUrl,
  confidenceSummary,
  onPointSelected,
  selectedPointA = null,
  selectedPointB = null,
  distanceResult = null,
  viewerMode = 'solid'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<any>(null);
  const [internalMode, setInternalMode] = useState<ViewerMode>(viewerMode as ViewerMode);
  const [isMeasurementActive, setIsMeasurementActive] = useState(false);

  useEffect(() => {
    setInternalMode(viewerMode as ViewerMode);
  }, [viewerMode]);

  // Active GLB url: if in confidence mode, load confidence-colored model if available
  const activeModelUrl = internalMode === 'confidence' && confidenceModelUrl ? confidenceModelUrl : modelUrl;

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
      className="relative w-full h-full bg-black overflow-hidden select-none"
    >
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [2.5, 2.0, 3.2], fov: 45 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
      >
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 8, 5]} intensity={1.4} castShadow />
        <directionalLight position={[-5, 5, -5]} intensity={0.6} />
        <pointLight position={[0, -3, 0]} intensity={0.4} />

        <Suspense
          fallback={
            <Html center>
              <div className="flex items-center gap-2 text-[#00ff00] text-xs font-mono bg-black border border-[#00ff00] px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#00ff00]" />
                <span className="uppercase tracking-widest">Streaming Matrix</span>
              </div>
            </Html>
          }
        >
          <group>
            {/* Measured Track A Mesh */}
            <ModelMesh
              url={activeModelUrl}
              mode={internalMode}
              onMeshClick={handleMeshClick}
            />
            {/* Generative Track B Mesh (Overlay) */}
            {generatedModelUrl && (
              <ModelMesh
                url={generatedModelUrl}
                mode="wireframe"
                colorOverride={0xff8c00} // Orange wireframe
              />
            )}
          </group>

          {/* Measurement Visualizer */}
          <MeasurementVisualizer
            pointA={selectedPointA}
            pointB={selectedPointB}
            distanceLabel={distanceResult}
          />
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          maxDistance={12}
          minDistance={0.5}
        />
      </Canvas>
      
      {generatedModelUrl && (
        <div className="absolute top-16 left-4 pointer-events-none">
          <div className="text-[#ff8c00] text-xs font-mono font-bold uppercase tracking-widest bg-black border border-[#ff8c00] px-2 py-1 flex items-center gap-2">
            <span className="w-2 h-2 bg-[#ff8c00] rounded-full animate-pulse"></span>
            GENERATIVE TRACK OVERLAY ACTIVE
          </div>
        </div>
      )}
    </div>
  );
};
