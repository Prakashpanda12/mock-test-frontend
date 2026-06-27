import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosConfig';

export const MasterDataTab = ({ setModalState }) => {
  const queryClient = useQueryClient();
  const [innerTab, setInnerTab] = useState('organizations'); // 'organizations' | 'sections'

  // --- Organizations State ---
  const [newOrgName, setNewOrgName] = useState('');
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [newRecruitmentName, setNewRecruitmentName] = useState('');
  const [activeRecruitmentIndex, setActiveRecruitmentIndex] = useState(null);
  const [newPostName, setNewPostName] = useState('');
  const [editOrgId, setEditOrgId] = useState(null);
  const [editOrgName, setEditOrgName] = useState('');
  const [editRec, setEditRec] = useState({ orgId: null, recIdx: null, name: '' });
  const [editPost, setEditPost] = useState({ orgId: null, recIdx: null, postIdx: null, name: '' });

  // --- Sections State ---
  const [newSectionName, setNewSectionName] = useState('');
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [editSectionId, setEditSectionId] = useState(null);
  const [editSectionName, setEditSectionName] = useState('');
  const [editTopic, setEditTopic] = useState({ sectionId: null, topicIdx: null, name: '' });

  // --- Queries ---
  const { data: organizations, isLoading: isLoadingOrgs } = useQuery({
    queryKey: ['admin_organizations'],
    queryFn: async () => {
      const res = await api.get('/admin/organizations');
      return res.data.data;
    }
  });

  const { data: sections, isLoading: isLoadingSections } = useQuery({
    queryKey: ['admin_sections'],
    queryFn: async () => {
      const res = await api.get('/admin/sections');
      return res.data.data;
    }
  });

  // --- Organization Mutations ---
  const createOrgMutation = useMutation({
    mutationFn: async (name) => {
      const res = await api.post('/admin/organizations', { name });
      return res.data;
    },
    onSuccess: () => {
      setNewOrgName('');
      queryClient.invalidateQueries(['admin_organizations']);
    },
    onError: (err) => {
      setModalState({
        isOpen: true,
        type: 'alert',
        title: 'Error',
        message: err.response?.data?.message || 'Could not create organization.',
        onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false }))
      });
    }
  });

  const updateOrgMutation = useMutation({
    mutationFn: async ({ id, name, recruitments }) => {
      const payload = {};
      if (name !== undefined) payload.name = name;
      if (recruitments !== undefined) payload.recruitments = recruitments;
      const res = await api.put(`/admin/organizations/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin_organizations']);
      setActiveOrgId(null);
      setActiveRecruitmentIndex(null);
      setNewRecruitmentName('');
      setNewPostName('');
      setEditOrgId(null);
      setEditRec({ orgId: null, recIdx: null, name: '' });
      setEditPost({ orgId: null, recIdx: null, postIdx: null, name: '' });
    },
    onError: (err) => {
      setModalState({
        isOpen: true,
        type: 'alert',
        title: 'Error',
        message: err.response?.data?.message || 'Could not update organization.',
        onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false }))
      });
    }
  });

  const deleteOrgMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/admin/organizations/${id}`);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries(['admin_organizations'])
  });

  // --- Section Mutations ---
  const createSectionMutation = useMutation({
    mutationFn: async (name) => {
      const res = await api.post('/admin/sections', { name });
      return res.data;
    },
    onSuccess: () => {
      setNewSectionName('');
      queryClient.invalidateQueries(['admin_sections']);
    },
    onError: (err) => {
      setModalState({
        isOpen: true,
        type: 'alert',
        title: 'Error',
        message: err.response?.data?.message || 'Could not create section.',
        onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false }))
      });
    }
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, name, topics }) => {
      const payload = {};
      if (name !== undefined) payload.name = name;
      if (topics !== undefined) payload.topics = topics;
      const res = await api.put(`/admin/sections/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin_sections']);
      setActiveSectionId(null);
      setNewTopicName('');
      setEditSectionId(null);
      setEditTopic({ sectionId: null, topicIdx: null, name: '' });
    },
    onError: (err) => {
      setModalState({
        isOpen: true,
        type: 'alert',
        title: 'Error',
        message: err.response?.data?.message || 'Could not update section.',
        onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false }))
      });
    }
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/admin/sections/${id}`);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries(['admin_sections'])
  });

  // --- Handlers (Organizations) ---
  const handleAddOrg = (e) => { e.preventDefault(); if (newOrgName.trim()) createOrgMutation.mutate(newOrgName.trim()); };
  const handleAddRecruitment = (org) => {
    if (!newRecruitmentName.trim()) return;
    const updatedRecruitments = [...org.recruitments, { name: newRecruitmentName.trim(), posts: [] }];
    updateOrgMutation.mutate({ id: org._id, recruitments: updatedRecruitments });
  };
  const handleAddPost = (org, recIndex) => {
    if (!newPostName.trim()) return;
    const postsList = newPostName.split(',').map(p => p.trim()).filter(p => p);
    const updatedRecruitments = [...org.recruitments];
    const existingPosts = updatedRecruitments[recIndex].posts || [];
    updatedRecruitments[recIndex].posts = [...new Set([...existingPosts, ...postsList])];
    updateOrgMutation.mutate({ id: org._id, recruitments: updatedRecruitments });
  };
  const handleDeleteRecruitment = (org, recIndex) => {
    setModalState({
      isOpen: true, type: 'danger', title: 'Delete Recruitment', message: 'Are you sure you want to delete this recruitment category?',
      onConfirm: () => {
        setModalState(prev => ({ ...prev, isOpen: false }));
        const updatedRecruitments = org.recruitments.filter((_, idx) => idx !== recIndex);
        updateOrgMutation.mutate({ id: org._id, recruitments: updatedRecruitments });
      }
    });
  };
  const handleDeletePost = (org, recIndex, postIndex) => {
    setModalState({
      isOpen: true, type: 'danger', title: 'Delete Post', message: `Are you sure you want to delete this post?`,
      onConfirm: () => {
        setModalState(prev => ({ ...prev, isOpen: false }));
        const updatedRecruitments = [...org.recruitments];
        updatedRecruitments[recIndex].posts = updatedRecruitments[recIndex].posts.filter((_, idx) => idx !== postIndex);
        updateOrgMutation.mutate({ id: org._id, recruitments: updatedRecruitments });
      }
    });
  };
  const handleEditOrgSubmit = (org) => {
    if (!editOrgName.trim() || editOrgName.trim() === org.name) return setEditOrgId(null);
    updateOrgMutation.mutate({ id: org._id, name: editOrgName.trim() });
  };
  const handleEditRecSubmit = (org, recIndex) => {
    if (!editRec.name.trim() || editRec.name.trim() === org.recruitments[recIndex].name) return setEditRec({ orgId: null, recIdx: null, name: '' });
    const updatedRecruitments = [...org.recruitments];
    updatedRecruitments[recIndex].name = editRec.name.trim();
    updateOrgMutation.mutate({ id: org._id, recruitments: updatedRecruitments });
  };
  const handleEditPostSubmit = (org, recIndex, postIndex) => {
    if (!editPost.name.trim() || editPost.name.trim() === org.recruitments[recIndex].posts[postIndex]) return setEditPost({ orgId: null, recIdx: null, postIdx: null, name: '' });
    const updatedRecruitments = [...org.recruitments];
    updatedRecruitments[recIndex].posts[postIndex] = editPost.name.trim();
    updateOrgMutation.mutate({ id: org._id, recruitments: updatedRecruitments });
  };

  // --- Handlers (Sections) ---
  const handleAddSection = (e) => { e.preventDefault(); if (newSectionName.trim()) createSectionMutation.mutate(newSectionName.trim()); };
  const handleAddTopic = (section) => {
    if (!newTopicName.trim()) return;
    const topicsList = newTopicName.split(',').map(p => p.trim()).filter(p => p);
    const updatedTopics = [...section.topics];
    topicsList.forEach(name => {
      if (!updatedTopics.some(t => t.name.toLowerCase() === name.toLowerCase())) {
        updatedTopics.push({ name });
      }
    });
    updateSectionMutation.mutate({ id: section._id, topics: updatedTopics });
  };
  const handleDeleteTopic = (section, topicIndex) => {
    setModalState({
      isOpen: true, type: 'danger', title: 'Delete Topic', message: 'Are you sure you want to delete this topic?',
      onConfirm: () => {
        setModalState(prev => ({ ...prev, isOpen: false }));
        const updatedTopics = section.topics.filter((_, idx) => idx !== topicIndex);
        updateSectionMutation.mutate({ id: section._id, topics: updatedTopics });
      }
    });
  };
  const handleEditSectionSubmit = (section) => {
    if (!editSectionName.trim() || editSectionName.trim() === section.name) return setEditSectionId(null);
    updateSectionMutation.mutate({ id: section._id, name: editSectionName.trim() });
  };
  const handleEditTopicSubmit = (section, topicIndex) => {
    if (!editTopic.name.trim() || editTopic.name.trim() === section.topics[topicIndex].name) return setEditTopic({ sectionId: null, topicIdx: null, name: '' });
    const updatedTopics = [...section.topics];
    updatedTopics[topicIndex].name = editTopic.name.trim();
    updateSectionMutation.mutate({ id: section._id, topics: updatedTopics });
  };

  if (isLoadingOrgs || isLoadingSections) return <div className="p-8 text-center text-gray-500 font-bold">Loading Master Data...</div>;

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
      <div className="bg-gray-50 border-b flex flex-col md:flex-row justify-between items-start md:items-center px-6 pt-4 pb-0">
        <div className="mb-4 md:mb-0">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-gray-800">Master Data Configuration</h3>
            <button 
              onClick={async () => {
                setModalState({
                  isOpen: true,
                  type: 'alert',
                  title: 'Data Synced',
                  message: 'This feature is currently available by directly editing the exams in the Exam Master List.',
                  onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false }))
                });
              }}
              className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded font-bold transition-colors"
              title="Click here if Exam names are out of sync"
            >
              Force Sync
            </button>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Master Data Management</h2>
          <p className="text-sm text-gray-500">Configure global entities used throughout the application.</p>
        </div>
        
        {/* Inner Tabs Navigation */}
        <div className="flex gap-4 min-w-max self-end">
          <button 
            className={`pb-3 font-bold px-4 border-b-2 transition-colors text-sm md:text-base ${innerTab === 'organizations' ? 'border-testyari-blue text-testyari-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setInnerTab('organizations')}
          >
            Organizations & Recruitments
          </button>
          <button 
            className={`pb-3 font-bold px-4 border-b-2 transition-colors text-sm md:text-base ${innerTab === 'sections' ? 'border-testyari-blue text-testyari-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setInnerTab('sections')}
          >
            Exam Sections & Topics
          </button>
        </div>
      </div>

      <div className="p-6 overflow-y-auto">
        {innerTab === 'organizations' && (
          <div>
            {/* Add Organization Form */}
            <form onSubmit={handleAddOrg} className="mb-8 bg-gray-50 p-4 rounded border border-gray-200 flex flex-col sm:flex-row gap-3 items-end shadow-sm">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-gray-700 mb-1">Add New Organization</label>
                <input type="text" value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} placeholder="e.g. SSC, RRB" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-testyari-blue" />
              </div>
              <button type="submit" disabled={createOrgMutation.isPending || !newOrgName.trim()} className="w-full sm:w-auto bg-testyari-blue hover:bg-blue-800 text-white font-bold py-2 px-6 rounded text-sm disabled:opacity-50 transition-colors shadow">
                + Add Organization
              </button>
            </form>

            {/* List of Organizations */}
            <div className="space-y-6">
              {organizations?.map(org => (
                <div key={org._id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-white px-5 py-3.5 border-b border-gray-200 flex justify-between items-center">
                    {editOrgId === org._id ? (
                      <div className="flex gap-2 items-center w-full max-w-md">
                        <input 
                          type="text" autoFocus value={editOrgName} onChange={(e) => setEditOrgName(e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-testyari-blue shadow-inner"
                          onKeyDown={(e) => { if (e.key === 'Enter') handleEditOrgSubmit(org); else if (e.key === 'Escape') setEditOrgId(null); }}
                        />
                        <button onClick={() => handleEditOrgSubmit(org)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-bold shadow">Save</button>
                        <button onClick={() => setEditOrgId(null)} className="text-gray-500 hover:text-gray-700 text-xs font-bold px-2 py-1.5 hover:bg-gray-100 rounded">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-gray-800 text-lg">{org.name}</h3>
                        <button onClick={() => { setEditOrgId(org._id); setEditOrgName(org.name); }} className="text-gray-400 hover:text-testyari-blue p-1 rounded-full hover:bg-blue-50 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                      </div>
                    )}
                    
                    <button 
                      onClick={() => {
                        setModalState({ isOpen: true, type: 'danger', title: 'Delete Organization', message: `Are you sure you want to delete ${org.name}?`, onConfirm: () => { setModalState(prev => ({...prev, isOpen: false})); deleteOrgMutation.mutate(org._id); } });
                      }}
                      className="text-red-500 hover:text-red-700 text-xs font-bold ml-4 flex items-center gap-1 p-1.5 hover:bg-red-50 rounded transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      Delete
                    </button>
                  </div>
                  
                  <div className="p-5 bg-gray-50/50">
                    {org.recruitments && org.recruitments.length > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {org.recruitments.map((rec, recIdx) => (
                          <div key={recIdx} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:border-blue-200 transition-colors">
                            <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-2">
                              {editRec.orgId === org._id && editRec.recIdx === recIdx ? (
                                <div className="flex gap-2 items-center w-full mr-2">
                                  <input 
                                    type="text" autoFocus value={editRec.name} onChange={(e) => setEditRec({...editRec, name: e.target.value})}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-testyari-blue"
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleEditRecSubmit(org, recIdx); else if (e.key === 'Escape') setEditRec({orgId:null}); }}
                                  />
                                  <button onClick={() => handleEditRecSubmit(org, recIdx)} className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-[10px] font-bold shadow-sm">Save</button>
                                  <button onClick={() => setEditRec({orgId:null})} className="text-gray-500 hover:bg-gray-100 text-[10px] font-bold px-2 py-1 rounded">Cancel</button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 group">
                                  <h4 className="font-bold text-testyari-blue text-sm">{rec.name}</h4>
                                  <button onClick={() => setEditRec({orgId: org._id, recIdx, name: rec.name})} className="text-gray-300 hover:text-testyari-blue opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                  </button>
                                </div>
                              )}
                              <button onClick={() => handleDeleteRecruitment(org, recIdx)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors" title="Delete Recruitment">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                              </button>
                            </div>
                            
                            {/* Posts */}
                            <div className="flex flex-wrap gap-2 mb-4">
                              {rec.posts && rec.posts.map((post, pIdx) => {
                                if (editPost.orgId === org._id && editPost.recIdx === recIdx && editPost.postIdx === pIdx) {
                                  return (
                                    <div key={pIdx} className="flex items-center gap-1 bg-white border border-blue-300 rounded px-2 py-1 shadow-inner">
                                      <input 
                                        type="text" autoFocus value={editPost.name} onChange={(e) => setEditPost({...editPost, name: e.target.value})}
                                        className="w-24 px-1 text-xs focus:outline-none"
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleEditPostSubmit(org, recIdx, pIdx); else if (e.key === 'Escape') setEditPost({orgId:null}); }}
                                      />
                                      <button onClick={() => handleEditPostSubmit(org, recIdx, pIdx)} className="text-green-600 hover:text-green-700 p-0.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg></button>
                                      <button onClick={() => setEditPost({orgId:null})} className="text-gray-400 hover:text-gray-600 p-0.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                                    </div>
                                  );
                                }
                                return (
                                  <span key={pIdx} className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-md border border-blue-100 flex items-center gap-1 group">
                                    <span className="cursor-pointer" onDoubleClick={() => setEditPost({orgId: org._id, recIdx, postIdx: pIdx, name: post})}>{post}</span>
                                    <button onClick={() => setEditPost({orgId: org._id, recIdx, postIdx: pIdx, name: post})} className="text-blue-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                    </button>
                                    <button onClick={() => handleDeletePost(org, recIdx, pIdx)} className="text-blue-300 hover:text-red-500 ml-0.5 transition-colors">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                  </span>
                                );
                              })}
                              {(!rec.posts || rec.posts.length === 0) && <span className="text-xs text-gray-400 italic py-1">No posts added</span>}
                            </div>

                            {/* Add Post Input */}
                            {activeOrgId === org._id && activeRecruitmentIndex === recIdx ? (
                              <div className="flex gap-2">
                                <input 
                                  type="text" autoFocus value={newPostName} onChange={(e) => setNewPostName(e.target.value)} 
                                  placeholder="Add post (comma separated)" 
                                  className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-testyari-blue"
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddPost(org, recIdx); }}
                                />
                                <button onClick={() => handleAddPost(org, recIdx)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm">Add</button>
                                <button onClick={() => {setActiveOrgId(null); setActiveRecruitmentIndex(null);}} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded text-xs font-bold transition-colors">Cancel</button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => { setActiveOrgId(org._id); setActiveRecruitmentIndex(recIdx); setNewPostName(''); }}
                                className="text-xs text-testyari-blue hover:text-blue-800 hover:underline font-bold flex items-center gap-1"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                                Add Posts
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic mb-4 text-center py-4 bg-white border border-dashed rounded-lg">No recruitment categories found for this organization.</p>
                    )}

                    {/* Add Recruitment Input */}
                    <div className="mt-5">
                      {activeOrgId === org._id && activeRecruitmentIndex === null ? (
                        <div className="flex gap-2 max-w-md bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                          <input 
                            type="text" autoFocus value={newRecruitmentName} onChange={(e) => setNewRecruitmentName(e.target.value)} 
                            placeholder="Recruitment Category Name (e.g. CGL)" 
                            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-testyari-blue"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddRecruitment(org); }}
                          />
                          <button onClick={() => handleAddRecruitment(org)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded text-sm font-bold shadow-sm">Add</button>
                          <button onClick={() => setActiveOrgId(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-1.5 rounded text-sm font-bold transition-colors">Cancel</button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setActiveOrgId(org._id); setActiveRecruitmentIndex(null); setNewRecruitmentName(''); }}
                          className="text-sm bg-white border border-gray-300 hover:border-testyari-blue hover:text-testyari-blue text-gray-700 font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                          Add Recruitment Category
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {organizations?.length === 0 && (
                <div className="text-center p-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                  <p className="font-semibold text-lg text-gray-600">No Organizations Defined</p>
                  <p className="text-sm mt-1">Start by adding an Organization above.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {innerTab === 'sections' && (
          <div>
            {/* Add Section Form */}
            <form onSubmit={handleAddSection} className="mb-8 bg-purple-50 p-4 rounded border border-purple-100 flex flex-col sm:flex-row gap-3 items-end shadow-sm">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-purple-900 mb-1">Add New Section</label>
                <input type="text" value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} placeholder="e.g. Mathematics, General Science" className="w-full border border-purple-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
              </div>
              <button type="submit" disabled={createSectionMutation.isPending || !newSectionName.trim()} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded text-sm disabled:opacity-50 transition-colors shadow">
                + Add Section
              </button>
            </form>

            {/* List of Sections */}
            <div className="space-y-6">
              {sections?.map(section => (
                <div key={section._id} className="border border-purple-100 rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-white px-5 py-3.5 border-b border-purple-100 flex justify-between items-center">
                    {editSectionId === section._id ? (
                      <div className="flex gap-2 items-center w-full max-w-md">
                        <input 
                          type="text" autoFocus value={editSectionName} onChange={(e) => setEditSectionName(e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-purple-300 rounded text-sm focus:outline-none focus:border-purple-500 shadow-inner"
                          onKeyDown={(e) => { if (e.key === 'Enter') handleEditSectionSubmit(section); else if (e.key === 'Escape') setEditSectionId(null); }}
                        />
                        <button onClick={() => handleEditSectionSubmit(section)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-bold shadow">Save</button>
                        <button onClick={() => setEditSectionId(null)} className="text-gray-500 hover:text-gray-700 text-xs font-bold px-2 py-1.5 hover:bg-gray-100 rounded">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="bg-purple-100 text-purple-700 p-1.5 rounded-md">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        </div>
                        <h3 className="font-bold text-gray-800 text-lg">{section.name}</h3>
                        <button onClick={() => { setEditSectionId(section._id); setEditSectionName(section.name); }} className="text-gray-400 hover:text-purple-600 p-1 rounded-full hover:bg-purple-50 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                      </div>
                    )}
                    
                    <button 
                      onClick={() => {
                        setModalState({ isOpen: true, type: 'danger', title: 'Delete Section', message: `Are you sure you want to delete ${section.name}?`, onConfirm: () => { setModalState(prev => ({...prev, isOpen: false})); deleteSectionMutation.mutate(section._id); } });
                      }}
                      className="text-red-500 hover:text-red-700 text-xs font-bold ml-4 flex items-center gap-1 p-1.5 hover:bg-red-50 rounded transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      Delete
                    </button>
                  </div>
                  
                  <div className="p-5 bg-white">
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      Topics inside {section.name}
                      <span className="bg-purple-100 text-purple-800 py-0.5 px-2 rounded-full text-[10px] font-bold">{section.topics?.length || 0}</span>
                    </h4>
                    
                    <div className="flex flex-wrap gap-2.5 mb-5 p-4 bg-gray-50 rounded-lg border border-gray-100">
                      {section.topics && section.topics.map((topic, tIdx) => {
                        if (editTopic.sectionId === section._id && editTopic.topicIdx === tIdx) {
                          return (
                            <div key={tIdx} className="flex items-center gap-1 bg-white border border-purple-300 rounded-md px-2 py-1 shadow-inner">
                              <input 
                                type="text" autoFocus value={editTopic.name} onChange={(e) => setEditTopic({...editTopic, name: e.target.value})}
                                className="w-32 px-1 text-sm focus:outline-none"
                                onKeyDown={(e) => { if (e.key === 'Enter') handleEditTopicSubmit(section, tIdx); else if (e.key === 'Escape') setEditTopic({sectionId:null}); }}
                              />
                              <button onClick={() => handleEditTopicSubmit(section, tIdx)} className="text-green-600 hover:text-green-700 p-0.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg></button>
                              <button onClick={() => setEditTopic({sectionId:null})} className="text-gray-400 hover:text-gray-600 p-0.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                            </div>
                          );
                        }
                        return (
                          <div key={tIdx} className="bg-white text-gray-800 text-sm px-3 py-1.5 rounded-md border border-gray-200 shadow-sm flex items-center gap-2 group hover:border-purple-300 transition-colors">
                            <span className="font-semibold cursor-pointer" onDoubleClick={() => setEditTopic({sectionId: section._id, topicIdx: tIdx, name: topic.name})}>{topic.name}</span>
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-gray-50 rounded pl-1">
                              <button onClick={() => setEditTopic({sectionId: section._id, topicIdx: tIdx, name: topic.name})} className="text-gray-400 hover:text-purple-600 p-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                              </button>
                              <button onClick={() => handleDeleteTopic(section, tIdx)} className="text-gray-400 hover:text-red-500 p-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {(!section.topics || section.topics.length === 0) && <span className="text-sm text-gray-500 italic py-1">No topics added yet.</span>}
                    </div>

                    {/* Add Topic Input */}
                    <div>
                      {activeSectionId === section._id ? (
                        <div className="flex gap-2 max-w-md bg-purple-50 p-2 rounded-lg border border-purple-100 shadow-sm">
                          <input 
                            type="text" autoFocus value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} 
                            placeholder="Add topics (comma separated)" 
                            className="flex-1 border border-purple-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddTopic(section); }}
                          />
                          <button onClick={() => handleAddTopic(section)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded text-sm font-bold shadow-sm">Add</button>
                          <button onClick={() => setActiveSectionId(null)} className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 px-4 py-1.5 rounded text-sm font-bold transition-colors">Cancel</button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setActiveSectionId(section._id); setNewTopicName(''); }}
                          className="text-sm bg-white border border-gray-300 hover:border-purple-500 hover:text-purple-700 text-gray-700 font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                          Add Topics
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {sections?.length === 0 && (
                <div className="text-center p-12 text-gray-500 border-2 border-dashed border-purple-100 rounded-xl bg-purple-50/50">
                  <svg className="w-12 h-12 mx-auto text-purple-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                  <p className="font-semibold text-lg text-purple-800">No Exam Sections Defined</p>
                  <p className="text-sm mt-1 text-purple-600">Start by adding a Section above.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
