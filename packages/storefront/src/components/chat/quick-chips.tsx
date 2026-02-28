'use client';

import React from 'react';

// ============================================================
// Quick Chips
//
// Suggested quick actions shown above the input bar.
// Shown when chat is idle or after certain AI responses.
// Phase A: static chips. Phase B+: context-aware suggestions.
// ============================================================

interface QuickChipsProps {
  onSelect: (text: string) => void;
}

const DEFAULT_CHIPS = [
  { label: '📸 Add Products', text: 'I want to add products' },
  { label: '📦 My Orders', text: 'Show my orders' },
  { label: '💰 Revenue', text: 'How much did I earn today?' },
  { label: '⚙️ Store Settings', text: 'Change store settings' },
  { label: '❓ Help', text: 'What can you do?' },
];

export function QuickChips({ onSelect }: QuickChipsProps) {
  return (
    <div className="chat-chips">
      {DEFAULT_CHIPS.map((chip) => (
        <button
          key={chip.text}
          onClick={() => onSelect(chip.text)}
          className="chat-chip"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
