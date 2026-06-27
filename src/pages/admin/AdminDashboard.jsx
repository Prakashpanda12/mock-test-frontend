import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosConfig';
import { logout } from '../../store/authSlice';
import { Modal } from '../../components/Modal';
import { MasterDataTab } from '../../components/admin/MasterDataTab';
import { ExamExplorerTree } from '../../components/admin/ExamExplorerTree';

export const AdminDashboard = () => {
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('exams'); // 'exams' | 'users' | 'master_data'
  const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'list'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExamId, setEditingExamId] = useState(null);
  const [modalState, setModalState] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });
  
  // New Exam Form State
  const [examTitle, setExamTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [recruitmentType, setRecruitmentType] = useState('');
  const [targetPosts, setTargetPosts] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [negativeMarking, setNegativeMarking] = useState(0.25);
  const [totalQuestions, setTotalQuestions] = useState(100);
  const [totalMarks, setTotalMarks] = useState(100);
  const [examCategory, setExamCategory] = useState('FULL_LENGTH');
  const [sectionName, setSectionName] = useState('');
  const [subSectionName, setSubSectionName] = useState('');
  const [createError, setCreateError] = useState('');

  // Fetch Exams Stats
  const { data: exams, isLoading } = useQuery({
    queryKey: ['admin_exams_stats'],
    queryFn: async () => {
      const res = await api.get('/admin/exams-stats');
      return res.data.data;
    },
    enabled: activeTab === 'exams'
  });

  // Fetch Users
  const { data: usersData, isLoading: uLoading } = useQuery({
    queryKey: ['admin_users'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data.data;
    },
    enabled: activeTab === 'users'
  });

  // Fetch Master Data for dropdowns
  const { data: orgData, isLoading: orgLoading } = useQuery({
    queryKey: ['admin_organizations'],
    queryFn: async () => {
      const res = await api.get('/admin/organizations');
      return res.data.data;
    }
  });

  const { data: sectionsData, isLoading: sectionsLoading } = useQuery({
    queryKey: ['admin_sections'],
    queryFn: async () => {
      const res = await api.get('/admin/sections');
      return res.data.data;
    }
  });

  const availableRecruitments = orgData?.find(o => o.name === organization)?.recruitments || [];
  const availablePosts = availableRecruitments.find(r => r.name === recruitmentType)?.posts || [];
  
  const availableSections = sectionsData || [];
  const availableTopics = availableSections.find(s => s.name === sectionName)?.topics || [];

  // Mutations
  const toggleStatusMutation = useMutation({
    mutationFn: async (userId) => {
      const res = await api.put(`/admin/users/${userId}/toggle-status`);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries(['admin_users']),
    onError: (err) => setModalState({ isOpen: true, type: 'alert', title: 'Action Failed', message: err.response?.data?.message || 'Could not change user status.', onConfirm: () => setModalState({ ...modalState, isOpen: false }) })
  });

  const createExamMutation = useMutation({
    mutationFn: async (examData) => {
      const res = await api.post('/admin/exams', examData);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['admin_exams_stats']);
      setShowCreateModal(false);
      navigate(`/admin/exam/${data.data.examId}`);
    },
    onError: (err) => setCreateError(err.response?.data?.message || err.message)
  });

  const updateExamMutation = useMutation({
    mutationFn: async (examData) => {
      const res = await api.put(`/admin/exams/${editingExamId}`, examData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin_exams_stats']);
      setShowCreateModal(false);
      setEditingExamId(null);
    },
    onError: (err) => setCreateError(err.response?.data?.message || 'Failed to update exam')
  });

  const deleteMutation = useMutation({
    mutationFn: async (examIdToDelete) => {
      const res = await api.delete(`/admin/exams/${examIdToDelete}`);
      return res.data;
    },
    onSuccess: (data) => {
      setModalState({ isOpen: true, type: 'alert', title: 'Success', message: data.message, onConfirm: () => setModalState({ ...modalState, isOpen: false }) });
      queryClient.invalidateQueries(['admin_exams_stats']);
    },
    onError: (err) => setModalState({ isOpen: true, type: 'alert', title: 'Error', message: err.response?.data?.message || err.message, onConfirm: () => setModalState({ ...modalState, isOpen: false }) })
  });

  const renameSubTopicMutation = useMutation({
    mutationFn: async ({ sectionName, oldSubTopicName, newSubTopicName }) => {
      const res = await api.put('/admin/exams/bulk-update-subtopic', { sectionName, oldSubTopicName, newSubTopicName });
      return res.data;
    },
    onSuccess: (data) => {
      setModalState({ isOpen: true, type: 'alert', title: 'Success', message: data.message, onConfirm: () => setModalState({ ...modalState, isOpen: false }) });
      queryClient.invalidateQueries(['admin_exams_stats']);
    },
    onError: (err) => setModalState({ isOpen: true, type: 'alert', title: 'Error', message: err.response?.data?.message || err.message, onConfirm: () => setModalState({ ...modalState, isOpen: false }) })
  });

  const handleCreateExam = (e) => {
    e.preventDefault();
    setCreateError('');
    const examData = { title: examTitle, durationMinutes, negativeMarking, totalQuestions, totalMarks, organization, recruitmentType, targetPosts, examCategory, sectionName: examCategory === 'SECTIONAL' ? sectionName : '', subSectionName: examCategory === 'SECTIONAL' ? subSectionName : '' };
    if (editingExamId) {
      updateExamMutation.mutate(examData);
    } else {
      createExamMutation.mutate(examData);
    }
  };

  const handleQuickAddSectionalTopic = (section, topicName) => {
    // Find most recently created exam in this section to copy duration/marks, or use defaults
    const sectionExams = exams?.filter(e => e.examCategory === 'SECTIONAL' && e.sectionName === section) || [];
    let defaultDuration = 30;
    let defaultMarks = 30;
    let defaultQuestions = 30;
    let defaultNegMarking = 0.25;

    if (sectionExams.length > 0) {
      const sorted = [...sectionExams].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      const lastExam = sorted[0];
      defaultDuration = lastExam.durationMinutes || 30;
      defaultMarks = lastExam.totalMarks || 30;
      defaultQuestions = lastExam.totalQuestions || 30;
      defaultNegMarking = lastExam.negativeMarking || 0.25;
    }

    const examData = {
      title: `${topicName} - Set 1`,
      durationMinutes: defaultDuration,
      negativeMarking: defaultNegMarking,
      totalQuestions: defaultQuestions,
      totalMarks: defaultMarks,
      organization: orgData && orgData.length > 0 ? orgData[0].name : 'OSSSC',
      recruitmentType: orgData && orgData[0]?.recruitments?.length > 0 ? orgData[0].recruitments[0].name : 'General',
      targetPosts: '',
      examCategory: 'SECTIONAL',
      sectionName: section,
      subSectionName: topicName
    };
    createExamMutation.mutate(examData);
  };

  const handleQuickAddSectionalSet = (section, topicName) => {
    // Find exams for this specific subtopic
    const topicExams = exams?.filter(e => e.examCategory === 'SECTIONAL' && e.sectionName === section && e.subSectionName === topicName) || [];
    
    let defaultDuration = 30;
    let defaultMarks = 30;
    let defaultQuestions = 30;
    let defaultNegMarking = 0.25;

    if (topicExams.length > 0) {
      const sorted = [...topicExams].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      const lastExam = sorted[0];
      defaultDuration = lastExam.durationMinutes || 30;
      defaultMarks = lastExam.totalMarks || 30;
      defaultQuestions = lastExam.totalQuestions || 30;
      defaultNegMarking = lastExam.negativeMarking || 0.25;
    }

    const setName = `${topicName} - Set ${topicExams.length + 1}`;

    const examData = {
      title: setName,
      durationMinutes: defaultDuration,
      negativeMarking: defaultNegMarking,
      totalQuestions: defaultQuestions,
      totalMarks: defaultMarks,
      organization: orgData && orgData.length > 0 ? orgData[0].name : 'OSSSC',
      recruitmentType: orgData && orgData[0]?.recruitments?.length > 0 ? orgData[0].recruitments[0].name : 'General',
      targetPosts: '',
      examCategory: 'SECTIONAL',
      sectionName: section,
      subSectionName: topicName
    };
    createExamMutation.mutate(examData);
  };

  const handleRenameSubTopic = (sectionName, oldSubTopicName, newSubTopicName) => {
    renameSubTopicMutation.mutate({ sectionName, oldSubTopicName, newSubTopicName });
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleDeleteClick = (exam) => {
    setModalState({
      isOpen: true,
      type: 'danger',
      title: 'Delete Exam',
      message: `Are you sure you want to completely delete exam '${exam.title}' and all its associated questions and submissions? This action cannot be undone.`,
      onConfirm: () => {
        setModalState({ ...modalState, isOpen: false });
        deleteMutation.mutate(exam.examId);
      }
    });
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <Modal 
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        onCancel={() => setModalState({ ...modalState, isOpen: false })}
        confirmText={modalState.type === 'danger' ? 'Delete' : 'Confirm'}
      />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Persistent Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 w-64 bg-gray-900 text-white z-30 transform transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-xl`}>
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
          </div>
          <h1 className="text-xl font-black tracking-wider uppercase">Admin<span className="text-blue-500">Portal</span></h1>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            <button 
              onClick={() => { setActiveTab('exams'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'exams' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              Exam Master List
            </button>
            <button 
              onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              Registered Candidates
            </button>
            <button 
              onClick={() => { setActiveTab('master_data'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'master_data' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              Master Data Config
            </button>
          </nav>
        </div>
        
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="bg-gray-700 w-10 h-10 rounded-full flex items-center justify-center font-bold text-gray-300">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">{user?.name}</p>
              <p className="text-xs text-gray-500 font-medium leading-tight">Super Admin</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-sm font-bold py-2.5 rounded-xl transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
        
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
          <h1 className="text-lg font-black tracking-wider uppercase">Admin<span className="text-blue-600">Portal</span></h1>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          
          {/* Exams Master List */}
          {activeTab === 'exams' && (
          <div className="max-w-7xl mx-auto flex flex-col h-full animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Exam Master List</h2>
                <p className="text-sm font-medium text-gray-500 mt-1">Manage all registered examinations and view their overall statistics.</p>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="bg-gray-200 p-1 rounded-lg flex items-center shrink-0">
                  <button 
                    onClick={() => setViewMode('tree')}
                    className={`px-3 py-1.5 text-sm font-bold rounded-md transition-all ${viewMode === 'tree' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Tree View
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 text-sm font-bold rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    List View
                  </button>
                </div>

                <button 
                  onClick={() => {
                    setEditingExamId(null);
                    setExamTitle(''); setOrganization(''); setRecruitmentType(''); setTargetPosts(''); 
                    setDurationMinutes(120); setTotalQuestions(100); setTotalMarks(100); setNegativeMarking(0.25);
                    setExamCategory('FULL_LENGTH'); setSectionName(''); setSubSectionName('');
                    setCreateError(''); setShowCreateModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center gap-2 hover:-translate-y-0.5 shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                  <span className="hidden sm:inline">Create New Exam</span>
                </button>
              </div>
            </div>
            
            {viewMode === 'tree' ? (
              <ExamExplorerTree 
                organizations={orgData} 
                exams={exams}
                sections={sectionsData}
                onQuickAddSectionalTopic={handleQuickAddSectionalTopic}
                onQuickAddSectionalSet={handleQuickAddSectionalSet}
                onRenameSubTopic={handleRenameSubTopic}
                onAddExam={(org, rec, post) => {
                  setEditingExamId(null);
                  setExamTitle('');
                  setOrganization(org);
                  setRecruitmentType(rec);
                  setTargetPosts(post);
                  setDurationMinutes(120); setTotalQuestions(100); setTotalMarks(100); setNegativeMarking(0.25);
                  setExamCategory('FULL_LENGTH'); setSectionName(''); setSubSectionName('');
                  setCreateError(''); setShowCreateModal(true);
                }}
                onEditExam={(exam) => {
                  setEditingExamId(exam.examId); setExamTitle(exam.title); setOrganization(exam.organization || '');
                  setRecruitmentType(exam.recruitmentType || ''); setTargetPosts(exam.targetPosts || '');
                  setDurationMinutes(exam.durationMinutes); setTotalQuestions(exam.totalQuestions);
                  setTotalMarks(exam.totalMarks); setNegativeMarking(exam.negativeMarking);
                  setExamCategory(exam.examCategory || 'FULL_LENGTH'); setSectionName(exam.sectionName || '');
                  setSubSectionName(exam.subSectionName || ''); setCreateError(''); setShowCreateModal(true);
                }}
                onDeleteExam={handleDeleteClick}
                onManageExam={(examId) => navigate(`/admin/exam/${examId}`)}
              />
            ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
              <div className="flex-1 overflow-x-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-blue-600"></div>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-sm min-w-[900px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="p-4 font-bold">Exam ID</th>
                        <th className="p-4 font-bold">Details</th>
                        <th className="p-4 font-bold text-center">Config</th>
                        <th className="p-4 font-bold text-center">Questions</th>
                        <th className="p-4 font-bold text-center">Attempts</th>
                        <th className="p-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {exams?.map(exam => (
                        <tr key={exam._id} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="p-4 align-top">
                            <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">{exam.examId}</span>
                          </td>
                          <td className="p-4 align-top">
                            <div className="font-extrabold text-gray-900 text-base mb-1.5">{exam.title}</div>
                            <div className="flex flex-wrap gap-1.5 items-center">
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 text-[11px] font-bold">{exam.organization || 'OSSSC'}</span>
                              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 text-[11px] font-bold">{exam.recruitmentType || 'General'}</span>
                              <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${exam.examCategory === 'SECTIONAL' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                {exam.examCategory === 'SECTIONAL' ? `Sec: ${exam.sectionName}${exam.subSectionName ? ` - ${exam.subSectionName}` : ''}` : 'Full Length'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-center align-top">
                            <div className="font-bold text-gray-700">{exam.durationMinutes}m</div>
                            <div className="text-xs text-gray-500 font-semibold">{exam.totalMarks} Marks</div>
                          </td>
                          <td className="p-4 text-center align-top">
                            <div className="inline-flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                              <span className={`font-black text-base ${exam.uploadedQuestionsCount < exam.totalQuestions ? 'text-orange-500' : 'text-emerald-500'}`}>
                                {exam.uploadedQuestionsCount}
                              </span>
                              <span className="text-gray-400 font-bold text-xs">/ {exam.totalQuestions}</span>
                            </div>
                          </td>
                          <td className="p-4 text-center align-top">
                            <span className="bg-gray-900 text-white px-3 py-1 rounded-full font-black text-xs shadow-sm">
                              {exam.attemptedUsersCount}
                            </span>
                          </td>
                          <td className="p-4 align-top">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => {
                                  setEditingExamId(null); // Null because we are creating a NEW exam
                                  setExamTitle(exam.title + ' (Copy)'); 
                                  setOrganization(exam.organization || '');
                                  setRecruitmentType(exam.recruitmentType || ''); 
                                  setTargetPosts(exam.targetPosts || '');
                                  setDurationMinutes(exam.durationMinutes); 
                                  setTotalQuestions(exam.totalQuestions);
                                  setTotalMarks(exam.totalMarks); 
                                  setNegativeMarking(exam.negativeMarking);
                                  setExamCategory(exam.examCategory || 'FULL_LENGTH'); 
                                  setSectionName(exam.sectionName || '');
                                  setSubSectionName(''); // Clear topic so backend auto-generates next set number
                                  setCreateError(''); 
                                  setShowCreateModal(true);
                                }}
                                className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold py-1.5 px-3 rounded-lg shadow-sm text-xs transition-colors flex items-center gap-1"
                                title="Duplicate this Exam config"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                                Clone
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingExamId(exam.examId); setExamTitle(exam.title); setOrganization(exam.organization || '');
                                  setRecruitmentType(exam.recruitmentType || ''); setTargetPosts(exam.targetPosts || '');
                                  setDurationMinutes(exam.durationMinutes); setTotalQuestions(exam.totalQuestions);
                                  setTotalMarks(exam.totalMarks); setNegativeMarking(exam.negativeMarking);
                                  setExamCategory(exam.examCategory || 'FULL_LENGTH'); setSectionName(exam.sectionName || '');
                                  setSubSectionName(exam.subSectionName || ''); setCreateError(''); setShowCreateModal(true);
                                }}
                                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-bold py-1.5 px-3 rounded-lg shadow-sm text-xs transition-colors flex items-center gap-1"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => navigate(`/admin/exam/${exam.examId}`)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg shadow-sm text-xs transition-colors flex items-center gap-1"
                              >
                                Manage
                              </button>
                              <button 
                                onClick={() => handleDeleteClick(exam)}
                                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 font-bold py-1.5 px-3 rounded-lg shadow-sm text-xs transition-colors flex items-center gap-1"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(!exams || exams.length === 0) && (
                        <tr>
                          <td colSpan="6" className="p-16 text-center text-gray-500 font-medium">
                            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            No exams found. Click "Create New Exam" to begin.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            )}
          </div>
          )}

          {/* Users Master List */}
          {activeTab === 'users' && (
          <div className="max-w-6xl mx-auto flex flex-col h-full animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Registered Candidates</h2>
                <p className="text-sm font-medium text-gray-500 mt-1">Manage all candidates registered in the platform.</p>
              </div>
              <div className="bg-white border border-gray-200 text-gray-800 px-5 py-2 rounded-xl font-black shadow-sm text-sm">
                Total: {usersData?.length || 0}
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
              <div className="flex-1 overflow-x-auto">
                {uLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-blue-600"></div>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-sm min-w-[700px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="p-4 font-bold">Registration No</th>
                        <th className="p-4 font-bold">Candidate Name</th>
                        <th className="p-4 font-bold">Email Address</th>
                        <th className="p-4 font-bold text-center">Status</th>
                        <th className="p-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {usersData?.map(user => (
                        <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 font-mono font-bold text-gray-500 text-xs">{user.registrationNumber}</td>
                          <td className="p-4 font-extrabold text-gray-900">{user.name}</td>
                          <td className="p-4 text-gray-500 font-medium">{user.email}</td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                              user.isActive !== false ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                              {user.isActive !== false ? 'Active' : 'Deactivated'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button 
                              onClick={() => toggleStatusMutation.mutate(user._id)}
                              disabled={toggleStatusMutation.isPending}
                              className={`font-bold py-1.5 px-4 rounded-lg shadow-sm text-xs transition-colors disabled:opacity-50 ${
                                user.isActive !== false 
                                  ? 'bg-white hover:bg-orange-50 text-orange-600 border border-orange-200' 
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-transparent'
                              }`}
                            >
                              {user.isActive !== false ? 'Deactivate' : 'Re-activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(!usersData || usersData.length === 0) && (
                        <tr>
                          <td colSpan="5" className="p-16 text-center text-gray-500 font-medium">
                            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                            No candidates found in the system.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
          )}

          {/* Master Data Tab */}
          {activeTab === 'master_data' && (
            <div className="max-w-7xl mx-auto h-full animate-fade-in">
              <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Master Data Configuration</h2>
                <p className="text-sm font-medium text-gray-500 mt-1">Configure organizations, recruitments, and strictly typed exam sections.</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
                <MasterDataTab setModalState={setModalState} />
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Create Modal - Reusing the same form logic but modernized layout */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col transform transition-all">
            <div className="bg-gray-50 border-b border-gray-100 px-6 py-5 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-extrabold text-gray-900">{editingExamId ? 'Edit Examination' : 'Create New Examination'}</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 rounded-full p-1.5 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateExam} className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Exam Title <span className="text-red-500">*</span></label>
                  <input type="text" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} required placeholder="e.g. Mock Test 1 for RI / ARI" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold text-gray-800 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Organization <span className="text-red-500">*</span></label>
                  <select 
                    value={organization} onChange={(e) => { setOrganization(e.target.value); setRecruitmentType(''); setTargetPosts(''); }} required 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold text-gray-800 transition-all cursor-pointer"
                  >
                    <option value="" disabled>Select Organization</option>
                    {orgData?.map(org => <option key={org._id} value={org.name}>{org.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Recruitment Category <span className="text-red-500">*</span></label>
                  <select 
                    value={recruitmentType} onChange={(e) => { setRecruitmentType(e.target.value); setTargetPosts(''); }} required disabled={!organization}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold text-gray-800 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled>Select Recruitment Type</option>
                    {availableRecruitments.map((rec, idx) => <option key={idx} value={rec.name}>{rec.name}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Target Posts <span className="text-red-500">*</span></label>
                  <select 
                    value={targetPosts} onChange={(e) => setTargetPosts(e.target.value)} required disabled={!recruitmentType}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold text-gray-800 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled>Select Target Post</option>
                    {availablePosts.map((post, idx) => <option key={idx} value={post}>{post}</option>)}
                  </select>
                </div>
                
                <div className="sm:col-span-2 mt-2 pt-4 border-t border-gray-100"></div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Exam Category <span className="text-red-500">*</span></label>
                  <select 
                    value={examCategory} onChange={(e) => { setExamCategory(e.target.value); if (e.target.value !== 'SECTIONAL') { setSectionName(''); setSubSectionName(''); } }} 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-bold text-gray-800 transition-all cursor-pointer"
                  >
                    <option value="FULL_LENGTH">Full Length Test</option>
                    <option value="SECTIONAL">Sectional Test</option>
                  </select>
                </div>
                {examCategory === 'SECTIONAL' && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Section Name <span className="text-red-500">*</span></label>
                      <select 
                        value={sectionName} onChange={(e) => { setSectionName(e.target.value); setSubSectionName(''); }} required 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold text-gray-800 transition-all cursor-pointer"
                      >
                        <option value="" disabled>Select Section</option>
                        {availableSections.map(sec => <option key={sec._id} value={sec.name}>{sec.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">
                        Topic (Sub-Section) <span className="text-gray-400 font-medium ml-1">(Optional)</span>
                      </label>
                      <input 
                        list="topics-list" value={subSectionName} onChange={(e) => setSubSectionName(e.target.value)} disabled={!sectionName}
                        placeholder="Leave blank to auto-generate"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold text-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <datalist id="topics-list">
                        {availableTopics.map(topic => <option key={topic._id} value={topic.name} />)}
                      </datalist>
                    </div>
                  </>
                )}
                
                <div className="sm:col-span-2 mt-2 pt-4 border-t border-gray-100"></div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Duration (Mins) <span className="text-red-500">*</span></label>
                  <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold text-gray-800 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Default Negative Mark <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" value={negativeMarking} onChange={(e) => setNegativeMarking(e.target.value)} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold text-gray-800 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Total Questions <span className="text-red-500">*</span></label>
                  <input type="number" value={totalQuestions} onChange={(e) => setTotalQuestions(e.target.value)} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold text-gray-800 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Total Marks <span className="text-red-500">*</span></label>
                  <input type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold text-gray-800 transition-all" />
                </div>
              </div>
              
              {createError && <div className="mb-5 text-red-600 text-sm font-bold bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-2"><svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>{createError}</div>}
              
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={createExamMutation.isPending || updateExamMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-xl shadow-lg shadow-blue-500/30 disabled:opacity-50 transition-all hover:-translate-y-0.5">
                  {editingExamId ? (updateExamMutation.isPending ? 'Updating...' : 'Update Exam') : (createExamMutation.isPending ? 'Creating...' : 'Create Exam')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
