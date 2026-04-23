import * as path from 'path';
import { app } from 'electron';
import { MODEL_INFO } from '../config/mirrors';

export type RetrievalTextKind = 'query' | 'passage';

export function getEmbeddingModelDir(): string {
  return path.join(app.getPath('userData'), 'models', MODEL_INFO.name);
}

export function prepareRetrievalText(text: string, kind: RetrievalTextKind): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const prefix = kind === 'query' ? 'query: ' : 'passage: ';
  return `${prefix}${normalized}`;
}
