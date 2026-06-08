import React, { useState } from 'react';

export const QuestionForm = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState(
    initialData || {
      subjectTag: '',
      questionNumber: '',
      weight: 1.0,
      negativeMark: 0.25,
      content: { en: '', or: '' },
      explanation: { en: '', or: '' },
      options: [
        { index: 1, en: '', or: '' },
        { index: 2, en: '', or: '' },
        { index: 3, en: '', or: '' },
        { index: 4, en: '', or: '' }
      ],
      correctOptionIndex: 1
    }
  );

  const handleChange = (e, section, index) => {
    const { name, value } = e.target;
    
    if (section === 'content') {
      setFormData(prev => ({ ...prev, content: { ...prev.content, [name]: value } }));
    } else if (section === 'explanation') {
      setFormData(prev => ({ ...prev, explanation: { ...prev.explanation, [name]: value } }));
    } else if (section === 'options') {
      const newOptions = [...formData.options];
      newOptions[index] = { ...newOptions[index], [name]: value };
      setFormData(prev => ({ ...prev, options: newOptions }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-800">{initialData ? 'Edit Question' : 'New Question'}</h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-800 font-bold text-xl">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Subject Tag</label>
              <input type="text" name="subjectTag" value={formData.subjectTag} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Q. No</label>
              <input type="number" name="questionNumber" value={formData.questionNumber} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Weight</label>
              <input type="number" step="0.1" name="weight" value={formData.weight} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Negative Mark</label>
              <input type="number" step="0.01" name="negativeMark" value={formData.negativeMark} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Question (English)</label>
              <textarea name="en" value={formData.content.en} onChange={(e) => handleChange(e, 'content')} required className="w-full border rounded px-3 py-2 h-24" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Question (Odia)</label>
              <textarea name="or" value={formData.content.or} onChange={(e) => handleChange(e, 'content')} className="w-full border rounded px-3 py-2 h-24" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Explanation (English)</label>
              <textarea name="en" value={formData.explanation?.en || ''} onChange={(e) => handleChange(e, 'explanation')} className="w-full border rounded px-3 py-2 h-20" placeholder="Provide the explanation for the correct answer here..." />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Explanation (Odia)</label>
              <textarea name="or" value={formData.explanation?.or || ''} onChange={(e) => handleChange(e, 'explanation')} className="w-full border rounded px-3 py-2 h-20" placeholder="(Optional) Odia translation of the explanation..." />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-gray-800 border-b pb-2">Options</h3>
            {formData.options.map((opt, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="mt-2 font-bold w-6">{i + 1}.</div>
                <div className="flex-1">
                  <input type="text" name="en" placeholder={`Option ${i+1} (EN)`} value={opt.en} onChange={(e) => handleChange(e, 'options', i)} required className="w-full border rounded px-3 py-2 mb-2" />
                  <input type="text" name="or" placeholder={`Option ${i+1} (OR)`} value={opt.or} onChange={(e) => handleChange(e, 'options', i)} className="w-full border rounded px-3 py-2" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input type="radio" name="correctOptionIndex" value={opt.index} checked={Number(formData.correctOptionIndex) === opt.index} onChange={handleChange} className="w-5 h-5" />
                  <span className="text-sm font-bold text-green-600">Correct</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-4 border-t pt-4 sticky bottom-0 bg-white z-10">
            <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 text-gray-800 font-bold rounded">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-testyari-blue text-white font-bold rounded">Save Question</button>
          </div>
        </form>
      </div>
    </div>
  );
};
