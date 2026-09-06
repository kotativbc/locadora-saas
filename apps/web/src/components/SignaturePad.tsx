import { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
}

/**
 * Campo de assinatura desenhada — pensado pro momento presencial da vistoria
 * (entrega/devolução), onde o cliente assina na tela do dispositivo na hora,
 * diferente da assinatura do contrato (que é feita à distância, por link).
 */
export function SignaturePad({ onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#12213a';
    }
  }, []);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    drawingRef.current = true;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  }

  function move(e: React.MouseEvent | React.TouchEvent) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx?.lineTo(x, y);
    ctx?.stroke();
    if (!hasDrawn) setHasDrawn(true);
  }

  function end() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL('image/png'));
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange(null);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: 160,
          border: '1.5px dashed var(--border)',
          borderRadius: 8,
          background: '#fff',
          touchAction: 'none',
          cursor: 'crosshair',
        }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
          {hasDrawn ? '✓ Assinatura capturada' : 'Assine com o dedo ou o mouse'}
        </span>
        <button
          type="button"
          onClick={clear}
          style={{ background: 'none', border: 'none', color: 'var(--rtv-teal-600)', textDecoration: 'underline', cursor: 'pointer', fontSize: 12, padding: 0 }}
        >
          Limpar
        </button>
      </div>
    </div>
  );
}
