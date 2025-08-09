"use client";

import { useEffect, useRef } from "react";

type Mode = "stars" | "neurons";

interface CosmicBackgroundProps {
  mode?: Mode;
  opacity?: number; // 0..1
  className?: string; // for custom positioning if needed
}

/**
 * Fixed, full-screen animated canvas background.
 * - mode="stars": parallax starfield with soft twinkle
 * - mode="neurons": moving particles with proximity links (neural vibe)
 */
export default function CosmicBackground({
  mode = "stars",
  opacity = 0.9,
  className = "",
}: CosmicBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let width = 0;
    let height = 0;
    let dpr = Math.min(2, window.devicePixelRatio || 1);

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // ---- STARFIELD ----
    type Star = {
      x: number;
      y: number;
      z: number; // depth for parallax (0.4..1)
      r: number; // radius
      tw: number; // twinkle phase
      s: number; // speed factor
    };

    // ---- NEURONS ----
    type Node = {
      x: number;
      y: number;
      vx: number;
      vy: number;
    };

    let stars: Star[] = [];
    let nodes: Node[] = [];

    const initStars = () => {
      const density = Math.min(220, Math.floor((width * height) / 18000)); // adaptive
      stars = new Array(density).fill(0).map(() => {
        const z = 0.4 + Math.random() * 0.6;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          z,
          r: (0.8 + Math.random() * 1.8) * z,
          tw: Math.random() * Math.PI * 2,
          s: 0.2 + Math.random() * 0.8, // subtle drift
        };
      });
    };

    const initNodes = () => {
      const density = Math.min(140, Math.floor((width * height) / 23000));
      nodes = new Array(Math.max(40, density)).fill(0).map(() => {
        const ang = Math.random() * Math.PI * 2;
        const sp = 0.15 + Math.random() * 0.35;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
        };
      });
    };

    const drawStars = (t: number) => {
      ctx.clearRect(0, 0, width, height);

      // background vignette
      const g = ctx.createRadialGradient(
        width * 0.5,
        height * 0.4,
        10,
        width * 0.5,
        height * 0.6,
        Math.max(width, height) * 0.9
      );
      g.addColorStop(0, "rgba(4,10,25,0.0)");
      g.addColorStop(1, "rgba(0,0,0,0.25)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        // gentle drift
        s.x += 0.02 * s.s * (1.3 - s.z);
        s.y += 0.01 * s.s * (1.3 - s.z);

        if (s.x > width + 10) s.x = -10;
        if (s.y > height + 10) s.y = -10;

        // twinkle
        const twinkle = 0.6 + 0.4 * Math.sin(s.tw + t * (0.001 + s.z * 0.001));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * twinkle, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,200,255,${0.35 * twinkle * opacity})`;
        ctx.fill();

        // subtle color flare
        if (Math.random() < 0.002) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${120 + s.z * 80},${140 + s.z * 70},255,0.04)`;
          ctx.fill();
        }
      }

      // soft nebula sweep
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(80,120,255,0.03)";
      ctx.beginPath();
      ctx.ellipse(
        width * 0.65,
        height * 0.25,
        width * 0.35,
        height * 0.18,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    };

    const drawNeurons = () => {
      ctx.clearRect(0, 0, width, height);

      // background wash
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "rgba(12,20,40,0.12)");
      grad.addColorStop(1, "rgba(8,12,28,0.12)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // update nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;

        // gentle pull to center (breathing)
        const cx = width / 2;
        const cy = height / 2;
        n.vx += (cx - n.x) * 0.00002;
        n.vy += (cy - n.y) * 0.00002;

        // wrap
        if (n.x < -20) n.x = width + 20;
        if (n.x > width + 20) n.x = -20;
        if (n.y < -20) n.y = height + 20;
        if (n.y > height + 20) n.y = -20;
      }

      // links
      const maxDist = Math.min(
        180,
        Math.max(110, Math.hypot(width, height) * 0.07)
      );
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < maxDist * maxDist) {
            const d = Math.sqrt(d2);
            const alpha = ((maxDist - d) / maxDist) * (0.25 * opacity);
            ctx.strokeStyle = `rgba(120,180,255,${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,220,255,${0.65 * opacity})`;
        ctx.fill();
      }
    };

    const tick = (time: number) => {
      if (mode === "stars") {
        drawStars(time);
      } else {
        drawNeurons();
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const start = () => {
      onResize();
      if (mode === "stars") initStars();
      else initNodes();
      if (!prefersReduced) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // draw a static frame for reduced motion users
        if (mode === "stars") drawStars(0);
        else drawNeurons();
      }
    };

    const onVis = () => {
      if (document.hidden) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      } else if (!prefersReduced && !rafRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);
    start();

    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mode, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 -z-10 pointer-events-none select-none ${className}`}
      aria-hidden="true"
      style={{ opacity }}
    />
  );
}
