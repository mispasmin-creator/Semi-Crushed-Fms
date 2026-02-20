import React, { useState, useEffect } from 'react';
import { 
  AppState, 
} from '../types';
import { 
  Plus, X, AlertTriangle, Loader, RefreshCw, ClipboardList, Clock, History 
} from 'lucide-react';
import { 
  fetchSemiProductionData,
  fetchSupervisors,
  fetchSemiJobCardData,
  fetchLatestSJCNo,
  submitToSemiJobCard,
  getPendingOrders,
  getHistoryOrders,
  formatDate,
  SemiProductionRecord,
  SemiJobCardRecord,
  Supervisor
} from './src/step2api';

interface Props {
  state: AppState;
  onUpdate: (updater: (prev: AppState) => AppState) => void;
}

const Step2List: React.FC<Props> = ({ state, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProd, setSelectedProd] = useState<SemiProductionRecord | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [productionData, setProductionData] = useState<SemiProductionRecord[]>([]);
  const [jobCardData, setJobCardData] = useState<SemiJobCardRecord[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [formData, setFormData] = useState({
    supervisorName: '',
    qty: 0,
    dateOfProduction: new Date().toISOString().split('T')[0],
  });

  // Load all data on component mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [production, jobCards, sups] = await Promise.all([
        fetchSemiProductionData(),
        fetchSemiJobCardData(),
        fetchSupervisors()
      ]);
      
      console.log('Production Data:', production);
      console.log('Job Card Data:', jobCards);
      console.log('Supervisors:', sups);
      
      setProductionData(production);
      setJobCardData(jobCards);
      setSupervisors(sups);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanClick = (record: SemiProductionRecord) => {
    setSelectedProd(record);
    setIsModalOpen(true);
    setError('');
    // Reset form with the quantity from the production record
    setFormData({
      supervisorName: '',
      qty: record.qty, // Default to the production quantity
      dateOfProduction: new Date().toISOString().split('T')[0],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProd) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Format timestamp in DD/MM/YY HH:MM:SS format
      const timestamp = formatDate(new Date());
      
      // Generate SJC number on submit
      const sjcSrNo = await fetchLatestSJCNo();
      
      // Prepare row data for Google Sheets - ONLY 7 COLUMNS as requested
      // Timestamp, SJC-Sr No., Semi Finished Production No., Supervisor Name, Product Name, Qty, Date Of Production
      const rowData = [
        timestamp,                    // Timestamp (Column A)
        sjcSrNo,                      // SJC-Sr No. (Column B)
        selectedProd.sfSrNo,           // Semi Finished Production No. (Column C)
        formData.supervisorName,       // Supervisor Name (Column D)
        selectedProd.nameOfSemiFinished, // Product Name (Column E)
        Number(formData.qty),          // Qty (Column F)
        formData.dateOfProduction      // Date Of Production (Column G)
        // NO OTHER COLUMNS - as per your request
      ];

      console.log('Submitting row data:', rowData); // For debugging

      // Submit to Google Sheets
      const submitted = await submitToSemiJobCard(rowData);

      if (submitted) {
        // Refresh all data
        await loadAllData();
        
        // Close modal and reset form
        setIsModalOpen(false);
        setSelectedProd(null);
        setFormData({
          supervisorName: '',
          qty: 0,
          dateOfProduction: new Date().toISOString().split('T')[0],
        });

        alert('Job Card created successfully!');
      } else {
        setError('Failed to create job card. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get filtered orders using API functions
  const pendingOrders = getPendingOrders(productionData);
  const historyOrders = getHistoryOrders(jobCardData);

  // Format date for display
  const formatDisplayDate = (dateString: string): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return formatDate(date);
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">Semi Job Card Planning</h2>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            {isLoading ? 'Loading...' : `${pendingOrders.length} pending, ${historyOrders.length} completed`}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={loadAllData}
            className="flex items-center px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all font-bold"
            title="Refresh data"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-100">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center px-6 py-3 font-bold text-sm transition-all relative ${
            activeTab === 'pending'
              ? 'text-[#84a93c] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#84a93c]'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Clock size={16} className="mr-2" />
          Pending ({pendingOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center px-6 py-3 font-bold text-sm transition-all relative ${
            activeTab === 'history'
              ? 'text-[#84a93c] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#84a93c]'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <History size={16} className="mr-2" />
          History ({historyOrders.length})
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-20 text-center">
            <div className="flex flex-col items-center justify-center space-y-3">
              <Loader size={24} className="animate-spin text-[#84a93c]" />
              <p className="text-slate-400 text-sm font-medium">Loading data from Google Sheets...</p>
            </div>
          </div>
        ) : activeTab === 'pending' ? (
          // Pending Orders Table (unchanged)
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">SF Sr. No.</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Name</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pendingOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-slate-400 font-medium">
                      No pending orders found.
                    </td>
                  </tr>
                ) : (
                  pendingOrders.map((order, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handlePlanClick(order)}
                          className="inline-flex items-center px-4 py-2 bg-[#84a93c] text-white rounded-xl hover:bg-emerald-600 transition-all text-xs font-bold"
                        >
                          <ClipboardList size={14} className="mr-1" />
                          Plan
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-[#84a93c]">{order.sfSrNo}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{order.nameOfSemiFinished}</div>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-700">{order.qty}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-500 max-w-[200px] truncate block" title={order.notes}>
                          {order.notes || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">{order.planned ? formatDisplayDate(order.planned) : 'Not scheduled'}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          // History Tab - Show Semi Job Card data (with proper header skipping)
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">SJC Sr. No.</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">SF Sr. No.</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Supervisor</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actual Made</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {historyOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-20 text-center text-slate-400 font-medium">
                      No job cards found in Semi Job Card sheet.
                    </td>
                  </tr>
                ) : (
                  historyOrders.map((job, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-[#84a93c]">{job.sjcSrNo}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{job.sfSrNo}</td>
                      <td className="px-6 py-4 font-medium text-slate-700">{job.supervisorName}</td>
                      <td className="px-6 py-4 text-slate-600">{job.productName}</td>
                      <td className="px-6 py-4 font-black text-slate-800">{job.qty}</td>
                      <td className="px-6 py-4 text-slate-500">{job.dateOfProduction}</td>
                      <td className="px-6 py-4 text-emerald-500 font-bold">{job.actualMade || 0}</td>
                      <td className="px-6 py-4 text-amber-500 font-bold">{job.pending || job.qty}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${
                          (job.pending || job.qty) > 0 ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'
                        }`}>
                          {job.status || ((job.pending || job.qty) > 0 ? 'PENDING' : 'COMPLETED')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Job Card Modal (unchanged) */}
      {isModalOpen && selectedProd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in zoom-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50">
              <h3 className="text-lg font-black text-slate-800">Create Job Card</h3>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedProd(null);
                  setError('');
                }} 
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* SF Number - Prefilled */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">
                  SF Sr. No.
                </label>
                <input 
                  readOnly
                  type="text" 
                  value={selectedProd.sfSrNo}
                  className="w-full px-4 py-2.5 bg-[#F4F7FE] border-none rounded-xl outline-none font-bold text-xs text-slate-400 cursor-not-allowed" 
                />
              </div>

              {/* Product Name - Prefilled */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">
                  Product Name
                </label>
                <input 
                  readOnly
                  type="text" 
                  value={selectedProd.nameOfSemiFinished}
                  className="w-full px-4 py-2.5 bg-[#F4F7FE] border-none rounded-xl outline-none font-bold text-xs text-slate-400 cursor-not-allowed" 
                />
              </div>

              {/* Supervisor Dropdown */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">
                  Select Supervisor
                </label>
                <select
                  required
                  value={formData.supervisorName}
                  onChange={e => setFormData({...formData, supervisorName: e.target.value})}
                  className="w-full px-4 py-2.5 bg-[#F4F7FE] border-none rounded-xl focus:ring-2 focus:ring-[#84a93c] outline-none font-bold text-xs appearance-none"
                >
                  <option value="">Select Supervisor</option>
                  {supervisors.map((sup, idx) => (
                    <option key={idx} value={sup.name}>{sup.name}</option>
                  ))}
                </select>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">
                  Quantity
                </label>
                <input 
                  required
                  type="text" 
                  value={formData.qty === 0 ? '' : formData.qty}
                  onChange={e => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setFormData({...formData, qty: value === '' ? 0 : Number(value)});
                    }
                  }}
                  placeholder="Enter quantity"
                  className="w-full px-4 py-2.5 bg-[#F4F7FE] border-none rounded-xl focus:ring-2 focus:ring-[#84a93c] outline-none font-bold text-xs" 
                />
              </div>

              {/* Date Picker */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">
                  Date of Production
                </label>
                <input 
                  required
                  type="date" 
                  value={formData.dateOfProduction}
                  onChange={e => setFormData({...formData, dateOfProduction: e.target.value})}
                  className="w-full px-4 py-2.5 bg-[#F4F7FE] border-none rounded-xl focus:ring-2 focus:ring-[#84a93c] outline-none font-bold text-xs" 
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold flex items-center">
                  <AlertTriangle size={14} className="mr-2" />
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-[#84a93c] text-white font-black rounded-xl hover:bg-emerald-600 transition-all shadow-lg flex items-center justify-center space-x-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Create Job Card</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Step2List;