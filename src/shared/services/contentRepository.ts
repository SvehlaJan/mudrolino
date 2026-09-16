// src/shared/services/contentRepository.ts
import type { UserWord, UserPraise } from '../types';

export interface RestoreDefaultsResult {
  restored: number;
  skippedDuplicates: number;
}

export interface ContentRepository {
  readonly locale: string;

  isSeeded(): Promise<boolean>;
  seed(words: UserWord[], praises: UserPraise[]): Promise<void>;

  getWords(): Promise<UserWord[]>;
  addWord(word: Omit<UserWord, 'id' | 'status' | 'enabled' | 'order' | 'locale'>): Promise<UserWord>;
  updateWord(
    id: string,
    changes: Partial<Pick<UserWord, 'word' | 'syllables' | 'emoji' | 'imageUrl' | 'status' | 'enabled' | 'order'>>,
  ): Promise<UserWord>;
  deleteWord(id: string): Promise<void>;
  setDefaultWordEnabled(id: string, enabled: boolean): Promise<void>;
  restoreAllDefaultWords(): Promise<void>;

  getPraises(): Promise<UserPraise[]>;
  addPraise(praise: Omit<UserPraise, 'id' | 'status' | 'enabled' | 'order' | 'locale'>): Promise<UserPraise>;
  updatePraise(
    id: string,
    changes: Partial<Pick<UserPraise, 'text' | 'emoji' | 'imageUrl' | 'status' | 'enabled' | 'order'>>,
  ): Promise<UserPraise>;
  deletePraise(id: string): Promise<void>;
  setDefaultPraiseEnabled(id: string, enabled: boolean): Promise<void>;
  restoreAllDefaultPraises(): Promise<void>;
}
