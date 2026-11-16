import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../utils/sound';

interface KnifeGameOverlayProps {
  onClose: () => void;
  onFinish: (won: boolean, score: number) => void;
}

const TARGET_SCORE = 15;

export const KnifeGameOverlay: React.FC<KnifeGameOverlayProps> = ({ onClose, onFinish }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const finishedRef = useRef(false);

  const stateRef = useRef({
    logAngle: 0,
    logSpeed: 1.75,
    stuckAngles: [0.35, 2.45] as number[],
    flyingY: -1,
    bouncing: false,
    bounceX: 0,
    bounceY: 0,
    bounceVx: 0,
    bounceVy: 0,
    bounceRot: 0,
    hitShake: 0,
    score: 0,
    elapsed: 0,
  });

  const throwKnife = () => {
    const st = stateRef.current;
    if (finishedRef.current || st.flyingY >= 0 || st.bouncing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    st.flyingY = canvas.height - 92;
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowUp') {
        e.preventDefault();
        throwKnife();
      } else if (e.code === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();

    const drawKnife = (x: number, y: number, angle: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      // Blade
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(5.5, -16);
      ctx.lineTo(4.5, 16);
      ctx.lineTo(-4.5, 16);
      ctx.lineTo(-5.5, -16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Center ridge
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-1.2, -26, 2.4, 40);
      // Guard
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-9, 15, 18, 4.5);
      // Handle
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-4, 19.5, 8, 22);
      ctx.restore();
    };

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const st = stateRef.current;
      st.elapsed += dt;

      const w = canvas.width;
      const h = canvas.height;
      const logX = w / 2 + (st.hitShake > 0 ? Math.sin(st.elapsed * 90) * st.hitShake * 4 : 0);
      const logY = h * 0.37 + (st.hitShake > 0 ? Math.cos(st.elapsed * 75) * st.hitShake * 3 : 0);
      const logRadius = 66;

      // Dynamic speed variation as score increases
      const dirWave = st.score >= 5 ? Math.sin(st.elapsed * 0.85) : 1;
      const baseSpd = 1.65 + st.score * 0.11;
      st.logSpeed = (dirWave >= -0.25 ? 1 : -0.85) * baseSpd;
      st.logAngle = (st.logAngle + st.logSpeed * dt) % (Math.PI * 2);
      if (st.hitShake > 0) st.hitShake = Math.max(0, st.hitShake - dt * 6);

      // Update flying knife
      if (st.flyingY >= 0 && !finishedRef.current) {
        st.flyingY -= 1480 * dt;
        const tipY = st.flyingY - 34;
        if (tipY <= logY + logRadius - 4) {
          // Angle at bottom of log (PI/2 in canvas coords where 0 is right, PI/2 is down)
          const impactAngle = Math.PI / 2 - st.logAngle;
          const normImpact = ((impactAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

          const hitExisting = st.stuckAngles.some((a) => {
            const normA = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            let diff = Math.abs(normA - normImpact);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;
            return diff < 0.23;
          });

          if (hitExisting) {
            sound.playKnifeClang();
            st.flyingY = -1;
            st.bouncing = true;
            st.bounceX = w / 2;
            st.bounceY = logY + logRadius + 24;
            st.bounceVx = (Math.random() > 0.5 ? 1 : -1) * 210;
            st.bounceVy = 260;
            st.bounceRot = 0;
            finishedRef.current = true;
            setTimeout(() => {
              onFinish(false, st.score);
            }, 460);
          } else {
            sound.playKnifeStick();
            st.stuckAngles.push(normImpact);
            st.flyingY = -1;
            st.hitShake = 1;
            st.score += 1;
            setScore(st.score);

            if (st.score >= TARGET_SCORE) {
              finishedRef.current = true;
              sound.playVictory();
              setTimeout(() => {
                onFinish(true, st.score);
              }, 350);
            }
          }
        }
      }

      if (st.bouncing) {
        st.bounceX += st.bounceVx * dt;
        st.bounceY += st.bounceVy * dt;
        st.bounceVy += 980 * dt;
        st.bounceRot += 10 * dt;
      }

      // Background slate-teal arena matching IMG_0469
      ctx.fillStyle = '#2d3d43';
      ctx.fillRect(0, 0, w, h);

      // Subtle vertical moody vignette
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(15,23,42,0.22)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(15,23,42,0.35)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Draw stuck knives rotating with log
      st.stuckAngles.forEach((a) => {
        const worldAngle = a + st.logAngle;
        const kx = logX + Math.cos(worldAngle) * (logRadius + 18);
        const ky = logY + Math.sin(worldAngle) * (logRadius + 18);
        // Knife points inward toward log center
        drawKnife(kx, ky, worldAngle - Math.PI / 2);
      });

      // Draw wooden log target with concentric rings
      ctx.save();
      ctx.translate(logX, logY);
      ctx.rotate(st.logAngle);

      // Outer bark ring
      ctx.beginPath();
      ctx.arc(0, 0, logRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#c28b2c';
      ctx.fill();

      // Inner wood face
      ctx.beginPath();
      ctx.arc(0, 0, logRadius - 6, 0, Math.PI * 2);
      ctx.fillStyle = '#e0b052';
      ctx.fill();

      // Concentric rings
      const rings = [50, 39, 28, 17, 7];
      ctx.strokeStyle = '#c48f2e';
      ctx.lineWidth = 3;
      rings.forEach((r, idx) => {
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * (idx % 2 === 0 ? 0.94 : 1.03), idx * 0.4, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore();

      // Draw flying or waiting knife
      if (st.bouncing) {
        drawKnife(st.bounceX, st.bounceY, st.bounceRot);
      } else if (st.flyingY >= 0) {
        drawKnife(w / 2, st.flyingY, 0);
      } else if (!finishedRef.current) {
        drawKnife(w / 2, h - 92, 0);
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [onFinish]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        throwKnife();
      }}
    >
      {/* Top-right Close X */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close Knife Game"
        className="absolute top-4 right-5 z-20 w-11 h-11 flex items-center justify-center text-white text-3xl font-bold hover:text-amber-300 cursor-pointer"
      >
        ✕
      </button>

      {/* Right-flank goal text matching IMG_0469 */}
      <div className="hidden sm:block absolute right-[14%] top-[18%] z-10 pointer-events-none">
        <p className="font-display italic font-bold text-2xl text-white tracking-wide">
          Reach {TARGET_SCORE}!
        </p>
        <p className="text-xs text-slate-400 mt-1">Click / Tap or Press Space</p>
      </div>

      {/* Centered vertical arena */}
      <div className="relative h-full max-h-[820px] w-full max-w-[380px] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={380}
          height={680}
          className="w-full h-full object-contain cursor-pointer"
        />
        {/* Tall condensed score counter at top */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none text-center">
          <div className="font-display font-extrabold text-6xl text-white leading-none drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)] tabular-nums">
            {score}
          </div>
          <div className="sm:hidden font-display italic font-bold text-base text-amber-300 mt-1">
            Reach {TARGET_SCORE}!
          </div>
        </div>
      </div>
    </div>
  );
};
