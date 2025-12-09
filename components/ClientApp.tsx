




import React, { useState, useEffect } from 'react';
import DashboardPage from './DashboardPage';
import BookingPage from './BookingPage';
import AppointmentsPage from './AppointmentsPage';
import BillingPage from './BillingPage';
import BrokersPage from './BrokersPage';
import WalletPage from './WalletPage';
import HelpPage from './HelpPage';
import ReferralPage from './ReferralPage';
import CreativeStudioPage from './CreativeStudioPage';
import AppointmentDetailsPage from './AppointmentDetailsPage';
import InvoiceDetailsPage from './InvoiceDetailsPage';
import ClientProfilePage from './ClientProfilePage';
import ChatPage from './ChatPage';
import { User } from '../App';
import { getClientById } from '../services/bookingService';
import ClientSidebar from './ClientSidebar';
import ClientHeader from './ClientHeader';

type ClientPage = 'dashboard' | 'booking' | 'appointments' | 'billing' | 'brokers' | 'wallet' | 'help' | 'referral' | 'studio' | 'profile';

const ClientApp: React.FC<{ user: User, onLogout: () => void }> = ({ user, onLogout }) => {
    const [currentPage, setCurrentPage] = useState<ClientPage>('dashboard');
    const [pageMode, setPageMode] = useState<string | undefined>(undefined); // For Flash mode

    const [viewingBookingId, setViewingBookingId] = useState<string | null>(null);
    const [viewingInvoiceId, setViewingInvoiceId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [clientData, setClientData] = useState<any>(undefined);

    useEffect(() => {
        const fetchClientData = async () => {
            if (user.role === 'client') {
                const data = await getClientById(user.id);
                setClientData(data);
            }
        };
        fetchClientData();
    }, [user.id, user.role]);


    const handleNavigate = (page: ClientPage, mode?: string) => {
        setViewingBookingId(null);
        setViewingInvoiceId(null);
        setCurrentPage(page);
        setPageMode(mode);
    };

    const handleViewDetails = (bookingId: string) => {
        setViewingInvoiceId(null);
        setViewingBookingId(bookingId);
    };

    // Special handler for when a booking is successfully created
    const handleBookingSuccess = (bookingId: string) => {
        // 1. Change context to appointments list so "Back" button goes to list, not form
        setCurrentPage('appointments');
        setPageMode(undefined);

        // 2. Immediately open the details of the new booking
        handleViewDetails(bookingId);
    };

    const handleViewInvoiceDetails = (invoiceId: string) => {
        setViewingBookingId(null);
        setViewingInvoiceId(invoiceId);
    };

    const handleBackToList = () => {
        setViewingBookingId(null);
        setViewingInvoiceId(null);
    };

    const renderContent = () => {
        if (viewingBookingId) return <AppointmentDetailsPage user={user} bookingId={viewingBookingId} onBack={handleBackToList} onNavigate={handleNavigate} />;
        if (viewingInvoiceId) return <InvoiceDetailsPage invoiceId={viewingInvoiceId} onBack={handleBackToList} />;

        const bookingUser = { role: user.role as 'client' | 'broker', id: user.id, clientId: user.clientId || user.id };

        switch (currentPage) {
            case 'dashboard': return <DashboardPage user={user} onNavigate={handleNavigate} onViewDetails={handleViewDetails} />;
            case 'booking': return <BookingPage user={bookingUser} mode={pageMode} onBookingSuccess={handleBookingSuccess} />;
            case 'appointments': return <AppointmentsPage user={user} onViewDetails={handleViewDetails} />;
            case 'billing': return user.role === 'client' ? <BillingPage user={user} onViewInvoiceDetails={handleViewInvoiceDetails} /> : null;
            case 'brokers': return user.role === 'client' ? <BrokersPage /> : null;
            case 'wallet': return user.role === 'client' && clientData?.paymentType === 'Pré-pago' ? <WalletPage user={user} /> : null;
            case 'help': return <HelpPage />;
            case 'referral': return user.role === 'client' ? <ReferralPage user={user} /> : null;
            case 'studio': return user.role === 'client' ? <CreativeStudioPage user={user} onSuccess={() => handleNavigate('appointments')} /> : null;
            case 'profile': return <ClientProfilePage user={user} />;
            case 'chat': return <ChatPage />;
            default: return <div>Página não encontrada</div>;
        }
    };

    return (
        <div className="flex h-screen bg-[#f3f4f8] dark:bg-slate-950 font-sans text-gray-800 dark:text-slate-100 transition-colors duration-300">
            <ClientSidebar currentPage={currentPage} onNavigate={(p) => handleNavigate(p)} onLogout={onLogout} userRole={user.role} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} clientData={clientData} />
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <ClientHeader user={user} onMenuClick={() => setIsSidebarOpen(true)} balance={clientData?.balance} paymentType={clientData?.paymentType} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">{renderContent()}</main>
            </div>
        </div>
    );
};

export default ClientApp;