import React, { useEffect, useRef } from 'react';

interface MonomeshLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  showWordmark?: boolean;
  className?: string;
  theme?: 'light' | 'dark';
  onClick?: () => void;
}

export const MonomeshLogo: React.FC<MonomeshLogoProps> = ({
  size = 'md',
  showTagline = false,
  showWordmark = true,
  className = '',
  theme = 'light',
  onClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;

    let animId: number;
    const PI = Math.PI;
    const T = 8;
    const S = 23;
    const SC = 0.76;
    const css: { line: string } = { line: '#fbeee6' };

    function eo(u: number) { return 1 - Math.pow(1 - u, 3); }
    function eio(u: number) { return 0.5 - 0.5 * Math.cos(PI * u); }
    function ei(u: number) { return u * u * u; }

    function updateColors() {
      const cs = getComputedStyle(document.documentElement);
      css.line = cs.getPropertyValue('--line').trim() || '#fbeee6';
    }

    const RED = [150, 30, 48];
    const WGC = [118, 22, 38];
    const BKC = [196, 122, 40];
    const HB = -0.2;
    const WING: [number, number][] = [
      [0.15, 0.02], [0.02, 0.28], [-0.25, 0.44], [-0.62, 0.58],
      [-0.55, 0.3], [-0.45, 0.05], [-0.58, -0.12], [-0.3, -0.15], [0, -0.14]
    ];
    const TAIL: [number, number][] = [[-0.5, 0.03], [-0.86, 0.18], [-0.84, -0.06]];
    const BEAKF: [number, number][] = [[0.46, 0.1], [0.46, -0.1], [0.72, -0.02]];
    const BODY: [number, number][] = [];

    for (let a = -0.52; a <= 0.161; a += 0.06) {
      const rr = a < -0.02
        ? 0.1 + 0.26 * Math.pow(Math.sin(PI / 2 * Math.min(1, (a + 0.52) / 0.5)), 0.8)
        : 0.36 * Math.sqrt(Math.max(0.02, 1 - Math.pow((a + 0.02) / 0.4, 2)));
      BODY.push([a, rr]);
    }

    function topAt(a: number) {
      let m = 0;
      BODY.forEach((b) => {
        m = Math.max(m, Math.sqrt(Math.max(0, b[1] * b[1] - (a - b[0]) * (a - b[0]))));
      });
      return m;
    }

    const SPK = [0.14, 0.06, -0.02].map((a) => ({ a, b: topAt(a) - 0.02 }));
    const EYE = [0.27, 0.1, 0.285, 0.035];

    function col(c: number[], k: number) {
      return 'rgb(' + [0, 1, 2].map((i) => Math.min(255, Math.round(c[i] * k))).join(',') + ')';
    }

    const LG = (function () {
      const l = [-0.35, 0.6, 0.72];
      const n = Math.hypot(l[0], l[1], l[2]);
      return [l[0] / n, l[1] / n, l[2] / n];
    })();

    function lit(n: number[]) {
      return 0.92 + 0.08 * Math.max(0, n[0] * LG[0] + n[1] * LG[1] + n[2] * LG[2]);
    }

    function grad(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
      const g = ctx.createRadialGradient(x - 0.05 * r, y - 0.08 * r, r * 0.2, x, y, r * 1.05);
      g.addColorStop(0, '#9c2237');
      g.addColorStop(0.7, '#96202f');
      g.addColorStop(1, '#8a1c2d');
      return g;
    }

    function flat(ctx: CanvasRenderingContext2D, sq: number, alpha: number) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(100, 104);
      ctx.scale(1, sq);
      ctx.translate(-100, -104);

      function P(pts: [number, number][], f: string) {
        ctx.beginPath();
        pts.forEach((p, i) => {
          const x = 100 + p[0] * 100 * SC;
          const y = 104 - p[1] * 100 * SC;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = f;
        ctx.fill();
      }

      P(TAIL, col(WGC, 1));
      P(BEAKF, col(BKC, 1));
      SPK.forEach((k) => {
        P([[k.a + 0.04, k.b], [k.a - 0.04, k.b], [k.a - 0.07, k.b + 0.15]], col(RED, 1));
      });
      BODY.forEach((b) => {
        const x = 100 + b[0] * 100 * SC;
        const rr = b[1] * 100 * SC;
        ctx.beginPath();
        ctx.arc(x, 104, rr, 0, 2 * PI);
        ctx.fillStyle = grad(ctx, x, 104, rr);
        ctx.fill();
      });
      P(WING, col(WGC, 1));
      ctx.beginPath();
      ctx.arc(100 + EYE[0] * 100 * SC, 104 - EYE[1] * 100 * SC, EYE[3] * 100 * SC, 0, 2 * PI);
      ctx.fillStyle = '#111';
      ctx.fill();
      ctx.restore();
    }

    function pose(t: number) {
      const o = { p: [0, 0, 0], sy: 1, tau: -1, mesh: 0, mix: 0, yaw: PI, fa: 0 };
      let u: number;
      if (t < 0.8) {
        // sits in photo
      } else if (t < 1.8) {
        u = t - 0.8;
        o.p = [0, 0.35 * eo(u), 0.95 * eo(u)];
        o.sy = 1 + 0.12 * Math.sin(PI * u);
        o.mesh = u;
        o.mix = Math.min(1, u / 0.18);
        o.fa = eio(Math.min(1, u / 0.6));
      } else if (t < 5.4) {
        u = (t - 1.8) / 3.6;
        const th = 2 * PI * eio(u);
        const R = 0.95 + 0.8 * Math.sin(PI * u);
        o.p = [R * Math.sin(th), 0.35 + 0.3 * Math.sin(2 * PI * u) * Math.sin(PI * u), R * Math.cos(th)];
        o.mesh = 1;
        o.mix = 1;
        o.yaw = PI + th;
        o.fa = 1;
      } else if (t < 6.5) {
        u = (t - 5.4) / 1.1;
        const e = ei(u);
        o.p = [0, 0.35 * (1 - e), 0.95 * (1 - e)];
        o.sy = 1 - 0.45 * e;
        o.mesh = 1;
        o.mix = 1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2));
        o.yaw = 3 * PI;
        o.fa = 1 - eio(Math.min(1, Math.max(0, (u - 0.4) / 0.6)));
      } else {
        o.tau = t - 6.5;
        o.mesh = Math.max(0, 1 - o.tau / 1.2);
      }
      return o;
    }

    let sc = 1;
    function resize() {
      if (!cv) return;
      const dpr = window.devicePixelRatio || 1;
      const w = cv.clientWidth || 120;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(w * dpr);
      sc = cv.width / 100;
    }

    resize();
    updateColors();

    function draw(time: number) {
      if (!cv) return;
      const ctx = cv.getContext('2d');
      if (!ctx) return;

      const tm = time % T;
      const o = pose(tm);
      const ay = -0.62 + 0.05 * Math.sin(time * 0.6);
      const ax = 0.15;
      const tau = o.tau;

      function proj(x: number, y: number, z: number): [number, number, number, number] {
        const x1 = x * Math.cos(ay) + z * Math.sin(ay);
        const z1 = -x * Math.sin(ay) + z * Math.cos(ay);
        const y2 = y * Math.cos(ax) - z1 * Math.sin(ax);
        const z2 = y * Math.sin(ax) + z1 * Math.cos(ax);
        const pf = 1 + 0.08 * z2;
        return [50 + x1 * S * pf, 50 - y2 * S * pf, z2, pf];
      }

      const cs = tau >= 0 ? 1 - 0.05 * (1 - Math.exp(-14 * tau)) * Math.exp(-3.5 * tau) * Math.cos(7 * tau) : 1;
      const TL = proj(-cs, cs, 0);
      const TR = proj(cs, cs, 0);
      const BL = proj(-cs, -cs, 0);
      const cardSq = tau >= 0 ? 1 - 0.45 * Math.exp(-5 * tau) * Math.cos(10 * tau) : o.sy;

      interface SpriteItem {
        t: number;
        z: number;
        P?: [number, number, number, number][];
        c?: string;
        x?: number;
        y?: number;
        r?: number;
      }
      const items: SpriteItem[] = [];
      let cen: [number, number, number, number] = [50, 50, 0, 1];

      if (o.mix > 0) {
        const psi = o.yaw;
        const F = [-Math.cos(psi), 0, Math.sin(psi)];
        const Sw = [F[2], 0, -F[0]];
        const O = [o.p[0], o.p[1] + 0.04 * Math.sin(time * 9) * o.mix, o.p[2]];
        cen = proj(O[0], O[1], O[2]);
        const ph = (0.5 + 0.5 * Math.sin(time * 13)) * 1.1 * o.fa;
        const cp = Math.cos(ph);
        const sp = Math.sin(ph);

        const wv = (p: [number, number, number]): [number, number, number] => [
          (F[0] * p[0] + Sw[0] * p[2]) * SC,
          p[1] * o.sy * SC,
          (F[2] * p[0] + Sw[2] * p[2]) * SC
        ];

        const poly = (pts: [number, number, number][], c: number[]) => {
          const w = pts.map(wv);
          const a = [w[1][0] - w[0][0], w[1][1] - w[0][1], w[1][2] - w[0][2]];
          const b = [w[2][0] - w[0][0], w[2][1] - w[0][1], w[2][2] - w[0][2]];
          let n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
          const l = Math.hypot(n[0], n[1], n[2]) || 1;
          n = [n[0] / l, n[1] / l, n[2] / l];
          if (n[2] < 0) n = [-n[0], -n[1], -n[2]];
          const q = w.map((v) => proj(O[0] + v[0], O[1] + v[1], O[2] + v[2]));
          let z = 0;
          q.forEach((v) => { z += v[2]; });
          items.push({ t: 3, z: z / q.length, P: q, c: col(c, lit(n)) });
        };

        [-1, 1].forEach((sd) => {
          poly(
            WING.map((p) => {
              const ob = p[1] - HB;
              return [p[0], HB + ob * cp, sd * (0.37 + ob * sp)];
            }),
            WGC
          );
        });

        const BB: [number, number, number][] = [
          [0.46, 0.1, 0.1], [0.46, 0.1, -0.1], [0.46, -0.1, -0.1], [0.46, -0.1, 0.1]
        ];
        const tip: [number, number, number] = [0.72, -0.02, 0];
        for (let k = 0; k < 4; k++) poly([BB[k], BB[(k + 1) % 4], tip], BKC);
        poly(TAIL.map((p) => [p[0], p[1], 0] as [number, number, number]), WGC);
        poly([[-0.5, 0.04, 0], [-0.84, 0.04, 0.15], [-0.84, 0.04, -0.15]], WGC);

        SPK.forEach((k) => {
          const bp: [number, number, number][] = [
            [k.a + 0.04, k.b, 0.035], [k.a + 0.04, k.b, -0.035],
            [k.a - 0.04, k.b, -0.035], [k.a - 0.04, k.b, 0.035]
          ];
          const tp: [number, number, number] = [k.a - 0.07, k.b + 0.15, 0];
          for (let m = 0; m < 4; m++) poly([bp[m], bp[(m + 1) % 4], tp], RED);
        });

        const hw = wv([0.16, 0, 0]);
        const hq = proj(O[0] + hw[0], O[1] + hw[1], O[2] + hw[2]);

        [-1, 1].forEach((sd) => {
          const w = wv([EYE[0], EYE[1], sd * EYE[2]]);
          const q = proj(O[0] + w[0], O[1] + w[1], O[2] + w[2]);
          if (q[2] > hq[2]) items.push({ t: 6, z: q[2] + 0.1, x: q[0], y: q[1], r: EYE[3] * SC * S * q[3] });
        });

        BODY.forEach((b) => {
          const w = wv([b[0], 0, 0]);
          const q = proj(O[0] + w[0], O[1] + w[1], O[2] + w[2]);
          items.push({ t: 5, z: q[2], x: q[0], y: q[1], r: b[1] * SC * S * q[3] });
        });

        items.sort((p, q) => p.z - q.z);
      }

      function sprite(sCtx: CanvasRenderingContext2D) {
        sCtx.globalAlpha = o.mix;
        items.forEach((it) => {
          if (it.t === 6 && it.x !== undefined && it.y !== undefined && it.r !== undefined) {
            sCtx.beginPath();
            sCtx.arc(it.x, it.y, it.r, 0, 2 * PI);
            sCtx.fillStyle = '#111';
            sCtx.fill();
            return;
          }
          if (it.t === 5 && it.x !== undefined && it.y !== undefined && it.r !== undefined) {
            sCtx.save();
            sCtx.translate(it.x, it.y);
            sCtx.scale(1 + 0.3 * (1 - o.sy), o.sy);
            sCtx.beginPath();
            sCtx.arc(0, 0, it.r, 0, 2 * PI);
            sCtx.fillStyle = grad(sCtx, 0, 0, it.r);
            sCtx.fill();
            sCtx.restore();
            return;
          }
          if (it.P && it.c) {
            const P = it.P;
            sCtx.beginPath();
            sCtx.moveTo(P[0][0], P[0][1]);
            for (let n = 1; n < P.length; n++) sCtx.lineTo(P[n][0], P[n][1]);
            sCtx.closePath();
            sCtx.fillStyle = it.c;
            sCtx.strokeStyle = it.c;
            sCtx.lineWidth = 0.3;
            sCtx.fill();
            sCtx.stroke();
          }
        });
        sCtx.globalAlpha = 1;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(sc, 0, 0, sc, 0, 0);
      ctx.lineJoin = 'round';

      if (o.mix > 0 && cen[2] < 0) sprite(ctx);

      ctx.save();
      ctx.setTransform(
        sc * (TR[0] - TL[0]) / 200, sc * (TR[1] - TL[1]) / 200,
        sc * (BL[0] - TL[0]) / 200, sc * (BL[1] - TL[1]) / 200,
        sc * TL[0], sc * TL[1]
      );
      ctx.beginPath();
      // Round rect compatibility
      if (ctx.roundRect) ctx.roundRect(0, 0, 200, 200, 14);
      else ctx.rect(0, 0, 200, 200);
      ctx.clip();

      const g = ctx.createLinearGradient(0, 0, 0, 200);
      g.addColorStop(0, '#8fa6d6');
      g.addColorStop(0.35, '#f0a9a0');
      g.addColorStop(0.7, '#ffb27a');
      g.addColorStop(1, '#ffdba6');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 200, 200);

      const sg = ctx.createRadialGradient(48, 48, 10, 48, 48, 80);
      sg.addColorStop(0, 'rgba(255,240,170,.8)');
      sg.addColorStop(0.35, 'rgba(255,160,100,.35)');
      sg.addColorStop(1, 'rgba(255,150,90,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, 200, 200);

      ctx.beginPath();
      ctx.arc(48, 48, 30, 0, 2 * PI);
      ctx.strokeStyle = 'rgba(255,250,220,.55)';
      ctx.lineWidth = 3;
      ctx.stroke();

      const sun = ctx.createRadialGradient(48, 48, 2, 48, 48, 24);
      sun.addColorStop(0, '#fffdea');
      sun.addColorStop(0.6, '#ffec8a');
      sun.addColorStop(1, '#ffcf45');
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(48, 48, 24, 0, 2 * PI);
      ctx.fill();

      ctx.fillStyle = '#ffe2d2';
      const clouds: [number, number, number, number][] = [
        [150, 40, 26, 10], [168, 48, 14, 8], [40, 160, 24, 9], [56, 167, 12, 7]
      ];
      clouds.forEach((c) => {
        ctx.beginPath();
        ctx.ellipse(c[0], c[1], c[2], c[3], 0, 0, 2 * PI);
        ctx.fill();
      });

      if (o.mix < 1) flat(ctx, cardSq, 1 - o.mix);

      if (o.mesh > 0.02) {
        ctx.globalAlpha = 0.3 * o.mesh;
        ctx.strokeStyle = css.line;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let n = 0; n <= 200; n += 20) {
          ctx.moveTo(n, 0); ctx.lineTo(n, 200);
          ctx.moveTo(0, n); ctx.lineTo(200, n);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if (tau >= 0 && tau < 1.4) {
        for (let r = 0; r < 2; r++) {
          const tt = tau - r * 0.22;
          if (tt <= 0) continue;
          ctx.globalAlpha = 0.5 * Math.exp(-2.2 * tt);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(100, 110, tt * 150, 0, 2 * PI);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      ctx.save();
      ctx.setTransform(
        sc * (TR[0] - TL[0]) / 200, sc * (TR[1] - TL[1]) / 200,
        sc * (BL[0] - TL[0]) / 200, sc * (BL[1] - TL[1]) / 200,
        sc * TL[0], sc * TL[1]
      );
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(0, 0, 200, 200, 14);
      else ctx.rect(0, 0, 200, 200);
      ctx.strokeStyle = css.line;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      ctx.globalAlpha = 1;
      if (o.mix > 0 && cen[2] >= 0) sprite(ctx);
    }

    let fr = 0;
    function frame(t: number) {
      if (fr++ % 60 === 0) updateColors();
      draw(t);
    }

    function loop(now: number) {
      frame(now / 1000);
      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const sizeClasses = {
    xs: {
      canvas: 'w-8 h-8',
      word: 'text-xl',
      gap: 'gap-2.5',
      tagline: 'text-xs'
    },
    sm: {
      canvas: 'w-12 h-12 sm:w-14 sm:h-14',
      word: 'text-2xl sm:text-3xl',
      gap: 'gap-3',
      tagline: 'text-xs'
    },
    md: {
      canvas: 'w-16 h-16 sm:w-20 sm:h-20',
      word: 'text-3xl sm:text-4xl md:text-5xl',
      gap: 'gap-3.5 sm:gap-4',
      tagline: 'text-sm'
    },
    lg: {
      canvas: 'w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32',
      word: 'text-5xl sm:text-6xl md:text-7xl',
      gap: 'gap-4 sm:gap-5',
      tagline: 'text-base sm:text-lg'
    }
  }[size];

  return (
    <div 
      className={`inline-flex flex-col select-none cursor-pointer group ${className}`}
      onClick={onClick}
    >
      <div className={`flex items-center ${sizeClasses.gap}`}>
        {/* Animated 3D Bird-out-of-photo Canvas Logo */}
        <canvas 
          ref={canvasRef} 
          className={`block ${sizeClasses.canvas} transition-transform group-hover:scale-105 active:scale-95 flex-shrink-0`}
          aria-hidden="true" 
        />

        {/* Wordmark */}
        {showWordmark && (
          <div className={`word ${sizeClasses.word} font-wordmark font-medium tracking-tight leading-none ${theme === 'dark' ? 'text-[#fff8f1]' : 'text-[#1a1210]'} flex items-center`}>
            <span>mono</span>
            <b className="font-semibold text-[#f0604f]">mesh</b>
          </div>
        )}
      </div>

      {showTagline && (
        <p className={`mt-1.5 font-mono ${sizeClasses.tagline} ${theme === 'dark' ? 'text-[#a89289]' : 'text-[#6e5d57]'} tracking-wider`}>
          one photo, one mesh
        </p>
      )}
    </div>
  );
};
