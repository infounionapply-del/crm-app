import React, { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useLanguage, useT } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Target, Clock, Trophy, Activity, FileText, CheckCircle, XCircle, MapPin } from 'lucide-react';

const COLORS = ['#0ea5e9', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#64748b'];

const Reports: React.FC = () => {
  const t = useT();
  const { jobs, quotations, checkIns, salesReps, formatCurrency } = useData();
  const [dateRange, setDateRange] = useState<'this_month' | 'last_month' | 'this_year' | 'all'>('this_month');
  const [selectedRep, setSelectedRep] = useState<string>('all');

  // Filter jobs based on date and rep
  const filteredJobs = useMemo(() => {
    let filtered = [...jobs];
    
    // Filter by rep
    if (selectedRep !== 'all') {
      filtered = filtered.filter(j => j.created_by === selectedRep);
    }
    
    // Filter by date (approximate using created_at if available, otherwise just use all for simplicity if date isn't strictly enforced on Jobs yet)
    // Note: Since jobs might not have reliable created_at in some legacy data, we will filter quotations mainly.
    // But let's try to filter jobs if they have date.
    
    return filtered;
  }, [jobs, selectedRep, dateRange]);

  const getStageTranslation = (stage: string) => {
    const key = stage.toLowerCase().replace(' ', '_');
    return t(`report.stage_${key}`) || stage;
  };

  const kpis = useMemo(() => {
    // Current Period vs Previous Period for Growth
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthDate = new Date(now.setMonth(now.getMonth() - 1));
    const prevMonthPrefix = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const wonJobs = filteredJobs.filter(j => j.stage === 'Closed Won');
    const lostJobs = filteredJobs.filter(j => ['Closed Lost', 'Cancel'].includes(j.stage));
    
    // Revenue
    const getRevenue = (periodPrefix?: string) => {
      const qts = quotations.filter(q => 
        wonJobs.find(wj => wj.id === q.job_id) && 
        ['Won', 'Order Pending', 'In Process', 'FG', 'Delivery', 'Approved'].includes(q.status) &&
        (!periodPrefix || (q.created_at && q.created_at.startsWith(periodPrefix)))
      );
      return qts.reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);
    };

    const currentRevenue = getRevenue(dateRange === 'this_month' ? currentMonthPrefix : undefined);
    const prevRevenue = getRevenue(prevMonthPrefix);
    const growth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Conversion
    const totalDecided = wonJobs.length + lostJobs.length;
    const conversionRate = totalDecided > 0 ? (wonJobs.length / totalDecided) * 100 : 0;

    // Sales Cycle (approximate using history length or dummy if no dates)
    let totalCycleDays = 0;
    let cycleCount = 0;
    wonJobs.forEach(job => {
      if (job.history && job.history.length > 1) {
        const start = new Date(job.history[job.history.length - 1].timestamp || new Date(job.history[job.history.length - 1].date).getTime());
        const end = new Date(job.history[0].timestamp || new Date(job.history[0].date).getTime());
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          totalCycleDays += (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
          cycleCount++;
        }
      }
    });
    const avgSalesCycle = cycleCount > 0 ? Math.round(totalCycleDays / cycleCount) : 0;

    // Top Performer
    const repRevenues: Record<string, number> = {};
    quotations.forEach(q => {
      if (['Won', 'Order Pending', 'In Process', 'FG', 'Delivery', 'Approved'].includes(q.status)) {
        const job = jobs.find(j => j.id === q.job_id && j.stage === 'Closed Won');
        if (job && job.created_by) {
          repRevenues[job.created_by] = (repRevenues[job.created_by] || 0) + (Number(q.total_amount) || 0);
        }
      }
    });
    
    let topRepId = '';
    let maxRev = 0;
    Object.entries(repRevenues).forEach(([id, rev]) => {
      if (rev > maxRev) {
        maxRev = rev;
        topRepId = id;
      }
    });
    const topRep = salesReps.find(r => r.id === topRepId);

    return {
      revenue: currentRevenue,
      growth,
      conversionRate,
      avgSalesCycle,
      topPerformer: topRep ? topRep.name : 'N/A'
    };
  }, [filteredJobs, quotations, jobs, salesReps, dateRange]);

  // 2. Sales Funnel
  const funnelData = useMemo(() => {
    const stages = ['Open', 'Assigned', 'QT Approve', 'Negotiating', 'Closed Won'];
    let count = filteredJobs.length; // Max at top
    
    return stages.map(stage => {
      // Very simplified funnel: just counting how many are in or past this stage
      let stageCount = 0;
      if (stage === 'Open') stageCount = filteredJobs.filter(j => !['Closed Lost', 'Cancel'].includes(j.stage)).length;
      else if (stage === 'Assigned') stageCount = filteredJobs.filter(j => !['Open', 'Closed Lost', 'Cancel'].includes(j.stage)).length;
      else if (stage === 'QT Approve') stageCount = filteredJobs.filter(j => ['QT Approve', 'Negotiating', 'Revision', 'Closed Won'].includes(j.stage)).length;
      else if (stage === 'Negotiating') stageCount = filteredJobs.filter(j => ['Negotiating', 'Revision', 'Closed Won'].includes(j.stage)).length;
      else if (stage === 'Closed Won') stageCount = filteredJobs.filter(j => j.stage === 'Closed Won').length;

      return {
        name: getStageTranslation(stage),
        Count: stageCount
      };
    });
  }, [filteredJobs, t]);

  // 3. Revenue Trend
  const trendData = useMemo(() => {
    // Group won quotations by month (last 6 months)
    const months: string[] = [];
    const data: Record<string, number> = {};
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const shortName = d.toLocaleString('default', { month: 'short' });
      months.push(mStr);
      data[mStr] = 0;
    }

    const wonJobs = jobs.filter(j => j.stage === 'Closed Won').map(j => j.id);
    quotations.forEach(q => {
      if (wonJobs.includes(q.job_id) && ['Won', 'Order Pending', 'In Process', 'FG', 'Delivery', 'Approved'].includes(q.status)) {
        if (q.created_at) {
          const mStr = q.created_at.substring(0, 7);
          if (data[mStr] !== undefined) {
            data[mStr] += Number(q.total_amount) || 0;
          }
        }
      }
    });

    return months.map(mStr => {
      const d = new Date(mStr + '-01');
      return {
        name: d.toLocaleString('default', { month: 'short' }),
        Revenue: data[mStr]
      };
    });
  }, [jobs, quotations]);

  // 4. Sales Performance
  const performanceData = useMemo(() => {
    return salesReps.map(rep => {
      const repWonJobs = jobs.filter(j => j.created_by === rep.id && j.stage === 'Closed Won').map(j => j.id);
      const repLostJobs = jobs.filter(j => j.created_by === rep.id && ['Closed Lost', 'Cancel'].includes(j.stage)).map(j => j.id);
      
      const wonQs = quotations.filter(q => repWonJobs.includes(q.job_id) && ['Won', 'Order Pending', 'In Process', 'FG', 'Delivery', 'Approved'].includes(q.status));
      const revenue = wonQs.reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);
      
      const total = repWonJobs.length + repLostJobs.length;
      const winRate = total > 0 ? Math.round((repWonJobs.length / total) * 100) : 0;

      return {
        name: rep.name.split(' ')[0],
        Revenue: revenue,
        WinRate: winRate
      };
    }).sort((a, b) => b.Revenue - a.Revenue);
  }, [salesReps, jobs, quotations]);

  // 5. Opportunity Analysis
  const pipelineData = useMemo(() => {
    const activeStages = ['Open', 'Assigned', 'QT Approve', 'Negotiating', 'Revision'];
    return activeStages.map(stage => {
      const stageJobs = filteredJobs.filter(j => j.stage === stage);
      const value = stageJobs.reduce((sum, j) => sum + (Number(String(j.value).replace(/[^0-9.-]+/g, "")) || 0), 0);
      return {
        name: getStageTranslation(stage),
        value: stageJobs.length,
        totalValue: value
      };
    }).filter(d => d.value > 0);
  }, [filteredJobs, t]);

  const avgDealSize = useMemo(() => {
    const wonJobs = filteredJobs.filter(j => j.stage === 'Closed Won');
    if (wonJobs.length === 0) return 0;
    return kpis.revenue / wonJobs.length;
  }, [filteredJobs, kpis.revenue]);

  // 7. Lost Analysis
  const lostData = useMemo(() => {
    const lostJobs = filteredJobs.filter(j => j.stage === 'Closed Lost');
    const cancelJobs = filteredJobs.filter(j => j.stage === 'Cancel');
    return [
      { name: 'Closed Lost', count: lostJobs.length },
      { name: 'Cancelled', count: cancelJobs.length }
    ].filter(d => d.count > 0);
  }, [filteredJobs]);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface tracking-tight">{t('report.title')}</h1>
          <p className="text-sm text-on-surface-variant mt-1">{t('report.subtitle')}</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 bg-surface-container-lowest border ghost-border rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary shadow-sm"
          >
            <option value="this_month">{t('report.this_month')}</option>
            <option value="last_month">{t('report.last_month')}</option>
            <option value="this_year">{t('report.this_year')}</option>
            <option value="all">{t('report.all_time')}</option>
          </select>
          <select 
            value={selectedRep}
            onChange={(e) => setSelectedRep(e.target.value)}
            className="px-4 py-2 bg-surface-container-lowest border ghost-border rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary shadow-sm"
          >
            <option value="all">{t('report.all_teams')}</option>
            {salesReps.map(rep => (
              <option key={rep.id} value={rep.id}>{rep.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. Executive Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <div className="col-span-2 md:col-span-1 bg-surface-container-lowest p-5 rounded-2xl border ghost-border editorial-shadow flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl"><DollarSign size={20} /></div>
            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${kpis.growth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {kpis.growth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(kpis.growth).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-on-surface-variant font-medium uppercase tracking-wider mb-1">{t('report.total_revenue')}</div>
            <div className="text-2xl font-headline font-bold text-on-surface truncate">{formatCurrency(kpis.revenue)}</div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl border ghost-border editorial-shadow flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl"><Target size={20} /></div>
          </div>
          <div>
            <div className="text-xs text-on-surface-variant font-medium uppercase tracking-wider mb-1">{t('report.win_rate')}</div>
            <div className="text-2xl font-headline font-bold text-on-surface">{kpis.conversionRate.toFixed(1)}%</div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl border ghost-border editorial-shadow flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl"><Clock size={20} /></div>
          </div>
          <div>
            <div className="text-xs text-on-surface-variant font-medium uppercase tracking-wider mb-1">{t('report.avg_sales_cycle')}</div>
            <div className="text-2xl font-headline font-bold text-on-surface">{kpis.avgSalesCycle} <span className="text-sm font-normal text-on-surface-variant">{t('report.days')}</span></div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl border ghost-border editorial-shadow flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-purple-100 text-purple-600 rounded-xl"><DollarSign size={20} /></div>
          </div>
          <div>
            <div className="text-xs text-on-surface-variant font-medium uppercase tracking-wider mb-1">{t('report.avg_deal_size')}</div>
            <div className="text-2xl font-headline font-bold text-on-surface truncate" title={formatCurrency(avgDealSize)}>{formatCurrency(avgDealSize)}</div>
          </div>
        </div>

        <div className="col-span-2 md:col-span-1 bg-surface-container-lowest p-5 rounded-2xl border ghost-border editorial-shadow flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl"><Trophy size={20} /></div>
          </div>
          <div>
            <div className="text-xs text-on-surface-variant font-medium uppercase tracking-wider mb-1">{t('report.top_performer')}</div>
            <div className="text-xl font-headline font-bold text-on-surface truncate">{kpis.topPerformer}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 3. Revenue Trend */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border ghost-border editorial-shadow">
          <h2 className="text-lg font-headline font-semibold text-on-surface mb-6">{t('report.revenue_trend')}</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(val) => `฿${val/1000}k`} />
                <Tooltip 
                  formatter={(val: number) => [formatCurrency(val), t('report.revenue')]}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="Revenue" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Sales Funnel */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border ghost-border editorial-shadow">
          <h2 className="text-lg font-headline font-semibold text-on-surface mb-6">{t('report.sales_funnel')}</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} width={80} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="Count" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 4. Sales Performance */}
        <div className="md:col-span-2 bg-surface-container-lowest p-6 rounded-2xl border ghost-border editorial-shadow">
          <h2 className="text-lg font-headline font-semibold text-on-surface mb-6">{t('report.sales_performance')}</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(val) => `฿${val/1000}k`} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(val) => `${val}%`} />
                <Tooltip 
                  formatter={(val: number, name: string) => [name === 'Revenue' ? formatCurrency(val) : `${val}%`, name === 'Revenue' ? t('report.revenue') : t('report.win_rate_percent')]}
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} formatter={(value) => value === 'Revenue' ? t('report.revenue') : t('report.win_rate_percent')} />
                <Bar yAxisId="left" dataKey="Revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar yAxisId="right" dataKey="WinRate" name="Win Rate %" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. Opportunity Analysis */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border ghost-border editorial-shadow">
          <h2 className="text-lg font-headline font-semibold text-on-surface mb-6">{t('report.pipeline_by_stage')}</h2>
          <div className="h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pipelineData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => [`${value} Deals (${formatCurrency(props.payload.totalValue)})`, name]}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-on-surface">{pipelineData.reduce((s, d) => s + d.value, 0)}</span>
              <span className="text-[10px] font-medium text-on-surface-variant uppercase tracking-wider">{t('report.active_deals')}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {pipelineData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="text-on-surface-variant">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 6. Activity Metrics */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border ghost-border editorial-shadow">
          <h2 className="text-lg font-headline font-semibold text-on-surface mb-6">{t('report.activity_metrics')}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-surface-container rounded-xl flex flex-col items-center text-center">
              <MapPin size={24} className="text-primary mb-2" />
              <div className="text-2xl font-bold text-on-surface">{checkIns.length}</div>
              <div className="text-xs text-on-surface-variant mt-1">{t('report.total_checkins')}</div>
            </div>
            <div className="p-4 bg-surface-container rounded-xl flex flex-col items-center text-center">
              <FileText size={24} className="text-amber-500 mb-2" />
              <div className="text-2xl font-bold text-on-surface">{quotations.length}</div>
              <div className="text-xs text-on-surface-variant mt-1">{t('report.quotes_created')}</div>
            </div>
            <div className="p-4 bg-surface-container rounded-xl flex flex-col items-center text-center">
              <Activity size={24} className="text-emerald-500 mb-2" />
              <div className="text-2xl font-bold text-on-surface">{jobs.reduce((s, j) => s + (j.history?.length || 0), 0)}</div>
              <div className="text-xs text-on-surface-variant mt-1">{t('report.status_updates')}</div>
            </div>
          </div>
        </div>

        {/* 7. Lost Analysis */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border ghost-border editorial-shadow">
          <h2 className="text-lg font-headline font-semibold text-on-surface mb-6">{t('report.lost_analysis')}</h2>
          {lostData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lostData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} width={80} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={32}>
                    {lostData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Closed Lost' ? '#ef4444' : '#f97316'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-on-surface-variant text-sm bg-surface-container-low/50 rounded-xl">
              {t('report.no_lost_deals')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
