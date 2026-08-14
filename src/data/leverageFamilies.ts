import type { HistoricalCoverage } from './historicalAssets';
import type {
  AssetType,
  CommonCoverage,
  HistoricalAssetType,
  LeverageFamilyId,
  LeverageInsight,
  ProductPerformanceResult,
} from '../types/finance';

export type LeverageFamily = {
  id: LeverageFamilyId;
  label: string;
  members: readonly {
    assetId: HistoricalAssetType;
    targetMultiple: 1 | 2 | 3;
  }[];
};

export const LEVERAGE_FAMILIES = {
  NASDAQ: { id: 'NASDAQ', label: '나스닥', members: [
    { assetId: 'QQQ', targetMultiple: 1 },
    { assetId: 'QLD', targetMultiple: 2 },
    { assetId: 'TQQQ', targetMultiple: 3 },
  ] },
  AMD: { id: 'AMD', label: 'AMD', members: [
    { assetId: 'AMD', targetMultiple: 1 },
    { assetId: 'AMDL', targetMultiple: 2 },
  ] },
  TESLA: { id: 'TESLA', label: 'Tesla', members: [
    { assetId: 'TSLA', targetMultiple: 1 },
    { assetId: 'TSLL', targetMultiple: 2 },
  ] },
  SEMICONDUCTORS: { id: 'SEMICONDUCTORS', label: '반도체', members: [
    { assetId: 'SOXX', targetMultiple: 1 },
    { assetId: 'SOXL', targetMultiple: 3 },
  ] },
} as const satisfies Record<LeverageFamilyId, LeverageFamily>;

type HistoricalCoverageLookup = (asset: HistoricalAssetType) => HistoricalCoverage;

export interface BacktestAssetSelection {
  primaryAsset: HistoricalAssetType;
  comparisonAssets: HistoricalAssetType[];
  startDate: string;
  endDate: string;
}

export const selectLeverageFamily = (familyId: LeverageFamilyId) => {
  const members = LEVERAGE_FAMILIES[familyId].members;
  const primary = members.find((member) => member.targetMultiple === 1)!;

  return {
    primaryAsset: primary.assetId,
    comparisonAssets: members
      .filter((member) => member.targetMultiple > 1)
      .map((member) => member.assetId),
  };
};

export const applyFamilySelection = (
  _params: Pick<{ assetType: AssetType; startDate?: string; endDate?: string }, 'assetType' | 'startDate' | 'endDate'>,
  familyId: LeverageFamilyId,
  getCoverage: HistoricalCoverageLookup,
): BacktestAssetSelection => {
  const selection = selectLeverageFamily(familyId);
  const coverage = getCommonCoverage(
    [selection.primaryAsset, ...selection.comparisonAssets],
    getCoverage,
  );

  return {
    ...selection,
    startDate: coverage.startDate,
    endDate: coverage.endDate,
  };
};

export const getCommonCoverage = (
  assets: readonly HistoricalAssetType[],
  getCoverage: HistoricalCoverageLookup,
): CommonCoverage => {
  if (assets.length === 0) {
    throw new Error('Common coverage requires at least one asset.');
  }

  const coverages = assets.map((asset) => getCoverage(asset));
  const startCoverage = coverages.reduce((latest, coverage) =>
    coverage.startDate > latest.startDate ? coverage : latest,
  );
  const endCoverage = coverages.reduce((earliest, coverage) =>
    coverage.endDate < earliest.endDate ? coverage : earliest,
  );
  if (startCoverage.startDate > endCoverage.endDate) {
    throw new RangeError('Selected assets do not have a common historical coverage interval.');
  }

  return {
    startDate: startCoverage.startDate,
    endDate: endCoverage.endDate,
    startAsset: startCoverage.assetId,
    endAsset: endCoverage.assetId,
  };
};

export interface FamilyDurationPreset {
  name: '1년' | '3년' | '5년' | '10년' | '전체';
  startDate: string;
  endDate: string;
  description: string;
  isDuration: true;
  disabled: boolean;
  reason: string;
}

const toDateString = (date: Date): string => date.toISOString().slice(0, 10);

const availableCoverageReason = (coverage: CommonCoverage): string =>
  `${coverage.startAsset} 데이터는 ${coverage.startDate}부터 사용할 수 있습니다.`;

export function getFamilyDurationPresets(coverage: CommonCoverage): FamilyDurationPreset[];
export function getFamilyDurationPresets(
  family: LeverageFamily,
  getCoverage: HistoricalCoverageLookup,
): FamilyDurationPreset[];
export function getFamilyDurationPresets(
  coverageOrFamily: CommonCoverage | LeverageFamily,
  getCoverage?: HistoricalCoverageLookup,
): FamilyDurationPreset[] {
  const coverage = getCoverage
    ? getCommonCoverage(
      (coverageOrFamily as LeverageFamily).members.map((member) => member.assetId),
      getCoverage,
    )
    : coverageOrFamily as CommonCoverage;
  const reason = availableCoverageReason(coverage);
  const durationNames = [
    ['1년', 1],
    ['3년', 3],
    ['5년', 5],
    ['10년', 10],
  ] as const;

  return [
    ...durationNames.map(([name, years]) => {
      const startDate = new Date(`${coverage.endDate}T00:00:00Z`);
      startDate.setUTCFullYear(startDate.getUTCFullYear() - years);
      const requestedStart = toDateString(startDate);
      const disabled = requestedStart < coverage.startDate;

      return {
        name,
        startDate: requestedStart,
        endDate: coverage.endDate,
        description: disabled ? reason : `최근 ${name}`,
        isDuration: true as const,
        disabled,
        reason,
      };
    }),
    {
      name: '전체',
      startDate: coverage.startDate,
      endDate: coverage.endDate,
      description: '공통 데이터 전체 기간',
      isDuration: true as const,
      disabled: false,
      reason,
    },
  ];
}

type FamilyPerformance = number | ProductPerformanceResult;
type FamilyPerformanceResults = Partial<Record<HistoricalAssetType, FamilyPerformance>>;

const cumulativeReturnOf = (performance: FamilyPerformance): number =>
  typeof performance === 'number' ? performance : performance.metrics.cumulativeReturn;

const toPercentagePoint = (value: number): number => Number(value.toFixed(12));

export const calculateLeverageInsights = (
  performances: FamilyPerformanceResults,
  family: LeverageFamily,
): LeverageInsight[] => {
  const underlying = family.members.find((member) => member.targetMultiple === 1)!;
  const underlyingPerformance = performances[underlying.assetId];
  if (underlyingPerformance === undefined) return [];

  const underlyingReturn = cumulativeReturnOf(underlyingPerformance);
  return family.members.flatMap((member): LeverageInsight[] => {
    if (member.targetMultiple === 1 || member.targetMultiple > 3) return [];
    const performance = performances[member.assetId];
    if (performance === undefined) return [];

    const actualReturn = cumulativeReturnOf(performance);
    const simpleReference = toPercentagePoint(underlyingReturn * member.targetMultiple);
    return [{
      assetId: member.assetId,
      targetMultiple: member.targetMultiple,
      underlyingReturn,
      actualReturn,
      simpleReference,
      difference: toPercentagePoint(actualReturn - simpleReference),
    }];
  });
};
