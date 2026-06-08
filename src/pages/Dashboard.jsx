import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HC_3D from 'highcharts/highcharts-3d';
import api from '../api/axiosConfig';
import { logout } from '../store/authSlice';
import { TrendModal } from '../components/TrendModal';

if (typeof Highcharts === 'object') {
  if (typeof HC_3D === 'function') {
    HC_3D(Highcharts);
  } else if (HC_3D && typeof HC_3D.default === 'function') {
    HC_3D.default(Highcharts);
  }
}

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

  const { data: orgData, isLoading: isOrgLoading } = useQuery({
    queryKey: ['exam_organizations'],
    queryFn: async () => {
      const res = await api.get('/exam/organizations');
      return res.data.data;
    }
  });

  const [trendModalConfig, setTrendModalConfig] = useState({ isOpen: false, examId: null, examTitle: '' });

  // Filters State
  const [filterOrg, setFilterOrg] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterPost, setFilterPost] = useState('All');

  // Compute options for filters directly from Master Data
  const availableOrgs = ['All', ...(orgData?.map(o => o.name) || [])];
  
  const selectedOrgData = orgData?.find(o => o.name === filterOrg);
  const availableTypes = ['All', ...(selectedOrgData ? selectedOrgData.recruitments.map(r => r.name) : [])];

  const selectedRecData = selectedOrgData?.recruitments.find(r => r.name === filterType);
  const availablePosts = ['All', ...(selectedRecData ? selectedRecData.posts : [])];

  const filteredExams = exams?.filter(e => {
    const matchOrg = filterOrg === 'All' || (e.organization || 'OSSSC') === filterOrg;
    const matchType = filterType === 'All' || (e.recruitmentType || 'General') === filterType;
    const matchPost = filterPost === 'All' || (e.targetPosts && e.targetPosts.includes(filterPost));
    return matchOrg && matchType && matchPost;
  });

  const hasTakenExam = (examId) => {
    if (!performanceHistory) return false;
    return performanceHistory.some(p => p.examId === examId);
  };

  const getLatestSubmission = (examId) => {
    if (!performanceHistory) return null;
    const history = performanceHistory.filter(p => p.examId === examId);
    return history.length > 0 ? history[history.length - 1] : null; // Sorted chronologically by backend
  };

  const getExamPerformanceHistory = (examId) => {
    if (!performanceHistory) return [];
    return performanceHistory.filter(p => p.examId === examId);
  };

  const getUniqueSubjects = () => {
    const subjects = new Set();
    if (performanceHistory) {
      performanceHistory.forEach(p => {
        if (p.subjects) {
          Object.keys(p.subjects).forEach(s => subjects.add(s));
        }
      });
    }
    return Array.from(subjects);
  };

  const getExamWiseData = () => {
    if (!performanceHistory) return [];
    const examMap = {};
    performanceHistory.forEach(p => {
      const percentage = (p.totalScore / p.maxMarks) * 100;
      if (!examMap[p.examId] || percentage > examMap[p.examId].overallPercentage) {
        const examObj = {
          examTitle: p.examTitle.length > 15 ? p.examTitle.substring(0, 15) + '...' : p.examTitle,
          fullTitle: p.examTitle,
          overallPercentage: percentage,
        };
        if (p.subjects) {
          Object.entries(p.subjects).forEach(([subject, stats]) => {
            examObj[subject] = Math.round((stats.correct / stats.totalQuestions) * 100);
          });
        }
        examMap[p.examId] = examObj;
      }
    });
    return Object.values(examMap);
  };

  const uniqueSubjects = getUniqueSubjects();
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#EF4444', '#14B8A6', '#F97316'];

  const getOverallStats = () => {
    if (!performanceHistory || performanceHistory.length === 0) return [];
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;
    
    performanceHistory.forEach(p => {
      if (p.subjects) {
        Object.values(p.subjects).forEach(s => {
          correct += s.correct;
          incorrect += s.incorrect;
          unanswered += s.unanswered;
        });
      }
    });

    return [
      { name: 'Correct', value: correct, color: '#10B981' }, 
      { name: 'Incorrect', value: incorrect, color: '#EF4444' }, 
      { name: 'Unanswered', value: unanswered, color: '#9CA3AF' }
    ].filter(d => d.value > 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      <header className="bg-testyari-blue text-white shadow-md z-10 py-4 px-4 md:px-6 flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-lg md:text-xl font-bold uppercase tracking-wider">Govt. Exam Candidate Portal</h1>
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
            <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            Overall Performance Analytics
          </h2>
          
          {isPerfLoading ? (
            <div className="text-center p-8 text-gray-500 font-bold">Loading performance data...</div>
          ) : getExamWiseData().length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
              
              {/* Colorful 3D Bar Chart */}
              <div className="lg:col-span-2 h-[350px] md:h-[400px] w-full -ml-4 md:ml-0">
                <HighchartsReact
                  highcharts={Highcharts}
                  options={{
                    chart: {
                      type: 'column',
                      options3d: {
                        enabled: true,
                        alpha: 15,
                        beta: 15,
                        depth: 50,
                        viewDistance: 25
                      },
                      backgroundColor: 'transparent',
                    },
                    title: {
                      text: 'Subject Accuracy per Exam',
                      style: { fontSize: '14px', fontWeight: 'bold', color: '#6B7280' }
                    },
                    xAxis: {
                      categories: getExamWiseData().map(exam => exam.examTitle),
                      labels: { style: { fontWeight: 'bold' } }
                    },
                    yAxis: {
                      title: { text: 'Highest Score (%)' },
                      max: 100
                    },
                    tooltip: {
                      headerFormat: '<b>{point.key}</b><br>',
                      pointFormat: '<span style="color:{series.color}">\u25CF</span> {series.name}: {point.y}%'
                    },
                    plotOptions: {
                      column: {
                        depth: 25
                      }
                    },
                    credits: { enabled: false },
                    series: uniqueSubjects.map((subject, idx) => ({
                      name: subject,
                      color: COLORS[idx % COLORS.length],
                      data: getExamWiseData().map(exam => exam[subject] || 0)
                    }))
                  }}
                  containerProps={{ style: { height: '100%', width: '100%' } }}
                />
              </div>

              {/* 3D Pie Chart */}
              <div className="h-[350px] md:h-[400px] w-full flex flex-col items-center">
                <HighchartsReact
                  highcharts={Highcharts}
                  options={{
                    chart: {
                      type: 'pie',
                      options3d: {
                        enabled: true,
                        alpha: 45,
                        beta: 0
                      },
                      backgroundColor: 'transparent',
                    },
                    title: {
                      text: 'Total Response Accuracy',
                      style: { fontSize: '14px', fontWeight: 'bold', color: '#6B7280' }
                    },
                    tooltip: {
                      pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b> ({point.y})'
                    },
                    plotOptions: {
                      pie: {
                        allowPointSelect: true,
                        cursor: 'pointer',
                        depth: 35,
                        dataLabels: {
                          enabled: true,
                          format: '{point.name}'
                        }
                      }
                    },
                    credits: { enabled: false },
                    series: [{
                      type: 'pie',
                      name: 'Responses',
                      data: getOverallStats().map(s => ({
                        name: s.name,
                        y: s.value,
                        color: s.color
                      }))
                    }]
                  }}
                  containerProps={{ style: { height: '100%', width: '100%' } }}
                />
              </div>

            </div>
          ) : (
            <div className="bg-gray-50 rounded border border-dashed border-gray-300 p-6 md:p-8 text-center text-gray-500 text-sm md:text-base">
              No performance data available yet. Complete an exam to see your progress here!
            </div>
          )}
        </div>

        {/* Exams Section */}
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-lg md:text-xl font-bold text-gray-800">Available Examinations</h2>
            
            {/* Filter Controls */}
            {exams && exams.length > 0 && (
              <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                <select 
                  className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-testyari-blue focus:border-testyari-blue block p-2 font-semibold shadow-sm"
                  value={filterOrg}
                  onChange={(e) => { setFilterOrg(e.target.value); setFilterType('All'); setFilterPost('All'); }}
                >
                  {availableOrgs.map(org => <option key={org} value={org}>{org === 'All' ? 'All Organizations' : org}</option>)}
                </select>
                <select 
                  className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-testyari-blue focus:border-testyari-blue block p-2 font-semibold shadow-sm"
                  value={filterType}
                  onChange={(e) => { setFilterType(e.target.value); setFilterPost('All'); }}
                  disabled={availableTypes.length <= 1}
                >
                  {availableTypes.map(type => <option key={type} value={type}>{type === 'All' ? 'All Recruitments' : type}</option>)}
                </select>
                <select 
                  className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-testyari-blue focus:border-testyari-blue block p-2 font-semibold shadow-sm"
                  value={filterPost}
                  onChange={(e) => setFilterPost(e.target.value)}
                  disabled={availablePosts.length <= 1}
                >
                  {availablePosts.map(post => <option key={post} value={post}>{post === 'All' ? 'All Target Posts' : post}</option>)}
                </select>
              </div>
            )}
          </div>
          
          {isExamsLoading ? (
            <div className="text-center p-8 text-gray-500 font-bold">Loading available exams...</div>
          ) : (
            <div className="grid gap-4">
              {filteredExams && filteredExams.length > 0 ? filteredExams.map(exam => {
                const alreadyTaken = hasTakenExam(exam.examId);
                const latestSub = getLatestSubmission(exam.examId);
                return (
                  <div key={exam._id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden flex flex-col">
                    <div className="p-5 md:p-6 flex-1">
                      <div className="flex flex-wrap justify-between items-start gap-4 mb-3">
                        <h3 className="text-lg md:text-xl font-bold text-gray-900">{exam.title}</h3>
                        {alreadyTaken && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                            Completed
                          </span>
                        )}
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-2 text-xs font-semibold mb-2">
                          <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200">{exam.organization || 'OSSSC'}</span>
                          <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md border border-purple-200">{exam.recruitmentType || 'General'}</span>
                        </div>
                        {exam.targetPosts && (
                          <div className="text-sm text-gray-600 font-medium">
                            <span className="text-gray-400 mr-1">Posts:</span> {exam.targetPosts}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 mb-5">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          <span>{exam.durationMinutes} Min</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          <span>{exam.totalQuestions} Questions</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
                          <span>{exam.totalMarks} Marks</span>
                        </div>
                      </div>

                      {alreadyTaken && latestSub?.subjects && (
                        <div className="bg-gray-50/80 rounded-lg p-3.5 border border-gray-100">
                          <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2.5">Latest Performance by Subject</h4>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(latestSub.subjects).map(([subject, stats]) => {
                              const percentage = (stats.correct / stats.totalQuestions) * 100;
                              let colorClass = 'bg-red-50 text-red-700 border-red-200';
                              if (percentage >= 75) colorClass = 'bg-green-50 text-green-700 border-green-200';
                              else if (percentage >= 50) colorClass = 'bg-yellow-50 text-yellow-700 border-yellow-200';
                              return (
                                <span key={subject} className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${colorClass} whitespace-nowrap`}>
                                  {subject}: {stats.correct}/{stats.totalQuestions} ({Math.round(percentage)}%)
                               </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-gray-50 border-t border-gray-100 p-4 md:px-6 flex flex-col sm:flex-row justify-end items-center gap-3">
                      {alreadyTaken && (
                        <>
                          <button 
                            onClick={() => navigate(`/exam/${exam.examId}/result`)}
                            className="w-full sm:w-auto bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-sm font-semibold py-2.5 px-5 rounded-lg shadow-sm transition-colors text-center"
                          >
                            Scorecard
                          </button>
                          <button 
                            onClick={() => setTrendModalConfig({ isOpen: true, examId: exam.examId, examTitle: exam.title })}
                            className="w-full sm:w-auto bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 text-sm font-semibold py-2.5 px-5 rounded-lg shadow-sm transition-colors text-center flex items-center justify-center gap-1.5"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                            Trend
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => startExam(exam.examId + (alreadyTaken ? '?mode=practice' : ''))}
                        className={`w-full sm:w-auto ${alreadyTaken ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'} text-white text-sm font-semibold py-2.5 px-6 rounded-lg shadow transition-colors text-center flex items-center justify-center gap-1.5`}
                      >
                        {alreadyTaken ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            Practice Retake
                          </>
                        ) : (
                          <>
                            Start Official
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                          </>
                        )}
                      </button>
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

      <TrendModal 
        isOpen={trendModalConfig.isOpen}
        onClose={() => setTrendModalConfig({ ...trendModalConfig, isOpen: false })}
        examTitle={trendModalConfig.examTitle}
        performanceHistory={getExamPerformanceHistory(trendModalConfig.examId)}
      />
    </div>
  );
};
