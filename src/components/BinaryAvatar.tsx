import { useEffect, useRef, useState } from 'react';

type Props = {
  progress: number;
};

export default function BinaryAvatar({ progress }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isResolved, setIsResolved] = useState(false);
  const isReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (progress >= 100) {
      setIsResolved(true);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [progress]);

  useEffect(() => {
    if (isReduced || isResolved) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const w = canvas.width;
    const h = canvas.height;
    const cols = 11;
    const rows = 11;
    const cellW = w / cols;
    const cellH = h / rows;

    // Cache of random characters to avoid rapid jitter on every sub-pixel
    let lastTick = 0;
    let grid: string[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (Math.random() > 0.5 ? '1' : '0'))
    );

    const render = (now: number) => {
      // Scramble digits roughly every 50ms
      if (now - lastTick > 50) {
        lastTick = now;
        grid = Array.from({ length: rows }, () =>
          Array.from({ length: cols }, () => (Math.random() > 0.45 ? (Math.random() > 0.5 ? '1' : '0') : (Math.random() > 0.5 ? 'X' : '7')))
        );
      }

      ctx.clearRect(0, 0, w, h);

      if (progress >= 100) return;

      const isLight = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light';
      const scanY = (progress / 100) * (h + 10) - 5;

      ctx.save();
      // Clip canvas drawing to circular avatar boundary
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
      ctx.clip();

      // Mask background below the scanline
      ctx.fillStyle = isLight ? 'rgba(238, 240, 242, 0.94)' : 'rgba(8, 12, 18, 0.92)';
      ctx.fillRect(0, Math.max(0, scanY), w, h - Math.max(0, scanY));

      // Draw binary characters below scanline
      ctx.font = '600 11px "Space", "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let r = 0; r < rows; r++) {
        const y = (r + 0.5) * cellH;
        if (y < scanY - 4) continue; // Already materialized into photo

        const distFromFront = Math.abs(y - scanY);
        for (let c = 0; c < cols; c++) {
          const x = (c + 0.5) * cellW;
          // Only draw if inside circle
          const dx = x - w / 2;
          const dy = y - h / 2;
          if (dx * dx + dy * dy > (w / 2 - 4) * (w / 2 - 4)) continue;

          const char = grid[r][c];

          if (distFromFront < cellH * 1.2) {
            // Hot synthesis frontier (bright white / cyan)
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 6;
          } else {
            ctx.shadowBlur = 0;
            // Matrix stream colors
            if ((r + c) % 3 === 0) {
              ctx.fillStyle = isLight ? '#0284c7' : '#38bdf8'; // Electric cyan
            } else if ((r + c) % 3 === 1) {
              ctx.fillStyle = isLight ? '#059669' : '#34d399'; // Cyber emerald
            } else {
              ctx.fillStyle = isLight ? 'rgba(30, 41, 59, 0.6)' : 'rgba(148, 163, 184, 0.65)'; // Silver byte
            }
          }

          ctx.fillText(char, x, y);
        }
      }

      // Draw active laser scanline at the frontier
      if (scanY >= 0 && scanY <= h) {
        const chordHalf = Math.sqrt(Math.max(0, (w / 2) * (w / 2) - (scanY - h / 2) * (scanY - h / 2)));
        const x1 = w / 2 - chordHalf;
        const x2 = w / 2 + chordHalf;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(x1, scanY);
        ctx.lineTo(x2, scanY);
        ctx.stroke();

        // Glowing end sparks
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(x1, scanY, 2.5, 0, Math.PI * 2);
        ctx.arc(x2, scanY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [progress, isReduced, isResolved]);

  return (
    <div className={`binary-avatar-wrap ${isResolved ? 'is-resolved' : ''}`} aria-hidden="true">
      <img
        src="/images/pp-dev-icon.webp"
        width="78"
        height="78"
        className="identity-mark binary-avatar-img"
        alt=""
        loading="eager"
        decoding="async"
      />
      {!isReduced && !isResolved && (
        <canvas
          ref={canvasRef}
          className="binary-avatar-canvas"
          width={156}
          height={156}
        />
      )}
      <div className="binary-avatar-reticle" />
      <span className="binary-hud-label">
        {progress < 100 ? `01 // ${progress}%` : 'SYS.ONLINE'}
      </span>
    </div>
  );
}
