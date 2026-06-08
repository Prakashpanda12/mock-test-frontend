import { configureStore } from '@reduxjs/toolkit';
import examReducer from './examSlice';
import authReducer from './authSlice';

// LocalStorage Middleware for State Persistence
const localStorageMiddleware = store => next => action => {
  const result = next(action);
  
  // Persist responses and current index to localStorage on relevant actions
  if (action.type.startsWith('exam/')) {
    const state = store.getState().exam;
    
    // Do not persist if the exam is currently submitting or submitted
    if (state.isSubmitting) {
      return result;
    }

    // Debounce or selectively save
    const persistData = {
      responses: state.responses,
      currentQuestionIndex: state.currentQuestionIndex,
      language: state.language
    };
    localStorage.setItem(`testyari_exam_${state.examId}`, JSON.stringify(persistData));
  }
  
  return result;
};

export const store = configureStore({
  reducer: {
    exam: examReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware().concat(localStorageMiddleware),
});
