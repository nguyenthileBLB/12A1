import React, { useState, useEffect, useRef } from 'react';
import { 
  ExamState, 
  Part1Answers, 
  Part2Answers, 
  Part3Answers, 
  Part2AnswerBlock,
  NetworkMessage
} from './types';
import { calculateScore } from './services/gradingService';
import { DEFAULT_ANSWER_KEY, PART1_COUNT, PART2_COUNT, PART3_COUNT } from './constants';
import ExamPart1 from './components/ExamPart1';
import ExamPart2 from './components/ExamPart2';
import ExamPart3 from './components/ExamPart3';
import { Send, CheckCircle, Clock, AlertTriangle, Radio, Wifi, Loader2, User, ArrowLeft, Eye, EyeOff, Play, AlertOctagon, Sun, Zap, Maximize, ShieldAlert, LayoutGrid, X } from 'lucide-react';

// Global Peer type definition
declare const Peer: any;

const StudentView: React.FC = () => {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // New States for individual start
  const [hasStarted, setHasStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Anti-Cheat State
  const [violationCount, setViolationCount] = useState(0);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true);
  
  // Wake Lock State
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef<any>(null);

  // Navigation Palette State
  const [showPalette, setShowPalette] = useState(false);

  // Initialize with DEFAULT_ANSWER_KEY to prevent crash if syncing fails initially
  const [examState, setExamState] = useState<ExamState>({ 
    status: 'ACTIVE', // Default assume active
    submissions: [], 
    answerKey: DEFAULT_ANSWER_KEY,
    isReviewOpen: false,
    duration: 45,
    enforceFullscreen: true
  });
  
  // Network
  const [conn, setConn] = useState<any>(null);
  
  // Local state for answers
  const [p1, setP1] = useState<Part1Answers>({});
  const [p2, setP2] = useState<Part2Answers>({});
  const [p3, setP3] = useState<Part3Answers>({});
  const [myScore, setMyScore] = useState<number | null>(null);

  // Recalculate score if answer key changes (rare, but good for sync)
  useEffect(() => {
    if (submitted) {
        const score = calculateScore(p1, p2, p3, examState.answerKey);
        setMyScore(score);
    }
  }, [examState.answerKey, submitted, p1, p2, p3]);

  // Restore session or timer state on join
  useEffect(() => {
      if (joined && roomId) {
          const startTime = localStorage.getItem(`exam_start_${roomId}`);
          if (startTime) {
              setHasStarted(true);
          }
      }
  }, [joined, roomId]);

  // --- WAKE LOCK LOGIC (Keep Screen On) ---
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
        try {
            const lock = await (navigator as any).wakeLock.request('screen');
            wakeLockRef.current = lock;
            setWakeLockActive(true);
            
            lock.addEventListener('release', () => {
                setWakeLockActive(false);
                console.log('Screen Wake Lock released');
            });
            console.log('Screen Wake Lock acquired');
        } catch (err) {
            console.error('Could not acquire wake lock:', err);
            setWakeLockActive(false);
        }
    }
  };

  // Activate Wake Lock when exam starts
  useEffect(() => {
      if (hasStarted && !submitted && examState.status !== 'FINISHED') {
          requestWakeLock();
      }
      return () => {
          // Release lock when component unmounts or exam ends
          if (wakeLockRef.current) {
              wakeLockRef.current.release().catch(() => {});
          }
      };
  }, [hasStarted, submitted, examState.status]);

  // Re-acquire Wake Lock if tab becomes visible again (Browser releases lock on tab switch)
  useEffect(() => {
      const handleVisChange = () => {
          if (!document.hidden && hasStarted && !submitted && examState.status !== 'FINISHED') {
             requestWakeLock();
          }
      };
      document.addEventListener('visibilitychange', handleVisChange);
      return () => document.removeEventListener('visibilitychange', handleVisChange);
  }, [hasStarted, submitted, examState.status]);
  // ----------------------------------------

  // Anti-Cheat Logic: Detect Tab Switching & Fullscreen
  useEffect(() => {
    // Only monitor if exam has started, not submitted, and active
    if (!hasStarted || submitted || examState.status === 'FINISHED') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setViolationCount(prev => prev + 1);
      } else {
        // User returned
        setShowViolationWarning(true);
        // Auto-hide warning after 5 seconds
        setTimeout(() => setShowViolationWarning(false), 5000);
      }
    };
    
    // Fullscreen monitor
    const handleFullscreenChange = () => {
        const isFS = !!document.fullscreenElement;
        setIsFullscreen(isFS);
        if (!isFS && examState.enforceFullscreen) {
            setViolationCount(prev => prev + 1);
        }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Initial check (in case they refreshed in non-fullscreen)
    if (examState.enforceFullscreen) {
        setIsFullscreen(!!document.fullscreenElement);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [hasStarted, submitted, examState.status, examState.enforceFullscreen]);

  // Timer Logic
  useEffect(() => {
    if (!hasStarted || submitted || examState.status === 'FINISHED') return;

    // We rely on the time stored in localStorage to be robust against refreshes
    const storedStart = localStorage.getItem(`exam_start_${roomId}`);
    if (!storedStart) return;

    const startTs = parseInt(storedStart, 10);
    const durationMs = examState.duration * 60 * 1000;
    const endTs = startTs + durationMs;

    const interval = setInterval(() => {
        const now = Date.now();
        const diff = endTs - now;

        if (diff <= 0) {
            setTimeLeft(0);
            clearInterval(interval);
            // Auto submit
            handleSubmit(true); 
        } else {
            setTimeLeft(diff);
        }
    }, 1000);

    return () => clearInterval(interval);
  }, [hasStarted, submitted, examState.status, examState.duration, roomId]);

  const handleStartExam = async () => {
      if (examState.enforceFullscreen) {
        try {
            await document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } catch (e) {
            console.error(e);
            alert("Vui lòng cho phép chế độ toàn màn hình để làm bài thi.");
            return;
        }
      }

      const now = Date.now();
      localStorage.setItem(`exam_start_${roomId}`, now.toString());
      setHasStarted(true);
      requestWakeLock(); // Request lock immediately on start
  };
  
  const handleReEnterFullscreen = async () => {
       try {
            await document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } catch (e) {
            console.error(e);
        }
  };

  const handleJoin = () => {
    if (!name.trim() || !roomId.trim()) return alert("Vui lòng điền tên và mã phòng.");
    setConnecting(true);

    // Updated: Add STUN servers for better mobile connectivity
    const peer = new Peer({
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });
    
    peer.on('open', (id: string) => {
      console.log('Student Peer ID:', id);
      const teacherPeerId = `chem-exam-2025-${roomId}`;
      const connection = peer.connect(teacherPeerId);

      connection.on('open', () => {
        setConn(connection);
        setJoined(true);
        setConnecting(false);
      });

      connection.on('data', (data: NetworkMessage) => {
        if (data.type === 'SYNC_STATE') {
          setExamState(data.payload);
        }
      });

      connection.on('close', () => {
        alert('Mất kết nối với giáo viên!');
        setJoined(false);
        setConnecting(false);
      });

      connection.on('error', (err: any) => {
        console.error(err);
        alert('Không tìm thấy phòng thi hoặc lỗi kết nối.');
        setConnecting(false);
      });
    });

    peer.on('error', (err: any) => {
      console.error(err);
      setConnecting(false);
      alert('Lỗi kết nối mạng.');
    });
  };

  const handleSubmit = (auto = false) => {
    if (!auto && !confirm('Bạn chắc chắn muốn nộp bài?')) return;
    
    // Unlock everything
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error);
    }
    if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
    }

    // Calculate score immediately upon submission
    const score = calculateScore(p1, p2, p3, examState.answerKey);
    setMyScore(score);
    
    const submission = {
      id: Date.now().toString(),
      name: name,
      answers: { part1: p1, part2: p2, part3: p3 },
      score: score,
      submittedAt: Date.now(),
      violationCount: violationCount // Send violation count
    };

    if (conn && conn.open) {
      conn.send({ type: 'SUBMIT_ANSWERS', payload: submission });
      setSubmitted(true);
      if (auto) {
          alert("Hết giờ làm bài! Hệ thống đã tự động nộp bài của bạn.");
      }
    } else {
      alert("Mất kết nối với giáo viên. Không thể nộp bài! Vui lòng báo giáo viên.");
    }
  };

  const handleP2Change = (q: number, sub: keyof Part2AnswerBlock, val: boolean) => {
    setP2(prev => ({
      ...prev,
      [q]: { ...prev[q], [sub]: val }
    }));
  };

  const handleBack = () => {
    if (joined && !submitted && hasStarted && examState.status !== 'FINISHED') {
        if (!confirm("Bạn đang làm bài thi. Rời khỏi đây sẽ mất kết nối. Bạn có chắc chắn không?")) {
            return;
        }
    }
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error);
    }
    if (conn) {
        conn.close();
    }
    if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
    }
    window.location.hash = '';
  };
  
  const scrollToQuestion = (part: number, q: number) => {
      setShowPalette(false);
      const id = `q-p${part}-${q}`;
      const el = document.getElementById(id);
      if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  };

  const formatTime = (ms: number | null) => {
      if (ms === null) return "--:--";
      const totalSeconds = Math.floor(ms / 1000);
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 relative">
        <button 
            onClick={handleBack}
            className="absolute top-4 left-4 p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors flex items-center gap-2"
        >
            <ArrowLeft size={24} /> <span className="hidden sm:inline font-medium">Quay lại</span>
        </button>

        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-bold text-center text-blue-900 mb-6">Vào Phòng Thi</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và Tên</label>
              <input
                type="text"
                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Nguyễn Văn A"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã Phòng (Từ Giáo Viên)</label>
              <input
                type="number"
                inputMode="numeric"
                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none font-mono tracking-widest text-center text-lg"
                placeholder="0000"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={!name || !roomId || connecting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {connecting ? <Loader2 className="animate-spin" /> : <Wifi size={20} />}
              {connecting ? 'Đang kết nối...' : 'Kết Nối Vào Phòng'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ROOM OPEN (or WAITING which we treat as open for start), BUT STUDENT HAS NOT STARTED YET
  // AND exam is not finished.
  if (examState.status !== 'FINISHED' && !hasStarted && !submitted) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-6 relative">
            <button 
                onClick={handleBack}
                className="absolute top-4 left-4 p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
            >
                <ArrowLeft size={24} />
            </button>

            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full border border-blue-100">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Play className="w-8 h-8 text-blue-600 ml-1" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Sẵn Sàng Làm Bài?</h2>
                <div className="bg-gray-50 p-4 rounded-lg my-6">
                     <p className="text-gray-600 text-sm mb-2">Thời gian làm bài:</p>
                     <p className="text-3xl font-bold text-blue-800">{examState.duration} Phút</p>
                </div>
                
                {examState.enforceFullscreen && (
                    <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800 mb-4 flex items-center gap-2 text-left">
                        <Maximize className="shrink-0" size={16} />
                        <span>Bài thi này yêu cầu bật chế độ <b>toàn màn hình</b>. Nếu thoát ra, hệ thống sẽ ghi nhận vi phạm.</span>
                    </div>
                )}
                
                <button 
                    onClick={handleStartExam}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    {examState.enforceFullscreen ? 'Vào Thi (Fullscreen)' : 'Bắt Đầu Làm Bài'}
                </button>
            </div>
        </div>
    );
  }

  // Determine if we should show the full submission confirmation screen
  if (submitted && examState.status !== 'FINISHED') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-6 relative">
         <button 
            onClick={handleBack}
            className="absolute top-4 left-4 p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
        >
            <ArrowLeft size={24} />
        </button>

        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-sm w-full">
            <CheckCircle className="w-16 h-16 text-emerald-500 mb-4 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-800">Đã nộp bài thành công!</h2>
            
            <div className="mt-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="text-sm text-blue-600 uppercase font-bold tracking-wider mb-1">Điểm Số Của Bạn</div>
                <div className="text-5xl font-bold text-blue-700">{myScore}</div>
            </div>

            <p className="text-gray-500 mt-6 text-sm">
                Vui lòng đợi giáo viên kết thúc bài thi để xem chi tiết đáp án.
            </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-24 relative">
      {/* Fullscreen Enforcement Blocking Overlay */}
      {!isFullscreen && examState.enforceFullscreen && (
          <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-6 text-center">
              <div className="max-w-md w-full">
                  <ShieldAlert className="w-20 h-20 text-red-500 mx-auto mb-6 animate-pulse" />
                  <h2 className="text-2xl font-bold text-white mb-2 uppercase">Cảnh báo gian lận</h2>
                  <p className="text-gray-300 mb-8">
                      Bạn đã thoát chế độ toàn màn hình. Hành động này đã được ghi lại.
                      Vui lòng quay lại chế độ toàn màn hình để tiếp tục làm bài.
                  </p>
                  <button 
                    onClick={handleReEnterFullscreen}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl text-lg transition-colors"
                  >
                      QUAY LẠI BÀI THI
                  </button>
              </div>
          </div>
      )}

      {/* Violation Warning Overlay */}
      {showViolationWarning && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
              <div className="bg-red-600 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 border-2 border-white">
                  <AlertOctagon size={24} />
                  <div>
                      <h4 className="font-bold text-sm uppercase">Cảnh báo gian lận!</h4>
                      <p className="text-xs">Hệ thống phát hiện bạn đã rời màn hình thi.</p>
                  </div>
              </div>
          </div>
      )}

      {/* QUESTION PALETTE MODAL */}
      {showPalette && (
          <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={() => setShowPalette(false)}>
              <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
                      <h3 className="font-bold text-lg flex items-center gap-2"><LayoutGrid size={20} /> Tiến độ làm bài</h3>
                      <button onClick={() => setShowPalette(false)} className="p-1 hover:bg-blue-500 rounded"><X size={20} /></button>
                  </div>
                  <div className="p-4 overflow-y-auto flex-1 space-y-4">
                      {/* Part 1 */}
                      <div>
                          <h4 className="font-bold text-gray-500 text-sm mb-2 uppercase">Phần 1: Trắc nghiệm ({PART1_COUNT} câu)</h4>
                          <div className="grid grid-cols-6 gap-2">
                              {Array.from({length: PART1_COUNT}, (_, i) => i + 1).map(q => {
                                  const filled = !!p1[q];
                                  return (
                                      <button 
                                        key={q} 
                                        onClick={() => scrollToQuestion(1, q)}
                                        className={`h-10 rounded font-bold text-sm border ${filled ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'}`}
                                      >{q}</button>
                                  )
                              })}
                          </div>
                      </div>
                      
                      {/* Part 2 */}
                      <div>
                          <h4 className="font-bold text-gray-500 text-sm mb-2 uppercase">Phần 2: Đúng/Sai ({PART2_COUNT} câu)</h4>
                          <div className="grid grid-cols-4 gap-2">
                              {Array.from({length: PART2_COUNT}, (_, i) => i + 1).map(q => {
                                  const filledCount = Object.values(p2[q] || {}).filter(v => v !== null).length;
                                  const isFull = filledCount === 4;
                                  const isPartial = filledCount > 0 && filledCount < 4;
                                  let cls = "bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200";
                                  if (isFull) cls = "bg-blue-600 text-white border-blue-700";
                                  else if (isPartial) cls = "bg-yellow-500 text-white border-yellow-600";

                                  return (
                                      <button 
                                        key={q} 
                                        onClick={() => scrollToQuestion(2, q)}
                                        className={`h-10 rounded font-bold text-sm border ${cls}`}
                                      >{q}</button>
                                  )
                              })}
                          </div>
                      </div>

                       {/* Part 3 */}
                       <div>
                          <h4 className="font-bold text-gray-500 text-sm mb-2 uppercase">Phần 3: Trả lời ngắn ({PART3_COUNT} câu)</h4>
                          <div className="grid grid-cols-6 gap-2">
                              {Array.from({length: PART3_COUNT}, (_, i) => i + 1).map(q => {
                                  const filled = !!p3[q];
                                  return (
                                      <button 
                                        key={q} 
                                        onClick={() => scrollToQuestion(3, q)}
                                        className={`h-10 rounded font-bold text-sm border ${filled ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'}`}
                                      >{q}</button>
                                  )
                              })}
                          </div>
                      </div>
                      
                      <div className="flex justify-center gap-4 text-xs text-gray-500 mt-4 pt-4 border-t">
                          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-200 rounded"></div> Chưa làm</div>
                          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded"></div> Đang làm dở</div>
                          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-600 rounded"></div> Đã làm</div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
                onClick={handleBack}
                className="text-gray-500 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                title="Quay lại"
            >
                <ArrowLeft size={24} />
            </button>
            <div>
                <h1 className="font-bold text-gray-800 flex items-center gap-2">
                    <span className="bg-gray-100 p-1 rounded-md"><User size={16} /></span>
                    {name}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${examState.status === 'FINISHED' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {examState.status === 'FINISHED' ? 'Đã Kết Thúc' : 'Đang Làm Bài'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">Phòng: {roomId}</span>
                </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* WAKE LOCK INDICATOR */}
            {hasStarted && !submitted && examState.status !== 'FINISHED' && (
                <div className={`hidden sm:flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border ${wakeLockActive ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-400'}`} title={wakeLockActive ? "Màn hình luôn sáng" : "Màn hình có thể tắt"}>
                   {wakeLockActive ? <Sun size={12} className="fill-amber-500 stroke-amber-600" /> : <Zap size={12} />}
                   <span className="font-bold">{wakeLockActive ? 'Màn hình sáng' : 'Tiết kiệm pin'}</span>
                </div>
            )}

            {/* TIMER */}
            {examState.status !== 'FINISHED' && hasStarted && !submitted && (
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border font-mono font-bold text-xl ${
                    (timeLeft !== null && timeLeft < 60000) ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}>
                    <Clock size={20} />
                    {formatTime(timeLeft)}
                </div>
            )}
          </div>

          {myScore !== null && examState.status === 'FINISHED' && (
            <div className="text-right bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
              <span className="text-xs text-blue-600 uppercase font-bold">Điểm số</span>
              <div className="text-2xl font-bold text-blue-700 leading-none">{myScore}</div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Banner Status */}
        {examState.status === 'FINISHED' && (
             <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 flex items-start rounded-r-lg shadow-sm">
             <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2 mt-0.5" />
             <div className="flex-1">
               <h3 className="font-bold text-yellow-800">Bài thi đã kết thúc</h3>
               <p className="text-yellow-700 text-sm">
                   {examState.isReviewOpen 
                    ? "Giáo viên đã công bố đáp án. Bạn có thể xem chi tiết bên dưới." 
                    : "Giáo viên chưa công bố đáp án chi tiết."}
               </p>
             </div>
             {examState.isReviewOpen ? <Eye className="text-yellow-600" /> : <EyeOff className="text-yellow-600" />}
           </div>
        )}

        {violationCount > 0 && examState.status !== 'FINISHED' && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3 text-red-700 text-sm">
                <AlertOctagon size={18} />
                <span>Hệ thống ghi nhận bạn đã rời màn hình <b>{violationCount} lần</b>.</span>
            </div>
        )}
        
        {/* Helper text for Anti-cheat */}
        {hasStarted && !submitted && examState.status !== 'FINISHED' && (
            <div className="mb-4 flex gap-2">
                 <div className="flex-1 bg-blue-50 border border-blue-100 rounded-lg p-2 text-center text-xs text-blue-600 flex items-center justify-center gap-1">
                    <Sun size={12} /> Màn hình luôn sáng
                </div>
                {examState.enforceFullscreen && (
                     <div className="flex-1 bg-red-50 border border-red-100 rounded-lg p-2 text-center text-xs text-red-600 flex items-center justify-center gap-1 font-bold">
                        <ShieldAlert size={12} /> Đang giám sát Fullscreen
                    </div>
                )}
            </div>
        )}

        <ExamPart1 
          answers={p1} 
          onChange={(q, v) => setP1(prev => ({...prev, [q]: v}))} 
          disabled={submitted || examState.status === 'FINISHED'}
          correctAnswers={examState.isReviewOpen ? examState.answerKey.part1 : undefined}
        />
        <ExamPart2 
          answers={p2} 
          onChange={handleP2Change}
          disabled={submitted || examState.status === 'FINISHED'}
          correctAnswers={examState.isReviewOpen ? examState.answerKey.part2 : undefined}
        />
        <ExamPart3 
          answers={p3} 
          onChange={(q, v) => setP3(prev => ({...prev, [q]: v}))}
          disabled={submitted || examState.status === 'FINISHED'}
          correctAnswers={examState.isReviewOpen ? examState.answerKey.part3 : undefined}
        />
      </main>

      {/* Floating Action Button for Navigation Palette */}
      {hasStarted && !submitted && examState.status !== 'FINISHED' && (
          <button 
            onClick={() => setShowPalette(true)}
            className="fixed bottom-24 right-4 bg-white text-blue-600 p-3 rounded-full shadow-lg border border-blue-100 z-30 hover:bg-blue-50 flex items-center gap-2"
            title="Xem bảng câu hỏi"
          >
              <LayoutGrid size={24} />
              <span className="text-xs font-bold hidden sm:inline">Câu hỏi</span>
          </button>
      )}

      {/* Submit Button (Only if active and not submitted) */}
      {examState.status !== 'FINISHED' && hasStarted && !submitted && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="text-xs text-gray-400 hidden sm:block">
                 Đã làm: {Object.keys(p1).length + Object.keys(p3).length + Object.keys(p2).length}/{PART1_COUNT + PART2_COUNT + PART3_COUNT}
            </div>
            <button
              onClick={() => handleSubmit(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 shadow-lg transition-all active:scale-95 ml-auto"
            >
              <Send size={20} /> Nộp Bài
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentView;