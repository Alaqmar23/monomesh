import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// --- CONFIGURATION ---
const CONFIG = {
  SMOOTHING: 0.12,            // Mouse tracking lerp for tilt
  SCROLL_SMOOTHING: 0.16,     // Snappy, butter-smooth scroll tracking
  LENS_RADIUS: 0.6,           // Radius of cursor lens distortion
  LENS_STRENGTH: 0.15,        // Strength of the lens bend
  GRID_SCALE: 3.0,            // Density of the grid
  ROOM_WIDTH: 2.0,            // Room X bounds
  ROOM_HEIGHT: 1.5,           // Room Y bounds
  BG_COLOR: new THREE.Color('#1a1210'),
  GRID_COLOR: new THREE.Color('#b58473'), // Warmer, more visible brown
  ACCENT_COLOR: new THREE.Color('#f0604f'), // Coral
  RENDER_SCALE: 1.0           // 100% native resolution for crisp visuals (pixelation removed)
};

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  varying vec2 vUv;

  uniform vec2 uResolution;
  uniform vec2 uMouse;      // aspect corrected
  uniform vec2 uTilt;       // -1 to 1
  uniform vec4 uRot;        // Precomputed cos/sin for tilt (x=cosY, y=sinY, z=cosX, w=sinX)
  uniform float uScroll;    // 0 to 1
  uniform float uTime;
  uniform float uRippleTime;
  uniform vec2 uRipplePos;  // aspect corrected

  uniform float uGridScale;
  uniform vec3 uColorBg;
  uniform vec3 uColorGrid;
  uniform vec3 uColorAccent;

  const vec2 K_HEX = vec2(0.5, 0.86602540378);

  // Hexagon distance field
  float hexDist(vec2 p) {
    p = abs(p);
    float c = dot(p, K_HEX);
    c = max(c, p.x);
    return c;
  }

  // Returns: xy = local hex center, z = distance to edge, w = distance to center
  vec4 hexCoords(vec2 uv) {
    vec2 r = vec2(1.0, 1.73205080757);
    vec2 h = vec2(0.5, 0.86602540378);
    vec2 a = mod(uv, r) - h;
    vec2 b = mod(uv - h, r) - h;
    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    float edgeDist = 0.5 - hexDist(gv);
    return vec4(gv.x, gv.y, edgeDist, length(gv));
  }

  void main() {
    // 1. Normalize coordinates to -1..1 with aspect correction
    vec2 p = (vUv - 0.5) * 2.0;
    float aspect = uResolution.x / uResolution.y;
    if (aspect > 1.0) {
      p.x *= aspect;
    } else {
      p.y /= aspect;
    }

    // 2. Lens distortion around cursor
    float distToMouse = distance(p, uMouse);
    vec2 dir = p - uMouse;
    if (distToMouse > 0.0) {
      float lens = smoothstep(CONFIG_LENS_RADIUS, 0.0, distToMouse);
      p -= (dir / distToMouse) * lens * CONFIG_LENS_STRENGTH;
    }

    // 3. Click Ripple effect
    if (uRippleTime < 1.0) {
      float rippleDist = distance(p, uRipplePos);
      float wave = sin((rippleDist - uRippleTime * 1.5) * 30.0);
      // Envelope focuses the wave into a moving ring
      float envelope = smoothstep(0.2, 0.0, abs(rippleDist - uRippleTime * 1.5)) * smoothstep(1.0, 0.5, uRippleTime);
      if (rippleDist > 0.0) {
        p += (p - uRipplePos) / rippleDist * wave * envelope * 0.04;
      }
    }

    // 4. Ray setup for 3D Room
    // Move forward into the corridor based on scroll and continuous time drift
    vec3 ro = vec3(0.0, 0.0, -1.0 + (uScroll * 12.0) + (uTime * 0.4));
    vec3 rd = normalize(vec3(p, 1.8)); // FOV control

    // 5. Room intersection (Infinite Corridor, no back wall)
    float tx1 = (-CONFIG_ROOM_WIDTH - ro.x) / rd.x;
    float tx2 = (CONFIG_ROOM_WIDTH - ro.x) / rd.x;
    float tx = max(tx1, tx2);

    float ty1 = (-CONFIG_ROOM_HEIGHT - ro.y) / rd.y;
    float ty2 = (CONFIG_ROOM_HEIGHT - ro.y) / rd.y;
    float ty = max(ty1, ty2);

    // Only intersections in front of camera
    if (tx < 0.0) tx = 9999.0;
    if (ty < 0.0) ty = 9999.0;

    float t = min(tx, ty); // infinite corridor
    vec3 pos = ro + rd * t;

    // 6. Get 2D UV for the intersected wall
    vec2 wallUV;
    if (t == tx) wallUV = pos.yz;
    else wallUV = pos.xz;

    wallUV *= uGridScale;

    // Depth fading (fades to dark in the distance, but keeps a lit fog)
    float depthFade = smoothstep(40.0, 5.0, t);
    depthFade = max(0.4, depthFade); // Never fully black

    // 7. Hexagonal Grid & Center Crosshairs using fwidth for anti-aliasing
    vec2 fw2 = fwidth(wallUV);
    float fw = max(fw2.x, fw2.y);
    
    vec4 hex = hexCoords(wallUV);
    float edgeDist = hex.z;
    float centerDist = hex.w;

    // Constant thickness for hex grid lines
    float thickness = 0.015;
    float grid = smoothstep(thickness + fw, thickness - fw, edgeDist);

    // Coral tri-plus marks at the hexagonal corners
    // The corners are at a distance of ~0.577 from the hex center.
    float cornerMask = smoothstep(0.45, 0.58, centerDist);
    float crosshairThickness = 0.025;
    float crosshairLines = smoothstep(crosshairThickness + fw, crosshairThickness - fw, edgeDist);
    float crosshair = crosshairLines * cornerMask;

    // 8. Masks for readability and center 3D object focus
    float textMask = smoothstep(0.4, 0.0, vUv.x);
    float opacityModifier = 1.0 - (textMask * 0.65); // Don't fade completely on the left

    // Soften center viewport grid so 3D objects have pristine, uncluttered visibility
    float centerDistFromMid = length(vUv - vec2(0.5, 0.5));
    float centerMod = mix(0.38, 1.0, smoothstep(0.18, 0.55, centerDistFromMid));
    float finalGridMod = opacityModifier * centerMod;

    // 9. Composition
    // Base room color (lit fog)
    vec3 color = mix(uColorBg, uColorGrid * 0.25, depthFade);
    // Mix grid (translucent in the center)
    color = mix(color, uColorGrid, grid * 0.85 * depthFade * finalGridMod);
    // Mix coral crosshairs
    color = mix(color, uColorAccent, crosshair * 1.0 * depthFade * finalGridMod);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Inject config constants directly into shader string to avoid too many uniforms
const injectConstants = (shader: string) => {
  return shader
    .replace(/CONFIG_LENS_RADIUS/g, CONFIG.LENS_RADIUS.toFixed(2))
    .replace(/CONFIG_LENS_STRENGTH/g, CONFIG.LENS_STRENGTH.toFixed(2))
    .replace(/CONFIG_ROOM_WIDTH/g, CONFIG.ROOM_WIDTH.toFixed(2))
    .replace(/CONFIG_ROOM_HEIGHT/g, CONFIG.ROOM_HEIGHT.toFixed(2));
};

export const InteractiveBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth <= 768;

    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: false
    });
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    const scale = isMobile ? 0.48 : CONFIG.RENDER_SCALE;
    renderer.setPixelRatio(dpr * scale);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.transform = 'translateZ(0)';
    renderer.domElement.style.backfaceVisibility = 'hidden';
    container.appendChild(renderer.domElement);

    // --- MATERIAL & GEOMETRY ---
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: injectConstants(fragmentShader),
      uniforms: {
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uMouse: { value: new THREE.Vector2(2.0, 2.0) },
        uTilt: { value: new THREE.Vector2(0, 0) },
        uRot: { value: new THREE.Vector4(1, 0, 1, 0) }, // Precomputed rotation matrix values
        uScroll: { value: 0.0 }, // 0 to 1
        uTime: { value: 0 },
        uRippleTime: { value: 1.0 }, // 1.0 = inactive
        uRipplePos: { value: new THREE.Vector2(0, 0) },
        uGridScale: { value: CONFIG.GRID_SCALE },
        uColorBg: { value: CONFIG.BG_COLOR },
        uColorGrid: { value: CONFIG.GRID_COLOR },
        uColorAccent: { value: CONFIG.ACCENT_COLOR }
      },
      depthWrite: false,
      depthTest: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // --- INTERACTION ---
    let targetTilt = new THREE.Vector2(0, 0);
    let currentTilt = new THREE.Vector2(0, 0);
    let targetMouse = new THREE.Vector2(2.0, 2.0);
    let currentMouse = new THREE.Vector2(2.0, 2.0);
    let targetScroll = 0;
    let currentScroll = 0;

    const getAspectCorrectedMouse = (clientX: number, clientY: number) => {
      let mx = (clientX / window.innerWidth) * 2 - 1;
      let my = -(clientY / window.innerHeight) * 2 + 1;
      const aspect = window.innerWidth / window.innerHeight;
      if (aspect > 1.0) {
        mx *= aspect;
      } else {
        my /= aspect;
      }
      return { mx, my };
    };

    let cachedDocHeight = document.documentElement.scrollHeight - window.innerHeight;

    const onScroll = () => {
      if (window.location.pathname.includes('/create')) {
        targetScroll = 0;
        return;
      }
      targetScroll = cachedDocHeight > 0 ? window.scrollY / cachedDocHeight : 0;
    };

    const onPointerMove = (e: PointerEvent | TouchEvent) => {
      if (isMobile) return;

      let clientX, clientY;
      if (window.TouchEvent && e instanceof TouchEvent) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = (e as PointerEvent).clientX;
        clientY = (e as PointerEvent).clientY;
      }

      // Tilt logic (-1 to 1)
      targetTilt.x = (clientX / window.innerWidth) * 2 - 1;
      targetTilt.y = -(clientY / window.innerHeight) * 2 + 1;

      // Aspect corrected mouse for lens distortion - instantaneous 0ms tracking!
      const { mx, my } = getAspectCorrectedMouse(clientX, clientY);
      targetMouse.set(mx, my);
      currentMouse.set(mx, my);
      material.uniforms.uMouse.value.set(mx, my);
    };

    const onClick = (e: MouseEvent) => {
      if (prefersReducedMotion) return;
      const { mx, my } = getAspectCorrectedMouse(e.clientX, e.clientY);
      material.uniforms.uRipplePos.value.set(mx, my);
      material.uniforms.uRippleTime.value = 0.0; // Trigger ripple
    };

    const onPointerLeave = () => {
      targetTilt.set(0, 0);
      targetMouse.set(2.0, 2.0);
      currentMouse.set(2.0, 2.0);
      material.uniforms.uMouse.value.set(2.0, 2.0);
    };

    let resizeTimeout: number;
    const onResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
        cachedDocHeight = document.documentElement.scrollHeight - window.innerHeight;
        onScroll(); // Re-calc scroll on resize
      }, 100);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('click', onClick);
    window.addEventListener('resize', onResize);

    onScroll();
    currentScroll = targetScroll;
    material.uniforms.uScroll.value = currentScroll;
    if (prefersReducedMotion) {
      currentScroll = 0.0;
      targetScroll = 0.0;
      material.uniforms.uScroll.value = 0.0;
    }

    // --- RENDER LOOP (Delta-time based for smooth 60 FPS on any device) ---
    let animId: number;
    const clock = new THREE.Clock();
    let lastTime = performance.now();
    let isVisible = true;

    const onVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) lastTime = performance.now();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.05); // Cap to 50ms to prevent jumps
      lastTime = now;
      const time = clock.getElapsedTime();

      if (!prefersReducedMotion) {
        // Delta-based exponential smoothing for room tilt and scroll
        const scrollDamp = 1.0 - Math.exp(-14.0 * delta);
        const tiltDamp = 1.0 - Math.exp(-9.0 * delta);

        currentScroll += (targetScroll - currentScroll) * scrollDamp;
        currentTilt.lerp(targetTilt, tiltDamp);

        // Advance ripple
        if (material.uniforms.uRippleTime.value < 1.0) {
          material.uniforms.uRippleTime.value += delta * 1.1;
        }

        material.uniforms.uScroll.value = currentScroll;
        material.uniforms.uTilt.value.copy(currentTilt);

        // Precompute tilt matrix values on CPU in JS (instantaneous, 0 per-pixel GPU cost)
        const ty = currentTilt.y * 0.1;
        const tx = currentTilt.x * 0.1;
        material.uniforms.uRot.value.set(Math.cos(ty), Math.sin(ty), Math.cos(tx), Math.sin(tx));
      }

      material.uniforms.uTime.value = time;

      renderer.render(scene, camera);
    };

    animate();

    // --- CLEANUP ---
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none transform-gpu"
      style={{ backgroundColor: CONFIG.BG_COLOR.getStyle(), willChange: 'transform' }}
    >
      <div ref={containerRef} className="absolute inset-0 w-full h-full transform-gpu" />
    </div>
  );
};
