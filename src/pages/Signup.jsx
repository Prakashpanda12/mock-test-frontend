import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { setCredentials } from '../store/authSlice';

export const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }
    
    setLoading(true);
    try {
      const response = await api.post('/auth/signup', {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      
      dispatch(setCredentials({ 
        user: response.data.data, 
        token: response.data.data.token 
      }));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <div className="bg-osssc-blue px-6 py-4 border-b border-blue-800">
          <h2 className="text-2xl font-bold text-white text-center">Candidate Registration</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">{error}</div>}
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Full Name</label>
            <input type="text" name="name" required className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-osssc-blue" value={formData.name} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Email Address</label>
            <input type="email" name="email" required className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-osssc-blue" value={formData.email} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
            <input type="password" name="password" required className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-osssc-blue" value={formData.password} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Confirm Password</label>
            <input type="password" name="confirmPassword" required className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-osssc-blue" value={formData.confirmPassword} onChange={handleChange} />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-osssc-blue hover:bg-blue-900 text-white font-bold py-3 px-4 rounded shadow-md mt-4 disabled:opacity-70">
            {loading ? 'Registering...' : 'Register'}
          </button>
          <div className="text-center mt-4 text-sm text-gray-600">
            Already have an account? <Link to="/login" className="text-osssc-blue font-semibold hover:underline">Log in</Link>
          </div>
        </form>
      </div>
    </div>
  );
};
