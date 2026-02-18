import { SCORING_RULES, PART1_COUNT, PART2_COUNT, PART3_COUNT } from '../constants';
import { Part1Answers, Part2Answers, Part3Answers, AnswerKey } from '../types';

export const calculateScore = (
  p1: Part1Answers,
  p2: Part2Answers,
  p3: Part3Answers,
  key: AnswerKey // New argument
): number => {
  let totalScore = 0;

  // Part I Grading
  for (let i = 1; i <= PART1_COUNT; i++) {
    // Check if key exists for this question
    if (key.part1[i] && p1[i] === key.part1[i]) {
      totalScore += SCORING_RULES.part1;
    }
  }

  // Part II Grading (Complex)
  for (let i = 1; i <= PART2_COUNT; i++) {
    const userAns = p2[i];
    const keyAns = key.part2[i];
    
    if (!userAns || !keyAns) continue;

    let correctSubParts = 0;
    // Compare strictly boolean vs boolean
    if (userAns.a === keyAns.a) correctSubParts++;
    if (userAns.b === keyAns.b) correctSubParts++;
    if (userAns.c === keyAns.c) correctSubParts++;
    if (userAns.d === keyAns.d) correctSubParts++;

    // Apply strict scoring scale
    if (correctSubParts === 1) totalScore += SCORING_RULES.part2[1];
    else if (correctSubParts === 2) totalScore += SCORING_RULES.part2[2];
    else if (correctSubParts === 3) totalScore += SCORING_RULES.part2[3];
    else if (correctSubParts === 4) totalScore += SCORING_RULES.part2[4];
  }

  // Part III Grading
  for (let i = 1; i <= PART3_COUNT; i++) {
    const rawUser = p3[i];
    const rawKey = key.part3[i];

    if (!rawUser || !rawKey) continue;

    const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '');
    
    // Check if key allows multiple correct formats (if array) or single string
    const isCorrect = Array.isArray(rawKey)
      ? rawKey.some(k => normalize(k) === normalize(rawUser))
      : normalize(rawKey as string) === normalize(rawUser);

    if (isCorrect) {
      totalScore += SCORING_RULES.part3;
    }
  }

  return parseFloat(totalScore.toFixed(2));
};