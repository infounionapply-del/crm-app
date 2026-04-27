import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage, useT } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ArrowUpRight, ArrowDownRight, Users, Briefcase, FileText, DollarSign, Bell } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

const StatCard = ({ title, value, trend, trendUp, icon: Icon, className = '' }: any) => (
  <div className={`bg-surface-container-lowest p-4 md:p-6 rounded-2xl border ghost-border editorial-shadow transition-transform hover:-translate-y-1 duration-300 flex flex-col justify-between ${className}`}>
    <div className="flex items-start justify-between mb-2 md:mb-4">
      <div className="p-2 md:p-3 bg-surface-container rounded-xl text-primary">
        <Icon size={20} className="md:w-6 md:h-6" />
      </div>
      <div className={`flex items-center gap-0.5 md:gap-1 text-[10px] md:text-sm font-medium px-1.5 py-0.5 md:px-2 md:py-1 rounded-full ${trendUp ? 'text-green-700 bg-green-50' : 'text-error bg-error-container'}`}>
        {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {trend}
      </div>
    </div>
    <div>
      <h3 className="text-on-surface-variant text-[10px] md:text-sm font-medium mb-0.5 md:mb-1 line-clamp-1" title={title}>{title}</h3>
      <div className="text-lg md:text-2xl font-headline font-semibold text-on-surface truncate" title={value}>{value}</div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const t = useT();
  const navigate = useNavigate();
  const { jobs, salesReps, salesTargets, quotations, customers, approvals, checkIns, isLoadingData, formatCurrency, notifications } = useData();
  const { profile } = useAuth();

  const [chartFilterMode, setChartFilterMode] = useState<'month' | 'year' | 'all'>('month');
  const [chartFilterDate, setChartFilterDate] = useState(new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [chartFilterYear, setChartFilterYear] = useState(new Date().getFullYear().toString()); // 'YYYY'

  const chartData = useMemo(() => {
    let rawChartData: any[] = [];
    const isSales = profile?.role === 'Sales';

    if (isSales) {
      // Sales view
      const rep = salesReps.find(r => r.id === profile?.id);
      if (!rep) return [];

      const repJobs = jobs.filter(j => j.created_by === rep.id).map(j => j.id);
      
      if (chartFilterMode === 'month') {
        // X-Axis = 12 months of the selected year
        const year = chartFilterYear;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        rawChartData = months.map((monthName, index) => {
          const monthNum = (index + 1).toString().padStart(2, '0');
          const monthKey = `${year}-${monthNum}`; // '2026-01'
          
          const targetInfo = salesTargets.find(t => t.salesRepId === rep.id && t.month === monthKey);
          const targetAmount = targetInfo ? targetInfo.target : 0;
          
          const repWonJobs = jobs.filter(j => j.created_by === rep.id && j.stage === 'Closed Won').map(j => j.id);
          const repLostJobs = jobs.filter(j => j.created_by === rep.id && ['Closed Lost', 'Cancel'].includes(j.stage)).map(j => j.id);

          const wonQs = quotations.filter(q => repWonJobs.includes(q.job_id) && ['Won', 'Order Pending', 'In Process', 'FG', 'Delivery', 'Approved'].includes(q.status) && q.created_at?.startsWith(monthKey));
          const lostQs = quotations.filter(q => repLostJobs.includes(q.job_id) && ['Lost', 'Canceled'].includes(q.status) && q.created_at?.startsWith(monthKey));
          
          let actualAmount = wonQs.reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);
          let lostAmount = lostQs.reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);
          
          return { name: monthName, Target: targetAmount, Actual: actualAmount, Lost: lostAmount };
        });
      } else {
        // For All Time or Yearly selection, show Years on X-Axis. 
        const yearsSet = new Set<string>();
        quotations.forEach(q => { if (q.created_at) yearsSet.add(q.created_at.substring(0, 4)); });
        salesTargets.forEach(t => { if (t.month) yearsSet.add(t.month.substring(0, 4)); });
        let years = Array.from(yearsSet).sort();
        if (years.length === 0) years = [new Date().getFullYear().toString()];
        
        rawChartData = years.map(year => {
          const yearTargets = salesTargets.filter(t => t.salesRepId === rep.id && t.month.startsWith(year));
          const targetAmount = yearTargets.reduce((sum, t) => sum + t.target, 0);
          
          const repWonJobs = jobs.filter(j => j.created_by === rep.id && j.stage === 'Closed Won').map(j => j.id);
          const repLostJobs = jobs.filter(j => j.created_by === rep.id && ['Closed Lost', 'Cancel'].includes(j.stage)).map(j => j.id);

          const wonQs = quotations.filter(q => repWonJobs.includes(q.job_id) && ['Won', 'Order Pending', 'In Process', 'FG', 'Delivery', 'Approved'].includes(q.status) && q.created_at?.startsWith(year));
          const lostQs = quotations.filter(q => repLostJobs.includes(q.job_id) && ['Lost', 'Canceled'].includes(q.status) && q.created_at?.startsWith(year));
          
          let actualAmount = wonQs.reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);
          let lostAmount = lostQs.reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);
          
          return { name: year, Target: targetAmount, Actual: actualAmount, Lost: lostAmount };
        });
      }
    } else {
      // Manager/Admin view
      // X-Axis = Sales Reps
      rawChartData = salesReps.map(rep => {
        const repWonJobs = jobs.filter(j => j.created_by === rep.id && j.stage === 'Closed Won').map(j => j.id);
        const repLostJobs = jobs.filter(j => j.created_by === rep.id && ['Closed Lost', 'Cancel'].includes(j.stage)).map(j => j.id);
        
        let targetAmount = 0;
        let wonQs: any[] = [];
        let lostQs: any[] = [];

        if (chartFilterMode === 'month') {
          const targetInfo = salesTargets.find(t => t.salesRepId === rep.id && t.month === chartFilterDate);
          targetAmount = targetInfo ? targetInfo.target : 0;
          wonQs = quotations.filter(q => repWonJobs.includes(q.job_id) && ['Won', 'Order Pending', 'In Process', 'FG', 'Delivery', 'Approved'].includes(q.status) && q.created_at?.startsWith(chartFilterDate));
          lostQs = quotations.filter(q => repLostJobs.includes(q.job_id) && ['Lost', 'Canceled'].includes(q.status) && q.created_at?.startsWith(chartFilterDate));
        } else if (chartFilterMode === 'year') {
          const yearTargets = salesTargets.filter(t => t.salesRepId === rep.id && t.month.startsWith(chartFilterYear));
          targetAmount = yearTargets.reduce((sum, t) => sum + t.target, 0);
          wonQs = quotations.filter(q => repWonJobs.includes(q.job_id) && ['Won', 'Order Pending', 'In Process', 'FG', 'Delivery', 'Approved'].includes(q.status) && q.created_at?.startsWith(chartFilterYear));
          lostQs = quotations.filter(q => repLostJobs.includes(q.job_id) && ['Lost', 'Canceled'].includes(q.status) && q.created_at?.startsWith(chartFilterYear));
        } else {
          // All Time
          const allTargets = salesTargets.filter(t => t.salesRepId === rep.id);
          targetAmount = allTargets.reduce((sum, t) => sum + t.target, 0);
          wonQs = quotations.filter(q => repWonJobs.includes(q.job_id) && ['Won', 'Order Pending', 'In Process', 'FG', 'Delivery', 'Approved'].includes(q.status));
          lostQs = quotations.filter(q => repLostJobs.includes(q.job_id) && ['Lost', 'Canceled'].includes(q.status));
        }

        let actualAmount = wonQs.reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);
        let lostAmount = lostQs.reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);

        return {
          name: rep.name,
          Target: targetAmount,
          Actual: actualAmount,
          Lost: lostAmount
        };
      });
    }

    return rawChartData;
  }, [salesReps, profile, jobs, quotations, salesTargets, chartFilterMode, chartFilterDate, chartFilterYear]);

  const kpis = useMemo(() => {
    // Total Revenue: Only from QT where Job is Closed Won
    const wonJobs = jobs.filter(j => j.stage === 'Closed Won').map(j => j.id);
    const validWonQs = quotations.filter(q => wonJobs.includes(q.job_id) && ['Won', 'Order Pending', 'In Process', 'FG', 'Delivery', 'Approved'].includes(q.status));
    const totalRev = validWonQs.reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);

    // Total Lost: Only from QT where Job is Closed Lost or Cancel
    const lostJobs = jobs.filter(j => ['Closed Lost', 'Cancel'].includes(j.stage)).map(j => j.id);
    const validLostQs = quotations.filter(q => lostJobs.includes(q.job_id) && ['Lost', 'Canceled'].includes(q.status));
    const totalLost = validLostQs.reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);

    const activeJobsCount = jobs.filter(j => !['Closed Won', 'Closed Lost', 'Cancel'].includes(j.stage)).length;

    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    const newCustomersCount = customers.filter(c => c.created_at && c.created_at.startsWith(currentMonthPrefix)).length || customers.length;

    const pendingApprovalsCount = approvals.filter(a => a.status === 'Pending').length;

    return {
      totalRevenue: { value: formatCurrency(totalRev), trend: "---", trendUp: true },
      totalLost: { value: formatCurrency(totalLost), trend: "---", trendUp: false },
      activeJobs: { value: activeJobsCount.toString(), trend: "---", trendUp: true },
      newCustomers: { value: newCustomersCount.toString(), trend: "---", trendUp: true },
      pendingApprovals: { value: pendingApprovalsCount.toString(), trend: "---", trendUp: pendingApprovalsCount === 0 },
    };
  }, [jobs, customers, approvals, quotations]);

  const activities = useMemo(() => {
    const allActivities: any[] = [];

    jobs.forEach(j => {
      if (j.created_at) {
        allActivities.push({
          id: `job-${j.id}`,
          title: `Job ${j.title} created`,
          description: `Customer: ${j.customer}`,
          status: j.status,
          timestamp: new Date(j.created_at).getTime(),
          time: new Date(j.created_at).toLocaleDateString()
        });
      }
    });

    quotations.forEach(q => {
      if (q.created_at) {
        allActivities.push({
          id: `qt-${q.id}`,
          title: `Quotation for ${q.customer}`,
          description: `Amount: ${q.value}`,
          status: q.status,
          timestamp: new Date(q.created_at).getTime(),
          time: new Date(q.created_at).toLocaleDateString()
        });
      }
    });

    checkIns.forEach(c => {
      if (c.created_at) {
        allActivities.push({
          id: `ci-${c.id}`,
          title: `Check-in at ${c.customer}`,
          description: `By: ${c.salesRep}`,
          status: 'Completed',
          timestamp: new Date(c.created_at).getTime(),
          time: new Date(c.created_at).toLocaleDateString()
        });
      }
    });

    return allActivities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [jobs, quotations, checkIns]);



  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-50 text-gray-700';
    switch (status) {
      case 'New': return 'bg-blue-50 text-blue-700';
      case 'Pending Approval': 
      case 'Pending': return 'bg-orange-50 text-orange-700';
      case 'Approved': return 'bg-green-50 text-green-700';
      case 'Won': return 'bg-emerald-50 text-emerald-700';
      case 'Rejected': return 'bg-red-50 text-red-700';
      case 'Completed': return 'bg-purple-50 text-purple-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const getStatusKey = (status?: string) => {
    if (!status) return 'unknown';
    if (status === 'Pending') return 'pending_approval';
    return status.toLowerCase().replace(' ', '_');
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tight mb-2">
          {t('dashboard.welcome')}, {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : (profile?.name || 'User')}
        </h1>
        <p className="text-on-surface-variant">
          {t('dashboard.subtitle')} • {profile?.role || 'Role'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6">
        <StatCard
          title={t('dashboard.total_revenue')}
          value={kpis?.totalRevenue.value}
          trend={kpis?.totalRevenue.trend}
          trendUp={kpis?.totalRevenue.trendUp}
          icon={DollarSign}
        />
        <StatCard
          title={t('dashboard.total_lost')}
          value={kpis?.totalLost.value}
          trend={kpis?.totalLost.trend}
          trendUp={kpis?.totalLost.trendUp}
          icon={DollarSign}
        />
        <StatCard
          title={t('dashboard.active_jobs')}
          value={kpis?.activeJobs.value}
          trend={kpis?.activeJobs.trend}
          trendUp={kpis?.activeJobs.trendUp}
          icon={Briefcase}
        />
        <StatCard
          title={t('dashboard.new_customers')}
          value={kpis?.newCustomers.value}
          trend={kpis?.newCustomers.trend}
          trendUp={kpis?.newCustomers.trendUp}
          icon={Users}
        />
        <StatCard
          title={t('dashboard.pending_approvals')}
          value={kpis?.pendingApprovals.value}
          trend={kpis?.pendingApprovals.trend}
          trendUp={kpis?.pendingApprovals.trendUp}
          icon={FileText}
          className="col-span-2 md:col-span-1"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* target vs actual */}
        <div className="lg:col-span-3 bg-surface-container-lowest rounded-2xl border ghost-border p-6 editorial-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-xl font-headline font-semibold text-on-surface">{t('dashboard.target_vs_actual')}</h2>
            <div className="flex flex-wrap items-center gap-3">
              <select 
                value={chartFilterMode} 
                onChange={(e) => setChartFilterMode(e.target.value as any)}
                className="px-3 py-1.5 bg-surface-container border ghost-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="month">{t('dashboard.monthly')}</option>
                <option value="year">{t('dashboard.yearly')}</option>
                <option value="all">{t('dashboard.all_time')}</option>
              </select>

              {chartFilterMode === 'month' && profile?.role !== 'Sales' && (
                <input 
                  type="month"
                  value={chartFilterDate}
                  onChange={(e) => setChartFilterDate(e.target.value)}
                  className="px-3 py-1.5 bg-surface-container border ghost-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              )}

              {((chartFilterMode === 'month' && profile?.role === 'Sales') || chartFilterMode === 'year') && (
                <select 
                  value={chartFilterYear}
                  onChange={(e) => setChartFilterYear(e.target.value)}
                  className="px-3 py-1.5 bg-surface-container border ghost-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={(new Date().getFullYear() + 1).toString()}>{new Date().getFullYear() + 1}</option>
                  <option value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</option>
                  <option value={(new Date().getFullYear() - 1).toString()}>{new Date().getFullYear() - 1}</option>
                  <option value={(new Date().getFullYear() - 2).toString()}>{new Date().getFullYear() - 2}</option>
                </select>
              )}
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(value) => `฿${value / 1000}k`}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  formatter={(value: number) => [`${formatCurrency(value)}`, '']}
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="Target" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={50} />
                <Bar dataKey="Actual" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={50} />
                <Bar dataKey="Lost" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl border ghost-border p-6 editorial-shadow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-headline font-semibold text-on-surface">{t('dashboard.recent_activity')}</h2>
            {['Administrator', 'Manager', 'Admin', 'Super Admin'].includes(profile?.role) ? (
              <button onClick={() => navigate('/jobs')} className="text-sm text-primary font-medium hover:underline">
                {t('dashboard.view_all')}
              </button>
            ) : (
              <span className="text-sm text-on-surface-variant font-medium">
                {t('dashboard.view_all')}
              </span>
            )}
          </div>

          <div className="space-y-6">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0 text-primary">
                  <Briefcase size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">
                    {activity.title}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {activity.time} • {activity.description}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                    {t(`status.${getStatusKey(activity.status)}`)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Quick Actions & Notifications */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <div className="bg-surface-container-lowest rounded-2xl border ghost-border p-6 editorial-shadow">
            <h2 className="text-xl font-headline font-semibold text-on-surface mb-6">{t('dashboard.quick_actions')}</h2>
            <div className="space-y-3">
              {profile?.role !== 'Support' && (
                <button
                  onClick={() => navigate('/customers')}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border ghost-border hover:bg-surface-container transition-colors text-left"
                >
                  <div className="p-2 bg-primary-container text-on-primary-container rounded-lg">
                    <Users size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-on-surface text-sm">{t('dashboard.check_in_customer')}</div>
                    <div className="text-xs text-on-surface-variant">{t('dashboard.check_in_desc')}</div>
                  </div>
                </button>
              )}
              {profile?.role !== 'Sales' && (
                <button
                  onClick={() => navigate('/quotations')}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border ghost-border hover:bg-surface-container transition-colors text-left"
                >
                  <div className="p-2 bg-secondary-container text-on-secondary-container rounded-lg">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-on-surface text-sm">{t('dashboard.create_quotation')}</div>
                    <div className="text-xs text-on-surface-variant">{t('dashboard.create_quotation_desc')}</div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Notifications Panel */}
          <div className="bg-surface-container-lowest rounded-2xl border ghost-border p-6 editorial-shadow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-headline font-semibold text-on-surface">{t('dashboard.notifications')}</h2>
              <div className="p-1.5 bg-error-container text-error rounded-full">
                <Bell size={16} />
              </div>
            </div>
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => navigate(notification.link)}
                  className={`p-3 rounded-xl cursor-pointer transition-colors ${notification.isRead ? 'hover:bg-surface-container' : 'bg-surface-container hover:bg-surface-container-high'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`text-sm font-medium ${notification.isRead ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                      {notification.title}
                    </h4>
                    {!notification.isRead && <span className="w-2 h-2 rounded-full bg-error mt-1.5"></span>}
                  </div>
                  <p className="text-xs text-on-surface-variant line-clamp-2 mb-2">{notification.message}</p>
                  <span className="text-[10px] font-medium text-outline">{notification.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
