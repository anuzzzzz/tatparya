'use client';

import React, { useState, useRef, useCallback } from 'react';
import { ImagePlus, Send, X } from 'lucide-react';

// ============================================================
// Chat Input
//
// Text input + photo upload button + send button.
// Supports drag-and-drop for images.
// Shows preview strip when images are staged.
// ============================================================

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onSendImages: (files: File[]) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, onSendImages, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    if (stagedFiles.length > 0) {
      onSendImages(stagedFiles);
      setStagedFiles([]);
    }
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
    }
    inputRef.current?.focus();
  }, [text, stagedFiles, onSendMessage, onSendImages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (images.length > 0) {
      setStagedFiles((prev) => [...prev, ...images]);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const removeStaged = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length > 0) {
      setStagedFiles((prev) => [...prev, ...files]);
    }
  };

  const hasContent = text.trim().length > 0 || stagedFiles.length > 0;

  return (
    <div
      className={`chat-input-container ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Staged image previews */}
      {stagedFiles.length > 0 && (
        <div className="chat-staged-images">
          {stagedFiles.map((file, i) => (
            <div key={i} className="chat-staged-thumb">
              <img src={URL.createObjectURL(file)} alt={file.name} />
              <button
                onClick={() => removeStaged(i)}
                className="chat-staged-remove"
                aria-label="Remove"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="chat-input-row">
        {/* Photo upload */}
        <button
          onClick={() => fileRef.current?.click()}
          className="chat-input-icon"
          title="Upload photos"
          disabled={disabled}
        >
          <ImagePlus size={20} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Text input */}
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message or drop photos..."
          rows={1}
          className="chat-input-textarea"
          disabled={disabled}
        />

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!hasContent || disabled}
          className={`chat-send-button ${hasContent ? 'active' : ''}`}
          aria-label="Send"
        >
          <Send size={18} />
        </button>
      </div>

      {isDragOver && (
        <div className="chat-drop-overlay">
          <ImagePlus size={32} />
          <span>Drop photos here</span>
        </div>
      )}
    </div>
  );
}
