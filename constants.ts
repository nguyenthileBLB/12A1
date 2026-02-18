import { AnswerKey } from './types';

export const PART1_COUNT = 18;
export const PART2_COUNT = 4;
export const PART3_COUNT = 6;

export const LOCAL_STORAGE_KEY = 'chem_exam_2025_state';
export const TEACHER_SESSION_KEY = 'chem_exam_teacher_session';

// Default Answer Key (Empty or Template)
export const DEFAULT_ANSWER_KEY: AnswerKey = {
  part1: {
    1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'A', 6: 'B',
    7: 'C', 8: 'D', 9: 'A', 10: 'B', 11: 'C', 12: 'D',
    13: 'A', 14: 'B', 15: 'C', 16: 'D', 17: 'A', 18: 'B'
  },
  part2: {
    1: { a: true, b: false, c: true, d: false },
    2: { a: false, b: true, c: false, d: true },
    3: { a: true, b: true, c: false, d: false },
    4: { a: false, b: false, c: true, d: true }
  },
  part3: {
    1: '12.5',
    2: '4',
    3: 'CH3COOH',
    4: '5.6',
    5: '2',
    6: '88'
  }
};

export const SCORING_RULES = {
  part1: 0.25, // per question
  part3: 0.25, // per question
  part2: { // points based on number of correct sub-parts
    1: 0.1,
    2: 0.25,
    3: 0.5,
    4: 1.0
  }
};