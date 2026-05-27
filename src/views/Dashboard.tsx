import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, doc, onSnapshot } from 'firebase/firestore';
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
  Info,
  Layers,
  PhoneCall,
  ChevronRight,
  Beef,
  Waves
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

  // Navigation tab state to declutter view
  const [activeTab, setActiveTab ] = useState<'overview' | 'tasks'>('overview');

  // Poultry 3-Meal Smart Feed Plan Inputs
  const [poultryBirdsCount, setPoultryBirdsCount] = useState<string>('100');
  const [poultryAgeDays, setPoultryAgeDays] = useState<string>('15');
  const [poultryAvgWeight, setPoultryAvgWeight] = useState<string>('');
  const [poultryBreedType, setPoultryBreedType] = useState<'broiler' | 'sonali'>('broiler');

  // Selected Farm Type State synchronized with localStorage
  const [selectedType, setSelectedType] = useState<'poultry' | 'cattle' | 'fish'>(
    () => (localStorage.getItem('selected_farm_type') as any) || 'poultry'
  );

  // Chores Checklist State
  const [chores, setChores] = useState<Chores[]>([]);
  
  // Dynamic Calculator State
  const [calcBreed, setCalcBreed] = useState<'broiler' | 'sonali' | 'cattle' | 'fish'>('broiler');
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
    // Sync calcBreed with selectedType inside the calculator
    if (selectedType === 'poultry') {
      setCalcBreed('broiler');
    } else if (selectedType === 'cattle') {
      setCalcBreed('cattle');
    } else {
      setCalcBreed('fish');
    }
  }, [selectedType]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const getTodayDateString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  };

  // Load and initialize chores dynamically based on selectedType
  useEffect(() => {
    const todayStr = getTodayDateString();
    const cacheKey = `farm_chores_${selectedType}_${todayStr}`;
    const savedChores = localStorage.getItem(cacheKey);
    
    const defaultChoresMap = {
      poultry: [
        { id: 'p1', textBn: 'সকালে পানি ও ফ্রেশ স্টার্টার/গ্রোয়ার খাবার দিন', textEn: 'Provide clean morning water & chick feed', completed: false },
        { id: 'p2', textBn: 'মুরগির লিটার বিছানা ওলট-পালট করে শুকনো রাখুন', textEn: 'Ensure litter or floor floor is dry and fluffy', completed: false },
        { id: 'p3', textBn: 'ঘরের বাতাস চলাচল (ভেন্টিলেশন) ও পর্দা চেক করুন', textEn: 'Verify poultry curtains and fresh ventilation', completed: false },
        { id: 'p4', textBn: 'চেক করুন ঘরের তাপমাত্রা স্বাভাবিক পর্যায়ে আছে কিনা', textEn: 'Monitor chicken house temperature & heat levels', completed: false },
        { id: 'p5', textBn: 'অসুস্থ বা দুর্বল মুরগিগুলো আলাদা খাঁচায় রাখুন', textEn: 'Isolate sick or inactive birds immediately', completed: false },
      ],
      cattle: [
        { id: 'c1', textBn: 'সকালে সুষম দানাদার খাদ্য মিক্স ও তুষার/খড় দিন', textEn: 'Feed dry hay and dairy concentrate mixes', completed: false },
        { id: 'c2', textBn: 'গোয়ালঘর পরিষ্কার করে মেঝে সম্পূর্ণ শুকনো রাখুন', textEn: 'Clean dung down and dry the stable floor', completed: false },
        { id: 'c3', textBn: 'পশুর স্বাভাবিক তাপমাত্রা ও ওলান প্রদাহ চেক করুন', textEn: 'Check cattle body warmth & udder comfort daily', completed: false },
        { id: 'c4', textBn: 'পর্যাপ্ত বিশুদ্ধ খাবার পানি সরবরাহ সচল রাখুন', textEn: 'Ensure non-contaminated drinking water is ready', completed: false },
        { id: 'c5', textBn: 'পশুকে সবুজ কাঁচা ঘাস অথবা সাইলেজ খাওয়ান', textEn: 'Provide green meadow grass or rich Silage portions', completed: false },
      ],
      fish: [
        { id: 'f1', textBn: 'সকাল এবং বিকেলে নিয়ম মেনে ভাসমান খাবার দিন', textEn: 'Feed floating pellets twice on schedule', completed: false },
        { id: 'f2', textBn: 'পানির স্বাভাবিক গভীরতা ও রঙ চেক করুন', textEn: 'Verify natural depth and green plankton shade', completed: false },
        { id: 'f3', textBn: 'পুকুরে অক্সিজেনের ঘাটতি আছে কিনা দেখে নিন', textEn: 'Inspect dawn gas bubbling or oxygen depletion', completed: false },
        { id: 'f4', textBn: 'পানির pH ও তাপমাত্রা রিডিং ঠিক রাখুন', textEn: 'Check pond pH and adjust lime if acidic', completed: false },
        { id: 'f5', textBn: 'ক্ষতিকর শ্যাওলাস্তর বা কচুরিপানা পরিষ্কার করুন', textEn: 'Remove dark toxic weed beds or excessive hyacinths', completed: false },
      ]
    };

    const currentDefaults = defaultChoresMap[selectedType] || defaultChoresMap.poultry;

    if (savedChores) {
      try {
        setChores(JSON.parse(savedChores));
      } catch (e) {
        setChores(currentDefaults);
      }
    } else {
      setChores(currentDefaults);
      localStorage.setItem(cacheKey, JSON.stringify(currentDefaults));
    }
  }, [selectedType]);

  const toggleChore = (id: string) => {
    const updated = chores.map(c => c.id === id ? { ...c, completed: !c.completed } : c);
    setChores(updated);
    const todayStr = getTodayDateString();
    const cacheKey = `farm_chores_${selectedType}_${todayStr}`;
    localStorage.setItem(cacheKey, JSON.stringify(updated));
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
  }, [currentUser, selectedType]);

  useEffect(() => {
    if (activeBatch && selectedType === 'poultry') {
      const aliveBirdsCount = Math.max(0, (activeBatch.totalChicks || 100) - totalMortality);
      setPoultryBirdsCount(aliveBirdsCount.toString());
      const age = calculateAge(activeBatch.startDate);
      setPoultryAgeDays(age.toString());
      const nameLower = (activeBatch.batchName || '').toLowerCase();
      if (nameLower.includes('sonali') || nameLower.includes('সোনালী') || nameLower.includes('সোনালি')) {
        setPoultryBreedType('sonali');
      } else {
        setPoultryBreedType('broiler');
      }
    }
  }, [activeBatch, selectedType, totalMortality]);

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
        setCalcResult ({ weight: '১৩০-১৫০ গ্রাম', advice: 'লেয়ার স্টার্টার খাওয়ান ও রোগ প্রতিরোধে বিশেষ মনোযোগী হোন।' });
      } else if (age <= 30) {
        setCalcResult({ weight: '২৮০-৩২০ গ্রাম', advice: 'নিয়মিত ও সঠিক সময়ে ভ্যাকসিন সম্পন্ন করুন।' });
      } else if (age <= 45) {
        setCalcResult({ weight: '৫০০-৫৫০ গ্রাম', advice: 'গ্রোয়ার খাবার ও ভিটামিন বি১ বি২ কমপ্লেক্স যুক্ত পানি দিন।' });
      } else if (age <= 60) {
        setCalcResult({ weight: '৭৫০-৮৫০ গ্রাম', advice: 'বাজারজাত করুন, সোনালী মুরগির এই ওজন অত্যন্ত লাভজনক।' });
      } else {
        setCalcResult({ weight: '৯৫০+ গ্রাম', advice: 'সুস্থ অবস্থায় দ্রুত বিক্রয় সম্পন্ন করুন।' });
      }
    } else if (calcBreed === 'cattle') {
      if (age <= 15) {
        setCalcResult({ weight: 'শারীরিক বৃদ্ধি বাড়ে', advice: 'বাচ্চাকে ১৫ দিন বয়স পর্যন্ত পর্যাপ্ত মায়ের ওলানের খাঁটি শালদুধ দিন।' });
      } else if (age <= 60) {
        setCalcResult({ weight: 'প্রতি দিন ৪৫০-৬০০ গ্রাম বৃদ্ধি', advice: 'দানাদার ফিড অল্প মাত্রায় দিন এবং ভালো মানের কাঁচা ঘাস খাওয়ান।' });
      } else if (age <= 120) {
        setCalcResult({ weight: '৭০-৯০ কেজি ওজন লাভ', advice: 'কৃমিনাশক ওষুধ দিন, খুরারোগ (FMD) ও বাদলা রোগের রুটিন ভ্যাকসিন নিশ্চিত করুন।' });
      } else if (age <= 365) {
        setCalcResult({ weight: '১৮০-২২০ কেজি ওজন লাভ', advice: 'গরু মোটাতাজাকরণের সুষম দানাদার মিক্সচার দিন (খড় ও সাইলেজ সহ)।' });
      } else {
        setCalcResult({ weight: '৩০০+ কেজি মাংস উৎপাদন', advice: 'উচ্চমানের আঁশ ও খড় দিন। বাজারজাত করে সর্বোচ্চ মুনাফা অর্জন করুন।' });
      }
    } else { // Fish
      if (age <= 10) {
        setCalcResult({ weight: 'রেনু পোনা অবস্থা', advice: 'পুকুরে পর্যাপ্ত ফایتোপ্ল্যাঙ্কটন ও জুপ্ল্যাঙ্কটন খাদ্য নিশ্চিত করুন।' });
      } else if (age <= 30) {
        setCalcResult({ weight: 'ধূলিপোনা (১-২ ইঞ্চি)', advice: 'নার্সারি পুকুরে রেডিমেড নার্সারি পাউডার খাবার ২ বেলা দিন।' });
      } else if (age <= 90) {
        setCalcResult({ weight: '১০০-১৫০ গ্রাম গড় ওজন', advice: '১.৫মিমি থেকে ২মিমি সাইজের ভাসমান খাবার খাওয়ান। পুকুরে চুন ছিটান।' });
      } else if (age <= 180) {
        setCalcResult({ weight: '৪০০-৬০০ গ্রাম বৃদ্ধি', advice: 'পুকুরে অক্সিজেনের ঘাটতি এড়াতে বাঁশের আলোড়ন দিন বা এয়ারেটর চালান।' });
      } else {
        setCalcResult({ weight: '১+ কেজি সাইজের বড় মাছ', advice: 'বাজারজাত করার উপযুক্ত সেরা সময়। নিয়মিত জাল টেনে বৃদ্ধি পরীক্ষা করুন।' });
      }
    }
  };

  const fetchActiveBatch = async () => {
    if (!currentUser) return;
    try {
      const q = query(
        collection(db, 'batches'),
        where('userId', '==', currentUser.uid),
        where('status', '==', 'active'),
        where('farmType', '==', selectedType)
      );
      const snapshot = await fastGetDocs(q);
      if (!snapshot.empty) {
        const batchData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setActiveBatch(batchData);
        fetchMortality(batchData.id);
      } else {
        // Fallback: If no type matching active batch exists, load any first active batch
        const qFallback = query(
          collection(db, 'batches'),
          where('userId', '==', currentUser.uid),
          where('status', '==', 'active')
        );
        const fbSnap = await fastGetDocs(qFallback);
        if (!fbSnap.empty) {
          const batchData = { id: fbSnap.docs[0].id, ...fbSnap.docs[0].data() };
          setActiveBatch(batchData);
          fetchMortality(batchData.id);
        } else {
          setActiveBatch(null);
        }
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

      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivities(activities.slice(0, 4));
    } catch (e) {
      console.error("Error activity logs:", e);
    }
  };

  const calculateAge = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getPoultryMealPlan = () => {
    const age = parseInt(poultryAgeDays) || 0;
    const count = parseInt(poultryBirdsCount) || 0;
    
    let feedPerBird = 0; // grams per bird per day
    let estimatedWeight = 0; // expected weight in grams
    
    if (poultryBreedType === 'broiler') {
      if (age <= 7) {
        feedPerBird = 15 + (age * 3); // 15g to 36g
        estimatedWeight = 40 + (age * 22); // up to 194g
      } else if (age <= 14) {
        feedPerBird = 36 + ((age - 7) * 5.5); // 36g to 75g
        estimatedWeight = 200 + ((age - 7) * 42); // up to 494g
      } else if (age <= 21) {
        feedPerBird = 75 + ((age - 14) * 6.5); // 75g to 120g
        estimatedWeight = 500 + ((age - 14) * 70); // up to 990g
      } else if (age <= 28) {
        feedPerBird = 120 + ((age - 21) * 7.1); // 120g to 170g
        estimatedWeight = 1000 + ((age - 21) * 85); // up to 1595g
      } else {
        feedPerBird = 170 + ((age - 28) * 5); // 170g to 205g
        estimatedWeight = 1600 + ((age - 28) * 100);
      }
    } else { // sonali
      if (age <= 7) {
        feedPerBird = 8 + (age * 1.5); // 8g to 18g
        estimatedWeight = 40 + (age * 7); // up to 89g
      } else if (age <= 15) {
        feedPerBird = 18.5 + ((age - 7) * 1.8); // 18.5g to 33g
        estimatedWeight = 90 + ((age - 7) * 10); // up to 170g
      } else if (age <= 30) {
        feedPerBird = 33 + ((age - 15) * 1.2); // 33g to 51g
        estimatedWeight = 170 + ((age - 15) * 11); // up to 335g
      } else if (age <= 45) {
        feedPerBird = 51 + ((age - 30) * 1); // 51g to 66g
        estimatedWeight = 335 + ((age - 30) * 15); // up to 560g
      } else {
        feedPerBird = 66 + ((age - 45) * 0.8); // 66g to 78g
        estimatedWeight = 560 + ((age - 45) * 16);
      }
    }

    const totalDailyFeedKg = (feedPerBird * count) / 1000;

    let morningRatio = 0.35;
    let afternoonRatio = 0.25;
    let nightRatio = 0.40;

    const morningFeedKg = totalDailyFeedKg * morningRatio;
    const afternoonFeedKg = totalDailyFeedKg * afternoonRatio;
    const nightFeedKg = totalDailyFeedKg * nightRatio;

    let scheduleAdvice = '';
    let feedingStyle = 'dry_3meals';

    if (age <= 14) {
      feedingStyle = 'constant';
      scheduleAdvice = language === 'bn' 
        ? 'বাচ্চা অবস্থা (১-১৪ দিন): ২৪ ঘণ্টাই পাত্রে তাজা স্টার্টার ফিড সচল রাখুন। ৩ বেলার খাবার পর্যায় ১৫তম দিন থেকে কার্যকর করা ভালো।' 
        : 'Brooder State (1-14 Days): Keep starter feed available in trays 24/7. Strict 3-meal timing plan starts from day 15.';
    } else if (age >= 22) {
      feedingStyle = 'moist';
      scheduleAdvice = language === 'bn'
        ? '২২তম দিন বা ২৫তম দিন উত্তীর্ণ (বড় মুরগি): মুরগির গরমে শরীরের তাপমাত্রা নিয়ন্ত্রণে রাখতে ও সুষম হজমে বড় আকারের দানাদার ফিডটি হালকা পানিতে ভিজিয়ে নরম বা মাখানো খাবার (Moist feed mix / গুলা খাবার) ৩ বেলা দিন।'
        : 'Day 22+ Reached (Adult Poultry): Moisten dry food pellet slightly with clean water to form moist mash (মাখানো খাবার) to cool birds internal heat and enhance digestion.';
    } else {
      feedingStyle = 'dry_3meals';
      scheduleAdvice = language === 'bn'
        ? '১৫তম দিন উত্তীর্ণ (৩ বেলা খাবার): নিয়মিত ৩ বেলা খাবার দিন। হিট স্ট্রোক বা অতিরিক্ত গরম এড়াতে দুপুরের খাবারটি তুলনামূলক হালকা রাখা ভালো।'
        : 'Day 15-21 Reached: Standard dry feed 3 times schedule. Offer slightly less in afternoons to shield birds from hot weather stress.';
    }

    return {
      estimatedWeight,
      totalDailyFeedKg: Number(totalDailyFeedKg.toFixed(2)),
      morningFeedKg: Number(morningFeedKg.toFixed(2)),
      afternoonFeedKg: Number(afternoonFeedKg.toFixed(2)),
      nightFeedKg: Number(nightFeedKg.toFixed(2)),
      feedingStyle,
      scheduleAdvice,
      feedPerBirdGrams: Number(feedPerBird.toFixed(1))
    };
  };

  const getMortalityStatus = (rate: number) => {
    if (rate <= 4) return { color: 'text-green-600 bg-green-50 border border-green-200', labelBn: 'চমৎকার', labelEn: 'Excellent' };
    if (rate <= 8) return { color: 'text-yellow-600 bg-yellow-50 border border-yellow-250', labelBn: 'মাঝারি ঝুঁকি', labelEn: 'Warning Zone' };
    return { color: 'text-red-600 bg-red-50 border border-red-200', labelBn: 'উচ্চ মৃত্যুহার', labelEn: 'High Mortality' };
  };

  const handleSelectTypeOnDashboard = (type: 'poultry' | 'cattle' | 'fish') => {
    setSelectedType(type);
    localStorage.setItem('selected_farm_type', type);
  };

  const totalCompletedChores = chores.filter(c => c.completed).length;
  const progressPercent = chores.length > 0 ? Math.round((totalCompletedChores / chores.length) * 100) : 0;

  const mortalityRate = activeBatch && activeBatch.totalChicks > 0
    ? Number(((totalMortality / activeBatch.totalChicks) * 100).toFixed(1))
    : 0;
  
  const mortStat = getMortalityStatus(mortalityRate);

  const styleConfig = {
    poultry: {
      gradient: 'from-emerald-600 to-green-500',
      heading: language === 'bn' ? 'পোল্ট্রি তদারকি' : 'Poultry Operations',
      tagline: language === 'bn' ? 'চিকেন ও বার্ডস ব্যাচ ড্যাশবোর্ড' : 'Bird and Flock monitoring analytics'
    },
    cattle: {
      gradient: 'from-amber-600 to-orange-500',
      heading: language === 'bn' ? 'পশুপালন তদারকি' : 'Livestock Operations',
      tagline: language === 'bn' ? 'গরু, বাছুর ও ছাগল খামার ওভারভিউ' : 'Cow and livestock feed tracking'
    },
    fish: {
      gradient: 'from-blue-600 to-cyan-500',
      heading: language === 'bn' ? 'মৎস্য চাষ তদারকি' : 'Fisheries Operations',
      tagline: language === 'bn' ? 'পুকুর ও অ্যাকোয়াকালচার রিডিং ওভারভিউ' : 'Pond and Fingerling count logs'
    }
  };

  const activeStyle = styleConfig[selectedType] || styleConfig.poultry;

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">{t('common.loading')}</div>;

  return (
    <div className="space-y-6 pb-8 animate-fadeIn">
      
      {/* Title Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-yellow-500 animate-pulse shrink-0" />
            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
              {language === 'bn' ? 'খামার ওভারভিউ ও ড্যাশবোর্ড' : 'Digital Farm Panel'}
            </span>
          </div>
          <h2 className="text-lg font-black text-slate-850 tracking-tight leading-none">
            {language === 'bn' ? 'খামার ড্যাশবোর্ড ও ট্র্যাকার' : 'Dashboard Control Center'}
          </h2>
          <p className="text-[11px] text-slate-450 font-bold mt-1 max-w-sm">
            {activeStyle.tagline}
          </p>
        </div>

        {/* Local Pill Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 shrink-0 self-start sm:self-auto border border-slate-200/55">
          <button
            onClick={() => handleSelectTypeOnDashboard('poultry')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedType === 'poultry'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/30'
                : 'text-slate-500 hover:text-slate-805'
            }`}
          >
            🐔
          </button>
          <button
            onClick={() => handleSelectTypeOnDashboard('cattle')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedType === 'cattle'
                ? 'bg-white text-amber-805 shadow-xs border border-slate-200/30'
                : 'text-slate-500 hover:text-slate-805'
            }`}
          >
            🐄
          </button>
          <button
            onClick={() => handleSelectTypeOnDashboard('fish')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedType === 'fish'
                ? 'bg-white text-blue-850 shadow-xs border border-slate-200/30'
                : 'text-slate-500 hover:text-slate-805'
            }`}
          >
            🐟
          </button>
        </div>
      </div>

      {/* Responsive Navigation Tabs to maintain a clean workspace */}
      <div className="flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200/60 shadow-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-3 px-4 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'overview'
              ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/50'
              : 'text-slate-500 hover:text-slate-100 hover:bg-white/45'
          }`}
        >
          📊 {language === 'bn' ? 'তদারকি ও পরিকল্পনা' : 'Overview & Cockpit'}
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 py-3 px-4 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'tasks'
              ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/50'
              : 'text-slate-500 hover:text-slate-100 hover:bg-white/45'
          }`}
        >
          ✅ {language === 'bn' ? 'কাজ ও অন্যান্য' : 'Tasks & Shortcuts'}
          {chores.length > 0 && totalCompletedChores < chores.length && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          )}
        </button>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* Active Batch Overview depending on current selection */}
          {activeBatch ? (
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-emerald-100">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Package size={20} className="text-emerald-600 animate-pulse" />
                  <h4 className="font-bold text-slate-850 text-sm sm:text-base">
                    {t('dashboard.activeBatches')}: <span className="text-emerald-600 font-extrabold">{activeBatch.batchName}</span>
                  </h4>
                </div>
                <span className="text-[10px] font-black px-2.5 py-0.5 bg-emerald-100 text-emerald-850 rounded-full">
                  {language === 'bn' ? 'চলমান' : 'Active'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100 max:h-22 flex flex-col justify-center">
                  <p className="text-[11px] text-slate-500 font-bold mb-1">
                    {selectedType === 'cattle' ? (language === 'bn' ? 'মোট পশু সংখ্যা' : 'Total Livestock') : t('dashboard.totalBirds')}
                  </p>
                  <p className="text-xl font-black text-blue-700 font-sans">{activeBatch.totalChicks} {language === 'bn' ? 'টি' : ''}</p>
                </div>
                <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100 max:h-22 flex flex-col justify-center">
                  <p className="text-[11px] text-slate-400 font-bold mb-1">{t('dashboard.age')}</p>
                  <p className="text-xl font-black text-amber-700 font-sans">
                    {calculateAge(activeBatch.startDate)} {t('dashboard.days')}
                  </p>
                </div>
                
                {selectedType !== 'fish' && (
                  <div className="bg-red-50/40 p-4 rounded-xl border border-red-100 flex justify-between items-center col-span-2">
                    <div>
                      <p className="text-[11px] text-slate-505 font-bold mb-1">{t('dashboard.totalMortality')}</p>
                      <p className="text-xl font-black text-red-600 font-sans">
                        {totalMortality} <span className="text-xs text-gray-400 font-medium">/ {activeBatch.totalChicks} {language === 'bn' ? 'টি' : 'units'}</span>
                      </p>
                    </div>
                    <div>
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full ${mortStat.color}`}>
                        {language === 'bn' ? mortStat.labelBn : mortStat.labelEn} ({mortalityRate}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <Link 
                to={`/batches`} 
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-750 hover:to-green-600 text-white py-3.5 px-4 rounded-xl font-bold transition-all shadow-sm text-sm cursor-pointer"
              >
                {language === 'bn' ? 'ব্যাচ ও FCR এনালাইটিক্স' : 'View Batch & FCR Analytics'} <ChevronRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 shadow-xs text-center border-dashed border-2 border-slate-200">
              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                <Package size={28} className="text-slate-400" />
              </div>
              <h4 className="font-extrabold text-slate-800 mb-1">
                {language === 'bn' ? `কোনো চলমান ${selectedType === 'poultry' ? 'পোল্ট্রি' : selectedType === 'cattle' ? 'পশু' : 'মাছ'} ব্যাচ নেই` : `No active ${selectedType} batch`}
              </h4>
              <p className="text-xs text-slate-400 mb-4">{t('dashboard.noBatchesSub')}</p>
              <Link to="/batches" className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 inline-block transition-colors cursor-pointer text-xs">
                {t('dashboard.createBatch')}
              </Link>
            </div>
          )}

          {/* If poultry is selected: Show brand new Poultry 3-Meal Feed Plan Calculator */}
          {selectedType === 'poultry' ? (
            <div className="bg-gradient-to-br from-emerald-50 to-green-50/50 rounded-2xl p-6 shadow-xs border border-emerald-250/60 animate-fadeIn">
              <div className="flex items-center gap-2.5 mb-2 pb-2 border-b border-emerald-150/40">
                <span className="text-2xl shrink-0">🍽️</span>
                <div>
                  <h4 className="font-black text-slate-850 text-sm sm:text-base tracking-tight leading-tight flex items-center gap-1.5">
                    {language === 'bn' ? 'মুরগির দৈনিক ৩ বেলার খাদ্য ক্যালকুলেটর' : 'Poultry Daily 3-Meal Feed Planner'}
                    <span className="bg-emerald-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">NEW</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                    {language === 'bn' ? 'মুরগির বয়স, ওজন ও সংখ্যা অনুযায়ী ৩ বেলার নিখুঁত খাদ্য বিন্যাস' : 'Precise 3 daily feed weights based on bird count, age & weight'}
                  </p>
                </div>
              </div>

              {/* Feed inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-3 mb-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    👥 {language === 'bn' ? 'মুরগির সংখ্যা (পিস)' : 'Bird Count (Pcs)'}
                    {activeBatch && totalMortality > 0 && (
                      <span className="text-red-500 font-bold ml-1 text-[9px] normal-case bg-red-50 px-1 py-0.5 rounded border border-red-100">
                        {language === 'bn' 
                          ? `(মারা গেছে: ${totalMortality}টি, জীবিত: ${activeBatch.totalChicks - totalMortality}টি)` 
                          : `(Dead: ${totalMortality}, Alive: ${activeBatch.totalChicks - totalMortality})`}
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={poultryBirdsCount}
                    onChange={(e) => setPoultryBirdsCount(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-sans focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    📅 {language === 'bn' ? 'মুরগির বয়স (দিন)' : 'Age (Days)'}
                  </label>
                  <input
                    type="number"
                    value={poultryAgeDays}
                    onChange={(e) => setPoultryAgeDays(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-sans focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-wider block mb-1">
                    🧬 {language === 'bn' ? 'মুরগির ব্রিড / শ্রেণী' : 'Breed/Lineage'}
                  </label>
                  <select
                    value={poultryBreedType}
                    onChange={(e: any) => setPoultryBreedType(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="broiler">{language === 'bn' ? 'ব্রয়লার মুরগি (Broiler)' : 'Broiler Poultry'}</option>
                    <option value="sonali">{language === 'bn' ? 'সোনালী মুরগি (Sonali/Semi-hybrid)' : 'Sonali Poultry'}</option>
                  </select>
                </div>
              </div>

              {/* Layout calculation outputs */}
              {(() => {
                const results = getPoultryMealPlan();
                return (
                  <div className="space-y-4">
                    {/* Primary Highlight */}
                    <div className="bg-white p-4 rounded-xl border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                      <div>
                        <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 block mb-0.5">
                          {language === 'bn' ? 'দৈনিক মোট খাদ্য বরাদ্দ (২৪ ঘণ্টা):' : 'Total 24-Hour Feed Allocation:'}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-emerald-700 font-sans">{results.totalDailyFeedKg}</span>
                          <span className="text-xs font-black text-emerald-800 bg-emerald-100/50 px-1.5 py-0.5 rounded uppercase font-sans">KG</span>
                          <span className="text-xs text-slate-405 font-bold ml-1">
                            ({results.feedPerBirdGrams} গ্রাম/পাখি)
                          </span>
                        </div>
                      </div>
                      <div className="bg-emerald-800/5 px-3 py-1.5 rounded-lg border border-emerald-100/30 flex flex-col">
                        <span className="text-[9px] font-black uppercase text-emerald-600 tracking-wider">
                          {language === 'bn' ? 'আদর্শ গড় ওজন:' : 'Target Mean Weight:'}
                        </span>
                        <span className="text-xs font-black text-emerald-805 font-sans">
                          ~ {results.estimatedWeight} গ্রাম
                        </span>
                      </div>
                    </div>

                    {/* Meal Breakdowns with absolute timing */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Morning Meal portion */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-100 relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 p-1.5 bg-amber-50 text-xs rounded-bl-xl">🌅</div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                            {language === 'bn' ? '১. সকালের খাবার (৩৫%)' : '1. Morning Feed (35%)'}
                          </span>
                          <p className="text-lg font-extrabold text-slate-850 font-sans">
                            {results.morningFeedKg} <span className="text-xs text-slate-500 font-bold">KG</span>
                          </p>
                        </div>
                        <p className="text-[9px] text-slate-405 font-black mt-2 bg-slate-50 px-1.5 py-0.5 rounded self-start">
                          ⏱️ {language === 'bn' ? 'ভোর ৫:০০ - সকাল ৭:৩০' : '5:00 AM - 7:30 AM'}
                        </p>
                      </div>

                      {/* Afternoon portion */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-100 relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 p-1.5 bg-orange-50 text-xs rounded-bl-xl">☀️</div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                            {language === 'bn' ? '২. দুপুরের খাবার (২৫%)' : '2. Noon Feed (25%)'}
                          </span>
                          <p className="text-lg font-extrabold text-slate-850 font-sans">
                            {results.afternoonFeedKg} <span className="text-xs text-slate-500 font-bold">KG</span>
                          </p>
                        </div>
                        <p className="text-[9px] text-slate-405 font-black mt-2 bg-slate-50 px-1.5 py-0.5 rounded self-start">
                          ⏱️ {language === 'bn' ? 'বেলা ১২:০০ - দুপুর ১:৩০' : '12:00 PM - 1:30 PM'}
                        </p>
                      </div>

                      {/* Night portion */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-100 relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 p-1.5 bg-indigo-50 text-xs rounded-bl-xl">🌌</div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                            {language === 'bn' ? '৩. রাতের খাবার (৪০%)' : '3. Night Feed (40%)'}
                          </span>
                          <p className="text-lg font-extrabold text-slate-850 font-sans">
                            {results.nightFeedKg} <span className="text-xs text-slate-500 font-bold">KG</span>
                          </p>
                        </div>
                        <p className="text-[9px] text-slate-405 font-black mt-2 bg-slate-50 px-1.5 py-0.5 rounded self-start">
                          ⏱️ {language === 'bn' ? 'সন্ধ্যা ৬:০০ - রাত ৮:০০' : '6:00 PM - 8:00 PM'}
                        </p>
                      </div>
                    </div>

                    {/* Specialized Premium Growth advice */}
                    <div className="bg-emerald-900/5 p-4 rounded-xl border border-emerald-500/10 flex items-start gap-2.5">
                      <span className="text-lg shrink-0 mt-0.5">ℹ️</span>
                      <p className="text-xs text-emerald-850 font-black leading-relaxed font-semibold">
                        {results.scheduleAdvice}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* For cattle/fish, we still display the target weight companion tool on this main cockpit tab */
            <div className="bg-gradient-to-br from-slate-50 to-slate-100/40 rounded-2xl p-6 shadow-xs border border-slate-200 animate-fadeIn">
              <div className="flex items-center gap-2 mb-3">
                <Calculator size={20} className="text-amber-700 shrink-0" />
                <h4 className="font-bold text-slate-850 text-sm sm:text-base leading-none">
                  {language === 'bn' ? 'সহকারী বৃদ্ধি লক্ষ্যমাত্র ক্যালকুলেটর' : 'Farm Target Growth Estimator'}
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1">
                    {language === 'bn' ? 'খামারের ক্যাটাগরি' : 'Category'}
                  </label>
                  <select
                    value={calcBreed}
                    onChange={(e: any) => setCalcBreed(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl text-slate-850 font-bold focus:outline-none focus:ring-1"
                  >
                    <option value="broiler">{language === 'bn' ? 'ব্রয়লার মুরগি (Broiler)' : 'Broiler Poultry'}</option>
                    <option value="sonali">{language === 'bn' ? 'সোনালী মুরগি (Sonali)' : 'Sonali Breed'}</option>
                    <option value="cattle">{language === 'bn' ? 'গরু ও ছাগল (Cattle)' : 'Cattle & Sheep'}</option>
                    <option value="fish">{language === 'bn' ? 'মাছ চাষ (Fishery)' : 'Fishery/Pond'}</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1">
                    {calcBreed === 'cattle' || calcBreed === 'fish'
                      ? (language === 'bn' ? 'পর্যবেক্ষণ সময় (দিন)' : 'Time (Days)') 
                      : (language === 'bn' ? 'পশুপাখির বয়স (দিন)' : 'Age (Days)')
                    }
                  </label>
                  <input 
                    type="number" 
                    value={calcAge}
                    onChange={(e) => setCalcAge(e.target.value)}
                    placeholder="e.g. 15"
                    min="1"
                    max="150"
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl text-slate-850 font-sans focus:outline-none focus:ring-1" 
                  />
                </div>
              </div>

              {calcResult && (
                <div className="bg-white p-4 rounded-xl border border-slate-250/30 space-y-2.5 shadow-2xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 border-dotted">
                    <span className="text-xs text-slate-500 font-bold">{language === 'bn' ? 'আদর্শ স্তর/ওজন:' : 'Target Weight/State:'}</span>
                    <span className="text-sm font-black text-amber-800 font-sans">{calcResult.weight}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Info size={14} className="text-amber-700 mt-0.5 shrink-0" />
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">{calcResult.advice}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* TAB 2: DAILY CHEKLIST & ACTIONS */
        <div className="space-y-6 animate-fadeIn">
          {/* Quick Actions Shortcuts Launchers Grid */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100">
            <h4 className="font-bold text-slate-805 mb-4 flex items-center gap-2">
              <Layers size={18} className="text-emerald-600 animate-pulse" />
              {t('dashboard.quickActions')}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link to="/feed" className="bg-slate-50/50 p-3 rounded-xl border border-slate-150 flex flex-col items-center justify-center gap-2 hover:border-amber-200 hover:bg-amber-50/10 transition-all duration-200 group">
                <div className="w-10 h-10 bg-amber-100/80 text-amber-600 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                </div>
                <span className="text-xs font-extrabold text-slate-700 tracking-tight text-center">{t('dashboard.feed')}</span>
              </Link>

              <Link to="/medicine" className="bg-slate-50/50 p-3 rounded-xl border border-slate-150 flex flex-col items-center justify-center gap-2 hover:border-blue-200 hover:bg-blue-50/10 transition-all duration-200 group">
                <div className="w-10 h-10 bg-blue-100/85 text-blue-600 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                </div>
                <span className="text-xs font-extrabold text-slate-700 tracking-tight text-center">{t('dashboard.medicine')}</span>
              </Link>

              <Link to="/mortality" className="bg-slate-50/50 p-3 rounded-xl border border-slate-150 flex flex-col items-center justify-center gap-2 hover:border-red-200 hover:bg-red-50/10 transition-all duration-200 group">
                <div className="w-10 h-10 bg-red-100/85 text-red-655 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                   <AlertTriangle size={18} strokeWidth={2.5} />
                </div>
                <span className="text-xs font-extrabold text-slate-700 tracking-tight text-center truncate w-full">{language === 'bn' ? 'মৃত্যু' : t('dashboard.mortality')}</span>
              </Link>

              <Link to="/expenses" className="bg-slate-50/50 p-3 rounded-xl border border-slate-150 flex flex-col items-center justify-center gap-2 hover:border-purple-200 hover:bg-purple-50/10 transition-all duration-200 group">
                <div className="w-10 h-10 bg-purple-100/90 text-purple-600 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <span className="text-xs font-extrabold text-slate-700 tracking-tight text-center">{t('dashboard.expenses')}</span>
              </Link>

              <Link to="/sales" className="bg-slate-50/50 p-3 rounded-xl border border-slate-150 flex flex-col items-center justify-center gap-2 hover:border-teal-200 hover:bg-teal-50/10 transition-all duration-200 group">
                <div className="w-10 h-10 bg-teal-100/85 text-teal-600 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                </div>
                <span className="text-xs font-extrabold text-slate-700 tracking-tight text-center">{t('dashboard.sales')}</span>
              </Link>

              <Link to="/dues" className="bg-slate-50/50 p-3 rounded-xl border border-slate-150 flex flex-col items-center justify-center gap-2 hover:border-pink-200 hover:bg-pink-50/10 transition-all duration-200 group">
                <div className="w-10 h-10 bg-pink-100/90 text-pink-655 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </div>
                <span className="text-xs font-extrabold text-slate-700 tracking-tight text-center">{t('dashboard.dues')}</span>
              </Link>

              <Link to="/reports" className="bg-slate-50/50 p-3 rounded-xl border border-slate-150 flex flex-col items-center justify-center gap-2 hover:border-indigo-200 hover:bg-indigo-50/10 transition-all duration-200 group">
                <div className="w-10 h-10 bg-indigo-100/85 text-indigo-600 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                </div>
                <span className="text-xs font-extrabold text-slate-700 tracking-tight text-center">{t('dashboard.reports')}</span>
              </Link>

              <Link to="/guidelines" className="bg-slate-50/50 p-3 rounded-xl border border-slate-150 flex flex-col items-center justify-center gap-2 hover:border-emerald-200 hover:bg-emerald-50/10 transition-all duration-200 relative overflow-hidden group">
                <div className="w-10 h-10 bg-emerald-100/85 text-emerald-600 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <span className="text-xs font-extrabold text-slate-700 tracking-tight text-center truncate w-full">{language === 'bn' ? 'পরামর্শ' : 'Guidelines'}</span>
                <div className="absolute top-0 right-0 w-8 h-8 bg-amber-500 transform rotate-45 translate-x-4 -translate-y-4 flex items-end justify-center"><span className="text-[6px] text-white font-extrabold mb-1 tracking-wider">PRO</span></div>
              </Link>
            </div>
          </div>

          {/* Chores Checklist Card */}
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="font-bold text-slate-850 flex items-center gap-2 text-sm sm:text-base">
                  <CheckCircle size={20} className="text-emerald-500 animate-pulse" />
                  {activeStyle.heading}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {language === 'bn' ? 'আজকের কাজ শেষ করে টিক দিয়ে সম্পন্ন করুন' : 'Tick off operations as you complete them daily.'}
                </p>
              </div>
              <span className="text-xs font-black px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100/30 shrink-0 font-sans">
                {totalCompletedChores}/{chores.length}
              </span>
            </div>

            {/* Action Progress Bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full mb-5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500 rounded-full" 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            <div className="space-y-3">
              {chores.map((chore) => (
                <button
                  key={chore.id}
                  onClick={() => toggleChore(chore.id)}
                  className={`w-full text-left p-3.5 rounded-xl flex items-center gap-3 transition-all duration-150 cursor-pointer ${
                    chore.completed 
                      ? 'bg-slate-50/50 border border-slate-150/40 text-slate-400 line-through' 
                      : 'bg-slate-50 border border-slate-100 text-slate-755 hover:bg-slate-100/80 hover:border-slate-200'
                  }`}
                >
                  <div className="shrink-0 transition-transform active:scale-95 duration-100">
                    {chore.completed ? (
                      <CheckSquare size={19} className="text-emerald-600" />
                    ) : (
                      <Square size={19} className="text-slate-405 hover:text-emerald-500" />
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-bold leading-normal">
                    {language === 'bn' ? chore.textBn : chore.textEn}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Combined Recent Activities Logs */}
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm sm:text-base">
                <Activity size={18} className="text-green-600 animate-pulse" />
                {t('dashboard.recentActivity')}
              </h4>
              <span className="text-[10px] font-semibold text-slate-400">
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
                  
                  let typeColor = 'bg-slate-100 text-slate-600';
                  if (act.type === 'feed') typeColor = 'bg-orange-50 text-orange-600 border border-orange-100';
                  if (act.type === 'medicine') typeColor = 'bg-blue-50 text-blue-600 border border-blue-100';
                  if (act.type === 'expense') typeColor = 'bg-purple-50 text-purple-600 border border-purple-100';
                  if (act.type === 'sales') typeColor = 'bg-teal-50 text-teal-600 border border-teal-100';

                  return (
                    <div key={act.id} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-50 bg-slate-50/20 hover:bg-slate-50 transition-colors">
                      <div className="space-y-1 min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${typeColor}`}>
                            {language === 'bn' ? act.titleBn : act.titleEn}
                          </span>
                          <span className="text-[10px] text-slate-450 font-sans">{formattedDate}</span>
                        </div>
                        <p className="text-xs text-slate-700 font-bold truncate">
                          {language === 'bn' ? act.detailsBn : act.detailsEn}
                        </p>
                      </div>
                      
                      {act.amount > 0 && (
                        <div className="text-right shrink-0">
                          <p className={`text-xs font-black font-sans ${act.type === 'sales' ? 'text-green-650' : 'text-slate-800'}`}>
                            {act.type === 'sales' ? '+' : '-'} ৳ {act.amount}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-6 text-slate-400 text-xs border border-dashed border-slate-150 rounded-xl">
                {t('dashboard.noActivity')}
              </div>
            )}
          </div>

          {/* Technical Help and Support Channel */}
          <div className="bg-slate-50/40 rounded-2xl p-6 border border-dashed border-slate-200 flex flex-col text-center items-center justify-center">
            <h4 className="text-[10px] font-extrabold text-blue-650 uppercase tracking-widest">{language === 'bn' ? 'সহায়তা ও যোগাযোগ' : 'Technical Support Line'}</h4>
            <p className="text-xs text-slate-505 mt-1 font-bold max-w-sm leading-relaxed">
              {language === 'bn' ? 'খামারে কোনো জিজ্ঞাসা বা হিসাব মেলাতে সাহায্য লাগলে, যেকোনো সময় আমাদের টেকনিক্যাল দলের সাথে যোগাযোগ করতে পারেন।' : 'For queries or custom database settings, connect with our support line anytime.'}
            </p>
            <a 
              href="tel:+8801700000000" 
              className="mt-4 flex items-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
            >
              <PhoneCall size={14} />
              {language === 'bn' ? 'সাপোর্ট হটলাইন কল করুন' : 'Call Technical Expert'}
            </a>
          </div>
        </div>
      )}

    </div>
  );
}
