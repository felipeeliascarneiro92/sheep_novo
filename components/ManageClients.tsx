import React, { useState, useMemo, FormEvent, useEffect, useRef } from 'react';
import { getClients, getClientById, getAllBookings, updateClient, updateClientPrices, getServices, convertClientToBroker, createManualInvoice, updateEntityProfilePicture, addClient, saveAsaasInvoice } from '../services/bookingService';
import { createAsaasCharge, createAsaasCustomer } from '../services/asaasService';
import { Client, Booking, Service, ServiceCategory, ClientAddress } from '../types';
import { UserIcon, SearchIcon, DollarSignIcon, ListOrderedIcon, CalendarIcon, ArrowLeftIcon, EditIcon, CheckCircleIcon, HistoryIcon, XIcon, PhoneIcon, MailIcon, BuildingIcon, UserCheckIcon, CameraIcon, XCircleIcon, ClockIcon, LinkIcon, EyeIcon, PlusIcon, UserXIcon, LoaderIcon, CopyIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { maskPhone, maskCPF, maskCNPJ, maskCEP } from '../utils/masks';
import { useClients, useClient, useInvalidateClients, useClientsPaginated, useClientsSearch } from '../hooks/useQueries';
import Pagination from './Pagination';
import { useDebounce } from '../hooks/useDebounce';


// --- SUB-COMPONENT: CLIENT FORM PAGE (replaces old modal) ---

const TabButton: React.FC<{ id: string; activeTab: string; onClick: (id: any) => void; title: string; icon: React.ReactNode }> = ({ id, activeTab, onClick, title, icon }) => (
    <button type="button" onClick={() => onClick(id)} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${activeTab === id ? 'border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>
        {icon} {title}
    </button>
);

const FormInput: React.FC<{ label: string, name: string, value: string | number, onChange: any, type?: string, icon?: React.ReactNode, disabled?: boolean, containerClassName?: string, helpText?: string }> = ({ label, name, value, onChange, type = "text", icon, disabled = false, containerClassName = "", helpText }) => (
    <div className={containerClassName}>
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
        <div className="relative">
            {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500">{icon}</div>}
            <input type={type} id={name} name={name} value={value} onChange={onChange} disabled={disabled} className={`w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 transition-colors ${icon ? 'pl-10' : ''} ${disabled ? 'bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed' : ''}`} />
        </div>
        {helpText && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{helpText}</p>}
    </div>
);

const FormSelect: React.FC<{ label: string, name: string, value: string, onChange: any, options: string[], containerClassName?: string }> = ({ label, name, value, onChange, options, containerClassName }) => (
    <div className={containerClassName}>
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
        <select id={name} name={name} value={value} onChange={onChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500">
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

const ClientFormPage: React.FC<{ client: Client; onBack: () => void; onSave: () => void; isNew?: boolean }> = ({ client, onBack, onSave, isNew }) => {
    const [activeTab, setActiveTab] = useState<'data' | 'address' | 'billingAddress' | 'appointments' | 'history'>('data');
    const [formData, setFormData] = useState<Client>({
        ...client,
        address: client.address || { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip: '', reference: '', observation: '' },
        notes: client.notes || '',
        tradeName: client.tradeName || '',
        commercialPhone: client.commercialPhone || '',
        mobilePhone: client.mobilePhone || '',
        marketingEmail1: client.marketingEmail1 || '',
        marketingEmail2: client.marketingEmail2 || '',
        stateRegistration: client.stateRegistration || '',
        isActive: client.isActive ?? true, // Default to true if undefined
    });
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let newValue = value;

        if (name === 'phone' || name === 'commercialPhone' || name === 'mobilePhone') {
            newValue = maskPhone(value);
        } else if (name === 'cnpj') {
            if (formData.personType === 'Pessoa Física') {
                newValue = maskCPF(value);
            } else {
                newValue = maskCNPJ(value);
            }
        }

        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: newValue }));
        }
    };

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let newValue = value;

        if (name === 'zip') {
            newValue = maskCEP(value);
        }

        setFormData(prev => ({
            ...prev,
            address: {
                ...prev.address,
                [name]: newValue,
            }
        }));
    };

    const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isNew) {
            alert("Salve o cliente antes de adicionar uma foto.");
            return;
        }
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                const base64 = await updateEntityProfilePicture('client', client.id, file);
                setFormData(prev => ({ ...prev, profilePicUrl: base64 }));
            } catch (error) {
                console.error("Error uploading profile picture:", error);
                alert("Erro ao carregar a imagem.");
            }
        }
    };

    const { user } = useAuth();

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (isNew) {
                await addClient(formData);
            } else {
                // Generate detailed change log
                const changes: string[] = [];

                if (client.name !== formData.name) changes.push(`Razão Social: "${client.name}" ➝ "${formData.name}"`);
                if (client.tradeName !== formData.tradeName) changes.push(`Nome Fantasia: "${client.tradeName || ''}" ➝ "${formData.tradeName || ''}"`);
                if (client.personType !== formData.personType) changes.push(`Tipo Pessoa: ${client.personType} ➝ ${formData.personType}`);
                if (client.cnpj !== formData.cnpj) changes.push(`CNPJ/CPF: ${client.cnpj} ➝ ${formData.cnpj}`);
                if (client.stateRegistration !== formData.stateRegistration) changes.push(`IE: ${client.stateRegistration || ''}" ➝ "${formData.stateRegistration || ''}"`);

                if (client.phone !== formData.phone) changes.push(`Telefone: ${client.phone} ➝ ${formData.phone}`);
                if (client.commercialPhone !== formData.commercialPhone) changes.push(`Tel. Comercial: ${client.commercialPhone || ''}" ➝ "${formData.commercialPhone || ''}"`);
                if (client.mobilePhone !== formData.mobilePhone) changes.push(`Celular: ${client.mobilePhone || ''}" ➝ "${formData.mobilePhone || ''}"`);

                if (client.email !== formData.email) changes.push(`Email: ${client.email} ➝ ${formData.email}`);
                if (client.marketingEmail1 !== formData.marketingEmail1) changes.push(`Email Mkt 1: ${client.marketingEmail1 || ''}" ➝ "${formData.marketingEmail1 || ''}"`);
                if (client.marketingEmail2 !== formData.marketingEmail2) changes.push(`Email Mkt 2: ${client.marketingEmail2 || ''}" ➝ "${formData.marketingEmail2 || ''}"`);

                if (client.dueDay !== formData.dueDay) changes.push(`Vencimento: Dia ${client.dueDay} ➝ Dia ${formData.dueDay}`);
                if (client.paymentMethod !== formData.paymentMethod) changes.push(`Forma Pagto: ${client.paymentMethod} ➝ ${formData.paymentMethod}`);
                if (client.paymentType !== formData.paymentType) changes.push(`Tipo Pagto: ${client.paymentType} ➝ ${formData.paymentType}`);

                if (client.isActive !== formData.isActive) changes.push(`Status: ${client.isActive ? 'Ativo' : 'Inativo'} ➝ ${formData.isActive ? 'Ativo' : 'Inativo'}`);
                if (client.notes !== formData.notes) changes.push(`Observações alteradas`);

                // Address comparison
                const addrChanged =
                    client.address?.street !== formData.address?.street ||
                    client.address?.number !== formData.address?.number ||
                    client.address?.complement !== formData.address?.complement ||
                    client.address?.neighborhood !== formData.address?.neighborhood ||
                    client.address?.city !== formData.address?.city ||
                    client.address?.state !== formData.address?.state ||
                    client.address?.zip !== formData.address?.zip ||
                    client.address?.reference !== formData.address?.reference ||
                    client.address?.observation !== formData.address?.observation;

                if (addrChanged) changes.push(`Endereço principal atualizado`);

                const notes = changes.length > 0 ? changes.join('; ') : 'Nenhuma alteração detectada.';

                const newHistoryEntry = {
                    timestamp: new Date().toISOString(),
                    actor: user?.name || 'Administrador',
                    notes: notes
                };

                const updatedData = {
                    ...formData,
                    history: [...(formData.history || []), newHistoryEntry]
                };

                await updateClient(client.id, updatedData);
            }

            setTimeout(() => {
                setIsSaving(false);
                onSave();
            }, 500);
        } catch (error) {
            console.error('Error saving client:', error);
            alert('Erro ao salvar cliente. Verifique o console para mais detalhes.');
            setIsSaving(false);
        }
    };



    return (
        <form onSubmit={handleSave} className="animate-fade-in">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Formulário Cliente</h1>
                    <p className="text-slate-500 dark:text-slate-400">Editando perfil de {client.name}</p>
                </div>
                <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm font-semibold bg-white dark:bg-slate-800 dark:text-slate-200 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"><ArrowLeftIcon className="w-4 h-4" /> Voltar para listagem</button>
            </header>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="border-b border-slate-200 dark:border-slate-700 flex flex-wrap">
                    <TabButton id="data" activeTab={activeTab} onClick={setActiveTab} title="Dados do Cliente" icon={<UserIcon className="w-4 h-4" />} />
                    <TabButton id="address" activeTab={activeTab} onClick={setActiveTab} title="Endereço" icon={<BuildingIcon className="w-4 h-4" />} />
                    <TabButton id="billingAddress" activeTab={activeTab} onClick={setActiveTab} title="Endereço de cobrança" icon={<DollarSignIcon className="w-4 h-4" />} />
                    <TabButton id="appointments" activeTab={activeTab} onClick={setActiveTab} title="Agendamentos" icon={<CalendarIcon className="w-4 h-4" />} />
                    <TabButton id="history" activeTab={activeTab} onClick={setActiveTab} title="Histórico" icon={<HistoryIcon className="w-4 h-4" />} />
                </div>

                <div className="p-6">
                    {activeTab === 'data' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <FormSelect label="* Tipo Pessoa" name="personType" value={formData.personType} onChange={handleInputChange} options={['Pessoa Jurídica', 'Pessoa Física']} containerClassName="md:col-span-1" />
                                <FormInput label="* Nome/Razão Social" name="name" value={formData.name} onChange={handleInputChange} containerClassName="md:col-span-2" />
                                <FormInput label="Nome Fantasia" name="tradeName" value={formData.tradeName} onChange={handleInputChange} containerClassName="md:col-span-1" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <FormInput label="* CNPJ" name="cnpj" value={formData.cnpj} onChange={handleInputChange} />
                                <FormInput label="Inscrição Estadual" name="stateRegistration" value={formData.stateRegistration} onChange={handleInputChange} />
                                <FormInput label="Dia Vencimento" name="dueDay" value={formData.dueDay} onChange={handleInputChange} type="number" />
                                <FormSelect label="* Forma Pagamento" name="paymentMethod" value={formData.paymentMethod} onChange={handleInputChange} options={['Saldo', 'Boleto', 'Cartão']} />
                                <FormSelect label="* Tipo de Pagamento" name="paymentType" value={formData.paymentType} onChange={handleInputChange} options={['Pré-pago', 'Pós-pago']} />
                            </div>
                            {/* Asaas ID Field - Read Only */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput
                                    label="ID Asaas (Sistema Externo)"
                                    name="asaasCustomerId"
                                    value={formData.asaasCustomerId || ''}
                                    onChange={() => { }}
                                    disabled={true}
                                    icon={<LinkIcon className="w-4 h-4" />}
                                    helpText={formData.asaasCustomerId ? "Cliente sincronizado com a plataforma de pagamentos." : "Sincronização pendente."}
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300"><input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleInputChange} className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" /> Ativo</label>
                            </div>
                            <div className="flex gap-8 items-start">
                                <div className="flex-1 space-y-4">
                                    <input type="file" ref={fileInputRef} onChange={handleProfilePicChange} className="hidden" accept="image/*" />
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-32 h-32 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 relative cursor-pointer hover:border-purple-500 dark:hover:border-purple-400 overflow-hidden"
                                    >
                                        {formData.profilePicUrl ? (
                                            <img src={formData.profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon className="w-16 h-16 text-slate-400 dark:text-slate-500" />
                                        )}
                                        <div className="absolute bottom-1 right-1 bg-white dark:bg-slate-600 p-1.5 rounded-full shadow border dark:border-slate-500"><CameraIcon className="w-4 h-4 text-slate-600 dark:text-slate-300" /></div>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center w-32">Clique para alterar a foto</p>
                                </div>
                                <div className="flex-[3_3_0%]">
                                    <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Observacao Dados</label>
                                    <textarea name="notes" id="notes" value={formData.notes || ''} onChange={handleInputChange} rows={5} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500"></textarea>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'address' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <FormInput label="Logradouro" name="street" value={formData.address.street} onChange={handleAddressChange} containerClassName="md:col-span-2" />
                                <FormInput label="Numero" name="number" value={formData.address.number} onChange={handleAddressChange} />
                                <FormInput label="Complemento" name="complement" value={formData.address.complement} onChange={handleAddressChange} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormInput label="Bairro" name="neighborhood" value={formData.address.neighborhood} onChange={handleAddressChange} />
                                <FormInput label="Cidade" name="city" value={formData.address.city} onChange={handleAddressChange} />
                                <FormInput label="Estado" name="state" value={formData.address.state} onChange={handleAddressChange} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <FormInput label="Cep" name="zip" value={formData.address.zip} onChange={handleAddressChange} />
                                <FormInput label="Referencia" name="reference" value={formData.address.reference || ''} onChange={handleAddressChange} containerClassName="md:col-span-3" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                                <FormInput label="Telefone" name="phone" value={formData.phone} onChange={handleInputChange} icon={<PhoneIcon />} />
                                <FormInput label="Comercial" name="commercialPhone" value={formData.commercialPhone} onChange={handleInputChange} icon={<PhoneIcon />} />
                                <FormInput label="Celular" name="mobilePhone" value={formData.mobilePhone} onChange={handleInputChange} icon={<PhoneIcon />} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormInput label="Email" name="email" value={formData.email} onChange={handleInputChange} icon={<MailIcon />} />
                                <FormInput label="Email Marketing" name="marketingEmail1" value={formData.marketingEmail1} onChange={handleInputChange} />
                                <FormInput label="Email Marketing 2" name="marketingEmail2" value={formData.marketingEmail2} onChange={handleInputChange} />
                            </div>
                            <div>
                                <label htmlFor="addr_obs" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Observação de endereço</label>
                                <textarea name="observation" id="addr_obs" value={formData.address.observation || ''} onChange={handleAddressChange} rows={3} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500"></textarea>
                            </div>
                        </div>
                    )}
                    {(activeTab === 'billingAddress' || activeTab === 'appointments' || activeTab === 'history') && (
                        <div className="text-center py-16 text-slate-500 dark:text-slate-400"><p className="font-semibold">Seção em desenvolvimento</p><p>Esta funcionalidade estará disponível em breve.</p></div>
                    )}
                </div>

                <footer className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl flex justify-end items-center gap-3">
                    <button type="button" onClick={onBack} className="font-semibold text-sm bg-white dark:bg-slate-700 dark:text-slate-200 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600">Cancelar</button>
                    <button type="submit" disabled={isSaving} className="font-semibold text-white bg-green-500 px-6 py-2.5 rounded-lg shadow-md hover:bg-green-600 transition-shadow disabled:opacity-50 flex items-center gap-2"><CheckCircleIcon className="w-5 h-5" /> {isSaving ? 'Salvando...' : 'Salvar'}</button>
                </footer>
            </div>
        </form>
    );
};

// --- SUB-COMPONENT: GENERATE INVOICE MODAL ---
const GenerateInvoiceModal: React.FC<{
    client: Client;
    onClose: () => void;
    onConfirm: () => void;
}> = ({ client, onClose, onConfirm }) => {
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [chargeData, setChargeData] = useState<{ id: string, invoiceUrl: string, bankSlipUrl?: string, pixQrCodeUrl?: string, pixPayload?: string } | null>(null);

    // Default due date is tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString().split('T')[0];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const numericAmount = parseFloat(amount.replace(',', '.'));

        if (isNaN(numericAmount) || numericAmount <= 0) {
            alert('Valor inválido.');
            setIsSubmitting(false);
            return;
        }

        try {
            // 1. Ensure Client exists in Asaas
            let asaasId = client.asaasCustomerId;
            if (!asaasId) {
                asaasId = await createAsaasCustomer(client);
                if (asaasId && !asaasId.startsWith('cus_error')) {
                    await updateClient(client.id, { asaasCustomerId: asaasId });
                }
            }

            // 2. Create Charge
            const charge = await createAsaasCharge(
                asaasId,
                numericAmount,
                dueDate,
                description,
                'PIX', // Default to PIX for now, could be selectable
                client.id
            );

            // 3. Save to Local Database (Invoices Table)
            await saveAsaasInvoice(client.id, {
                id: charge.id,
                invoiceUrl: charge.invoiceUrl,
                value: numericAmount,
                dueDate: dueDate,
                description: description
            });

            setChargeData(charge);
            setStep('success');

        } catch (error) {
            console.error("Erro ao gerar cobrança:", error);
            alert("Erro ao gerar cobrança. Tente novamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleWhatsAppShare = () => {
        if (!chargeData) return;

        const phone = client.mobilePhone || client.phone;
        if (!phone) {
            alert("Cliente sem telefone cadastrado.");
            return;
        }

        const cleanPhone = phone.replace(/\D/g, '');
        const message = encodeURIComponent(`Olá ${client.name.split(' ')[0]}, segue o link para pagamento da sua fatura: ${chargeData.invoiceUrl}`);
        window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
    };

    const handleCopyLink = () => {
        if (chargeData?.invoiceUrl) {
            navigator.clipboard.writeText(chargeData.invoiceUrl);
            alert("Link copiado!");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        {step === 'form' ? 'Nova Cobrança Avulsa' : 'Cobrança Gerada!'}
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><XIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" /></button>
                </div>

                {step === 'form' ? (
                    <>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Gere uma fatura manual para <span className="font-bold text-slate-700 dark:text-slate-200">{client.name}</span>.</p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição / Motivo</label>
                                <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} required placeholder="Ex: Taxa de deslocamento extra" className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
                            </div>
                            <div>
                                <label htmlFor="amount" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor (R$)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">R$</span>
                                    <input type="number" id="amount" value={amount} onChange={e => setAmount(e.target.value)} required step="0.01" min="0" placeholder="0,00" className="w-full p-2 pl-10 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vencimento</label>
                                <input type="date" value={dueDate} disabled className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg shadow-sm cursor-not-allowed" />
                                <p className="text-xs text-slate-400 mt-1">Definido automaticamente para amanhã.</p>
                            </div>

                            <div className="mt-6 flex flex-col sm:flex-row-reverse gap-3">
                                <button type="submit" disabled={isSubmitting} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2.5 bg-green-600 text-base font-medium text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                                    {isSubmitting ? <LoaderIcon className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
                                    {isSubmitting ? 'Gerando...' : 'Gerar Cobrança'}
                                </button>
                                <button type="button" onClick={onClose} className="w-full inline-flex justify-center rounded-md border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2.5 bg-white dark:bg-slate-700 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 sm:mt-0">
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="space-y-6 text-center">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>

                        <div>
                            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">Cobrança Criada!</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">O link de pagamento foi gerado com sucesso.</p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600 break-all">
                            <p className="text-xs text-slate-400 mb-1 uppercase font-bold">Link de Pagamento</p>
                            <a href={chargeData?.invoiceUrl} target="_blank" rel="noreferrer" className="text-purple-600 dark:text-purple-400 font-medium hover:underline text-sm">
                                {chargeData?.invoiceUrl}
                            </a>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button onClick={handleWhatsAppShare} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg">
                                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                Enviar no WhatsApp
                            </button>
                            <button onClick={handleCopyLink} className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                                <CopyIcon className="w-5 h-5" /> Copiar Link
                            </button>
                        </div>

                        <button onClick={onConfirm} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline mt-4">
                            Fechar e Voltar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


// --- SUB-COMPONENT: CLIENT CONVERSION MODAL ---
const ConvertClientToBrokerModal: React.FC<{
    clientToConvert: Client;
    allClients: Client[];
    onClose: () => void;
    onConfirm: (targetAgencyId: string) => void;
}> = ({ clientToConvert, allClients, onClose, onConfirm }) => {
    const potentialAgencies = allClients.filter(c => c.id !== clientToConvert.id && c.isActive);
    const [targetAgencyId, setTargetAgencyId] = useState<string>(potentialAgencies.length > 0 ? potentialAgencies[0].id : '');

    const handleConfirm = () => {
        if (!targetAgencyId) {
            alert('Por favor, selecione uma imobiliária de destino.');
            return;
        }
        onConfirm(targetAgencyId);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Converter Cliente para Corretor</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    Você está prestes a converter <span className="font-bold dark:text-slate-200">{clientToConvert.name}</span>. O perfil de cliente dele será <span className="font-bold text-red-600 dark:text-red-400">desativado</span> e um novo perfil de corretor será criado.
                </p>
                <div className="mt-6">
                    <label htmlFor="agency-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Associar novo corretor à imobiliária:</label>
                    <select
                        id="agency-select"
                        value={targetAgencyId}
                        onChange={e => setTargetAgencyId(e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500"
                    >
                        <option value="" disabled>Selecione uma imobiliária...</option>
                        {potentialAgencies.map(client => (
                            <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                    </select>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row-reverse gap-3">
                    <button onClick={handleConfirm} disabled={!targetAgencyId} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2.5 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 disabled:opacity-50">
                        Confirmar Conversão
                    </button>
                    <button onClick={onClose} className="w-full inline-flex justify-center rounded-md border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2.5 bg-white dark:bg-slate-700 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 sm:mt-0">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- SUB-COMPONENT: CLIENT PROFILE PAGE ---
const ClientProfilePage: React.FC<{ client: Client; onBack: () => void; onSave: () => void; onEdit: () => void; allClients: Client[] }> = ({ client, onBack, onSave, onEdit, allClients }) => {
    const [view, setView] = useState<'overview' | 'pricing' | 'blocked'>('overview');
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isConvertingClient, setIsConvertingClient] = useState(false);

    const [clientBookings, setClientBookings] = useState<Booking[]>([]);

    useEffect(() => {
        const fetchBookings = async () => {
            const allBookings = await getAllBookings();
            const filtered = allBookings.filter(b => b.client_id === client.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setClientBookings(filtered);
        };
        fetchBookings();
    }, [client.id]);

    const metrics = useMemo(() => {
        const realizedBookings = clientBookings.filter(b => b.status === 'Realizado');
        const totalSpent = realizedBookings.reduce((sum, b) => sum + b.total_price, 0);
        const totalBookings = clientBookings.length;
        const averageTicket = realizedBookings.length > 0 ? totalSpent / realizedBookings.length : 0;

        let lastBookingDate = 'N/A';
        if (totalBookings > 0 && clientBookings[0]?.date) {
            try {
                lastBookingDate = new Date(clientBookings[0].date.replace(/-/g, '/')).toLocaleDateString('pt-BR');
            } catch (e) {
                console.error("Error formatting date", e);
            }
        }

        return { totalSpent, totalBookings, averageTicket, lastBookingDate };
    }, [clientBookings]);

    const handleConfirmConversion = (targetAgencyId: string) => {
        convertClientToBroker(client.id, targetAgencyId);
        alert(`Cliente ${client.name} convertido para corretor com sucesso! O perfil de cliente foi desativado.`);
        setIsConvertingClient(false);
        onSave(); // This calls refreshClients
    };


    const renderContent = () => {
        switch (view) {
            case 'pricing':
                return <ClientPricingPage client={client} onBack={() => setView('overview')} onSave={onSave} />;
            case 'overview':
            default:
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <MetricCard icon={<DollarSignIcon className="w-6 h-6 text-green-500" />} title="Faturamento Total" value={metrics.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                            <MetricCard icon={<ListOrderedIcon className="w-6 h-6 text-blue-500" />} title="Agendamentos Totais" value={metrics.totalBookings.toString()} />
                            <MetricCard icon={<DollarSignIcon className="w-6 h-6 text-orange-500" />} title="Ticket Médio" value={metrics.averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                            <MetricCard icon={<CalendarIcon className="w-6 h-6 text-purple-500" />} title="Último Agendamento" value={metrics.lastBookingDate} />
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                            <h3 className="text-xl font-bold text-slate-700 mb-4">Histórico de Agendamentos</h3>
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {clientBookings.map(b => <BookingHistoryItem key={b.id} booking={b} />)}
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="animate-fade-in">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex-shrink-0 border-2 border-white dark:border-slate-600 shadow">
                        {client.profilePicUrl ? (
                            <img src={client.profilePicUrl} alt={client.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center"><UserIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" /></div>
                        )}
                    </div>
                    <div>
                        <button onClick={onBack} className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 mb-1"><ArrowLeftIcon className="w-3 h-3" />Voltar para Clientes</button>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            {client.name}
                            {client.paymentType === 'Pré-pago' ? (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 border border-green-200 rounded-full text-xs font-bold">
                                    <DollarSignIcon className="w-3 h-3" /> Pré
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
                                    <ClockIcon className="w-3 h-3" /> Pós
                                </span>
                            )}
                        </h1>
                        <div className="flex items-center gap-3 mt-1">
                            <p className="text-sm text-slate-500 dark:text-slate-400">{client.email} • {client.phone}</p>
                            {client.asaasCustomerId && (
                                <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                    <LinkIcon className="w-3 h-3" /> Integrado (Asaas)
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setView('pricing')} className={`font-semibold text-sm py-2 px-4 border rounded-lg flex items-center gap-2 ${view === 'pricing' ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600'}`}><DollarSignIcon className="w-4 h-4" />Tabela de Preços</button>
                    <button onClick={() => setView('blocked')} className={`font-semibold text-sm py-2 px-4 border rounded-lg flex items-center gap-2 ${view === 'blocked' ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600'}`}><UserXIcon className="w-4 h-4" />Bloqueios</button>
                    <button onClick={() => setIsConvertingClient(true)} className="font-semibold text-sm bg-white dark:bg-slate-700 dark:text-slate-200 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2"><UserCheckIcon className="w-4 h-4" />Converter p/ Corretor</button>
                    <button onClick={onEdit} className="font-semibold text-sm bg-white dark:bg-slate-700 dark:text-slate-200 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2"><EditIcon className="w-4 h-4" />Editar</button>
                    <button onClick={() => setIsHistoryModalOpen(true)} className="font-semibold text-sm bg-white dark:bg-slate-700 dark:text-slate-200 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2"><HistoryIcon className="w-4 h-4" />Histórico</button>
                </div>
            </header>
            {view === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* METRICS */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Gasto</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">R$ {metrics.totalSpent.toFixed(2)}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Agendamentos</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.totalBookings}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Saldo em Carteira</p>
                                <p className={`text-2xl font-bold ${client.balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>R$ {client.balance.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* RECENT BOOKINGS */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200">Agendamentos Recentes</h3>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {clientBookings.length === 0 ? (
                                    <p className="p-8 text-center text-slate-500 dark:text-slate-400">Nenhum agendamento encontrado.</p>
                                ) : (
                                    clientBookings.slice(0, 5).map(booking => (
                                        <div key={booking.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-slate-800 dark:text-slate-100">{new Date(booking.date + 'T00:00:00').toLocaleDateString('pt-BR')} - {booking.start_time}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{booking.address}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${booking.status === 'Confirmado' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' : booking.status === 'Pendente' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}>
                                                {booking.status}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* DETAILS CARD */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 border-b dark:border-slate-700 pb-2">Detalhes da Empresa</h3>
                            <div className="space-y-3 text-sm">
                                <div><span className="block text-slate-500 dark:text-slate-400 text-xs">Razão Social</span> <span className="font-medium text-slate-800 dark:text-slate-100">{client.name}</span></div>
                                <div><span className="block text-slate-500 dark:text-slate-400 text-xs">Nome Fantasia</span> <span className="font-medium text-slate-800 dark:text-slate-100">{client.tradeName}</span></div>
                                <div><span className="block text-slate-500 dark:text-slate-400 text-xs">CNPJ</span> <span className="font-medium text-slate-800 dark:text-slate-100">{client.cnpj}</span></div>
                                <div><span className="block text-slate-500 dark:text-slate-400 text-xs">Inscrição Estadual</span> <span className="font-medium text-slate-800 dark:text-slate-100">{client.stateRegistration || '-'}</span></div>
                            </div>
                        </div>

                        {/* ADDRESS CARD */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 border-b dark:border-slate-700 pb-2">Endereço</h3>
                            <div className="space-y-3 text-sm">
                                <p className="text-slate-600 dark:text-slate-300">
                                    {client.address.street}, {client.address.number} {client.address.complement && `- ${client.address.complement}`}<br />
                                    {client.address.neighborhood}<br />
                                    {client.address.city} - {client.address.state}<br />
                                    CEP: {client.address.zip}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {view === 'pricing' && <ClientPricingPage client={client} onBack={() => setView('overview')} onSave={onSave} />}
            {view === 'blocked' && <ClientBlockedPhotographers client={client} onBack={() => setView('overview')} onSave={onSave} />}
            {isHistoryModalOpen && <ClientHistoryModal client={client} onClose={() => setIsHistoryModalOpen(false)} />}
            {isConvertingClient && <ConvertClientToBrokerModal clientToConvert={client} allClients={allClients} onClose={() => setIsConvertingClient(false)} onConfirm={handleConfirmConversion} />}
        </div>
    );
};

// --- SUB-COMPONENT: CLIENT BLOCKED PHOTOGRAPHERS ---
const ClientBlockedPhotographers: React.FC<{ client: Client; onBack: () => void; onSave: () => void; }> = ({ client, onBack, onSave }) => {
    const [photographers, setPhotographers] = useState<any[]>([]);
    const [blockedIds, setBlockedIds] = useState<string[]>(client.blockedPhotographers || []);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchPhotographers = async () => {
            const { data } = await supabase.from('photographers').select('id, name, email, is_active');
            if (data) setPhotographers(data);
        };
        fetchPhotographers();
    }, []);

    const toggleBlock = (photographerId: string) => {
        setBlockedIds(prev =>
            prev.includes(photographerId)
                ? prev.filter(id => id !== photographerId)
                : [...prev, photographerId]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        // Update client in Supabase
        const { error } = await supabase.from('clients').update({ blockedPhotographers: blockedIds }).eq('id', client.id);

        if (error) {
            alert('Erro ao salvar bloqueios.');
            console.error(error);
        } else {
            // Update local client object to reflect changes immediately
            client.blockedPhotographers = blockedIds;
            onSave();
        }
        setIsSaving(false);
    };

    return (
        <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <button onClick={onBack} className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 mb-1"><ArrowLeftIcon className="w-3 h-3" />Voltar para Visão Geral</button>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Bloqueio de Fotógrafos</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Selecione os fotógrafos que NÃO devem atender este cliente.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {isSaving ? <LoaderIcon className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
                    Salvar Alterações
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200">Lista de Fotógrafos</h3>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{photographers.length} encontrados</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {photographers.map(photographer => {
                        const isBlocked = blockedIds.includes(photographer.id);
                        return (
                            <div key={photographer.id} className={`p-4 flex items-center justify-between transition-colors ${isBlocked ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${isBlocked ? 'bg-red-400 dark:bg-red-600' : 'bg-slate-400 dark:bg-slate-600'}`}>
                                        {photographer.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className={`font-semibold ${isBlocked ? 'text-red-800 dark:text-red-300' : 'text-slate-800 dark:text-slate-100'}`}>{photographer.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{photographer.email} • {photographer.is_active ? 'Ativo' : 'Inativo'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleBlock(photographer.id)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors border ${isBlocked
                                        ? 'bg-white dark:bg-slate-800 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'
                                        : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                        }`}
                                >
                                    {isBlocked ? 'Desbloquear' : 'Bloquear'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: CLIENT PRICING PAGE ---
const ClientPricingPage: React.FC<{ client: Client; onBack: () => void; onSave: () => void; }> = ({ client, onBack, onSave }) => {
    const [prices, setPrices] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    const [allServices, setAllServices] = useState<Service[]>([]);

    useEffect(() => {
        const fetchServices = async () => {
            const services = await getServices();
            setAllServices(services);
        };
        fetchServices();
    }, []);

    const formatCurrency = (value: number | string) => {
        const num = Number(String(value).replace(',', '.'));
        return isNaN(num) ? '0,00' : num.toFixed(2).replace('.', ',');
    };
    const parseCurrency = (value: string) => Number(value.replace('.', '').replace(',', '.'));

    // FIX: Imported useEffect hook from React to resolve reference error.
    useEffect(() => {
        const customPrices = client.customPrices || {};
        const initialPrices: Record<string, string> = {};
        allServices.forEach(service => {
            const price = customPrices[service.id] ?? service.price;
            initialPrices[service.id] = formatCurrency(price);
        });
        setPrices(initialPrices);
    }, [client, allServices]);

    const handlePriceChange = (serviceId: string, value: string) => {
        const sanitizedValue = value.replace(/[^0-9,]/g, '');
        setPrices(prev => ({ ...prev, [serviceId]: sanitizedValue }));
    };

    const handleBlur = (serviceId: string, value: string) => {
        setPrices(prev => ({ ...prev, [serviceId]: formatCurrency(value) }));
    };

    const handleSave = () => {
        setIsSaving(true);
        const numericPrices: Record<string, number> = {};
        Object.keys(prices).forEach(serviceId => {
            numericPrices[serviceId] = parseCurrency(prices[serviceId]);
        });

        updateClientPrices(client.id, numericPrices);
        setTimeout(() => {
            setIsSaving(false);
            onSave();
        }, 500);
    };

    const groupedServices = useMemo(() => {
        return (['Foto', 'Vídeo', 'Aéreo', 'Pacotes', 'Outros'] as ServiceCategory[])
            .map(category => ({
                category,
                services: allServices.filter(s => s.category === category)
            }))
            .filter(group => group.services.length > 0);
    }, [allServices]);

    return (
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-8">
                <h2 className="text-xl text-slate-700 dark:text-slate-200 font-semibold">Tabela de Preços Personalizada</h2>
            </div>
            <div className="space-y-8">
                {groupedServices.map(group => (
                    <div key={group.category}>
                        <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300 mb-4 pb-2 border-b dark:border-slate-700">{group.category}</h3>
                        <div className="space-y-6 max-w-3xl mx-auto">
                            {group.services.map(service => {
                                const defaultPrice = service.price;
                                const customPrice = client.customPrices[service.id];
                                const currentPriceStr = prices[service.id] || '0,00';
                                const hasCustomPrice = customPrice !== undefined && Math.abs(customPrice - defaultPrice) > 0.01;

                                return (
                                    <div key={service.id} className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 md:col-span-1">{service.name}</h4>
                                        <div className="text-sm md:text-center">
                                            <span className="text-slate-500 dark:text-slate-400">Padrão: </span>
                                            <span className={`font-semibold ${hasCustomPrice ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'}`}>R$ {formatCurrency(defaultPrice)}</span>
                                        </div>
                                        <div>
                                            <label htmlFor={`price-${service.id}`} className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Preço para {client.name.split(' ')[0]}</label>
                                            <div className="relative"><input type="text" id={`price-${service.id}`} value={currentPriceStr} onChange={e => handlePriceChange(service.id, e.target.value)} onBlur={e => handleBlur(service.id, e.target.value)} className={`w-full p-2 border rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-700 dark:text-white ${hasCustomPrice ? 'border-purple-400 dark:border-purple-500 font-bold' : 'border-slate-300 dark:border-slate-600'}`} /></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
            <footer className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold bg-white dark:bg-slate-700 dark:text-slate-200 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600"><ArrowLeftIcon className="w-4 h-4" /> Voltar para Visão Geral</button>
                <button onClick={handleSave} disabled={isSaving} className="font-semibold text-white bg-green-500 px-6 py-2.5 rounded-lg shadow-md hover:bg-green-600 transition-shadow disabled:opacity-50 flex items-center gap-2"><CheckCircleIcon className="w-5 h-5" /> {isSaving ? 'Salvando...' : 'Salvar Preços'}</button>
            </footer>
        </div>
    );
};

// --- MODAL: HISTORY ---
const ClientHistoryModal: React.FC<{ client: Client, onClose: () => void }> = ({ client, onClose }) => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4" onClick={onClose}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <header className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center"><h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Histórico de Alterações: {client.name}</h2><button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><XIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></button></header>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {client.history?.length > 0 ? [...client.history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((item, index) => (
                    <div key={index} className="p-3 border dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-700/50"><p className="text-sm text-slate-800 dark:text-slate-200"><span className="font-semibold">{item.actor}:</span> {item.notes}</p><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{new Date(item.timestamp).toLocaleString('pt-BR')}</p></div>
                )) : <p className="text-center text-slate-500 dark:text-slate-400 py-10">Nenhum histórico encontrado.</p>}
            </div>
        </div>
    </div>
);


// --- HELPER & GENERIC COMPONENTS ---
const MetricCard: React.FC<{ icon: React.ReactNode, title: string, value: string }> = ({ icon, title, value }) => (<div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700"><div className="flex items-center gap-4"><div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-full">{icon}</div><div><p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">{title}</p><p className="text-xl font-bold text-slate-800 dark:text-slate-100">{value}</p></div></div></div>);
const BookingHistoryItem: React.FC<{ booking: Booking }> = ({ booking }) => (<div className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50"><div className="flex justify-between items-start"><p className="font-semibold text-slate-700 dark:text-slate-200">{booking.address}</p><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${booking.status === 'Realizado' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{booking.status}</span></div><p className="text-sm text-slate-500 dark:text-slate-400">{new Date(booking.date.replace(/-/g, '/')).toLocaleDateString('pt-BR')} • {booking.total_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>);

// --- MAIN COMPONENT ---
const ManageClients: React.FC = () => {
    // ✅ OTIMIZAÇÃO: Paginação + Cache
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 50;

    const [view, setView] = useState<'list' | 'details' | 'edit'>('list');
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [clientForInvoice, setClientForInvoice] = useState<Client | null>(null);
    const { impersonate } = useAuth();

    // ✅ OTIMIZAÇÃO: Debounce search query para reduzir queries excessivas
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    // ✅ CORREÇÃO: Usar busca global no banco de dados
    const { data: paginatedData, isLoading, isFetching, refetch } = useClientsSearch(debouncedSearchQuery, currentPage, PAGE_SIZE);
    const allClients = paginatedData?.data || [];
    const totalCount = paginatedData?.count || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const invalidateClients = useInvalidateClients();

    const refreshClients = async () => {
        invalidateClients(); // Invalida cache
        refetch(); // Refetch imediato
        if (selectedClientId) {
            const updatedClient = await getClientById(selectedClientId);
            if (!updatedClient) {
                setView('list');
                setSelectedClientId(null);
            }
        }
    };

    const filteredClients = useMemo(() => {
        return [...allClients].sort((a, b) => a.name.localeCompare(b.name));
    }, [allClients]);

    // \u2705 UX: Resetar página para 1 quando a busca mudar
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchQuery]);

    const handleViewDetails = (clientId: string) => {
        setSelectedClientId(clientId);
        setView('details');
    };

    const handleEdit = (clientId: string) => {
        setSelectedClientId(clientId);
        setView('edit');
    };

    const handleBackToList = () => {
        setSelectedClientId(null);
        setView('list');
    };

    const handleToggleStatus = (client: Client) => {
        const newStatus = !client.isActive;
        if (window.confirm(`Tem certeza que deseja ${newStatus ? 'ativar' : 'inativar'} o cliente ${client.name}?`)) {
            updateClient(client.id, { isActive: newStatus });
            refreshClients();
        }
    }

    const selectedClient = useMemo(() => {
        if (!selectedClientId) return null;
        return allClients.find(c => c.id === selectedClientId);
    }, [selectedClientId, allClients]);

    // Empty client for creation
    const emptyClient: Client = {
        id: '',
        name: '',
        tradeName: '',
        personType: 'Pessoa Jurídica',
        isActive: true,
        phone: '',
        commercialPhone: '',
        mobilePhone: '',
        email: '',
        marketingEmail1: '',
        marketingEmail2: '',
        cnpj: '',
        stateRegistration: '',
        dueDay: 10,
        paymentMethod: 'Boleto',
        paymentType: 'Pós-pago',
        network: '',
        customPrices: {},
        balance: 0,
        transactions: [],
        address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip: '', reference: '', observation: '' },
        history: [],
        notes: ''
    };

    if (view === 'create') {
        return <ClientFormPage client={emptyClient} onBack={() => setView('list')} onSave={() => { refreshClients(); setView('list'); }} isNew={true} />;
    }

    if (view === 'edit' && selectedClient) {
        return <ClientFormPage client={selectedClient} onBack={() => setView('details')} onSave={() => { refreshClients(); setView('details'); }} />;
    }

    if (view === 'details' && selectedClient) {
        return <ClientProfilePage client={selectedClient} onBack={handleBackToList} onSave={refreshClients} onEdit={() => handleEdit(selectedClient.id)} allClients={allClients} />;
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Gerenciar Clientes</h1>
                    <p className="text-slate-500 dark:text-slate-400">Visualize e gerencie todos os clientes da plataforma.</p>
                </div>
                <button onClick={() => setView('create')} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md hover:bg-purple-700 transition-colors flex items-center gap-2">
                    <PlusIcon className="w-5 h-5" /> Adicionar Cliente
                </button>
            </header>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="relative mb-6">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                    <input type="text" placeholder="Buscar por nome ou telefone do cliente..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full p-3 pl-12 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 transition-colors" />
                </div>

                <div className="space-y-4">
                    {filteredClients.length > 0 ? filteredClients.map(client => (
                        <div key={client.id} className={`p-4 border border-slate-200 dark:border-slate-700 rounded-lg transition-all ${!client.isActive ? 'bg-slate-100 dark:bg-slate-700/50 opacity-60' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                            <div className="flex justify-between items-start flex-wrap gap-2">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex-shrink-0">
                                        {client.profilePicUrl ? (
                                            <img src={client.profilePicUrl} alt={client.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center"><UserIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
                                            {client.name}
                                            {client.paymentType === 'Pré-pago' ? (
                                                <span className="flex items-center gap-0.5 px-2 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800 rounded-full text-xs font-bold">
                                                    <DollarSignIcon className="w-3 h-3" /> Pré
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-0.5 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-full text-xs font-bold">
                                                    <ClockIcon className="w-3 h-3" /> Pós
                                                </span>
                                            )}
                                            {!client.isActive && <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 px-2 py-0.5 rounded-full">INATIVO</span>}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{client.phone}</p>
                                        {client.asaasCustomerId && (
                                            <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold mt-0.5 flex items-center gap-1">
                                                <LinkIcon className="w-3 h-3" /> Integrado (Asaas)
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-wrap justify-end items-center">
                                    <button onClick={() => impersonate(client.id)} className="font-semibold text-sm bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 py-2 px-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-1" title="Logar como este usuário">
                                        <EyeIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setClientForInvoice(client)} disabled={!client.isActive} className="font-semibold text-sm bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 py-2 px-3 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-1" title="Gerar Cobrança Avulsa">
                                        <DollarSignIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleToggleStatus(client)} className={`font-semibold text-sm py-2 px-3 rounded-lg flex items-center gap-1 border transition-colors ${client.isActive ? 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20'}`} title={client.isActive ? 'Inativar Cliente' : 'Ativar Cliente'}>
                                        {client.isActive ? <XCircleIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => handleViewDetails(client.id)} className="font-semibold text-sm bg-white dark:bg-slate-700 dark:text-slate-200 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">Gerenciar Cliente</button>
                                </div>
                            </div>
                        </div>
                    )) : (<div className="text-center py-10 text-slate-500 dark:text-slate-400"><p>Nenhum cliente encontrado.</p></div>)}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalCount={totalCount}
                        pageSize={PAGE_SIZE}
                        onPageChange={setCurrentPage}
                        isLoading={isFetching}
                    />
                )}
            </div>

            {clientForInvoice && (
                <GenerateInvoiceModal
                    client={clientForInvoice}
                    onClose={() => setClientForInvoice(null)}
                    onConfirm={() => {
                        setClientForInvoice(null);
                        alert('Cobrança gerada com sucesso! Verifique em Financeiro > Faturas.');
                    }}
                />
            )}
        </div>
    );
};

export default ManageClients;
