import type { Localized } from '../data/types';

/** The two NSCA-CSCS exam sections. */
export type Section = 'scientific' | 'applied';

/** Content domains, following the CSCS content outline. */
export type Domain =
  | 'anatomy'
  | 'physiology'
  | 'biomechanics'
  | 'bioenergetics'
  | 'technique'
  | 'program'
  | 'testing'
  | 'safety';

/** Cognitive level, as used in the CSCS item specifications. */
export type Level = 'recall' | 'application' | 'analysis';

export interface QuestionRefs {
  muscles?: string[];
  joints?: string[];
  bones?: string[];
  /** Explainer-video timestamp (s) that covers this topic. */
  video?: number;
}

export interface QuestionFigure {
  /** Explainer-video frame to show. */
  t: number;
  /** Hide on-frame labels and panels so the figure doesn't give the answer away. */
  clean?: boolean;
  caption?: Localized;
}

/** A question as authored: the correct answer is kept apart from the distractors. */
export interface QuestionSource {
  id: string;
  section: Section;
  domain: Domain;
  level: Level;
  stem: Localized;
  correct: Localized;
  distractors: [Localized, Localized, Localized];
  explanation: Localized;
  figure?: QuestionFigure;
  refs?: QuestionRefs;
}

/** A question ready to display: options in their final order. */
export interface Question extends Omit<QuestionSource, 'correct' | 'distractors'> {
  options: Localized[];
  answer: number;
  points: number;
}

export interface PaperSource {
  id: string;
  title: Localized;
  focus: Localized;
  minutes: number;
  questions: QuestionSource[];
}

export interface Paper extends Omit<PaperSource, 'questions'> {
  questions: Question[];
  totalPoints: number;
}

export const SECTION_NAMES: Record<Section, Localized> = {
  scientific: { zh: '科学基础', en: 'Scientific Foundations' },
  applied: { zh: '实践 / 应用', en: 'Practical / Applied' },
};

export const DOMAIN_NAMES: Record<Domain, Localized> = {
  anatomy: { zh: '解剖与运动学', en: 'Anatomy & kinesiology' },
  physiology: { zh: '肌肉与神经肌肉生理', en: 'Muscle & neuromuscular physiology' },
  biomechanics: { zh: '生物力学', en: 'Biomechanics' },
  bioenergetics: { zh: '生物能量学', en: 'Bioenergetics' },
  technique: { zh: '动作技术', en: 'Exercise technique' },
  program: { zh: '训练计划设计', en: 'Program design' },
  testing: { zh: '测试与评估', en: 'Testing & evaluation' },
  safety: { zh: '安全与组织管理', en: 'Safety & administration' },
};

export const LEVEL_NAMES: Record<Level, Localized> = {
  recall: { zh: '记忆', en: 'Recall' },
  application: { zh: '应用', en: 'Application' },
  analysis: { zh: '分析', en: 'Analysis' },
};

export const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
