import React, { useState, useEffect, useRef } from 'react';
import {
  AppState,
} from '../types';
import {
  Plus,
  X,
  HardHat,
  Calendar,
  Camera,
  Save,
  RefreshCw,
  Loader,
  Package,
  History,
  CheckCircle2,
  Clock
} from 'lucide-react';
import {
  fetchCrushingJobs,
  fetchCrushingItems,
  submitCrushingActual,
  updateCrushingActualDate
} from './src/step5.api';
import { uploadImageToDrive, formatDate, formatDisplayDate } from './src/step3.api';

interface Props {
  state: AppState;
  onUpdate: (updater: (prev: AppState) => AppState) => void;
}

const Step5List: React.FC<Props> = ({ state, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [crushingJobs, setCrushingJobs] = useState<any[]>([]);
  const [fgData, setFgData] = useState<{ headers: string[], options: string[][] }>({ headers: [], options: [[], [], [], []] });
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    dateOfProduction: '',
    date: new Date().toISOString().split('T')[0],
    crushingProductName: '',
    fg1Name: '',
    fg1Qty: '',
    fg2Name: '',
    fg2Qty: '',
    fg3Name: '',
    fg3Qty: '',
    fg4Name: '',
    fg4Qty: '',
    remarks: '',
    machineRunningHour: ''
  });

  const [startingPhoto, setStartingPhoto] = useState<File | null>(null);
  const [endingPhoto, setEndingPhoto] = useState<File | null>(null);
  const startPhotoRef = useRef<HTMLInputElement>(null);
  const endPhotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [jobs, data] = await Promise.all([
        fetchCrushingJobs(),
        fetchCrushingItems()
      ]);
      setCrushingJobs(jobs);
      setFgData(data);
    } catch (err) {
      console.error('Error loading Step 5 data:', err);
      setError('Failed to refresh data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (job: any) => {
    setSelectedJob(job);
    setFormData({
      ...formData,
      dateOfProduction: job.dateOfProduction,
      crushingProductName: job.productName
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    setIsSubmitting(true);
    try {
      let startPhotoUrl = '';
      let endPhotoUrl = '';

      if (startingPhoto) {
        startPhotoUrl = await uploadImageToDrive(startingPhoto, `START_${selectedJob.sNo}_${Date.now()}`);
      }
      if (endingPhoto) {
        endPhotoUrl = await uploadImageToDrive(endingPhoto, `END_${selectedJob.sNo}_${Date.now()}`);
      }

      const timestamp = formatDate(new Date());

      // Prepare data for 'Crushing Actual' sheet
      // Headers: Timestamp, #REF!(Date), Date Of Production, Crushing Product Name, Qty Of Crushing Product, FG1 Name, Qty1, FG2 Name, Qty2, FG3 Name, Qty3, FG4 Name, Qty4, Start Photo, End Photo, Remarks, Machine Hour
      const rowData = [
        timestamp,                          // Col A: Timestamp
        formData.date || "",                // Col B: Date (User input)
        formData.dateOfProduction,          // Col C: Date Of Production
        formData.crushingProductName,       // Col D: Crushing Product Name
        selectedJob.qtyOfSemiFinishedGood,  // Col E: Qty Of Crushing Product (Input Qty)
        formData.fg1Name,                   // Col F: FG1
        Number(formData.fg1Qty) || 0,        // Col G: Qty1
        formData.fg2Name,                   // Col H: FG2
        Number(formData.fg2Qty) || 0,        // Col I: Qty2
        formData.fg3Name,                   // Col J: FG3
        Number(formData.fg3Qty) || 0,        // Col K: Qty3
        formData.fg4Name,                   // Col L: FG4
        Number(formData.fg4Qty) || 0,        // Col M: Qty4
        startPhotoUrl,                      // Col N: Starting Reading Photo
        endPhotoUrl,                        // Col O: Ending Reading Photo
        formData.remarks,                   // Col P: Remarks
        Number(formData.machineRunningHour) || 0, // Col Q: Machine Running Hour
      ];

      const success = await submitCrushingActual(rowData);
      if (success) {
        // Update actual2 in Semi Actual sheet
        await updateCrushingActualDate(selectedJob.rowIndex, selectedJob.actual2ColumnIndex, timestamp);
        setIsModalOpen(false);
        setStartingPhoto(null);
        setEndingPhoto(null);
        await loadData(); // Refresh list - this will remove the completed job from pending
      } else {
        alert('Failed to submit crushing data.');
      }
    } catch (err) {
      console.error('Error in submission:', err);
      alert('An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">Crushing Department</h2>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            {isLoading ? 'Syncing...' : `${crushingJobs.filter(j => !j.actual2).length} Jobs Ready for Crushing`}
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="flex items-center px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all font-bold disabled:opacity-50"
        >
          <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'pending'
            ? 'bg-[#84a93c] text-white shadow-lg shadow-emerald-100'
            : 'text-slate-500 hover:bg-white hover:text-slate-800'
            }`}
        >
          <Clock size={14} className="mr-2" />
          Pending ({crushingJobs.filter(j => !j.actual2).length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'history'
            ? 'bg-[#84a93c] text-white shadow-lg shadow-emerald-100'
            : 'text-slate-500 hover:bg-white hover:text-slate-800'
            }`}
        >
          <History size={14} className="mr-2" />
          History ({crushingJobs.filter(j => j.actual2).length})
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#F8FAFC]">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Prod.</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Details</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Input Qty</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeTab === 'history' ? 'Dates' : 'Planned2 Date'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Loader size={24} className="animate-spin text-[#84a93c]" />
                      <p className="text-slate-400 text-sm font-medium">Loading crushing queue...</p>
                    </div>
                  </td>
                </tr>
              ) : activeTab === 'pending' && crushingJobs.filter(j => !j.actual2).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-400 text-sm font-medium">
                    Excellent! No jobs pending for crushing.
                  </td>
                </tr>
              ) : activeTab === 'history' && crushingJobs.filter(j => j.actual2).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-400 text-sm font-medium">
                    No crushing history available.
                  </td>
                </tr>
              ) : (
                (activeTab === 'pending'
                  ? crushingJobs.filter(j => !j.actual2)
                  : crushingJobs.filter(j => j.actual2)
                ).map((job, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 text-center">
                      {activeTab === 'pending' ? (
                        <button
                          onClick={() => handleOpenModal(job)}
                          className="inline-flex items-center px-4 py-2 bg-[#84a93c] text-white rounded-xl hover:bg-emerald-600 transition-all text-[10px] font-black uppercase tracking-tight shadow-md shadow-emerald-50"
                        >
                          Start Crushing
                        </button>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-tight">
                          Completed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-slate-600 font-bold text-xs">
                        <Calendar size={14} className="mr-2 text-slate-400" />
                        {formatDisplayDate(job.dateOfProduction || '')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-[#84a93c] transition-all border border-transparent group-hover:border-emerald-100">
                          <HardHat size={20} />
                        </div>
                        <div className="ml-4">
                          <div className="font-bold text-slate-800 text-sm">{job.productName}</div>
                          <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                            J.Card: {job.semiFinishedJobCardNo} | Sr: {job.sNo}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block px-3 py-1 bg-slate-50 rounded-lg text-sm font-black text-slate-700">
                        {job.qtyOfSemiFinishedGood}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-slate-600 font-bold text-xs">
                        <Calendar size={14} className="mr-2 text-slate-400" />
                        {activeTab === 'history' ? formatDisplayDate(job.actual2 || '') : formatDisplayDate(job.planned2 || '')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {activeTab === 'pending' ? (
                        <span className="px-3 py-1 bg-amber-50 text-amber-500 text-[10px] font-black uppercase rounded-full tracking-tighter">
                          In Queue
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-500 text-[10px] font-black uppercase rounded-full tracking-tighter">
                          Completed
                        </span>
                      )}

                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Crushing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-[40px] w-full max-w-2xl my-auto shadow-2xl border border-slate-100 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-10 py-8 border-b border-slate-50 bg-white">
              <div>
                <h3 className="text-2xl font-black text-slate-800 flex items-center">
                  <HardHat size={24} className="mr-3 text-[#84a93c]" />
                  Crushing Job Details
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  Log Finished Goods Output
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-400 hover:bg-slate-50 hover:text-slate-800"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-8 h-[70vh] overflow-y-auto">

              {/* Dates */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500">
                    Date Of Production
                  </label>
                  <input
                    readOnly
                    value={formatDisplayDate(formData.dateOfProduction)}
                    className="w-full px-5 py-4 bg-slate-100 rounded-2xl font-bold text-sm text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500">
                    Date *
                  </label>
                  <input
                    required
                    type="date"
                    value={formData.date}
                    onChange={e =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-[#84a93c]"
                  />
                </div>
              </div>

              {/* Crushing Product Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-500">
                  Crushing Product Name *
                </label>
                <select
                  required
                  value={formData.crushingProductName}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      crushingProductName: e.target.value
                    })
                  }
                  className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-[#84a93c]"
                >
                  <option value="">-- Select Crushing Product --</option>
                  {(fgData.options[0] || []).map((item, index) => (
                    <option key={index} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              {/* Photo Upload Section */}
              <div className="grid grid-cols-2 gap-6">
                {/* Starting Photo */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">
                    Starting Reading Photo
                  </label>
                  <div
                    onClick={() => startPhotoRef.current?.click()}
                    className={`relative group cursor-pointer flex flex-col items-center justify-center w-full h-32 rounded-2xl border-2 border-dashed transition-all overflow-hidden ${startingPhoto ? 'border-[#84a93c] bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                  >
                    {startingPhoto ? (
                      <div className="absolute inset-0 flex items-center justify-center p-2">
                        <img
                          src={URL.createObjectURL(startingPhoto)}
                          alt="Preview"
                          className="w-full h-full object-cover rounded-xl"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="text-white" size={24} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="p-3 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                          <Camera className="text-slate-400 group-hover:text-[#84a93c]" size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-500 uppercase tracking-wide">
                          Click to Upload
                        </span>
                      </>
                    )}
                    <input
                      ref={startPhotoRef}
                      type="file"
                      accept="image/*"
                      onChange={e => setStartingPhoto(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Ending Photo */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">
                    Ending Reading Photo
                  </label>
                  <div
                    onClick={() => endPhotoRef.current?.click()}
                    className={`relative group cursor-pointer flex flex-col items-center justify-center w-full h-32 rounded-2xl border-2 border-dashed transition-all overflow-hidden ${endingPhoto ? 'border-[#84a93c] bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                  >
                    {endingPhoto ? (
                      <div className="absolute inset-0 flex items-center justify-center p-2">
                        <img
                          src={URL.createObjectURL(endingPhoto)}
                          alt="Preview"
                          className="w-full h-full object-cover rounded-xl"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="text-white" size={24} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="p-3 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                          <Camera className="text-slate-400 group-hover:text-[#84a93c]" size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-500 uppercase tracking-wide">
                          Click to Upload
                        </span>
                      </>
                    )}
                    <input
                      ref={endPhotoRef}
                      type="file"
                      accept="image/*"
                      onChange={e => setEndingPhoto(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Finished Goods */}
              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center">
                  <Package size={16} className="mr-2 text-[#84a93c]" />
                  Finished Goods Output
                </h4>

                <div className="space-y-6">
                  {[1, 2, 3, 4].map(num => (
                    <div key={num} className="grid grid-cols-2 gap-6 items-end">

                      {/* FG Name */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500">
                          Finished Goods Name {num}
                        </label>
                        <select
                          value={(formData as any)[`fg${num}Name`]}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              [`fg${num}Name`]: e.target.value
                            })
                          }
                          className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-[#84a93c]"
                        >
                          <option value="">-- Select --</option>
                          {(fgData.options[2] || []).map((item, index) => (
                            <option key={index} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Qty */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500">
                          Qty {num}
                        </label>
                        <input
                          type="number"
                          value={(formData as any)[`fg${num}Qty`]}
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              [`fg${num}Qty`]: e.target.value
                            })
                          }
                          className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-[#84a93c]"
                        />
                      </div>

                    </div>
                  ))}
                </div>
              </div>

              {/* Machine + Remarks */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500">
                    Machine Running Hour *
                  </label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    value={formData.machineRunningHour}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        machineRunningHour: e.target.value
                      })
                    }
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-[#84a93c]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500">
                    Remarks
                  </label>
                  <textarea
                    value={formData.remarks}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        remarks: e.target.value
                      })
                    }
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold text-sm"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 bg-[#84a93c] text-white font-black rounded-3xl hover:bg-emerald-600 transition-all"
              >
                {isSubmitting ? "Submitting..." : "Log Crushing Output"}
              </button>

            </form>
          </div>
        </div>
      )}
    </div >
  );
};

export default Step5List;
