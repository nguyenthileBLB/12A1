export type ExamStatus = 'WAITING' | 'ACTIVE' | 'FINISHED';

// Part I: Multiple Choice (A, B, C, D)
export type Part1Answers = Record<number, string>;

// Part II: True/False (a, b, c, d)
export type Part2AnswerBlock = {
  a: boolean | null;
  b: boolean | null;
  c: boolean | null;
  d: boolean | null;
};
export type Part2Answers = Record<number, Part2AnswerBlock>;

// Part III: Short Answer (string input)
export type Part3Answers = Record<number, string>;

export interface StudentSubmission {
  id: string;
  name: string;
  answers: {
    part1: Part1Answers;
    part2: Part2Answers;
    part3: Part3Answers;
  };
  score: number;
  submittedAt: number;
  violationCount: number; // Number of times tab was switched/blurred/exit fullscreen
}

// Grading Structure
export interface AnswerKey {
  part1: Record<number, string>;
  part2: Record<number, { a: boolean; b: boolean; c: boolean; d: boolean }>;
  part3: Record<number, string | string[]>; // Support multiple valid text formats
}

export interface ExamState {
  status: ExamStatus;
  submissions: StudentSubmission[];
  answerKey: AnswerKey; // Dynamic answer key managed by teacher
  isReviewOpen: boolean; // Controls whether students can see detailed answers
  duration: number; // Exam duration in minutes
  enforceFullscreen?: boolean; // New setting: Require fullscreen to take exam
}

// Network Message Types
export type MessageType = 'SYNC_STATE' | 'SUBMIT_ANSWERS' | 'STUDENT_JOIN';

export interface NetworkMessage {
  type: MessageType;
  payload: any;
}