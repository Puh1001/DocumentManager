'use client';

import { useMemo } from 'react';

interface WatermarkProps {
  text: string;
  opacity?: number;
}

export function Watermark({ text, opacity = 0.08 }: WatermarkProps) {
  // Generate grid of watermarks
  const watermarks = useMemo(() => {
    const items = [];
    const rows = 8;
    const cols = 6;

    for (let i = 0; i < rows * cols; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      
      items.push({
        id: i,
        top: `${(row / rows) * 100}%`,
        left: `${(col / cols) * 100}%`,
      });
    }

    return items;
  }, []);

  return (
    <div className="watermark-overlay pointer-events-none">
      {watermarks.map((mark) => (
        <span
          key={mark.id}
          className="watermark-text"
          style={{
            top: mark.top,
            left: mark.left,
            opacity,
          }}
        >
          {text}
        </span>
      ))}
    </div>
  );
}

