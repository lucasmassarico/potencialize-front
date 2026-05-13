import * as React from "react";

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
}

const PARTICLE_DENSITY = 0.00009;
const PARTICLE_MIN = 28;
const PARTICLE_MAX = 90;
const LINK_DISTANCE = 140;
const MAX_VELOCITY = 0.18;

export function ConstellationCanvas() {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = 0;
        let height = 0;
        let dpr = Math.min(window.devicePixelRatio || 1, 2);
        let particles: Particle[] = [];
        let rafId = 0;

        const spawn = (w: number, h: number): Particle => ({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * MAX_VELOCITY,
            vy: (Math.random() - 0.5) * MAX_VELOCITY,
            r: Math.random() * 1.4 + 0.6,
        });

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const target = Math.max(PARTICLE_MIN, Math.min(PARTICLE_MAX, Math.round(width * height * PARTICLE_DENSITY)));
            particles = Array.from({ length: target }, () => spawn(width, height));
        };

        const drawStatic = () => {
            ctx.clearRect(0, 0, width, height);
            for (const p of particles) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(190,210,255,0.55)";
                ctx.fill();
            }
        };

        const tick = () => {
            ctx.clearRect(0, 0, width, height);

            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < -10) p.x = width + 10;
                if (p.x > width + 10) p.x = -10;
                if (p.y < -10) p.y = height + 10;
                if (p.y > height + 10) p.y = -10;
            }

            for (let i = 0; i < particles.length; i++) {
                const a = particles[i];
                for (let j = i + 1; j < particles.length; j++) {
                    const b = particles[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < LINK_DISTANCE) {
                        const alpha = (1 - dist / LINK_DISTANCE) * 0.35;
                        ctx.strokeStyle = `rgba(180,205,255,${alpha})`;
                        ctx.lineWidth = 0.6;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    }
                }
            }

            for (const p of particles) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(200,220,255,0.7)";
                ctx.fill();
            }

            rafId = requestAnimationFrame(tick);
        };

        resize();
        if (prefersReducedMotion) {
            drawStatic();
        } else {
            rafId = requestAnimationFrame(tick);
        }

        const onResize = () => {
            cancelAnimationFrame(rafId);
            resize();
            if (prefersReducedMotion) drawStatic();
            else rafId = requestAnimationFrame(tick);
        };
        window.addEventListener("resize", onResize);

        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener("resize", onResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden
            style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                display: "block",
            }}
        />
    );
}
