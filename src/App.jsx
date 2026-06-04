import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HashRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
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
import { InstructionsScreen } from './pages/InstructionsScreen';

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
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);

  const { data: questionsRes, isLoading: questionsLoading, isError: questionsError } = useQuery({
    queryKey: ['questions', examId],
    queryFn: async () => {
      const response = await api.get(`/exam/${examId}/questions`);
      return response.data.data;
    },
    staleTime: Infinity,
  });

  const questionsResRef = React.useRef(questionsRes);
  useEffect(() => {
    questionsResRef.current = questionsRes;
  }, [questionsRes]);

  // Run once on mount to setup base state from local storage
  useEffect(() => {
    dispatch(resetExamState());
    const savedStateStr = localStorage.getItem(`osssc_exam_${examId}`);
    if (savedStateStr) {
      try {
        const savedState = JSON.parse(savedStateStr);
        dispatch(hydrateState(savedState));
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }
  }, [dispatch, examId]);

  // Run whenever questions are fetched
  useEffect(() => {
    if (questionsRes && questionsRes.length > 0) {
      dispatch(setQuestions(questionsRes));
    }
  }, [dispatch, questionsRes]);

  // Run when instructions are accepted
  useEffect(() => {
    const initializeSession = async () => {
      if (!user?._id || !instructionsAccepted) return;
      
      try {
        const sessionRes = await api.post(`/exam/${examId}/session`, {
          userId: user._id
        });
        const session = sessionRes.data.data;
        
        if (sessionRes.data.isNewSession) {
          localStorage.removeItem(`osssc_exam_${examId}`);
          dispatch(resetExamState());
          if (questionsResRef.current && questionsResRef.current.length > 0) {
            dispatch(setQuestions(questionsResRef.current));
          }
        }

        const expiresAtDate = new Date(session.timestamps.expiresAt);
        setTargetEpoch(expiresAtDate.getTime());
      } catch (error) {
        console.error('Failed to initialize session:', error);
      }
    };
    initializeSession();
  }, [examId, user, dispatch, instructionsAccepted]);

  if (!instructionsAccepted) {
    return <InstructionsScreen examId={examId} onAccept={() => setInstructionsAccepted(true)} />;
  }

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
    <HashRouter>
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
    </HashRouter>
  );
}

export default App;
