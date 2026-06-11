import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosConfig';

export const MasterDataTab = ({ setModalState }) => {
  const queryClient = useQueryClient();
  const [newOrgName, setNewOrgName] = useState('');
  
  // State for adding recruitment
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [newRecruitmentName, setNewRecruitmentName] = useState('');
  
  // State for adding posts
  const [activeRecruitmentIndex, setActiveRecruitmentIndex] = useState(null);
  const [newPostName, setNewPostName] = useState('');

  // State for editing
  const [editOrgId, setEditOrgId] = useState(null);
  const [editOrgName, setEditOrgName] = useState('');
  
  const [editRec, setEditRec] = useState({ orgId: null, recIdx: null, name: '' });
  const [editPost, setEditPost] = useState({ orgId: null, recIdx: null, postIdx: null, name: '' });

  const { data: organizations, isLoading } = useQuery({
    queryKey: ['admin_organizations'],
    queryFn: async () => {
      const res = await api.get('/admin/organizations');
      return res.data.data;
    }
  });

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
    mutationFn: async ({ id, recruitments }) => {
      const res = await api.put(`/admin/organizations/${id}`, { recruitments });
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
    onSuccess: () => {
      queryClient.invalidateQueries(['admin_organizations']);
    }
  });

  const handleAddOrg = (e) => {
    e.preventDefault();
    if (newOrgName.trim()) {
      createOrgMutation.mutate(newOrgName.trim());
    }
  };

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
      isOpen: true,
      type: 'danger',
      title: 'Delete Recruitment',
      message: 'Are you sure you want to delete this recruitment category?',
      onConfirm: () => {
        setModalState(prev => ({ ...prev, isOpen: false }));
        const updatedRecruitments = org.recruitments.filter((_, idx) => idx !== recIndex);
        updateOrgMutation.mutate({ id: org._id, recruitments: updatedRecruitments });
      }
    });
  };

  const handleDeletePost = (org, recIndex, postIndex) => {
    setModalState({
      isOpen: true,
      type: 'danger',
      title: 'Delete Post',
      message: `Are you sure you want to delete this post?`,
      onConfirm: () => {
        setModalState(prev => ({ ...prev, isOpen: false }));
        const updatedRecruitments = [...org.recruitments];
        updatedRecruitments[recIndex].posts = updatedRecruitments[recIndex].posts.filter((_, idx) => idx !== postIndex);
        updateOrgMutation.mutate({ id: org._id, recruitments: updatedRecruitments });
      }
    });
  };

  const handleEditOrgSubmit = (org) => {
    if (!editOrgName.trim() || editOrgName.trim() === org.name) {
      setEditOrgId(null);
      return;
    }
    updateOrgMutation.mutate({ id: org._id, name: editOrgName.trim() });
  };

  const handleEditRecSubmit = (org, recIndex) => {
    if (!editRec.name.trim() || editRec.name.trim() === org.recruitments[recIndex].name) {
      setEditRec({ orgId: null, recIdx: null, name: '' });
      return;
    }
    const updatedRecruitments = [...org.recruitments];
    updatedRecruitments[recIndex].name = editRec.name.trim();
    updateOrgMutation.mutate({ id: org._id, recruitments: updatedRecruitments });
  };

  const handleEditPostSubmit = (org, recIndex, postIndex) => {
    if (!editPost.name.trim() || editPost.name.trim() === org.recruitments[recIndex].posts[postIndex]) {
      setEditPost({ orgId: null, recIdx: null, postIdx: null, name: '' });
      return;
    }
    const updatedRecruitments = [...org.recruitments];
    updatedRecruitments[recIndex].posts[postIndex] = editPost.name.trim();
    updateOrgMutation.mutate({ id: org._id, recruitments: updatedRecruitments });
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500 font-bold">Loading Master Data...</div>;

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden p-6">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Master Data Management</h2>
          <p className="text-sm text-gray-500">Manage Organizations, Recruitment Categories, and Target Posts.</p>
        </div>
      </div>

      {/* Add Organization Form */}
      <form onSubmit={handleAddOrg} className="mb-8 bg-gray-50 p-4 rounded border border-gray-200 flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-gray-700 mb-1">Add New Organization</label>
          <input 
            type="text" 
            value={newOrgName} 
            onChange={(e) => setNewOrgName(e.target.value)} 
            placeholder="e.g. SSC, RRB" 
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-testyari-blue"
          />
        </div>
        <button type="submit" disabled={createOrgMutation.isPending || !newOrgName.trim()} className="w-full sm:w-auto bg-testyari-blue hover:bg-blue-800 text-white font-bold py-2 px-4 rounded text-sm disabled:opacity-50">
          + Add Org
        </button>
      </form>

      {/* List of Organizations */}
      <div className="space-y-6">
        {organizations?.map(org => (
          <div key={org._id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              {editOrgId === org._id ? (
                <div className="flex gap-2 items-center w-full max-w-md">
                  <input 
                    type="text" autoFocus value={editOrgName} onChange={(e) => setEditOrgName(e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-testyari-blue"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleEditOrgSubmit(org); else if (e.key === 'Escape') setEditOrgId(null); }}
                  />
                  <button onClick={() => handleEditOrgSubmit(org)} className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">Save</button>
                  <button onClick={() => setEditOrgId(null)} className="text-gray-500 hover:text-gray-700 text-xs font-bold px-1">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-800 text-lg">{org.name}</h3>
                  <button onClick={() => { setEditOrgId(org._id); setEditOrgName(org.name); }} className="text-gray-400 hover:text-testyari-blue">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                </div>
              )}
              
              <button 
                onClick={() => {
                  setModalState({
                    isOpen: true,
                    type: 'danger',
                    title: 'Delete Organization',
                    message: `Are you sure you want to delete ${org.name}?`,
                    onConfirm: () => { setModalState(prev => ({...prev, isOpen: false})); deleteOrgMutation.mutate(org._id); }
                  });
                }}
                className="text-red-600 hover:underline text-xs font-bold ml-4"
              >
                Delete Org
              </button>
            </div>
            
            <div className="p-4">
              {org.recruitments && org.recruitments.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {org.recruitments.map((rec, recIdx) => (
                    <div key={recIdx} className="border border-gray-200 rounded p-3 bg-white shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        {editRec.orgId === org._id && editRec.recIdx === recIdx ? (
                          <div className="flex gap-1 items-center w-full mr-2">
                            <input 
                              type="text" autoFocus value={editRec.name} onChange={(e) => setEditRec({...editRec, name: e.target.value})}
                              className="flex-1 px-1 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-testyari-blue"
                              onKeyDown={(e) => { if (e.key === 'Enter') handleEditRecSubmit(org, recIdx); else if (e.key === 'Escape') setEditRec({orgId:null}); }}
                            />
                            <button onClick={() => handleEditRecSubmit(org, recIdx)} className="bg-green-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">Save</button>
                            <button onClick={() => setEditRec({orgId:null})} className="text-gray-500 hover:text-gray-700 text-[10px] font-bold px-1">Cancel</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group">
                            <h4 className="font-semibold text-testyari-blue text-sm">{rec.name}</h4>
                            <button onClick={() => setEditRec({orgId: org._id, recIdx, name: rec.name})} className="text-gray-300 hover:text-testyari-blue opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                          </div>
                        )}
                        <button onClick={() => handleDeleteRecruitment(org, recIdx)} className="text-gray-400 hover:text-red-500">&times;</button>
                      </div>
                      
                      {/* Posts */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {rec.posts && rec.posts.map((post, pIdx) => {
                          if (editPost.orgId === org._id && editPost.recIdx === recIdx && editPost.postIdx === pIdx) {
                            return (
                              <div key={pIdx} className="flex items-center gap-1 bg-white border border-blue-300 rounded px-1 py-0.5">
                                <input 
                                  type="text" autoFocus value={editPost.name} onChange={(e) => setEditPost({...editPost, name: e.target.value})}
                                  className="w-20 px-1 text-[10px] focus:outline-none"
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleEditPostSubmit(org, recIdx, pIdx); else if (e.key === 'Escape') setEditPost({orgId:null}); }}
                                />
                                <button onClick={() => handleEditPostSubmit(org, recIdx, pIdx)} className="text-green-600"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg></button>
                                <button onClick={() => setEditPost({orgId:null})} className="text-gray-400"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                              </div>
                            );
                          }
                          return (
                            <span key={pIdx} className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1 group">
                              <span className="cursor-pointer" onDoubleClick={() => setEditPost({orgId: org._id, recIdx, postIdx: pIdx, name: post})}>{post}</span>
                              <button onClick={() => setEditPost({orgId: org._id, recIdx, postIdx: pIdx, name: post})} className="text-gray-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"><svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                              <button onClick={() => handleDeletePost(org, recIdx, pIdx)} className="hover:text-red-500 ml-0.5">&times;</button>
                            </span>
                          );
                        })}
                        {(!rec.posts || rec.posts.length === 0) && <span className="text-xs text-gray-400 italic">No posts added</span>}
                      </div>

                      {/* Add Post Input */}
                      {activeOrgId === org._id && activeRecruitmentIndex === recIdx ? (
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            autoFocus
                            value={newPostName} 
                            onChange={(e) => setNewPostName(e.target.value)} 
                            placeholder="Add post (comma separated)" 
                            className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-testyari-blue"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddPost(org, recIdx); }}
                          />
                          <button onClick={() => handleAddPost(org, recIdx)} className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-bold">Add</button>
                          <button onClick={() => {setActiveOrgId(null); setActiveRecruitmentIndex(null);}} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs font-bold">Cancel</button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setActiveOrgId(org._id); setActiveRecruitmentIndex(recIdx); setNewPostName(''); }}
                          className="text-xs text-testyari-blue hover:underline font-semibold"
                        >
                          + Add Posts
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic mb-4">No recruitment categories found for this organization.</p>
              )}

              {/* Add Recruitment Input */}
              <div className="mt-4 border-t pt-4">
                {activeOrgId === org._id && activeRecruitmentIndex === null ? (
                  <div className="flex gap-2 max-w-sm">
                    <input 
                      type="text" 
                      autoFocus
                      value={newRecruitmentName} 
                      onChange={(e) => setNewRecruitmentName(e.target.value)} 
                      placeholder="Recruitment Category Name" 
                      className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-testyari-blue"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddRecruitment(org); }}
                    />
                    <button onClick={() => handleAddRecruitment(org)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-bold">Add</button>
                    <button onClick={() => setActiveOrgId(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm font-bold">Cancel</button>
                  </div>
                ) : (
                  <button 
                    onClick={() => { setActiveOrgId(org._id); setActiveRecruitmentIndex(null); setNewRecruitmentName(''); }}
                    className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-1.5 px-3 rounded transition-colors"
                  >
                    + Add Recruitment Category
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {organizations?.length === 0 && (
          <div className="text-center p-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
            No Master Data defined yet. Start by adding an Organization above.
          </div>
        )}
      </div>
    </section>
  );
};
