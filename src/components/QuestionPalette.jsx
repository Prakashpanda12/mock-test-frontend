import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setCurrentQuestionIndex, PALETTE_STATES } from '../store/examSlice';

export const QuestionPalette = ({ onCloseMobile, bookmarkedQuestions = [] }) => {
  const dispatch = useDispatch();
  const { questions, responses, currentQuestionIndex } = useSelector((state) => state.exam);
  const user = useSelector((state) => state.auth.user);

  const scrollContainerRef = React.useRef(null);
  const activeBtnRef = React.useRef(null);

  React.useEffect(() => {
    if (activeBtnRef.current && scrollContainerRef.current) {
      activeBtnRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentQuestionIndex]);

  const getStyleForState = (status) => {
    switch (status) {
      case PALETTE_STATES.NOT_VISITED:
        return 'bg-gray-200 text-gray-800 border-gray-300';
      case PALETTE_STATES.NOT_ANSWERED:
        return 'bg-red-500 text-white border-red-600';
      case PALETTE_STATES.ANSWERED:
        return 'bg-green-600 text-white border-green-700';
      case PALETTE_STATES.MARKED_FOR_REVIEW:
        return 'bg-purple-600 text-white border-purple-700';
      case PALETTE_STATES.ANSWERED_AND_MARKED:
        return 'bg-purple-600 text-white border-purple-700 relative overflow-hidden after:content-[""] after:absolute after:bottom-0 after:right-0 after:w-3 after:h-3 after:bg-green-500 after:rounded-tl-md';
      default:
        return 'bg-gray-200 text-gray-800 border-gray-300';
    }
  };

  const getStats = () => {
    const stats = {
      NOT_VISITED: 0,
      NOT_ANSWERED: 0,
      ANSWERED: 0,
      MARKED_FOR_REVIEW: 0,
      ANSWERED_AND_MARKED: 0
    };
    stats.NOT_VISITED = questions.length - Object.keys(responses).length;
    
    Object.values(responses).forEach(res => {
      if (stats[res.status] !== undefined) {
        stats[res.status]++;
      }
    });
    return stats;
  };

  const stats = getStats();

  return (
    <div className="bg-white p-4 h-full border-l border-gray-200 shadow-sm flex flex-col">
      <div className="mb-6 flex flex-col items-center border-b pb-4">
        <div className="w-24 h-24 bg-gray-300 border-2 border-gray-400 mb-2 flex items-center justify-center overflow-hidden">
          {/* Candidate Photograph Placeholder */}
          <span className="text-gray-500 text-sm">Photo</span>
        </div>
        <p className="font-bold text-gray-800 text-sm">Reg No: {user?.registrationNumber || 'N/A'}</p>
        <p className="font-bold text-gray-800 text-sm">{user?.name || 'Candidate'}</p>
      </div>

      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        <h3 className="font-bold text-testyari-blue mb-3 text-sm uppercase">Question Palette View:</h3>
        <div className="grid grid-cols-5 gap-2">
          {questions.map((q, idx) => {
            const status = responses[q._id]?.status || PALETTE_STATES.NOT_VISITED;
            const isCurrent = idx === currentQuestionIndex;
            
            return (
              <button
                key={q._id}
                ref={isCurrent ? activeBtnRef : null}
                onClick={() => {
                  dispatch(setCurrentQuestionIndex(idx));
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`
                  w-10 h-10 rounded border text-sm font-bold shadow-sm transition-all
                  flex items-center justify-center relative
                  ${getStyleForState(status)}
                  ${isCurrent ? 'ring-2 ring-offset-2 ring-blue-500' : 'hover:opacity-90'}
                `}
              >
                {q.questionNumber}
                {bookmarkedQuestions.includes(q._id) && (
                  <span className="absolute -top-2 -right-2 text-yellow-500 bg-white rounded-full drop-shadow-sm p-0.5">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t pt-4 text-xs font-semibold text-gray-600 space-y-2">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
             <div className="w-4 h-4 rounded bg-gray-200 border border-gray-300"></div>
             <span>Not Visited</span>
           </div>
           <span className="font-bold text-gray-800 bg-gray-100 px-2 rounded-full">{stats.NOT_VISITED}</span>
         </div>
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
             <div className="w-4 h-4 rounded bg-red-500 border border-red-600"></div>
             <span>Not Answered</span>
           </div>
           <span className="font-bold text-red-700 bg-red-50 px-2 rounded-full">{stats.NOT_ANSWERED}</span>
         </div>
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
             <div className="w-4 h-4 rounded bg-green-600 border border-green-700"></div>
             <span>Answered</span>
           </div>
           <span className="font-bold text-green-700 bg-green-50 px-2 rounded-full">{stats.ANSWERED}</span>
         </div>
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
             <div className="w-4 h-4 rounded bg-purple-600 border border-purple-700"></div>
             <span>Marked for Review</span>
           </div>
           <span className="font-bold text-purple-700 bg-purple-50 px-2 rounded-full">{stats.MARKED_FOR_REVIEW}</span>
         </div>
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
             <div className="w-4 h-4 rounded bg-purple-600 border border-purple-700 relative after:content-[''] after:absolute after:bottom-0 after:right-0 after:w-1.5 after:h-1.5 after:bg-green-500"></div>
             <span>Answered & Marked</span>
           </div>
           <span className="font-bold text-blue-700 bg-blue-50 px-2 rounded-full">{stats.ANSWERED_AND_MARKED}</span>
         </div>
      </div>
    </div>
  );
};
