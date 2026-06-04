import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ViewportLayout } from './components/ViewportLayout';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { setQuestions, hydrateState, resetExamState } from './store/examSlice';
import api from './api/axiosConfig';

import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminExamDetail } from './pages/admin/AdminExamDetail';
import { ResultScreen } from './pages/ResultScreen';
import { ReviewScreen } from './pages/ReviewScreen';

// Candidate Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user } = useSelector(state => state.auth);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return children;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useSelector(state => state.auth);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

// Exam Client Component
const ExamClient = () => {
  const { examId } = useParams();
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  
  const [targetEpoch, setTargetEpoch] = useState(null);

  const { data: questionsRes, isLoading: questionsLoading, isError: questionsError } = useQuery({
    queryKey: ['questions', examId],
    queryFn: async () => {
      const response = await api.get(`/exam/${examId}/questions`);
      return response.data.data;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    const initializeSession = async () => {
      if (!user?._id) return;
      
      // Clear any previous exam state (like isSubmitting = true)
      dispatch(resetExamState());
      
      try {
        const sessionRes = await api.post(`/exam/${examId}/session`, {
          userId: user._id
        });
        const session = sessionRes.data.data;
        
        // If this is a completely new session (e.g. a Retake), nuke the local storage
        // to prevent ghost answers from the previous attempt from loading.
        if (sessionRes.data.isNewSession) {
          localStorage.removeItem(`osssc_exam_${examId}`);
          dispatch(resetExamState()); // Re-reset in case hydrateState sneaked in
        }

        const expiresAtDate = new Date(session.timestamps.expiresAt);
        setTargetEpoch(expiresAtDate.getTime());
      } catch (error) {
        console.error('Failed to initialize session:', error);
      }
    };
    initializeSession();
  }, [examId, user, dispatch]);

  useEffect(() => {
    const savedStateStr = localStorage.getItem(`osssc_exam_${examId}`);
    if (savedStateStr) {
      try {
        const savedState = JSON.parse(savedStateStr);
        dispatch(hydrateState(savedState));
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }
    
    if (questionsRes && questionsRes.length > 0) {
      dispatch(setQuestions(questionsRes));
    }
  }, [dispatch, examId, questionsRes]);

  if (questionsLoading || !targetEpoch) {
    return <div className="flex items-center justify-center h-screen bg-gray-50 text-osssc-blue font-semibold text-lg">Initializing Secure Exam Session...</div>;
  }

  if (questionsError) {
    return <div className="flex items-center justify-center h-screen bg-gray-50 text-red-600 font-semibold text-lg">Failed to load exam data. Please contact support.</div>;
  }

  if (questionsRes && questionsRes.length === 0) {
    return <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-gray-700">
      <h2 className="text-xl font-bold mb-2">No Questions Found</h2>
      <p>The administrator has not uploaded any questions for this exam yet.</p>
    </div>;
  }

  return (
    <div className="App overflow-hidden">
      <ViewportLayout targetEpoch={targetEpoch} />
    </div>
  );
};

// Route Decider for root path
const RootRoute = () => {
  const { isAuthenticated, user } = useSelector(state => state.auth);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
};

// Main App Routing
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route 
          path="/admin/dashboard" 
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/exam/:examId" 
          element={
            <AdminRoute>
              <AdminExamDetail />
            </AdminRoute>
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/exam/:examId" 
          element={
            <ProtectedRoute>
              <ExamClient />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/exam/:examId/result" 
          element={
            <ProtectedRoute>
              <ResultScreen />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/exam/:examId/review" 
          element={
            <ProtectedRoute>
              <ReviewScreen />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
