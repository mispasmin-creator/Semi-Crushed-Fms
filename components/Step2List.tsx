import React, { useState, useEffect } from 'react';
import {
  AppState,
} from '../types';
import {
  Plus, X, AlertTriangle, Loader, RefreshCw, ClipboardList, Clock, History, CheckCircle
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
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'history'>('pending');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProd, setSelectedProd] = useState<SemiProductionRecord | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
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
    setLoadError('');
    try {
      // Fetch each independently so one failure doesn't blank the entire page
      const [production, jobCards, sups] = await Promise.all([
        fetchSemiProductionData().catch(err => { 
          console.error('Production fetch error:', err); 
          return []; 
        }),
        fetchSemiJobCardData().catch(err => { 
          console.error('JobCard fetch error:', err); 
          return []; 
        }),
        fetchSupervisors().catch(err => { 
          console.error('Supervisors fetch error:', err); 
          return []; 
        })
      ]);

      console.log('Production data received:', production);
      console.log('Job card data received:', jobCards);
      console.log('Supervisors received:', sups);

      setProductionData(production as SemiProductionRecord[]);
      setJobCardData(jobCards as SemiJobCardRecord[]);
      setSupervisors(sups as Supervisor[]);

      // If ALL came back empty, likely a connectivity issue
      if (production.length === 0 && jobCards.length === 0) {
        setLoadError('No data received from server. Check your connection or try refreshing.');
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setLoadError('Failed to load data. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanClick = (record: SemiProductionRecord) => {
    setSelectedProd(record);
    setIsModalOpen(true);
    setError('');
    setFormData({
      supervisorName: '',
      qty: record.qty,
      dateOfProduction: new Date().toISOString().split('T')[0],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProd) return;

    setIsSubmitting(true);
    setError('');

    try {
      const timestamp = formatDate(new Date());
      const sjcSrNo = await fetchLatestSJCNo();

      const rowData = [
        timestamp,
        sjcSrNo,
        selectedProd.sfSrNo,
        formData.supervisorName,
        selectedProd.nameOfSemiFinished,
        Number(formData.qty),
        formData.dateOfProduction
      ];

      console.log('Submitting row data:', rowData);

      const submitted = await submitToSemiJobCard(rowData);

      if (submitted) {
        await loadAllData();

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

  // Safe status check function
  const isOrderCompleted = (status: any): boolean => {
    if (!status) return false;
    const statusStr = String(status).toLowerCase();
    return ['complete', 'completed'].includes(statusStr);
  };

  const isOrderPending = (status: any): boolean => {
    return !isOrderCompleted(status);
  };

  // Filter production data properly with safe checks
  const pendingOrders = productionData.filter(
    (order) => isOrderPending(order.status)
  );

  const completedOrders = productionData.filter(
    (order) => isOrderCompleted(order.status)
  );

  const historyOrders = getHistoryOrders(jobCardData);

  const formatDisplayDate = (dateString: string): string => {
  if (!dateString || dateString === 'null' || dateString === 'undefined') return '-';
  
  try {
    // If already in DD/MM/YY format, return as is
    if (dateString.match(/^\d{2}\/\d{2}\/\d{2}$/)) {
      return dateString;
    }
    
    // Handle ISO date strings (like "2023-01-03T03:30:00.000Z")
    if (dateString.includes('T') && dateString.includes('Z')) {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString().slice(-2);
        return `${day}/${month}/${year}`;
      }
    }
    
    // Handle format like "2/18/2026, 4:17:51 PM"
    const dateMatch = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dateMatch) {
      const [_, month, day, year] = dateMatch;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year.slice(-2)}`;
    }
    
    // Try to parse as Date object as last resort
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(-2);
      return `${day}/${month}/${year}`;
    }
    
    return dateString;
  } catch {
    return dateString;
  }
};

  // Shared table header for pending/completed production records
  const ProductionTableHeader = () => (
    <thead className="bg-[#F8FAFC]">
      <tr>
        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">SF Sr. No.</th>
        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Name</th>
        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes</th>
        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Date</th>
        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
      </tr>
    </thead>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">Semi Job Card Planning</h2>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            {isLoading
              ? 'Loading...'
              : `${pendingOrders.length} pending · ${completedOrders.length} completed · ${historyOrders.length} job cards`}
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
        {/* Pending Tab */}
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center px-6 py-3 font-bold text-sm transition-all relative ${activeTab === 'pending'
            ? 'text-[#84a93c] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#84a93c]'
            : 'text-slate-400 hover:text-slate-600'
            }`}
        >
          <Clock size={16} className="mr-2" />
          Pending ({pendingOrders.length})
        </button>

        {/* Completed Tab */}
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex items-center px-6 py-3 font-bold text-sm transition-all relative ${activeTab === 'completed'
            ? 'text-emerald-500 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-500'
            : 'text-slate-400 hover:text-slate-600'
            }`}
        >
          <CheckCircle size={16} className="mr-2" />
          Completed ({completedOrders.length})
        </button>

        {/* History Tab */}
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center px-6 py-3 font-bold text-sm transition-all relative ${activeTab === 'history'
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

        ) : loadError ? (
          <div className="p-16 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                <AlertTriangle size={26} className="text-red-400" />
              </div>
              <div>
                <p className="text-slate-700 font-bold text-sm mb-1">Something went wrong</p>
                <p className="text-slate-400 text-xs max-w-xs mx-auto">{loadError}</p>
              </div>
              <button
                onClick={loadAllData}
                className="flex items-center px-4 py-2.5 bg-[#84a93c] text-white rounded-xl hover:bg-emerald-600 transition-all font-bold text-sm"
              >
                <RefreshCw size={14} className="mr-2" />
                Try Again
              </button>
            </div>
          </div>

        ) : activeTab === 'pending' ? (
          /* ── PENDING TAB ── */
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <ProductionTableHeader />
              <tbody className="divide-y divide-slate-50">
                {pendingOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-slate-400 font-medium">
                      No pending orders found.
                    </td>
                  </tr>
                ) : (
                  pendingOrders.map((order, index) => (
                    <tr key={`pending-${order.sfSrNo}-${index}`} className="hover:bg-slate-50/50 transition-colors">
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
                        <span className="text-sm text-slate-600">
                          {order.planned ? formatDisplayDate(order.planned) : 'Not scheduled'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 text-[10px] font-black uppercase rounded-full bg-amber-50 text-amber-500">
                          {order.status ? String(order.status) : 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        ) : activeTab === 'completed' ? (
          /* ── COMPLETED TAB ── */
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <ProductionTableHeader />
              <tbody className="divide-y divide-slate-50">
                {completedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-slate-400 font-medium">
                      No completed orders found.
                    </td>
                  </tr>
                ) : (
                  completedOrders.map((order, index) => (
                    <tr key={`completed-${order.sfSrNo}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                      {/* No Plan button for completed orders */}
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-500 rounded-xl text-xs font-bold">
                          <CheckCircle size={13} className="mr-1" />
                          Done
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-emerald-500">{order.sfSrNo}</span>
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
                        <span className="text-sm text-slate-600">
                          {order.planned ? formatDisplayDate(order.planned) : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 text-[10px] font-black uppercase rounded-full bg-emerald-50 text-emerald-500">
                          {order.status ? String(order.status) : 'COMPLETED'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        ) : (
          /* ── HISTORY TAB ── */
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
                    <tr key={`history-${job.sjcSrNo}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-[#84a93c]">{job.sjcSrNo}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{job.sfSrNo}</td>
                      <td className="px-6 py-4 font-medium text-slate-700">{job.supervisorName}</td>
                      <td className="px-6 py-4 text-slate-600">{job.productName}</td>
                      <td className="px-6 py-4 font-black text-slate-800">{job.qty}</td>
<td className="px-6 py-4 text-slate-500">
  {formatDisplayDate(job.dateOfProduction)}
</td>                      <td className="px-6 py-4 text-emerald-500 font-bold">{job.actualMade || 0}</td>
                      <td className="px-6 py-4 text-amber-500 font-bold">{job.pending || job.qty}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${(job.pending || job.qty) > 0 ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'
                          }`}>
                          {job.status ? String(job.status) : ((job.pending || job.qty) > 0 ? 'PENDING' : 'COMPLETED')}
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

      {/* Create Job Card Modal */}
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
                  onChange={e => setFormData({ ...formData, supervisorName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F4F7FE] border-none rounded-xl focus:ring-2 focus:ring-[#84a93c] outline-none font-bold text-xs appearance-none"
                >
                  <option value="">Select Supervisor</option>
                  {supervisors.map((sup, idx) => (
                    <option key={`sup-${sup.name}-${idx}`} value={sup.name}>{sup.name}</option>
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
                      setFormData({ ...formData, qty: value === '' ? 0 : Number(value) });
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
                  onChange={e => setFormData({ ...formData, dateOfProduction: e.target.value })}
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