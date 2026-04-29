import {
  Home,
  Users,
  Briefcase,
  FileText,
  CheckSquare,
  Tags,
  Target,
  MapPin,
  Settings,
  Bell,
  Building,
  Shield,
  UserCog,
  LogOut,
  Map,
  MessageSquare
} from 'lucide-react';

export type NavItem = {
  path: string;
  icon: any;
  label: string;
  roles?: string[]; // If undefined, available to all
  excludeRoles?: string[]; // Roles that should not see this
  isCenter?: boolean; // For mobile Check-in button
  id?: string;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

// Map existing routes to standard ids
export const NAV_ITEMS: Record<string, NavItem> = {
  home: { id: 'home', path: '/', icon: Home, label: 'nav.home' }, // Renamed from Dashboard
  chat: { id: 'chat', path: '/chat', icon: MessageSquare, label: 'nav.chat' },
  customers: { id: 'customers', path: '/customers', icon: Users, label: 'nav.customers', excludeRoles: ['Support'] },
  opportunities: { id: 'opportunities', path: '/jobs', icon: Briefcase, label: 'nav.opportunities', excludeRoles: ['Support'] }, // Jobs
  checkIn: { id: 'checkIn', path: '/check-ins?view=new', icon: MapPin, label: 'nav.check_in', excludeRoles: ['Support'], isCenter: true },
  visitHistory: { id: 'visitHistory', path: '/check-ins?view=list', icon: Map, label: 'nav.visit_history', excludeRoles: ['Support'] },
  quotation: { id: 'quotation', path: '/quotations', icon: FileText, label: 'nav.quotations', excludeRoles: ['Sales'] }, // Hidden from Sales
  priceList: { id: 'priceList', path: '/price-list', icon: Tags, label: 'nav.price_list', roles: ['Manager', 'Admin', 'Super Admin', 'Administrator', 'Support', 'admin', 'manager', 'administrator', 'super admin'] },
  approvals: { id: 'approvals', path: '/approvals', icon: CheckSquare, label: 'nav.approvals', roles: ['Manager', 'Admin', 'Super Admin', 'Administrator', 'admin', 'manager', 'administrator', 'super admin'] },
  reports: { id: 'reports', path: '/reports', icon: FileText, label: 'nav.reports' }, // Visible to all
  targets: { id: 'targets', path: '/targets', icon: Target, label: 'nav.sales_targets', roles: ['Manager', 'Admin', 'Super Admin', 'Administrator', 'admin', 'manager', 'administrator', 'super admin'] },
  settings: { id: 'settings', path: '/settings', icon: Settings, label: 'nav.settings' },
  aiSettings: { id: 'aiSettings', path: '/settings/ai', icon: Settings, label: 'AI Settings' },
};

// Web Sidebar Configuration
export const getWebNavGroups = (userRole: string): NavGroup[] => {
  return [
    {
      title: 'nav.group.communication',
      items: [NAV_ITEMS.home, NAV_ITEMS.chat]
    },
    {
      title: 'nav.group.sales',
      items: [NAV_ITEMS.customers, NAV_ITEMS.opportunities].filter(item => 
        (!item.roles || item.roles.includes(userRole)) && !item.excludeRoles?.includes(userRole)
      )
    },
    {
      title: 'nav.group.support',
      items: [NAV_ITEMS.quotation, NAV_ITEMS.priceList].filter(item => 
        (!item.roles || item.roles.includes(userRole)) && !item.excludeRoles?.includes(userRole)
      )
    },
    {
      title: 'nav.group.management',
      items: [NAV_ITEMS.approvals, NAV_ITEMS.reports, NAV_ITEMS.targets].filter(item => 
        (!item.roles || item.roles.includes(userRole)) && !item.excludeRoles?.includes(userRole)
      )
    },
    {
      title: 'nav.group.system',
      items: [NAV_ITEMS.settings, NAV_ITEMS.aiSettings].filter(item => 
        (!item.roles || item.roles.includes(userRole)) && !item.excludeRoles?.includes(userRole)
      )
    }
  ].filter(group => group.items.length > 0);
};

// Mobile Bottom Nav Configuration
export const getMobileBottomNav = (userRole: string): NavItem[] => {
  const lowerRole = (userRole || '').toLowerCase();
  const isManager = ['manager', 'admin', 'super admin', 'administrator'].includes(lowerRole);
  const isSupport = lowerRole === 'support';

  let items: NavItem[] = [];
  if (isSupport) {
    items = [NAV_ITEMS.home, NAV_ITEMS.chat, NAV_ITEMS.quotation, NAV_ITEMS.priceList];
  } else if (isManager) {
    items = [NAV_ITEMS.home, NAV_ITEMS.chat, NAV_ITEMS.approvals, NAV_ITEMS.opportunities];
  } else {
    // Default to Sales
    items = [NAV_ITEMS.home, NAV_ITEMS.chat, NAV_ITEMS.checkIn, NAV_ITEMS.customers];
  }

  // Strict role filter
  return items.filter(item => 
    (!item.roles || item.roles.includes(userRole)) && !item.excludeRoles?.includes(userRole)
  );
};

// Mobile More Drawer Configuration (Items not in Bottom Nav)
export const getMobileMoreNav = (userRole: string, bottomNavItems: NavItem[]): NavItem[] => {
  const bottomPaths = bottomNavItems.map(i => i.path);
  
  const allPossibleItems = [
    NAV_ITEMS.quotation,
    NAV_ITEMS.approvals,
    NAV_ITEMS.priceList,
    NAV_ITEMS.visitHistory,
    NAV_ITEMS.targets,
    NAV_ITEMS.reports
  ];

  return allPossibleItems.filter(item => {
    // Hide if already in bottom nav
    if (bottomPaths.includes(item.path)) return false;
    // Hide if role excluded
    if (item.excludeRoles?.includes(userRole)) return false;
    // Hide if role required but not matching
    if (item.roles && !item.roles.includes(userRole)) return false;
    
    return true;
  });
};

export const SETTINGS_SUBMENUS = [
  { path: '/settings?tab=profile', icon: UserCog, label: 'nav.profile' },
  { path: '/settings?tab=preferences', icon: Settings, label: 'nav.preferences' },
  { path: '/settings?tab=security', icon: Shield, label: 'nav.security' },
  { path: '/settings?tab=company', icon: Building, label: 'nav.company_details', roles: ['Manager', 'Admin', 'Super Admin', 'Administrator', 'admin', 'manager', 'administrator', 'super admin'] },
  { path: '/settings?tab=users', icon: Users, label: 'nav.user_management', roles: ['Manager', 'Admin', 'Super Admin', 'Administrator', 'admin', 'manager', 'administrator', 'super admin'] },
  { path: '/settings?tab=notifications', icon: Bell, label: 'nav.notifications' },
  { path: '/settings?tab=pdf', icon: FileText, label: 'nav.pdf_templates', roles: ['Manager', 'Admin', 'Super Admin', 'Administrator', 'admin', 'manager', 'administrator', 'super admin'] },
  { path: '/settings/ai', icon: Settings, label: 'AI Settings' },
];
