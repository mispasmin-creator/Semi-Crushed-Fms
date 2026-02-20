import React, { useState, useEffect } from 'react';
import { 
  AppState, 
  ProductionStatus, 
  Step1SFProduction 
} from '../types';
import { Plus, X, Edit3, Trash2, Loader, RefreshCw } from 'lucide-react';
import { 
  fetchSemiFinishedOptions, 
  submitToSemiProduction, 
  fetchLatestSFSrNo, 
  fetchSemiProductionData,
  SemiProductionRecord,
  DropdownOption 
} from './src/googleSheetsApi';

interface Props {
  state: AppState;
  onUpdate: (updater: (prev: AppState) => AppState) => void;
}

const Step1List: React.FC<Props> = ({ state, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [options, setOptions] = useState<DropdownOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isLoadingSfNo, setIsLoadingSfNo] = useState(false);
  const [sheetData, setSheetData] = useState<SemiProductionRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [formData, setFormData] = useState<Partial<Step1SFProduction>>({
    sfSrNo: '',
    name: '',
    qty: 0,
    notes: '',
  });

  // Fetch data from Google Sheet on component mount
  useEffect(() => {
    loadSheetData();
  }, []);

  const loadSheetData = async () => {
    setIsLoadingData(true);
    try {
      const data = await fetchSemiProductionData();
      console.log('Loaded sheet data:', data);
      setSheetData(data);
    } catch (error) {
      console.error('Error loading sheet data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Fetch dropdown options
  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    setIsLoadingOptions(true);
    const fetchedOptions = await fetchSemiFinishedOptions();
    setOptions(fetchedOptions);
    setIsLoadingOptions(false);
  };

  // Generate SF number when modal opens
  useEffect(() => {
    if (isModalOpen) {
      generateNextSfNo();
      loadOptions();
    }
  }, [isModalOpen]);

  const generateNextSfNo = async () => {
    setIsLoadingSfNo(true);
    try {
      const latestNo = await fetchLatestSFSrNo();
      setFormData(prev => ({ ...prev, sfSrNo: latestNo }));
    } catch (error) {
      console.error('Error generating SF number:', error);
      setFormData(prev => ({ ...prev, sfSrNo: 'SF-100' }));
    } finally {
      setIsLoadingSfNo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const timestamp = new Date().toLocaleString();
      const sfSrNo = formData.sfSrNo!;
      const name = formData.name!;
      const qty = Number(formData.qty);
      const notes = formData.notes || '';

      // Prepare row data for Google Sheets (matching your sheet columns)
      const rowData = [
        timestamp,           // Timestamp
        sfSrNo,              // SF-Sr No.
        name,                // Name Of Semi Finished Good
        qty,                 // Qty
        notes,               // Notes
        0,                   // Total Planned (initial)
        0,                   // Total Made (initial)
        qty,                 // Pending (initial = qty)
        'PENDING',           // Status
        '',                  // Planned (empty)
        ''                   // Actual (empty)
      ];

      // Submit to Google Sheets
      const submitted = await submitToSemiProduction(rowData);

      if (submitted) {
        // Refresh data from sheet
        await loadSheetData();
        
        // Close modal and reset form
        setIsModalOpen(false);
        setFormData({ 
          sfSrNo: '', 
          name: '', 
          qty: 0, 
          notes: '' 
        });

        alert('Order created successfully!');
      } else {
        alert('Failed to create order. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateProgress = (qty: number, made: number = 0) => {
    if (!qty || qty === 0) return 0;
    return Math.min(100, Math.round((made / qty) * 100));
  };

  const getStatusColor = (status: string) => {
    switch(status?.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-500';
      case 'IN PROGRESS':
        return 'bg-emerald-50 text-[#84a93c]';
      case 'PENDING':
      default:
        return 'bg-amber-50 text-amber-500';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">Production Demand</h2>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            {isLoadingData ? 'Loading data...' : `${sheetData.length} orders found`}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={loadSheetData}
            className="flex items-center px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all font-bold"
            title="Refresh data"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </button>
          <button 
            onClick={() => {
              setIsModalOpen(true);
            }}
            className="flex items-center px-6 py-2.5 bg-[#84a93c] text-white rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 font-bold"
          >
            <Plus size={18} className="mr-2" />
            New Order
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#F8FAFC]">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">SF Order Info</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Qty</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produced</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoadingData ? (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Loader size={24} className="animate-spin text-[#84a93c]" />
                      <p className="text-slate-400 text-sm font-medium">Loading orders from Google Sheets...</p>
                    </div>
                  </td>
                </tr>
              ) : sheetData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center text-slate-400 text-sm font-medium">
                    No production orders found in Google Sheet.
                  </td>
                </tr>
              ) : (
                sheetData.map((record, index) => {
                  const progress = calculateProgress(record.qty, record.totalMade);
                  
                  return (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 text-sm">{record.nameOfSemiFinished}</div>
                        <div className="text-[10px] text-[#84a93c] font-black uppercase tracking-tighter mt-0.5">{record.sfSrNo}</div>
                      </td>
                      <td className="px-6 py-4 text-[11px] font-medium text-slate-500 whitespace-nowrap">
                        {record.timestamp}
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-slate-700">{record.qty}</td>
                      <td className="px-6 py-4 text-sm font-black text-emerald-500">{record.totalMade}</td>
                      <td className="px-6 py-4 text-sm font-black text-amber-500">{record.pending}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-12 h-1.5 bg-slate-100 rounded-full">
                            <div 
                              className="bg-[#84a93c] h-full rounded-full transition-all duration-500" 
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-black text-slate-400">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-tighter ${getStatusColor(record.status)}`}>
                          {record.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-medium text-slate-500 max-w-[150px] truncate block" title={record.notes}>
                          {record.notes || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-1">
                          <button className="p-2 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all">
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this order?')) {
                                alert('Delete functionality to be implemented');
                              }
                            }}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in zoom-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50">
              <h3 className="text-lg font-black text-slate-800">New Demand Order</h3>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">
                    SF Sr. No. {isLoadingSfNo && <Loader size={12} className="inline animate-spin ml-1" />}
                  </label>
                  <input 
                    readOnly
                    type="text" 
                    value={formData.sfSrNo}
                    placeholder="Auto-generated"
                    className="w-full px-4 py-2.5 bg-[#F4F7FE] border-none rounded-xl outline-none font-bold text-xs text-slate-400 cursor-not-allowed" 
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Target Qty</label>
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
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">
                  Product Name {isLoadingOptions && <Loader size={12} className="inline animate-spin ml-1" />}
                </label>
                <select
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-[#F4F7FE] border-none rounded-xl focus:ring-2 focus:ring-[#84a93c] outline-none font-bold text-xs appearance-none"
                  disabled={isLoadingOptions}
                >
                  <option value="">Select a product...</option>
                  {options.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Production Notes</label>
                <textarea 
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  placeholder="Instructions..."
                  className="w-full px-4 py-2.5 bg-[#F4F7FE] border-none rounded-xl focus:ring-2 focus:ring-[#84a93c] outline-none font-bold text-xs resize-none" 
                />
              </div>
              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={isSubmitting || isLoadingOptions || isLoadingSfNo}
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
                      <span>Create Order</span>
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

export default Step1List;