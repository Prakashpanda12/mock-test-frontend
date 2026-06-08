import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosConfig';
import { logout } from '../../store/authSlice';
import { Modal } from '../../components/Modal';
import { MasterDataTab } from '../../components/admin/MasterDataTab';

export const AdminDashboard = () => {
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('exams');

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

  const availableRecruitments = orgData?.find(o => o.name === organization)?.recruitments || [];
  const availablePosts = availableRecruitments.find(r => r.name === recruitmentType)?.posts || [];

  // Toggle User Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (userId) => {
      const res = await api.put(`/admin/users/${userId}/toggle-status`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['admin_users']);
    },
    onError: (err) => {
      setModalState({
        isOpen: true,
        type: 'alert',
        title: 'Action Failed',
        message: err.response?.data?.message || 'Could not change user status.',
        onConfirm: () => setModalState({ ...modalState, isOpen: false })
      });
    }
  });

  // Create Mutation
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
      setExamTitle('');
      setOrganization('');
      setRecruitmentType('');
      setTargetPosts('');
    },
    onError: (err) => {
      setCreateError(err.response?.data?.message || 'Failed to update exam');
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (examIdToDelete) => {
      const res = await api.delete(`/admin/exams/${examIdToDelete}`);
      return res.data;
    },
    onSuccess: (data) => {
      setModalState({
        isOpen: true,
        type: 'alert',
        title: 'Success',
        message: data.message,
        onConfirm: () => setModalState({ ...modalState, isOpen: false })
      });
      queryClient.invalidateQueries(['admin_exams_stats']);
    },
    onError: (err) => {
      setModalState({
        isOpen: true,
        type: 'alert',
        title: 'Error',
        message: err.response?.data?.message || err.message,
        onConfirm: () => setModalState({ ...modalState, isOpen: false })
      });
    }
  });

  const handleCreateExam = (e) => {
    e.preventDefault();
    setCreateError('');
    const examData = { title: examTitle, durationMinutes, negativeMarking, totalQuestions, totalMarks, organization, recruitmentType, targetPosts };
    if (editingExamId) {
      updateExamMutation.mutate(examData);
    } else {
      createExamMutation.mutate(examData);
    }
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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Modal 
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        onCancel={() => setModalState({ ...modalState, isOpen: false })}
        confirmText={modalState.type === 'danger' ? 'Delete' : 'Confirm'}
      />
      <header className="bg-gray-900 text-white shadow-md z-10 py-3 md:py-4 px-4 md:px-6 flex flex-wrap justify-between items-center gap-3 md:gap-4">
        <h1 className="text-lg md:text-xl font-bold uppercase tracking-wider w-full sm:w-auto text-center sm:text-left">TestYari Admin Control</h1>
        <div className="flex items-center justify-between w-full sm:w-auto gap-4">
          <span className="font-semibold text-xs md:text-sm">Admin: {user?.name}</span>
          <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white text-xs md:text-sm font-bold py-1.5 md:py-2 px-3 md:px-4 rounded shadow">
            Log Out
          </button>
        </div>
      </header>
      
      {/* Tab Navigation */}
      <div className="bg-white border-b shadow-sm px-4 md:px-8 pt-4 overflow-x-auto">
        <div className="flex gap-4 md:gap-6 min-w-max">
          <button 
            className={`pb-3 font-bold px-2 border-b-2 transition-colors text-sm md:text-base ${activeTab === 'exams' ? 'border-testyari-blue text-testyari-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('exams')}
          >
            Exam Master List
          </button>
          <button 
            className={`pb-3 font-bold px-2 border-b-2 transition-colors text-sm md:text-base ${activeTab === 'users' ? 'border-testyari-blue text-testyari-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('users')}
          >
            Registered Candidates
          </button>
          <button 
            className={`pb-3 font-bold px-2 border-b-2 transition-colors text-sm md:text-base ${activeTab === 'master_data' ? 'border-testyari-blue text-testyari-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('master_data')}
          >
            Master Data
          </button>
        </div>
      </div>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-6 md:gap-8">
        
        {/* Exams Master List */}
        {activeTab === 'exams' && (
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
          <div className="p-4 md:p-6 border-b bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-800">Exam Master List</h2>
              <p className="text-xs md:text-sm text-gray-500">Manage all registered examinations and view their overall statistics.</p>
            </div>
            <button 
              onClick={() => {
                setEditingExamId(null);
                setExamTitle(''); setOrganization(''); setRecruitmentType(''); setTargetPosts(''); 
                setDurationMinutes(120); setTotalQuestions(100); setTotalMarks(100); setNegativeMarking(0.25);
                setCreateError(''); setShowCreateModal(true);
              }}
              className="w-full sm:w-auto bg-testyari-blue hover:bg-blue-800 text-white font-bold py-2 md:py-2 px-4 md:px-6 rounded shadow-md transition-colors text-sm md:text-base"
            >
              + Create New Exam
            </button>
          </div>
          
          <div className="flex-1 overflow-x-auto p-0">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500 font-bold">Loading exams...</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs md:text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200 text-gray-700">
                    <th className="p-3 md:p-4 font-bold">Exam ID</th>
                    <th className="p-3 md:p-4 font-bold">Organization & Title</th>
                    <th className="p-3 md:p-4 font-bold text-center">Duration</th>
                    <th className="p-3 md:p-4 font-bold text-center">Questions</th>
                    <th className="p-3 md:p-4 font-bold text-center">Candidates Attempted</th>
                    <th className="p-3 md:p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exams?.map(exam => (
                    <tr key={exam._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3 md:p-4 font-mono font-semibold text-gray-800 text-xs">{exam.examId}</td>
                      <td className="p-3 md:p-4">
                        <div className="font-semibold text-testyari-blue">{exam.title}</div>
                        <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-1 items-center">
                          <span className="bg-gray-200 px-2 py-0.5 rounded font-bold text-gray-800">{exam.organization || 'OSSSC'}</span>
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">{exam.recruitmentType || 'General'}</span>
                          {exam.targetPosts && (
                            <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100">
                              Posts: {exam.targetPosts}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 md:p-4 text-center text-gray-600">{exam.durationMinutes} min</td>
                      <td className="p-3 md:p-4 text-center">
                        <span className={`font-bold ${exam.uploadedQuestionsCount < exam.totalQuestions ? 'text-red-600' : 'text-green-600'}`}>
                          {exam.uploadedQuestionsCount}
                        </span>
                        <span className="text-gray-500"> / {exam.totalQuestions}</span>
                      </td>
                      <td className="p-3 md:p-4 text-center">
                        <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full font-bold">
                          {exam.attemptedUsersCount}
                        </span>
                      </td>
                      <td className="p-3 md:p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => {
                              setEditingExamId(exam.examId);
                              setExamTitle(exam.title);
                              setOrganization(exam.organization || '');
                              setRecruitmentType(exam.recruitmentType || '');
                              setTargetPosts(exam.targetPosts || '');
                              setDurationMinutes(exam.durationMinutes);
                              setTotalQuestions(exam.totalQuestions);
                              setTotalMarks(exam.totalMarks);
                              setNegativeMarking(exam.negativeMarking);
                              setCreateError('');
                              setShowCreateModal(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 md:px-4 rounded shadow text-[10px] md:text-xs"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => navigate(`/admin/exam/${exam.examId}`)}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-3 md:px-4 rounded shadow text-[10px] md:text-xs"
                          >
                            Manage
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(exam)}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 md:px-4 rounded shadow text-[10px] md:text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!exams || exams.length === 0) && (
                    <tr>
                      <td colSpan="6" className="p-8 md:p-12 text-center text-gray-500">
                        No exams found. Click "Create New Exam" to begin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
        )}

        {/* Users Master List */}
        {activeTab === 'users' && (
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
          <div className="p-4 md:p-6 border-b bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-800">Registered Candidates</h2>
              <p className="text-xs md:text-sm text-gray-500">View all candidates registered in the system.</p>
            </div>
            <div className="bg-blue-50 text-testyari-blue px-4 py-2 rounded-lg font-bold shadow-sm border border-blue-100">
              Total: {usersData?.length || 0}
            </div>
          </div>
          
          <div className="flex-1 overflow-x-auto p-0">
            {uLoading ? (
              <div className="p-8 text-center text-gray-500 font-bold">Loading users...</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs md:text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200 text-gray-700">
                    <th className="p-3 md:p-4 font-bold">Registration Number</th>
                    <th className="p-3 md:p-4 font-bold">Candidate Name</th>
                    <th className="p-3 md:p-4 font-bold">Email Address</th>
                    <th className="p-3 md:p-4 font-bold text-center">Status</th>
                    <th className="p-3 md:p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersData?.map(user => (
                    <tr key={user._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3 md:p-4 font-mono font-semibold text-testyari-blue">{user.registrationNumber}</td>
                      <td className="p-3 md:p-4 font-bold text-gray-800">{user.name}</td>
                      <td className="p-3 md:p-4 text-gray-600">{user.email}</td>
                      <td className="p-3 md:p-4 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] md:text-xs font-bold ${
                          user.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive !== false ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="p-3 md:p-4 text-right">
                        <button 
                          onClick={() => toggleStatusMutation.mutate(user._id)}
                          disabled={toggleStatusMutation.isPending}
                          className={`font-bold py-1.5 px-3 md:px-4 rounded shadow text-[10px] md:text-xs transition-colors disabled:opacity-50 ${
                            user.isActive !== false 
                              ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {user.isActive !== false ? 'Deactivate' : 'Re-activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!usersData || usersData.length === 0) && (
                    <tr>
                      <td colSpan="5" className="p-8 md:p-12 text-center text-gray-500">
                        No candidates found in the system.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
        )}

        {/* Master Data Tab */}
        {activeTab === 'master_data' && <MasterDataTab setModalState={setModalState} />}

      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gray-900 text-white px-4 md:px-6 py-3 md:py-4 flex justify-between items-center shrink-0">
              <h2 className="text-base md:text-lg font-bold">{editingExamId ? 'Edit Examination' : 'Create New Examination'}</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white text-xl md:text-2xl">&times;</button>
            </div>
            
            <form onSubmit={handleCreateExam} className="p-4 md:p-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Exam Title</label>
                  <input type="text" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} required placeholder="e.g. Mock Test 1 for RI / ARI" className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-testyari-blue text-sm" />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Organization</label>
                  <select 
                    value={organization} 
                    onChange={(e) => { setOrganization(e.target.value); setRecruitmentType(''); setTargetPosts(''); }} 
                    required 
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-testyari-blue text-sm bg-white"
                  >
                    <option value="" disabled>Select Organization</option>
                    {orgData?.map(org => <option key={org._id} value={org.name}>{org.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Recruitment Category</label>
                  <select 
                    value={recruitmentType} 
                    onChange={(e) => { setRecruitmentType(e.target.value); setTargetPosts(''); }} 
                    required 
                    disabled={!organization}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-testyari-blue text-sm bg-white disabled:bg-gray-100"
                  >
                    <option value="" disabled>Select Recruitment Type</option>
                    {availableRecruitments.map((rec, idx) => <option key={idx} value={rec.name}>{rec.name}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Target Posts</label>
                  <select 
                    value={targetPosts} 
                    onChange={(e) => setTargetPosts(e.target.value)} 
                    required 
                    disabled={!recruitmentType}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-testyari-blue text-sm bg-white disabled:bg-gray-100"
                  >
                    <option value="" disabled>Select Target Post</option>
                    {availablePosts.map((post, idx) => <option key={idx} value={post}>{post}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Duration (Minutes)</label>
                  <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} required className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-testyari-blue text-sm" />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Default Negative Mark</label>
                  <input type="number" step="0.01" value={negativeMarking} onChange={(e) => setNegativeMarking(e.target.value)} required className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-testyari-blue text-sm" />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Total Questions</label>
                  <input type="number" value={totalQuestions} onChange={(e) => setTotalQuestions(e.target.value)} required className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-testyari-blue text-sm" />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Total Marks</label>
                  <input type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} required className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-testyari-blue text-sm" />
                </div>
              </div>
              
              {createError && <div className="mb-4 text-red-600 text-sm font-bold bg-red-50 p-3 rounded">{createError}</div>}
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" disabled={createExamMutation.isPending || updateExamMutation.isPending} className="bg-testyari-blue hover:bg-blue-800 text-white font-bold py-2 px-6 rounded shadow disabled:opacity-50">
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
