import React, { useState, useEffect } from 'react';
import {
    AppState,
} from '../types';
import {
    CheckCircle2,
    Clock,
    RefreshCw,
    Loader,
    AlertTriangle,
    Calendar,
    Package,
    ArrowRight,
    UserCog,
    Eye,
    X
} from 'lucide-react';
import {
    SemiActualRecord,
    formatDate,
    formatDisplayDate
} from './src/step3.api';
import {
    fetchStep4Data,
    updateStep4ActualDate,
    updateStep4Actual2Date
} from './src/step4.api';

interface Props {
    state: AppState;
    onUpdate: (updater: (prev: AppState) => AppState) => void;
}

type TabType = 'pending' | 'production-incharge' | 'history';

const Step4List: React.FC<Props> = ({ state, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<TabType>('pending');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [semiActualData, setSemiActualData] = useState<SemiActualRecord[]>([]);
    const [error, setError] = useState('');
    const [selectedRecord, setSelectedRecord] = useState<SemiActualRecord | null>(null);
    const [showPopup, setShowPopup] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await fetchStep4Data();
            setSemiActualData(data);
        } catch (err) {
            console.error('Error loading semi actual data:', err);
            setError('Failed to load data. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkDone = async (record: SemiActualRecord) => {
        if (!record.rowIndex) {
            console.error('Cannot identify row for update.');
            return;
        }

        setIsSubmitting(true);
        const timestamp = formatDate(new Date());

        try {
            let success = false;

            if (activeTab === 'pending') {
                // For Pending tab - update Actual1
                if (!record.actual1ColumnIndex) {
                    console.error('Cannot identify column for Actual1 update.');
                    setIsSubmitting(false);
                    return;
                }
                success = await updateStep4ActualDate(record.rowIndex, record.actual1ColumnIndex, timestamp);
            } else if (activeTab === 'production-incharge') {
                // For Production Incharge tab - update Actual2
                if (!record.actual2ColumnIndex) {
                    console.error('Cannot identify column for Actual2 update.');
                    setIsSubmitting(false);
                    return;
                }
                success = await updateStep4Actual2Date(record.rowIndex, record.actual2ColumnIndex, timestamp);
            }

            if (success) {
                // Refresh data silently
                await loadData();
            } else {
                console.error('Failed to update. Please check the Apps Script console for errors.');
            }
        } catch (err) {
            console.error('Error marking as done:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewDetails = (record: SemiActualRecord) => {
        setSelectedRecord(record);
        setShowPopup(true);
    };

    const closePopup = () => {
        setShowPopup(false);
        setSelectedRecord(null);
    };

    // Filter logic:
    // Pending -> planned1 exists and !actual1
    // Production Incharge -> planned2 exists and !actual2
    // History -> planned1 and actual1 both exist OR planned2 and actual2 both exist
    const pendingOrders = semiActualData.filter(item => {
        const planned1 = String(item.planned1 || '').trim();
        const actual1 = String(item.actual1 || '').trim();
        return planned1 !== '' && actual1 === '';
    });

    const productionInchargeOrders = semiActualData.filter(item => {
        const planned2 = String(item.planned2 || '').trim();
        const actual2 = String(item.actual2 || '').trim();
        return planned2 !== '' && actual2 === '';
    });

    const historyOrders = semiActualData.filter(item => {
        const planned1 = String(item.planned1 || '').trim();
        const actual1 = String(item.actual1 || '').trim();
        const planned2 = String(item.planned2 || '').trim();
        const actual2 = String(item.actual2 || '').trim();

        // Show in history if either:
        // 1. Planned1 and Actual1 both exist, OR
        // 2. Planned2 and Actual2 both exist
        return (planned1 !== '' && actual1 !== '') || (planned2 !== '' && actual2 !== '');
    });

    const getCurrentData = () => {
        switch (activeTab) {
            case 'pending':
                return pendingOrders;
            case 'production-incharge':
                return productionInchargeOrders;
            case 'history':
                return historyOrders;
            default:
                return [];
        }
    };

    const getTabCount = (tab: TabType) => {
        switch (tab) {
            case 'pending':
                return pendingOrders.length;
            case 'production-incharge':
                return productionInchargeOrders.length;
            case 'history':
                return historyOrders.length;
            default:
                return 0;
        }
    };

    const currentData = getCurrentData();

    const getStatus = (record: SemiActualRecord) => {
        if (activeTab === 'pending') {
            return {
                label: 'Pending Approval',
                className: 'bg-amber-50 text-amber-500'
            };
        } else if (activeTab === 'production-incharge') {
            return {
                label: 'Production Pending',
                className: 'bg-purple-50 text-purple-500'
            };
        } else {
            // For history, determine which stage is completed
            const hasActual1 = String(record.actual1 || '').trim() !== '';
            const hasActual2 = String(record.actual2 || '').trim() !== '';

            if (hasActual1 && hasActual2) {
                return {
                    label: 'Fully Completed',
                    className: 'bg-emerald-50 text-emerald-500'
                };
            } else if (hasActual1) {
                return {
                    label: 'Stage 1 Completed',
                    className: 'bg-blue-50 text-blue-500'
                };
            } else if (hasActual2) {
                return {
                    label: 'Stage 2 Completed',
                    className: 'bg-indigo-50 text-indigo-500'
                };
            }

            return {
                label: 'Completed',
                className: 'bg-emerald-50 text-emerald-500'
            };
        }
    };

    const renderDateCell = (record: SemiActualRecord) => {
        if (activeTab === 'history') {
            return (
                <div className="space-y-2">
                    {record.planned1 && record.actual1 && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-medium">Stage 1:</span>
                            <div className="flex items-center">
                                <span className="text-slate-600 mr-2">{formatDisplayDate(record.planned1)}</span>
                                <ArrowRight size={12} className="text-[#84a93c] mr-2" />
                                <span className="text-[#84a93c] font-black">{formatDisplayDate(record.actual1)}</span>
                            </div>
                        </div>
                    )}
                    {record.planned2 && record.actual2 && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-medium">Stage 2:</span>
                            <div className="flex items-center">
                                <span className="text-slate-600 mr-2">{formatDisplayDate(record.planned2)}</span>
                                <ArrowRight size={12} className="text-purple-500 mr-2" />
                                <span className="text-purple-500 font-black">{formatDisplayDate(record.actual2)}</span>
                            </div>
                        </div>
                    )}
                </div>
            );
        } else {
            const plannedDate = activeTab === 'pending' ? record.planned1 : record.planned2;
            return (
                <div className="flex items-center text-slate-600 font-bold text-xs">
                    <Calendar size={14} className="mr-2 text-slate-400" />
                    {formatDisplayDate(plannedDate || '')}
                </div>
            );
        }
    };

    const getActionButtons = (record: SemiActualRecord) => {
        return (
            <div className="flex items-center justify-center space-x-2">
                <button
                    onClick={() => handleViewDetails(record)}
                    className="inline-flex items-center px-3 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all text-[10px] font-black uppercase tracking-tight"
                >
                    <Eye size={14} className="mr-1" />
                    View
                </button>
                {(activeTab === 'pending' || activeTab === 'production-incharge') && (
                    <button
                        onClick={() => handleMarkDone(record)}
                        disabled={isSubmitting}
                        className="inline-flex items-center px-3 py-2 bg-[#84a93c] text-white rounded-xl hover:bg-emerald-600 transition-all text-[10px] font-black uppercase tracking-tight shadow-md shadow-emerald-50 disabled:opacity-50"
                    >
                        Mark Done
                    </button>
                )}
            </div>
        );
    };

    const DetailRow = ({ label, value }: { label: string; value: string | number | undefined }) => (
        <div className="flex py-2 border-b border-slate-50 last:border-0">
            <span className="w-1/3 text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}:</span>
            <span className="w-2/3 text-xs font-medium text-slate-700">{value || '-'}</span>
        </div>
    );

    const PhotoLink = ({ label, url }: { label: string; url: string | undefined }) => (
        url && url.trim() !== '' ? (
            <div className="flex py-2 border-b border-slate-50">
                <span className="w-1/3 text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}:</span>
                <span className="w-2/3">
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#84a93c] hover:underline text-xs font-medium inline-flex items-center"
                    >
                        <Eye size={12} className="mr-1" />
                        View Photo
                    </a>
                </span>
            </div>
        ) : null
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-slate-800">Actual Production Approval</h2>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                        {isLoading ? 'Loading...' :
                            `${pendingOrders.length} Pending · ${productionInchargeOrders.length} Production · ${historyOrders.length} Processed · Total: ${semiActualData.length}`}
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={loadData}
                        disabled={isLoading}
                        className="flex items-center px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all font-bold disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
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
                    Supervisor  ({pendingOrders.length})
                </button>
                <button
                    onClick={() => setActiveTab('production-incharge')}
                    className={`flex items-center px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'production-incharge'
                        ? 'bg-[#84a93c] text-white shadow-lg shadow-emerald-100'
                        : 'text-slate-500 hover:bg-white hover:text-slate-800'
                        }`}
                >
                    <UserCog size={14} className="mr-2" />
                    Production Incharge ({productionInchargeOrders.length})
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'history'
                        ? 'bg-[#84a93c] text-white shadow-lg shadow-emerald-100'
                        : 'text-slate-500 hover:bg-white hover:text-slate-800'
                        }`}
                >
                    <CheckCircle2 size={14} className="mr-2" />
                    History ({historyOrders.length})
                </button>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#F8FAFC]">
                            <tr>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Card No.</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Name</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {activeTab === 'pending' ? 'Planned1 Date' :
                                        activeTab === 'production-incharge' ? 'Planned2 Date' :
                                            'Production Dates'}
                                </th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <Loader size={24} className="animate-spin text-[#84a93c]" />
                                            <p className="text-slate-400 text-sm font-medium">Syncing with system...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-slate-400 text-sm font-medium">
                                        No entries found in {activeTab === 'pending' ? 'Pending' :
                                            activeTab === 'production-incharge' ? 'Production Incharge' :
                                                'History'} tab.
                                    </td>
                                </tr>
                            ) : (
                                currentData.map((record, index) => {
                                    const status = getStatus(record);
                                    return (
                                        <tr key={index} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 text-center">
                                                {getActionButtons(record)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 text-sm">{record.semiFinishedJobCardNo}</div>
                                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                                                    Sr: {record.sNo}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-700">{record.productName}</div>
                                                <div className="text-[10px] text-slate-400">
                                                    {record.supervisorName}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-block px-3 py-1 bg-slate-50 rounded-lg text-sm font-black text-slate-700">
                                                    {record.qtyOfSemiFinishedGood}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {renderDateCell(record)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-tighter ${status.className}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center text-red-600 text-xs font-bold">
                    <AlertTriangle size={16} className="mr-2" />
                    {error}
                </div>
            )}

            {/* Details Popup */}
            {showPopup && selectedRecord && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        {/* Popup Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Production Details</h3>
                                <p className="text-xs text-slate-400 font-medium">
                                    Job Card: {selectedRecord.semiFinishedJobCardNo} | S.No: {selectedRecord.sNo}
                                </p>
                            </div>
                            <button
                                onClick={closePopup}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        {/* Popup Content - Scrollable */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                            <div className="grid grid-cols-2 gap-6">
                                {/* Left Column */}
                                <div className="space-y-1">
                                    <h4 className="text-xs font-black text-[#84a93c] uppercase tracking-wider mb-3">Basic Information</h4>
                                    <DetailRow label="Job Card No." value={selectedRecord.semiFinishedJobCardNo} />
                                    <DetailRow label="Supervisor Name" value={selectedRecord.supervisorName} />
                                    <DetailRow label="Date of Production" value={formatDisplayDate(selectedRecord.dateOfProduction)} />
                                    <DetailRow label="Product Name" value={selectedRecord.productName} />
                                    <DetailRow label="Qty of Semi Finished" value={selectedRecord.qtyOfSemiFinishedGood} />
                                    <DetailRow label="S No." value={selectedRecord.sNo} />
                                    <DetailRow label="Semi Finished Production No." value={selectedRecord.semiFinishedProductionNo} />
                                </div>

                                {/* Right Column */}
                                <div className="space-y-1">
                                    <h4 className="text-xs font-black text-[#84a93c] uppercase tracking-wider mb-3">Raw Materials</h4>
                                    <DetailRow label="Raw Material 1" value={`${selectedRecord.rawMaterial1Name} (${selectedRecord.rawMaterial1Qty})`} />
                                    <DetailRow label="Raw Material 2" value={`${selectedRecord.rawMaterial2Name} (${selectedRecord.rawMaterial2Qty})`} />
                                    <DetailRow label="Raw Material 3" value={`${selectedRecord.rawMaterial3Name} (${selectedRecord.rawMaterial3Qty})`} />
                                    <DetailRow label="Raw Material 4" value={`${selectedRecord.rawMaterial4Name} (${selectedRecord.rawMaterial4Qty})`} />
                                    <DetailRow label="Raw Material 5" value={`${selectedRecord.rawMaterial5Name} (${selectedRecord.rawMaterial5Qty})`} />
                                </div>
                            </div>

                            {/* End Product Section */}
                            {(selectedRecord.isAnyEndProduct === 'Yes' || selectedRecord.endProductQty > 0) && (
                                <div className="mt-6 pt-6 border-t border-slate-100">
                                    <h4 className="text-xs font-black text-[#84a93c] uppercase tracking-wider mb-3">End Product</h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        <DetailRow label="Is Any End Product" value={selectedRecord.isAnyEndProduct} />
                                        <DetailRow label="End Product Raw Material" value={selectedRecord.endProductRawMaterialName} />
                                        <DetailRow label="End Product Qty" value={selectedRecord.endProductQty} />
                                    </div>
                                </div>
                            )}

                            {/* Machine Readings */}
                            <div className="mt-6 pt-6 border-t border-slate-100">
                                <h4 className="text-xs font-black text-[#84a93c] uppercase tracking-wider mb-3">Machine Details</h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <DetailRow label="Starting Reading" value={selectedRecord.startingReading} />
                                    <DetailRow label="Ending Reading" value={selectedRecord.endingReading} />
                                    <DetailRow label="Machine Running Hour" value={selectedRecord.machineRunningHour} />
                                    <DetailRow label="Machine Running" value={selectedRecord.machineRunning} />
                                </div>

                                {/* Photo Links */}
                                <div className="mt-4">
                                    <PhotoLink label="Starting Reading Photo" url={selectedRecord.startingReadingPhoto} />
                                    <PhotoLink label="Ending Reading Photo" url={selectedRecord.endingReadingPhoto} />
                                </div>
                            </div>

                            {/* Planning Dates */}
                            <div className="mt-6 pt-6 border-t border-slate-100">
                                <h4 className="text-xs font-black text-[#84a93c] uppercase tracking-wider mb-3">Planning & Actual Dates</h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <DetailRow label="Planned1" value={formatDisplayDate(selectedRecord.planned1 || '')} />
                                    <DetailRow label="Actual1" value={formatDisplayDate(selectedRecord.actual1 || '')} />
                                    <DetailRow label="Planned2" value={formatDisplayDate(selectedRecord.planned2 || '')} />
                                    <DetailRow label="Actual2" value={formatDisplayDate(selectedRecord.actual2 || '')} />
                                </div>
                            </div>

                            {/* Narration */}
                            {selectedRecord.narration && (
                                <div className="mt-6 pt-6 border-t border-slate-100">
                                    <h4 className="text-xs font-black text-[#84a93c] uppercase tracking-wider mb-3">Narration</h4>
                                    <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl">
                                        {selectedRecord.narration}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Popup Footer */}
                        <div className="flex justify-end p-6 border-t border-slate-100">
                            <button
                                onClick={closePopup}
                                className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all font-bold text-xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Step4List;