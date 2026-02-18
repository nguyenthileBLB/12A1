import React from 'react';
import { Part2Answers, Part2AnswerBlock } from '../types';
import { PART2_COUNT } from '../constants';

interface Props {
  answers: Part2Answers;
  onChange: (qNum: number, subPart: keyof Part2AnswerBlock, value: boolean) => void;
  disabled?: boolean;
  correctAnswers?: Record<number, { a: boolean; b: boolean; c: boolean; d: boolean }>; // New prop
}

const ExamPart2: React.FC<Props> = ({ answers, onChange, disabled, correctAnswers }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-6">
      <h3 className="text-lg font-bold text-blue-800 mb-4 border-b pb-2">
        PHẦN II: Trắc nghiệm Đúng/Sai (4,0 điểm)
      </h3>
      <p className="text-sm text-gray-500 mb-4">Mỗi câu hỏi có 4 ý a), b), c), d). Thí sinh chọn Đúng (Đ) hoặc Sai (S).</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: PART2_COUNT }, (_, i) => i + 1).map((qNum) => (
          <div 
            key={qNum} 
            id={`q-p2-${qNum}`}
            className="border rounded-lg overflow-hidden bg-gray-50 scroll-mt-24"
          >
            <div className="bg-blue-100 px-4 py-2 font-semibold text-blue-800 border-b border-blue-200">
              Câu {qNum}
            </div>
            <div className="p-4 space-y-3">
              {(['a', 'b', 'c', 'd'] as const).map((sub) => {
                const currentVal = answers[qNum]?.[sub];
                const correctVal = correctAnswers?.[qNum]?.[sub];
                const isReview = !!correctAnswers;
                
                return (
                  <div key={sub} className="flex items-center justify-between bg-white p-2 rounded border">
                    <span className="font-medium text-gray-700 w-8">{sub})</span>
                    <div className="flex gap-2 items-center">
                      <button
                        disabled={disabled}
                        onClick={() => onChange(qNum, sub, true)}
                        className={`px-4 py-1 rounded text-sm font-semibold transition-colors ${
                          currentVal === true
                            ? isReview && currentVal !== correctVal ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white shadow'
                            : 'bg-gray-100 text-gray-400 hover:bg-emerald-50'
                        }`}
                      >
                        Đúng
                      </button>
                      <button
                        disabled={disabled}
                        onClick={() => onChange(qNum, sub, false)}
                        className={`px-4 py-1 rounded text-sm font-semibold transition-colors ${
                          currentVal === false
                             ? isReview && currentVal !== correctVal ? 'bg-red-500 text-white' : 'bg-rose-500 text-white shadow'
                            : 'bg-gray-100 text-gray-400 hover:bg-rose-50'
                        }`}
                      >
                        Sai
                      </button>
                      
                      {/* Hiển thị đáp án đúng nếu học sinh làm sai */}
                      {isReview && currentVal !== correctVal && (
                        <div className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">
                            Đ.án: {correctVal ? 'Đúng' : 'Sai'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExamPart2;