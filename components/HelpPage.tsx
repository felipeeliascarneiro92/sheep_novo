import React, { useState } from 'react';
import { HelpCircleIcon, BookOpenIcon, DollarSignIcon, ClockIcon, CameraIcon, ChevronRightIcon, AlertTriangleIcon, SparklesIcon } from './icons';

type HelpCategory = 'tutorial' | 'wallet' | 'flash' | 'services' | 'tips';

interface HelpItem {
    id: string;
    question: string;
    answer: React.ReactNode;
}

const helpContent: Record<HelpCategory, { title: string, icon: React.ReactNode, items: HelpItem[] }> = {
    tutorial: {
        title: "Primeiros Passos",
        icon: <BookOpenIcon className="w-6 h-6 text-blue-600" />,
        items: [
            {
                id: 't1',
                question: 'Como realizo meu primeiro agendamento?',
                answer: 'É muito simples! No menu lateral, clique em "Novo Agendamento". 1) Escolha o serviço desejado. 2) Digite o endereço do imóvel. 3) Selecione a data e horário com o fotógrafo de sua preferência. Pronto!'
            },
            {
                id: 't2',
                question: 'Posso cadastrar corretores da minha equipe?',
                answer: 'Sim! No menu "Corretores", você pode adicionar membros da sua equipe. Eles receberão um login próprio para agendar sessões vinculadas à sua imobiliária.'
            },
            {
                id: 't3',
                question: 'Onde encontro promoções e cupons?',
                answer: 'Fique de olho no banner rotativo na sua Página Inicial! Lá divulgamos ofertas relâmpago, novidades e códigos promocionais exclusivos para você usar nos seus agendamentos.'
            }
        ]
    },
    wallet: {
        title: "Financeiro & Carteira",
        icon: <DollarSignIcon className="w-6 h-6 text-green-600" />,
        items: [
            {
                id: 'w1',
                question: 'Como funciona o Saldo Negativo?',
                answer: (
                    <div>
                        <p>Pensamos na flexibilidade do seu negócio. Se você não tiver saldo suficiente no momento do agendamento, o sistema permite que seu saldo fique negativo até o limite de <strong className="text-red-600">R$ 100,00</strong>.</p>
                        <p className="mt-2 text-sm bg-yellow-50 p-2 rounded border border-yellow-200">Exemplo: Você tem R$ 20,00 e quer um serviço de R$ 90,00. Seu saldo final será de <strong className="text-red-600">-R$ 70,00</strong>. Você deverá quitar essa pendência na próxima recarga.</p>
                    </div>
                )
            },
            {
                id: 'w2',
                question: 'Qual a diferença entre Pré-pago e Pós-pago?',
                answer: 'Clientes Pré-pagos utilizam créditos na Carteira Digital para agendar. Clientes Pós-pagos recebem uma fatura mensal com todos os serviços realizados no período.'
            }
        ]
    },
    flash: {
        title: "Agendamento Flash ⚡",
        icon: <ClockIcon className="w-6 h-6 text-orange-600" />,
        items: [
            {
                id: 'f1',
                question: 'O que é o Agendamento Flash?',
                answer: 'É a nossa ferramenta de urgência. Quando você precisa de fotos "para ontem", o sistema localiza o fotógrafo disponível mais próximo geograficamente para atender o imóvel o mais rápido possível.'
            },
            {
                id: 'f2',
                question: 'Existe taxa extra?',
                answer: 'Sim, devido à necessidade de deslocamento imediato e bloqueio de agenda, é cobrada uma taxa de urgência fixa (exibida no momento da confirmação).'
            },
            {
                id: 'f3',
                question: 'Quais os horários de funcionamento?',
                answer: 'O Modo Flash aceita agendamentos para o próprio dia, com antecedência mínima de 1 hora. A disponibilidade depende de haver um fotógrafo livre num raio próximo ao imóvel.'
            }
        ]
    },
    services: {
        title: "Serviços & Adicionais",
        icon: <SparklesIcon className="w-6 h-6 text-pink-600" />,
        items: [
            {
                id: 's1',
                question: 'O que é o Creative Studio?',
                answer: 'É nossa central de edição avulsa. Você pode enviar fotos que você mesmo tirou (ou fotos antigas) para receber nosso tratamento profissional de imagem.'
            },
            {
                id: 's2',
                question: 'Como funciona a Entrega Express?',
                answer: 'Ao contratar a Entrega Express, suas fotos ganham prioridade máxima na fila de edição e são entregues na manhã seguinte à sessão (até as 12h).'
            },
            {
                id: 's3',
                question: 'O que é o adicional Céu Azul?',
                answer: 'Garante que suas fotos externas tenham um céu azul ensolarado, mesmo que o dia esteja nublado ou chuvoso. Fazemos a substituição do céu na pós-produção.'
            }
        ]
    },
    tips: {
        title: "Guia do Imóvel",
        icon: <CameraIcon className="w-6 h-6 text-purple-600" />,
        items: [
            {
                id: 'p1',
                question: 'Como preparar o imóvel para as fotos?',
                answer: (
                    <ul className="list-disc list-inside space-y-1">
                        <li>Abra todas as cortinas e persianas para luz natural.</li>
                        <li>Acenda todas as luzes (inclusive abajures).</li>
                        <li>Abaixe as tampas dos vasos sanitários.</li>
                        <li>Esconda produtos de limpeza, panos e itens pessoais.</li>
                        <li>Retire carros da garagem se possível.</li>
                    </ul>
                )
            },
            {
                id: 'p2',
                question: 'O que acontece se chover?',
                answer: 'Para fotos externas e drones, a chuva impede o serviço. Você pode reagendar gratuitamente até 2 horas antes da sessão em caso de mau tempo severo.'
            }
        ]
    }
};

const HelpPage: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState<HelpCategory>('tutorial');
    const [expandedItem, setExpandedItem] = useState<string | null>(null);

    const toggleItem = (id: string) => {
        setExpandedItem(prev => prev === id ? null : id);
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
            <header className="text-center py-8">
                <h1 className="text-3xl font-bold text-slate-800 flex items-center justify-center gap-3">
                    <HelpCircleIcon className="w-10 h-10 text-purple-600" />
                    Academia SheepHouse
                </h1>
                <p className="text-slate-500 mt-2 text-lg">Tudo o que você precisa saber para dominar a plataforma.</p>
            </header>

            {/* Quick Access Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(Object.entries(helpContent) as [HelpCategory, typeof helpContent[HelpCategory]][]).map(([key, data]) => (
                    <button
                        key={key}
                        onClick={() => setActiveCategory(key)}
                        className={`p-6 rounded-xl border text-left transition-all duration-300 group relative overflow-hidden ${activeCategory === key ? 'bg-white border-purple-500 shadow-lg ring-1 ring-purple-500' : 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-md'}`}
                    >
                        <div className="mb-4 bg-slate-50 w-fit p-3 rounded-full group-hover:bg-purple-50 transition-colors">
                            {data.icon}
                        </div>
                        <h3 className={`font-bold text-lg ${activeCategory === key ? 'text-purple-700' : 'text-slate-700'}`}>{data.title}</h3>
                        <p className="text-xs text-slate-400 mt-2 uppercase tracking-wider font-semibold">
                            {data.items.length} Tópicos
                        </p>
                        {activeCategory === key && (
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-500"></div>
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                {helpContent[activeCategory].icon}
                                {helpContent[activeCategory].title}
                            </h2>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {helpContent[activeCategory].items.map(item => (
                                <div key={item.id} className="group bg-white">
                                    <button
                                        onClick={() => toggleItem(item.id)}
                                        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors focus:outline-none"
                                    >
                                        <span className="font-medium text-slate-700 group-hover:text-purple-700">{item.question}</span>
                                        <ChevronRightIcon className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${expandedItem === item.id ? 'rotate-90 text-purple-500' : ''}`} />
                                    </button>
                                    <div
                                        className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedItem === item.id ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                                    >
                                        <div className="p-5 pt-0 text-slate-600 text-sm leading-relaxed border-l-4 border-purple-100 ml-5 mb-4">
                                            {item.answer}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Side Widgets */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
                        <h3 className="font-bold text-lg mb-2">Nível de Conhecimento</h3>
                        <div className="w-full bg-purple-900/50 rounded-full h-2.5 mb-4">
                            <div className="bg-yellow-400 h-2.5 rounded-full" style={{ width: '45%' }}></div>
                        </div>
                        <p className="text-xs text-purple-200 mb-4">Você está dominando o sistema! Leia os tópicos para ganhar badges virtuais.</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <AlertTriangleIcon className="w-5 h-5 text-amber-500" /> Dica do Dia
                        </h3>
                        <p className="text-sm text-slate-600 italic">
                            "Imóveis com fotos de drone têm 30% mais visualizações em portais imobiliários. Considere o pacote aéreo na sua próxima visita!"
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpPage;