export interface KPIData {
  totalRevenue: { value: string; trend: string; trendUp: boolean };
  activeJobs: { value: string; trend: string; trendUp: boolean };
  newCustomers: { value: string; trend: string; trendUp: boolean };
  pendingApprovals: { value: string; trend: string; trendUp: boolean };
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  status: string;
  time: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  link: string;
}

export const dashboardService = {
  getKPIs: async (): Promise<KPIData> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));
    return {
      totalRevenue: { value: "$124,500", trend: "12.5%", trendUp: true },
      activeJobs: { value: "45", trend: "8.2%", trendUp: true },
      newCustomers: { value: "12", trend: "2.4%", trendUp: false },
      pendingApprovals: { value: "7", trend: "5.1%", trendUp: true },
    };
  },

  getRecentActivity: async (): Promise<Activity[]> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return [
      { id: '1', title: 'Quotation #QT-2024001 created for TechCorp', description: 'By Sarah Jenkins', status: 'New', time: '2 hours ago' },
      { id: '2', title: 'Job #JOB-2024003 marked as Won', description: 'By Mike Ross', status: 'Won', time: '4 hours ago' },
      { id: '3', title: 'Quotation #QT-2024005 rejected', description: 'By Manager', status: 'Rejected', time: '5 hours ago' },
      { id: '4', title: 'New Check-in at Global Logistics', description: 'By Sarah Jenkins', status: 'Pending', time: '1 day ago' },
    ];
  },

  getNotifications: async (): Promise<Notification[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
      { id: 'n1', title: 'Approval Required', message: 'Quotation QT-2024001 needs your approval.', time: '10 mins ago', isRead: false, link: '/approvals' },
      { id: 'n2', title: 'Revision Requested', message: 'Support requested revision on QT-2024004.', time: '1 hour ago', isRead: false, link: '/quotations' },
      { id: 'n3', title: 'Deal Closed', message: 'Job JOB-2024003 has been won!', time: '4 hours ago', isRead: true, link: '/jobs' },
    ];
  }
};
