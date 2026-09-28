import { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';

export function useImageExport(scenarioName: string) {
  const cardRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const exportImage = async () => {
    if (!cardRef.current || busyRef.current) return;
    busyRef.current = true;
    setIsExporting(true);
    setError(null);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        backgroundColor: '#F5F5F7',
        pixelRatio: 3,
        skipFonts: true, // External font stylesheets may reject CSS access.
      });
      if (!mounted.current) return;
      const link = document.createElement('a');
      const name = scenarioName.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim() || '시나리오';
      link.download = `stock-snowball-${name}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      if (mounted.current) setError('이미지를 저장하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      busyRef.current = false;
      if (mounted.current) setIsExporting(false);
    }
  };

  return { cardRef, isExporting, error, exportImage };
}
