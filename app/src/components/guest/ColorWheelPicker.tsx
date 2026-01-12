/**
 * Color Wheel Picker Component
 * Interactive HSV color wheel for precise color selection
 */

import { useState, useRef, useEffect, useCallback } from 'react';

interface ColorWheelPickerProps {
  value: [number, number]; // [hue, saturation]
  onChange: (hs: [number, number]) => void;
  disabled?: boolean;
}

export function ColorWheelPicker({ value, onChange, disabled = false }: ColorWheelPickerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hue, saturation] = value;

  // Draw the color wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 2;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw color wheel
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = (angle - 90) * Math.PI / 180;
      const endAngle = (angle + 1 - 90) * Math.PI / 180;

      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, 'white');
      gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Draw current selection indicator
    const angleRad = (hue - 90) * Math.PI / 180;
    const distance = (saturation / 100) * radius;
    const x = centerX + distance * Math.cos(angleRad);
    const y = centerY + distance * Math.sin(angleRad);

    // Draw outer circle (white)
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw inner circle (black)
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [hue, saturation]);

  const handleColorSelect = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || disabled) return;

    const rect = canvas.getBoundingClientRect();
    const size = canvas.width;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 2;

    // Get coordinates relative to canvas
    const x = ((clientX - rect.left) / rect.width) * size - centerX;
    const y = ((clientY - rect.top) / rect.height) * size - centerY;

    // Calculate angle (hue)
    let angle = Math.atan2(y, x) * 180 / Math.PI + 90;
    if (angle < 0) angle += 360;

    // Calculate distance (saturation)
    const distance = Math.sqrt(x * x + y * y);
    const sat = Math.min((distance / radius) * 100, 100);

    onChange([Math.round(angle), Math.round(sat)]);
  }, [onChange, disabled]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    setIsDragging(true);
    handleColorSelect(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || disabled) return;
    handleColorSelect(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    handleColorSelect(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || disabled) return;
    e.preventDefault();
    const touch = e.touches[0];
    handleColorSelect(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        handleColorSelect(e.clientX, e.clientY);
      };
      const handleGlobalMouseUp = () => {
        setIsDragging(false);
      };

      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, handleColorSelect]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={200}
        height={200}
        className={`rounded-full ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-crosshair'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'none' }}
      />
      <div className="text-xs text-muted-foreground">
        H: {hue}° S: {saturation}%
      </div>
    </div>
  );
}
