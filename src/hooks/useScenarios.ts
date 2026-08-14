import { useState, useEffect } from 'react';
import { getDatabase } from '../db/database';
import { ScenarioDocument } from '../db/schema';
import { normalizePersistedScenario } from '../data/assetMigration';

export const useScenarios = () => {
  const [scenarios, setScenarios] = useState<ScenarioDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: any;

    const init = async () => {
      try {
        const db = await getDatabase();
        const scenarios$ = db.scenarios.find().$;
        
        subscription = scenarios$.subscribe({
          next: (docs) => {
            setScenarios(docs.map((doc) => {
              const scenario = doc.toJSON();
              return normalizePersistedScenario(scenario) as ScenarioDocument;
            }));
            setLoading(false);
          },
          error: (err) => {
            console.error('Scenarios subscription error:', err);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Failed to initialize scenarios:', error);
        setLoading(false);
      }
    };

    init();

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const addScenario = async (scenario: Omit<ScenarioDocument, 'id' | 'createdAt' | 'updatedAt'>) => {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const now = Date.now();
    
    const normalized = normalizePersistedScenario(scenario as unknown as Record<string, unknown>);
    await db.scenarios.insert({
      ...scenario,
      simulationMode: normalized.simulationMode,
      assetType: normalized.assetType,
      id,
      createdAt: now,
      updatedAt: now,
    });
    
    return id;
  };

  const updateScenario = async (id: string, updates: Partial<ScenarioDocument>) => {
    const db = await getDatabase();
    const doc = await db.scenarios.findOne(id).exec();
    if (doc) {
      const current = doc.toJSON();
      const normalized = normalizePersistedScenario({ ...current, ...updates });
      await doc.patch({
        ...updates,
        simulationMode: normalized.simulationMode,
        assetType: normalized.assetType,
        updatedAt: Date.now(),
      });
    }
  };

  const removeScenario = async (id: string) => {
    const db = await getDatabase();
    const doc = await db.scenarios.findOne(id).exec();
    if (doc) {
      await doc.remove();
    }
  };

  return {
    scenarios,
    loading,
    addScenario,
    updateScenario,
    removeScenario,
  };
};
