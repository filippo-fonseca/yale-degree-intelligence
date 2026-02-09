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
 * - mode="stars": parallax starfield with soft twinkle + shooting stars
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
      color: string; // star color
    };

    // ---- SHOOTING STARS ----
    type ShootingStar = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
    };

    // ---- NEURONS ----
    type Node = {
      x: number;
      y: number;
      vx: number;
      vy: number;
    };

    let stars: Star[] = [];
    let shootingStars: ShootingStar[] = [];
    let nodes: Node[] = [];

    const starColors = [
      "rgba(255,255,255,", // white
      "rgba(200,220,255,", // blue-white
      "rgba(255,240,220,", // warm white
      "rgba(180,200,255,", // cool blue
      "rgba(255,200,200,", // pink tint
      "rgba(200,255,220,", // green tint
    ];

    const initStars = () => {
      const density = Math.min(300, Math.floor((width * height) / 12000)); // more stars
      stars = new Array(density).fill(0).map(() => {
        const z = 0.3 + Math.random() * 0.7;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          z,
          r: (0.5 + Math.random() * 2.2) * z,
          tw: Math.random() * Math.PI * 2,
          s: 0.1 + Math.random() * 0.6,
          color: starColors[Math.floor(Math.random() * starColors.length)],
        };
      });
    };

    const spawnShootingStar = () => {
      if (shootingStars.length < 3 && Math.random() < 0.003) {
        const startX = Math.random() * width * 0.8;
        const startY = Math.random() * height * 0.4;
        shootingStars.push({
          x: startX,
          y: startY,
          vx: 4 + Math.random() * 6,
          vy: 2 + Math.random() * 4,
          life: 0,
          maxLife: 40 + Math.random() * 30,
          size: 1.5 + Math.random() * 1.5,
        });
      }
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

      // background vignette with more depth
      const g = ctx.createRadialGradient(
        width * 0.5,
        height * 0.35,
        10,
        width * 0.5,
        height * 0.6,
        Math.max(width, height) * 0.95
      );
      g.addColorStop(0, "rgba(15,20,40,0.0)");
      g.addColorStop(0.5, "rgba(8,12,30,0.15)");
      g.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);

      // Draw stars
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        // gentle drift
        s.x += 0.015 * s.s * (1.3 - s.z);
        s.y += 0.008 * s.s * (1.3 - s.z);

        if (s.x > width + 10) s.x = -10;
        if (s.y > height + 10) s.y = -10;

        // twinkle with more variation
        const twinkle = 0.5 + 0.5 * Math.sin(s.tw + t * (0.0008 + s.z * 0.0012));
        const brightness = 0.4 + 0.6 * twinkle;

        // Main star
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * twinkle, 0, Math.PI * 2);
        ctx.fillStyle = s.color + (brightness * opacity) + ")";
        ctx.fill();

        // Glow for brighter stars
        if (s.r > 1.5) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 2.5, 0, Math.PI * 2);
          const glowGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 2.5);
          glowGrad.addColorStop(0, s.color + (0.15 * brightness * opacity) + ")");
          glowGrad.addColorStop(1, s.color + "0)");
          ctx.fillStyle = glowGrad;
          ctx.fill();
        }

        // Occasional sparkle
        if (Math.random() < 0.001 && s.r > 1.2) {
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(t * 0.001);
          ctx.beginPath();
          for (let j = 0; j < 4; j++) {
            const angle = (j / 4) * Math.PI * 2;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * s.r * 4, Math.sin(angle) * s.r * 4);
          }
          ctx.strokeStyle = `rgba(255,255,255,${0.3 * opacity})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
          ctx.restore();
        }
      }

      // Spawn and draw shooting stars
      spawnShootingStar();

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];
        ss.x += ss.vx;
        ss.y += ss.vy;
        ss.life++;

        const lifeRatio = ss.life / ss.maxLife;
        const alpha = Math.sin(lifeRatio * Math.PI) * 0.9;

        // Draw trail
        const trailLength = 40;
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(ss.x - ss.vx * trailLength, ss.y - ss.vy * trailLength);
        const trailGrad = ctx.createLinearGradient(
          ss.x, ss.y,
          ss.x - ss.vx * trailLength, ss.y - ss.vy * trailLength
        );
        trailGrad.addColorStop(0, `rgba(255,255,255,${alpha * opacity})`);
        trailGrad.addColorStop(0.3, `rgba(200,220,255,${alpha * 0.5 * opacity})`);
        trailGrad.addColorStop(1, `rgba(150,180,255,0)`);
        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = ss.size;
        ctx.lineCap = "round";
        ctx.stroke();

        // Bright head
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, ss.size * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * opacity})`;
        ctx.fill();

        // Remove dead shooting stars
        if (ss.life >= ss.maxLife || ss.x > width + 50 || ss.y > height + 50) {
          shootingStars.splice(i, 1);
        }
      }

      // Nebula clouds with more color
      ctx.globalCompositeOperation = "lighter";

      // Purple nebula
      ctx.fillStyle = "rgba(120,80,180,0.02)";
      ctx.beginPath();
      ctx.ellipse(
        width * 0.7,
        height * 0.2,
        width * 0.3,
        height * 0.15,
        0.3,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Blue nebula
      ctx.fillStyle = "rgba(60,100,200,0.025)";
      ctx.beginPath();
      ctx.ellipse(
        width * 0.25,
        height * 0.6,
        width * 0.25,
        height * 0.2,
        -0.2,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Pink accent
      ctx.fillStyle = "rgba(200,100,150,0.015)";
      ctx.beginPath();
      ctx.ellipse(
        width * 0.8,
        height * 0.7,
        width * 0.2,
        height * 0.12,
        0.5,
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
