import type { HistoricalAssetType } from '../../types/finance';
import { SERIES_PALETTE } from '../../styles/chartPalette';

const ACCESSIBLE_SERIES_PALETTE = SERIES_PALETTE;

const BRAND_SERIES_COLORS: Partial<Record<HistoricalAssetType, string>> = {
  QQQ: '#006b6e',
  TQQQ: '#5b21b6',
  AMD: '#a61b1b',
  TSLA: '#b42318',
  GOLD: '#9a6700',
};

const hexChannels = (hex: string) => hex.match(/[\da-f]{2}/gi)!.map((channel) => Number.parseInt(channel, 16));

const colorDistance = (first: string, second: string) => {
  const [firstRed, firstGreen, firstBlue] = hexChannels(first);
  const [secondRed, secondGreen, secondBlue] = hexChannels(second);
  return Math.hypot(firstRed - secondRed, firstGreen - secondGreen, firstBlue - secondBlue);
};

const isDistinctFrom = (candidate: string, colors: readonly string[]) =>
  colors.every((color) => colorDistance(candidate, color) >= 80);

export const resolveBacktestSeriesColors = (
  assets: readonly HistoricalAssetType[],
): ReadonlyMap<HistoricalAssetType, string> => {
  const colors = new Map<HistoricalAssetType, string>();
  const assignedColors: string[] = [];
  let paletteIndex = 0;

  for (const asset of assets) {
    const brandColor = BRAND_SERIES_COLORS[asset];
    const paletteColor = ACCESSIBLE_SERIES_PALETTE.find((color, index) => {
      if (index < paletteIndex || !isDistinctFrom(color, assignedColors)) return false;
      paletteIndex = index + 1;
      return true;
    }) ?? ACCESSIBLE_SERIES_PALETTE.find((color) => isDistinctFrom(color, assignedColors));
    const color = brandColor && isDistinctFrom(brandColor, assignedColors)
      ? brandColor
      : paletteColor ?? ACCESSIBLE_SERIES_PALETTE[paletteIndex % ACCESSIBLE_SERIES_PALETTE.length];

    colors.set(asset, color);
    assignedColors.push(color);
  }

  return colors;
};
