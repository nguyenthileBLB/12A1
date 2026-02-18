import React from 'react';
import { Part1Answers } from '../types';
import { PART1_COUNT } from '../constants';

interface Props {
  answers: Part1Answers;
  onChange: (qNum: number, value: string) => void;
  disabled?: boolean;
  correctAnswers?: Record<number, string>; // New prop
}

const ExamPart1: React.FC<Props> = ({ answers, onChange, disabled, correctAnswers }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-bold text-blue-800 mb-4 border-b pb-2">
        PHẦN I: Trắc nghiệm nhiều lựa chọn (4,5 điểm)
      </h3>
      <p className="text-sm text-gray-500 mb-4">Thí sinh chọn 1 đáp án đúng nhất cho mỗi câu hỏi.</p>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: PART1_COUNT }, (_, i) => i + 1).map((qNum) => {
          const userAns = answers[qNum];
          const correctAns = correctAnswers?.[qNum];
          
          return (
            <div 
              key={qNum} 
              id={`q-p1-${qNum}`} 
              className="flex flex-col items-center p-2 border rounded-md bg-gray-50 relative scroll-mt-24"
            >
              <span className="font-semibold text-gray-700 mb-2">Câu {qNum}</span>
              <div className="flex gap-2">
                {['A', 'B', 'C', 'D'].map((opt) => {
                  let btnClass = "bg-white text-gray-600 border border-gray-300 hover:bg-blue-50";
                  
                  // Logic hiển thị màu sắc khi đã kết thúc
                  if (correctAnswers) {
                     if (opt === correctAns) {
                        // Đây là đáp án đúng
                        btnClass = "bg-green-500 text-white border-green-600 shadow-md ring-2 ring-green-200";
                     } else if (opt === userAns && opt !== correctAns) {
                        // Học sinh chọn sai
                        btnClass = "bg-red-500 text-white border-red-600 opacity-60";
                     } else {
                        btnClass = "bg-gray-100 text-gray-400 opacity-40";
                     }
                  } else {
                    // Logic khi đang làm bài
                    if (userAns === opt) {
                        btnClass = "bg-blue-600 text-white shadow-md scale-110";
                    }
                  }

                  return (
                    <button
                      key={opt}
                      disabled={disabled}
                      onClick={() => onChange(qNum, opt)}
                      className={`w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center transition-all ${btnClass} ${disabled ? 'cursor-default' : ''}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExamPart1;