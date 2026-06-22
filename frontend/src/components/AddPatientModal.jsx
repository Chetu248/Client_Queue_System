/**
 * AddPatientModal
 * Validates all fields client-side before hitting the API.
 * isEmergency prop pre-fills the priority toggle.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useQueue } from '../context/QueueContext';
import { useToast } from '../hooks/useToast';

const DOCTORS = ['Dr. Sharma', 'Dr. Patel', 'Dr. Mehta', 'Dr. Verma', 'Dr. Singh', 'Other'];

const initialForm = { name: '', age: '', phone: '', doctor: '', priority: 'normal' };

const AddPatientModal = ({ onClose, isEmergency = false }) => {
  const { addPatient } = useQueue();
  const { toast } = useToast();
  const [form, setForm]       = useState({ ...initialForm, priority: isEmergency ? 'emergency' : 'normal' });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const firstRef = useRef(null);

  // Auto-focus first field
  useEffect(() => { firstRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const validate = () => {
    const e = {};
    if (!form.name.trim())          e.name   = 'Patient name is required.';
    else if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters.';
    if (!form.age)                  e.age    = 'Age is required.';
    else if (+form.age < 0 || +form.age > 150) e.age = 'Enter a valid age (0–150).';
    if (!form.phone.trim())         e.phone  = 'Phone number is required.';
    else if (!/^\d{10}$/.test(form.phone.replace(/\s+/g, ''))) e.phone = 'Enter a valid 10-digit phone number.';
    if (!form.doctor)               e.doctor = 'Select a doctor.';
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const result = await addPatient(form);
      toast.success(`✅ Token ${result.patient.token} assigned to ${result.patient.name}`);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-lg">
        {/* Header */}
        <div className={`p-5 border-b border-gray-100 dark:border-gray-700 rounded-t-2xl flex items-center justify-between
          ${form.priority === 'emergency' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/10'}`}
        >
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {form.priority === 'emergency' ? '🚨 Emergency Patient' : '➕ Add Patient'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Token will be auto-generated
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Priority toggle */}
          <div>
            <label className="label">Priority</label>
            <div className="grid grid-cols-2 gap-2">
              {['normal', 'emergency'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, priority: p }))}
                  className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                    form.priority === p
                      ? p === 'emergency'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                        : 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {p === 'emergency' ? '🚨 Emergency' : '🔵 Normal'}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="label">Patient Name *</label>
            <input ref={firstRef} name="name" value={form.name} onChange={handleChange}
              placeholder="Full name" className={`input ${errors.name ? 'border-red-400 focus:ring-red-400' : ''}`} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Age + Phone row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Age *</label>
              <input name="age" type="number" min="0" max="150" value={form.age} onChange={handleChange}
                placeholder="e.g. 35" className={`input ${errors.age ? 'border-red-400 focus:ring-red-400' : ''}`} />
              {errors.age && <p className="text-xs text-red-500 mt-1">{errors.age}</p>}
            </div>
            <div>
              <label className="label">Phone *</label>
              <input name="phone" type="tel" value={form.phone} onChange={handleChange}
                placeholder="10-digit number" className={`input ${errors.phone ? 'border-red-400 focus:ring-red-400' : ''}`} />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
          </div>

          {/* Doctor */}
          <div>
            <label className="label">Doctor *</label>
            <select name="doctor" value={form.doctor} onChange={handleChange}
              className={`input ${errors.doctor ? 'border-red-400 focus:ring-red-400' : ''}`}>
              <option value="">Select a doctor</option>
              {DOCTORS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {errors.doctor && <p className="text-xs text-red-500 mt-1">{errors.doctor}</p>}
          </div>

          {/* Emergency banner */}
          {form.priority === 'emergency' && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <span className="text-red-500 mt-0.5">⚠️</span>
              <p className="text-sm text-red-600 dark:text-red-400">
                This patient will be served <strong>immediately after</strong> the current patient.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`btn flex-1 ${form.priority === 'emergency' ? 'btn-danger' : 'btn-primary'}`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Adding…
                </span>
              ) : 'Add Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPatientModal;
