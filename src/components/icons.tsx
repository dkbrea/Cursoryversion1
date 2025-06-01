import type { SVGProps } from "react";
import {
  Landmark, LayoutDashboard, ListPlus, CreditCard, Users, LogOut, Settings, Wallet, PiggyBank, Library, ShieldCheck, MoreHorizontal, Edit, Trash, DollarSign, HelpCircle, CircleDollarSign, Target, TrendingDown, TrendingUp, ReceiptText, CalendarClock, ClipboardList, Flag, Home, Car, Plane, Briefcase, GraduationCap, Gift, LineChart, Coins, BarChart3, RefreshCw, Settings2, Clock, BarChartBig as LucideBarChartBig, Info, PieChart as LucidePieChart, Download, CalendarDays, History, FileText as FileTextIconLucide, Bot, Percent, Activity, Lightbulb, ListChecks, ArrowUp, ArrowRight
} from 'lucide-react';

// Renaming to avoid conflict if we have other components named PieChart, BarChartBig etc.
const BarChartBig = LucideBarChartBig;
const PieChartIcon = LucidePieChart;
const FileText = FileTextIconLucide;

export const Icons = {
  Logo: (props: SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
      <polyline points="22,6 12,13 2,6"></polyline>
      <line x1="2" y1="19" x2="22" y2="19"></line>
      <line x1="4" y1="10" x2="6" y2="10"></line>
    </svg>
  ),
  Dashboard: LayoutDashboard,
  Categories: ListPlus,
  Transactions: CreditCard,
  Accounts: PiggyBank,
  Debts: Target,
  Recurring: CalendarClock,
  Budget: ClipboardList,
  Goals: Flag, // Main Goals navigation icon
  Investments: TrendingUp, // Main Investments navigation icon & used as a specific goal icon
  Reports: BarChart3,
  Auth: Users,
  Logout: LogOut,
  Settings: Settings,
  Bank: Landmark,
  Wallet: Wallet,
  Primary: ShieldCheck, // Used as a specific goal icon & for primary account badge
  Edit: Edit,
  Delete: Trash,
  DollarSign: DollarSign,
  HelpCircle: HelpCircle,
  AccountTypeChecking: Landmark,
  AccountTypeSavings: PiggyBank,
  AccountTypeCreditCard: CreditCard,
  AccountTypeOther: HelpCircle,
  MoreHorizontal: MoreHorizontal,
  DebtTypeCreditCard: CreditCard,
  DebtTypeLineOfCredit: CreditCard, // Using same icon as credit card since they're both revolving credit
  DebtTypeStudentLoan: Library,
  DebtTypePersonalLoan: DollarSign,
  DebtTypeMortgage: Landmark,
  DebtTypeAutoLoan: (props: SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  ),
  DebtTypeOther: HelpCircle,
  TrendingDown: TrendingDown,
  ReceiptText: ReceiptText,

  // Goal specific icons - ensuring they are directly keyed as expected by AddGoalDialog
  GoalDefault: CircleDollarSign,
  Home: Home,
  Car: Car,
  Plane: Plane,
  Briefcase: Briefcase,
  GraduationCap: GraduationCap,
  Gift: Gift,
  PiggyBank: PiggyBank, // This one is fine
  ShieldCheck: ShieldCheck, // Ensure this is directly available as Icons.ShieldCheck
  TrendingUp: TrendingUp,   // Ensure this is directly available as Icons.TrendingUp

  // Investment Account Type Icons
  InvestmentBrokerage: LineChart,
  InvestmentRetirement: BarChartBig, // Renamed import
  InvestmentCrypto: Coins,
  InvestmentOther: DollarSign, // Reusing DollarSign,
  RefreshCw: RefreshCw,
  Settings2: Settings2,
  Clock: Clock,
  BarChartBig: BarChartBig, // Used for Reports Page and InvestmentRetirement
  Info: Info,
  // Report specific icons
  PieChart: PieChartIcon, // Renamed import
  Download: Download,
  CalendarDays: CalendarDays,
  History: History,
  FileTextIcon: FileText, // Renamed import
  LineChartIcon: LineChart, // Used for InvestmentBrokerage and Reports Page
  // New Icons for Goal & Savings Dashboard
  Bot: Bot,
  Percent: Percent,
  Activity: Activity,
  Lightbulb: Lightbulb,
  ListChecks: ListChecks,
  ArrowUp: ArrowUp,
  ArrowRight: ArrowRight,
};

export default Icons; // Keep this default export if it's used elsewhere, but ensure named imports for { Icons }
