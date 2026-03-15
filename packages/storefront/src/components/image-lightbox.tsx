'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export function ImageLightbox({ images, initialIndex = 0, onClose }: ImageLightboxProps) {
  const [current, setCurrent] = useState(initialIndex);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setCurrent(c => (c - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') setCurrent(c => (c + 1) % images.length);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [images.length, onClose]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button
        className="absolute top-4 right-4 z-10 p-2 text-white/70 hover:text-white transition-colors"
        onClick={onClose}
      >
        <X size={24} />
      </button>

      {images.length > 1 && (
        <>
          <button
            className="absolute left-4 z-10 p-2 text-white/50 hover:text-white transition-colors"
            onClick={e => { e.stopPropagation(); setCurrent(c => (c - 1 + images.length) % images.length); }}
          >
            <ChevronLeft size={32} />
          </button>
          <button
            className="absolute right-4 z-10 p-2 text-white/50 hover:text-white transition-colors"
            onClick={e => { e.stopPropagation(); setCurrent(c => (c + 1) % images.length); }}
          >
            <ChevronRight size={32} />
          </button>
        </>
      )}

      <img
        src={images[current]}
        alt=""
        className="max-w-[90vw] max-h-[85vh] object-contain"
        onClick={e => e.stopPropagation()}
        style={{ cursor: 'zoom-out' }}
      />

      {images.length > 1 && (
        <div className="absolute bottom-6 flex gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setCurrent(i); }}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                backgroundColor: i === current ? '#fff' : 'rgba(255,255,255,0.3)',
                transform: i === current ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
