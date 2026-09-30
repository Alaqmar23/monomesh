import React from 'react';
import { Trash2, AlertCircle, CheckCircle, Eye } from 'lucide-react';
import { ProjectImage } from '../../types';

interface ImageQualityCardProps {
  image: ProjectImage;
  index: number;
  onDelete?: (id: string) => void;
}

export const ImageQualityCard: React.FC<ImageQualityCardProps> = ({
  image,
  index,
  onDelete
}) => {
  return (
    <div className="glass-panel p-3.5 rounded-xl border border-surface-border flex flex-col justify-between space-y-3 relative group">
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-black/50 border border-surface-border">
        <img
          src={image.url}
          alt={image.original_name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-[10px] font-mono text-white px-2 py-0.5 rounded border border-white/10">
          View #{index + 1}
        </div>

        {onDelete && (
          <button
            onClick={() => onDelete(image.id)}
            className="absolute top-2 right-2 p-1.5 rounded bg-rose-600/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete Image"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Metrics */}
      <div className="space-y-1.5 text-xs font-mono">
        <div className="text-slate-300 font-medium truncate" title={image.original_name}>
          {image.original_name}
        </div>

        <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400">
          <div>Res: <span className="text-slate-200">{image.width}×{image.height}</span></div>
          <div>Sharpness: <span className={image.sharpness > 200 ? 'text-emerald-400' : 'text-amber-400'}>{image.sharpness}</span></div>
          <div>Features: <span className="text-slate-200">{image.feature_count}</span></div>
          <div>Density: <span className={
            image.feature_density === 'High' ? 'text-emerald-400' :
            image.feature_density === 'Medium' ? 'text-amber-400' : 'text-rose-400'
          }>{image.feature_density}</span></div>
          <div>Exposure: <span className="text-slate-200">{image.exposure}</span></div>
          <div>Status: {image.is_valid ? (
            <span className="text-emerald-400">Valid</span>
          ) : (
            <span className="text-rose-400">Flagged</span>
          )}</div>
        </div>

        {image.validation_error && (
          <div className="text-[10px] text-amber-300 bg-amber-500/10 p-1.5 rounded border border-amber-500/20 flex items-start gap-1">
            <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-400" />
            <span>{image.validation_error}</span>
          </div>
        )}
      </div>
    </div>
  );
};
