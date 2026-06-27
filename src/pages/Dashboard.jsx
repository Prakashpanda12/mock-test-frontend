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
  // Removed 3D module as 2D charts look cleaner and more professional
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

  const { data: fullExamsRaw, isLoading: isFullLoading } = useQuery({
    queryKey: ['available_exams', 'full_length'],
    queryFn: async () => {
      const res = await api.get('/exam/full-length');
      return res.data.data;
    }
  });

  const { data: structuredSectionals, isLoading: isSecLoading } = useQuery({
    queryKey: ['available_exams', 'sectional'],
    queryFn: async () => {
      const res = await api.get('/exam/sectional');
      return res.data.data;
    }
  });

  const isExamsLoading = isFullLoading || isSecLoading;

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

  const { data: allBookmarks = [] } = useQuery({
    queryKey: ['all_bookmarks'],
    queryFn: async () => {
      const res = await api.get('/exam/bookmarks/all');
      return res.data.data;
    }
  });

  const [trendModalConfig, setTrendModalConfig] = useState({ isOpen: false, examId: null, examTitle: '' });
  
  // Dashboard Tabs State
  const [mainTab, setMainTab] = useState('overview'); // 'overview' | 'library'

  // Library Tabs state
  const [examTab, setExamTab] = useState('FULL_LENGTH');
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);

  // Filters State
  const [filterOrg, setFilterOrg] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterPost, setFilterPost] = useState('All');

  // Compute options for filters
  const availableOrgs = ['All', ...(orgData?.map(o => o.name) || [])];
  const selectedOrgData = orgData?.find(o => o.name === filterOrg);
  const availableTypes = ['All', ...(selectedOrgData ? selectedOrgData.recruitments.map(r => r.name) : [])];
  const selectedRecData = selectedOrgData?.recruitments.find(r => r.name === filterType);
  const availablePosts = ['All', ...(selectedRecData ? selectedRecData.posts : [])];

  const matchExam = (e) => {
    const matchOrg = filterOrg === 'All' || (e.organization || 'OSSSC') === filterOrg;
    const matchType = filterType === 'All' || (e.recruitmentType || 'General') === filterType;
    const matchPost = filterPost === 'All' || (e.targetPosts && e.targetPosts.includes(filterPost));
    return matchOrg && matchType && matchPost;
  };

  const fullExams = fullExamsRaw?.filter(matchExam) || [];

  const filteredSectionals = structuredSectionals?.map(section => {
    const filteredTopics = section.topics.map(topic => {
      return { ...topic, exams: topic.exams.filter(matchExam) };
    }).filter(topic => topic.exams.length > 0);
    return { ...section, topics: filteredTopics };
  }).filter(section => section.topics.length > 0) || [];

  const hasTakenExam = (examId) => {
    if (!performanceHistory) return false;
    return performanceHistory.some(p => p.examId === examId);
  };

  const getLatestSubmission = (examId) => {
    if (!performanceHistory) return null;
    const history = performanceHistory.filter(p => p.examId === examId);
    return history.length > 0 ? history[history.length - 1] : null; 
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
    if (!performanceHistory || performanceHistory.length === 0) return { chartData: [], summary: {} };
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;
    let totalScore = 0;
    let maxMarks = 0;
    
    performanceHistory.forEach(p => {
      if (p.subjects) {
        Object.values(p.subjects).forEach(s => {
          correct += s.correct;
          incorrect += s.incorrect;
          unanswered += s.unanswered;
        });
      }
      totalScore += p.totalScore;
      maxMarks += p.maxMarks;
    });

    const accuracy = ((correct / (correct + incorrect)) * 100).toFixed(1);
    
    return {
      chartData: [
        { name: 'Correct', value: correct, color: '#10B981' }, 
        { name: 'Incorrect', value: incorrect, color: '#EF4444' }, 
        { name: 'Unanswered', value: unanswered, color: '#9CA3AF' }
      ].filter(d => d.value > 0),
      summary: {
        totalExams: new Set(performanceHistory.map(p => p.examId)).size,
        totalAttempts: performanceHistory.length,
        accuracy: isNaN(accuracy) ? 0 : accuracy,
        questionsSolved: correct + incorrect
      }
    };
  };

  const overallStats = getOverallStats();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Header with Glassmorphism */}
      <header className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm shadow-sm border border-white/10">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">TestYari</h1>
              <p className="text-blue-200 text-[10px] md:text-xs font-semibold tracking-wider uppercase">Candidate Portal</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-bold">{user?.name}</p>
              <p className="text-xs text-blue-200">{user?.registrationNumber}</p>
            </div>
            <button 
              onClick={handleLogout} 
              className="bg-white/10 hover:bg-red-500/90 text-white text-sm font-bold py-2 px-4 rounded-lg shadow-sm border border-white/20 transition-all backdrop-blur-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              Logout
            </button>
          </div>
        </div>

        {/* Main Tabs Navigation */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex gap-6 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <button 
            className={`pb-3 pt-2 font-bold px-2 border-b-[3px] transition-all text-sm md:text-base whitespace-nowrap flex items-center gap-2 ${mainTab === 'overview' ? 'border-white text-white' : 'border-transparent text-blue-200 hover:text-white hover:border-white/50'}`}
            onClick={() => setMainTab('overview')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            Overview & Analytics
          </button>
          <button 
            className={`pb-3 pt-2 font-bold px-2 border-b-[3px] transition-all text-sm md:text-base whitespace-nowrap flex items-center gap-2 ${mainTab === 'library' ? 'border-white text-white' : 'border-transparent text-blue-200 hover:text-white hover:border-white/50'}`}
            onClick={() => setMainTab('library')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            Exam Library
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        
        {/* =========================================
            OVERVIEW & ANALYTICS TAB
        ========================================= */}
        {mainTab === 'overview' && (
          <div className="space-y-6 md:space-y-8 animate-fade-in">
            {/* Quick Stats Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 shadow-lg shadow-indigo-200/50 text-white transform hover:-translate-y-1 transition-transform border border-indigo-400/30">
                <div className="text-white/80 text-xs md:text-sm font-semibold mb-1 flex items-center gap-2">
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  Exams Taken
                </div>
                <div className="text-2xl md:text-4xl font-extrabold">{overallStats.summary?.totalExams || 0}</div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-5 shadow-lg shadow-blue-200/50 text-white transform hover:-translate-y-1 transition-transform border border-blue-400/30">
                <div className="text-white/80 text-xs md:text-sm font-semibold mb-1 flex items-center gap-2">
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  Total Attempts
                </div>
                <div className="text-2xl md:text-4xl font-extrabold">{overallStats.summary?.totalAttempts || 0}</div>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-5 shadow-lg shadow-emerald-200/50 text-white transform hover:-translate-y-1 transition-transform border border-emerald-400/30">
                <div className="text-white/80 text-xs md:text-sm font-semibold mb-1 flex items-center gap-2">
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                  Overall Accuracy
                </div>
                <div className="text-2xl md:text-4xl font-extrabold">{overallStats.summary?.accuracy || 0}%</div>
              </div>

              <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 shadow-lg shadow-orange-200/50 text-white transform hover:-translate-y-1 transition-transform border border-orange-400/30">
                <div className="text-white/80 text-xs md:text-sm font-semibold mb-1 flex items-center gap-2">
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  Questions Solved
                </div>
                <div className="text-2xl md:text-4xl font-extrabold">{overallStats.summary?.questionsSolved || 0}</div>
              </div>
            </div>

            {/* Performance Analytics Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-extrabold text-gray-800">Performance Analytics</h2>
                  <p className="text-sm text-gray-500 mt-1 font-medium">Deep dive into your accuracy and subject-wise metrics.</p>
                </div>
              </div>
              
              {isPerfLoading ? (
                <div className="text-center p-12 text-gray-400 font-bold animate-pulse">
                  <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                  <p>Loading performance metrics...</p>
                </div>
              ) : getExamWiseData().length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Clean 2D Bar Chart */}
                  <div className="lg:col-span-2 h-[300px] md:h-[420px] w-full bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <HighchartsReact
                      highcharts={Highcharts}
                      options={{
                        chart: { type: 'column', backgroundColor: 'transparent', style: { fontFamily: 'inherit' } },
                        title: { text: 'Subject Accuracy per Exam', align: 'left', style: { fontSize: '16px', fontWeight: 'bold', color: '#1f2937' } },
                        xAxis: { categories: getExamWiseData().map(exam => exam.examTitle), crosshair: true, labels: { style: { color: '#6b7280', fontSize: '12px' } }, lineColor: '#e5e7eb' },
                        yAxis: { min: 0, max: 100, title: { text: 'Score (%)', style: { color: '#6b7280' } }, gridLineColor: '#f3f4f6', labels: { style: { color: '#6b7280' } } },
                        tooltip: { headerFormat: '<span style="font-size:10px">{point.key}</span><table>', pointFormat: '<tr><td style="color:{series.color};padding:0">\u25CF </td><td style="padding:0"><b>{series.name}:</b></td><td style="padding:0;text-align:right"><b>{point.y}%</b></td></tr>', footerFormat: '</table>', shared: true, useHTML: true, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#e5e7eb', borderRadius: 8, shadow: true },
                        plotOptions: { column: { borderRadius: 4, pointPadding: 0.2, borderWidth: 0 } },
                        credits: { enabled: false },
                        legend: { itemStyle: { color: '#4b5563', fontWeight: '600' } },
                        series: uniqueSubjects.map((subject, idx) => ({
                          name: subject,
                          color: COLORS[idx % COLORS.length],
                          data: getExamWiseData().map(exam => exam[subject] || 0)
                        }))
                      }}
                      containerProps={{ style: { height: '100%', width: '100%' } }}
                    />
                  </div>

                  {/* Clean 2D Donut Chart */}
                  <div className="h-[300px] md:h-[420px] w-full bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col items-center justify-center">
                    <HighchartsReact
                      highcharts={Highcharts}
                      options={{
                        chart: { type: 'pie', backgroundColor: 'transparent', style: { fontFamily: 'inherit' } },
                        title: { text: 'Response Accuracy', align: 'left', style: { fontSize: '16px', fontWeight: 'bold', color: '#1f2937' } },
                        tooltip: { pointFormat: '<b>{point.percentage:.1f}%</b> ({point.y})', backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#e5e7eb', borderRadius: 8, shadow: true },
                        plotOptions: { pie: { innerSize: '60%', allowPointSelect: true, cursor: 'pointer', dataLabels: { enabled: true, format: '<b>{point.name}</b><br>{point.percentage:.1f}%', style: { fontWeight: '600', color: '#4b5563', textOutline: 'none' }, connectorColor: '#d1d5db' }, showInLegend: true, borderWidth: 2, borderColor: '#ffffff' } },
                        credits: { enabled: false },
                        legend: { itemStyle: { color: '#4b5563', fontWeight: '600' } },
                        series: [{
                          name: 'Responses',
                          colorByPoint: true,
                          data: overallStats.chartData.map(s => ({ name: s.name, y: s.value, color: s.color }))
                        }]
                      }}
                      containerProps={{ style: { height: '100%', width: '100%' } }}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-b from-gray-50 to-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center flex flex-col items-center justify-center">
                  <div className="bg-blue-50 p-5 rounded-full mb-5 shadow-inner">
                    <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-800 mb-2">No Data Available</h3>
                  <p className="text-gray-500 max-w-md font-medium leading-relaxed">Complete your first exam to unlock detailed performance analytics, 3D charts, and accuracy tracking here.</p>
                  <button onClick={() => setMainTab('library')} className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30 transform hover:-translate-y-0.5">
                    Go to Exam Library
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================
            EXAM LIBRARY TAB
        ========================================= */}
        {mainTab === 'library' && (
          <div className="animate-fade-in">
            {/* Header / Filter Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500"></div>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                
                {/* Internal Navigation (Full vs Sectional) */}
                <div className="flex gap-8 relative border-b border-gray-100 w-full lg:w-auto pb-1">
                  <button 
                    className={`text-base md:text-xl font-extrabold pb-3 transition-colors relative z-10 ${examTab === 'FULL_LENGTH' ? 'text-blue-700' : 'text-gray-400 hover:text-gray-700'}`}
                    onClick={() => { setExamTab('FULL_LENGTH'); setSelectedSection(null); setSelectedTopic(null); }}
                  >
                    Full Length Tests
                    {examTab === 'FULL_LENGTH' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 rounded-t-md"></div>}
                  </button>
                  <button 
                    className={`text-base md:text-xl font-extrabold pb-3 transition-colors relative z-10 ${examTab === 'SECTIONAL' ? 'text-blue-700' : 'text-gray-400 hover:text-gray-700'}`}
                    onClick={() => { setExamTab('SECTIONAL'); setSelectedSection(null); setSelectedTopic(null); }}
                  >
                    Sectional Tests
                    {examTab === 'SECTIONAL' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 rounded-t-md"></div>}
                  </button>
                </div>
                
                {/* Filters */}
                {((fullExamsRaw && fullExamsRaw.length > 0) || (structuredSectionals && structuredSectionals.length > 0)) && (
                  <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <select 
                      className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block px-4 py-2.5 font-bold transition-all outline-none hover:bg-gray-100 cursor-pointer"
                      value={filterOrg}
                      onChange={(e) => { setFilterOrg(e.target.value); setFilterType('All'); setFilterPost('All'); }}
                    >
                      {availableOrgs.map(org => <option key={org} value={org}>{org === 'All' ? 'All Organizations' : org}</option>)}
                    </select>
                    <select 
                      className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block px-4 py-2.5 font-bold transition-all outline-none disabled:opacity-50 hover:bg-gray-100 cursor-pointer disabled:cursor-not-allowed"
                      value={filterType}
                      onChange={(e) => { setFilterType(e.target.value); setFilterPost('All'); }}
                      disabled={availableTypes.length <= 1}
                    >
                      {availableTypes.map(type => <option key={type} value={type}>{type === 'All' ? 'All Recruitments' : type}</option>)}
                    </select>
                    <select 
                      className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block px-4 py-2.5 font-bold transition-all outline-none disabled:opacity-50 hover:bg-gray-100 cursor-pointer disabled:cursor-not-allowed"
                      value={filterPost}
                      onChange={(e) => setFilterPost(e.target.value)}
                      disabled={availablePosts.length <= 1}
                    >
                      {availablePosts.map(post => <option key={post} value={post}>{post === 'All' ? 'All Target Posts' : post}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
            
            {isExamsLoading ? (
              <div className="flex flex-col items-center justify-center p-16">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
                <p className="text-gray-500 font-medium">Loading exam library...</p>
              </div>
            ) : (
              <div className="min-h-[400px]">
                {/* SECTIONAL TESTS LOGIC */}
                {examTab === 'SECTIONAL' && !selectedSection && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSectionals.length > 0 ? filteredSectionals.map(section => (
                      <div 
                        key={section.sectionName}
                        onClick={() => setSelectedSection(section.sectionName)}
                        className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 p-8 cursor-pointer flex flex-col items-center justify-center text-center gap-4 hover:-translate-y-1.5 group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-125"></div>
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 p-5 rounded-2xl shadow-inner relative z-10 group-hover:text-blue-700 group-hover:from-blue-100 group-hover:to-indigo-100 transition-colors">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        </div>
                        <h3 className="text-lg md:text-xl font-extrabold text-gray-800 relative z-10 group-hover:text-blue-900 transition-colors">{section.sectionName}</h3>
                        <div className="bg-gray-50 border border-gray-100 text-gray-600 text-xs font-bold px-4 py-2 rounded-lg relative z-10 group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-100 transition-colors">
                          {section.topics.reduce((acc, curr) => acc + curr.exams.length, 0)} Available Sets
                        </div>
                      </div>
                    )) : (
                      <div className="col-span-full bg-white rounded-3xl border-2 border-dashed border-gray-200 p-16 text-center text-gray-500 font-medium">
                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                        No sectional tests match your current filters.
                      </div>
                    )}
                  </div>
                )}

                {examTab === 'SECTIONAL' && selectedSection && !selectedTopic && (
                  <div className="animate-fade-in">
                    <button 
                      onClick={() => setSelectedSection(null)}
                      className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-700 mb-6 transition-colors bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm w-max hover:shadow-md"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                      Back to Sections
                    </button>
                    <div className="flex items-center gap-4 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <div className="bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 p-3 rounded-xl shadow-inner">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                      </div>
                      <div>
                        <h3 className="text-xl md:text-2xl font-extrabold text-gray-800 tracking-tight">{selectedSection} Topics</h3>
                        <p className="text-sm font-semibold text-gray-500 mt-1">Select a topic to view available practice sets</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {(() => {
                        const secObj = filteredSectionals.find(s => s.sectionName === selectedSection);
                        const topics = secObj ? secObj.topics : [];
                        return topics.length > 0 ? topics.map(topic => (
                          <div 
                            key={topic.topicName}
                            onClick={() => setSelectedTopic(topic.topicName)}
                            className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 p-6 cursor-pointer flex items-center gap-5 hover:-translate-y-1 group relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-purple-50 to-transparent rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                            <div className="bg-purple-50 text-purple-600 p-4 rounded-2xl shadow-inner group-hover:bg-purple-600 group-hover:text-white transition-colors relative z-10">
                              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                            </div>
                            <div className="relative z-10">
                              <h3 className="text-base md:text-lg font-extrabold text-gray-800 group-hover:text-purple-900 transition-colors">{topic.topicName}</h3>
                              <p className="text-xs font-bold text-gray-500 mt-1 bg-gray-50 px-2 py-1 rounded inline-block group-hover:bg-purple-50 group-hover:text-purple-700 transition-colors">
                                {topic.exams.length} Sets
                              </p>
                            </div>
                          </div>
                        )) : (
                          <div className="col-span-full bg-white rounded-3xl border-2 border-dashed border-gray-200 p-12 text-center text-gray-500 font-medium">
                            No topics available in this section.
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {examTab === 'SECTIONAL' && selectedSection && selectedTopic && (
                  <div className="mb-8 flex flex-col items-start gap-4 animate-fade-in">
                    <button 
                      onClick={() => setSelectedTopic(null)}
                      className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-700 transition-colors bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm hover:shadow-md"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                      Back to Topics
                    </button>
                    <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 w-full">
                      <div className="bg-purple-100 text-purple-700 p-2 rounded-lg shadow-inner">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                      </div>
                      <h3 className="text-xl md:text-2xl font-extrabold text-gray-800 flex flex-wrap items-center gap-2 tracking-tight">
                        <span className="text-blue-600">{selectedSection}</span>
                        <svg className="w-5 h-5 text-gray-400 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        {selectedTopic}
                      </h3>
                    </div>
                  </div>
                )}

                {/* EXAM CARDS GRID */}
                {((examTab === 'FULL_LENGTH') || (examTab === 'SECTIONAL' && selectedSection && selectedTopic)) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    {(() => {
                      let displayExams = [];
                      if (examTab === 'FULL_LENGTH') {
                        displayExams = fullExams;
                      } else {
                        const secObj = filteredSectionals.find(s => s.sectionName === selectedSection);
                        const topicObj = secObj?.topics.find(t => t.topicName === selectedTopic);
                        displayExams = topicObj ? topicObj.exams : [];
                      }
                      
                      return displayExams.length > 0 ? displayExams.map(exam => {
                        const alreadyTaken = hasTakenExam(exam.examId);
                        const latestSub = getLatestSubmission(exam.examId);
                        return (
                          <div key={exam._id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col group relative transform hover:-translate-y-1">
                            {/* Decorative corner element */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-[4rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            
                            <div className="p-6 md:p-8 flex-1 relative z-10">
                              <div className="flex flex-wrap justify-between items-start gap-4 mb-5">
                                <h3 className="text-lg md:text-xl font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-tight">{exam.title}</h3>
                                {alreadyTaken && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-700 border border-green-200 shadow-sm shrink-0">
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                                    Completed
                                  </span>
                                )}
                              </div>
                              
                              <div className="mb-6">
                                <div className="flex flex-wrap gap-2 text-xs font-bold mb-3">
                                  <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm">{exam.organization || 'OSSSC'}</span>
                                  <span className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm">{exam.recruitmentType || 'General'}</span>
                                </div>
                                {exam.targetPosts && (
                                  <div className="text-sm font-semibold flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 w-max">
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                    <span className="text-gray-500">Posts:</span> <span className="text-gray-800">{exam.targetPosts}</span>
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-gray-700 mb-6">
                                <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 shadow-sm group-hover:bg-white group-hover:border-gray-200 transition-colors">
                                  <div className="bg-white p-1.5 rounded-lg shadow-sm">
                                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                  </div>
                                  <span className="font-extrabold">{exam.durationMinutes} Min</span>
                                </div>
                                <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 shadow-sm group-hover:bg-white group-hover:border-gray-200 transition-colors">
                                  <div className="bg-white p-1.5 rounded-lg shadow-sm">
                                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                  </div>
                                  <span className="font-extrabold">{exam.totalQuestions} Qs</span>
                                </div>
                                <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 shadow-sm group-hover:bg-white group-hover:border-gray-200 transition-colors">
                                  <div className="bg-white p-1.5 rounded-lg shadow-sm">
                                    <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
                                  </div>
                                  <span className="font-extrabold">{exam.totalMarks} Marks</span>
                                </div>
                                {(() => {
                                  const bookmarkCount = allBookmarks.filter(b => b.examId === exam.examId).length;
                                  if (bookmarkCount > 0) {
                                    return (
                                      <div className="flex items-center gap-2.5 bg-yellow-50 px-3 py-2 rounded-xl border border-yellow-200 text-yellow-700 shadow-sm">
                                        <div className="bg-white p-1.5 rounded-lg shadow-sm text-yellow-500">
                                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                        </div>
                                        <span className="font-extrabold">{bookmarkCount} Imp</span>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>

                              {alreadyTaken && latestSub?.subjects && (
                                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 shadow-inner">
                                  <h4 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                                    Latest Scorecard
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {Object.entries(latestSub.subjects).map(([subject, stats]) => {
                                      const percentage = (stats.correct / stats.totalQuestions) * 100;
                                      let colorClass = 'bg-red-50 text-red-700 border-red-200';
                                      if (percentage >= 75) colorClass = 'bg-green-50 text-green-700 border-green-200';
                                      else if (percentage >= 50) colorClass = 'bg-yellow-50 text-yellow-700 border-yellow-200';
                                      return (
                                        <span key={subject} className={`text-xs font-bold px-3 py-1.5 rounded-lg border shadow-sm ${colorClass} whitespace-nowrap flex items-center gap-1.5`}>
                                          <span className="opacity-75">{subject}:</span>
                                          <span>{stats.correct}/{stats.totalQuestions} ({Math.round(percentage)}%)</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="bg-gray-50/80 border-t border-gray-100 p-5 md:px-8 flex flex-col xl:flex-row justify-end items-center gap-3">
                              {alreadyTaken && (
                                <div className="flex w-full xl:w-auto gap-3">
                                  <button 
                                    onClick={() => navigate(`/exam/${exam.examId}/result`)}
                                    className="flex-1 xl:flex-none bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-sm font-extrabold py-3 px-5 rounded-xl shadow-sm transition-all text-center flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-md"
                                  >
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    Scorecard
                                  </button>
                                  <button 
                                    onClick={() => setTrendModalConfig({ isOpen: true, examId: exam.examId, examTitle: exam.title })}
                                    className="flex-1 xl:flex-none bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-sm font-extrabold py-3 px-5 rounded-xl shadow-sm transition-all text-center flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-md"
                                  >
                                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                                    Trend
                                  </button>
                                </div>
                              )}
                              <button 
                                onClick={() => startExam(exam.examId + (alreadyTaken ? '?mode=practice' : ''))}
                                className={`w-full xl:w-auto ${alreadyTaken ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'} text-white text-sm font-extrabold py-3 px-8 rounded-xl shadow-lg transition-all text-center flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-xl`}
                              >
                                {alreadyTaken ? (
                                  <>
                                    <svg className="w-4 h-4 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                    Practice Retake
                                  </>
                                ) : (
                                  <>
                                    Start Official Exam
                                    <svg className="w-4 h-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="col-span-full bg-white rounded-3xl border-2 border-dashed border-gray-200 p-16 text-center flex flex-col items-center justify-center">
                          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                          <h3 className="text-xl font-extrabold text-gray-800 mb-2">No Exams Found</h3>
                          <p className="text-gray-500 max-w-sm font-medium">There are currently no examinations available matching your selected filters or category.</p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
