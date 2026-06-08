import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosConfig';
import { logout } from '../../store/authSlice';
import { QuestionForm } from '../../components/admin/QuestionForm';
import { Modal } from '../../components/Modal';

export const AdminExamDetail = () => {
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { examId } = useParams();
  
  const [activeTab, setActiveTab] = useState('questions');
  
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [modalState, setModalState] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });

  const toggleRow = (id) => {
    setExpandedRows(prev => ({...prev, [id]: !prev[id]}));
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
        
        if (data.sampleRow) {
          const foundKeys = Object.keys(data.sampleRow).map(k => k.trim());
          const missing = [];
          if (!foundKeys.includes('QuestionNumber')) missing.push('QuestionNumber');
          if (!foundKeys.includes('Correct_Index')) missing.push('Correct_Index');
          
          if (missing.length > 0) {
            msg += `\nError: Could not find columns: ${missing.join(', ')}. Please check your Excel headers!`;
          } else {
            msg += `\nError: 'Correct_Index' must be a number from 1 to 4, and 'QuestionNumber' must be a number.`;
          }
        }
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
    }
  });

  const handleUpload = (e) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('examId', examId);

    setUploadStatus('Uploading...');
    uploadMutation.mutate(formData);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
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
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-[200px] truncate">
          <Link to="/admin/dashboard" className="text-gray-300 hover:text-white font-bold whitespace-nowrap">&larr; Back</Link>
          <h1 className="text-lg md:text-xl font-bold uppercase tracking-wider border-l border-gray-600 pl-2 md:pl-4 truncate">Manage: {examId}</h1>
        </div>
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
            className={`pb-3 font-bold px-2 border-b-2 transition-colors text-sm md:text-base ${activeTab === 'questions' ? 'border-testyari-blue text-testyari-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('questions')}
          >
            Question Bank
          </button>
          <button 
            className={`pb-3 font-bold px-2 border-b-2 transition-colors text-sm md:text-base ${activeTab === 'users' ? 'border-testyari-blue text-testyari-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('users')}
          >
            Candidate Progress
          </button>
          <button 
            className={`pb-3 font-bold px-2 border-b-2 transition-colors text-sm md:text-base ${activeTab === 'leaderboard' ? 'border-testyari-blue text-testyari-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            Leaderboard
          </button>
        </div>
      </div>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-6 md:gap-8">
        
        {activeTab === 'questions' && (
          <>
            {/* Bulk Upload Section */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-2 mb-4 gap-2">
                <h2 className="text-base md:text-lg font-bold text-gray-800">Append Questions via CSV or XLSX</h2>
                <a 
                  href="/template_questions.csv" 
                  download 
                  className="text-xs md:text-sm font-bold text-testyari-blue hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  Download Template
                </a>
              </div>
              <form onSubmit={handleUpload} className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 md:gap-4 mt-2">
                  <div className="flex-1 w-full">
                    <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">Questions File (CSV/XLSX)</label>
                    <input type="file" accept=".csv, .xlsx, .xls" onChange={(e) => setFile(e.target.files[0])} className="w-full border rounded px-3 py-1.5 bg-white text-xs md:text-sm" />
                  </div>
                  <button type="submit" disabled={!file || uploadMutation.isPending} className="w-full sm:w-auto bg-testyari-blue text-white font-bold py-2 px-6 rounded shadow disabled:opacity-50 text-sm md:text-base">
                    {uploadMutation.isPending ? 'Uploading...' : 'Upload Questions'}
                  </button>
                </div>
              </form>
              {uploadStatus && <p className="mt-4 text-xs md:text-sm font-bold text-indigo-600">{uploadStatus}</p>}
            </section>

            {/* Datatable Section */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
              <div className="p-4 md:p-6 border-b bg-gray-50 flex justify-between items-center">
                <h2 className="text-base md:text-lg font-bold text-gray-800">Question Database ({questions?.length || 0})</h2>
              </div>
              
              <div className="flex-1 overflow-x-auto p-0">
                {qLoading ? (
                  <div className="p-8 text-center text-gray-500 font-bold">Loading database...</div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs md:text-sm min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200 text-gray-700">
                        <th className="p-3 font-bold w-12 md:w-16">Q.No</th>
                        <th className="p-3 font-bold w-24 md:w-32">Subject</th>
                        <th className="p-3 font-bold">English Snippet</th>
                        <th className="p-3 font-bold w-12 md:w-16">Ans</th>
                        <th className="p-3 font-bold w-24 md:w-32 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {questions?.map(q => (
                        <tr key={q._id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3 font-semibold text-gray-600">{q.questionNumber}</td>
                          <td className="p-3"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-[10px] md:text-xs font-bold">{q.subjectTag}</span></td>
                          <td className="p-3 truncate max-w-[150px] md:max-w-md" title={q.content.en}>{q.content.en}</td>
                          <td className="p-3 font-bold text-green-600">{q.correctOptionIndex}</td>
                          <td className="p-3 flex justify-center gap-1 md:gap-2">
                            <button onClick={() => setEditingQuestion(q)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 md:px-3 py-1 rounded text-[10px] md:text-xs font-bold">Edit</button>
                            <button 
                              onClick={() => {
                                setModalState({
                                  isOpen: true,
                                  type: 'danger',
                                  title: 'Delete Question',
                                  message: 'Are you sure you want to delete this question? This cannot be undone.',
                                  onConfirm: () => {
                                    setModalState({ ...modalState, isOpen: false });
                                    deleteMutation.mutate(q._id);
                                  }
                                });
                              }}
                              className="bg-red-500 hover:bg-red-600 text-white px-2 md:px-3 py-1 rounded text-[10px] md:text-xs font-bold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(!questions || questions.length === 0) && (
                        <tr>
                          <td colSpan="5" className="p-8 text-center text-gray-500">No questions found in this exam batch.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        )}

        {activeTab === 'users' && (
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 md:p-6 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="text-base md:text-lg font-bold text-gray-800">Candidate Progress Tracker</h2>
            </div>
            
            <div className="flex-1 overflow-x-auto p-0">
              {pLoading ? (
                <div className="p-8 text-center text-gray-500 font-bold">Loading candidate data...</div>
              ) : (
                <table className="w-full text-left border-collapse text-xs md:text-sm min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 text-gray-700">
                      <th className="p-3 font-bold">Candidate Name</th>
                      <th className="p-3 font-bold">Registration No</th>
                      <th className="p-3 font-bold">Email</th>
                      <th className="p-3 font-bold">Exam Status</th>
                      <th className="p-3 font-bold text-center">Questions Answered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progressData?.map(user => (
                      <tr key={user._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3 font-semibold text-gray-800">{user.name}</td>
                        <td className="p-3 font-mono text-gray-600">{user.registrationNumber}</td>
                        <td className="p-3 text-gray-600">{user.email}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-[10px] md:text-xs font-bold ${
                            user.sessionStatus === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                            user.sessionStatus === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                            user.sessionStatus === 'EXPIRED' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.sessionStatus}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-xs">
                            {user.answeredQuestions}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!progressData || progressData.length === 0) && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-gray-500">No candidates registered for this exam yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}

        {activeTab === 'leaderboard' && (
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 md:p-6 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="text-base md:text-lg font-bold text-gray-800">Exam Leaderboard</h2>
              <span className="bg-testyari-blue text-white px-3 py-1 rounded text-xs font-bold shadow-sm">Top Scorers</span>
            </div>
            
            <div className="flex-1 overflow-x-auto p-0">
              {lLoading ? (
                <div className="p-8 text-center text-gray-500 font-bold">Loading leaderboard...</div>
              ) : (
                <table className="w-full text-left border-collapse text-xs md:text-sm min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 text-gray-700">
                      <th className="p-3 font-bold text-center w-16">Rank</th>
                      <th className="p-3 font-bold">Candidate Name</th>
                      <th className="p-3 font-bold">Registration No</th>
                      <th className="p-3 font-bold text-center text-green-700">Correct</th>
                      <th className="p-3 font-bold text-center text-red-700">Incorrect</th>
                      <th className="p-3 font-bold text-right text-testyari-blue">Total Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData?.map(user => {
                      const getRankBadge = (rank) => {
                        if (rank === 1) return <span className="bg-yellow-400 text-yellow-900 w-8 h-8 rounded-full flex items-center justify-center font-black shadow mx-auto">1</span>;
                        if (rank === 2) return <span className="bg-gray-300 text-gray-800 w-8 h-8 rounded-full flex items-center justify-center font-black shadow mx-auto">2</span>;
                        if (rank === 3) return <span className="bg-orange-300 text-orange-900 w-8 h-8 rounded-full flex items-center justify-center font-black shadow mx-auto">3</span>;
                        return <span className="text-gray-600 font-bold">{rank}</span>;
                      };

                      return (
                        <React.Fragment key={user._id}>
                        <tr className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${user.rank <= 3 ? 'bg-orange-50/30' : ''}`}>
                          <td className="p-3 text-center align-middle">{getRankBadge(user.rank)}</td>
                          <td className="p-3 font-bold text-gray-800">
                            {user.name}
                            {user.subjects && Object.keys(user.subjects).length > 0 && (
                              <button onClick={() => toggleRow(user._id)} className="ml-3 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider text-blue-600 bg-blue-100 rounded hover:bg-blue-200 transition-colors">
                                {expandedRows[user._id] ? 'Hide Subjects' : 'View Subjects'}
                              </button>
                            )}
                          </td>
                          <td className="p-3 font-mono text-gray-600">{user.registrationNumber}</td>
                          <td className="p-3 text-center font-bold text-green-600">{user.correctCount}</td>
                          <td className="p-3 text-center font-bold text-red-600">{user.incorrectCount}</td>
                          <td className="p-3 text-right">
                            <span className="font-black text-testyari-blue text-base md:text-lg">
                              {user.totalScore.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                        {expandedRows[user._id] && user.subjects && (
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <td colSpan="6" className="p-4">
                              <div className="bg-white rounded border border-gray-200 p-3 shadow-inner">
                                <h4 className="text-sm font-bold text-gray-700 mb-2">Subject-wise Performance</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                  {Object.entries(user.subjects).map(([subject, stats]) => (
                                    <div key={subject} className="bg-gray-50 p-2 rounded border border-gray-100 text-xs">
                                      <div className="font-bold text-gray-800 mb-1 border-b pb-1">{subject}</div>
                                      <div className="flex justify-between"><span>Attempted:</span> <span className="font-semibold">{stats.attempted}</span></div>
                                      <div className="flex justify-between"><span>Total Mark:</span> <span className="font-semibold text-green-600">{stats.positiveMarks}</span></div>
                                      <div className="flex justify-between"><span>Minus Mark:</span> <span className="font-semibold text-red-600">-{stats.negativeMarks}</span></div>
                                      <div className="flex justify-between mt-1 pt-1 border-t border-gray-200"><span>Net Score:</span> <span className="font-bold text-testyari-blue">{stats.score.toFixed(2)}</span></div>
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
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-gray-500">No submissions found for this exam yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}

      </main>

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
