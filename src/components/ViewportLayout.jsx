import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { QuestionPalette } from './QuestionPalette';
import { Modal } from './Modal';
import { useAbsoluteTimer } from '../hooks/useAbsoluteTimer';
import { 
  setLanguage, 
  selectOption, 
  saveAndNext, 
  markForReviewAndNext, 
  clearResponse,
  setSubmitting,
  setCurrentQuestionIndex
} from '../store/examSlice';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosConfig';

export const ViewportLayout = ({ targetEpoch, isPracticeMode }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { examId } = useParams();
  const { 
    questions, 
    currentQuestionIndex, 
    language, 
    responses, 
    isSubmitting 
  } = useSelector(state => state.exam);

  const user = useSelector(state => state.auth.user);

  const [modalState, setModalState] = useState({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: null });
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  const { data: examMeta } = useQuery({
    queryKey: ['exam_meta', examId],
    queryFn: async () => {
      const res = await api.get(`/exam/${examId}/meta`);
      return res.data.data;
    },
    staleTime: Infinity
  });

  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post(`/exam/${examId}/submit`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['exam_result', examId]);
      localStorage.removeItem(`osssc_exam_${examId}`);
      dispatch(setSubmitting(true));
    },
    onError: (err) => {
      setModalState({
        isOpen: true,
        type: 'alert',
        title: 'Submit Failed',
        message: 'Failed to submit exam: ' + (err.response?.data?.message || err.message),
        onConfirm: () => setModalState({ ...modalState, isOpen: false })
      });
    }
  });

  const handleAutoSubmit = React.useCallback(() => {
    if (isPracticeMode || isSubmitting || submitMutation.isPending) return;
    
    setModalState({
      isOpen: true,
      type: 'alert',
      title: 'Time Up!',
      message: 'Your time is up. The exam is being auto-submitted.',
      onConfirm: () => setModalState(prev => ({...prev, isOpen: false}))
    });

    const formattedResponses = Object.keys(responses).map(qId => ({
      questionId: qId,
      selectedOption: responses[qId].selectedOption,
      status: responses[qId].status
    }));

    submitMutation.mutate({
      userId: user._id,
      responses: formattedResponses
    });
  }, [isPracticeMode, isSubmitting, submitMutation, responses, user._id]);

  const { formattedTime } = useAbsoluteTimer(targetEpoch, handleAutoSubmit);

  const currentQuestion = questions[currentQuestionIndex];
  const currentResponse = currentQuestion ? responses[currentQuestion._id] : null;

  // Compute unique subjects dynamically from loaded questions
  const uniqueSubjects = React.useMemo(() => {
    if (!questions || questions.length === 0) return [];
    return [...new Set(questions.map(q => q.subjectTag).filter(Boolean))];
  }, [questions]);

  const handleSubjectClick = (subject) => {
    const firstIndex = questions.findIndex(q => q.subjectTag === subject);
    if (firstIndex !== -1) {
      dispatch(setCurrentQuestionIndex(firstIndex));
    }
  };

  const handleConfirmSubmit = () => {
    setModalState({ ...modalState, isOpen: false });
    const formattedResponses = Object.keys(responses).map(qId => ({
      questionId: qId,
      selectedOption: responses[qId].selectedOption,
      status: responses[qId].status
    }));
    submitMutation.mutate({
      userId: user._id,
      responses: formattedResponses
    });
  };

  const getStats = () => {
    const stats = {
      NOT_VISITED: 0,
      NOT_ANSWERED: 0,
      ANSWERED: 0,
      MARKED_FOR_REVIEW: 0,
      ANSWERED_AND_MARKED: 0
    };
    // Initialize with total questions for NOT_VISITED (minus the ones in responses)
    stats.NOT_VISITED = questions.length - Object.keys(responses).length;
    
    Object.values(responses).forEach(res => {
      if (stats[res.status] !== undefined) {
        stats[res.status]++;
      }
    });
    return stats;
  };

  const stats = getStats();

  if (!currentQuestion) {
    return <div className="flex items-center justify-center h-screen bg-gray-100">Loading Exam Configuration...</div>;
  }

  if (isSubmitting) {
    return (
      <div className="flex items-center justify-center h-screen bg-osssc-blue text-white flex-col p-4 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Exam Submitted Successfully</h1>
        <p className="text-lg md:text-xl mb-8">Thank you for taking the OSSSC Computer Based Test.</p>
        <button 
          onClick={() => navigate(`/exam/${examId}/result`)}
          className="bg-white text-osssc-blue font-bold px-8 py-3 rounded-full shadow-lg hover:bg-gray-100 transition-colors"
        >
          View My Result Scorecard
        </button>
      </div>
    );
  }

  const hasAnsweredInPractice = isPracticeMode && currentResponse && currentResponse.selectedOption !== null && currentResponse.selectedOption !== undefined;
  const isPracticeCorrect = hasAnsweredInPractice && currentResponse.selectedOption === currentQuestion.correctOptionIndex;

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 font-sans text-gray-800">
      <Modal 
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        onCancel={() => setModalState({ ...modalState, isOpen: false })}
        confirmText="Submit Exam"
      >
        {modalState.type === 'confirm' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-inner">
            <div className="flex justify-between items-center bg-white px-3 py-2 rounded shadow-sm border border-gray-100">
              <span className="text-xs font-semibold text-gray-500">Not Visited</span>
              <span className="bg-gray-200 text-gray-700 px-2 rounded-full text-xs font-bold">{stats.NOT_VISITED}</span>
            </div>
            <div className="flex justify-between items-center bg-white px-3 py-2 rounded shadow-sm border border-gray-100">
              <span className="text-xs font-semibold text-gray-500">Not Answered</span>
              <span className="bg-red-500 text-white px-2 rounded-full text-xs font-bold">{stats.NOT_ANSWERED}</span>
            </div>
            <div className="flex justify-between items-center bg-white px-3 py-2 rounded shadow-sm border border-gray-100">
              <span className="text-xs font-semibold text-gray-500">Answered</span>
              <span className="bg-green-600 text-white px-2 rounded-full text-xs font-bold">{stats.ANSWERED}</span>
            </div>
            <div className="flex justify-between items-center bg-white px-3 py-2 rounded shadow-sm border border-gray-100">
              <span className="text-xs font-semibold text-gray-500">Marked for Review</span>
              <span className="bg-purple-600 text-white px-2 rounded-full text-xs font-bold">{stats.MARKED_FOR_REVIEW}</span>
            </div>
            <div className="flex justify-between items-center bg-white px-3 py-2 rounded shadow-sm border border-gray-100 sm:col-span-2">
              <span className="text-xs font-semibold text-gray-500">Answered & Marked</span>
              <span className="bg-blue-600 text-white px-2 rounded-full text-xs font-bold">{stats.ANSWERED_AND_MARKED}</span>
            </div>
          </div>
        )}
      </Modal>

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
            <div className="flex-1 overflow-hidden pt-12">
              <QuestionPalette onCloseMobile={() => setIsPaletteOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Header Zone */}
      <header className="bg-osssc-blue text-white shadow-md z-10 flex flex-col">
        <div className="flex flex-wrap justify-between items-center px-4 md:px-6 py-3 border-b border-blue-800 gap-3">
          <h1 className="text-lg md:text-xl font-bold uppercase tracking-wider flex-1 min-w-[200px] truncate">{examMeta?.title || 'OSSSC Mock Examination'}</h1>
          <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto justify-between sm:justify-end">
            {isPracticeMode ? (
              <span className="font-semibold text-sm md:text-lg bg-orange-600 px-3 md:px-4 py-1 rounded shadow-inner whitespace-nowrap">
                PRACTICE MODE (No Timer)
              </span>
            ) : (
              <span className="font-semibold text-sm md:text-lg bg-red-600 px-3 md:px-4 py-1 rounded shadow-inner whitespace-nowrap">
                TIME: {formattedTime}
              </span>
            )}
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
            // Check if current question belongs to this section to highlight it
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

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Question Viewport */}
        <main className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Header of Question Area */}
          <div className="flex flex-wrap justify-between items-center p-3 md:p-4 border-b border-gray-200 bg-gray-50 gap-2">
            <h2 className="text-base md:text-lg font-bold">Q.No: {String(currentQuestion.questionNumber).padStart(2, '0')}</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs md:text-sm font-semibold hidden sm:inline">View In:</span>
              <select 
                className="border border-gray-300 rounded px-2 py-1 text-xs md:text-sm outline-none bg-white"
                value={language}
                onChange={(e) => dispatch(setLanguage(e.target.value))}
              >
                <option value="en">English</option>
                <option value="or">Odia</option>
              </select>
            </div>
          </div>

          {/* Question Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-24 lg:pb-6">
            <div className="text-base md:text-lg font-medium leading-relaxed pb-4 border-b">
              {currentQuestion.content[language] || currentQuestion.content.en}
            </div>
            
            <div className="space-y-3 md:space-y-4">
              {currentQuestion.options.map((opt) => {
                let borderClass = 'border-gray-200 hover:bg-gray-50';
                if (currentResponse?.selectedOption === opt.index) {
                  borderClass = 'border-osssc-blue bg-blue-50';
                }
                
                // Practice Mode formatting
                if (hasAnsweredInPractice) {
                  if (opt.index === currentQuestion.correctOptionIndex) {
                    borderClass = 'border-green-500 bg-green-50 shadow-sm';
                  } else if (currentResponse?.selectedOption === opt.index) {
                    borderClass = 'border-red-500 bg-red-50 shadow-sm';
                  } else {
                    borderClass = 'border-gray-200 opacity-60 cursor-not-allowed';
                  }
                }

                return (
                  <label 
                    key={opt.index} 
                    className={`flex items-start gap-3 md:gap-4 p-3 md:p-4 border rounded ${hasAnsweredInPractice ? 'cursor-not-allowed' : 'cursor-pointer'} transition-colors ${borderClass}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <input 
                        type="radio" 
                        name={`question_${currentQuestion._id}`}
                        className={`w-4 h-4 md:w-5 md:h-5 text-osssc-blue accent-osssc-blue ${hasAnsweredInPractice ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        checked={currentResponse?.selectedOption === opt.index}
                        onChange={() => {
                          if (!hasAnsweredInPractice) {
                            dispatch(selectOption({ questionId: currentQuestion._id, optionIndex: opt.index }));
                          }
                        }}
                        disabled={hasAnsweredInPractice}
                      />
                    </div>
                    <span className="font-semibold text-sm md:text-base">{String.fromCharCode(64 + opt.index)}.</span>
                    <span className="flex-1 text-sm md:text-base">{opt[language] || opt.en}</span>
                  </label>
                )
              })}
            </div>

            {hasAnsweredInPractice && (
              <div className={`mt-6 p-4 md:p-6 border rounded-lg shadow-sm animate-in fade-in slide-in-from-bottom-2 ${isPracticeCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <h3 className={`text-lg md:text-xl font-bold mb-2 flex items-center gap-2 ${isPracticeCorrect ? 'text-green-700' : 'text-red-700'}`}>
                  {isPracticeCorrect ? (
                    <><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Correct!</>
                  ) : (
                    <><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg> Incorrect</>
                  )}
                </h3>
                
                <div className="bg-white/60 p-3 rounded border border-black/5 mb-3">
                  <p className="text-gray-800 font-semibold">
                    The correct answer is: <span className="text-green-700 font-bold ml-1">
                      Option {String.fromCharCode(64 + currentQuestion.correctOptionIndex)}. {currentQuestion.options.find(o => o.index === currentQuestion.correctOptionIndex)?.[language] || currentQuestion.options.find(o => o.index === currentQuestion.correctOptionIndex)?.en}
                    </span>
                  </p>
                </div>

                {currentQuestion.explanation && (currentQuestion.explanation.en || currentQuestion.explanation.or) && (
                  <div className="mt-4 pt-4 border-t border-black/10">
                    <h4 className="font-semibold text-sm text-gray-700 mb-1">Explanation:</h4>
                    <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                      {currentQuestion.explanation[language] || currentQuestion.explanation.en}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="bg-gray-100 p-3 md:p-4 border-t border-gray-300 flex flex-wrap justify-between items-center gap-2 lg:gap-4 shrink-0">
            {isPracticeMode ? (
              <>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 sm:flex-none px-3 md:px-6 py-2 bg-gray-600 border border-gray-700 text-white text-xs md:text-sm font-semibold rounded shadow-sm hover:bg-gray-700 text-center whitespace-nowrap"
                  >
                    Exit Practice
                  </button>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => {
                      const nextIdx = currentQuestionIndex + 1;
                      if (nextIdx < questions.length) {
                        dispatch(setCurrentQuestionIndex(nextIdx));
                      } else {
                        navigate('/dashboard'); // End of practice
                      }
                    }}
                    className="flex-1 sm:flex-none px-3 md:px-6 py-2 bg-blue-600 text-white text-xs md:text-sm font-semibold rounded shadow-sm hover:bg-blue-700 text-center whitespace-nowrap"
                  >
                    Next Question
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => dispatch(clearResponse())}
                    className="flex-1 sm:flex-none px-3 md:px-6 py-2 bg-white border border-gray-400 text-xs md:text-sm font-semibold rounded shadow-sm hover:bg-gray-50 text-gray-700 text-center whitespace-nowrap"
                  >
                    Clear
                  </button>
                  <button 
                    onClick={() => dispatch(markForReviewAndNext())}
                    className="flex-1 sm:flex-none px-3 md:px-6 py-2 bg-purple-600 text-white text-xs md:text-sm font-semibold rounded shadow-sm hover:bg-purple-700 text-center whitespace-nowrap"
                  >
                    Mark & Next
                  </button>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => dispatch(saveAndNext())}
                    className="flex-1 sm:flex-none px-3 md:px-6 py-2 bg-green-600 text-white text-xs md:text-sm font-semibold rounded shadow-sm hover:bg-green-700 text-center whitespace-nowrap"
                  >
                    Save & Next
                  </button>
                  <button 
                    disabled={submitMutation.isPending}
                    onClick={() => {
                      setModalState({
                        isOpen: true,
                        type: 'confirm',
                        title: 'Confirm Submission',
                        message: 'Are you sure you want to submit the exam? You will not be able to change your answers after submission.',
                        onConfirm: handleConfirmSubmit
                      });
                    }}
                    className="flex-1 sm:flex-none px-3 md:px-6 py-2 bg-gray-300 text-gray-800 text-xs md:text-sm font-bold rounded shadow-sm hover:bg-gray-400 disabled:opacity-50 text-center whitespace-nowrap"
                  >
                    {submitMutation.isPending ? 'Wait...' : 'Submit'}
                  </button>
                </div>
              </>
            )}
          </div>
        </main>

        {/* Side Panel (Desktop only) */}
        <aside className="hidden lg:block w-[320px] flex-shrink-0">
          <QuestionPalette />
        </aside>

      </div>
    </div>
  );
};
