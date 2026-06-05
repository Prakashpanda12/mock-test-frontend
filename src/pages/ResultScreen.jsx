import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosConfig';
import { TrendModal } from '../components/TrendModal';

export const ResultScreen = () => {
  const { examId } = useParams();
  const [isTrendOpen, setIsTrendOpen] = useState(false);

  const { data: scorecard, isLoading, isError, error } = useQuery({
    queryKey: ['exam_result', examId],
    queryFn: async () => {
      const res = await api.get(`/exam/${examId}/result`);
      return res.data.data;
    },
    retry: 1
  });

  const { data: performanceHistory } = useQuery({
    queryKey: ['my_performance'],
    queryFn: async () => {
      const res = await api.get('/exam/my-performance');
      return res.data.data;
    }
  });

  const getExamPerformanceHistory = () => {
    if (!performanceHistory) return [];
    return performanceHistory.filter(p => p.examId === examId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-osssc-blue border-t-transparent"></div>
        <p className="mt-4 text-lg font-bold text-gray-700">Calculating your result...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full border-t-4 border-red-500">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Result Unavailable</h2>
          <p className="text-gray-600 mb-6">{error.response?.data?.message || 'Failed to fetch result.'}</p>
          <Link to="/dashboard" className="inline-block bg-osssc-blue text-white font-bold py-3 px-8 rounded-full shadow hover:bg-blue-800 transition-colors">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
      <div className="max-w-4xl w-full">
        
        {/* Header */}
        <div className="text-center mb-6 md:mb-10">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Performance Scorecard</h1>
          <p className="mt-1 md:mt-2 text-base md:text-lg text-gray-600 font-medium px-4">{scorecard.examTitle}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 mx-4 md:mx-0">
          
          {/* Top Hero Section */}
          <div className="bg-gradient-to-br from-blue-900 to-osssc-blue px-4 md:px-8 py-8 md:py-12 text-center text-white">
            <h2 className="text-sm md:text-xl font-medium text-blue-100 uppercase tracking-widest mb-2">Final Score</h2>
            <div className="flex justify-center items-end gap-2 mb-2">
              <span className="text-5xl md:text-6xl font-black tracking-tighter">{scorecard.totalScore}</span>
              <span className="text-xl md:text-2xl font-medium text-blue-200 mb-1 md:mb-2">/ {scorecard.totalMarks}</span>
            </div>
            <p className="text-blue-200 text-sm md:text-base font-medium mt-4">
              Submitted on {new Date(scorecard.submittedAt).toLocaleString()}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="p-4 md:p-8">
            <h3 className="text-base md:text-lg font-bold text-gray-800 border-b pb-2 md:pb-3 mb-4 md:mb-6">Detailed Analysis</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              
              {/* Total Attempted */}
              <div className="bg-gray-50 rounded-2xl p-4 md:p-6 border border-gray-100 text-center flex flex-col justify-center">
                <div className="text-2xl md:text-3xl font-black text-gray-800 mb-1">
                  {scorecard.correctCount + scorecard.incorrectCount}
                </div>
                <div className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-wide">Attempted</div>
                <div className="text-[10px] md:text-xs text-gray-400 mt-1">Out of {scorecard.totalQuestions}</div>
              </div>

              {/* Correct */}
              <div className="bg-green-50 rounded-2xl p-4 md:p-6 border border-green-100 text-center flex flex-col justify-center">
                <div className="text-2xl md:text-3xl font-black text-green-600 mb-1">
                  {scorecard.correctCount}
                </div>
                <div className="text-[10px] md:text-sm font-bold text-green-800 uppercase tracking-wide">Correct</div>
                <div className="text-[10px] md:text-xs text-green-600 font-semibold mt-1">+{scorecard.positiveMarks} Marks</div>
              </div>

              {/* Incorrect */}
              <div className="bg-red-50 rounded-2xl p-4 md:p-6 border border-red-100 text-center flex flex-col justify-center">
                <div className="text-2xl md:text-3xl font-black text-red-600 mb-1">
                  {scorecard.incorrectCount}
                </div>
                <div className="text-[10px] md:text-sm font-bold text-red-800 uppercase tracking-wide">Incorrect</div>
                <div className="text-[10px] md:text-xs text-red-600 font-semibold mt-1">-{scorecard.negativeMarks} Marks</div>
              </div>

              {/* Unanswered */}
              <div className="bg-gray-50 rounded-2xl p-4 md:p-6 border border-gray-100 text-center flex flex-col justify-center">
                <div className="text-2xl md:text-3xl font-black text-gray-400 mb-1">
                  {scorecard.unansweredCount}
                </div>
                <div className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-wide">Unanswered</div>
                <div className="text-[10px] md:text-xs text-gray-400 mt-1">0 Marks</div>
              </div>

            </div>
          </div>

          {/* Subject-Wise Analysis */}
          {scorecard.subjects && (
            <div className="p-4 md:p-8 pt-0 mt-2">
              <h3 className="text-base md:text-lg font-bold text-gray-800 border-b pb-2 md:pb-3 mb-4 md:mb-6">Subject-Wise Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(scorecard.subjects).map(([subject, stats]) => {
                  const percentage = (stats.correct / stats.totalQuestions) * 100;
                  let colorClass = 'bg-red-50 border-red-100';
                  let barClass = 'bg-red-500';
                  if (percentage >= 75) {
                    colorClass = 'bg-green-50 border-green-100';
                    barClass = 'bg-green-500';
                  } else if (percentage >= 50) {
                    colorClass = 'bg-yellow-50 border-yellow-100';
                    barClass = 'bg-yellow-500';
                  }

                  return (
                    <div key={subject} className={`rounded-xl p-4 border ${colorClass} shadow-sm`}>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-gray-800">{subject}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">{Math.round(percentage)}%</span>
                          <span className="text-sm font-semibold px-2 py-1 bg-white rounded shadow-sm">{stats.score} Net Score</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 mb-3">
                        <span>Correct: <span className="text-green-700 font-bold">{stats.correct}</span></span>
                        <span>Incorrect: <span className="text-red-700 font-bold">{stats.incorrect}</span></span>
                        <span>Unanswered: <span className="font-bold">{stats.unanswered}</span></span>
                      </div>
                      <div className="w-full bg-white/50 rounded-full h-2">
                        <div className={`h-2 rounded-full ${barClass}`} style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="bg-gray-50 p-4 md:p-6 flex flex-col sm:flex-row justify-center gap-3 md:gap-4 border-t border-gray-100">
            <Link 
              to="/dashboard" 
              className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-100 font-bold py-3 px-6 md:px-8 rounded-full transition-colors shadow-sm text-center w-full sm:w-auto"
            >
              Dashboard
            </Link>
            <button
              onClick={() => setIsTrendOpen(true)}
              className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold py-3 px-6 md:px-8 rounded-full transition-colors shadow-sm text-center w-full sm:w-auto flex justify-center items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
              View Trend
            </button>
            <Link 
              to={`/exam/${examId}/review`} 
              className="bg-osssc-blue text-white hover:bg-blue-800 font-bold py-3 px-6 md:px-8 rounded-full transition-colors shadow-sm text-center w-full sm:w-auto"
            >
              Review Answers &rarr;
            </Link>
          </div>

        </div>
      </div>

      <TrendModal 
        isOpen={isTrendOpen}
        onClose={() => setIsTrendOpen(false)}
        examTitle={scorecard?.examTitle}
        performanceHistory={getExamPerformanceHistory()}
      />
    </div>
  );
};
