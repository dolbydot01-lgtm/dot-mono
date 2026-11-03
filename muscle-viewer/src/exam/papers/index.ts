import { buildPaper } from '../build';
import type { Paper } from '../types';
import { PAPER_1 } from './paper1';
import { PAPER_2 } from './paper2';
import { PAPER_3 } from './paper3';

export const PAPERS: Paper[] = [PAPER_1, PAPER_2, PAPER_3].map(buildPaper);

export const PAPER_MAP: Record<string, Paper> = Object.fromEntries(PAPERS.map((p) => [p.id, p]));
