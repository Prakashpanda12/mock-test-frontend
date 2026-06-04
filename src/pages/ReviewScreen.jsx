import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosConfig';

export const ReviewScreen = () => {
  const { examId } = useParams();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [language, setLanguage] = useState('en');
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['exam_review', examId],
    queryFn: async () => {
      const res = await api.get(`/exam/${examId}/review`);
      return res.data.data;
    },
    retry: 1
  });

  const userResponses = useMemo(() => {
    if (!data?.responses) return {};
    const map = {};
    data.responses.forEach(r => {
      map[r.questionId] = r;
    });
    return map;
  }, [data?.responses]);

  const uniqueSubjects = useMemo(() => {
    if (!data?.questions) return [];
    return [...new Set(data.questions.map(q => q.subjectTag).filter(Boolean))];
  }, [data?.questions]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-gray-100">Loading Review Data...</div>;
  }

  if (isError || !data) {
    return <div className="flex items-center justify-center h-screen bg-gray-100 text-red-600 font-bold">Failed to load review data.</div>;
  }

  const { exam, questions, responses } = data;
  const currentQuestion = questions[currentIdx];

  const handleSubjectClick = (subject) => {
    const firstIndex = questions.findIndex(q => q.subjectTag === subject);
    if (firstIndex !== -1) {
      setCurrentIdx(firstIndex);
    }
  };

  const getStatusColor = (qId) => {
    const r = userResponses[qId];
    const q = questions.find(question => question._id === qId);
    if (!r || r.status === 'NOT_VISITED' || r.status === 'NOT_ANSWERED') return 'bg-gray-200 text-gray-700'; // Skipped
    if (r.selectedOption === q.correctOptionIndex) return 'bg-green-500 text-white'; // Correct
    return 'bg-red-500 text-white'; // Incorrect
  };

  const currentResponse = userResponses[currentQuestion._id];
  const isCorrect = currentResponse?.selectedOption === currentQuestion.correctOptionIndex;
  const isSkipped = !currentResponse || !currentResponse.selectedOption;

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-gray-800">
      <header className="bg-osssc-blue text-white shadow-md z-10 flex flex-col">
        <div className="flex flex-wrap justify-between items-center px-4 md:px-6 py-3 border-b border-blue-800 gap-3">
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-[200px] truncate">
            <Link to={`/exam/${examId}/result`} className="text-blue-200 hover:text-white font-bold whitespace-nowrap">&larr; Back</Link>
            <h1 className="text-lg md:text-xl font-bold uppercase tracking-wider border-l border-blue-800 pl-2 md:pl-4 truncate">Review: {exam.title}</h1>
          </div>
          <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <span className="font-semibold text-xs md:text-lg bg-gray-800 px-3 md:px-4 py-1 rounded shadow-inner whitespace-nowrap">
              READ-ONLY
            </span>
            <button 
              onClick={() => setIsPaletteOpen(true)}
              className="lg:hidden bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded flex items-center gap-2 text-sm font-bold border border-white/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              Palette
            </button>
          </div>
        </div>
        <div className="flex px-4 md:px-6 py-2 bg-blue-900 gap-2 overflow-x-auto scrollbar-hide">
          {uniqueSubjects.map((section, idx) => {
            const isActive = currentQuestion.subjectTag === section;
            return (
              <button 
                key={idx} 
                onClick={() => handleSubjectClick(section)}
                className={`px-3 md:px-4 py-1 text-xs md:text-sm font-semibold rounded whitespace-nowrap transition-colors ${isActive ? 'bg-white text-osssc-blue shadow' : 'text-blue-200 hover:bg-blue-800'}`}
              >
                {section}
              </button>
            );
          })}
        </div>
      </header>

      {/* Mobile Palette Overlay */}
      {isPaletteOpen && (
        <div className="fixed inset-0 z-40 bg-gray-900/40 lg:hidden flex justify-end backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-[85vw] max-w-sm h-full bg-white shadow-xl flex flex-col relative animate-in slide-in-from-right duration-300">
            <button 
              onClick={() => setIsPaletteOpen(false)} 
              className="absolute top-2 left-2 z-50 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-md backdrop-blur"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <div className="p-4 bg-gray-200 border-b border-gray-300 font-bold text-gray-800 text-center uppercase tracking-wider mt-12">
              Question Palette
            </div>
            <div className="p-4 grid grid-cols-2 gap-2 text-xs font-semibold mb-2 border-b border-gray-100">
              <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-500 rounded-sm"></div> Correct</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500 rounded-sm"></div> Incorrect</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-200 rounded-sm"></div> Skipped</div>
            </div>
            <div className="p-4 overflow-y-auto flex-1 pb-24">
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isActive = currentIdx === idx;
                  const statusColor = getStatusColor(q._id);
                  return (
                    <button
                      key={q._id}
                      onClick={() => {
                        setCurrentIdx(idx);
                        setIsPaletteOpen(false);
                      }}
                      className={`w-10 h-10 flex items-center justify-center font-bold text-sm rounded transition-all shadow-sm ${statusColor} ${isActive ? 'ring-2 ring-black ring-offset-2 transform scale-110' : 'hover:opacity-80'}`}
                    >
                      {q.questionNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col bg-white overflow-hidden">
          <div className="flex flex-wrap justify-between items-center p-3 md:p-4 border-b border-gray-200 bg-gray-50 gap-2">
            <div className="flex items-center gap-2 md:gap-4 flex-wrap">
              <h2 className="text-base md:text-lg font-bold">Q.No: {String(currentQuestion.questionNumber).padStart(2, '0')}</h2>
              {isSkipped ? (
                <span className="bg-gray-200 text-gray-700 px-2 md:px-3 py-1 rounded text-[10px] md:text-xs font-bold uppercase whitespace-nowrap">Skipped</span>
              ) : isCorrect ? (
                <span className="bg-green-100 text-green-800 px-2 md:px-3 py-1 rounded text-[10px] md:text-xs font-bold uppercase border border-green-200 whitespace-nowrap">Correct (+{currentQuestion.weight})</span>
              ) : (
                <span className="bg-red-100 text-red-800 px-2 md:px-3 py-1 rounded text-[10px] md:text-xs font-bold uppercase border border-red-200 whitespace-nowrap">Incorrect (-{currentQuestion.negativeMark || exam.negativeMarking})</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs md:text-sm font-semibold hidden sm:inline">View In:</span>
              <select 
                className="border border-gray-300 rounded px-2 py-1 text-xs md:text-sm outline-none bg-white"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="or">Odia</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-24 lg:pb-6">
            <div className="text-base md:text-lg font-medium leading-relaxed pb-4 border-b">
              {currentQuestion.content[language] || currentQuestion.content.en}
            </div>
            
            <div className="space-y-3 md:space-y-4">
              {currentQuestion.options.map((opt) => {
                const isSelectedByCandidate = currentResponse?.selectedOption === opt.index;
                const isActuallyCorrect = currentQuestion.correctOptionIndex === opt.index;
                
                let boxClass = 'border-gray-200 bg-white';
                let icon = null;

                if (isActuallyCorrect) {
                  boxClass = 'border-green-500 bg-green-50 ring-1 ring-green-500';
                  icon = <span className="text-green-600 font-bold">&#10003; Correct Answer</span>;
                } else if (isSelectedByCandidate && !isActuallyCorrect) {
                  boxClass = 'border-red-500 bg-red-50 ring-1 ring-red-500';
                  icon = <span className="text-red-600 font-bold">&#10007; Your Answer</span>;
                }

                return (
                  <div key={opt.index} className={`flex flex-col gap-1 p-3 md:p-4 border rounded ${boxClass}`}>
                    <div className="flex items-start gap-3 md:gap-4">
                      <span className="font-semibold text-gray-500 text-sm md:text-base">{String.fromCharCode(64 + opt.index)}.</span>
                      <span className="flex-1 font-medium text-sm md:text-base">{opt[language] || opt.en}</span>
                    </div>
                    {icon && <div className="text-xs md:text-sm mt-2 ml-6 md:ml-8">{icon}</div>}
                  </div>
                );
              })}
            </div>

            {/* Explanation Box */}
            <div className="mt-6 md:mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6">
              <h3 className="font-bold text-osssc-blue mb-2 flex items-center gap-2 text-sm md:text-base">
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Explanation
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap text-sm md:text-base">
                {currentQuestion.explanation?.[language] || currentQuestion.explanation?.en || 'No explanation provided by the administrator for this question.'}
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="bg-gray-100 p-3 md:p-4 border-t border-gray-300 flex justify-between items-center shrink-0">
            <button 
              onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
              disabled={currentIdx === 0}
              className="flex-1 sm:flex-none px-4 md:px-6 py-2 bg-white border border-gray-400 font-semibold rounded shadow-sm hover:bg-gray-50 text-gray-700 disabled:opacity-50 text-xs md:text-sm mr-2 text-center"
            >
              &larr; Previous
            </button>
            <button 
              onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))}
              disabled={currentIdx === questions.length - 1}
              className="flex-1 sm:flex-none px-4 md:px-6 py-2 bg-osssc-blue text-white font-semibold rounded shadow-sm hover:bg-blue-800 disabled:opacity-50 text-xs md:text-sm ml-2 text-center"
            >
              Next &rarr;
            </button>
          </div>
        </main>

        {/* Side Panel (Desktop only) */}
        <aside className="hidden lg:flex w-[320px] flex-shrink-0 bg-white border-l border-gray-300 flex-col">
          <div className="p-4 bg-gray-200 border-b border-gray-300 font-bold text-gray-800 text-center uppercase tracking-wider">
            Question Palette
          </div>
          
          <div className="p-4 grid grid-cols-2 gap-2 text-xs font-semibold mb-2 border-b border-gray-100">
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-500 rounded-sm"></div> Correct</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500 rounded-sm"></div> Incorrect</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-200 rounded-sm"></div> Skipped</div>
          </div>

          <div className="p-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isActive = currentIdx === idx;
                const statusColor = getStatusColor(q._id);
                return (
                  <button
                    key={q._id}
                    onClick={() => setCurrentIdx(idx)}
                    className={`w-10 h-10 flex items-center justify-center font-bold text-sm rounded transition-all shadow-sm ${statusColor} ${isActive ? 'ring-2 ring-black ring-offset-2 transform scale-110' : 'hover:opacity-80'}`}
                  >
                    {q.questionNumber}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
};
