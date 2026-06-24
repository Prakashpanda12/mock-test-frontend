import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosConfig';
import { logout } from '../../store/authSlice';
import { QuestionForm } from '../../components/admin/QuestionForm';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';

export const AdminExamDetail = () => {
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { examId } = useParams();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('questions');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);

  const [file, setFile] = useState(null);
  const [uploadMode, setUploadMode] = useState('file');
  const [jsonText, setJsonText] = useState(`[
  {
    "QuestionNumber": 1,
    "Subject": "General Knowledge",
    "Weight": 1.0,
    "NegativeMark": 0.25,
    "Question_EN": "What is the capital of India? (Mandatory)",
    "Opt1_EN": "Mumbai (Mandatory)",
    "Opt2_EN": "New Delhi (Mandatory)",
    "Opt3_EN": "Kolkata (Mandatory)",
    "Opt4_EN": "Chennai (Mandatory)",
    "Correct_Index": 2,
    "Explanation_EN": "New Delhi is the capital of India. (Optional)",
    "Question_OR": "ଭାରତର ରାଜଧାନୀ କ'ଣ?",
    "Opt1_OR": "ମୁମ୍ବାଇ ",
    "Opt2_OR": "ନୂଆଦିଲ୍ଲୀ ",
    "Opt3_OR": "କୋଲକାତା ",
    "Opt4_OR": "ଚେନ୍ନାଇ ",
    "Explanation_OR": "ନୂଆଦିଲ୍ଲୀ ଭାରତର ରାଜଧାନୀ।"
  }
]`);
  const [uploadStatus, setUploadStatus] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [modalState, setModalState] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Fetch Questions
  const { data: questions, isLoading: qLoading } = useQuery({
    queryKey: ['admin_questions', examId],
    queryFn: async () => {
      const res = await api.get(`/admin/questions/${examId}`);
      return res.data.data;
    },
    enabled: activeTab === 'questions'
  });

  // Fetch User Progress for this exam
  const { data: progressData, isLoading: pLoading } = useQuery({
    queryKey: ['admin_exam_progress', examId],
    queryFn: async () => {
      const res = await api.get(`/admin/exams/${examId}/progress`);
      return res.data.data;
    },
    enabled: activeTab === 'users'
  });

  // Fetch Leaderboard for this exam
  const { data: leaderboardData, isLoading: lLoading } = useQuery({
    queryKey: ['admin_exam_leaderboard', examId],
    queryFn: async () => {
      const res = await api.get(`/admin/exams/${examId}/leaderboard`);
      return res.data.data;
    },
    enabled: activeTab === 'leaderboard'
  });

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await api.post('/admin/upload-questions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    onSuccess: (data) => {
      let msg = `Successfully uploaded ${data.count} questions.`;

      if (data.skipped && data.skipped.length > 0) {
        msg += ` (Skipped ${data.skipped.length} invalid rows). `;
      }

      if (data.sortedList && data.sortedList.length > 0) {
        msg += `\n\nQuestions processed and sorted by subject:\n`;
        const subjectCounts = {};
        data.sortedList.forEach(q => {
          const subj = q.subjectTag || 'Unknown';
          subjectCounts[subj] = (subjectCounts[subj] || 0) + 1;
        });
        msg += Object.entries(subjectCounts).map(([subj, count]) => `- ${subj}: ${count} questions`).join('\n');
      }

      setModalState({
        isOpen: true,
        type: 'alert',
        title: 'Upload Complete',
        message: msg,
        onConfirm: () => setModalState({ ...modalState, isOpen: false })
      });
      setUploadStatus(msg);
      queryClient.invalidateQueries(['admin_questions', examId]);
      setFile(null);
    },
    onError: (err) => {
      setModalState({
        isOpen: true,
        type: 'alert',
        title: 'Upload Failed',
        message: 'Upload failed: ' + (err.response?.data?.message || err.message),
        onConfirm: () => setModalState({ ...modalState, isOpen: false })
      });
      setUploadStatus('Upload failed: ' + (err.response?.data?.message || err.message));
    }
  });

  // JSON Playground Mutation
  const jsonPlaygroundMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/admin/upload-questions-json', payload);
      return res.data;
    },
    onSuccess: (data) => {
      let msg = `✅ Saved ${data.count} questions.`;
      if (data.skipped && data.skipped.length > 0) msg += ` Skipped ${data.skipped.length} invalid rows.`;
      toast(msg, 'success', 5000);
      setUploadStatus('');
      queryClient.invalidateQueries(['admin_questions', examId]);
      setJsonText('');
    },
    onError: (err) => {
      toast('Save failed: ' + (err.response?.data?.message || err.message), 'error', 5000);
      setUploadStatus('');
    }
  });

  // Edit Mutation
  const editMutation = useMutation({
    mutationFn: async (updatedQuestion) => {
      const res = await api.put(`/admin/questions/${updatedQuestion._id}`, updatedQuestion);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin_questions', examId]);
      setEditingQuestion(null);
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin_questions', examId]);
      toast('Question deleted successfully', 'success', 3000);
    }
  });

  // Bulk Delete Mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (questionIds) => {
      const res = await api.post(`/admin/questions/bulk-delete`, { questionIds });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['admin_questions', examId]);
      setSelectedQuestionIds([]);
      toast(data.message, 'success', 3000);
    },
    onError: (err) => {
      toast('Bulk delete failed: ' + (err.response?.data?.message || err.message), 'error', 5000);
    }
  });

  const handleUpload = (e) => {
    e.preventDefault();
    setUploadStatus('Uploading...');

    if (uploadMode === 'file') {
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('examId', examId);
      uploadMutation.mutate(formData);
    } else {
      if (!jsonText.trim()) return;
      let parsedQuestions;
      try {
        parsedQuestions = JSON.parse(jsonText);
        if (!Array.isArray(parsedQuestions)) parsedQuestions = [parsedQuestions];
      } catch (parseErr) {
        setUploadStatus('Invalid JSON: ' + parseErr.message);
        setModalState({
          isOpen: true, type: 'alert', title: 'Invalid JSON',
          message: 'Your JSON has a syntax error: ' + parseErr.message,
          onConfirm: () => setModalState({ ...modalState, isOpen: false })
        });
        return;
      }
      jsonPlaygroundMutation.mutate({ examId, questions: parsedQuestions });
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
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

      {/* Contextual Exam Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 w-64 bg-gray-900 text-white z-30 transform transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-xl`}>
        <div className="p-5 border-b border-gray-800">
          <Link to="/admin/dashboard" className="text-gray-400 hover:text-white flex items-center gap-2 mb-4 text-sm font-bold transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back to Dashboard
          </Link>
          <h2 className="text-lg font-black tracking-tight leading-tight uppercase text-blue-400 truncate" title={examId}>{examId}</h2>
          <p className="text-xs text-gray-500 font-medium mt-1">Exam Management</p>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            <button 
              onClick={() => { setActiveTab('questions'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'questions' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              Question Bank
            </button>
            <button 
              onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              Candidate Progress
            </button>
            <button 
              onClick={() => { setActiveTab('leaderboard'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'leaderboard' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
              Leaderboard
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
        
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
          <h1 className="text-lg font-black tracking-wider uppercase truncate max-w-[200px] text-blue-600">{examId}</h1>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          
          {/* Question Bank Tab */}
          {activeTab === 'questions' && (
          <div className="max-w-7xl mx-auto flex flex-col h-full animate-fade-in gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Question Bank</h2>
                <p className="text-sm font-medium text-gray-500 mt-1">Upload and manage questions for this exam batch.</p>
              </div>
            </div>

            {/* Upload Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-4 mb-5 gap-4">
                <h3 className="text-lg font-bold text-gray-800">Append Questions via File or JSON</h3>
                <div className="flex flex-wrap gap-2">
                  <a href="/template_questions.csv" download className="text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 bg-blue-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    CSV Template
                  </a>
                  <a href="/template_questions.json" download className="text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 bg-blue-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    JSON Template
                  </a>
                </div>
              </div>
              
              <div className="flex gap-2 mb-5">
                <button type="button" onClick={() => setUploadMode('file')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${uploadMode === 'file' ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  File Upload
                </button>
                <button type="button" onClick={() => setUploadMode('json')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${uploadMode === 'json' ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  JSON Playground
                </button>
              </div>

              <form onSubmit={handleUpload}>
                {uploadMode === 'file' ? (
                  <div className="flex flex-col sm:flex-row items-end gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Select Questions File (.csv, .xlsx, .json)</label>
                      <input type="file" accept=".csv, .xlsx, .xls, .json" onChange={(e) => setFile(e.target.files[0])} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <button type="submit" disabled={!file || uploadMutation.isPending} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                      {uploadMutation.isPending ? 'Processing...' : 'Upload & Process'}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Paste JSON Array of Questions</label>
                    <textarea
                      value={jsonText} onChange={(e) => setJsonText(e.target.value)} rows={6}
                      className="w-full bg-white border border-gray-200 rounded-lg p-3 font-mono text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner"
                      placeholder="[{...}, {...}]"
                    />
                    <div className="flex justify-end">
                      <button type="submit" disabled={!jsonText.trim() || jsonPlaygroundMutation.isPending} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-lg shadow-md disabled:opacity-50 transition-all">
                        {jsonPlaygroundMutation.isPending ? 'Saving to DB...' : 'Save JSON to Database'}
                      </button>
                    </div>
                  </div>
                )}
              </form>
              {uploadStatus && <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm font-bold text-blue-800">{uploadStatus}</div>}
            </section>

            {/* Datatable Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden min-h-[400px]">
              <div className="p-4 md:p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
                <h3 className="text-base font-extrabold text-gray-800">Database Preview <span className="bg-gray-200 text-gray-700 px-2.5 py-0.5 rounded-full text-xs ml-2">{questions?.length || 0}</span></h3>
                {selectedQuestionIds.length > 0 && (
                  <button
                    onClick={() => {
                      setModalState({
                        isOpen: true, type: 'danger', title: 'Bulk Delete',
                        message: `Are you sure you want to delete ${selectedQuestionIds.length} question(s)?`,
                        onConfirm: () => { setModalState({ ...modalState, isOpen: false }); bulkDeleteMutation.mutate(selectedQuestionIds); }
                      });
                    }}
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Delete Selected ({selectedQuestionIds.length})
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-x-auto">
                {qLoading ? (
                  <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div></div>
                ) : (
                  <table className="w-full text-left border-collapse text-sm min-w-[700px]">
                    <thead>
                      <tr className="bg-white border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                        <th className="p-3 w-12 text-center bg-white">
                          <input
                            type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-600"
                            checked={questions && questions.length > 0 && selectedQuestionIds.length === questions.length}
                            onChange={(e) => { e.target.checked ? setSelectedQuestionIds(questions.map(q => q._id)) : setSelectedQuestionIds([]); }}
                          />
                        </th>
                        <th className="p-3 font-bold w-16 bg-white">Q.No</th>
                        <th className="p-3 font-bold w-32 bg-white">Subject Tag</th>
                        <th className="p-3 font-bold bg-white">English Content Preview</th>
                        <th className="p-3 font-bold w-16 text-center bg-white">Ans</th>
                        <th className="p-3 font-bold w-32 text-right pr-6 bg-white">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {questions?.map(q => (
                        <tr key={q._id} className={`hover:bg-gray-50 transition-colors ${selectedQuestionIds.includes(q._id) ? 'bg-blue-50/50' : ''}`}>
                          <td className="p-3 text-center align-middle">
                            <input
                              type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-600"
                              checked={selectedQuestionIds.includes(q._id)}
                              onChange={(e) => { e.target.checked ? setSelectedQuestionIds([...selectedQuestionIds, q._id]) : setSelectedQuestionIds(selectedQuestionIds.filter(id => id !== q._id)); }}
                            />
                          </td>
                          <td className="p-3 font-bold text-gray-500">{q.questionNumber}</td>
                          <td className="p-3"><span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-[11px] font-bold border border-indigo-100 truncate max-w-[120px] inline-block">{q.subjectTag}</span></td>
                          <td className="p-3 text-gray-800 font-medium truncate max-w-[200px] md:max-w-md" title={q.content.en}>{q.content.en}</td>
                          <td className="p-3 text-center font-black text-emerald-600">{q.correctOptionIndex}</td>
                          <td className="p-3 text-right pr-4">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setEditingQuestion(q)} className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors">Edit</button>
                              <button
                                onClick={() => {
                                  setModalState({
                                    isOpen: true, type: 'danger', title: 'Delete Question', message: 'Delete this question? This cannot be undone.',
                                    onConfirm: () => { setModalState({ ...modalState, isOpen: false }); deleteMutation.mutate(q._id); }
                                  });
                                }}
                                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(!questions || questions.length === 0) && (
                        <tr><td colSpan="6" className="p-12 text-center text-gray-400 font-medium">No questions found in this exam batch.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>
          )}

          {/* Candidate Progress Tab */}
          {activeTab === 'users' && (
          <div className="max-w-6xl mx-auto h-full animate-fade-in flex flex-col">
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Candidate Progress</h2>
              <p className="text-sm font-medium text-gray-500 mt-1">Track live session states of all candidates appearing for this exam.</p>
            </div>
            
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-x-auto">
                {pLoading ? (
                  <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div></div>
                ) : (
                  <table className="w-full text-left border-collapse text-sm min-w-[700px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider sticky top-0">
                        <th className="p-4 font-bold">Candidate Info</th>
                        <th className="p-4 font-bold">Registration No</th>
                        <th className="p-4 font-bold text-center">Session Status</th>
                        <th className="p-4 font-bold text-center">Answered</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {progressData?.map(user => (
                        <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4">
                            <div className="font-extrabold text-gray-900">{user.name}</div>
                            <div className="text-xs text-gray-500 font-medium">{user.email}</div>
                          </td>
                          <td className="p-4 font-mono font-bold text-gray-500 text-xs">{user.registrationNumber}</td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                                user.sessionStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                user.sessionStatus === 'SUBMITTED' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                user.sessionStatus === 'EXPIRED' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-gray-100 text-gray-800 border border-gray-200'
                              }`}>
                              {user.sessionStatus}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-lg text-sm border border-indigo-100">
                              {user.answeredQuestions} Qs
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(!progressData || progressData.length === 0) && (
                        <tr><td colSpan="4" className="p-12 text-center text-gray-400 font-medium">No candidates have started this exam yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
          <div className="max-w-7xl mx-auto h-full animate-fade-in flex flex-col">
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Exam Leaderboard</h2>
                <p className="text-sm font-medium text-gray-500 mt-1">Final ranked results for candidates who have submitted their exam.</p>
              </div>
            </div>
            
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-x-auto">
                {lLoading ? (
                  <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div></div>
                ) : (
                  <table className="w-full text-left border-collapse text-sm min-w-[800px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider sticky top-0 shadow-sm z-10">
                        <th className="p-4 font-bold text-center w-16">Rank</th>
                        <th className="p-4 font-bold">Candidate</th>
                        <th className="p-4 font-bold text-center">Correct</th>
                        <th className="p-4 font-bold text-center">Incorrect</th>
                        <th className="p-4 font-bold text-right pr-6">Total Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {leaderboardData?.map(user => {
                        const getRankBadge = (rank) => {
                          if (rank === 1) return <span className="bg-yellow-400 text-yellow-900 w-8 h-8 rounded-full flex items-center justify-center font-black shadow-md mx-auto ring-2 ring-yellow-200">1</span>;
                          if (rank === 2) return <span className="bg-gray-300 text-gray-800 w-8 h-8 rounded-full flex items-center justify-center font-black shadow-md mx-auto ring-2 ring-gray-100">2</span>;
                          if (rank === 3) return <span className="bg-orange-300 text-orange-900 w-8 h-8 rounded-full flex items-center justify-center font-black shadow-md mx-auto ring-2 ring-orange-200">3</span>;
                          return <span className="text-gray-500 font-bold w-8 h-8 rounded-full flex items-center justify-center mx-auto bg-gray-50">{rank}</span>;
                        };

                        return (
                          <React.Fragment key={user._id}>
                            <tr className={`hover:bg-gray-50 transition-colors ${user.rank <= 3 ? 'bg-orange-50/20' : ''}`}>
                              <td className="p-4 text-center align-middle">{getRankBadge(user.rank)}</td>
                              <td className="p-4">
                                <div className="font-extrabold text-gray-900 text-base">{user.name}</div>
                                <div className="text-xs font-mono text-gray-500 mt-0.5">{user.registrationNumber}</div>
                                {user.subjects && Object.keys(user.subjects).length > 0 && (
                                  <button onClick={() => toggleRow(user._id)} className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1">
                                    {expandedRows[user._id] ? 'Hide Subject Analysis' : 'View Subject Analysis'}
                                    <svg className={`w-3 h-3 transform transition-transform ${expandedRows[user._id] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                  </button>
                                )}
                              </td>
                              <td className="p-4 text-center align-middle">
                                <span className="font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">{user.correctCount}</span>
                              </td>
                              <td className="p-4 text-center align-middle">
                                <span className="font-black text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-100">{user.incorrectCount}</span>
                              </td>
                              <td className="p-4 text-right align-middle pr-6">
                                <span className="font-black text-blue-600 text-2xl tracking-tight">
                                  {user.totalScore.toFixed(2)}
                                </span>
                              </td>
                            </tr>
                            {expandedRows[user._id] && user.subjects && (
                              <tr className="bg-gray-50/80 border-b border-gray-200">
                                <td colSpan="5" className="p-5">
                                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Subject Breakdown</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                      {Object.entries(user.subjects).map(([subject, stats]) => (
                                        <div key={subject} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                          <div className="font-bold text-gray-800 mb-2 pb-2 border-b border-gray-200 truncate" title={subject}>{subject}</div>
                                          <div className="flex justify-between items-center text-xs mb-1">
                                            <span className="text-gray-500 font-semibold">Attempted</span>
                                            <span className="font-bold text-gray-900">{stats.attempted}</span>
                                          </div>
                                          <div className="flex justify-between items-center text-xs mb-1">
                                            <span className="text-gray-500 font-semibold">Gained Marks</span>
                                            <span className="font-bold text-emerald-600">+{stats.positiveMarks}</span>
                                          </div>
                                          <div className="flex justify-between items-center text-xs mb-2">
                                            <span className="text-gray-500 font-semibold">Lost Marks</span>
                                            <span className="font-bold text-red-600">-{stats.negativeMarks}</span>
                                          </div>
                                          <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-200">
                                            <span className="text-gray-700 font-bold uppercase tracking-wider">Net Score</span>
                                            <span className="font-black text-blue-600 text-sm">{stats.score.toFixed(2)}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {(!leaderboardData || leaderboardData.length === 0) && (
                        <tr><td colSpan="5" className="p-16 text-center text-gray-400 font-medium">No results published for this exam yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>
          )}

        </main>
      </div>

      {editingQuestion && (
        <QuestionForm
          initialData={editingQuestion}
          onSave={(data) => editMutation.mutate(data)}
          onCancel={() => setEditingQuestion(null)}
        />
      )}
    </div>
  );
};
