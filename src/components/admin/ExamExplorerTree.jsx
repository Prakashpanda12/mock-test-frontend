import React, { useState } from 'react';

export const ExamExplorerTree = ({ 
  organizations, 
  exams, 
  sections,
  onQuickAddSectionalTopic,
  onQuickAddSectionalSet,
  onRenameSubTopic,
  onAddExam, 
  onEditExam, 
  onDeleteExam, 
  onManageExam
}) => {
  const [expandedNodes, setExpandedNodes] = useState({});
  const [treeTab, setTreeTab] = useState('full'); // 'full' | 'sectional'
  const [quickAddInput, setQuickAddInput] = useState({ section: null, value: '' });
  const [editingTopic, setEditingTopic] = useState({ section: null, oldName: null, value: '' });

  // Combine sections from master data with any unique sections found in the exams
  const allSectionsMap = new Map();
  sections?.forEach(s => {
    allSectionsMap.set(s.name, { _id: s._id, name: s.name, isOrphaned: false });
  });
  exams?.filter(e => e.examCategory === 'SECTIONAL').forEach(e => {
    if (e.sectionName && !allSectionsMap.has(e.sectionName)) {
      allSectionsMap.set(e.sectionName, { _id: `orphaned-${e.sectionName}`, name: e.sectionName, isOrphaned: true });
    }
  });
  const allSections = Array.from(allSectionsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const getExamsForPost = (orgName, recName, postName) => {
    return exams?.filter(e => 
      e.organization === orgName && 
      e.recruitmentType === recName && 
      e.targetPosts === postName &&
      e.examCategory !== 'SECTIONAL' // Only Full Length here
    ) || [];
  };

  const getSectionalExams = (sectionName) => {
    return exams?.filter(e => e.examCategory === 'SECTIONAL' && e.sectionName === sectionName) || [];
  };

  // Groups exams by subSectionName
  const getGroupedTopics = (sectionExams) => {
    const topics = {};
    sectionExams.forEach(exam => {
      const topicName = exam.subSectionName || 'General';
      if (!topics[topicName]) topics[topicName] = [];
      topics[topicName].push(exam);
    });
    return topics;
  };

  const handleQuickAddTopicSubmit = (e, sectionName) => {
    e.preventDefault();
    if (quickAddInput.value.trim() && onQuickAddSectionalTopic) {
      onQuickAddSectionalTopic(sectionName, quickAddInput.value.trim());
      setQuickAddInput({ section: null, value: '' });
    }
  };

  const handleRenameTopicSubmit = (e, sectionName, oldTopicName) => {
    e.preventDefault();
    if (editingTopic.value.trim() && editingTopic.value.trim() !== oldTopicName && onRenameSubTopic) {
      onRenameSubTopic(sectionName, oldTopicName, editingTopic.value.trim());
    }
    setEditingTopic({ section: null, oldName: null, value: '' });
  };

  // Icons
  const ChevronRight = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>;
  const ChevronDown = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>;
  const FolderIcon = () => <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path></svg>;
  const SectionIcon = () => <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path></svg>;
  const TopicIcon = () => <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v2H5V6zm6 5H5v2h6v-2z" clipRule="evenodd"></path></svg>;
  const DocumentIcon = ({ sectional }) => <svg className={`w-5 h-5 ${sectional ? 'text-purple-500' : 'text-emerald-500'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path></svg>;
  const PlusIcon = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>;
  const EditIcon = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>;

  if (!organizations || organizations.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No Master Data found. Please create Organizations in Master Data Config first.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
        <div className="flex gap-4 px-2">
          <button 
            onClick={() => setTreeTab('full')}
            className={`text-sm font-bold pb-1 border-b-2 transition-colors ${treeTab === 'full' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Full Length Exams (By Post)
          </button>
          <button 
            onClick={() => setTreeTab('sectional')}
            className={`text-sm font-bold pb-1 border-b-2 transition-colors ${treeTab === 'sectional' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Sectional Exams (By Subject)
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {treeTab === 'full' && organizations.map(org => {
          const orgId = `org-${org._id}`;
          const isOrgExpanded = expandedNodes[orgId];
          return (
            <div key={org._id} className="text-sm">
              <div 
                className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer group select-none"
                onClick={() => toggleNode(orgId)}
              >
                <div className="text-gray-400 w-5 flex justify-center">{isOrgExpanded ? <ChevronDown /> : <ChevronRight />}</div>
                <FolderIcon />
                <span className="font-bold text-gray-800">{org.name}</span>
              </div>

              {isOrgExpanded && org.recruitments?.map((rec, recIdx) => {
                const recId = `${orgId}-rec-${recIdx}`;
                const isRecExpanded = expandedNodes[recId];
                return (
                  <div key={recIdx} className="ml-6 pl-2 border-l border-gray-200">
                    <div 
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer group select-none"
                      onClick={() => toggleNode(recId)}
                    >
                      <div className="text-gray-400 w-5 flex justify-center">{isRecExpanded ? <ChevronDown /> : <ChevronRight />}</div>
                      <FolderIcon />
                      <span className="font-bold text-gray-700">{rec.name}</span>
                    </div>

                    {isRecExpanded && rec.posts?.map((post, postIdx) => {
                      const postId = `${recId}-post-${postIdx}`;
                      const isPostExpanded = expandedNodes[postId];
                      const postExams = getExamsForPost(org.name, rec.name, post);
                      
                      return (
                        <div key={postIdx} className="ml-6 pl-2 border-l border-gray-200">
                          <div 
                            className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer group select-none"
                            onClick={() => toggleNode(postId)}
                          >
                            <div className="flex items-center gap-2">
                              <div className="text-gray-400 w-5 flex justify-center">{isPostExpanded ? <ChevronDown /> : <ChevronRight />}</div>
                              <FolderIcon />
                              <span className="font-semibold text-gray-700">{post}</span>
                              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded">{postExams.length} exams</span>
                            </div>
                            
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center pr-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); onAddExam(org.name, rec.name, post); }}
                                className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200 font-bold flex items-center gap-1"
                              >
                                <PlusIcon /> Add Exam
                              </button>
                            </div>
                          </div>

                          {isPostExpanded && (
                            <div className="ml-6 pl-2 border-l border-gray-200 py-1 space-y-1">
                              {postExams.length === 0 ? (
                                <div className="text-xs text-gray-400 p-2 italic">No exams configured for this post.</div>
                              ) : (
                                postExams.map(exam => (
                                  <div key={exam._id} className="flex items-center justify-between p-2 hover:bg-blue-50/50 rounded-lg group">
                                    <div className="flex items-center gap-2">
                                      <div className="w-5"></div>
                                      <DocumentIcon sectional={false} />
                                      <span className="font-semibold text-gray-900">{exam.title}</span>
                                      <span className="text-[10px] font-bold text-emerald-700 px-1.5 py-0.5 rounded border bg-emerald-50 border-emerald-200">
                                        {exam.durationMinutes}m • {exam.totalMarks} Marks
                                      </span>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                                      <button onClick={() => onManageExam(exam.examId)} className="text-[11px] bg-blue-600 text-white hover:bg-blue-700 px-2 py-1 rounded font-bold">Manage</button>
                                      <button onClick={() => onEditExam(exam)} className="text-[11px] bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 px-2 py-1 rounded font-bold">Edit</button>
                                      <button onClick={() => onDeleteExam(exam)} className="text-[11px] bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-2 py-1 rounded font-bold">Delete</button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}

        {treeTab === 'sectional' && allSections.map(section => {
          const sectionId = `sec-${section._id}`;
          const isSectionExpanded = expandedNodes[sectionId];
          const sectionExams = getSectionalExams(section.name);
          const groupedTopics = getGroupedTopics(sectionExams);
          const topicKeys = Object.keys(groupedTopics).sort();

          return (
            <div key={section._id} className="text-sm">
              <div 
                className="flex items-center justify-between p-2 hover:bg-purple-50/50 rounded-lg cursor-pointer group select-none"
                onClick={() => toggleNode(sectionId)}
              >
                <div className="flex items-center gap-2">
                  <div className="text-gray-400 w-5 flex justify-center">{isSectionExpanded ? <ChevronDown /> : <ChevronRight />}</div>
                  <SectionIcon />
                  <span className={`font-bold ${section.isOrphaned ? 'text-red-500' : 'text-gray-800'}`}>
                    {section.name} {section.isOrphaned && '(Not in Master Data)'}
                  </span>
                  <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded">{topicKeys.length} sub-topics</span>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center pr-2">
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (!isSectionExpanded) toggleNode(sectionId);
                      setQuickAddInput({ section: section.name, value: '' }); 
                    }}
                    className="text-xs bg-purple-50 text-purple-600 hover:bg-purple-100 px-2 py-1 rounded border border-purple-200 font-bold flex items-center gap-1"
                  >
                    <PlusIcon /> Add Sub Topic
                  </button>
                </div>
              </div>

              {isSectionExpanded && (
                <div className="ml-6 pl-2 border-l border-purple-200 py-1 space-y-1">
                  
                  {/* Topic Level */}
                  {topicKeys.map((topicName, idx) => {
                    const topicId = `${sectionId}-topic-${idx}`;
                    const isTopicExpanded = expandedNodes[topicId];
                    const topicExamsList = groupedTopics[topicName];

                    return (
                      <div key={idx} className="text-sm">
                        {editingTopic.section === section.name && editingTopic.oldName === topicName ? (
                          <form onSubmit={(e) => handleRenameTopicSubmit(e, section.name, topicName)} className="flex items-center justify-between p-2 hover:bg-purple-50/50 rounded-lg cursor-pointer group select-none ml-2">
                            <div className="flex items-center gap-2 w-full">
                              <TopicIcon />
                              <input 
                                type="text"
                                autoFocus
                                value={editingTopic.value}
                                onChange={(e) => setEditingTopic({ ...editingTopic, value: e.target.value })}
                                className="text-sm font-semibold border border-indigo-300 rounded px-2 py-1 w-full max-w-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                              />
                              <button type="submit" className="text-xs bg-indigo-600 text-white px-2 py-1 rounded font-bold">Save</button>
                              <button type="button" onClick={() => setEditingTopic({ section: null, oldName: null, value: '' })} className="text-xs text-gray-500 px-2 py-1 rounded hover:bg-gray-100">Cancel</button>
                            </div>
                          </form>
                        ) : (
                          <div 
                            className="flex items-center justify-between p-2 hover:bg-purple-50/50 rounded-lg cursor-pointer group select-none"
                            onClick={() => toggleNode(topicId)}
                          >
                            <div className="flex items-center gap-2">
                              <div className="text-gray-400 w-5 flex justify-center">{isTopicExpanded ? <ChevronDown /> : <ChevronRight />}</div>
                              <TopicIcon />
                              <span className="font-semibold text-gray-700">{topicName}</span>
                              <span className="bg-purple-50 border border-purple-100 text-purple-600 text-[10px] font-bold px-1.5 py-0.5 rounded">{topicExamsList.length} sets</span>
                            </div>
                            
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center pr-2 gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTopic({ section: section.name, oldName: topicName, value: topicName });
                                }}
                                className="text-xs bg-white text-gray-700 hover:bg-gray-50 px-2 py-1 rounded border border-gray-200 font-bold flex items-center gap-1"
                              >
                                <EditIcon /> Rename
                              </button>
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (!isTopicExpanded) toggleNode(topicId);
                                  if (onQuickAddSectionalSet) onQuickAddSectionalSet(section.name, topicName);
                                }}
                                className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-1 rounded border border-indigo-200 font-bold flex items-center gap-1"
                              >
                                <PlusIcon /> Quick Add Set
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Exam Set Level */}
                        {isTopicExpanded && (
                          <div className="ml-6 pl-2 border-l border-purple-200 py-1 space-y-1">
                            {topicExamsList.map(exam => (
                              <div key={exam._id} className="flex items-center justify-between p-2 hover:bg-purple-50/50 rounded-lg group">
                                <div className="flex items-center gap-2">
                                  <div className="w-5"></div>
                                  <DocumentIcon sectional={true} />
                                  <span className="font-semibold text-gray-900">{exam.title}</span>
                                  <span className="text-[10px] font-bold text-purple-700 px-1.5 py-0.5 rounded border bg-purple-50 border-purple-200">
                                    {exam.durationMinutes}m • {exam.totalMarks} Marks
                                  </span>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                                  <button onClick={() => onManageExam(exam.examId)} className="text-[11px] bg-blue-600 text-white hover:bg-blue-700 px-2 py-1 rounded font-bold">Manage</button>
                                  <button onClick={() => onEditExam(exam)} className="text-[11px] bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 px-2 py-1 rounded font-bold">Edit</button>
                                  <button onClick={() => onDeleteExam(exam)} className="text-[11px] bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-2 py-1 rounded font-bold">Delete</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {quickAddInput.section === section.name && (
                    <form onSubmit={(e) => handleQuickAddTopicSubmit(e, section.name)} className="flex items-center gap-2 p-2 ml-7">
                      <TopicIcon />
                      <input 
                        type="text"
                        autoFocus
                        value={quickAddInput.value}
                        onChange={(e) => setQuickAddInput({ ...quickAddInput, value: e.target.value })}
                        placeholder="Enter sub topic name and press Enter..."
                        className="text-sm border border-purple-300 rounded px-2 py-1 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                        onBlur={() => {
                          if (!quickAddInput.value.trim()) setQuickAddInput({ section: null, value: '' });
                        }}
                      />
                      <button type="submit" className="text-xs bg-purple-600 text-white px-2 py-1 rounded font-bold">Save</button>
                      <button type="button" onClick={() => setQuickAddInput({ section: null, value: '' })} className="text-xs text-gray-500 px-2 py-1 rounded hover:bg-gray-100">Cancel</button>
                    </form>
                  )}

                  {topicKeys.length === 0 && quickAddInput.section !== section.name && (
                    <div className="text-xs text-gray-400 p-2 italic ml-7">No sub topics yet. Click "Add Sub Topic" to create one.</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
