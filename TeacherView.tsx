import React, { useEffect, useState, useRef } from 'react';
import { ExamState, NetworkMessage, StudentSubmission, AnswerKey } from './types';
import { TEACHER_SESSION_KEY, DEFAULT_ANSWER_KEY, PART1_COUNT, PART2_COUNT, PART3_COUNT } from './constants';
import { Trash2, Play, StopCircle, RefreshCcw, User, Wifi, Copy, ArrowLeft, Info, Settings, Save, ChevronDown, ChevronUp, Eye, X, CheckCircle, XCircle, EyeOff, Clock, Download, AlertOctagon, Maximize, ShieldAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Global Peer type definition
declare const Peer: any;

const TeacherView: React.FC = () => {
  const [examState, setExamState] = useState<ExamState>({ 
    status: 'ACTIVE', // Default to ACTIVE immediately
    submissions: [], 
    answerKey: DEFAULT_ANSWER_KEY,
    isReviewOpen: false,
    duration: 45, // Default duration
    enforceFullscreen: true // Default to true for better security
  });
  const [roomId, setRoomId] = useState<string>('');
  const [peerInstance, setPeerInstance] = useState<any>(null);
  const [connections, setConnections] = useState<any[]>([]);
  
  // UI State for Answer Key Editor
  const [showKeyEditor, setShowKeyEditor] = useState(false);
  const [activeTab, setActiveTab] = useState<'p1' | 'p2' | 'p3'>('p1');

  // UI State for Student Detail View
  const [selectedSub, setSelectedSub] = useState<StudentSubmission | null>(null);

  // Initialize PeerJS (Teacher is the Host) with Restoration Logic
  useEffect(() => {
    let activeRoomId = '';
    
    // 1. Try to restore previous session
    const savedSession = localStorage.getItem(TEACHER_SESSION_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.roomId) {
          activeRoomId = parsed.roomId;
          console.log('Restoring session for room:', activeRoomId);
        }
        if (parsed.examState) {
          setExamState({
            ...parsed.examState,
            answerKey: parsed.examState.answerKey || DEFAULT_ANSWER_KEY,
            isReviewOpen: parsed.examState.isReviewOpen || false,
            duration: parsed.examState.duration || 45,
            enforceFullscreen: parsed.examState.enforceFullscreen ?? true
          });
        }
      } catch (e) {
        console.error('Failed to restore session:', e);
      }
    }

    // 2. If no saved session, generate new ID
    if (!activeRoomId) {
      activeRoomId = Math.floor(1000 + Math.random() * 9000).toString();
    }

    // Set Room ID immediately so UI updates
    setRoomId(activeRoomId);

    const fullPeerId = `chem-exam-2025-${activeRoomId}`;
    
    // Updated: Add STUN servers for better mobile connectivity
    const peer = new Peer(fullPeerId, {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('open', (id: string) => {
      console.log('Teacher Peer ID initialized:', id);
      setPeerInstance(peer);
    });

    peer.on('connection', (conn: any) => {
      console.log('New connection:', conn.peer);
      
      conn.on('open', () => {
        setConnections(prev => [...prev, conn]);
        // Send LIGHTWEIGHT state immediately to new connection
        // We strip submissions array to save bandwidth
        const lightweightState = {
            ...examState,
            submissions: [] // Students don't need other students' data
        };
        conn.send({ type: 'SYNC_STATE', payload: lightweightState });
      });

      conn.on('data', (data: NetworkMessage) => {
        if (data.type === 'SUBMIT_ANSWERS') {
          handleStudentSubmission(data.payload);
        }
      });

      conn.on('close', () => {
        setConnections(prev => prev.filter(c => c !== conn));
      });
    });

    peer.on('error', (err: any) => {
      console.error('Peer error:', err);
      if (err.type === 'unavailable-id') {
        alert(`Mã phòng ${activeRoomId} đang được sử dụng ở tab khác. Vui lòng thử lại sau.`);
      } else if (err.type === 'network') {
        alert('Lỗi kết nối mạng.');
      }
    });

    return () => {
      peer.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Broadcast state & PERSIST to LocalStorage
  useEffect(() => {
    // 1. Broadcast to students (OPTIMIZED)
    if (connections.length > 0) {
      // Create a lightweight payload
      const lightweightState = {
        ...examState,
        submissions: [] // Remove submissions to reduce packet size by 90%
      };
      
      connections.forEach(conn => {
        if (conn.open) {
          conn.send({ type: 'SYNC_STATE', payload: lightweightState });
        }
      });
    }
    
    // 2. Persist to Storage (Full state)
    if (roomId) {
      const sessionData = {
        roomId,
        examState,
        lastActive: Date.now()
      };
      localStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify(sessionData));
    }
  }, [examState, connections, roomId]);

  const handleStudentSubmission = (submission: StudentSubmission) => {
    setExamState(prev => {
      const existingIdx = prev.submissions.findIndex(s => s.name === submission.name);
      const newSubs = [...prev.submissions];
      if (existingIdx >= 0) {
        newSubs[existingIdx] = submission;
      } else {
        newSubs.push(submission);
      }
      return { ...prev, submissions: newSubs };
    });
  };

  const updateStatus = (status: ExamState['status']) => {
    setExamState(prev => ({ ...prev, status }));
  };

  const updateDuration = (val: string) => {
    const min = parseInt(val) || 0;
    setExamState(prev => ({ ...prev, duration: min }));
  };
  
  const toggleEnforceFullscreen = () => {
      setExamState(prev => ({ ...prev, enforceFullscreen: !prev.enforceFullscreen }));
  };

  const toggleReview = () => {
      setExamState(prev => ({ ...prev, isReviewOpen: !prev.isReviewOpen }));
  };

  const clearData = () => {
    if (confirm('Hành động này sẽ XÓA MÃ PHÒNG và TOÀN BỘ KẾT QUẢ. Bạn sẽ cần tạo mã mới. Tiếp tục?')) {
      setExamState({ status: 'ACTIVE', submissions: [], answerKey: DEFAULT_ANSWER_KEY, isReviewOpen: false, duration: 45, enforceFullscreen: true });
      localStorage.removeItem(TEACHER_SESSION_KEY);
      window.location.reload(); 
    }
  };

  const handleBack = () => {
    if (connections.length > 0) {
      if (!confirm("Rời khỏi màn hình này sẽ ngắt kết nối với học sinh. Bạn có chắc chắn không?")) {
        return;
      }
    }
    window.location.hash = '';
  };

  const exportToCSV = () => {
    if (examState.submissions.length === 0) {
      alert("Chưa có dữ liệu bài làm để xuất báo cáo.");
      return;
    }

    const headers = ["STT", "Họ và Tên", "Thời gian nộp", "Điểm Số", "Số lần thoát màn hình"];
    // Sort by score descending
    const sortedForExport = [...examState.submissions].sort((a, b) => b.score - a.score);
    
    const rows = sortedForExport.map((sub, index) => {
      const timeStr = new Date(sub.submittedAt).toLocaleString('vi-VN');
      const safeName = sub.name.replace(/"/g, '""'); // Escape quotes
      return [index + 1, `"${safeName}"`, `"${timeStr}"`, sub.score, sub.violationCount || 0].join(",");
    });

    // Add BOM for Excel UTF-8 compatibility
    const csvContent = "\ufeff" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ket_qua_thi_phong_${roomId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Answer Key Editing Logic ---
  const updatePart1Key = (q: number, ans: string) => {
    setExamState(prev => ({
      ...prev,
      answerKey: {
        ...prev.answerKey,
        part1: { ...prev.answerKey.part1, [q]: ans }
      }
    }));
  };

  const updatePart2Key = (q: number, sub: 'a'|'b'|'c'|'d', val: boolean) => {
    setExamState(prev => {
      const currentBlock = prev.answerKey.part2[q] || { a: false, b: false, c: false, d: false };
      return {
        ...prev,
        answerKey: {
          ...prev.answerKey,
          part2: { 
            ...prev.answerKey.part2, 
            [q]: { ...currentBlock, [sub]: val }
          }
        }
      };
    });
  };

  const updatePart3Key = (q: number, val: string) => {
    const formattedVal = val.includes(';') 
      ? val.split(';').map(s => s.trim()) 
      : val.trim();

    setExamState(prev => ({
      ...prev,
      answerKey: {
        ...prev.answerKey,
        part3: { ...prev.answerKey.part3, [q]: formattedVal }
      }
    }));
  };
  // ------------------------------

  // Stats Logic
  const sortedSubmissions = [...examState.submissions].sort((a, b) => b.score - a.score);
  const averageScore = examState.submissions.length > 0 
    ? (examState.submissions.reduce((acc, curr) => acc + curr.score, 0) / examState.submissions.length).toFixed(2)
    : 0;
  
  const chartData = [
    { 'Khoảng điểm': '0-2', 'Số lượng': examState.submissions.filter(s => s.score < 2).length },
    { 'Khoảng điểm': '2-4', 'Số lượng': examState.submissions.filter(s => s.score >= 2 && s.score < 4).length },
    { 'Khoảng điểm': '4-6', 'Số lượng': examState.submissions.filter(s => s.score >= 4 && s.score < 6).length },
    { 'Khoảng điểm': '6-8', 'Số lượng': examState.submissions.filter(s => s.score >= 6 && s.score < 8).length },
    { 'Khoảng điểm': '8-10', 'Số lượng': examState.submissions.filter(s => s.score >= 8).length },
  ];

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert(`Đã sao chép mã phòng: ${roomId}`);
  };

  // Helper to render check/x icon
  const StatusIcon = ({ correct }: { correct: boolean }) => 
    correct ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Connection Info */}
        <div className="bg-blue-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wifi size={120} />
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
             <div>
                <h2 className="text-sm uppercase tracking-wider text-blue-200 font-semibold mb-1 flex items-center gap-2">
                    Mã Phòng Thi
                    <span className="bg-blue-800 text-blue-200 text-[10px] px-2 py-0.5 rounded-full">Đã lưu tự động</span>
                </h2>
                <div className="flex items-center gap-3">
                {roomId ? (
                    <span className="text-4xl font-mono font-bold tracking-widest">{roomId}</span>
                ) : (
                    <span className="text-xl animate-pulse">Đang khôi phục...</span>
                )}
                {roomId && (
                    <button onClick={copyRoomId} className="p-2 bg-blue-800 rounded-lg hover:bg-blue-700 transition-colors" title="Sao chép">
                    <Copy size={20} />
                    </button>
                )}
                </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
                 <div className="flex items-center gap-4 bg-blue-800/50 px-6 py-4 rounded-lg backdrop-blur-sm">
                    <Wifi className={`animate-pulse ${connections.length > 0 ? 'text-green-400' : 'text-gray-400'}`} />
                    <div>
                    <div className="text-2xl font-bold">{connections.length}</div>
                    <div className="text-xs text-blue-200">Thiết bị đang kết nối</div>
                    </div>
                </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col xl:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
             <button 
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                title="Quay lại trang chủ"
            >
                <ArrowLeft size={24} />
            </button>
            <div>
                <h1 className="text-xl font-bold text-gray-800">Trạng Thái Thi</h1>
                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-bold ${
                examState.status === 'ACTIVE' || examState.status === 'WAITING' ? 'bg-green-100 text-green-700' : 
                examState.status === 'FINISHED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                }`}>
                {(examState.status === 'ACTIVE' || examState.status === 'WAITING') && 'PHÒNG THI ĐANG MỞ'}
                {examState.status === 'FINISHED' && 'ĐÃ KẾT THÚC'}
                </span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 justify-end items-center">
            {/* Exam Duration Setting */}
             <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                <Clock size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Thời gian (phút):</span>
                <input 
                    type="number" 
                    min="1"
                    value={examState.duration}
                    onChange={(e) => updateDuration(e.target.value)}
                    // Giáo viên có thể chỉnh thời gian bất cứ lúc nào khi chưa kết thúc
                    disabled={examState.status === 'FINISHED'} 
                    className="w-16 border rounded p-1 text-center font-bold text-blue-800 disabled:bg-gray-100 disabled:text-gray-500"
                />
            </div>

            <button 
                onClick={() => setShowKeyEditor(!showKeyEditor)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium border transition-colors ${showKeyEditor ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
                <Settings size={18} /> Cấu hình
                {showKeyEditor ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* Export Button */}
            <button 
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium border bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50 transition-colors"
                title="Xuất file Excel/CSV kết quả"
            >
                <Download size={18} /> Xuất Báo Cáo
            </button>

            {(examState.status === 'ACTIVE' || examState.status === 'WAITING') && (
              <button onClick={() => updateStatus('FINISHED')} className="flex items-center gap-2 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 font-medium shadow-md">
                <StopCircle size={18} /> Kết Thúc Phòng Thi
              </button>
            )}
            {examState.status === 'FINISHED' && (
               <button onClick={() => updateStatus('ACTIVE')} className="flex items-center gap-2 bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 font-medium shadow-md">
               <RefreshCcw size={18} /> Mở Lại Phòng
             </button>
            )}
            <button onClick={clearData} className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">
              <Trash2 size={18} /> Tạo Phòng Mới
            </button>
          </div>
        </div>

        {/* Answer Key Editor & Settings */}
        {showKeyEditor && (
            <div className="bg-white rounded-xl shadow-md border border-blue-100 overflow-hidden animate-in slide-in-from-top-2">
                <div className="bg-blue-50 px-6 py-3 border-b border-blue-100 flex justify-between items-center">
                    <h3 className="font-bold text-blue-800 flex items-center gap-2">
                        <Settings size={18} /> Cài đặt Phòng Thi & Đáp Án
                    </h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setActiveTab('p1')}
                            className={`px-3 py-1 rounded text-sm font-medium ${activeTab === 'p1' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-blue-100'}`}
                        >Phần 1</button>
                         <button 
                            onClick={() => setActiveTab('p2')}
                            className={`px-3 py-1 rounded text-sm font-medium ${activeTab === 'p2' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-blue-100'}`}
                        >Phần 2</button>
                         <button 
                            onClick={() => setActiveTab('p3')}
                            className={`px-3 py-1 rounded text-sm font-medium ${activeTab === 'p3' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-blue-100'}`}
                        >Phần 3</button>
                    </div>
                </div>
                
                {/* SETTINGS PANEL */}
                <div className="px-6 py-4 bg-gray-50 border-b flex flex-wrap gap-4 items-center">
                     <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-700">Chế độ thi:</span>
                        <button 
                            onClick={toggleEnforceFullscreen}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${examState.enforceFullscreen ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-300'}`}
                        >
                            {examState.enforceFullscreen ? <ShieldAlert size={16} /> : <Maximize size={16} />}
                            {examState.enforceFullscreen ? 'Bắt buộc Fullscreen (Nghiêm túc)' : 'Thoải mái (Không bắt buộc)'}
                        </button>
                     </div>
                     <div className="h-6 w-px bg-gray-300"></div>
                     <div className="flex items-center gap-2">
                         <span className="text-sm font-bold text-gray-700">Review:</span>
                         <button 
                            onClick={toggleReview}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                                examState.isReviewOpen 
                                ? 'bg-yellow-100 text-yellow-800 border-yellow-300' 
                                : 'bg-white text-gray-500 border-gray-300'
                            }`}
                        >
                            {examState.isReviewOpen ? <Eye size={16} /> : <EyeOff size={16} />}
                            {examState.isReviewOpen ? 'Học sinh xem được đáp án' : 'Học sinh KHÔNG xem được đáp án'}
                        </button>
                     </div>
                </div>

                <div className="p-6">
                    {activeTab === 'p1' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {Array.from({length: PART1_COUNT}, (_, i) => i + 1).map(q => (
                                <div key={q} className="flex flex-col items-center p-2 border rounded bg-gray-50">
                                    <span className="text-xs font-bold text-gray-500 mb-1">Câu {q}</span>
                                    <div className="flex gap-1">
                                        {['A','B','C','D'].map(opt => (
                                            <button 
                                                key={opt}
                                                onClick={() => updatePart1Key(q, opt)}
                                                className={`w-6 h-6 text-xs rounded font-bold ${examState.answerKey.part1[q] === opt ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-100'}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'p2' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {Array.from({length: PART2_COUNT}, (_, i) => i + 1).map(q => (
                                <div key={q} className="border rounded p-3 bg-gray-50">
                                    <div className="font-bold text-sm text-gray-700 mb-2">Câu {q} (Đúng/Sai)</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['a','b','c','d'] as const).map(sub => {
                                            const isTrue = examState.answerKey.part2[q]?.[sub] === true;
                                            return (
                                                <div key={sub} className="flex items-center justify-between bg-white px-2 py-1 rounded border">
                                                    <span className="text-sm font-medium uppercase">{sub})</span>
                                                    <button 
                                                        onClick={() => updatePart2Key(q, sub, !isTrue)}
                                                        className={`text-xs px-2 py-0.5 rounded font-bold ${isTrue ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                                                    >
                                                        {isTrue ? 'ĐÚNG' : 'SAI'}
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                             ))}
                        </div>
                    )}

                    {activeTab === 'p3' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             {Array.from({length: PART3_COUNT}, (_, i) => i + 1).map(q => {
                                 const val = examState.answerKey.part3[q];
                                 const displayVal = Array.isArray(val) ? val.join('; ') : (val || '');
                                 return (
                                    <div key={q} className="flex flex-col gap-1">
                                        <label className="text-sm font-bold text-gray-700">Câu {q}</label>
                                        <input 
                                            type="text" 
                                            value={displayVal}
                                            onChange={(e) => updatePart3Key(q, e.target.value)}
                                            className="border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="VD: 5.6; 5,6"
                                        />
                                        <span className="text-[10px] text-gray-400">Dùng dấu chấm phẩy (;) để ngăn cách nhiều đáp án đúng</span>
                                    </div>
                                 )
                             })}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
            <h3 className="text-gray-500 font-medium">Sĩ Số Nộp Bài</h3>
            <p className="text-3xl font-bold text-gray-800">{examState.submissions.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-indigo-500">
            <h3 className="text-gray-500 font-medium">Điểm Trung Bình</h3>
            <p className="text-3xl font-bold text-gray-800">{averageScore}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-emerald-500">
             <h3 className="text-gray-500 font-medium">Điểm Cao Nhất</h3>
            <p className="text-3xl font-bold text-gray-800">
              {examState.submissions.length > 0 ? Math.max(...examState.submissions.map(s => s.score)) : 0}
            </p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student List */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-700">Danh Sách Nộp Bài</h3>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left">Học Sinh</th>
                    <th className="px-6 py-3 text-center">Thời Gian Nộp</th>
                    <th className="px-6 py-3 text-right">Điểm Số</th>
                    <th className="px-6 py-3 text-center">Chi Tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedSubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                          <User size={16} />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-medium text-gray-800">{sub.name}</span>
                            {sub.violationCount && sub.violationCount > 0 ? (
                                <span className="text-[10px] flex items-center gap-1 text-red-600 font-bold bg-red-50 px-1 rounded w-fit">
                                    <AlertOctagon size={10} /> {sub.violationCount} lần thoát
                                </span>
                            ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-500 text-sm">
                        {new Date(sub.submittedAt).toLocaleTimeString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-blue-600">
                        {examState.status === 'FINISHED' ? sub.score : '---'}
                      </td>
                      <td className="px-6 py-4 text-center">
                         <button 
                            onClick={() => setSelectedSub(sub)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-all"
                            title="Xem chi tiết bài làm"
                         >
                            <Eye size={20} />
                         </button>
                      </td>
                    </tr>
                  ))}
                  {sortedSubmissions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                        Chưa có dữ liệu bài làm
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
            <h3 className="font-bold text-gray-700 mb-6">Phổ Điểm</h3>
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="Khoảng điểm" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="Số lượng" radius={[4, 4, 0, 0]}>
                     {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#ef4444', '#f97316', '#eab308', '#3b82f6', '#22c55e'][index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {examState.status !== 'FINISHED' && (
              <div className="mt-4 text-center text-sm text-gray-400 italic">
                (Biểu đồ cập nhật sau khi kết thúc bài thi)
              </div>
            )}
          </div>
        </div>

        {/* --- STUDENT DETAIL MODAL --- */}
        {selectedSub && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedSub(null)}>
                <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="bg-blue-900 text-white p-4 flex justify-between items-center shrink-0">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <User size={24} /> {selectedSub.name}
                            </h2>
                            <div className="flex gap-4 mt-1">
                                <p className="text-blue-200 text-sm">
                                    Điểm số: <span className="font-bold text-white text-lg">{examState.status === 'FINISHED' ? selectedSub.score : '---'}</span>
                                </p>
                                {selectedSub.violationCount && selectedSub.violationCount > 0 ? (
                                    <p className="text-red-300 text-sm flex items-center gap-1 font-bold">
                                        <AlertOctagon size={16} /> Thoát màn hình: {selectedSub.violationCount} lần
                                    </p>
                                ) : (
                                    <p className="text-green-300 text-sm flex items-center gap-1">
                                        <CheckCircle size={16} /> Nghiêm túc
                                    </p>
                                )}
                            </div>
                        </div>
                        <button onClick={() => setSelectedSub(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="overflow-y-auto p-6 space-y-8 bg-gray-50 flex-1">
                        {/* Part 1 Detail */}
                        <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <h3 className="font-bold text-blue-800 border-b pb-2 mb-4">Phần I: Trắc nghiệm (18 câu)</h3>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                {Array.from({length: PART1_COUNT}, (_, i) => i + 1).map(q => {
                                    const studentAns = selectedSub.answers.part1[q];
                                    const keyAns = examState.answerKey.part1[q];
                                    const isCorrect = studentAns === keyAns;
                                    
                                    return (
                                        <div key={q} className={`p-2 rounded border text-center relative ${isCorrect ? 'bg-green-50 border-green-200' : studentAns ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
                                            <div className="text-[10px] text-gray-500 font-bold mb-1">Câu {q}</div>
                                            <div className="font-bold text-lg">{studentAns || '-'}</div>
                                            {!isCorrect && examState.status === 'FINISHED' && (
                                                <div className="text-[10px] text-green-600 font-bold bg-green-100 rounded px-1 mt-1">Đ.A: {keyAns}</div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Part 2 Detail */}
                        <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <h3 className="font-bold text-blue-800 border-b pb-2 mb-4">Phần II: Đúng / Sai</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Array.from({length: PART2_COUNT}, (_, i) => i + 1).map(q => (
                                    <div key={q} className="border rounded bg-gray-50 overflow-hidden">
                                        <div className="bg-gray-100 px-3 py-1 text-sm font-bold text-gray-700 border-b">Câu {q}</div>
                                        <div className="p-2 space-y-1">
                                            {(['a','b','c','d'] as const).map(sub => {
                                                const sVal = selectedSub.answers.part2[q]?.[sub];
                                                const kVal = examState.answerKey.part2[q]?.[sub];
                                                const isCorrect = sVal === kVal;
                                                
                                                return (
                                                    <div key={sub} className="flex justify-between items-center text-sm bg-white p-2 rounded border">
                                                        <span className="font-medium w-8 uppercase">{sub})</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${sVal === true ? 'bg-green-100 text-green-700' : sVal === false ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                {sVal === true ? 'ĐÚNG' : sVal === false ? 'SAI' : '---'}
                                                            </span>
                                                            <StatusIcon correct={isCorrect} />
                                                        </div>
                                                        {!isCorrect && examState.status === 'FINISHED' && (
                                                            <span className="text-[10px] text-gray-400">
                                                                (Đáp án: {kVal ? 'Đ' : 'S'})
                                                            </span>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Part 3 Detail */}
                        <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <h3 className="font-bold text-blue-800 border-b pb-2 mb-4">Phần III: Trả lời ngắn</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Array.from({length: PART3_COUNT}, (_, i) => i + 1).map(q => {
                                    const sVal = selectedSub.answers.part3[q] || '';
                                    const kVal = examState.answerKey.part3[q];
                                    
                                    // Simple visualization check (logic might differ slightly from strict grading)
                                    const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '');
                                    const isCorrect = Array.isArray(kVal) 
                                        ? kVal.some(k => normalize(k) === normalize(sVal))
                                        : normalize(kVal as string) === normalize(sVal);

                                    return (
                                        <div key={q} className="border p-3 rounded bg-gray-50">
                                            <div className="text-sm font-bold text-gray-600 mb-1">Câu {q}</div>
                                            <div className={`p-2 rounded border bg-white flex justify-between items-center ${isCorrect ? 'border-green-300 ring-1 ring-green-100' : sVal ? 'border-red-300' : ''}`}>
                                                <span className="font-medium">{sVal || <em className="text-gray-400">Không trả lời</em>}</span>
                                                <StatusIcon correct={isCorrect} />
                                            </div>
                                            {!isCorrect && examState.status === 'FINISHED' && (
                                                <div className="mt-1 text-xs text-green-700 bg-green-50 p-1 rounded inline-block">
                                                    Đ.A: {Array.isArray(kVal) ? kVal.join(' hoặc ') : kVal}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                    </div>
                    <div className="p-4 bg-gray-100 border-t flex justify-end">
                        <button onClick={() => setSelectedSub(null)} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors">
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default TeacherView;