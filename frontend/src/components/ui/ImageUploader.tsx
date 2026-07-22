import { useRef, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  /** Called with the uploaded URL after successful upload */
  onUploaded: (url: string, jpegUrl?: string) => void;
  /** Existing image URL (for preview) */
  value?: string;
  /** Upload type: 'mockups' or 'photos' */
  type?: string;
  className?: string;
}

/**
 * File uploader with preview (FR-10/11).
 * Click/pick → upload via /api/upload → called onUploaded(url).
 */
export function ImageUploader({ onUploaded, value, type = 'photos', className }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);

    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch(`/api/upload?type=${type}`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      onUploaded(data.url, data.jpegUrl);
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      // Reset input so the same file can be selected again
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Preview or upload area */}
      {value ? (
        <div className="relative w-full h-32 rounded-xl overflow-hidden flex items-center justify-center"
          style={{ background: 'var(--surface)' }}>
          <img src={value} alt="" className="h-full w-auto object-contain" />
          <button onClick={() => onUploaded('')}
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)' }}>
            <X size={14} style={{ color: '#fff' }} />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="w-full h-32 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:opacity-80"
          style={{ background: 'var(--surface)', border: '1px dashed rgba(255,255,255,0.1)' }}>
          {uploading ? (
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--muted)' }} />
          ) : (
            <Upload size={24} style={{ color: 'var(--muted)' }} />
          )}
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            {uploading ? 'Uploading...' : 'Tap to upload'}
          </span>
        </button>
      )}

      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}
