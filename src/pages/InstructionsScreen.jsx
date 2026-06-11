import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

export const InstructionsScreen = ({ examId, onAccept }) => {
  const navigate = useNavigate();
  const [isChecked, setIsChecked] = useState(false);

  const { data: examMeta, isLoading, isError } = useQuery({
    queryKey: ['exam_meta', examId],
    queryFn: async () => {
      const res = await api.get(`/exam/${examId}/meta`);
      return res.data.data;
    },
    staleTime: Infinity
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-testyari-blue border-t-transparent"></div>
      </div>
    );
  }

  if (isError || !examMeta) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Exam Details</h2>
        <button 
          onClick={() => navigate('/dashboard')}
          className="bg-testyari-blue text-white px-6 py-2 rounded shadow hover:bg-blue-800 transition"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="bg-testyari-blue px-6 py-6 text-white text-center">
          <h1 className="text-2xl font-bold uppercase tracking-wide">{examMeta.title}</h1>
          <p className="mt-2 text-blue-100 font-medium">Please read the following instructions carefully before starting the exam.</p>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 text-gray-800">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
            <div>
              <p className="text-xs text-blue-800 font-bold uppercase">Duration</p>
              <p className="text-lg font-black text-testyari-blue">{examMeta.durationMinutes} Min</p>
            </div>
            <div>
              <p className="text-xs text-blue-800 font-bold uppercase">Questions</p>
              <p className="text-lg font-black text-testyari-blue">{examMeta.totalQuestions}</p>
            </div>
            <div>
              <p className="text-xs text-blue-800 font-bold uppercase">Total Marks</p>
              <p className="text-lg font-black text-testyari-blue">{examMeta.totalMarks}</p>
            </div>
            <div>
              <p className="text-xs text-blue-800 font-bold uppercase">Negative Marking</p>
              <p className="text-lg font-black text-red-600">-{examMeta.negativeMarking}</p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <h3 className="text-lg font-bold border-b pb-2">General Instructions:</h3>
            <ul className="list-decimal list-inside space-y-2 text-sm md:text-base text-gray-700">
              <li>The clock will be set at the server. The countdown timer at the top right corner of screen will display the remaining time available for you to complete the examination.</li>
              <li>When the timer reaches zero, the examination will end by itself. You will not be required to end or submit your examination.</li>
              <li>The Question Palette displayed on the right side of screen will show the status of each question using one of the following symbols:
                <ul className="list-none pl-6 mt-2 space-y-2">
                  <li className="flex items-center gap-2"><span className="w-6 h-6 inline-flex items-center justify-center bg-gray-200 text-gray-700 text-xs font-bold rounded">1</span> You have not visited the question yet.</li>
                  <li className="flex items-center gap-2"><span className="w-6 h-6 inline-flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded">2</span> You have not answered the question.</li>
                  <li className="flex items-center gap-2"><span className="w-6 h-6 inline-flex items-center justify-center bg-green-600 text-white text-xs font-bold rounded">3</span> You have answered the question.</li>
                  <li className="flex items-center gap-2"><span className="w-6 h-6 inline-flex items-center justify-center bg-purple-600 text-white text-xs font-bold rounded">4</span> You have NOT answered the question, but have marked the question for review.</li>
                  <li className="flex items-center gap-2"><span className="w-6 h-6 inline-flex items-center justify-center bg-blue-600 text-white text-xs font-bold rounded">5</span> The question(s) "Answered and Marked for Review" will be considered for evaluation.</li>
                </ul>
              </li>
              <li>You can click on the "&gt;" arrow which appears to the left of question palette to collapse the question palette thereby maximizing the question window.</li>
            </ul>

            <h3 className="text-lg font-bold border-b pb-2 mt-6">Navigating and Answering:</h3>
            <ul className="list-decimal list-inside space-y-2 text-sm md:text-base text-gray-700">
              <li>To select your answer, click on the button of one of the options.</li>
              <li>To deselect your chosen answer, click on the button of the chosen option again or click on the <b>Clear</b> button.</li>
              <li>To change your chosen answer, click on the button of another option.</li>
              <li>To save your answer, you MUST click on the <b>Save & Next</b> button.</li>
              <li>To mark the question for review, click on the <b>Mark & Next</b> button.</li>
            </ul>
          </div>

          {/* Declaration */}
          <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="mt-1 w-5 h-5 text-testyari-blue accent-testyari-blue rounded"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
              />
              <span className="text-sm text-gray-800 font-medium">
                I have read and understood the instructions. All computer hardware allotted to me are in proper working condition. I declare that I am not in possession of / not wearing / not carrying any prohibited gadget like mobile phone, bluetooth devices  etc. /any prohibited material with me into the Examination Hall. I agree that in case of not adhering to the instructions, I shall be liable to be debarred from this Test and/or to disciplinary action, which may include ban from future Tests / Examinations.
              </span>
            </label>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-gray-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-200">
          <button 
            onClick={() => navigate('/dashboard')}
            className="text-gray-600 font-bold hover:text-gray-900 transition w-full sm:w-auto text-center"
          >
            Cancel
          </button>
          <button 
            onClick={onAccept}
            disabled={!isChecked}
            className={`px-8 py-3 rounded-full font-bold shadow transition w-full sm:w-auto text-center ${isChecked ? 'bg-testyari-blue text-white hover:bg-blue-800' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
          >
            I Am Ready To Begin
          </button>
        </div>

      </div>
    </div>
  );
};
