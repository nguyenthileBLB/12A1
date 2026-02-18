import React, { useState, useEffect } from 'react';
import StudentView from './StudentView';
import TeacherView from './TeacherView';
import { GraduationCap, Users, Wifi } from 'lucide-react';

const App: React.FC = () => {
  const [role, setRole] = useState<'home' | 'student' | 'teacher'>('home');

  // Simple Hash Routing simulation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'student') setRole('student');
      else if (hash === 'teacher') setRole('teacher');
      else setRole('home');
    };

    handleHashChange(); // Check initial
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (newRole: 'student' | 'teacher') => {
    window.location.hash = newRole;
  };

  if (role === 'student') return <StudentView />;
  if (role === 'teacher') return <TeacherView />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-blue-900 mb-4 tracking-tight">Thi Trắc Nghiệm 2025</h1>
          <p className="text-lg text-blue-600 flex items-center justify-center gap-2">
            <Wifi size={20} /> Hệ thống thi trực tuyến thời gian thực
          </p>
          <p className="text-sm text-gray-500 mt-2">Giáo viên tạo phòng - Học sinh tham gia từ mọi thiết bị</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          <button 
            onClick={() => navigate('student')}
            className="group relative bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-200 text-left"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users size={80} className="text-blue-600" />
            </div>
            <div className="bg-blue-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6 text-blue-600">
              <Users size={28} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-blue-700 transition-colors">Học Sinh</h2>
            <p className="text-gray-500">Nhập mã phòng từ giáo viên, làm bài và nộp kết quả trực tiếp.</p>
          </button>

          <button 
            onClick={() => navigate('teacher')}
            className="group relative bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-indigo-200 text-left"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <GraduationCap size={80} className="text-indigo-600" />
            </div>
             <div className="bg-indigo-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6 text-indigo-600">
              <GraduationCap size={28} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-indigo-700 transition-colors">Giáo Viên</h2>
            <p className="text-gray-500">Tạo mã phòng, giám sát các thiết bị đang kết nối và chấm điểm.</p>
          </button>
        </div>

        <div className="mt-16 text-center text-gray-400 text-sm">
          <p>Lưu ý: Bạn có thể dùng điện thoại truy cập vào đây để đóng vai Học sinh và kết nối thử nghiệm.</p>
        </div>
      </div>
    </div>
  );
};

export default App;
