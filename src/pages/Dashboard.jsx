import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../api/axiosConfig';
import { logout } from '../store/authSlice';

export const Dashboard = () => {
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const startExam = (examId) => {
    navigate(`/exam/${examId}`);
  };

  const { data: exams, isLoading: isExamsLoading } = useQuery({
    queryKey: ['available_exams'],
    queryFn: async () => {
      const res = await api.get('/exam/list');
      return res.data.data;
    }
  });

  const { data: performanceHistory, isLoading: isPerfLoading } = useQuery({
    queryKey: ['my_performance'],
    queryFn: async () => {
      const res = await api.get('/exam/my-performance');
      return res.data.data;
    }
  });

  const hasTakenExam = (examId) => {
    if (!performanceHistory) return false;
    return performanceHistory.some(p => p.examId === examId);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-osssc-blue text-white shadow-md z-10 py-4 px-4 md:px-6 flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-lg md:text-xl font-bold uppercase tracking-wider">OSSSC Candidate Portal</h1>
        <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <span className="font-semibold text-xs md:text-sm">Welcome, {user?.name}</span>
          <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white text-xs md:text-sm font-bold py-1.5 md:py-2 px-3 md:px-4 rounded shadow">
            Log Out
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6 md:space-y-8">
        
        {/* Profile Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <h2 className="text-base md:text-lg font-bold border-b pb-2 mb-4 text-gray-800">Candidate Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 block mb-1">Registration Number</span>
              <span className="font-semibold text-gray-900">{user?.registrationNumber}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Email Address</span>
              <span className="font-semibold text-gray-900">{user?.email}</span>
            </div>
          </div>
        </div>

        {/* Performance Analytics Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
            Performance Analytics
          </h2>
          
          {isPerfLoading ? (
            <div className="text-center p-8 text-gray-500 font-bold">Loading performance data...</div>
          ) : performanceHistory && performanceHistory.length > 0 ? (
            <div className="h-60 md:h-72 w-full mt-4 -ml-4 md:ml-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceHistory} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="attemptNumber" tickFormatter={(val) => `Attempt ${val}`} stroke="#6B7280" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6B7280" style={{ fontSize: '10px' }} label={{ value: 'Score', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fontSize: '10px' } }} width={40} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px' }}
                    formatter={(value, name, props) => [`${value} / ${props.payload.maxMarks}`, 'Score']}
                    labelFormatter={(label, payload) => payload[0]?.payload?.examTitle || `Attempt ${label}`}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="totalScore" 
                    name="Your Score Progression" 
                    stroke="#2563EB" 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-gray-50 rounded border border-dashed border-gray-300 p-6 md:p-8 text-center text-gray-500 text-sm md:text-base">
              No performance data available yet. Complete an exam to see your progress here!
            </div>
          )}
        </div>

        {/* Exams Section */}
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Available Examinations</h2>
          
          {isExamsLoading ? (
            <div className="text-center p-8 text-gray-500 font-bold">Loading available exams...</div>
          ) : (
            <div className="grid gap-4">
              {exams && exams.length > 0 ? exams.map(exam => {
                const alreadyTaken = hasTakenExam(exam.examId);
                return (
                  <div key={exam._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50 gap-4 md:gap-6">
                      <div className="w-full">
                        <h3 className="text-base md:text-lg font-bold text-osssc-blue">{exam.title}</h3>
                        <p className="text-gray-500 text-xs md:text-sm mt-1 flex flex-wrap gap-x-3 gap-y-1">
                          <span>Duration: {exam.durationMinutes} Min</span>
                          <span className="hidden sm:inline">|</span>
                          <span>Questions: {exam.totalQuestions}</span>
                          <span className="hidden sm:inline">|</span>
                          <span>Marks: {exam.totalMarks}</span>
                        </p>
                        {alreadyTaken && (
                          <span className="inline-block mt-2 text-[10px] md:text-xs font-bold text-green-700 bg-green-100 border border-green-200 px-2 py-1 rounded">
                            Previously Completed
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 md:gap-2 w-full md:w-auto">
                        {alreadyTaken && (
                          <button 
                            onClick={() => navigate(`/exam/${exam.examId}/result`)}
                            className="w-full sm:w-auto bg-white hover:bg-gray-50 text-osssc-blue border border-osssc-blue text-xs md:text-sm font-bold py-2 md:py-3 px-4 md:px-6 rounded shadow-sm transition-colors text-center"
                          >
                            View Result
                          </button>
                        )}
                        <button 
                          onClick={() => startExam(exam.examId)}
                          className={`w-full sm:w-auto ${alreadyTaken ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'} text-white text-xs md:text-sm font-bold py-2 md:py-3 px-4 md:px-6 rounded shadow-md transition-colors text-center`}
                        >
                          {alreadyTaken ? 'Retake Exam' : 'Start Exam'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500 text-sm md:text-base">
                  No examinations are currently scheduled.
                </div>
              )}
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

