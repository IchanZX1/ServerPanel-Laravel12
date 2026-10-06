import React, { useEffect, useRef } from 'react';
import tw from 'twin.macro';

interface Props {
    /** Diameter glow pointer (px). Default `600`. */
    size?: number;
    /** Alpha maksimum glow pointer. Default `0.10`. */
    intensity?: number;
    /** Jumlah partikel. Default `48`. */
    particleCount?: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    a: number;
}

/**
 * Canvas grid + particle. Spotlight tetap di body::after (CSS).
 * Satu rAF untuk grid drift + partikel, jadi sel & titik terikat mati —
 * tidak ada dua keyframes terpisah yang bisa "selip".
 */
export default ({ size = 600, intensity = 0.10, particleCount = 48 }: Props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const glowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let w = 0;
        let h = 0;
        let cell = window.innerWidth <= 640 ? 32 : 48;
        // 48px / 24s = 2px/s. Dipakai untuk drift diagonal grid.
        const driftSpeed = cell / 24000;

        const particles: Particle[] = [];
        const mouse = { x: -9999, y: -9999, active: false };

        const resize = () => {
            w = window.innerWidth;
            h = window.innerHeight;
            cell = w <= 640 ? 32 : 48;
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const initParticles = () => {
            particles.length = 0;
            const count = reduceMotion ? 0 : particleCount;
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.35,
                    vy: (Math.random() - 0.5) * 0.35,
                    r: Math.random() * 1.1 + 0.6,
                    a: Math.random() * 0.4 + 0.35,
                });
            }
        };

        resize();
        initParticles();

        // Glow pointer — hanya di device dengan hover.
        const canHover = !window.matchMedia('(hover: none)').matches && !reduceMotion;
        let glowPending = false;
        let glowX = -size;
        let glowY = -size;
        if (canHover && glowRef.current) {
            glowRef.current.style.transform = `translate3d(${-size}px, ${-size}px, 0)`;
        }

        const onMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            mouse.active = true;
            if (!canHover || !glowRef.current) return;
            glowX = e.clientX - size / 2;
            glowY = e.clientY - size / 2;
            if (!glowPending) {
                glowPending = true;
                requestAnimationFrame(() => {
                    glowPending = false;
                    if (glowRef.current) {
                        glowRef.current.style.transform = `translate3d(${glowX}px, ${glowY}px, 0)`;
                    }
                });
            }
        };

        const onMouseLeave = () => {
            mouse.active = false;
        };

        window.addEventListener('mousemove', onMouseMove, { passive: true });
        window.addEventListener('mouseleave', onMouseLeave);
        window.addEventListener('resize', resize);

        if (reduceMotion) {
            // Gambar sekali statis — tanpa loop.
            const offset = 0;
            ctx.clearRect(0, 0, w, h);
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            for (let x = offset; x < w + cell; x += cell) {
                ctx.beginPath();
                ctx.moveTo(Math.round(x) + 0.5, 0);
                ctx.lineTo(Math.round(x) + 0.5, h);
                ctx.stroke();
            }
            for (let y = offset; y < h + cell; y += cell) {
                ctx.beginPath();
                ctx.moveTo(0, Math.round(y) + 0.5);
                ctx.lineTo(w, Math.round(y) + 0.5);
                ctx.stroke();
            }
            return () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseleave', onMouseLeave);
                window.removeEventListener('resize', resize);
            };
        }

        let raf = 0;
        const t0 = performance.now();

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame);
            const elapsed = now - t0;
            const drift = (elapsed * driftSpeed) % cell;

            ctx.clearRect(0, 0, w, h);

            // Grid — drift diagonal halus.
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = -cell + drift; x < w + cell; x += cell) {
                const rx = Math.round(x) + 0.5;
                ctx.moveTo(rx, 0);
                ctx.lineTo(rx, h);
            }
            for (let y = -cell + drift; y < h + cell; y += cell) {
                const ry = Math.round(y) + 0.5;
                ctx.moveTo(0, ry);
                ctx.lineTo(w, ry);
            }
            ctx.stroke();

            // Partikel — update + draw.
            for (const p of particles) {
                // Tarik halus ke cursor dalam radius 140px.
                if (mouse.active) {
                    const dx = mouse.x - p.x;
                    const dy = mouse.y - p.y;
                    const dist2 = dx * dx + dy * dy;
                    if (dist2 < 19600 && dist2 > 0.01) {
                        const dist = Math.sqrt(dist2);
                        const f = (1 - dist / 140) * 0.015;
                        p.vx += (dx / dist) * f;
                        p.vy += (dy / dist) * f;
                    }
                }

                // Damping kecil supaya tidak liar.
                p.vx *= 0.998;
                p.vy *= 0.998;
                // Clamp kecepatan.
                const sp = Math.hypot(p.vx, p.vy);
                if (sp > 0.9) {
                    p.vx = (p.vx / sp) * 0.9;
                    p.vy = (p.vy / sp) * 0.9;
                }

                p.x += p.vx;
                p.y += p.vy;

                // Wrap tepi supaya populasi stabil.
                if (p.x < -8) p.x = w + 8;
                if (p.x > w + 8) p.x = -8;
                if (p.y < -8) p.y = h + 8;
                if (p.y > h + 8) p.y = -8;

                // Titik.
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(6,182,212,${p.a})`;
                ctx.fill();
                // Halo lembut.
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * 3.2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(6,182,212,${p.a * 0.08})`;
                ctx.fill();
            }

            // Garis penghubung antar partikel dekat.
            ctx.lineWidth = 0.7;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const a = particles[i];
                    const b = particles[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < 110 * 110) {
                        const d = Math.sqrt(d2);
                        const alpha = (1 - d / 110) * 0.13;
                        ctx.strokeStyle = `rgba(6,182,212,${alpha})`;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    }
                }
            }
        };

        raf = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseleave', onMouseLeave);
            window.removeEventListener('resize', resize);
        };
    }, [size, intensity, particleCount]);

    return (
        <>
            <canvas
                ref={canvasRef}
                aria-hidden={'true'}
                style={{
                    position: 'fixed',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: -1,
                    pointerEvents: 'none',
                    // Fade ke bawah seperti grid CSS semula.
                    WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, transparent 100%)',
                    maskImage: 'linear-gradient(to bottom, #000 0%, transparent 100%)',
                }}
            />
            <div
                ref={glowRef}
                aria-hidden={'true'}
                css={tw`hidden xl:block fixed left-0 top-0 pointer-events-none rounded-full`}
                style={{
                    width: size,
                    height: size,
                    zIndex: -1,
                    background: `radial-gradient(circle, rgba(6,182,212,${intensity}) 0%, transparent 70%)`,
                    willChange: 'transform',
                }}
            />
        </>
    );
};
