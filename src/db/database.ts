import { createRxDatabase, addRxPlugin, RxDatabase, RxCollection } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { wrappedKeyEncryptionCryptoJsStorage } from 'rxdb/plugins/encryption-crypto-js';
import { scenarioSchema, ScenarioDocument } from './schema';

// 개발 모드 플러그인 추가 (빌드 시 트리쉐이킹됨)
if (import.meta.env.MODE === 'development') {
  addRxPlugin(RxDBDevModePlugin);
}

export type ScenarioCollection = RxCollection<ScenarioDocument>;

export interface MyDatabaseCollections {
  scenarios: ScenarioCollection;
}

export type MyDatabase = RxDatabase<MyDatabaseCollections>;

let dbPromise: Promise<MyDatabase> | null = null;

const createDatabase = async (): Promise<MyDatabase> => {
  const db: MyDatabase = await createRxDatabase<MyDatabaseCollections>({
    name: 'stock_snowball_db',
    storage: wrappedKeyEncryptionCryptoJsStorage({
      storage: getRxStorageDexie(),
    }),
    password: 'snowball-local-secret-key-2024', // TODO: Web Crypto API를 통한 동적 키 생성 또는 사용자 입력 고려
    ignoreDuplicate: true,
  });

  await db.addCollections({
    scenarios: {
      schema: scenarioSchema,
    },
  });

  return db;
};

export const getDatabase = (): Promise<MyDatabase> => {
  if (!dbPromise) {
    dbPromise = createDatabase();
  }
  return dbPromise;
};
