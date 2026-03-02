import React, { useState, useEffect, useRef } from 'react';
import {
  AppState
} from '../types';
import {
  Plus, X, Camera, Save, ArrowRight, Upload, Target, Settings, Loader, RefreshCw, AlertTriangle, Eye, ClipboardList
} from 'lucide-react';
import {
  fetchPendingSemiJobCards,
  fetchSemiActualData,
  fetchRawMaterials,
  uploadImageToDrive,
  generateSerialNo,
  submitToSemiActual,
  formatDate,
  formatDisplayDate,
  SemiJobCardRecord,
  SemiActualRecord,
  RawMaterialOption
} from './src/step3.api';

interface Props {
  state: AppState;
  onUpdate: (updater: (prev: AppState) => AppState) => void;
}

const Step3List: React.FC<Props> = ({ state, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSjc, setSelectedSjc] = useState<SemiJobCardRecord | null>(null);
  const [pendingJobCards, setPendingJobCards] = useState<SemiJobCardRecord[]>([]);
  const [semiActualData, setSemiActualData] = useState<SemiActualRecord[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterialOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    qtyOfSemiFinishedGood: 0,
    rawMaterial1Name: '',
    rawMaterial1Qty: 0,
    rawMaterial2Name: '',
    rawMaterial2Qty: 0,
    rawMaterial3Name: '',
    rawMaterial3Qty: 0,
    isAnyEndProduct: 'No',
    endProductRawMaterialName: '',
    endProductQty: 0,
    narration: '',
    startingReading: 0,
    startingReadingPhoto: '',
    endingReading: 0,
    endingReadingPhoto: '',
    machineRunningHour: 0,
    rawMaterial4Name: '',
    rawMaterial4Qty: 0,
    rawMaterial5Name: '',
    rawMaterial5Qty: 0,
    machineRunning: 0,
  });

  const startPhotoRef = useRef<HTMLInputElement>(null);
  const endPhotoRef = useRef<HTMLInputElement>(null);
  const [startPhotoFile, setStartPhotoFile] = useState<File | null>(null);
  const [endPhotoFile, setEndPhotoFile] = useState<File | null>(null);
  const [startPhotoPreview, setStartPhotoPreview] = useState<string>('');
  const [endPhotoPreview, setEndPhotoPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Generate serial number when modal opens
  useEffect(() => {
    if (isModalOpen) {
      generateSerialNo().then(setSerialNo);
    }
  }, [isModalOpen]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pending, actual, materials] = await Promise.all([
        fetchPendingSemiJobCards(),
        fetchSemiActualData(),
        fetchRawMaterials()
      ]);

      setPendingJobCards(pending);
      setSemiActualData(actual);
      setRawMaterials(materials);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ── NEW: open modal with a pre-selected job card ──
  const handleLogProduction = (job: SemiJobCardRecord) => {
    resetForm();
    setSelectedSjc(job);
    setFormData(prev => ({
      ...prev,
      qtyOfSemiFinishedGood: job.qty,
    }));
    setIsModalOpen(true);
  };

  const handleStartPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStartPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setStartPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEndPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEndPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEndPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Calculate machine running hours
  useEffect(() => {
    if (formData.endingReading && formData.startingReading) {
      const runningHours = formData.endingReading - formData.startingReading;
      setFormData(prev => ({
        ...prev,
        machineRunningHour: runningHours >= 0 ? runningHours : 0,
        machineRunning: runningHours >= 0 ? runningHours : 0
      }));
    }
  }, [formData.startingReading, formData.endingReading]);

  const handleViewImage = (imageUrl: string) => {
    if (imageUrl) {
      if (imageUrl.includes('drive.google.com') || imageUrl.includes('uc?export=view')) {
        window.open(imageUrl, '_blank');
      } else {
        setSelectedImage(imageUrl);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSjc) {
      setError('Please select a job card');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setIsUploading(true);

    try {
      let startPhotoUrl = '';
      let endPhotoUrl = '';

      if (startPhotoFile) {
        const fileName = `start_${selectedSjc.sjcSrNo}_${Date.now()}.jpg`;
        startPhotoUrl = await uploadImageToDrive(startPhotoFile, fileName);
      }

      if (endPhotoFile) {
        const fileName = `end_${selectedSjc.sjcSrNo}_${Date.now()}.jpg`;
        endPhotoUrl = await uploadImageToDrive(endPhotoFile, fileName);
      }

      setIsUploading(false);

      const timestamp = formatDate(new Date());

      const rowData = [
        timestamp,
        selectedSjc.sjcSrNo,
        selectedSjc.supervisorName,
        selectedSjc.dateOfProduction,
        selectedSjc.productName,
        Number(formData.qtyOfSemiFinishedGood) || 0,
        formData.rawMaterial1Name || '',
        Number(formData.rawMaterial1Qty) || 0,
        formData.rawMaterial2Name || '',
        Number(formData.rawMaterial2Qty) || 0,
        formData.rawMaterial3Name || '',
        Number(formData.rawMaterial3Qty) || 0,
        formData.isAnyEndProduct,
        formData.endProductRawMaterialName || '',
        Number(formData.endProductQty) || 0,
        formData.narration || '',
        serialNo,
        Number(formData.startingReading) || 0,
        startPhotoUrl,
        Number(formData.endingReading) || 0,
        endPhotoUrl,
        Number(formData.machineRunningHour) || 0,
        formData.rawMaterial4Name || '',
        Number(formData.rawMaterial4Qty) || 0,
        formData.rawMaterial5Name || '',
        Number(formData.rawMaterial5Qty) || 0,
        Number(formData.machineRunning) || 0,
        selectedSjc.sfSrNo
      ];

      console.log('Submitting to Semi Actual:', rowData);

      const submitted = await submitToSemiActual(rowData);

      if (submitted) {
        await loadData();
        setIsModalOpen(false);
        resetForm();
        alert('Production entry logged successfully!');
      } else {
        setError('Failed to submit. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedSjc(null);
    setFormData({
      qtyOfSemiFinishedGood: 0,
      rawMaterial1Name: '',
      rawMaterial1Qty: 0,
      rawMaterial2Name: '',
      rawMaterial2Qty: 0,
      rawMaterial3Name: '',
      rawMaterial3Qty: 0,
      isAnyEndProduct: 'No',
      endProductRawMaterialName: '',
      endProductQty: 0,
      narration: '',
      startingReading: 0,
      startingReadingPhoto: '',
      endingReading: 0,
      endingReadingPhoto: '',
      machineRunningHour: 0,
      rawMaterial4Name: '',
      rawMaterial4Qty: 0,
      rawMaterial5Name: '',
      rawMaterial5Qty: 0,
      machineRunning: 0,
    });
    setStartPhotoFile(null);
    setEndPhotoFile(null);
    setStartPhotoPreview('');
    setEndPhotoPreview('');
    setError('');
  };

  const narrationOptions = ["Normal", "Breakdown", "Maintenance", "Testing"];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">Actual Production Entry</h2>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            {isLoading ? 'Loading...' : `${pendingJobCards.length} PENDING JOBS`}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="flex items-center px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all font-bold"
            title="Refresh data"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Tab buttons ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-sm transition-all ${
            activeTab === 'pending'
              ? 'bg-[#84a93c] text-white shadow-md shadow-emerald-100'
              : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>⏱</span>
          Pending ({pendingJobCards.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-sm transition-all ${
            activeTab === 'history'
              ? 'bg-[#84a93c] text-white shadow-md shadow-emerald-100'
              : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>⊙</span>
          History ({semiActualData.length})
        </button>
      </div>

      {/* ── Single card wrapping whichever tab is active ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">

        {/* ── PENDING TAB ── */}
        {activeTab === 'pending' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          {/* Panel header */}
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#84a93c]" />
              <h3 className="text-sm font-black text-slate-700">Pending Job Cards</h3>
              <span className="px-2 py-0.5 bg-[#84a93c]/10 text-[#84a93c] rounded-full text-[9px] font-black">
                {pendingJobCards.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">SJC No.</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Loader size={16} className="animate-spin text-[#84a93c]" />
                        <span className="text-slate-400 text-xs">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : pendingJobCards.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-medium text-sm">
                      No pending job cards.
                    </td>
                  </tr>
                ) : (
                  pendingJobCards.map((job, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleLogProduction(job)}
                          className="flex items-center px-3 py-1.5 bg-[#84a93c] text-white rounded-lg hover:bg-emerald-600 transition-all font-bold text-[10px] shadow-sm shadow-emerald-100"
                        >
                          <ClipboardList size={12} className="mr-1.5" />
                          Entry
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-[#84a93c]">{job.sjcSrNo}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[120px] truncate" title={job.productName}>
                        {job.productName}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-emerald-600">{job.qty}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{job.dateOfProduction}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          {/* Panel header */}
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <h3 className="text-sm font-black text-slate-700">Production History</h3>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black">
              {semiActualData.length}
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">S No.</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">SJC No.</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Raw Materials</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">End Product</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Narration</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Start/End</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Hrs</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Photos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-10 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Loader size={16} className="animate-spin text-[#84a93c]" />
                        <span className="text-slate-400 text-xs">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : semiActualData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-10 text-center text-slate-400 font-medium text-sm">
                      No production entries found.
                    </td>
                  </tr>
                ) : (
                  semiActualData.map((entry, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-xs font-bold text-[#84a93c]">{entry.sNo}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{formatDisplayDate(entry.dateOfProduction)}</td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-700">{entry.semiFinishedJobCardNo}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[120px] truncate" title={entry.productName}>
                        {entry.productName}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-emerald-600">{entry.qtyOfSemiFinishedGood}</td>
                      <td className="px-4 py-3 text-xs">
                        <div className="space-y-0.5">
                          {entry.rawMaterial1Name && entry.rawMaterial1Qty > 0 && (
                            <div className="text-[9px]">{entry.rawMaterial1Name}: {entry.rawMaterial1Qty}</div>
                          )}
                          {entry.rawMaterial2Name && entry.rawMaterial2Qty > 0 && (
                            <div className="text-[9px]">{entry.rawMaterial2Name}: {entry.rawMaterial2Qty}</div>
                          )}
                          {entry.rawMaterial3Name && entry.rawMaterial3Qty > 0 && (
                            <div className="text-[9px]">{entry.rawMaterial3Name}: {entry.rawMaterial3Qty}</div>
                          )}
                          {entry.rawMaterial4Name && entry.rawMaterial4Qty > 0 && (
                            <div className="text-[9px]">{entry.rawMaterial4Name}: {entry.rawMaterial4Qty}</div>
                          )}
                          {entry.rawMaterial5Name && entry.rawMaterial5Qty > 0 && (
                            <div className="text-[9px]">{entry.rawMaterial5Name}: {entry.rawMaterial5Qty}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {entry.isAnyEndProduct === 'Yes' ? (
                          <div>
                            <span className="text-[9px] font-bold text-purple-600">{entry.endProductRawMaterialName}</span>
                            <span className="text-[9px] ml-1">({entry.endProductQty})</span>
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[9px] uppercase font-bold text-[#84a93c]">{entry.narration}</td>
                      <td className="px-4 py-3 text-[9px] text-slate-500">
                        {entry.startingReading} → {entry.endingReading}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-amber-600">{entry.machineRunningHour}h</td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-1">
                          {entry.startingReadingPhoto && (
                            <button
                              onClick={() => handleViewImage(entry.startingReadingPhoto)}
                              className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center hover:bg-blue-100"
                              title="View Start Photo"
                            >
                              <Camera size={12} className="text-blue-600" />
                            </button>
                          )}
                          {entry.endingReadingPhoto && (
                            <button
                              onClick={() => handleViewImage(entry.endingReadingPhoto)}
                              className="w-6 h-6 bg-green-50 rounded-lg flex items-center justify-center hover:bg-green-100"
                              title="View End Photo"
                            >
                              <Eye size={12} className="text-green-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

      </div>{/* end tab panel wrapper */}

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="relative max-w-3xl max-h-[90vh]">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300"
            >
              <X size={24} />
            </button>
            <img
              src={selectedImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in zoom-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-4xl my-auto overflow-hidden shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-black text-slate-800">Log Production Entry</h3>
                {selectedSjc && (
                  <p className="text-xs text-[#84a93c] font-bold mt-0.5">
                    {selectedSjc.sjcSrNo} — {selectedSjc.productName}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Read-only job card info */}
              {selectedSjc && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Semi Finished Job Card No.</label>
                    <input
                      readOnly
                      type="text"
                      value={selectedSjc.sjcSrNo}
                      className="w-full px-4 py-2 bg-[#F4F7FE] border-none rounded-xl outline-none font-bold text-xs text-slate-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Semi Finished Production No.</label>
                    <input
                      readOnly
                      type="text"
                      value={selectedSjc.sfSrNo}
                      className="w-full px-4 py-2 bg-[#F4F7FE] border-none rounded-xl outline-none font-bold text-xs text-slate-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Supervisor Name</label>
                    <input
                      readOnly
                      type="text"
                      value={selectedSjc.supervisorName}
                      className="w-full px-4 py-2 bg-[#F4F7FE] border-none rounded-xl outline-none font-bold text-xs text-slate-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Date Of Production</label>
                    <input
                      readOnly
                      type="text"
                      value={selectedSjc.dateOfProduction}
                      className="w-full px-4 py-2 bg-[#F4F7FE] border-none rounded-xl outline-none font-bold text-xs text-slate-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Product Name</label>
                    <input
                      readOnly
                      type="text"
                      value={selectedSjc.productName}
                      className="w-full px-4 py-2 bg-[#F4F7FE] border-none rounded-xl outline-none font-bold text-xs text-slate-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Serial No.</label>
                    <input
                      readOnly
                      type="text"
                      value={serialNo}
                      className="w-full px-4 py-2 bg-[#F4F7FE] border-none rounded-xl outline-none font-bold text-xs text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>
              )}

              {selectedSjc && (
                <>
                  {/* Production Quantity */}
                  <div className="bg-emerald-50/50 p-5 rounded-[24px] border border-emerald-100">
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center mb-3">
                      <Target size={12} className="mr-1.5" /> Production Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">
                          Qty Of Semi Finished Good <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="number"
                          step="0.01"
                          placeholder="Enter quantity produced"
                          value={formData.qtyOfSemiFinishedGood || ''}
                          onChange={e => setFormData({ ...formData, qtyOfSemiFinishedGood: Number(e.target.value) })}
                          className="w-full px-4 py-2 bg-white border-none rounded-xl focus:ring-2 focus:ring-[#84a93c] outline-none font-bold text-emerald-600 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Narration</label>
                        <select
                          value={formData.narration}
                          onChange={e => setFormData({ ...formData, narration: e.target.value })}
                          className="w-full px-4 py-2 bg-white border-none rounded-xl focus:ring-2 focus:ring-[#84a93c] outline-none font-bold text-xs appearance-none"
                        >
                          <option value="">Select Narration</option>
                          {narrationOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Raw Materials - 5 rows */}
                  <div className="bg-[#F4F7FE] p-5 rounded-[24px] border border-slate-100">
                    <h4 className="text-[10px] font-black text-[#84a93c] uppercase tracking-widest flex items-center mb-3">
                      <ArrowRight size={12} className="mr-1.5" /> Raw Materials Consumption
                    </h4>
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map(num => (
                        <div key={num} className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">
                              Raw Material {num} Name
                            </label>
                            <select
                              value={formData[`rawMaterial${num}Name` as keyof typeof formData] as string}
                              onChange={e => setFormData({ ...formData, [`rawMaterial${num}Name`]: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white border-none rounded-lg font-bold text-[10px] appearance-none"
                            >
                              <option value="">Select Material</option>
                              {rawMaterials.map(rm => (
                                <option key={rm.name} value={rm.name}>{rm.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">
                              Quantity {num}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Qty"
                              value={formData[`rawMaterial${num}Qty` as keyof typeof formData] as number || ''}
                              onChange={e => setFormData({ ...formData, [`rawMaterial${num}Qty`]: Number(e.target.value) })}
                              className="w-full px-3 py-1.5 bg-white border-none rounded-lg font-bold text-[10px]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* End Product Section */}
                  <div className="bg-purple-50/50 p-5 rounded-[24px] border border-purple-100">
                    <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center mb-3">
                      <Target size={12} className="mr-1.5" /> End Product Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Is Any End Product?</label>
                        <select
                          value={formData.isAnyEndProduct}
                          onChange={e => setFormData({ ...formData, isAnyEndProduct: e.target.value })}
                          className="w-full px-4 py-2 bg-white border-none rounded-xl focus:ring-2 focus:ring-[#84a93c] outline-none font-bold text-xs appearance-none"
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                      {formData.isAnyEndProduct === 'Yes' && (
                        <>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Raw Material Name</label>
                            <select
                              value={formData.endProductRawMaterialName}
                              onChange={e => setFormData({ ...formData, endProductRawMaterialName: e.target.value })}
                              className="w-full px-4 py-2 bg-white border-none rounded-xl focus:ring-2 focus:ring-[#84a93c] outline-none font-bold text-xs appearance-none"
                            >
                              <option value="">Select Material</option>
                              {rawMaterials.map(rm => (
                                <option key={rm.name} value={rm.name}>{rm.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">End Product Qty</label>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.endProductQty || ''}
                              onChange={e => setFormData({ ...formData, endProductQty: Number(e.target.value) })}
                              className="w-full px-4 py-2 bg-white border-none rounded-xl focus:ring-2 focus:ring-[#84a93c] outline-none font-bold text-xs"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Readings and Photos */}
                  <div className="bg-amber-50/30 p-5 rounded-[24px] border border-amber-100">
                    <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center mb-3">
                      <Settings size={12} className="mr-1.5" /> Machine Readings
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Reading Inputs */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Starting Reading</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={formData.startingReading || ''}
                            onChange={e => setFormData({ ...formData, startingReading: Number(e.target.value) })}
                            className="w-full px-4 py-2 bg-white border-none rounded-xl focus:ring-2 focus:ring-[#84a93c] outline-none font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Ending Reading</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={formData.endingReading || ''}
                            onChange={e => setFormData({ ...formData, endingReading: Number(e.target.value) })}
                            className="w-full px-4 py-2 bg-white border-none rounded-xl focus:ring-2 focus:ring-[#84a93c] outline-none font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Machine Running Hours</label>
                          <input
                            readOnly
                            type="text"
                            value={formData.machineRunningHour > 0 ? formData.machineRunningHour.toFixed(2) : '0'}
                            className="w-full px-4 py-2 bg-slate-100 border-none rounded-xl outline-none font-bold text-xs text-slate-600"
                          />
                        </div>
                      </div>

                      {/* Photo Uploads */}
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Start Photo</label>
                          <input
                            type="file"
                            ref={startPhotoRef}
                            accept="image/*"
                            onChange={handleStartPhotoChange}
                            className="hidden"
                          />
                          {startPhotoPreview ? (
                            <div className="relative">
                              <img
                                src={startPhotoPreview}
                                alt="Start"
                                className="w-full h-24 object-cover rounded-xl"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setStartPhotoFile(null);
                                  setStartPhotoPreview('');
                                }}
                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => startPhotoRef.current?.click()}
                              className="w-full h-24 border-2 border-dashed border-amber-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-amber-50"
                            >
                              <Camera size={20} className="text-amber-400 mb-1" />
                              <span className="text-[8px] font-black text-amber-600 uppercase">Upload</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">End Photo</label>
                          <input
                            type="file"
                            ref={endPhotoRef}
                            accept="image/*"
                            onChange={handleEndPhotoChange}
                            className="hidden"
                          />
                          {endPhotoPreview ? (
                            <div className="relative">
                              <img
                                src={endPhotoPreview}
                                alt="End"
                                className="w-full h-24 object-cover rounded-xl"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setEndPhotoFile(null);
                                  setEndPhotoPreview('');
                                }}
                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => endPhotoRef.current?.click()}
                              className="w-full h-24 border-2 border-dashed border-amber-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-amber-50"
                            >
                              <Upload size={20} className="text-amber-400 mb-1" />
                              <span className="text-[8px] font-black text-amber-600 uppercase">Upload</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold flex items-center">
                      <AlertTriangle size={14} className="mr-2" />
                      {error}
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || isUploading}
                      className="px-10 py-4 bg-[#84a93c] text-white font-black rounded-xl hover:bg-emerald-600 transition-all shadow-lg flex items-center space-x-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {(isSubmitting || isUploading) ? (
                        <>
                          <Loader size={18} className="animate-spin" />
                          <span>{isUploading ? 'Uploading Photos...' : 'Submitting...'}</span>
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          <span>Log Daily Entry</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Step3List;