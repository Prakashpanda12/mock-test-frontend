import { createSlice } from '@reduxjs/toolkit';

// States based on OSSSC guidelines
export const PALETTE_STATES = {
  NOT_VISITED: 'NOT_VISITED', // bg-gray-200
  NOT_ANSWERED: 'NOT_ANSWERED', // bg-red-500
  ANSWERED: 'ANSWERED', // bg-green-600
  MARKED_FOR_REVIEW: 'MARKED_FOR_REVIEW', // bg-purple-600
  ANSWERED_AND_MARKED: 'ANSWERED_AND_MARKED', // included in final scoring
};

const initialState = {
  candidateId: 'candidate_prakash_09', // Mock ID for now
  examId: 'osssc_nursing_2026',
  language: 'en', // 'en' or 'or'
  currentQuestionIndex: 0,
  questions: [], // Loaded from backend
  responses: {}, // Mapping of questionId -> { selectedOption: number|null, status: string }
  isSubmitting: false,
};

const examSlice = createSlice({
  name: 'exam',
  initialState,
  reducers: {
    setQuestions: (state, action) => {
      state.questions = action.payload;
      // Initialize responses for each question if not already in local storage
      action.payload.forEach(q => {
        if (!state.responses[q._id]) {
          state.responses[q._id] = {
            selectedOption: null,
            status: PALETTE_STATES.NOT_VISITED,
          };
        }
      });
    },
    setCurrentQuestionIndex: (state, action) => {
      const newIndex = action.payload;
      if (newIndex >= 0 && newIndex < state.questions.length) {
        state.currentQuestionIndex = newIndex;
        const qId = state.questions[newIndex]._id;
        
        // If not visited, mark as not answered (meaning viewed but no answer yet)
        if (state.responses[qId].status === PALETTE_STATES.NOT_VISITED) {
          state.responses[qId].status = PALETTE_STATES.NOT_ANSWERED;
        }
      }
    },
    setLanguage: (state, action) => {
      state.language = action.payload;
    },
    selectOption: (state, action) => {
      const { questionId, optionIndex } = action.payload;
      if (state.responses[questionId]) {
        state.responses[questionId].selectedOption = optionIndex;
      }
    },
    saveAndNext: (state) => {
      const qId = state.questions[state.currentQuestionIndex]._id;
      const currentResponse = state.responses[qId];
      
      if (currentResponse.selectedOption !== null) {
        currentResponse.status = PALETTE_STATES.ANSWERED;
      } else {
        currentResponse.status = PALETTE_STATES.NOT_ANSWERED;
      }
      
      if (state.currentQuestionIndex < state.questions.length - 1) {
        state.currentQuestionIndex += 1;
        
        const nextQId = state.questions[state.currentQuestionIndex]._id;
        if (state.responses[nextQId].status === PALETTE_STATES.NOT_VISITED) {
          state.responses[nextQId].status = PALETTE_STATES.NOT_ANSWERED;
        }
      }
    },
    markForReviewAndNext: (state) => {
      const qId = state.questions[state.currentQuestionIndex]._id;
      const currentResponse = state.responses[qId];
      
      if (currentResponse.selectedOption !== null) {
        currentResponse.status = PALETTE_STATES.ANSWERED_AND_MARKED;
      } else {
        currentResponse.status = PALETTE_STATES.MARKED_FOR_REVIEW;
      }
      
      if (state.currentQuestionIndex < state.questions.length - 1) {
        state.currentQuestionIndex += 1;
        
        const nextQId = state.questions[state.currentQuestionIndex]._id;
        if (state.responses[nextQId].status === PALETTE_STATES.NOT_VISITED) {
          state.responses[nextQId].status = PALETTE_STATES.NOT_ANSWERED;
        }
      }
    },
    clearResponse: (state) => {
      const qId = state.questions[state.currentQuestionIndex]._id;
      state.responses[qId] = {
        selectedOption: null,
        status: PALETTE_STATES.NOT_ANSWERED,
      };
    },
    // Hydrate state from localStorage safely
    hydrateState: (state, action) => {
      if (action.payload.responses) {
        state.responses = action.payload.responses;
      }
      if (action.payload.currentQuestionIndex !== undefined) {
        state.currentQuestionIndex = action.payload.currentQuestionIndex;
      }
      if (action.payload.language) {
        state.language = action.payload.language;
      }
      // Explicitly DO NOT hydrate isSubmitting
    },
    setSubmitting: (state, action) => {
      state.isSubmitting = action.payload;
    },
    resetExamState: (state) => {
      state.responses = {};
      state.currentQuestionIndex = 0;
      state.isSubmitting = false;
    }
  },
});

export const {
  setQuestions,
  setCurrentQuestionIndex,
  setLanguage,
  selectOption,
  saveAndNext,
  markForReviewAndNext,
  clearResponse,
  hydrateState,
  setSubmitting,
  resetExamState
} = examSlice.actions;

export default examSlice.reducer;
