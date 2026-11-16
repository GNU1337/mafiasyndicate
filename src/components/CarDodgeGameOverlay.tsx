import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../utils/sound';

interface CarDodgeGameOverlayProps {
  onClose: () => void;
  onFinish: (won: boolean, score: number) => void;
}

const TARGET_SCORE = 40;

interface TrafficCar {
  id: number;
  lane: number;
  y: number;
  passed: boolean;
}

export const CarDodgeGameOverlay: React.FC<CarDodgeGameOverlayProps> = ({ onClose, onFinish }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const finishedRef = useRef(false);

  const stateRef = useRef({
    targetLane: 1,
    playerX: 190,
    roadOffset: 0,
    cars: [] as TrafficCar[],
    nextSpawnDist: 0,
    nextId: 1,
    score: 0,
    speed: 330,
  });

  const steerLeft = () => {
    if (finishedRef.current) return;
    const st = stateRef.current;
    if (st.targetLane > 0) {
      st.targetLane -= 1;
      sound.playSwerve();
    }
  };

  const steerRight = () => {
    if (finishedRef.current) return;
    const st = stateRef.current;
    if (st.targetLane < 2) {
      st.targetLane += 1;
      sound.playSwerve();
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        steerLeft();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        steerRight();
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

    const w = canvas.width;
    const h = canvas.height;
    const roadLeft = 34;
    const roadWidth = w - 68;
    const laneWidth = roadWidth / 3;
    const laneCenters = [
      roadLeft + laneWidth * 0.5,
      roadLeft + laneWidth * 1.5,
      roadLeft + laneWidth * 2.5,
    ];
    stateRef.current.playerX = laneCenters[1];

    const drawSedan = (cx: number, cy: number, bodyColor: string, roofColor: string) => {
      ctx.save();
      ctx.translate(cx, cy);
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.roundRect(-22, -38, 48, 82, 10);
      ctx.fill();
      // Main car body
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.roundRect(-22, -40, 44, 80, 11);
      ctx.fill();
      // Windshield & rear glass
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-16, -22, 32, 42, 6);
      ctx.fill();
      // Roof
      ctx.fillStyle = roofColor;
      ctx.beginPath();
      ctx.roundRect(-14, -12, 28, 24, 4);
      ctx.fill();
      // Headlights
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-17, -40, 8, 4);
      ctx.fillRect(9, -40, 8, 4);
      ctx.restore();
    };

    let rafId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const st = stateRef.current;
      const playerY = h * 0.56;

      if (!finishedRef.current) {
        st.speed = 320 + Math.min(st.score * 6.5, 250);
        st.roadOffset = (st.roadOffset + st.speed * dt) % 64;

        // Smooth lane interpolation
        const targetX = laneCenters[st.targetLane];
        st.playerX += (targetX - st.playerX) * Math.min(1, dt * 16);

        // Spawn oncoming white traffic cars with guaranteed open lane
        st.nextSpawnDist -= st.speed * dt;
        if (st.nextSpawnDist <= 0) {
          const laneA = Math.floor(Math.random() * 3);
          st.cars.push({ id: st.nextId++, lane: laneA, y: -60, passed: false });
          if (Math.random() < 0.42) {
            const laneB = (laneA + 1 + Math.floor(Math.random() * 2)) % 3;
            st.cars.push({ id: st.nextId++, lane: laneB, y: -60, passed: false });
          }
          st.nextSpawnDist = 205 + Math.random() * 90;
        }

        // Update cars & check collisions
        for (let i = st.cars.length - 1; i >= 0; i--) {
          const car = st.cars[i];
          car.y += st.speed * dt;

          const carX = laneCenters[car.lane];
          if (
            Math.abs(carX - st.playerX) < 34 &&
            Math.abs(car.y - playerY) < 68
          ) {
            finishedRef.current = true;
            sound.playCrash();
            setTimeout(() => {
              onFinish(false, st.score);
            }, 380);
            break;
          }

          if (!car.passed && car.y > playerY + 46) {
            car.passed = true;
            st.score += 1;
            setScore(st.score);
            if (st.score >= TARGET_SCORE) {
              finishedRef.current = true;
              sound.playVictory();
              setTimeout(() => {
                onFinish(true, st.score);
              }, 320);
              break;
            }
          }

          if (car.y > h + 90) {
            st.cars.splice(i, 1);
          }
        }
      }

      // Draw black borders + dark asphalt road
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#262626';
      ctx.fillRect(roadLeft, 0, roadWidth, h);

      // Solid white curb lines
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(roadLeft, 0, 8, h);
      ctx.fillRect(roadLeft + roadWidth - 8, 0, 8, h);

      // Dashed lane dividers
      ctx.fillStyle = '#e2e8f0';
      for (let y = st.roadOffset - 64; y < h; y += 64) {
        ctx.fillRect(roadLeft + laneWidth - 2.5, y, 5, 34);
        ctx.fillRect(roadLeft + laneWidth * 2 - 2.5, y, 5, 34);
      }

      // Draw white oncoming traffic sedans
      st.cars.forEach((car) => {
        drawSedan(laneCenters[car.lane], car.y, '#f1f5f9', '#e2e8f0');
      });

      // Draw player's orange getaway sedan
      drawSedan(st.playerX, playerY, '#d97736', '#c26124');

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-6">
      <div className="relative w-full max-w-[780px] h-full max-h-[600px] bg-black rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center shadow-2xl">
        {/* Top-left Score & Target matching IMG_0465 */}
        <div className="absolute top-5 left-6 z-20 pointer-events-none">
          <div className="font-display italic font-bold text-2xl text-white tracking-wide">
            Reach {TARGET_SCORE}!
          </div>
          <div className="font-display italic font-bold text-xl text-white mt-2">
            Your Score:
          </div>
          <div className="font-display font-extrabold text-4xl text-white text-center tabular-nums mt-0.5">
            {score}
          </div>
        </div>

        {/* Top-right Close X */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Highway Getaway"
          className="absolute top-4 right-5 z-20 w-11 h-11 flex items-center justify-center text-white text-3xl font-bold hover:text-amber-300 cursor-pointer"
        >
          ✕
        </button>

        {/* Left Yellow Chevron Button */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            steerLeft();
          }}
          aria-label="Steer Left"
          className="absolute left-5 sm:left-14 top-[56%] -translate-y-1/2 z-20 w-16 h-16 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer"
        >
          <svg viewBox="0 0 60 60" className="w-14 h-14 drop-shadow-lg">
            <polygon points="45,8 12,30 45,52 35,30" fill="#facc15" />
          </svg>
        </button>

        {/* Right Yellow Chevron Button */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            steerRight();
          }}
          aria-label="Steer Right"
          className="absolute right-5 sm:right-14 top-[56%] -translate-y-1/2 z-20 w-16 h-16 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer"
        >
          <svg viewBox="0 0 60 60" className="w-14 h-14 drop-shadow-lg">
            <polygon points="15,8 48,30 15,52 25,30" fill="#facc15" />
          </svg>
        </button>

        {/* Centered Highway Canvas */}
        <canvas
          ref={canvasRef}
          width={360}
          height={600}
          className="h-full max-h-full w-auto aspect-[360/600]"
        />

        <div className="hidden sm:block absolute bottom-3 left-6 text-xs text-slate-400 pointer-events-none">
          Keys: A / D or Left / Right Arrows
        </div>
      </div>
    </div>
  );
};
