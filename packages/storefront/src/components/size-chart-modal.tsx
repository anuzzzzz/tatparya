'use client';

import React, { useState } from 'react';
import { X, Ruler } from 'lucide-react';
import { useStore } from './store-provider';

const SIZE_CHARTS: Record<string, { headers: string[]; rows: string[][] }> = {
  fashion: {
    headers: ['Size', 'Chest (in)', 'Waist (in)', 'Length (in)'],
    rows: [
      ['XS', '34', '28', '26'],
      ['S', '36', '30', '27'],
      ['M', '38', '32', '28'],
      ['L', '40', '34', '29'],
      ['XL', '42', '36', '30'],
      ['XXL', '44', '38', '31'],
    ],
  },
  bags: {
    headers: ['Size', 'Length (cm)', 'Width (cm)', 'Height (cm)', 'Strap Drop (cm)'],
    rows: [
      ['Mini', '18', '8', '14', '55'],
      ['Small', '22', '10', '16', '58'],
      ['Medium', '28', '12', '20', '60'],
      ['Large', '34', '14', '24', '62'],
    ],
  },
  jewellery: {
    headers: ['Size', 'Diameter (mm)', 'Circumference (mm)', 'Indian Size'],
    rows: [
      ['6', '16.5', '51.8', '12'],
      ['7', '17.3', '54.4', '14'],
      ['8', '18.1', '57.0', '16'],
      ['9', '19.0', '59.5', '18'],
      ['10', '19.8', '62.1', '20'],
    ],
  },
};

interface SizeChartModalProps {
  vertical?: string;
  productTags?: string[];
}

export function SizeChartModal({ vertical, productTags }: SizeChartModalProps) {
  const [open, setOpen] = useState(false);
  const { design } = useStore();

  let chartKey = 'fashion';
  if (vertical === 'jewellery') chartKey = 'jewellery';
  else if (productTags?.some(t => /bag|purse|tote|clutch|wallet|backpack/i.test(t))) chartKey = 'bags';

  const chart = SIZE_CHARTS[chartKey] || SIZE_CHARTS.fashion!;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-medium underline underline-offset-2 transition-opacity hover:opacity-70"
        style={{ color: design.palette.primary }}
      >
        <Ruler size={13} />
        Size Guide
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-lg max-h-[80vh] overflow-auto rounded-lg p-6"
        style={{ backgroundColor: design.palette.background }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 p-1 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X size={18} />
        </button>

        <h3 className="font-display text-lg font-bold mb-1" style={{ color: design.palette.text }}>
          Size Guide
        </h3>
        <p className="text-xs mb-4" style={{ color: design.palette.textMuted }}>
          Measurements in {chartKey === 'jewellery' ? 'mm' : chartKey === 'bags' ? 'cm' : 'inches'}
        </p>

        <table className="w-full text-xs" style={{ color: design.palette.text }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${design.palette.primary}22` }}>
              {chart.headers.map(h => (
                <th key={h} className="py-2 px-2 text-left font-semibold uppercase tracking-wider text-[10px]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.rows.map((row, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : design.palette.surface }}>
                {row.map((cell, j) => (
                  <td key={j} className="py-2.5 px-2" style={{ fontWeight: j === 0 ? 600 : 400 }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-[10px] mt-4 opacity-50">
          Tip: Measure a similar item you own and compare with the chart above.
        </p>
      </div>
    </div>
  );
}
