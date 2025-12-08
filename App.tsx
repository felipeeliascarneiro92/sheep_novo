




import React, { useState, useEffect } from 'react';

// Page components
import PhotographerDashboard from './components/PhotographerDashboard';
import AppointmentsPage from './components/AppointmentsPage';
import AppointmentDetailsPage from './components/AppointmentDetailsPage';
import AdminDashboard from './components/AdminDashboard';
import ManagePhotographers from './components/ManagePhotographers';
import ManageClients from './components/ManageClients';
import ManageBrokers from './components/ManageBrokers';
import ManageEditors from './components/ManageEditors';
import ManageAdmins from './components/ManageAdmins';
import ManageCommonAreas from './components/ManageCommonAreas';
import ManageServices from './components/ManageServices';
import AdminBookingPage from './components/AdminBookingPage';
import ManageFinancePage from './components/ManageFinancePage';
import VisualAgendaPage from './components/VisualAgendaPage';
import ReportsPage from './components/ReportsPage';
import WalletPage from './components/WalletPage';
import ClientApp from './components/ClientApp';
import HistoryPage from './components/HistoryPage';
import CommonAreaPage from './components/CommonAreaPage';
import ReceivablesPage from './components/ReceivablesPage';
import CalendarPage from './components/CalendarPage';
import TimeOffPage from './components/TimeOffPage';
import NotificationPanel from './components/NotificationPanel';
import CouponsPage from './components/CouponsPage';
import EditingManagementPage from './components/EditingManagementPage';
import TasksPage from './components/TasksPage';
import RegisterPage from './components/RegisterPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import AdminAuditPage from './components/AdminAuditPage';
import AdminPayrollPage from './components/AdminPayrollPage';
import AdminBillingGeneratorPage from './components/AdminBillingGeneratorPage'; // New Import
import ClientFinishBookingPage from './components/ClientFinishBookingPage';
import ManageMarketingPage from './components/ManageMarketingPage';
import CrmDashboardPage from './components/CrmDashboardPage';
import EditorPayrollPage from './components/EditorPayrollPage';
import ChatPage from './components/ChatPage';


// Icons
import { BellIcon, BuildingIcon, CalendarIcon, CameraIcon, DollarSignIcon, FileTextIcon, HistoryIcon, HomeIcon, ListOrderedIcon, LogOutIcon, MoonIcon, UserIcon, UsersIcon, XCircleIcon, ShieldIcon, SettingsIcon, PlusIcon, TrendingUpIcon, LayoutGridIcon, BarChart2Icon, EditIcon, MenuIcon, XIcon, WalletIcon, TicketIcon, WandIcon, CheckSquareIcon, FolderIcon, ChevronDownIcon, ChevronRightIcon, UserCogIcon, LockIcon, EyeIcon, FilePlusIcon, SunIcon, MegaphoneIcon, MessageCircleIcon } from './components/icons';
import { getNotificationsForUser } from './services/notificationService';
import { Notification } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { seedDatabase } from './services/seed';
import Skeleton from './components/Skeleton';

// --- TYPE DEFINITIONS ---
type PhotographerPage = 'dashboard' | 'calendar' | 'appointments' | 'receivables' | 'history' | 'common-area' | 'time-off' | 'chat';
type BrokerPage = 'dashboard' | 'booking' | 'appointments' | 'chat';
type AdminPage = 'dashboard' | 'admin-booking' | 'appointments' | 'visual-agenda' | 'reports' | 'photographers' | 'clients' | 'brokers' | 'editors' | 'admins' | 'common-areas' | 'services' | 'finance' | 'billing-generator' | 'settings' | 'wallet' | 'coupons' | 'editing' | 'tasks' | 'audit' | 'payroll' | 'payroll-editors' | 'marketing' | 'crm' | 'chat';
type EditorPage = 'admin-booking' | 'appointments' | 'visual-agenda' | 'clients' | 'common-areas' | 'editing' | 'tasks';
export type UserRole = 'client' | 'photographer' | 'admin' | 'broker' | 'editor' | null;

export interface User {
    role: UserRole;
    id: string; // admin_id, photographer_id, client_id, or broker_id
    clientId?: string; // For brokers, this is the parent client's ID
    name: string;
    profilePicUrl?: string;
    permissions?: any; // BrokerPermissions
}

// --- AUTH COMPONENT (Handles Login, Register, Forgot Password) ---
const AuthScreen: React.FC = () => {
    const { login } = useAuth();
    const [view, setView] = useState<'login' | 'register' | 'forgot-password'>('login');

    // Login State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const success = await login(email, password);
        if (!success) {
            setError('Email ou senha inválidos. Tente novamente.');
        }
    };

    const renderContent = () => {
        if (view === 'register') {
            return <RegisterPage onBack={() => setView('login')} />;
        }
        if (view === 'forgot-password') {
            return <ForgotPasswordPage onBack={() => setView('login')} />;
        }

        // Default Login View
        return (
            <div className="p-8">
                <div className="text-center mb-8">
                    <div className="bg-[#19224c] w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md">
                        <span className="text-4xl">🐑</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Bem-vindo de volta</h1>
                    <p className="text-slate-500 mt-1">Acesse sua conta SheepHouse</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                placeholder="seu@email.com"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-slate-700">Senha</label>
                            <button type="button" onClick={() => setView('forgot-password')} className="text-xs font-semibold text-purple-600 hover:underline">
                                Esqueceu?
                            </button>
                        </div>
                        <div className="relative">
                            <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 flex items-center gap-2 animate-fade-in-fast">
                            <XCircleIcon className="w-4 h-4" /> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all transform active:scale-[0.98]"
                    >
                        Entrar
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-slate-500 text-sm">
                        Não tem uma conta? <button onClick={() => setView('register')} className="font-bold text-purple-600 hover:underline">Cadastre-se</button>
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div
            className="flex min-h-screen items-center justify-center p-4 relative bg-cover bg-center"
            style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1600596542815-2a4d04d74c77?q=80&w=2070&auto=format&fit=crop')` // Modern Luxury House
            }}
        >
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>

            <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in relative z-10">
                {renderContent()}
            </div>
        </div>
    );
};


// --- ADMIN APP ---
const AdminSidebar: React.FC<{ currentPage: AdminPage; onNavigate: (page: AdminPage) => void; onLogout: () => void; isOpen: boolean; onClose: () => void; }> = ({ currentPage, onNavigate, onLogout, isOpen, onClose }) => {
    const [isCadastrosOpen, setIsCadastrosOpen] = useState(true);
    const [isFinanceOpen, setIsFinanceOpen] = useState(true);

    const navItemClasses = "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-200 text-sm font-medium w-full text-left";
    const activeClasses = "bg-white dark:bg-slate-800 text-[#33374d] dark:text-slate-100 shadow-md";
    const inactiveClasses = "text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-[#33374d] dark:hover:text-slate-200";
    const subItemClasses = "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium ml-4 text-slate-500 dark:text-slate-400 hover:text-[#33374d] dark:hover:text-slate-200 hover:bg-slate-200/30 dark:hover:bg-slate-800/30 w-[calc(100%-1rem)]";
    const activeSubClasses = "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20";

    const handleNavClick = (page: AdminPage) => {
        onNavigate(page);
        onClose();
    }

    return (
        <>
            <div className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#f3f4f8] dark:bg-slate-950 flex flex-col p-4 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between mb-10 px-2">
                    <div className="flex items-center justify-center w-full px-2">
                        <img src="/sheep_house_logo.png" alt="sheep.house" className="h-12 w-auto object-contain" />
                    </div>
                    <button onClick={onClose} className="md:hidden p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"><XIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></button>
                </div>
                <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                    <button onClick={() => handleNavClick('dashboard')} className={`${navItemClasses} ${currentPage === 'dashboard' ? activeClasses : inactiveClasses}`}><HomeIcon className="w-5 h-5" /> Dashboard</button>
                    <button onClick={() => handleNavClick('crm')} className={`${navItemClasses} ${currentPage === 'crm' ? activeClasses : inactiveClasses}`}><UserCogIcon className="w-5 h-5" /> CRM Inteligente</button>
                    <button onClick={() => handleNavClick('reports')} className={`${navItemClasses} ${currentPage === 'reports' ? activeClasses : inactiveClasses}`}><BarChart2Icon className="w-5 h-5" /> Relatórios & BI</button>
                    <button onClick={() => handleNavClick('audit')} className={`${navItemClasses} ${currentPage === 'audit' ? activeClasses : inactiveClasses}`}><ShieldIcon className="w-5 h-5" /> Governança</button>
                    <button onClick={() => handleNavClick('admin-booking')} className={`${navItemClasses} ${currentPage === 'admin-booking' ? activeClasses : inactiveClasses}`}><PlusIcon className="w-5 h-5" /> Novo Agendamento</button>
                    <button onClick={() => handleNavClick('chat')} className={`${navItemClasses} ${currentPage === 'chat' ? activeClasses : inactiveClasses}`}><MessageCircleIcon className="w-5 h-5" /> Chat do Dia</button>
                    <button onClick={() => handleNavClick('tasks')} className={`${navItemClasses} ${currentPage === 'tasks' ? activeClasses : inactiveClasses}`}><CheckSquareIcon className="w-5 h-5" /> Tarefas (Workflow)</button>
                    <button onClick={() => handleNavClick('editing')} className={`${navItemClasses} ${currentPage === 'editing' ? activeClasses : inactiveClasses}`}><WandIcon className="w-5 h-5" /> Edição de Imagens</button>
                    <button onClick={() => handleNavClick('appointments')} className={`${navItemClasses} ${currentPage === 'appointments' ? activeClasses : inactiveClasses}`}><ListOrderedIcon className="w-5 h-5" /> Agendamentos</button>
                    <button onClick={() => handleNavClick('visual-agenda')} className={`${navItemClasses} ${currentPage === 'visual-agenda' ? activeClasses : inactiveClasses}`}><LayoutGridIcon className="w-5 h-5" /> Agenda Visual</button>

                    {/* FOLDER: CADASTROS */}
                    <div className="mt-2">
                        <button onClick={() => setIsCadastrosOpen(!isCadastrosOpen)} className={`${navItemClasses} ${inactiveClasses} justify-between`}>
                            <div className="flex items-center gap-3"><FolderIcon className="w-5 h-5" /> Cadastros</div>
                            {isCadastrosOpen ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                        </button>
                        {isCadastrosOpen && (
                            <div className="mt-1 space-y-1 border-l-2 border-slate-200 ml-6 pl-2">
                                <button onClick={() => handleNavClick('photographers')} className={`${subItemClasses} ${currentPage === 'photographers' ? activeSubClasses : ''}`}>Fotógrafos</button>
                                <button onClick={() => handleNavClick('clients')} className={`${subItemClasses} ${currentPage === 'clients' ? activeSubClasses : ''}`}>Clientes</button>
                                <button onClick={() => handleNavClick('brokers')} className={`${subItemClasses} ${currentPage === 'brokers' ? activeSubClasses : ''}`}>Corretores</button>
                                <button onClick={() => handleNavClick('editors')} className={`${subItemClasses} ${currentPage === 'editors' ? activeSubClasses : ''}`}>Editores</button>
                                <button onClick={() => handleNavClick('admins')} className={`${subItemClasses} ${currentPage === 'admins' ? activeSubClasses : ''}`}>Administradores</button>
                                <button onClick={() => handleNavClick('common-areas')} className={`${subItemClasses} ${currentPage === 'common-areas' ? activeSubClasses : ''}`}>Áreas Comuns</button>
                                <button onClick={() => handleNavClick('services')} className={`${subItemClasses} ${currentPage === 'services' ? activeSubClasses : ''}`}>Serviços</button>
                                <button onClick={() => handleNavClick('marketing')} className={`${subItemClasses} ${currentPage === 'marketing' ? activeSubClasses : ''}`}>Marketing</button>
                            </div>
                        )}
                    </div>

                    {/* FOLDER: FINANCEIRO */}
                    <div className="mt-1">
                        <button onClick={() => setIsFinanceOpen(!isFinanceOpen)} className={`${navItemClasses} ${inactiveClasses} justify-between`}>
                            <div className="flex items-center gap-3"><DollarSignIcon className="w-5 h-5" /> Financeiro</div>
                            {isFinanceOpen ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                        </button>
                        {isFinanceOpen && (
                            <div className="mt-1 space-y-1 border-l-2 border-slate-200 ml-6 pl-2">
                                <button onClick={() => handleNavClick('billing-generator')} className={`${subItemClasses} ${currentPage === 'billing-generator' ? activeSubClasses : ''}`}>Gerador de Cobranças</button>
                                <button onClick={() => handleNavClick('finance')} className={`${subItemClasses} ${currentPage === 'finance' ? activeSubClasses : ''}`}>Faturas (Gestão)</button>
                                <button onClick={() => handleNavClick('payroll')} className={`${subItemClasses} ${currentPage === 'payroll' ? activeSubClasses : ''}`}>Repasses (Fotógrafos)</button>
                                <button onClick={() => handleNavClick('payroll-editors')} className={`${subItemClasses} ${currentPage === 'payroll-editors' ? activeSubClasses : ''}`}>Payroll (Editores)</button>
                                <button onClick={() => handleNavClick('wallet')} className={`${subItemClasses} ${currentPage === 'wallet' ? activeSubClasses : ''}`}>Carteira Clientes</button>
                                <button onClick={() => handleNavClick('coupons')} className={`${subItemClasses} ${currentPage === 'coupons' ? activeSubClasses : ''}`}>Cupons</button>
                            </div>
                        )}
                    </div>
                </nav>
                <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800"><button onClick={onLogout} className={`${navItemClasses} ${inactiveClasses}`}><LogOutIcon className="w-5 h-5" /> Sair</button></div>
            </aside>
        </>
    );
};

const AdminHeader: React.FC<{ user: User; onMenuClick: () => void }> = ({ user, onMenuClick }) => {
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        // Load notifications for admin
        const loadNotifications = async () => {
            const loaded = await getNotificationsForUser('admin');
            setNotifications(loaded);
        };
        loadNotifications();
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAsRead = (id?: string) => {
        setNotifications(prev => prev.map(n =>
            (!id || n.id === id) ? { ...n, read: true } : n
        ));
    };

    return (
        <header className="bg-[#f3f4f8]/80 dark:bg-slate-900/80 backdrop-blur-lg h-20 flex items-center justify-between px-4 sm:px-8 flex-shrink-0 sticky top-0 z-30 border-b border-transparent dark:border-slate-800 transition-colors duration-300">
            <div className="flex items-center gap-4">
                <button onClick={onMenuClick} className="md:hidden p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"><MenuIcon className="w-6 h-6" /></button>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Painel Administrativo</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Visão geral da plataforma.</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
                    title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
                >
                    {theme === 'dark' ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
                </button>

                <div className="relative">
                    <button
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        className="p-2 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors relative"
                    >
                        <BellIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[#f3f4f8] dark:border-slate-900">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                    {isNotificationsOpen && (
                        <NotificationPanel
                            notifications={notifications}
                            onMarkAsRead={handleMarkAsRead}
                            onClose={() => setIsNotificationsOpen(false)}
                        />
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center relative ring-2 ring-offset-2 ring-sky-400 dark:ring-offset-slate-900 overflow-hidden">
                        {user.profilePicUrl ? <img src={user.profilePicUrl} alt={user.name} className="w-full h-full object-cover" /> : <ShieldIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />}
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{user.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Administrador</p>
                    </div>
                </div>
            </div>
        </header>
    );
};

const AdminApp: React.FC<{ user: User, onLogout: () => void }> = ({ user, onLogout }) => {
    const [currentPage, setCurrentPage] = useState<AdminPage>('dashboard');
    const [viewingBookingId, setViewingBookingId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleNavigate = (page: AdminPage) => {
        setViewingBookingId(null);
        setCurrentPage(page);
    };

    const handleViewDetails = (bookingId: string) => {
        setViewingBookingId(bookingId);
    };

    const handleBackToList = () => setViewingBookingId(null);

    const renderContent = () => {
        if (viewingBookingId) return <AppointmentDetailsPage user={user} bookingId={viewingBookingId} onBack={handleBackToList} />;
        switch (currentPage) {
            case 'dashboard': return <AdminDashboard onViewDetails={handleViewDetails} />;
            case 'reports': return <ReportsPage />;
            case 'audit': return <AdminAuditPage />;
            case 'payroll': return <AdminPayrollPage />;
            case 'payroll-editors': return <EditorPayrollPage />;
            case 'billing-generator': return <AdminBillingGeneratorPage />;
            case 'admin-booking': return <AdminBookingPage onBookingCreated={() => handleNavigate('appointments')} />;
            case 'appointments': return <AppointmentsPage user={user} onViewDetails={handleViewDetails} />;
            case 'visual-agenda': return <VisualAgendaPage onViewDetails={handleViewDetails} />;
            case 'photographers': return <ManagePhotographers />;
            case 'clients': return <ManageClients />;
            case 'brokers': return <ManageBrokers />;
            case 'editors': return <ManageEditors />;
            case 'admins': return <ManageAdmins />;
            case 'common-areas': return <ManageCommonAreas />;
            case 'services': return <ManageServices />;
            case 'finance': return <ManageFinancePage onViewDetails={handleViewDetails} />;
            case 'wallet': return <WalletPage user={user} />;
            case 'coupons': return <CouponsPage />;
            case 'editing': return <EditingManagementPage />;
            case 'tasks': return <TasksPage />;
            case 'marketing': return <ManageMarketingPage />;
            case 'crm': return <CrmDashboardPage user={user} />;
            case 'chat': return <ChatPage />;
            default: return <div>Página não encontrada</div>;
        }
    };

    return (
        <div className="flex h-screen bg-[#f3f4f8] dark:bg-slate-950 font-sans text-gray-800 dark:text-slate-100 transition-colors duration-300">
            <AdminSidebar currentPage={currentPage} onNavigate={handleNavigate} onLogout={onLogout} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <AdminHeader user={user} onMenuClick={() => setIsSidebarOpen(true)} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">{renderContent()}</main>
            </div>
        </div>
    );
};


// --- PHOTOGRAPHER APP ---
const PhotographerSidebar: React.FC<{ currentPage: PhotographerPage; onNavigate: (page: PhotographerPage) => void; onLogout: () => void; isOpen: boolean; onClose: () => void; }> = ({ currentPage, onNavigate, onLogout, isOpen, onClose }) => {
    const navItemClasses = "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-200 text-sm font-medium";
    const activeClasses = "bg-white dark:bg-slate-800 text-[#33374d] dark:text-slate-100 shadow-md";
    const inactiveClasses = "text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-[#33374d] dark:hover:text-slate-200";

    const handleNavClick = (page: PhotographerPage) => {
        onNavigate(page);
        onClose();
    }

    return (
        <>
            <div className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#f3f4f8] dark:bg-slate-950 flex flex-col p-4 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between mb-10 px-2">
                    <div className="flex items-center justify-center w-full px-2">
                        <img src="/sheep_house_logo.png" alt="sheep.house" className="h-12 w-auto object-contain" />
                    </div>
                    <button onClick={onClose} className="md:hidden p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"><XIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></button>
                </div>
                <nav className="flex-1 space-y-2 overflow-y-auto">
                    <button onClick={() => handleNavClick('dashboard')} className={`${navItemClasses} ${currentPage === 'dashboard' ? activeClasses : inactiveClasses}`}><HomeIcon className="w-5 h-5" /> Página Inicial</button>
                    <button onClick={() => handleNavClick('chat')} className={`${navItemClasses} ${currentPage === 'chat' ? activeClasses : inactiveClasses}`}><MessageCircleIcon className="w-5 h-5" /> Chat do Dia</button>
                    <button onClick={() => handleNavClick('calendar')} className={`${navItemClasses} ${currentPage === 'calendar' ? activeClasses : inactiveClasses}`}><CalendarIcon className="w-5 h-5" /> Calendário</button>
                    <button onClick={() => handleNavClick('appointments')} className={`${navItemClasses} ${currentPage === 'appointments' ? activeClasses : inactiveClasses}`}><ListOrderedIcon className="w-5 h-5" /> Agendamentos</button>
                    <button onClick={() => handleNavClick('history')} className={`${navItemClasses} ${currentPage === 'history' ? activeClasses : inactiveClasses}`}><HistoryIcon className="w-5 h-5" /> Histórico</button>
                    <button onClick={() => handleNavClick('receivables')} className={`${navItemClasses} ${currentPage === 'receivables' ? activeClasses : inactiveClasses}`}><FileTextIcon className="w-5 h-5" /> Meus Recebíveis</button>
                    <button onClick={() => handleNavClick('common-area')} className={`${navItemClasses} ${currentPage === 'common-area' ? activeClasses : inactiveClasses}`}><UsersIcon className="w-5 h-5" /> Área Comum</button>
                    <button onClick={() => handleNavClick('time-off')} className={`${navItemClasses} ${currentPage === 'time-off' ? activeClasses : inactiveClasses}`}><XCircleIcon className="w-5 h-5" /> Folgas</button>
                </nav>
                <div className="mt-auto pt-4">
                    <button onClick={onLogout} className={`${navItemClasses} ${inactiveClasses}`}><LogOutIcon className="w-5 h-5" /> Sair</button>
                </div>
            </aside>
        </>
    );
};

const PhotographerHeader: React.FC<{ user: User; onMenuClick: () => void; onViewDetails: (id: string) => void }> = ({ user, onMenuClick, onViewDetails }) => {
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        const loadNotifications = async () => {
            const loaded = await getNotificationsForUser('photographer');
            setNotifications(loaded);
        };
        loadNotifications();
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAsRead = (id?: string) => {
        setNotifications(prev => prev.map(n =>
            (!id || n.id === id) ? { ...n, read: true } : n
        ));
    };

    return (
        <header className="bg-[#f3f4f8]/80 dark:bg-slate-900/80 backdrop-blur-lg h-20 flex items-center justify-between px-4 sm:px-8 flex-shrink-0 sticky top-0 z-30 border-b border-transparent dark:border-slate-800 transition-colors duration-300">
            <div className="flex items-center gap-4">
                <button onClick={onMenuClick} className="md:hidden p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"><MenuIcon className="w-6 h-6" /></button>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Painel do Fotógrafo</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Bem-vindo de volta, {user.name.split(' ')[0]}!</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
                    title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
                >
                    {theme === 'dark' ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
                </button>

                <div className="relative">
                    <button
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        className="p-2 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors relative"
                    >
                        <BellIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[#f3f4f8] dark:border-slate-900">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                    {isNotificationsOpen && (
                        <NotificationPanel
                            notifications={notifications}
                            onMarkAsRead={handleMarkAsRead}
                            onClose={() => setIsNotificationsOpen(false)}
                            onNavigate={(path) => {
                                // Extract ID from path like /appointments/123
                                if (path.startsWith('/appointments/')) {
                                    const id = path.split('/')[2];
                                    if (id) {
                                        // We need a way to trigger view details. 
                                        // Since we are in App.tsx but PhotographerHeader doesn't have direct access to handleViewDetails 
                                        // unless we pass it.
                                        // Let's emit a custom event or use a callback if possible.
                                        // Actually, PhotographerHeader is used in PhotographerApp which has handleViewDetails.
                                        // We should pass a callback to PhotographerHeader.
                                        onViewDetails(id);
                                    }
                                }
                            }}
                        />
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center relative ring-2 ring-offset-2 ring-purple-400 dark:ring-offset-slate-900 overflow-hidden">
                        {user.profilePicUrl ? <img src={user.profilePicUrl} alt={user.name} className="w-full h-full object-cover" /> : <UserIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />}
                        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white dark:ring-slate-900"></span>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{user.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Fotógrafo</p>
                    </div>
                </div>
            </div>
        </header>
    );
};

const PhotographerApp: React.FC<{ user: User, onLogout: () => void }> = ({ user, onLogout }) => {
    const [currentPage, setCurrentPage] = useState<PhotographerPage>('dashboard');
    const [viewingBookingId, setViewingBookingId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleNavigate = (page: PhotographerPage) => {
        setViewingBookingId(null);
        setCurrentPage(page);
    };
    const handleViewDetails = (bookingId: string) => setViewingBookingId(bookingId);
    const handleBackToList = () => setViewingBookingId(null);

    const renderContent = () => {
        if (viewingBookingId) return <AppointmentDetailsPage user={user} bookingId={viewingBookingId} onBack={handleBackToList} />;
        switch (currentPage) {
            case 'dashboard': return <PhotographerDashboard user={user} onViewDetails={handleViewDetails} />;
            case 'appointments': return <AppointmentsPage user={user} onViewDetails={handleViewDetails} />;
            case 'history': return <HistoryPage user={user} />;
            case 'common-area': return <CommonAreaPage />;
            case 'receivables': return <ReceivablesPage user={user} />;
            case 'calendar': return <CalendarPage user={user} onViewDetails={handleViewDetails} />;
            case 'time-off': return <TimeOffPage user={user} />;
            case 'chat': return <ChatPage />;
            default: return (<div className="text-center p-12 bg-white rounded-xl shadow-lg animate-fade-in"><h2 className="text-2xl font-bold text-slate-700">Página em Construção</h2><p className="text-slate-500 mt-2">A funcionalidade para <span className='font-bold capitalize'>{currentPage}</span> ainda não foi implementada.</p></div>);
        }
    };

    return (
        <div className="flex h-screen bg-[#f3f4f8] dark:bg-slate-950 font-sans text-gray-800 dark:text-slate-100 transition-colors duration-300">
            <PhotographerSidebar currentPage={currentPage} onNavigate={handleNavigate} onLogout={onLogout} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <PhotographerHeader user={user} onMenuClick={() => setIsSidebarOpen(true)} onViewDetails={handleViewDetails} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">{renderContent()}</main>
            </div>
        </div>
    );
};


// --- EDITOR APP ---
const EditorSidebar: React.FC<{ currentPage: EditorPage; onNavigate: (page: EditorPage) => void; onLogout: () => void; isOpen: boolean; onClose: () => void; }> = ({ currentPage, onNavigate, onLogout, isOpen, onClose }) => {
    const navItemClasses = "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-200 text-sm font-medium";
    const activeClasses = "bg-white dark:bg-slate-800 text-[#33374d] dark:text-slate-100 shadow-md";
    const inactiveClasses = "text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-[#33374d] dark:hover:text-slate-200";

    const handleNavClick = (page: EditorPage) => {
        onNavigate(page);
        onClose();
    }

    return (
        <>
            <div className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#f3f4f8] dark:bg-slate-950 flex flex-col p-4 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between mb-10 px-2">
                    <div className="flex items-center justify-center w-full px-2">
                        <img src="/sheep_house_logo.png" alt="sheep.house" className="h-12 w-auto object-contain" />
                    </div>
                    <button onClick={onClose} className="md:hidden p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"><XIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></button>
                </div>
                <nav className="flex-1 space-y-2 overflow-y-auto">
                    <button onClick={() => handleNavClick('tasks')} className={`${navItemClasses} ${currentPage === 'tasks' ? activeClasses : inactiveClasses}`}><CheckSquareIcon className="w-5 h-5" /> Minhas Tarefas</button>
                    <button onClick={() => handleNavClick('editing')} className={`${navItemClasses} ${currentPage === 'editing' ? activeClasses : inactiveClasses}`}><WandIcon className="w-5 h-5" /> Edição de Imagens</button>
                    <button onClick={() => handleNavClick('admin-booking')} className={`${navItemClasses} ${currentPage === 'admin-booking' ? activeClasses : inactiveClasses}`}><PlusIcon className="w-5 h-5" /> Novo Agendamento</button>
                    <button onClick={() => handleNavClick('appointments')} className={`${navItemClasses} ${currentPage === 'appointments' ? activeClasses : inactiveClasses}`}><ListOrderedIcon className="w-5 h-5" /> Agendamentos</button>
                    <button onClick={() => handleNavClick('visual-agenda')} className={`${navItemClasses} ${currentPage === 'visual-agenda' ? activeClasses : inactiveClasses}`}><LayoutGridIcon className="w-5 h-5" /> Agenda Visual</button>
                    <button onClick={() => handleNavClick('clients')} className={`${navItemClasses} ${currentPage === 'clients' ? activeClasses : inactiveClasses}`}><UsersIcon className="w-5 h-5" /> Clientes</button>
                    <button onClick={() => handleNavClick('common-areas')} className={`${navItemClasses} ${currentPage === 'common-areas' ? activeClasses : inactiveClasses}`}><BuildingIcon className="w-5 h-5" /> Áreas Comuns</button>
                </nav>
                <div className="mt-auto pt-4"><button onClick={onLogout} className={`${navItemClasses} ${inactiveClasses}`}><LogOutIcon className="w-5 h-5" /> Sair</button></div>
            </aside>
        </>
    );
};

const EditorApp: React.FC<{ user: User, onLogout: () => void }> = ({ user, onLogout }) => {
    const [currentPage, setCurrentPage] = useState<EditorPage>('tasks');
    const [viewingBookingId, setViewingBookingId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();

    const handleNavigate = (page: EditorPage) => {
        setViewingBookingId(null);
        setCurrentPage(page);
    };

    const handleViewDetails = (bookingId: string) => {
        setViewingBookingId(bookingId);
    };

    const handleBackToList = () => setViewingBookingId(null);

    const renderContent = () => {
        if (viewingBookingId) return <AppointmentDetailsPage user={user} bookingId={viewingBookingId} onBack={handleBackToList} />;
        switch (currentPage) {
            case 'editing': return <EditingManagementPage />;
            case 'tasks': return <TasksPage />;
            case 'admin-booking': return <AdminBookingPage onBookingCreated={() => handleNavigate('appointments')} />;
            case 'appointments': return <AppointmentsPage user={user} onViewDetails={handleViewDetails} />;
            case 'visual-agenda': return <VisualAgendaPage onViewDetails={handleViewDetails} />;
            case 'clients': return <ManageClients />;
            case 'common-areas': return <ManageCommonAreas />;
            default: return <div>Página não encontrada</div>;
        }
    };

    return (
        <div className="flex h-screen bg-[#f3f4f8] dark:bg-slate-950 font-sans text-gray-800 dark:text-slate-100 transition-colors duration-300">
            <EditorSidebar currentPage={currentPage} onNavigate={handleNavigate} onLogout={onLogout} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <header className="bg-[#f3f4f8]/80 dark:bg-slate-900/80 backdrop-blur-lg h-20 flex items-center justify-between px-4 sm:px-8 flex-shrink-0 border-b border-transparent dark:border-slate-800 transition-colors duration-300">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"><MenuIcon className="w-6 h-6" /></button>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Painel do Editor</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Pronto para finalizar os trabalhos!</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
                            title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
                        >
                            {theme === 'dark' ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center relative ring-2 ring-offset-2 ring-orange-400 dark:ring-offset-slate-900">
                                <EditIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                            </div>
                            <div className="text-right hidden sm:block">
                                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{user.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Editor</p>
                            </div>
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">{renderContent()}</main>
            </div>
        </div>
    );
};


// --- LOADING SCREEN ---
const LoadingScreen: React.FC = () => (
    <div className="flex h-screen bg-[#f3f4f8]">
        {/* Sidebar Skeleton */}
        <div className="w-64 bg-[#f3f4f8] border-r border-slate-200 hidden md:flex flex-col p-4 space-y-4">
            <div className="flex items-center gap-3 mb-6 px-2">
                <Skeleton variant="rectangular" width={40} height={40} className="rounded-lg" />
                <Skeleton width={120} height={24} />
            </div>
            <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} width="100%" height={40} className="rounded-lg" />
                ))}
            </div>
        </div>
        {/* Main Content Skeleton */}
        <div className="flex-1 flex flex-col">
            {/* Header Skeleton */}
            <div className="h-20 bg-[#f3f4f8]/80 border-b border-slate-200 flex items-center justify-between px-8">
                <Skeleton width={200} height={24} />
                <div className="flex gap-4">
                    <Skeleton variant="circular" width={40} height={40} />
                    <Skeleton variant="circular" width={40} height={40} />
                </div>
            </div>
            {/* Page Content Skeleton */}
            <div className="p-8 space-y-6">
                <Skeleton width="40%" height={32} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton height={120} className="rounded-xl" />
                    <Skeleton height={120} className="rounded-xl" />
                    <Skeleton height={120} className="rounded-xl" />
                </div>
                <Skeleton height={300} className="rounded-xl" />
            </div>
        </div>
    </div>
);

// --- MAIN APP COMPONENT ---
const MainContent: React.FC = () => {
    const { user, logout, isLoading, isImpersonating, stopImpersonation } = useAuth();
    const [publicBookingId, setPublicBookingId] = useState<string | null>(null);

    // Check for public URL pattern with Hash routing to support static servers
    // e.g. site.com/#/finish-booking/bk_123
    useEffect(() => {
        const checkHash = () => {
            const hash = window.location.hash;
            if (hash.startsWith('#/finish-booking/')) {
                const id = hash.split('#/finish-booking/')[1];
                if (id) setPublicBookingId(id);
            }
        };

        checkHash(); // Check on mount
        window.addEventListener('hashchange', checkHash); // Check on hash change
        return () => window.removeEventListener('hashchange', checkHash);
    }, []);

    if (isLoading) {
        return <LoadingScreen />;
    }

    // PUBLIC ROUTE: Client Finish Booking
    if (publicBookingId) {
        return <ClientFinishBookingPage bookingId={publicBookingId} />;
    }

    if (!user) {
        return <AuthScreen />;
    }

    return (
        <>
            {isImpersonating && (
                <div className="bg-red-600 text-white px-4 py-2 text-center font-bold text-sm flex justify-center items-center gap-4 fixed top-0 left-0 right-0 z-50 shadow-md">
                    <span>👀 Modo Espião Ativo: Você está acessando como {user.name} ({user.role})</span>
                    <button
                        onClick={stopImpersonation}
                        className="bg-white text-red-600 px-3 py-1 rounded text-xs uppercase hover:bg-red-50 transition-colors"
                    >
                        Sair do Acesso
                    </button>
                </div>
            )}
            <div className={isImpersonating ? 'pt-10' : ''}>
                {user.role === 'photographer' && <PhotographerApp user={user} onLogout={logout} />}
                {(user.role === 'client' || user.role === 'broker') && <ClientApp user={user} onLogout={logout} />}
                {user.role === 'editor' && <EditorApp user={user} onLogout={logout} />}
                {user.role === 'admin' && <AdminApp user={user} onLogout={logout} />}
            </div>
        </>
    );
};

import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

const App: React.FC = () => {
    return (
        <AuthProvider>
            <ThemeProvider>
                <ToastProvider>
                    <MainContent />
                </ToastProvider>
            </ThemeProvider>
        </AuthProvider>
    );
};

export default App;