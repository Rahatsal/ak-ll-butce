import React, { useState, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Transaction, TransactionType, FinancialSummary } from './types';
import { SummaryCards } from './components/SummaryCards';
import { TransactionList } from './components/TransactionList';
import { AddTransactionModal } from './components/AddTransactionModal';
import { Plus, Sparkles, PieChart as PieIcon, Home as HomeIcon, Settings, Download, Upload, Trash2, X, TrendingUp, Smartphone, Link, QrCode, Copy, ExternalLink, AlertTriangle, FileCode } from 'lucide-react';
import { getFinancialAdvice } from './services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#64748b'];

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('transactions');
    return saved ? JSON.parse(saved) : [];
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'stats'>('home');
  const [advice, setAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [chartType, setChartType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [qrUrl, setQrUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    // Set initial QR URL to current window location
    setQrUrl(window.location.href);
  }, []);

  // PWA Install Prompt Handler
  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const summary = useMemo<FinancialSummary>(() => {
    const totalIncome = transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => acc + curr.amount, 0);
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense
    };
  }, [transactions]);

  // Pie Chart Data (Income or Expense based on selection)
  const pieChartData = useMemo(() => {
    const filtered = transactions.filter(t => t.type === chartType);
    const categoryMap: Record<string, number> = {};
    let total = 0;

    filtered.forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
      total += t.amount;
    });

    return Object.entries(categoryMap)
      .map(([name, value]) => ({ 
        name, 
        value,
        percentage: total > 0 ? ((value / total) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.value - a.value); // Sort by highest amount
  }, [transactions, chartType]);

  // Monthly Bar Chart Data (Last 6 months)
  const monthlyData = useMemo(() => {
    const data: Record<string, { name: string, Gelir: number, Gider: number }> = {};
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const name = d.toLocaleDateString('tr-TR', { month: 'short' });
      data[key] = { name, Gelir: 0, Gider: 0 };
    }

    transactions.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (data[key]) {
        if (t.type === TransactionType.INCOME) data[key].Gelir += t.amount;
        else data[key].Gider += t.amount;
      }
    });

    return Object.values(data);
  }, [transactions]);

  const handleAddTransaction = (data: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...data,
      id: uuidv4()
    };
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const handleDeleteTransaction = (id: string) => {
    // Confirmation dialog removed to improve UX and fix potential blocking issues
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleGetAdvice = async () => {
    setLoadingAdvice(true);
    const result = await getFinancialAdvice(transactions);
    setAdvice(result);
    setLoadingAdvice(false);
  };

  // Backup Logic (Updated for Android Compatibility using Blob)
  const handleBackup = () => {
    try {
      const jsonString = JSON.stringify(transactions, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `akilli-butce-yedek-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Yedek oluşturulurken bir hata oluştu.");
      console.error("Backup failed:", error);
    }
  };

  // Restore Logic (Updated with validation)
  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const loadedData = JSON.parse(content);
        
        // Validation: Check if it's an array and looks like transaction data
        const isValidBackup = Array.isArray(loadedData) && 
          (loadedData.length === 0 || (loadedData[0].hasOwnProperty('id') && loadedData[0].hasOwnProperty('amount')));

        if (isValidBackup) {
          if(window.confirm(`Bu dosya ${loadedData.length} adet işlem içeriyor. Mevcut verilerin üzerine yazılacak. Onaylıyor musun?`)) {
            setTransactions(loadedData);
            alert("Yedek başarıyla yüklendi!");
            setIsSettingsOpen(false);
          }
        } else {
          alert("Hata: Bu dosya geçerli bir Akıllı Bütçe yedek dosyası değil.");
        }
      } catch (error) {
        alert("Dosya okunamadı veya bozuk.");
        console.error("Restore failed:", error);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearAll = () => {
    if (window.confirm("TÜM VERİLER SİLİNECEK! Bu işlem geri alınamaz. Emin misin?")) {
      setTransactions([]);
      setIsSettingsOpen(false);
    }
  };

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    // Show the install prompt
    installPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    // We've used the prompt, and can't use it again, throw it away
    setInstallPrompt(null);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrUrl).then(() => {
      alert("Bağlantı kopyalandı! \n\nBu linki kendine gönderip (WhatsApp/E-posta) telefonunda açabilirsin.");
    }).catch(() => {
      alert("Bağlantı kopyalanamadı. Lütfen aşağıdaki kutudan manuel kopyala.");
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 relative max-w-md mx-auto shadow-2xl overflow-hidden border-x border-slate-200">
      
      {/* Header */}
      <header className="pt-8 pb-4 px-6 bg-white sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <div>
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Akıllı Bütçe</p>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            Murat, başarabilirsin! 💪
          </h1>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
        >
          <Settings size={20} />
        </button>
      </header>

      {/* Content Area */}
      <main className="p-6 pb-28 overflow-y-auto h-[calc(100vh-150px)] no-scrollbar">
        
        {activeTab === 'home' && (
          <div className="animate-in fade-in duration-300">
            <SummaryCards summary={summary} />
            
            <div className="flex justify-between items-center mb-4 mt-8">
              <h3 className="font-bold text-lg text-slate-800">Son İşlemler</h3>
            </div>

            <TransactionList transactions={transactions} onDelete={handleDeleteTransaction} />
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="animate-in fade-in duration-300 pb-8">
             <h2 className="text-xl font-bold mb-6 text-slate-800">Analiz & Rapor</h2>
             
             {/* Pie Chart Section */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
                    <button
                    onClick={() => setChartType(TransactionType.EXPENSE)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${chartType === TransactionType.EXPENSE ? 'bg-white shadow-sm text-red-600' : 'text-gray-500'}`}
                    >
                    Gider Dağılımı
                    </button>
                    <button
                    onClick={() => setChartType(TransactionType.INCOME)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${chartType === TransactionType.INCOME ? 'bg-white shadow-sm text-green-600' : 'text-gray-500'}`}
                    >
                    Gelir Dağılımı
                    </button>
                </div>

                {pieChartData.length > 0 ? (
                  <>
                    <div className="h-64 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            >
                            {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value} ₺`} />
                        </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <span className="block text-xs text-gray-400">Toplam</span>
                                <span className="block font-bold text-gray-800">
                                    {pieChartData.reduce((a, b) => a + b.value, 0).toLocaleString('tr-TR')}₺
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Detailed List */}
                    <div className="mt-6 space-y-3">
                        {pieChartData.map((entry, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <span className="text-gray-600 font-medium">{entry.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-600">%{entry.percentage}</span>
                                    <span className="font-semibold text-gray-800 w-20 text-right">{entry.value.toLocaleString('tr-TR')} ₺</span>
                                </div>
                            </div>
                        ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <PieIcon size={48} className="mb-2 opacity-20" />
                    <p>Bu kategoride veri yok.</p>
                  </div>
                )}
             </div>

             {/* Monthly Bar Chart */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                 <h4 className="font-semibold mb-4 text-slate-700 flex items-center gap-2">
                    <TrendingUp size={18} className="text-indigo-500"/>
                    Aylık Özet
                 </h4>
                 <div className="h-52 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                            <YAxis hide />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{fill: '#f8fafc'}}
                            />
                            <Legend iconType="circle" />
                            <Bar dataKey="Gelir" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Gider" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                 </div>
             </div>

             {/* AI Advice Section */}
             <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                
                <div className="flex items-center gap-2 mb-4 relative z-10">
                  <div className="p-1.5 bg-white/20 rounded-lg">
                    <Sparkles size={18} className="text-yellow-300" />
                  </div>
                  <h3 className="font-bold text-lg">Gemini Tavsiyesi</h3>
                </div>
                
                <div className="relative z-10">
                  {advice ? (
                    <div className="bg-white/10 p-4 rounded-xl mb-4 backdrop-blur-sm border border-white/10">
                      <p className="text-indigo-50 leading-relaxed font-medium">
                        "{advice}"
                      </p>
                    </div>
                  ) : (
                     <p className="text-indigo-100 text-sm mb-6 opacity-90 leading-relaxed">
                       Harcama alışkanlıklarını analiz edip, daha iyi bir bütçe yönetimi için sana özel ipuçları verebilirim.
                     </p>
                  )}

                  <button 
                    onClick={handleGetAdvice}
                    disabled={loadingAdvice}
                    className="w-full bg-white text-indigo-600 font-bold py-3.5 rounded-xl hover:bg-indigo-50 transition-all disabled:opacity-70 shadow-sm active:scale-[0.98]"
                  >
                    {loadingAdvice ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                        Düşünüyorum...
                      </span>
                    ) : (advice ? "Yeni Bir Tavsiye Ver" : "Harcamalarımı Analiz Et")}
                  </button>
                </div>
             </div>
          </div>
        )}

      </main>

      {/* FAB (Floating Action Button) */}
      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20">
         <button 
           onClick={() => setIsModalOpen(true)}
           className="group bg-indigo-600 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-xl shadow-indigo-300 hover:bg-indigo-700 hover:scale-105 transition-all active:scale-95"
         >
           <Plus size={32} className="group-hover:rotate-90 transition-transform duration-300" />
         </button>
      </div>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-8 py-4 flex justify-between items-center z-10 pb-safe">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'home' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <HomeIcon size={24} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
          <span className="text-[10px] font-semibold tracking-wide">Ana Sayfa</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'stats' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <PieIcon size={24} strokeWidth={activeTab === 'stats' ? 2.5 : 2} />
          <span className="text-[10px] font-semibold tracking-wide">Analiz</span>
        </button>
      </nav>

      <AddTransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdd={handleAddTransaction} 
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl scale-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold text-slate-800">Ayarlar</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              
              {/* Install Banner */}
              {installPrompt && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-2">
                    <h3 className="font-bold text-blue-800 mb-1 flex items-center gap-2">
                        <Download size={16} />
                        Uygulama Olarak Yükle
                    </h3>
                    <p className="text-xs text-blue-600 mb-3">
                        Bu siteyi telefonuna uygulama olarak yükleyebilirsin.
                    </p>
                    <button 
                    onClick={handleInstallClick}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
                    >
                    Yükle
                    </button>
                </div>
              )}

              {/* Guide Section */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h3 className="font-bold text-gray-800 mb-3 text-sm flex items-center gap-2">
                      <FileCode size={16} className="text-indigo-600"/>
                      APK & Yayınlama Rehberi
                  </h3>
                  
                  <div className="space-y-4">
                      <div>
                          <h4 className="text-xs font-bold text-gray-700 mb-1">1. "404 Hatası" Neden Çıkıyor?</h4>
                          <p className="text-[10px] text-gray-500 leading-relaxed">
                              Şu anki önizleme linki "özeldir" (private). Sadece senin bilgisayarında çalışır. Telefonundan açmak için uygulamanın internete yayınlanması (Deploy) gerekir.
                          </p>
                      </div>

                      <div>
                          <h4 className="text-xs font-bold text-gray-700 mb-1">2. Nasıl Yayınlarım? (Ücretsiz)</h4>
                          <p className="text-[10px] text-gray-500 leading-relaxed mb-2">
                              Vercel veya Netlify gibi servisler ücretsizdir. GitHub hesabınla bağlanıp projenin deposunu seçmen yeterli.
                          </p>
                      </div>

                      <div>
                          <h4 className="text-xs font-bold text-gray-700 mb-1">3. APK (Android Dosyası) Nasıl Yaparım?</h4>
                          <p className="text-[10px] text-gray-500 leading-relaxed mb-2">
                              Android Studio ile uğraşmana gerek yok! Siteyi yayınladıktan sonra linki kopyala ve 
                              <strong className="text-indigo-600"> PWABuilder.com</strong> sitesine yapıştır. Oradan "Build Store Package" diyerek Android APK'sını indirebilirsin.
                          </p>
                      </div>

                      <div className="bg-indigo-50 p-2 rounded border border-indigo-100">
                        <p className="text-[10px] text-indigo-700 font-medium">
                           💡 En Kolayı: Siteyi telefonda Chrome ile aç. Menüden "Ana Ekrana Ekle" de. APK indirmeden uygulama gibi çalışır.
                        </p>
                      </div>
                  </div>
              </div>
              
              {/* QR Code Section */}
              <div className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col items-center text-center">
                <h3 className="font-bold text-gray-800 mb-2 text-sm">QR ile Paylaş</h3>
                
                {/* Warning for localhost */}
                <div className="w-full bg-amber-50 border border-amber-100 p-2 rounded-lg flex items-start gap-2 text-left mb-3">
                    <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-amber-700">
                        Eğer bu bir önizleme linkiyse telefonunda açılmayabilir. Yukarıdaki rehberi oku.
                    </p>
                </div>

                <div className="bg-white p-2 rounded-lg shadow-sm mb-3 border border-gray-100">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrUrl)}`} 
                    alt="Uygulama QR Kodu" 
                    className="w-28 h-28"
                  />
                </div>
                
                <div className="w-full mb-2">
                  <input 
                    type="text" 
                    value={qrUrl}
                    onChange={(e) => setQrUrl(e.target.value)}
                    className="w-full text-xs p-2 rounded border border-gray-200 bg-gray-50 text-gray-500 truncate"
                  />
                </div>

                <button 
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-900 transition-colors"
                >
                  <Copy size={14} />
                  Linki Kopyala
                </button>
              </div>

              {/* Data Management */}
              <div className="pt-2 space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Veri Yönetimi</h4>
                
                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={handleBackup}
                        className="flex flex-col items-center justify-center gap-1 p-3 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100"
                    >
                        <Download size={18} />
                        <span className="text-xs font-medium">Yedekle</span>
                    </button>

                    <div className="relative">
                        <input 
                        type="file" 
                        accept=".json" 
                        ref={fileInputRef}
                        onChange={handleRestore}
                        className="hidden" 
                        />
                        <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-full flex flex-col items-center justify-center gap-1 p-3 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100"
                        >
                        <Upload size={18} />
                        <span className="text-xs font-medium">Geri Yükle</span>
                        </button>
                    </div>
                </div>

                <button 
                  onClick={handleClearAll}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                >
                  <Trash2 size={16} />
                  <span className="text-xs font-bold">Tüm Verileri Sıfırla</span>
                </button>
              </div>

              <div className="text-center mt-4">
                <p className="text-[10px] text-gray-300">Akıllı Bütçe v1.5 • React PWA</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;