
import React, { useState, useRef, useEffect } from 'react';
import { UserIcon, MailIcon, LockIcon, PhoneIcon, MapPinIcon, FileTextIcon, ArrowLeftIcon, BuildingIcon, LoaderIcon } from './icons';
import { addClient, loadGoogleMapsScript } from '../services/bookingService';
import { supabase } from '../services/supabase';
import { Client, ClientAddress } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../contexts/AuthContext';
import { maskPhone, maskCPF, maskCNPJ, maskCEP } from '../utils/masks';

interface RegisterPageProps {
    onBack: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onBack }) => {
    const { login } = useAuth();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        tradeName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        personType: 'Pessoa Física' as 'Pessoa Física' | 'Pessoa Jurídica',
        document: '', // CPF or CNPJ
    });

    const [address, setAddress] = useState<ClientAddress>({
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        zip: '',
        complement: ''
    });
    const [fullAddressString, setFullAddressString] = useState('');

    // Google Maps
    const autocompleteInputRef = useRef<HTMLInputElement>(null);
    const autocompleteInstanceRef = useRef<any>(null);

    // Initialize autocomplete
    const initAutocomplete = async () => {
        if (!autocompleteInputRef.current) {
            console.warn('⚠️ Input ref não encontrado');
            return;
        }

        try {
            console.log('🗺️ Iniciando Google Maps Autocomplete...');

            // Ensure Google Maps is loaded
            if (!(window as any).google || !(window as any).google.maps) {
                console.log('📥 Carregando Google Maps script...');
                await loadGoogleMapsScript();
            }

            console.log('✅ Google Maps disponível');

            // Wait a bit for the library to be fully ready
            await new Promise(resolve => setTimeout(resolve, 500));

            // Try to import Places library
            try {
                console.log('📚 Importando Places library...');
                const { Autocomplete } = await (window as any).google.maps.importLibrary("places");
                console.log('✅ Places library importada');

                console.log('🎯 Criando Autocomplete instance...');
                autocompleteInstanceRef.current = new Autocomplete(
                    autocompleteInputRef.current,
                    {
                        types: ['address'],
                        componentRestrictions: { country: 'br' }
                    }
                );

                console.log('📍 Adicionando listener...');
                autocompleteInstanceRef.current.addListener('place_changed', () => {
                    const place = autocompleteInstanceRef.current.getPlace();
                    console.log('📍 Local selecionado:', place);

                    if (place?.address_components) {
                        const get = (type: string) => place.address_components.find((c: any) => c.types.includes(type))?.long_name || '';
                        const getShort = (type: string) => place.address_components.find((c: any) => c.types.includes(type))?.short_name || '';

                        const newAddress = {
                            street: get('route'),
                            number: get('street_number'),
                            neighborhood: get('sublocality_level_1'),
                            city: get('administrative_area_level_2'),
                            state: getShort('administrative_area_level_1'),
                            zip: get('postal_code'),
                            complement: ''
                        };

                        setAddress(newAddress);
                        setFullAddressString(place.formatted_address || '');
                        console.log('✅ Endereço preenchido:', newAddress);
                    }
                });

                console.log('✅ Autocomplete configurado com sucesso!');
            } catch (importError) {
                console.error('❌ Erro ao importar Places library:', importError);
                console.log('🔄 Tentando método alternativo...');

                // Fallback: use old API if new one fails
                if ((window as any).google?.maps?.places?.Autocomplete) {
                    console.log('🎯 Usando API antiga do Google Maps');
                    autocompleteInstanceRef.current = new (window as any).google.maps.places.Autocomplete(
                        autocompleteInputRef.current,
                        { types: ['address'], componentRestrictions: { country: 'br' } }
                    );

                    autocompleteInstanceRef.current.addListener('place_changed', () => {
                        const place = autocompleteInstanceRef.current.getPlace();
                        console.log('📍 Local selecionado:', place);

                        if (place?.address_components) {
                            const get = (type: string) => place.address_components.find((c: any) => c.types.includes(type))?.long_name || '';
                            const getShort = (type: string) => place.address_components.find((c: any) => c.types.includes(type))?.short_name || '';

                            const newAddress = {
                                street: get('route'),
                                number: get('street_number'),
                                neighborhood: get('sublocality_level_1'),
                                city: get('administrative_area_level_2'),
                                state: getShort('administrative_area_level_1'),
                                zip: get('postal_code'),
                                complement: ''
                            };

                            setAddress(newAddress);
                            setFullAddressString(place.formatted_address || '');
                            console.log('✅ Endereço preenchido:', newAddress);
                        }
                    });
                    console.log('✅ Autocomplete (API antiga) configurado!');
                }
            }

        } catch (error) {
            console.error('❌ Erro ao inicializar Google Maps:', error);
        }
    };

    useEffect(() => {
        // Only initialize autocomplete when on step 2 (address form)
        if (step === 2) {
            console.log('🚀 Step 2 montado, inicializando autocomplete...');
            // Delay to ensure input is fully mounted
            const timer = setTimeout(() => {
                initAutocomplete();
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [step]); // Run when step changes

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let newValue = value;

        if (name === 'phone') {
            newValue = maskPhone(value);
        } else if (name === 'document') {
            if (formData.personType === 'Pessoa Física') {
                newValue = maskCPF(value);
            } else {
                newValue = maskCNPJ(value);
            }
        }

        setFormData({ ...formData, [name]: newValue });
    };

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let newValue = value;

        if (name === 'zip') {
            newValue = maskCEP(value);
        }
        setAddress({ ...address, [name]: newValue });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (step === 1) {
            if (formData.password !== formData.confirmPassword) {
                setError('As senhas não coincidem.');
                return;
            }
            if (formData.password.length < 6) {
                setError('A senha deve ter pelo menos 6 caracteres.');
                return;
            }
            setStep(2);
            return;
        }

        // Final Submit - Create user in Supabase Auth AND clients table
        setIsLoading(true);
        try {
            console.log('🔐 Criando usuário no Supabase Auth...');

            // 1. Create user in Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.name
                    },
                    emailRedirectTo: window.location.origin
                }
            });

            if (authError) {
                console.error('❌ Erro no Supabase Auth:', authError);

                if (authError.message.includes('Signups not allowed')) {
                    setError('Cadastro público desabilitado. Contate o administrador.');
                    console.error('💡 SOLUÇÃO: Habilite "Allow new sign ups" no Supabase Dashboard → Auth → Providers → Email');
                } else if (authError.message.includes('Email confirmations') || authError.message.includes('confirmation email')) {
                    setError('Erro na configuração de email. Contate o administrador do sistema.');
                    console.error('💡 SOLUÇÃO: Desabilite "Email Confirmation" no Supabase Dashboard → Auth → Providers → Email');
                } else if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
                    setError('Este email já está cadastrado. Tente fazer login.');
                } else {
                    setError(`Erro ao criar conta: ${authError.message}`);
                }
                setIsLoading(false);
                return;
            }

            if (!authData.user) {
                setError('Erro ao criar usuário. Tente novamente.');
                setIsLoading(false);
                return;
            }

            console.log('✅ Usuário criado no Auth:', authData.user.id);

            // 2. Create client record with the Auth user ID
            const newClient: Client = {
                id: authData.user.id, // Important: Use Auth ID!
                name: formData.name,
                tradeName: formData.tradeName,
                personType: formData.personType,
                email: formData.email,
                phone: formData.phone,
                commercialPhone: '',
                mobilePhone: formData.phone,
                marketingEmail1: formData.email,
                marketingEmail2: '',
                cnpj: formData.document, // Store both CPF and CNPJ in this field
                cpf: formData.personType === 'Pessoa Física' ? formData.document : '', // Add CPF field
                stateRegistration: '',
                dueDay: 10,
                paymentMethod: 'Pix',
                paymentType: 'Pré-pago',
                network: '',
                customPrices: {},
                balance: 0,
                transactions: [],
                address: { ...address, lat: -25.4284, lng: -49.2733 },
                billingAddress: address,
                history: [{ timestamp: new Date().toISOString(), actor: 'Sistema', notes: 'Auto-cadastro realizado' }],
                notes: '',
                isActive: true,
                password: formData.password // Keep for legacy auth simulation
            };

            console.log('💾 Criando registro na tabela clients...');
            await addClient(newClient);
            console.log('✅ Cliente criado com sucesso!');

            // 3. Auto login
            console.log('🔓 Fazendo login automático...');
            const loginSuccess = await login(formData.email, formData.password);

            if (!loginSuccess) {
                console.warn('⚠️ Login automático falhou, mas usuário foi criado.');
                setError('Conta criada! Por favor, faça login manualmente.');
                setIsLoading(false);
                // Redirect to login after 2 seconds
                setTimeout(() => {
                    onBack(); // Go back to login screen
                }, 2000);
            } else {
                console.log('✅ Login automático bem-sucedido!');
            }

        } catch (err: any) {
            console.error('❌ Erro no cadastro:', err);
            setError('Erro ao criar conta. Tente novamente.');
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8 animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-purple-600 mb-6 transition-colors">
                <ArrowLeftIcon className="w-4 h-4" /> Voltar para Login
            </button>

            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Crie sua conta</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Junte-se à SheepHouse e gerencie seus imóveis.</p>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-800 mb-4 text-center animate-fade-in">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

                {step === 1 && (
                    <div className="space-y-4 animate-slide-in-right">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Dados Pessoais</label>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input name="name" value={formData.name} onChange={handleInputChange} className="w-full pl-10 p-3 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-purple-500 outline-none transition-colors" placeholder="Nome Completo / Razão Social" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <select name="personType" value={formData.personType} onChange={handleInputChange} className="w-full p-3 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-purple-500 outline-none">
                                        <option value="Pessoa Física">Pessoa Física</option>
                                        <option value="Pessoa Jurídica">Pessoa Jurídica</option>
                                    </select>
                                    <div className="relative">
                                        <FileTextIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input name="document" value={formData.document} onChange={handleInputChange} className="w-full pl-10 p-3 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-purple-500 outline-none" placeholder={formData.personType === 'Pessoa Física' ? 'CPF' : 'CNPJ'} required />
                                    </div>
                                </div>
                                <div className="relative">
                                    <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input name="phone" type="tel" value={formData.phone} onChange={handleInputChange} className="w-full pl-10 p-3 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Whatsapp / Celular" required />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Acesso</label>
                            <div className="space-y-3">
                                <div className="relative">
                                    <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full pl-10 p-3 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Seu melhor email" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input name="password" type="password" value={formData.password} onChange={handleInputChange} className="w-full pl-10 p-3 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Senha" required />
                                    </div>
                                    <div className="relative">
                                        <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleInputChange} className="w-full pl-10 p-3 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Confirmar Senha" required />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all transform active:scale-[0.98]">
                            Continuar &rarr;
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4 animate-slide-in-right">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Endereço</label>
                            <div className="relative mb-3">
                                <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500 z-10" />
                                <input
                                    ref={autocompleteInputRef}
                                    value={fullAddressString}
                                    onChange={(e) => setFullAddressString(e.target.value)}
                                    className="w-full pl-10 p-3 border-2 border-purple-100 dark:border-purple-900 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="Buscar endereço (Google Maps)..."
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-3">
                                <input name="zip" value={address.zip} onChange={handleAddressChange} className="col-span-1 p-3 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="CEP" required />
                                <input name="city" value={address.city} onChange={handleAddressChange} className="col-span-2 p-3 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="Cidade" required />
                            </div>
                            <div className="grid grid-cols-3 gap-3 mb-3">
                                <input name="street" value={address.street} onChange={handleAddressChange} className="col-span-2 p-3 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="Rua" required />
                                <input name="number" value={address.number} onChange={handleAddressChange} className="col-span-1 p-3 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="Nº" required />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input name="neighborhood" value={address.neighborhood} onChange={handleAddressChange} className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="Bairro" required />
                                <input name="state" value={address.state} onChange={handleAddressChange} className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="Estado (UF)" required />
                            </div>
                        </div>

                        <button type="submit" disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isLoading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <BuildingIcon className="w-5 h-5" />}
                            {isLoading ? 'Criando conta...' : 'Finalizar Cadastro'}
                        </button>
                        <button type="button" onClick={() => setStep(1)} className="w-full text-slate-500 dark:text-slate-400 text-sm font-semibold hover:text-purple-600 dark:hover:text-purple-400">Voltar</button>
                    </div>
                )}
            </form>
        </div>
    );
};

export default RegisterPage;
