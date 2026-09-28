import { LoaderCircle, Share2 } from 'lucide-react';
import Button, { type ButtonProps } from './Button';

interface ShareImageButtonProps extends Omit<ButtonProps, 'children'> {
  isExporting?: boolean;
  error?: string | null;
}

export default function ShareImageButton({ isExporting = false, error, disabled, className = '', ...props }: ShareImageButtonProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Button {...props} disabled={isExporting || disabled} aria-busy={isExporting} className={`group motion-reduce:transition-none ${className}`}>
        {isExporting
          ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          : <Share2 className="h-4 w-4 group-hover:rotate-12 transition-transform motion-reduce:transition-none" aria-hidden="true" />}
        <span>{isExporting ? '이미지 만드는 중…' : '공유(이미지)'}</span>
      </Button>
      <span role="status" className="sr-only">{isExporting ? '이미지 만드는 중…' : ''}</span>
      {error && <p role="alert" className="text-caption text-apple-error">{error}</p>}
    </div>
  );
}
