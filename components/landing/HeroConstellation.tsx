"use client";

import { useEffect, useRef } from "react";

/**
 * HeroConstellation
 *
 * A subtle, theme-aware night sky behind the hero, in two layers.
 *
 * Far layer: a few hundred small neutral stars that twinkle out of phase with
 * each other and drift only slightly with the cursor. Near layer: a sparse set
 * of larger brand-accent nodes that drift on their own, link to nearby
 * neighbours, and brighten and reach toward the pointer.
 *
 * The two layers parallax at different rates, which is what reads as depth: the
 * near field sweeps with the cursor while the sky behind it barely moves. Stars
 * stay neutral on purpose. Tinting them with the brand would flatten both layers
 * into one and lose that separation.
 *
 * Pure <canvas> + requestAnimationFrame, no deps.
 *
 * - position:absolute inset-0, pointer-events-none, aria-hidden, behind content
 * - respects prefers-reduced-motion (renders a single static frame, no listeners)
 * - theme-aware via the `.dark` class on <html> (see context/ThemeContext)
 * - devicePixelRatio-aware for crisp dots; both layers' counts are capped so a
 *   wide monitor cannot turn this into thousands of draw calls per frame
 */

// brand accents
const ACCENTS: Array<[number, number, number]> = [
  [139, 92, 246], // purple
  [59, 130, 246], // blue
  [236, 72, 153], // pink
];

type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: [number, number, number];
};

/**
 * Background stars. Far more numerous and much smaller than the accent nodes,
 * with no links, so the field reads as a sky first and a constellation second.
 * They parallax at a fraction of the nodes' rate, which is what sells depth:
 * the near layer sweeps, the far layer barely moves.
 */
type Star = {
  x: number;
  y: number;
  r: number;
  /** Twinkle phase and rate, so they do not all pulse in unison. */
  phase: number;
  rate: number;
  base: number;
};

/** How much less the star layer shifts than the node layer. */
const STAR_PARALLAX = 0.35;

export default function HeroConstellation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    const nodes: Node[] = [];
    const stars: Star[] = [];

    // pointer state (in CSS pixels, relative to the canvas)
    const pointer = { x: -9999, y: -9999, active: false };
    // smoothed parallax offset
    const parallax = { x: 0, y: 0, tx: 0, ty: 0 };

    const isDark = () =>
      document.documentElement.classList.contains("dark");

    const CONNECT_DIST = 130; // px between nodes to draw a link
    const POINTER_DIST = 170; // px around the cursor to react

    function buildNodes() {
      nodes.length = 0;
      // scale count with area but cap it hard (~50-80)
      const target = Math.round(
        Math.min(80, Math.max(40, (width * height) / 16000)),
      );
      for (let i = 0; i < target; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          r: 0.8 + Math.random() * 1.6,
          color: ACCENTS[(Math.random() * ACCENTS.length) | 0],
        });
      }

      // Denser than the nodes by roughly 4x, and capped so a wide monitor does
      // not quietly turn this into a few thousand draw calls a frame.
      stars.length = 0;
      const starTarget = Math.round(
        Math.min(260, Math.max(90, (width * height) / 4200)),
      );
      for (let i = 0; i < starTarget; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: 0.35 + Math.random() * 0.75,
          phase: Math.random() * Math.PI * 2,
          rate: 0.6 + Math.random() * 1.5,
          base: 0.35 + Math.random() * 0.5,
        });
      }
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildNodes();
    }

    function draw(t: number) {
      const dark = isDark();
      // ease parallax toward target
      parallax.x += (parallax.tx - parallax.x) * 0.06;
      parallax.y += (parallax.ty - parallax.y) * 0.06;

      ctx!.clearRect(0, 0, width, height);

      // base alphas: brighter on dark, whisper-quiet on light
      const lineBase = dark ? 0.5 : 0.28;
      const dotBase = dark ? 0.85 : 0.5;

      // ── Star layer ────────────────────────────────────────────────────────
      // Drawn first and shifted less than the nodes, so it sits behind them.
      // Neutral rather than branded: the accent belongs to the constellation,
      // and tinting the whole sky would flatten the two layers together.
      const starAlpha = dark ? 1 : 0.55;
      const sx0 = parallax.x * STAR_PARALLAX;
      const sy0 = parallax.y * STAR_PARALLAX;
      for (const st of stars) {
        const twinkle = 0.72 + 0.28 * Math.sin(t * 0.001 * st.rate + st.phase);
        const a = st.base * twinkle * starAlpha;
        ctx!.beginPath();
        ctx!.arc(st.x + sx0, st.y + sy0, st.r, 0, Math.PI * 2);
        ctx!.fillStyle = dark
          ? `rgba(226,232,240,${a.toFixed(3)})`
          : `rgba(71,85,105,${a.toFixed(3)})`;
        ctx!.fill();
      }

      // draw connecting lines first
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        const ax = a.x + parallax.x;
        const ay = a.y + parallax.y;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const bx = b.x + parallax.x;
          const by = b.y + parallax.y;
          const dx = ax - bx;
          const dy = ay - by;
          const d2 = dx * dx + dy * dy;
          if (d2 < CONNECT_DIST * CONNECT_DIST) {
            const t = 1 - Math.sqrt(d2) / CONNECT_DIST;
            const c = a.color;
            ctx!.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(
              t *
              lineBase *
              0.5
            ).toFixed(3)})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(ax, ay);
            ctx!.lineTo(bx, by);
            ctx!.stroke();
          }
        }
      }

      // draw nodes + cursor links
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const nx = n.x + parallax.x;
        const ny = n.y + parallax.y;

        let boost = 0;
        if (pointer.active) {
          const dx = nx - pointer.x;
          const dy = ny - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < POINTER_DIST) {
            boost = 1 - dist / POINTER_DIST;
            const c = n.color;
            ctx!.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(
              boost *
              (dark ? 0.6 : 0.4)
            ).toFixed(3)})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(nx, ny);
            ctx!.lineTo(pointer.x, pointer.y);
            ctx!.stroke();
          }
        }

        const c = n.color;
        const alpha = Math.min(1, dotBase + boost * 0.6);
        ctx!.beginPath();
        ctx!.arc(nx, ny, n.r + boost * 1.4, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha.toFixed(3)})`;
        if (boost > 0.2) {
          ctx!.shadowBlur = 8 * boost;
          ctx!.shadowColor = `rgba(${c[0]},${c[1]},${c[2]},${(
            boost * 0.9
          ).toFixed(3)})`;
        } else {
          ctx!.shadowBlur = 0;
        }
        ctx!.fill();
        ctx!.shadowBlur = 0;
      }
    }

    function step(t: number) {
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = width + 20;
        else if (n.x > width + 20) n.x = -20;
        if (n.y < -20) n.y = height + 20;
        else if (n.y > height + 20) n.y = -20;
      }
      draw(t);
      raf = requestAnimationFrame(step);
    }

    let raf = 0;

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas!.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
      // parallax: shift field gently toward cursor (max ~14px)
      parallax.tx = (pointer.x / width - 0.5) * -28;
      parallax.ty = (pointer.y / height - 0.5) * -28;
    };
    const onPointerLeave = () => {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
      parallax.tx = 0;
      parallax.ty = 0;
    };

    resize();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => resize());
      ro.observe(canvas);
    } else {
      window.addEventListener("resize", resize);
    }

    if (reduceMotion) {
      // static single frame, no listeners
      draw(0);
      return () => {
        ro?.disconnect();
        window.removeEventListener("resize", resize);
      };
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
