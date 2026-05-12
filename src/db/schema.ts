import { RxJsonSchema } from 'rxdb';

export interface ScenarioDocument {
  id: string;
  name: string;
  principal: number;
  annualRate: number;
  years: number;
  dailyContribution: number;
  inflationRate: number;
  currency: 'USD' | 'KRW';
  exchangeRate: number;
  createdAt: number;
  updatedAt: number;
}

export const scenarioSchema: RxJsonSchema<ScenarioDocument> = {
  title: 'scenario schema',
  version: 0,
  description: 'describes a snowball investment scenario',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100, // primary key must have maxLength
    },
    name: {
      type: 'string',
    },
    principal: {
      type: 'number',
      minimum: 0,
    },
    annualRate: {
      type: 'number',
    },
    years: {
      type: 'number',
      minimum: 1,
    },
    dailyContribution: {
      type: 'number',
      minimum: 0,
    },
    inflationRate: {
      type: 'number',
    },
    currency: {
      type: 'string',
      enum: ['USD', 'KRW'],
    },
    exchangeRate: {
      type: 'number',
      minimum: 0,
    },
    createdAt: {
      type: 'number',
    },
    updatedAt: {
      type: 'number',
    },
  },
  required: [
    'id',
    'name',
    'principal',
    'annualRate',
    'years',
    'dailyContribution',
    'inflationRate',
    'currency',
    'exchangeRate',
    'createdAt',
    'updatedAt',
  ],
  encrypted: ['principal', 'dailyContribution'],
};
