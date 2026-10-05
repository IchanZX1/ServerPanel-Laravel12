import React, { useEffect, useRef } from 'react';
import tw from 'twin.macro';

/**
 * Props untuk AnimatedGridBackground.
 */
interface Props {
    /** Diameter glow pointer (px). Default `600`. */
    size?: number;
    /** Alpha maksimum glow pointer. Default `0.10`. */
    intensity?: number;
}

/**
 * Glow radial cyan yang mengikuti cursor di belakang seluruh konten.
 *
 * Melengkapi dua layer grid/spotlight yang dirender `body::before`/`body::after`
 * di `GlobalStylesheet` — mereka tidak bisa mengikuti cursor, jadi butuh DOM
 * nyata di sini. Satu listener `mousemove` yang di-throttle
 * `requestAnimationFrame`; tidak ada animation loop JS permanen.
 */
export default ({ size = 600, intensity = 0.1 }: Props) => {
    const glowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (window.matchMedia('(hover: none), (prefers-reduced-motion: reduce)').matches) {
            return;
        }

        const el = glowRef.current;
        if (!el) {
            return;
        }

        // Posisikan di luar viewport dulu supaya tidak muncul sekilas di pojok.
        el.style.transform = `translate3d(${-size}px, ${-size}px, 0)`;

        let lastX = -size;
        let lastY = -size;
        let frame = 0;
        let pending = false;

        const onMove = (event: MouseEvent) => {
            lastX = event.clientX - size / 2;
            lastY = event.clientY - size / 2;

            // Guard `pending`: puluhan event mousemove per frame hanya
            // menghasilkan satu rAF, jadi tidak ada kerja berulang.
            if (!pending) {
                pending = true;
                frame = window.requestAnimationFrame(() => {
                    pending = false;
                    el.style.transform = `translate3d(${lastX}px, ${lastY}px, 0)`;
                });
            }
        };

        window.addEventListener('mousemove', onMove, { passive: true });

        return () => {
            window.removeEventListener('mousemove', onMove);
            window.cancelAnimationFrame(frame);
        };
    }, [size]);

    return (
        <div
            ref={glowRef}
            aria-hidden={'true'}
            css={tw`hidden xl:block fixed left-0 top-0 pointer-events-none rounded-full`}
            style={{
                width: size,
                height: size,
                zIndex: -1,
                background: `radial-gradient(circle, rgba(6, 182, 212, ${intensity}) 0%, transparent 70%)`,
                willChange: 'transform',
            }}
        />
    );
};
