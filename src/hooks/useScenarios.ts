import { useState, useEffect } from 'react';
import { getDatabase } from '../db/database';
import { ScenarioDocument } from '../db/schema';

export const useScenarios = () => {
  const [scenarios, setScenarios] = useState<ScenarioDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: any;

    const init = async () => {
      const db = await getDatabase();
      const scenarios$ = db.scenarios.find().$;
      
      subscription = scenarios$.subscribe((docs) => {
        setScenarios(docs.map(doc => doc.toJSON()));
        setLoading(false);
      });
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
    
    await db.scenarios.insert({
      ...scenario,
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
      await doc.patch({
        ...updates,
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
