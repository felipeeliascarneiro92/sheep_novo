


import React from 'react';
import { HomeIcon, CalendarIcon, ListOrderedIcon, DollarSignIcon, WalletIcon, UsersIcon, LogOutIcon, XIcon, HelpCircleIcon, GiftIcon, WandIcon, UserIcon, MessageCircleIcon } from './icons';
import { Client } from '../types';

type ClientPage = 'dashboard' | 'booking' | 'appointments' | 'billing' | 'brokers' | 'wallet' | 'help' | 'referral' | 'studio' | 'profile' | 'chat';
type UserRole = 'client' | 'broker' | 'admin' | 'photographer' | 'editor' | null;

interface ClientSidebarProps {
  currentPage: ClientPage; // Note: BrokerPage is a subset, but for simplicity in this extracted file we use ClientPage type which covers both
  onNavigate: (page: any) => void;
  onLogout: () => void;
  userRole: UserRole;
  isOpen: boolean;
  onClose: () => void;
  clientData?: Client;
}

const ClientSidebar: React.FC<ClientSidebarProps> = ({ currentPage, onNavigate, onLogout, userRole, isOpen, onClose, clientData }) => {
  const navItemClasses = "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-200 text-sm font-medium";
  const activeClasses = "bg-white dark:bg-slate-800 text-[#33374d] dark:text-slate-100 shadow-md";
  const inactiveClasses = "text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-[#33374d] dark:hover:text-slate-200";

  const handleNavClick = (page: string) => {
    onNavigate(page);
    onClose();
  }

  // Show wallet only if role is client AND payment type is Pre-paid
  const showWallet = userRole === 'client' && clientData?.paymentType === 'Pré-pago';

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
          <button onClick={() => handleNavClick('dashboard')} className={`${navItemClasses} ${currentPage === 'dashboard' ? activeClasses : inactiveClasses}`}><HomeIcon className="w-5 h-5" /> Dashboard</button>
          <button onClick={() => handleNavClick('booking')} className={`${navItemClasses} ${currentPage === 'booking' ? activeClasses : inactiveClasses}`}><CalendarIcon className="w-5 h-5" /> Novo Agendamento</button>
          {userRole === 'client' && (
            <button onClick={() => handleNavClick('studio')} className={`${navItemClasses} ${currentPage === 'studio' ? activeClasses : inactiveClasses}`}><WandIcon className="w-5 h-5" /> Creative Studio</button>
          )}
          <button onClick={() => handleNavClick('appointments')} className={`${navItemClasses} ${currentPage === 'appointments' ? activeClasses : inactiveClasses}`}><ListOrderedIcon className="w-5 h-5" /> Meus Agendamentos</button>
          <button onClick={() => handleNavClick('chat')} className={`${navItemClasses} ${currentPage === 'chat' ? activeClasses : inactiveClasses}`}><MessageCircleIcon className="w-5 h-5" /> Chat do Dia</button>
          {userRole === 'client' && <>
            <button onClick={() => handleNavClick('billing')} className={`${navItemClasses} ${currentPage === 'billing' ? activeClasses : inactiveClasses}`}><DollarSignIcon className="w-5 h-5" /> Faturas</button>
            {showWallet && <button onClick={() => handleNavClick('wallet')} className={`${navItemClasses} ${currentPage === 'wallet' ? activeClasses : inactiveClasses}`}><WalletIcon className="w-5 h-5" /> Carteira</button>}
            <button onClick={() => handleNavClick('brokers')} className={`${navItemClasses} ${currentPage === 'brokers' ? activeClasses : inactiveClasses}`}><UsersIcon className="w-5 h-5" /> Corretores</button>
            <button onClick={() => handleNavClick('referral')} className={`${navItemClasses} ${currentPage === 'referral' ? activeClasses : inactiveClasses}`}><GiftIcon className="w-5 h-5 text-purple-500" /> Indique e Ganhe</button>
          </>}
          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
            <p className="px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">Configurações</p>
            <button onClick={() => handleNavClick('profile')} className={`${navItemClasses} ${currentPage === 'profile' ? activeClasses : inactiveClasses}`}><UserIcon className="w-5 h-5" /> Meu Perfil</button>
            <button onClick={() => handleNavClick('help')} className={`${navItemClasses} ${currentPage === 'help' ? activeClasses : inactiveClasses}`}><HelpCircleIcon className="w-5 h-5" /> Ajuda & Tutoriais</button>
          </div>
        </nav>
        <div className="mt-auto pt-4"><button onClick={onLogout} className={`${navItemClasses} ${inactiveClasses}`}><LogOutIcon className="w-5 h-5" /> Sair</button></div>
      </aside>
    </>
  );
};

export default ClientSidebar;