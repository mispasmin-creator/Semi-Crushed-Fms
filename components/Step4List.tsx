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
    ArrowRight
} from 'lucide-react';
import {
    SemiActualRecord,
    formatDate,
    formatDisplayDate
} from './src/step3.api';
import {
    fetchStep4Data,
    updateStep4ActualDate
} from './src/step4.api';

// Local update wrapper
const updateActualDate = updateStep4ActualDate;

interface Props {
    state: AppState;
    onUpdate: (updater: (prev: AppState) => AppState) => void;
}

const Step4List: React.FC<Props> = ({ state, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [semiActualData, setSemiActualData] = useState<SemiActualRecord[]>([]);
    const [error, setError] = useState('');

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
        if (!record.rowIndex || !record.actual1ColumnIndex) {
            console.error('Cannot identify row or column for update.');
            return;
        }

        setIsSubmitting(true);
        const timestamp = formatDate(new Date());

        try {
            const success = await updateActualDate(record.rowIndex, record.actual1ColumnIndex, timestamp);
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

    // Filter logic as requested:
    // Pending -> planned1 exists and !actual1
    // History -> planned1 and actual1 both exist
    const pendingOrders = semiActualData.filter(item => {
        const planned1 = String(item.planned1 || '').trim();
        const actual1 = String(item.actual1 || '').trim();
        return planned1 !== '' && actual1 === '';
    });

    const historyOrders = semiActualData.filter(item => {
        const planned1 = String(item.planned1 || '').trim();
        const actual1 = String(item.actual1 || '').trim();
        return planned1 !== '' && actual1 !== '';
    });

    const currentData = activeTab === 'pending' ? pendingOrders : historyOrders;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-slate-800">Actual Production Approval</h2>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                        {isLoading ? 'Loading...' : `${pendingOrders.length} Pending Approval · ${historyOrders.length} Processed · Total: ${semiActualData.length}`}
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
                    Pending ({pendingOrders.length})
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
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entry Info</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Produced Qty</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned1 Date</th>
                                {activeTab === 'history' && (
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actual1 Date</th>
                                )}
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
                                        No entries found in {activeTab} tab.
                                    </td>
                                </tr>
                            ) : (
                                currentData.map((record, index) => (
                                    <tr key={index} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-center">
                                            {activeTab === 'pending' ? (
                                                <button
                                                    onClick={() => handleMarkDone(record)}
                                                    disabled={isSubmitting}
                                                    className="inline-flex items-center px-4 py-2 bg-[#84a93c] text-white rounded-xl hover:bg-emerald-600 transition-all text-[10px] font-black uppercase tracking-tight shadow-md shadow-emerald-50 disabled:opacity-50"
                                                >
                                                    Mark Done
                                                </button>
                                            ) : (
                                                <div className="w-8 h-8 mx-auto bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                                                    <CheckCircle2 size={16} />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-[#84a93c] transition-all border border-transparent group-hover:border-emerald-100">
                                                    <Package size={20} />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="font-bold text-slate-800 text-sm">{record.productName}</div>
                                                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                                                        J.Card: {record.semiFinishedJobCardNo} | Sr: {record.sNo}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-block px-3 py-1 bg-slate-50 rounded-lg text-sm font-black text-slate-700">
                                                {record.qtyOfSemiFinishedGood}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-slate-600 font-bold text-xs">
                                                <Calendar size={14} className="mr-2 text-slate-400" />
                                                {formatDisplayDate(record.planned1 || '')}
                                            </div>
                                        </td>
                                        {activeTab === 'history' && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center text-[#84a93c] font-black text-xs">
                                                    <ArrowRight size={14} className="mr-2" />
                                                    {formatDisplayDate(record.actual1 || '')}
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-tighter ${activeTab === 'pending' ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'
                                                }`}>
                                                {activeTab === 'pending' ? 'In Progress' : 'Completed'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
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
        </div>
    );
};

export default Step4List;
