import React from 'react';
import { Part3Answers } from '../types';
import { PART3_COUNT } from '../constants';

interface Props {
  answers: Part3Answers;
  onChange: (qNum: number, value: string) => void;
  disabled?: boolean;
  correctAnswers?: Record<number, string | string[]>; // New prop
}

const ExamPart3: React.FC<Props> = ({ answers, onChange, disabled, correctAnswers }) => {
  
  const checkCorrect = (user: string, key: string | string[]) => {
      if (!user) return false;
      const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '');
      const u = normalize(user);
      if (Array.isArray(key)) {
          return key.some(k => normalize(k) === u);
      }
      return normalize(key) === u;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-6 mb-20">
      <h3 className="text-lg font-bold text-blue-800 mb-4 border-b pb-2">
        PHẦN III: Trắc nghiệm trả lời ngắn (1,5 điểm)
      </h3>
      <p className="text-sm text-gray-500 mb-4">Thí sinh điền đáp án (số hoặc từ khoá) vào ô trống.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: PART3_COUNT }, (_, i) => i + 1).map((qNum) => {
          const userVal = answers[qNum] || '';
          const keyVal = correctAnswers?.[qNum];
          const isReview = !!correctAnswers;
          const isCorrect = isReview && keyVal ? checkCorrect(userVal, keyVal) : false;

          let borderColor = "border-gray-300";
          if (isReview) {
              borderColor = isCorrect ? "border-green-500 ring-1 ring-green-200 bg-green-50" : "border-red-300 bg-red-50";
              if (!userVal) borderColor = "border-gray-300 bg-gray-100";
          }

          return (
            <div 
                key={qNum} 
                id={`q-p3-${qNum}`}
                className="flex flex-col gap-2 scroll-mt-24"
            >
              <label className="font-semibold text-gray-700">Câu {qNum}</label>
              <input
                type="text"
                disabled={disabled}
                value={userVal}
                onChange={(e) => onChange(qNum, e.target.value)}
                placeholder="Nhập đáp án..."
                className={`border rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:text-gray-700 ${borderColor}`}
              />
              {isReview && !isCorrect && keyVal && (
                  <div className="text-xs text-green-700 font-bold mt-1">
                      Đáp án: {Array.isArray(keyVal) ? keyVal.join(' hoặc ') : keyVal}
                  </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExamPart3;