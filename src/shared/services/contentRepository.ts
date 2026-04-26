// src/shared/services/contentRepository.ts
import type { UserWord, UserPraise } from '../types';

export interface ContentRepository {
  readonly locale: string;

  isSeeded(): Promise<boolean>;
  seed(words: UserWord[], praises: UserPraise[]): Promise<void>;

  getWords(): Promise<UserWord[]>;
  addWord(word: Omit<UserWord, 'id' | 'status' | 'order' | 'locale'>): Promise<UserWord>;
  updateWord(
    id: string,
    changes: Partial<Pick<UserWord, 'word' | 'syllables' | 'emoji' | 'imageUrl' | 'status' | 'order'>>,
  ): Promise<UserWord>;
  deleteWord(id: string): Promise<void>;

  getPraises(): Promise<UserPraise[]>;
  addPraise(praise: Omit<UserPraise, 'id' | 'status' | 'order' | 'locale'>): Promise<UserPraise>;
  updatePraise(
    id: string,
    changes: Partial<Pick<UserPraise, 'text' | 'emoji' | 'imageUrl' | 'status' | 'order'>>,
  ): Promise<UserPraise>;
  deletePraise(id: string): Promise<void>;
}
