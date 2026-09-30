import React, { useState, useRef } from 'react';
import { UploadCloud, Image, X, AlertCircle, FileCheck } from 'lucide-react';

interface ImageDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  isUploading?: boolean;
  maxFiles?: number;
}

export const ImageDropzone: React.FC<ImageDropzoneProps> = ({
  onFilesSelected,
  isUploading = false,
  maxFiles = 5
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setErrorMessage(null);

    const validExtensions = ['image/jpeg', 'image/png', 'image/webp'];
    const newFiles: File[] = [];

    for (let i = 0; i < incoming.length; i++) {
      const file = incoming[i];
      if (!validExtensions.includes(file.type)) {
        setErrorMessage(`File "${file.name}" has an unsupported format. Please upload JPG, PNG, or WEBP.`);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setErrorMessage(`File "${file.name}" exceeds 50MB maximum limit.`);
        return;
      }
      newFiles.push(file);
    }

    const combined = [...selectedFiles, ...newFiles];
    if (combined.length > maxFiles) {
      setErrorMessage(`Sparse-view reconstruction accepts between 2 and ${maxFiles} images. (You provided ${combined.length})`);
      return;
    }

    setSelectedFiles(combined);
    // Generate object URLs for preview
    const newUrls = combined.map((f) => URL.createObjectURL(f));
    setPreviews(newUrls);
    onFilesSelected(combined);
  };

  const removeFile = (idx: number) => {
    const updated = selectedFiles.filter((_, i) => i !== idx);
    setSelectedFiles(updated);
    const updatedUrls = previews.filter((_, i) => i !== idx);
    setPreviews(updatedUrls);
    onFilesSelected(updated);
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200
          ${isDragOver
            ? 'border-brand-500 bg-brand-500/10 shadow-glow-brand'
            : 'border-slate-700/80 bg-surface/60 hover:bg-surface-hover hover:border-slate-600'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">
              Drag & Drop 2–5 Viewpoint Photographs
            </h4>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Supports high-resolution JPG, PNG, and WEBP formats
            </p>
          </div>
          <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-surface-hover border border-surface-border text-slate-300">
            Click to Browse Local Storage
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Selected Previews Grid */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Staged Viewpoints ({selectedFiles.length}/{maxFiles}):</span>
            <span className={selectedFiles.length >= 2 ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
              {selectedFiles.length >= 2 ? 'Ready for multi-view analysis' : 'Add at least 1 more viewpoint'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-surface-border bg-black/40 group">
                <img
                  src={previews[idx]}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                  className="absolute top-1.5 right-1.5 p-1 rounded bg-black/70 hover:bg-rose-600 text-white transition-colors"
                  title="Remove View"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-200 truncate max-w-[90%]">
                  View #{idx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
