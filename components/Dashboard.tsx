
import React from 'react';
import { 
  AppState, 
  ProductionStatus 
} from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { TrendingUp, Package, CheckCircle, Clock, ArrowUpRight, ArrowDownRight, Zap, Target } from 'lucide-react';

interface Props {
  state: AppState;
}

const COLORS = ['#84a93c', '#10b981', '#f59e0b', '#ef4444'];

const Dashboard: React.FC<Props> = ({ state }) => {
  const totalOrders = state.productions.length;
  const completedOrders = state.productions.filter(p => p.status === ProductionStatus.COMPLETED).length;
  const totalPlannedQty = state.productions.reduce((sum, p) => sum + p.qty, 0);
  const actualProducedQty = state.actualEntries.reduce((sum, e) => sum + e.qtyProduced, 0);
  const totalCrushedQty = state.crushingEntries.reduce((sum, e) => sum + e.qtyCrushed, 0);

  // Stats calculation
  const overallEfficiency = totalPlannedQty > 0 ? Math.round((actualProducedQty / totalPlannedQty) * 100) : 0;

  const statsCards = [
    { label: 'Total Production', value: `${(totalPlannedQty / 1000).toFixed(1)}k`, unit: 'Units', trend: '+15% from last month', icon: Package, color: 'emerald', bg: 'bg-emerald-50', iconColor: 'text-[#84a93c]' },
    { label: 'Actual Output', value: `${(actualProducedQty / 1000).toFixed(1)}k`, unit: 'Units', trend: '22% growth quality', icon: TrendingUp, color: 'emerald', bg: 'bg-[#E8F5E9]', iconColor: 'text-emerald-500' },
    { label: 'Crushing Yield', value: `${(totalCrushedQty / 1000).toFixed(1)}k`, unit: 'Units', trend: '8% retention', icon: Zap, color: 'amber', bg: 'bg-amber-50', iconColor: 'text-amber-500' },
    { label: 'Open Jobs Today', value: state.jobCards.filter(j => j.actualMade < j.qty).length, unit: 'Active', trend: '4 near completion', icon: Clock, color: 'orange', bg: 'bg-[#FFF3E0]', iconColor: 'text-orange-500' },
  ];

  const achievementItems = state.productions.slice(0, 3).map(p => ({
    label: p.name,
    tag: p.sfSrNo,
    current: p.totalMade,
    total: p.qty,
    percent: Math.round((p.totalMade / p.qty) * 100),
    color: p.status === ProductionStatus.COMPLETED ? 'bg-emerald-500' : 'bg-[#84a93c]'
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all cursor-default">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-tight mb-1">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-800 flex items-baseline">
                {stat.value}
                <span className="text-xs font-bold text-slate-400 ml-1">{stat.unit}</span>
              </h3>
              <p className="text-[10px] font-bold text-slate-400 mt-2 flex items-center">
                <ArrowUpRight size={12} className="text-emerald-500 mr-1" />
                {stat.trend}
              </p>
            </div>
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.iconColor} group-hover:scale-110 transition-transform`}>
              <stat.icon size={28} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Achievement Progress */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Target size={18} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Production Targets & Achievement</h3>
          </div>
          
          <div className="space-y-10">
            {achievementItems.length > 0 ? achievementItems.map((item, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex justify-between items-center text-xs font-bold">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-emerald-50 text-[#84a93c] rounded-md">{item.tag}</span>
                    <span className="text-slate-700">{item.label}</span>
                  </div>
                  <div className="text-slate-400">
                    <span className="text-slate-700">{item.current}</span> / <span className="text-slate-300">{item.total}</span>
                  </div>
                </div>
                <div className="h-4 bg-slate-50 rounded-full overflow-hidden">
                  <div 
                    className={`${item.color} h-full rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                  <span>{item.percent}% achieved</span>
                  <span>{item.total - item.current} remaining</span>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center text-slate-400 text-sm italic">No active production targets</div>
            )}
          </div>
        </div>

        {/* KPI Score Card */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">KPI Score & Efficiency</h3>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center space-y-8">
            <div className="relative w-40 h-40">
              {/* Custom Gauge SVG */}
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#F1F5F9" strokeWidth="8" />
                <circle 
                  cx="50" cy="50" r="45" fill="none" stroke="#84a93c" strokeWidth="8" 
                  strokeDasharray="283" 
                  strokeDashoffset={283 - (283 * overallEfficiency) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-in-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-800">{overallEfficiency}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">/100</span>
              </div>
            </div>

            <div className="w-full space-y-4">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">Output Quality</span>
                <span className="text-slate-800">35/40</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">Machine Uptime</span>
                <span className="text-slate-800">25/30</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">Safety Compliance</span>
                <span className="text-slate-800">15/20</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">Material Waste</span>
                <span className="text-slate-800">7/10</span>
              </div>
            </div>

            <div className="w-full pt-4 border-t border-slate-50 flex justify-between items-center">
              <div>
                <span className="px-2 py-1 bg-emerald-50 text-[#84a93c] text-[10px] font-black rounded uppercase">Grade: A</span>
              </div>
              <span className="text-emerald-500 text-[10px] font-black uppercase">Above Target</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Orders List */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-800 flex items-center">
            <Package size={16} className="mr-2 text-[#84a93c]" />
            Active Production Orders
          </h3>
          <button className="text-[10px] font-black text-[#84a93c] uppercase hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F8FAFC]">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Product</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Value (Qty)</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stage</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completion</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {state.productions.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-[11px] font-bold text-slate-500">{p.sfSrNo}</td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-800">{p.name}</td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-800 text-center">{p.qty}u</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">Production</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full">
                        <div className="bg-[#84a93c] h-full rounded-full" style={{ width: `${Math.round((p.totalMade/p.qty)*100)}%` }}></div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">{Math.round((p.totalMade/p.qty)*100)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                      p.status === ProductionStatus.COMPLETED ? 'bg-emerald-50 text-emerald-500' : 
                      p.status === ProductionStatus.IN_PROGRESS ? 'bg-emerald-50 text-[#84a93c]' : 'bg-amber-50 text-amber-500'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
