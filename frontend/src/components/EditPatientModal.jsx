import React, { useState, useEffect } from 'react';
import { useQueue } from '../context/QueueContext';
import { useToast } from '../hooks/useToast';

const DOCTORS = ['Dr. Sharma', 'Dr. Patel', 'Dr. Mehta', 'Dr. Verma', 'Dr. Singh', 'Other'];

const EditPatientModal = ({ patient, onClose }) => {
  const { updatePatient } = useQueue();
  const { toast } = useToast();
  const [form, setForm]       = useState({ name: '', age: '', phone: '', doctor: '' });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (patient) setForm({ name: patient.name, age: patient.age, phone: patient.phone, doctor: patient.doctor });
  }, [patient]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Name is required.';
    if (!form.age)          e.age   = 'Age is required.';
    else if (+form.age < 0 || +form.age > 150) e.age = 'Enter a valid age.';
    if (!form.doctor)       e.doctor = 'Select a doctor.';
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
      await updatePatient(patient.id, form);
      toast.success('Patient details updated.');
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!patient) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Patient</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Token: <span className="font-mono font-bold text-blue-600">{patient.token}</span></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Patient Name *</label>
            <input name="name" value={form.name} onChange={handleChange}
              className={`input ${errors.name ? 'border-red-400' : ''}`} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Age *</label>
              <input name="age" type="number" value={form.age} onChange={handleChange}
                className={`input ${errors.age ? 'border-red-400' : ''}`} />
              {errors.age && <p className="text-xs text-red-500 mt-1">{errors.age}</p>}
            </div>
            <div>
              <label className="label">Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange} className="input" />
            </div>
          </div>

          <div>
            <label className="label">Doctor *</label>
            <select name="doctor" value={form.doctor} onChange={handleChange}
              className={`input ${errors.doctor ? 'border-red-400' : ''}`}>
              <option value="">Select a doctor</option>
              {DOCTORS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {errors.doctor && <p className="text-xs text-red-500 mt-1">{errors.doctor}</p>}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPatientModal;
