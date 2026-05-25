import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, fastGetDocs } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  ArrowRight, 
  CheckSquare, 
  Square, 
  Sparkles, 
  Calculator, 
  Activity, 
  CheckCircle, 
  Thermometer, 
  Info,
  Layers,
  HelpCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Chores {
  id: string;
  textBn: string;
  textEn: string;
  completed: boolean;
}

export default function Dashboard() {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const [activeBatch, setActiveBatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [totalMortality, setTotalMortality] = useState<number>(0);
  const [profileData, setProfileData] = useState<any>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  // Chores Checklist State
  const [chores, setChores] = useState<Chores[]>([]);
  
  // Dynamic Calculator State
  const [calcBreed, setCalcBreed] = useState<'broiler' | 'sonali' | 'cattle'>('broiler');
  const [calcAge, setCalcAge] = useState<string>('15');
  const [calcResult, setCalcResult] = useState<{ weight: string; advice: string } | null>(null);

  // Tips index
  const [tipIndex, setTipIndex] = useState(0);

  const tips = [
    {
      bn: "গরমের সময়ে খামারে পর্যাপ্ত বিশুদ্ধ ঠান্ডা পানির ব্যবস্থা রাখুন এবং পানির পাত্র সবসময় পরিষ্কার রাখুন।",
      en: "Provide plenty of fresh, cool water during hot weather and keep the drinkers clean."
    },
    {
      bn: "মুরগির ঘর সর্বদা শুষ্ক রাখুন। বেশি স্যাঁতসেঁতে লিটার বা মেঝে থেকে কক্সিডিওসিস এবং আমাশয় হতে পারে।",
      en: "Keep the poultry house dry. Wet litter often leads to coccidiosis and enteritis."
    },
    {
      bn: "নিয়মিত ভ্যাকসিন প্রদান মুরগি এবং অন্যান্য পশুর মৃত্যুর হাত থেকে রক্ষার সবচেয়ে ভালো উপায়।",
      en: "Regular vaccination is the best way to safeguard poultry and cattle from fatal diseases."
    },
    {
      bn: "পশুর ঘরে বাতাস চলাচলের (ভেন্টিলেশন) সুব্যবস্থা রাখুন যেন ক্ষতিকর অ্যামোনিয়া গ্যাস জমে না থাকে।",
      en: "Ensure good cross-ventilation in the animal house to prevent ammonia gas buildup."
    },
    {
      bn: "খাবারের মান নিয়ন্ত্রণ করুন। মেয়াদোত্তীর্ণ বা স্যাঁতসেঁতে খাবার দিলে খামারের উৎপাদন বা ডিমের হার কমবে।",
      en: "Control feed quality. Exposing animals to damp or expired feed reduces growth and egg production."
    }
  ];

  useEffect(() => {
    // Rotate tip occasionally
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const getTodayDateString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  };

  // Load and initialize chores
  useEffect(() => {
    const todayStr = getTodayDateString();
    const savedChores = localStorage.getItem(`farm_chores_${todayStr}`);
    
    const defaultChores: Chores[] = [
      { id: '1', textBn: 'সকালে পানি ও ফ্রেশ খাবার দিন', textEn: 'Provide clean morning water & feed', completed: false },
      { id: '2', textBn: 'মাটি বা লিটার বিছানা শুকনা রাখুন', textEn: 'Ensure litter or floor is dry and clean', completed: false },
      { id: '3', textBn: 'ঘরের ভেন্টিলেশন ও পর্দা চেক করুন', textEn: 'Check farm ventilation and curtains', completed: false },
      { id: '4', textBn: 'তাপমাত্রা স্বাভাবিক আছে কিনা দেখুন', textEn: 'Monitor house temperature & humidity', completed: false },
      { id: '5', textBn: 'অসুস্থ বা দুর্বল পশুপাখি আলাদা করুন', textEn: 'Isolate sick or weak birds/animals', completed: false },
    ];

    if (savedChores) {
      try {
        setChores(JSON.parse(savedChores));
      } catch (e) {
        setChores(defaultChores);
      }
    } else {
      // Clean up old chores fields
      for (const key in localStorage) {
        if (key.startsWith('farm_chores_')) {
          localStorage.removeItem(key);
        }
      }
      setChores(defaultChores);
      localStorage.setItem(`farm_chores_${todayStr}`, JSON.stringify(defaultChores));
    }
  }, []);

  const toggleChore = (id: string) => {
    const updated = chores.map(c => c.id === id ? { ...c, completed: !c.completed } : c);
    setChores(updated);
    const todayStr = getTodayDateString();
    localStorage.setItem(`farm_chores_${todayStr}`, JSON.stringify(updated));
  };

  useEffect(() => {
    fetchActiveBatch();
    fetchRecentActivitiesAndStats();
    
    if (currentUser) {
      const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (docObj) => {
        if (docObj.exists()) {
          setProfileData(docObj.data());
        }
      });
      return () => unsub();
    }
  }, [currentUser]);

  // Run dynamic target weight calculator when breed or age changes
  useEffect(() => {
    calculateTarget();
  }, [calcBreed, calcAge]);

  const calculateTarget = () => {
    const age = parseInt(calcAge) || 0;
    if (calcBreed === 'broiler') {
      if (age <= 0) {
        setCalcResult({ weight: '৪০-৪৫ গ্রাম', advice: 'বাচ্চা ব্রুডিং শুরু করুন, স্যালাইন পানি দিন।' });
      } else if (age <= 7) {
        setCalcResult({ weight: '১৮০-২০০ গ্রাম', advice: 'ব্রুডিং এর তাপমাত্রা বজায় রাখুন, স্টার্টার খাবার দিন।' });
      } else if (age <= 14) {
        setCalcResult({ weight: '৪৫০-৫০০ গ্রাম', advice: 'গ্রোয়ার খাদ্য শুরু করুন, রানীক্ষেত প্লাস গামবোরো ভ্যাকসিন দিন।' });
      } else if (age <= 21) {
        setCalcResult({ weight: '৯০০-১০০০ গ্রাম', advice: 'লিটার মাটি সবসময় শুকনা রাখুন, নিয়মিত ভিটামিন এডি৩ ই দিন।' });
      } else if (age <= 28) {
        setCalcResult({ weight: '১৫০০-১৬০০ গ্রাম', advice: 'ঘরের বাতাস চলাচল (ভেন্টিলেশন) বাড়িয়ে দিন, বেশি গরম থেকে বাচান।' });
      } else if (age <= 35) {
        setCalcResult({ weight: '২১০০-২৩০০ গ্রাম', advice: 'বিক্রয়ের জন্য উপযুক্ত সময়, খাবারের পুষ্টির ভারসাম্য রাখুন।' });
      } else {
        setCalcResult({ weight: '২৫০০+ গ্রাম', advice: 'যথাশীঘ্র সম্ভব বাজারজাত করুন। বেশি বয়সে মৃত্যুঝুঁকি বাড়ে।' });
      }
    } else if (calcBreed === 'sonali') {
      if (age <= 5) {
        setCalcResult({ weight: '৪০-৪৫ গ্রাম', advice: 'পর্যাপ্ত ব্রুডিং ও উষ্ণ আবহাওয়া নিশ্চিত করুন।' });
      } else if (age <= 15) {
        setCalcResult({ weight: '১৩০-১৫০ গ্রাম', advice: 'লেয়ার স্টার্টার খাওয়ান ও রোগ প্রতিরোধে বিশেষ মনোযোগী হোন।' });
      } else if (age <= 30) {
        setCalcResult({ weight: '২৮০-৩২০ গ্রাম', advice: 'নিয়মিত ও সঠিক সময়ে ভ্যাকসিন সম্পন্ন করুন।' });
      } else if (age <= 45) {
        setCalcResult({ weight: '৫০০-৫৫০ গ্রাম', advice: 'গ্রোয়ার খাবার ও ভিটামিন বি১ বি২ কমপ্লেক্স যুক্ত পানি দিন।' });
      } else if (age <= 60) {
        setCalcResult({ weight: '৭৫০-৮৫০ গ্রাম', advice: 'বাজারজাত করুন, সোনালী মুরগির এই ওজন অত্যন্ত লাভজনক।' });
      } else {
        setCalcResult({ weight: '৯৫০+ গ্রাম', advice: 'সুস্থ অবস্থায় দ্রুত বিক্রয় সম্পন্ন করুন।' });
      }
    } else {
      setCalcResult({ 
        weight: 'প্রতি ৪ সপ্তাহে ৮-১০% বৃদ্ধি', 
        advice: 'নিয়মিত তাজা কাঁচা ঘাস, খড় এবং সঠিক পরিমাণ দানাদার খাদ্য দিন।' 
      });
    }
  };

  const fetchActiveBatch = async () => {
    if (!currentUser) return;
    try {
      const q = query(
        collection(db, 'batches'),
        where('userId', '==', currentUser.uid),
        where('status', '==', 'active')
      );
      const snapshot = await fastGetDocs(q);
      if (!snapshot.empty) {
        const batchData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setActiveBatch(batchData);
        fetchMortality(batchData.id);
      } else {
        setActiveBatch(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'batches');
    } finally {
      setLoading(false);
    }
  };

  const fetchMortality = async (batchId: string) => {
    if (!currentUser) return;
    try {
      const q = query(
        collection(db, 'mortality'),
        where('userId', '==', currentUser.uid),
        where('batchId', '==', batchId)
      );
      const snapshot = await fastGetDocs(q);
      let count = 0;
      snapshot.forEach(doc => {
        count += doc.data().count;
      });
      setTotalMortality(count);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'mortality');
    }
  };

  const fetchRecentActivitiesAndStats = async () => {
    if (!currentUser) return;
    try {
      const activities: any[] = [];

      // Get last 2 feed records
      const feedQ = query(
        collection(db, 'feed_records'),
        where('userId', '==', currentUser.uid),
        orderBy('date', 'desc')
      );
      try {
        const feedSnap = await fastGetDocs(feedQ);
        feedSnap.docs.slice(0, 2).forEach(d => {
          activities.push({
            id: d.id,
            type: 'feed',
            date: d.data().date,
            titleBn: 'খাবারের হিসাব',
            titleEn: 'Feed Record',
            detailsBn: `${d.data().feedType} - ${d.data().quantity} ব্যাগ/কেজি`,
            detailsEn: `${d.data().feedType} - ${d.data().quantity} bags/kg`,
            amount: d.data().totalPrice || 0
          });
        });
      } catch (e) {}

      // Get last 2 medicine records
      const medQ = query(
        collection(db, 'medicine_records'),
        where('userId', '==', currentUser.uid),
        orderBy('date', 'desc')
      );
      try {
        const medSnap = await fastGetDocs(medQ);
        medSnap.docs.slice(0, 2).forEach(d => {
          activities.push({
            id: d.id,
            type: 'medicine',
            date: d.data().date,
            titleBn: 'ঔষধ ভ্যাকসিন',
            titleEn: 'Medicine/Vaccine',
            detailsBn: `${d.data().type === 'vaccine' ? 'ভ্যাকসিন' : 'ঔষধ'} - ${d.data().name}`,
            detailsEn: `${d.data().type === 'vaccine' ? 'Vaccine' : 'Medicine'} - ${d.data().name}`,
            amount: d.data().totalPrice || 0
          });
        });
      } catch (e) {}

      // Get last 2 expenses
      const expQ = query(
        collection(db, 'expenses'),
        where('userId', '==', currentUser.uid),
        orderBy('date', 'desc')
      );
      try {
        const expSnap = await fastGetDocs(expQ);
        expSnap.docs.slice(0, 2).forEach(d => {
          activities.push({
            id: d.id,
            type: 'expense',
            date: d.data().date,
            titleBn: 'অন্যান্য খরচ',
            titleEn: 'Other Expense',
            detailsBn: `${d.data().category || 'অন্যান্য'} - ${d.data().details || ''}`,
            detailsEn: `${d.data().category || 'Other'} - ${d.data().details || ''}`,
            amount: d.data().amount || 0
          });
        });
      } catch (e) {}

      // Get last 2 sales
      const salesQ = query(
        collection(db, 'sales'),
        where('userId', '==', currentUser.uid),
        orderBy('date', 'desc')
      );
      try {
        const salesSnap = await fastGetDocs(salesQ);
        salesSnap.docs.slice(0, 2).forEach(d => {
          activities.push({
            id: d.id,
            type: 'sales',
            date: d.data().date,
            titleBn: 'বিক্রির হিসাব',
            titleEn: 'Sales Record',
            detailsBn: `ওজন: ${d.data().weight ? d.data().weight + ' কেজি' : d.data().quantity + ' টি'}`,
            detailsEn: `Weight: ${d.data().weight ? d.data().weight + ' kg' : d.data().quantity + ' pcs'}`,
            amount: d.data().totalPrice || 0
          });
        });
      } catch (e) {}

      // Sort all combined activities by date descending
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Limit to 4 elements
      setRecentActivities(activities.slice(0, 4));
    } catch (e) {
      console.error("Error combined activity logs:", e);
    }
  };

  const calculateAge = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getMortalityStatus = (rate: number) => {
    if (rate <= 4) return { color: 'text-green-600 bg-green-50', labelBn: 'খুব চমৎকার', labelEn: 'Excellent' };
    if (rate <= 8) return { color: 'text-yellow-600 bg-yellow-50', labelBn: 'সতর্কতা স্তর', labelEn: 'Warning Zone' };
    return { color: 'text-red-600 bg-red-50', labelBn: 'উচ্চ মৃত্যুহার', labelEn: 'High Mortality' };
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">{t('common.loading')}</div>;

  const totalCompletedChores = chores.filter(c => c.completed).length;
  const progressPercent = chores.length > 0 ? Math.round((totalCompletedChores / chores.length) * 100) : 0;

  const mortalityRate = activeBatch && activeBatch.totalChicks > 0
    ? Number(((totalMortality / activeBatch.totalChicks) * 100).toFixed(1))
    : 0;
  
  const mortStat = getMortalityStatus(mortalityRate);

  return (
    <div className="space-y-6 pb-4">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg border border-green-400/30">
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={18} className="text-yellow-300 animate-pulse shrink-0" />
              <span className="text-xs font-semibold tracking-wider text-green-100 uppercase">
                {language === 'bn' ? 'ডিজিটাল খামার প্রো ড্যাশবোর্ড' : 'Digital Farm Pro Portal'}
              </span>
            </div>
            <h2 className="text-lg opacity-90">{t('dashboard.greeting')}</h2>
            <h3 className="text-2xl font-black tracking-tight mt-0.5">
              {profileData?.name || currentUser?.displayName || t('dashboard.khamari')}
            </h3>
            {profileData?.farmName && (
              <p className="text-xs bg-white/20 px-2 py-1 rounded inline-block mt-2 font-medium">
                🏡 {profileData.farmName}
              </p>
            )}
          </div>
          
          {/* Animated Tips Frame */}
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-xs text-green-50">
              <strong className="text-yellow-300">{language === 'bn' ? 'আজকের পরামর্শ: ' : 'Farm Advice: '}</strong>
              {language === 'bn' ? tips[tipIndex].bn : tips[tipIndex].en}
            </p>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none"></div>
      </div>

      {/* Chores Checklist Card */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h4 className="font-bold text-gray-800 flex items-center gap-2">
              <CheckCircle size={20} className="text-emerald-500" />
              {language === 'bn' ? 'আজকের খামার পরিচালনা কাজ' : "Today's Farm Operations Checklist"}
            </h4>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {language === 'bn' ? 'প্রতিদিন কাজ শেষে টিক দিয়ে সম্পন্ন করুন' : 'Tick off operations as you complete them daily'}
            </p>
          </div>
          <span className="text-xs font-bold px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full shrink-0">
            {totalCompletedChores}/{chores.length}
          </span>
        </div>

        {/* Chores Progress Bar */}
        <div className="w-full bg-gray-100 h-2 rounded-full mb-4 overflow-hidden">
          <div 
            className="bg-emerald-500 h-full transition-all duration-500 rounded-full" 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        <div className="space-y-2.5">
          {chores.map((chore) => (
            <button
              key={chore.id}
              onClick={() => toggleChore(chore.id)}
              className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${
                chore.completed 
                  ? 'bg-emerald-50/50 border border-emerald-100 text-gray-400 line-through' 
                  : 'bg-gray-55 border border-gray-100 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="shrink-0 transition-transform active:scale-95 duration-100">
                {chore.completed ? (
                  <CheckSquare size={19} className="text-emerald-600" />
                ) : (
                  <Square size={19} className="text-gray-400" />
                )}
              </div>
              <span className="text-xs sm:text-sm font-medium">
                {language === 'bn' ? chore.textBn : chore.textEn}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Batch Overview */}
      {activeBatch ? (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-green-150">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-gray-800 flex items-center gap-2">
              <Package size={20} className="text-green-600" />
              {t('dashboard.activeBatches')}: <span className="text-green-600 font-black">{activeBatch.batchName}</span>
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
              {language === 'bn' ? 'চলমান' : 'Active'}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100">
              <p className="text-xs text-gray-500 mb-1">{t('dashboard.totalBirds')}</p>
              <p className="text-xl font-black text-blue-700">{activeBatch.totalChicks} {language === 'bn' ? 'টি' : ''}</p>
            </div>
            <div className="bg-orange-50/70 p-3.5 rounded-xl border border-orange-100">
              <p className="text-xs text-gray-500 mb-1">{t('dashboard.age')}</p>
              <p className="text-xl font-black text-orange-700">
                {calculateAge(activeBatch.startDate)} {t('dashboard.days')}
              </p>
            </div>
            
            <div className="bg-red-50/70 p-3.5 rounded-xl border border-red-100 col-span-2">
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-gray-500">{t('dashboard.totalMortality')}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${mortStat.color}`}>
                  {language === 'bn' ? mortStat.labelBn : mortStat.labelEn} ({mortalityRate}%)
                </span>
              </div>
              <p className="text-xl font-black text-red-600">
                {totalMortality} <span className="text-xs text-gray-400 font-medium">/ {activeBatch.totalChicks} {language === 'bn' ? 'টি' : 'units'}</span>
              </p>
            </div>
          </div>

          <Link 
            to={`/batches`} 
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition-all shadow-sm shadow-green-200"
          >
            {language === 'bn' ? 'ব্যাচ ও FCR রিপোর্ট দেখুন' : 'View Batch & FCR Analytics'} <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-6 shadow-sm text-center border-dashed border-2 border-green-200">
          <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
            <Package size={32} className="text-green-500" />
          </div>
          <h4 className="font-bold text-gray-800 mb-1">{t('dashboard.noBatches')}</h4>
          <p className="text-sm text-gray-400 mb-4">{t('dashboard.noBatchesSub')}</p>
          <Link to="/batches" className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-green-700 inline-block transition-colors">
            {t('dashboard.createBatch')}
          </Link>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div>
        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Layers size={18} className="text-green-600" />
          {t('dashboard.quickActions')}
        </h4>
        <div className="grid grid-cols-4 gap-2.5">
          <Link to="/feed" className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-1.5 hover:border-orange-200 hover:bg-orange-50/10 transition-colors">
            <div className="w-9 h-9 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            </div>
            <span className="text-[10px] sm:text-xs font-semibold text-gray-700 text-center truncate w-full">{t('dashboard.feed')}</span>
          </Link>
          <Link to="/medicine" className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-1.5 hover:border-blue-200 hover:bg-blue-50/10 transition-colors">
            <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            </div>
            <span className="text-[10px] sm:text-xs font-semibold text-gray-700 text-center truncate w-full">{t('dashboard.medicine')}</span>
          </Link>
          <Link to="/mortality" className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-1.5 hover:border-red-200 hover:bg-red-50/10 transition-colors">
            <div className="w-9 h-9 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
               <AlertTriangle size={18} />
            </div>
            <span className="text-[10px] sm:text-xs font-semibold text-gray-700 text-center truncate w-full">{language === 'bn' ? 'মৃত্যু' : t('dashboard.mortality')}</span>
          </Link>
          <Link to="/expenses" className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-1.5 hover:border-purple-200 hover:bg-purple-50/10 transition-colors">
            <div className="w-9 h-9 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
               <TrendingUp size={18} />
            </div>
            <span className="text-[10px] sm:text-xs font-semibold text-gray-700 text-center truncate w-full">{t('dashboard.expenses')}</span>
          </Link>
          <Link to="/sales" className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-1.5 hover:border-teal-200 hover:bg-teal-50/10 transition-colors">
            <div className="w-9 h-9 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
            </div>
            <span className="text-[10px] sm:text-xs font-semibold text-gray-700 text-center truncate w-full">{t('dashboard.sales')}</span>
          </Link>
          <Link to="/dues" className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-1.5 hover:border-pink-200 hover:bg-pink-50/10 transition-colors">
            <div className="w-9 h-9 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <span className="text-[10px] sm:text-xs font-semibold text-gray-700 text-center truncate w-full">{t('dashboard.dues')}</span>
          </Link>
          <Link to="/reports" className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-1.5 hover:border-indigo-200 hover:bg-indigo-50/10 transition-colors">
            <div className="w-9 h-9 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            </div>
            <span className="text-[10px] sm:text-xs font-semibold text-gray-700 text-center truncate w-full">{t('dashboard.reports')}</span>
          </Link>
          <Link to="/guidelines" className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-1.5 hover:border-emerald-200 hover:bg-emerald-50/10 transition-colors relative overflow-hidden">
            <div className="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <span className="text-[10px] sm:text-xs font-semibold text-gray-700 text-center truncate w-full">{language === 'bn' ? 'পরামর্শ' : 'Guidelines'}</span>
            <div className="absolute top-0 right-0 w-6 h-6 bg-amber-500 transform rotate-45 translate-x-3 -translate-y-3 flex items-end justify-center"><span className="text-[5px] text-white font-black mb-0.5">PRO</span></div>
          </Link>
        </div>
      </div>

      {/* Target Weight Companion Tool */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 shadow-sm border border-green-200">
        <div className="flex items-center gap-2 mb-3">
          <Calculator size={20} className="text-green-700" />
          <h4 className="font-bold text-green-900 text-sm sm:text-base">
            {language === 'bn' ? 'সহকারী পশুপাখি ওজন ক্যালকুলেটর' : 'Farm Target Weight Calculator'}
          </h4>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[10px] font-bold text-green-800 uppercase tracking-wide block mb-1">
              {language === 'bn' ? 'খামারের ক্যাটাগরি' : 'Category'}
            </label>
            <select
              value={calcBreed}
              onChange={(e: any) => setCalcBreed(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-green-200 rounded-lg text-gray-800 font-medium font-sans focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              <option value="broiler">{language === 'bn' ? 'ব্রয়লার মুরগি (Broiler)' : 'Broiler Poultry'}</option>
              <option value="sonali">{language === 'bn' ? 'সোনালী মুরগি (Sonali)' : 'Sonali Breed'}</option>
              <option value="cattle">{language === 'bn' ? 'গরু ও ছাগল (Cattle)' : 'Cattle & Sheep'}</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-green-800 uppercase tracking-wide block mb-1">
              {calcBreed === 'cattle' ? (language === 'bn' ? 'পর্যবেক্ষণ সময়' : 'Time') : (language === 'bn' ? 'পশুপাখির বয়স (দিন)' : 'Age (Days)')}
            </label>
            <input 
              type="number" 
              value={calcAge}
              onChange={(e) => setCalcAge(e.target.value)}
              placeholder="e.g. 15"
              min="1"
              max="150"
              className="w-full text-xs p-2.5 bg-white border border-green-200 rounded-lg text-gray-800 font-medium font-sans hover:border-green-300 focus:outline-none focus:ring-1 focus:ring-green-500" 
            />
          </div>
        </div>

        {calcResult && (
          <div className="bg-white p-3.5 rounded-xl border border-green-200/50 space-y-2">
            <div className="flex justify-between items-center pb-1.5 border-b border-gray-150">
              <span className="text-[11px] text-gray-500 font-bold">{language === 'bn' ? 'আদর্শ গড় ওজন:' : 'Target Weight:'}</span>
              <span className="text-sm font-black text-emerald-700 font-sans">{calcResult.weight}</span>
            </div>
            <div className="flex items-start gap-1.5">
              <Info size={14} className="text-green-600 mt-0.5 shrink-0" />
              <p className="text-[11px] text-gray-600 font-medium">{calcResult.advice}</p>
            </div>
          </div>
        )}
      </div>

      {/* Combined Recent Activities Logs */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold text-gray-800 flex items-center gap-2">
            <Activity size={18} className="text-green-600" />
            {t('dashboard.recentActivity')}
          </h4>
          <span className="text-[10px] font-semibold text-gray-400">
            {recentActivities.length > 0 ? `${recentActivities.length} ${language === 'bn' ? 'রেকর্ড' : 'records'}` : ''}
          </span>
        </div>

        {recentActivities.length > 0 ? (
          <div className="space-y-3">
            {recentActivities.map((act) => {
              const dateObj = new Date(act.date);
              const formattedDate = isNaN(dateObj.getTime()) 
                ? act.date 
                : dateObj.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short' });
              
              let typeColor = 'bg-gray-100 text-gray-600';
              if (act.type === 'feed') typeColor = 'bg-orange-50 text-orange-600 border border-orange-100';
              if (act.type === 'medicine') typeColor = 'bg-blue-50 text-blue-600 border border-blue-100';
              if (act.type === 'expense') typeColor = 'bg-purple-50 text-purple-600 border border-purple-100';
              if (act.type === 'sales') typeColor = 'bg-teal-50 text-teal-600 border border-teal-100';

              return (
                <div key={act.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-50 bg-gray-50/40 hover:bg-gray-50 transition-colors">
                  <div className="space-y-1 min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${typeColor}`}>
                        {language === 'bn' ? act.titleBn : act.titleEn}
                      </span>
                      <span className="text-[10px] text-gray-400 font-sans">{formattedDate}</span>
                    </div>
                    <p className="text-xs text-gray-700 font-semibold truncate">
                      {language === 'bn' ? act.detailsBn : act.detailsEn}
                    </p>
                  </div>
                  
                  {act.amount > 0 && (
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-black font-sans ${act.type === 'sales' ? 'text-green-600' : 'text-gray-900'}`}>
                        {act.type === 'sales' ? '+' : '-'} ৳ {act.amount}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center p-6 text-gray-400 text-xs border border-dashed border-gray-150 rounded-xl">
            {t('dashboard.noActivity')}
          </div>
        )}
      </div>

    </div>
  );
}

