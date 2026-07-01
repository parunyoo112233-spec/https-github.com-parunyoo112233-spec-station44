/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  FuelInventory, 
  FuelRecord, 
  FuelRequest,
  UserProfile
} from '../types';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Flame, 
  Database, 
  Activity, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Gauge, 
  ArrowRight,
  PlusCircle,
  Shield,
  Truck,
  Layers,
  LineChart
} from 'lucide-react';

interface DashboardProps {
  inventory: FuelInventory[];
  records: FuelRecord[];
  requests: FuelRequest[];
  onNavigateToTab: (tab: string) => void;
  currentUser?: UserProfile | null;
}

export default function Dashboard({ 
  inventory, 
  records, 
  requests,
  onNavigateToTab,
  currentUser
}: DashboardProps) {
  
  // 1. Calculate Key Metrics
  const totalDispensed = useMemo(() => {
    return records.reduce((sum, r) => sum + r.volume, 0);
  }, [records]);

  const totalTransactions = records.length;

  const avgDispensed = useMemo(() => {
    if (totalTransactions === 0) return 0;
    return Math.round((totalDispensed / totalTransactions) * 10) / 10;
  }, [records, totalDispensed, totalTransactions]);

  const pendingCount = useMemo(() => {
    return requests.filter(r => r.status === 'pending').length;
  }, [requests]);

  // Today's summary calculations
  const todayStr = useMemo(() => {
    const local = new Date();
    const offset = local.getTimezoneOffset();
    const d = new Date(local.getTime() - (offset * 60 * 1000));
    return d.toISOString().split('T')[0];
  }, []);

  const todayRecords = useMemo(() => {
    return records.filter(r => r.date === todayStr);
  }, [records, todayStr]);

  const todayTotalDispensed = useMemo(() => {
    return todayRecords.reduce((sum, r) => sum + r.volume, 0);
  }, [todayRecords]);

  const todayBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    todayRecords.forEach(r => {
      counts[r.fuelType] = (counts[r.fuelType] || 0) + r.volume;
    });
    return counts;
  }, [todayRecords]);

  // Thai Date Formatter Helper
  const formatThaiDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const thaiMonthsShort = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const dayNum = parseInt(parts[2], 10);
    const monthNum = parseInt(parts[1], 10) - 1;
    const yearNum = (parseInt(parts[0], 10) + 543) % 100; // e.g. 2569 -> 69
    return `${dayNum} ${thaiMonthsShort[monthNum]} ${yearNum}`;
  };

  // 2. Format Data for Recharts Daily Trend (Last 7 Days)
  const dailyTrendData = useMemo(() => {
    const datesMap: Record<string, Record<string, number>> = {};
    
    // Initialize last 7 days including today
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
      datesMap[dateStr] = {};
    }

    // Populate with records
    records.forEach(r => {
      if (datesMap[r.date] !== undefined) {
        if (!datesMap[r.date][r.fuelType]) {
          datesMap[r.date][r.fuelType] = 0;
        }
        datesMap[r.date][r.fuelType] += r.volume;
      }
    });

    // Format for Recharts
    return Object.entries(datesMap).map(([date, fuelTypes]) => {
      const dParts = date.split('-');
      let label = date;
      if (dParts.length === 3) {
        const thaiMonthsShort = [
          'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 
          'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
        ];
        const dayNum = parseInt(dParts[2], 10);
        const monthNum = parseInt(dParts[1], 10) - 1;
        label = `${dayNum} ${thaiMonthsShort[monthNum]}`;
      }

      const row: any = { dateLabel: label };
      inventory.forEach(inv => {
        row[inv.fuelType] = Math.round(fuelTypes[inv.fuelType] || 0);
      });
      return row;
    });
  }, [records, inventory]);

  // 3. Format Data for Fuel Type Breakdown (Pie Chart)
  const fuelTypePieData = useMemo(() => {
    const totals: Record<string, number> = {};
    inventory.forEach(inv => {
      totals[inv.fuelType] = 0;
    });

    records.forEach(r => {
      if (totals[r.fuelType] !== undefined) {
        totals[r.fuelType] += r.volume;
      }
    });

    return Object.entries(totals).map(([name, value]) => ({
      name,
      value: Math.round(value)
    })).filter(item => item.value > 0);
  }, [records, inventory]);

  // 4. Format Data for Unit Breakdown (Bar Chart)
  const unitBarData = useMemo(() => {
    const totals: Record<string, number> = {};
    records.forEach(r => {
      totals[r.unit] = (totals[r.unit] || 0) + r.volume;
    });

    return Object.entries(totals)
      .map(([name, value]) => ({
        name,
        value: Math.round(value)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // top 5 units
  }, [records]);

  // Colors for fuel types in charts matching mock exactly
  const FUEL_COLORS: Record<string, string> = {
    'น้ำมันดีเซล': '#10B981',       // Emerald
    'น้ำมันแก๊สโซฮอล์ 95': '#3B82F6', // Blue
    'น้ำมันแก๊สโซฮอล์ 91': '#F59E0B', // Amber
    'ดีเซล B7': '#10B981',       // Emerald
    'ดีเซล': '#059669',          // Dark Emerald
    'แก๊สโซฮอล์ 95': '#3B82F6',   // Blue
    'แก๊สโซฮอล์ 91': '#F59E0B',   // Amber
  };

  const PIE_COLORS = ['#10B981', '#059669', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];

  const userRole = currentUser?.role || 'user';

  return (
    <div id="dashboard_view" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
      
      {/* 1. Daily Summary Card (Primary) [Grid Span: 4 Cols] */}
      <section id="bento_daily_summary" className="lg:col-span-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700/80 p-6 flex flex-col justify-between min-h-[220px] shadow-lg">
        <div className="flex justify-between items-start">
          <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/20 uppercase tracking-wider">
            สรุปยอดวันนี้
          </span>
          <TrendingUp className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="my-3">
          <div className="text-3xl sm:text-4xl font-black mb-1 italic text-white font-display">
            {todayTotalDispensed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            <span className="text-sm font-normal text-slate-400 not-italic">ลิตร</span>
          </div>
          <p className="text-slate-400 text-xs italic">ยอดจ่ายรวมประจำวันที่ {formatThaiDate(todayStr)}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">ดีเซล</p>
            <p className="font-bold text-base text-slate-200">
              {((todayBreakdown['น้ำมันดีเซล'] || 0) + (todayBreakdown['ดีเซล B7'] || 0) + (todayBreakdown['ดีเซล'] || 0)).toLocaleString()}{' '}
              <span className="text-[10px] font-normal text-slate-400">L</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">เบนซิน/แก๊สโซฮอล์</p>
            <p className="font-bold text-base text-amber-500">
              {((todayBreakdown['น้ำมันแก๊สโซฮอล์ 95'] || 0) + (todayBreakdown['แก๊สโซฮอล์ 95'] || 0) + (todayBreakdown['น้ำมันแก๊สโซฮอล์ 91'] || 0) + (todayBreakdown['แก๊สโซฮอล์ 91'] || 0)).toLocaleString()}{' '}
              <span className="text-[10px] font-normal text-slate-400">L</span>
            </p>
          </div>
        </div>
      </section>

      {/* 2. Monthly Target Chart / 7-Day Trend [Grid Span: 5 Cols] */}
      <section id="bento_weekly_trend" className="lg:col-span-5 bg-slate-800/40 rounded-2xl border border-slate-700/80 p-6 flex flex-col justify-between shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <LineChart className="h-4 w-4 text-emerald-400" />
            สถิติการจ่ายรายวัน (7 วันล่าสุด)
          </h3>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">จ่ายจริง</span>
          </div>
        </div>
        <div className="w-full h-32">
          {records.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
              ไม่มีข้อมูลการจ่ายน้ำมันในระบบ
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTrendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <XAxis dataKey="dateLabel" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                />
                {inventory.map((inv) => (
                  <Bar 
                    key={inv.fuelType} 
                    dataKey={inv.fuelType} 
                    stackId="a" 
                    fill={FUEL_COLORS[inv.fuelType] || '#10B981'} 
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="flex justify-between mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400 font-mono">
          <span>แนวโน้มยอดการเบิกจ่ายสอดคล้องกับแผนที่กำหนดไว้</span>
        </div>
      </section>

      {/* 3. System Status (Small) [Grid Span: 3 Cols] */}
      <section id="bento_status_small" className="lg:col-span-3 bg-emerald-600 rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-emerald-900/20 text-white hover:opacity-95 transition">
        <div>
          <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider">Cloud Database</p>
          <p className="text-white font-extrabold text-lg">Firebase Active</p>
          <span className="text-[10px] text-emerald-100/80 uppercase font-mono block mt-1">Real-time Connected</span>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
          <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></div>
        </div>
      </section>

      {/* 4. Quick Action (Small) [Grid Span: 3 Cols] */}
      <section 
        id="bento_quick_action"
        onClick={() => onNavigateToTab(userRole === 'officer' ? 'record' : 'request')}
        className="lg:col-span-3 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-slate-700/80 p-5 flex items-center gap-4 cursor-pointer transition shadow-lg group"
      >
        <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center transition group-hover:scale-105 duration-200">
          <PlusCircle className="w-6 h-6" />
        </div>
        <div>
          <p className="text-white font-bold group-hover:text-emerald-300 transition text-sm">
            {userRole === 'officer' ? 'บันทึกจ่ายน้ำมันใหม่' : 'เขียนคำขอใหม่'}
          </p>
          <p className="text-slate-400 text-[10px] uppercase font-mono tracking-wider mt-0.5">Quick Dispatch Log</p>
        </div>
      </section>

      {/* 5. Accumulative Fuel Proportion Chart (Pie Chart) [Grid Span: 4 Cols] */}
      <section id="bento_fuel_pie" className="lg:col-span-4 bg-slate-800/30 rounded-2xl border border-slate-700/80 p-5 flex flex-col justify-between shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            สัดส่วนปริมาณการจ่ายน้ำมันสะสม
          </h3>
        </div>
        
        <div className="w-full h-36 flex items-center justify-center relative">
          {fuelTypePieData.length === 0 ? (
            <div className="text-slate-500 text-xs italic">ไม่มีข้อมูลสะสม</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fuelTypePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={54}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {fuelTypePieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={FUEL_COLORS[entry.name] || PIE_COLORS[index % PIE_COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value} ลิตร`, 'ยอดเติมสะสม']}
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          {fuelTypePieData.length > 0 && (
            <div className="absolute flex flex-col items-center">
              <span className="text-lg font-black text-white font-display leading-none">
                {totalDispensed.toLocaleString()}
              </span>
              <span className="text-[8px] text-slate-400 uppercase tracking-widest mt-1">LITERS TOTAL</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5 mt-2 text-[10px] border-t border-slate-800/50 pt-2">
          {fuelTypePieData.map((entry, idx) => {
            const color = FUEL_COLORS[entry.name] || PIE_COLORS[idx % PIE_COLORS.length];
            const pct = totalDispensed > 0 ? Math.round((entry.value / totalDispensed) * 100) : 0;
            return (
              <div key={entry.name} className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></span>
                <span className="truncate">{entry.name}: <span className="font-bold text-white font-mono">{pct}%</span></span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. High-Consumption Units Chart (Bar Chart) [Grid Span: 5 Cols] */}
      <section id="bento_top_units" className="lg:col-span-5 bg-slate-800/30 rounded-2xl border border-slate-700/80 p-5 flex flex-col justify-between shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="h-4 w-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            ยอดหน่วยเบิกจ่ายสูงสุด (Top 5 Units)
          </h3>
        </div>
        
        <div className="w-full h-36">
          {unitBarData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
              ไม่มีข้อมูลการเบิกจากหน่วย
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={unitBarData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 8 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 9 }} width={75} />
                <Tooltip 
                  formatter={(value) => [`${value} ลิตร`, 'ยอดรวม']}
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* 7. Key Operational Metrics Summary [Grid Span: 3 Cols] */}
      <section id="bento_stats_metrics" className="lg:col-span-3 grid grid-cols-2 gap-2 shadow-lg">
        {/* Metric A */}
        <div className="bg-slate-800/40 border border-slate-700/60 p-3 rounded-2xl flex flex-col justify-between">
          <div className="p-1.5 bg-blue-600/10 text-blue-400 rounded-lg w-fit">
            <Activity className="h-4 w-4" />
          </div>
          <div className="mt-2">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold">บันทึกรวม</span>
            <span className="text-xl font-black text-white font-mono">{totalTransactions.toLocaleString()}</span>
            <span className="text-[9px] text-slate-500 block">ครั้ง</span>
          </div>
        </div>

        {/* Metric B */}
        <div className="bg-slate-800/40 border border-slate-700/60 p-3 rounded-2xl flex flex-col justify-between">
          <div className="p-1.5 bg-purple-600/10 text-purple-400 rounded-lg w-fit">
            <Gauge className="h-4 w-4" />
          </div>
          <div className="mt-2">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold">เฉลี่ยต่อคัน</span>
            <span className="text-xl font-black text-white font-mono">{avgDispensed.toLocaleString()}</span>
            <span className="text-[9px] text-slate-500 block">ลิตร</span>
          </div>
        </div>
      </section>

      {/* 8. Recent Transaction Table [Grid Span: 9 Cols] */}
      <section id="bento_transaction_table" className="lg:col-span-9 bg-[#111827]/40 rounded-2xl border border-slate-700/80 flex flex-col overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800/80 flex justify-between items-center bg-slate-800/40">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
            บันทึกรายการล่าสุด (Recent Dispatches)
          </h3>
          <button 
            onClick={() => onNavigateToTab('records')}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-300 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium"
          >
            ดูรายงานทั้งหมด
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-[10px] text-slate-400 uppercase border-b border-slate-800/80 bg-slate-900/60">
              <tr>
                <th className="px-6 py-3 font-semibold tracking-wider">วัน-เวลา</th>
                <th className="px-6 py-3 font-semibold tracking-wider">ทะเบียน/สังกัด</th>
                <th className="px-6 py-3 font-semibold tracking-wider">ประเภทน้ำมัน</th>
                <th className="px-6 py-3 font-semibold tracking-wider">จำนวน (ลิตร)</th>
                <th className="px-6 py-3 font-semibold tracking-wider">เจ้าหน้าที่ผู้จ่าย</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-800/50">
              {records.slice(0, 5).map((rec) => {
                const isDiesel = rec.fuelType.includes('ดีเซล');
                const badgeClass = isDiesel 
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20';

                return (
                  <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-3 text-slate-400 font-mono text-xs">
                      {rec.date} {rec.time || ''}
                    </td>
                    <td className="px-6 py-3">
                      <div className="font-bold text-slate-200">{rec.vehicleNo}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{rec.unit}</div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${badgeClass}`}>
                        {rec.fuelType}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-extrabold text-slate-100 font-mono text-sm">
                      {rec.volume.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                    </td>
                    <td className="px-6 py-3 text-slate-400 font-medium">
                      {rec.officerName || 'เจ้าหน้าที่'}
                    </td>
                  </tr>
                );
              })}
              {records.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-500 italic">
                    ไม่มีประวัติการจ่ายน้ำมันในระบบ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 9. Tank Levels (Narrow) [Grid Span: 3 Cols] */}
      <section id="bento_tanks_sidebar" className="lg:col-span-3 flex flex-col gap-4 shadow-xl">
        {inventory.map((inv, idx) => {
          const pct = Math.round((inv.currentStock / inv.capacity) * 100);
          const isDiesel = inv.fuelType.includes('ดีเซล');
          const isLow = pct < 25;
          const barColor = isLow ? 'bg-red-500' : isDiesel ? 'bg-blue-500' : 'bg-amber-500';
          const labelColor = isLow ? 'text-red-400 font-black animate-pulse' : isDiesel ? 'text-blue-400' : 'text-amber-400';

          return (
            <div 
              key={inv.id || idx} 
              className="bg-slate-850 bg-slate-800/40 rounded-2xl border border-slate-700/80 p-5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  คงเหลือ: {inv.fuelType} (ถัง {idx + 1})
                </p>
                {isLow && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </div>
              <div className="flex flex-col justify-end gap-2">
                <div className="flex justify-between items-end text-white">
                  <span className="text-2xl font-black font-display tracking-tight">
                    {inv.currentStock.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 pb-1 italic font-mono">
                    / {inv.capacity.toLocaleString()} L
                  </span>
                </div>
                <div className="h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${barColor}`} 
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
                <p className={`text-right text-[10px] font-bold ${labelColor}`}>
                  {pct}% ของความจุ
                </p>
              </div>
            </div>
          );
        })}
      </section>

    </div>
  );
}
