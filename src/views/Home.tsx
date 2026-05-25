import React, { useEffect, useState } from 'react';
import { collection, query, where, doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, fastGetDocs } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Sun, 
  CloudRain, 
  Clock, 
  Sparkles, 
  Calculator, 
  Activity, 
  CheckCircle, 
  Thermometer, 
  Info,
  Layers,
  PhoneCall,
  ChevronRight,
  ShieldCheck,
  Package,
  CheckSquare,
  Square,
  AlertTriangle,
  Waves,
  Beef,
  Droplet
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Chores {
  id: string;
  textBn: string;
  textEn: string;
  completed: boolean;
}

export default function Home() {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const [activeBatch, setActiveBatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [totalMortality, setTotalMortality] = useState<number>(0);
  const [profileData, setProfileData] = useState<any>(null);
  
  // Selected Farm Type State: 'poultry' (পোল্ট্রি), 'cattle' (পশুপালন/গরু), 'fish' (মৎস্য/মাছ)
  const [selectedType, setSelectedType] = useState<'poultry' | 'cattle' | 'fish'>('poultry');
  
  // Chores Checklist State
  const [chores, setChores] = useState<Chores[]>([]);
  
  // Quick dynamic targets
  const [calcBreed, setCalcBreed] = useState<'broiler' | 'sonali' | 'cattle' | 'fish'>('broiler');
  const [calcAge, setCalcAge] = useState<string>('15');
  const [calcResult, setCalcResult] = useState<{ weight: string; advice: string } | null>(null);

  // Smart Clock & Greeting
  const [timeStr, setTimeStr] = useState('');
  const [greeting, setGreeting] = useState({ bn: 'স্বাগতম', en: 'Welcome' });

  // Rotating farm advice index
  const [tipIndex, setTipIndex] = useState(0);

  // Tips structured by farm type
  const farmTips = {
    poultry: [
      {
        bn: "১. খামারে পর্যাপ্ত বিশুদ্ধ ঠান্ডা ও স্যালাইন পানির ব্যবস্থা রাখুন। অতিরিক্ত গরমে পানি পরিবর্তন আবশ্যক।",
        en: "1. Ensure sufficient cold and saline water for livestock. Frequent water changes are essential."
      },
      {
        bn: "২. স্যাঁতসেঁতে লিটার বা মেঝে থেকে মুরগির আমাশয় হতে পারে। লিটার সুস্থ রাখতে নিয়মিত উলটে-পালটে শুকনো রাখুন।",
        en: "2. Wet litter causes poultry enteritis. Turn over litter frequently to keep it dry and disease-free."
      },
      {
        bn: "৩. রুটিন অনুযায়ী ভ্যাকসিন ও কৃমিনাশক প্রদান করুন। অবহেলায় খামারে ব্যাপক মৃত্যুর ঝুঁকি বাড়ে।",
        en: "3. Regularly administer routine vaccines and deworming. Negligence increases mass mortality risks."
      },
      {
        bn: "৪. অ্যামোনিয়া গ্যাস বের হওয়ার জন্য পশুর ঘরে যথেষ্ট বাতাস চলাচলের (ভেন্টিলেশন) সুব্যবস্থা রাখুন।",
        en: "4. Assure proper cross-ventilation in the shed to flush out harmful ammonia gas buildup."
      },
      {
        bn: "৫. মানসম্মত ও ফ্রেশ খাবার সরবরাহ করুন। ছত্রাকযুক্ত সেঁতসেঁতে খাবার বৃদ্ধি ও উৎপাদন চরমভাবে হ্রাস করে।",
        en: "5. Always feed high-quality fresh feed. Damp or moldy feed drastically lowers growth and production."
      }
    ],
    cattle: [
      {
        bn: "১. বর্ষায় বা কাঁচা ঘাস খাওয়ানোর পূর্বে পশুকে নিয়মিত কৃমিনাশক (Dewormer) দিন ও খুরারোগের ভ্যাকসিন নিশ্চিত করুন।",
        en: "1. Route dewormer & FMD vaccine regularly before wet seasons or feeding raw grasses."
      },
      {
        bn: "২. ভালো দুধের উৎপাদনের জন্য দানাদার খাদ্যের সাথে খৈল, ভুষি এবং পর্যাপ্ত ক্যালসিয়াম তরল ও ভিটামিন খাওয়ান।",
        en: "2. Mix seed cake, bran, and mineral liquid with grains to significantly optimize high dairy outputs."
      },
      {
        bn: "৩. গোয়ালঘরে বাতাস চলাচলের জন্য যথেষ্ট ফ্যান রাখুন এবং মেঝে সবসময় শুকনো ও গোবর-মূত্র মুক্ত রাখুন।",
        en: "3. Keep cross-fans turned on in the shed. Scrap down urine and dung consistently to stay dry."
      },
      {
        bn: "৪. তরল দুধ দোহনের পূর্বে দুধের ওলান কুসুম গরম পানি ও হালকা ক্ষারমুক্ত তরল দিয়ে ধুয়ে জীবাণুমুক্ত করুন।",
        en: "4. Wash udder with mild lukewarm clean water before milk collection to safeguard cow health."
      },
      {
        bn: "৫. কাঁচা ঘাস সংরক্ষণ করতে অতিরিক্ত ঘাস দিয়ে সাইলেজ (Silage) তৈরি করুন যা শুষ্ক সময় খাদ্যের অভাব দূর করবে।",
        en: "5. Conserve excess green field grass by converting it to Silage for seamless raw feed in dry seasons."
      }
    ],
    fish: [
      {
        bn: "১. সকালে সূর্য ওঠার আগে পুকুরে অক্সিজেনের ঘাটতি হতে পারে; মাছ ভাসলে এয়ারেটর চালান বা পানি পিটিয়ে ঢেউ তুলুন।",
        en: "1. Fish gasping at dawn indicates oxygen lack. Instantly utilize aerators or splash water violently."
      },
      {
        bn: "২. পুকুরের পানির pH মাত্রা ৭.৫ থেকে ৮.৫ এর মধ্যে রাখুন। এসিডিটি বৃদ্ধি পেলে শতাংশ প্রতি ২৫০ গ্রাম চুন দিন।",
        en: "2. Retain pond pH between 7.5 to 8.5. Add 250g lime per decimal area if water becomes acidic."
      },
      {
        bn: "৩. পানির রঙ দেখে প্লাঙ্কটন বা প্রাকৃতিক খাদ্য বুঝুন। অতিরিক্ত শ্যাওলা জমলে খাবার প্রয়োগ সাময়িক বন্ধ রাখুন।",
        en: "3. Monitor plankton density via natural color. Halt feed slightly if green algae blooms heavily."
      },
      {
        bn: "৪. শাপলা, কচুরিপানা বা ক্ষতিকর রাক্ষুসে মাছ পুকুর থেকে দূর করুন যা চাষের মাছের বৃদ্ধি ব্যাহত করে।",
        en: "4. Clean aquatic weeds & remove predatory fish which steal artificial feed and kill fingerlings."
      },
      {
        bn: "৫. মেঘাচ্ছন্ন বা গুমোট আবহাওয়ায় পুকুরে গ্যাস জমার সম্ভাবনা বেশি থাকে। এই সময়ে মাছকে অতিরিক্ত খাবার দেবেন না।",
        en: "5. Cloudy muggy weather builds toxic gas. Reduce supplementary feed delivery during dark weather."
      }
    ]
  };

  const activeTips = farmTips[selectedType] || farmTips.poultry;

  useEffect(() => {
    // Reset tip index when selected category changes
    setTipIndex(0);
  }, [selectedType]);

  useEffect(() => {
    // Rotation of active tips
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % activeTips.length);
    }, 12000);
    return () => clearInterval(interval);
  }, [activeTips]);

  // Update clock & greeting dynamically
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = now.getHours();
      
      // Generate formatted time
      const timeOptions: Intl.DateTimeFormatOptions = { 
        hour: 'numeric', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: true 
      };
      setTimeStr(now.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', timeOptions));

      // Dynamic Greeting
      if (hrs >= 5 && hrs < 12) {
        setGreeting({ bn: 'शुभ সকাল 🌅', en: 'Good Morning 🌅' });
      } else if (hrs >= 12 && hrs < 16) {
        setGreeting({ bn: 'শুভ দুপুর ☀️', en: 'Good Afternoon ☀️' });
      } else if (hrs >= 16 && hrs < 19) {
        setGreeting({ bn: 'শুভ সন্ধ্যা 🌇', en: 'Good Evening 🌇' });
      } else {
        setGreeting({ bn: 'শুভ রাত্রি 🌌', en: 'Good Night 🌌' });
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [language]);

  const getTodayDateString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  };

  // Load and initialize chores based on date and selected farm type
  useEffect(() => {
    const todayStr = getTodayDateString();
    const savedChores = localStorage.getItem(`farm_chores_${selectedType}_${todayStr}`);
    
    // Customized Default Chores for each farm category
    const defaultChoresMap = {
      poultry: [
        { id: 'p1', textBn: 'সকালে পানি ও ফ্রেশ স্টার্টার/গ্রোয়ার খাবার দিন', textEn: 'Provide clean morning water & chick feed', completed: false },
        { id: 'p2', textBn: 'মুরগির লিটার বিছানা ওলট-পালট করে শুকনো রাখুন', textEn: 'Ensure litter or floor floor is dry and fluffy', completed: false },
        { id: 'p3', textBn: 'ঘরের বাতাস চলাচল (ভেন্টিলেশন) ও পর্দা চেক করুন', textEn: 'Verify poultry curtains and fresh ventilation', completed: false },
        { id: 'p4', textBn: 'তাপমাত্রা ও আর্দ্রতা নিয়ন্ত্রণ আছে কিনা দেখুন', textEn: 'Monitor chicken house temperature & heat levels', completed: false },
        { id: 'p5', textBn: 'অসুস্থ বা দুর্বল মুরগিগুলো আলাদা খাঁচায় রাখুন', textEn: 'Isolate sick or inactive birds immediately', completed: false },
      ],
      cattle: [
        { id: 'c1', textBn: 'পশুকে তাজা সবুজ কাঁচা ঘাস ও শুকনা খড় খেতে দিন', textEn: 'Deliver straw and fresh green pasture grass', completed: false },
        { id: 'c2', textBn: 'গোয়ালঘরের মেঝে ধুয়ে পরিস্কার ও শুকনো রাখুন', textEn: 'Clean dung and thoroughly wash cattle floor', completed: false },
        { id: 'c3', textBn: 'শরীরের তাপমাত্রা, খুরারোগ ও কোনো ক্ষত দেখুন', textEn: 'Check cattle body temperature and hoof health', completed: false },
        { id: 'c4', textBn: 'দুধ দোহন ও সংরক্ষণের পাত্রগুলো ধুয়ে ওয়াশ করুন', textEn: 'Disinfect milk collection can and dairy utensils', completed: false },
        { id: 'c5', textBn: 'দানাদার পুষ্টিকর খাদ্য মিশ্রণ বা খৈল ভুষি খাওয়ান', textEn: 'Feed high protein grain mixture and wheat bran', completed: false },
      ],
      fish: [
        { id: 'f1', textBn: 'ভোরে পুকুরে পানির উপরে মাছ ভাসছে কিনা দেখুন', textEn: 'Check for oxygen depletion at morning dawn', completed: false },
        { id: 'f2', textBn: 'নির্ধারিত ও সঠিক ওজনের ভাসমান খাবার পুকুরে দিন', textEn: 'Scatter optimal portions of floating fish feed', completed: false },
        { id: 'f3', textBn: 'পুকুরের পানির উপরিভাগের রঙ ও শ্যাওলার স্তর দেখুন', textEn: 'Observe fish pond color and algal bloom balance', completed: false },
        { id: 'f4', textBn: 'কিট দিয়ে পানির pH ও ক্ষতিকর অ্যামোনিয়া মেপে নিন', textEn: 'Measure water pH & dissolved oxygen metrics', completed: false },
        { id: 'f5', textBn: 'পুকুর থেকে ময়লা আবর্জনা ও জলজ জঙ্গল পরিষ্কার করুন', textEn: 'Clear aquatic weeds and floating dead organic wastes', completed: false },
      ]
    };

    const targetDefault = defaultChoresMap[selectedType] || defaultChoresMap.poultry;

    if (savedChores) {
      try {
        setChores(JSON.parse(savedChores));
      } catch (e) {
        setChores(targetDefault);
      }
    } else {
      setChores(targetDefault);
      localStorage.setItem(`farm_chores_${selectedType}_${todayStr}`, JSON.stringify(targetDefault));
    }
  }, [selectedType]);

  const toggleChore = (id: string) => {
    const updated = chores.map(c => c.id === id ? { ...c, completed: !c.completed } : c);
    setChores(updated);
    const todayStr = getTodayDateString();
    localStorage.setItem(`farm_chores_${selectedType}_${todayStr}`, JSON.stringify(updated));
  };

  useEffect(() => {
    fetchActiveBatch();
    
    if (currentUser) {
      const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (docObj) => {
        if (docObj.exists()) {
          setProfileData(docObj.data());
        }
      });
      return () => unsub();
    }
  }, [currentUser]);

  // Automatically update selected category if active batch updates
  useEffect(() => {
    if (activeBatch && activeBatch.farmType) {
      if (['poultry', 'cattle', 'fish'].includes(activeBatch.farmType)) {
        setSelectedType(activeBatch.farmType);
      }
    }
  }, [activeBatch]);

  // Synchronize calculator's type tab based on dashboard selection
  useEffect(() => {
    if (selectedType === 'poultry') {
      setCalcBreed('broiler');
    } else if (selectedType === 'cattle') {
      setCalcBreed('cattle');
    } else {
      setCalcBreed('fish');
    }
  }, [selectedType]);

  // Target weights advisor runs dynamically
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
        setCalcResult({ weight: '৪৫০-৫০০ গ্রাম', advice: 'গ্রোয়ার খাদ্য শুরু করুন, রানীক্ষেত ও গামবোরো ভ্যাকসিন দিন।' });
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
        setCalcResult({ weight: 'রেনু পোনা অবস্থা', advice: 'পুকুরে পর্যাপ্ত ফাইটোপ্ল্যাঙ্কটন ও জুপ্ল্যাঙ্কটন খাদ্য নিশ্চিত করুন।' });
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

  const calculateAge = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">{t('common.loading')}</div>;

  const totalCompletedChores = chores.filter(c => c.completed).length;
  const progressPercent = chores.length > 0 ? Math.round((totalCompletedChores / chores.length) * 100) : 0;

  // Configuration styling objects based on selected type
  const styleConfig = {
    poultry: {
      gradient: 'from-green-700 via-emerald-600 to-green-600 border-green-500/20',
      tagColor: 'bg-green-100 text-green-800',
      activeBorder: 'border-green-500 ring-2 ring-green-100',
      tabLabelBn: 'পোল্ট্রি খামার বিশেষ',
      tabLabelEn: 'Poultry Operations Edition',
      bannerIcon: <Package className="text-yellow-300 animate-pulse" size={18} />
    },
    cattle: {
      gradient: 'from-amber-700 via-orange-600 to-amber-600 border-orange-500/20',
      tagColor: 'bg-amber-100 text-amber-900',
      activeBorder: 'border-amber-500 ring-2 ring-amber-150',
      tabLabelBn: 'পশুপালন খামার বিশেষ',
      tabLabelEn: 'Cattle & Dairy Edition',
      bannerIcon: <Beef className="text-amber-100 animate-bounce" size={18} />
    },
    fish: {
      gradient: 'from-blue-700 via-cyan-600 to-blue-600 border-blue-500/20',
      tagColor: 'bg-blue-100 text-blue-900',
      activeBorder: 'border-blue-500 ring-2 ring-blue-150',
      tabLabelBn: 'মৎস্য চাষ খামার বিশেষ',
      tabLabelEn: 'Pond & Fisheries Edition',
      bannerIcon: <Waves className="text-cyan-200 animate-pulse" size={18} />
    }
  };

  const selectStyle = styleConfig[selectedType] || styleConfig.poultry;

  return (
    <div className="space-y-6 pb-6">

      {/* Switch Farm Mode (পিল বার সিলেক্টর) */}
      <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-gray-150-dot">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">
          {language === 'bn' ? 'সরাসরি খামারের ধরণ পরিবর্তন করুন' : 'Select Farm View Category'}
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setSelectedType('poultry')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${
              selectedType === 'poultry'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-sm shadow-green-200'
                : 'bg-gray-50 border border-gray-100 text-gray-600 hover:bg-gray-100'
            }`}
          >
            🐔 <span className="truncate">{language === 'bn' ? 'মুরগি/হাঁস' : 'Poultry'}</span>
          </button>
          
          <button
            onClick={() => setSelectedType('cattle')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${
              selectedType === 'cattle'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-sm shadow-orange-100'
                : 'bg-gray-50 border border-gray-100 text-gray-600 hover:bg-gray-100'
            }`}
          >
            🐄 <span className="truncate">{language === 'bn' ? 'গরু ও ছাগল' : 'Cattle/Goat'}</span>
          </button>

          <button
            onClick={() => setSelectedType('fish')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${
              selectedType === 'fish'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-sm shadow-blue-100'
                : 'bg-gray-50 border border-gray-100 text-gray-600 hover:bg-gray-100'
            }`}
          >
            🐟 <span className="truncate">{language === 'bn' ? 'মাছ চাষ' : 'Fishery'}</span>
          </button>
        </div>
      </div>

      {/* Header Greeting Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-150 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[10px] font-extrabold tracking-wide uppercase px-2.5 py-0.5 rounded-full inline-block ${selectStyle.tagColor}`}>
              {language === 'bn' ? selectStyle.tabLabelBn : selectStyle.tabLabelEn}
            </span>
            <div className="flex items-center gap-1 text-gray-400 text-xs">
              <Clock size={13} className="text-gray-400" />
              <span className="font-mono font-medium">{timeStr}</span>
            </div>
          </div>
          <h2 className="text-gray-800 text-lg font-medium">
            {language === 'bn' ? `${greeting.bn},` : `${greeting.en},`}
          </h2>
          <h3 className="text-2xl font-black text-green-700 tracking-tight">
            {profileData?.name || currentUser?.displayName || t('dashboard.khamari')}
          </h3>
          {profileData?.farmName && (
            <p className="text-xs text-gray-500 mt-1 font-semibold flex items-center gap-1">
              🏡 {profileData.farmName}
            </p>
          )}
        </div>
        
        {/* Farm Health/Status Quick Tag */}
        <div className="bg-green-50/50 border border-green-100 p-3.5 rounded-xl flex items-center gap-3 self-start md:self-auto">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0 shadow-sm">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{language === 'bn' ? 'সিকিউরিটি' : 'System Secure'}</p>
            <p className="text-xs text-green-800 font-bold">{language === 'bn' ? 'অনলাইন ও সুরক্ষিত' : 'Secure & Connected'}</p>
          </div>
        </div>
      </div>

      {/* Farm Dynamic News/Advice Banner */}
      <div className={`relative overflow-hidden bg-gradient-to-r ${selectStyle.gradient} rounded-2xl p-5 text-white shadow-md border ${selectStyle.gradient.split(' ')[0]}`}>
        <div className="relative z-10">
          <div className="flex items-center gap-1.5 mb-2">
            {selectStyle.bannerIcon}
            <span className="text-[10px] font-extrabold tracking-wider uppercase text-yellow-300">
              {language === 'bn' ? 'স্মার্ট খামার পরামর্শ' : 'Expert Farm Advice'}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-semibold leading-relaxed text-slate-50">
            {language === 'bn' ? activeTips[tipIndex].bn : activeTips[tipIndex].en}
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/4 bg-white/5 skew-x-12 pointer-events-none"></div>
      </div>

      {/* Daily Farm Checklist Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-150">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h4 className="font-bold text-gray-800 flex items-center gap-2">
              <CheckCircle size={20} className="text-emerald-500" />
              {language === 'bn' ? `${selectedType === 'poultry' ? 'পোল্ট্রি' : selectedType === 'cattle' ? 'পশুপালন' : 'মৎস্য চাষ'} দৈনিক তদারকি` : `${selectedType.toUpperCase()} Daily Tasks`}
            </h4>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {language === 'bn' ? 'কাজ শেষে টিক দিয়ে সম্পূর্ণ করুন' : 'Tick off operations as you complete them daily'}
            </p>
          </div>
          <span className="text-xs font-bold px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full shrink-0">
            {totalCompletedChores}/{chores.length}
          </span>
        </div>

        {/* Action Progress */}
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
              className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${
                chore.completed 
                  ? 'bg-emerald-50/40 border border-emerald-100/70 text-gray-400 line-through' 
                  : 'bg-gray-50 border border-gray-100 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="shrink-0 transition-transform active:scale-90 duration-100">
                {chore.completed ? (
                  <CheckSquare size={19} className="text-emerald-600" />
                ) : (
                  <Square size={19} className="text-gray-400" />
                )}
              </div>
              <span className="text-xs sm:text-sm font-semibold">
                {language === 'bn' ? chore.textBn : chore.textEn}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Batch Overview filtered by current type if matched, otherwise shows overall */}
      {activeBatch ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-150">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Package size={20} className="text-green-600" />
              <h4 className="font-bold text-gray-800">
                {t('dashboard.activeBatches')}: <span className="text-green-600 font-bold">{activeBatch.batchName}</span>
              </h4>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
              {language === 'bn' ? 'চলমান' : 'Active'}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-100/30">
              <p className="text-[11px] text-gray-500 mb-0.5">
                {selectedType === 'cattle' ? (language === 'bn' ? 'মোট পশু সংখ্যা' : 'Total Livestock') : t('dashboard.totalBirds')}
              </p>
              <p className="text-lg font-black text-blue-700">{activeBatch.totalChicks} {language === 'bn' ? 'টি' : ''}</p>
            </div>
            <div className="bg-orange-50/70 p-3 rounded-xl border border-orange-100/30">
              <p className="text-[11px] text-gray-500 mb-0.5">{t('dashboard.age')}</p>
              <p className="text-lg font-black text-orange-700">
                {calculateAge(activeBatch.startDate)} {t('dashboard.days')}
              </p>
            </div>
            {selectedType !== 'fish' && (
              <div className="col-span-2 bg-red-50/70 p-3 rounded-xl border border-red-100/30 flex justify-between items-center">
                <div>
                  <p className="text-[11px] text-gray-500 mb-0.5">{t('dashboard.totalMortality')}</p>
                  <p className="text-lg font-black text-red-600">{totalMortality} {language === 'bn' ? 'টি' : ''}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-red-100 text-red-700 rounded-full font-bold px-2.5 py-0.5 inline-block">
                    {language === 'bn' ? 'মৃত্যুহার: ' : 'Mortality: '}
                    {activeBatch.totalChicks > 0 ? ((totalMortality / activeBatch.totalChicks) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            )}
          </div>

          <Link 
            to={`/batches`} 
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition-all shadow-sm shadow-green-200 text-sm"
          >
            {language === 'bn' ? 'খামারের বিস্তারিত এনালাইটিক্স' : 'View Detailed Farm Analytics'} <ChevronRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center border-dashed border-2 border-green-200">
          <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
            <Package size={32} className="text-green-500" />
          </div>
          <h4 className="font-bold text-gray-800 mb-1">
            {language === 'bn' ? `কোনো চলমান ${selectedType === 'poultry' ? 'পোল্ট্রি' : selectedType === 'cattle' ? 'পশু' : 'মাছ'} ব্যাচ নেই` : `No active ${selectedType} batch`}
          </h4>
          <p className="text-sm text-gray-400 mb-4">{t('dashboard.noBatchesSub')}</p>
          <Link to="/batches" className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-green-700 inline-block transition-colors">
            {t('dashboard.createBatch')}
          </Link>
        </div>
      )}

      {/* Main Operations Shortcuts Launcher */}
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
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
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

      {/* Weather Indicator & Livestock Comfort Meter (Dynamic based on selectedType) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Thermometer size={19} className="text-orange-500 animate-bounce" />
          {selectedType === 'fish' 
            ? (language === 'bn' ? 'জলবায়ু ও পানির মান নিরাপত্তা নির্দেশক' : 'Water & Climatic Safety Meter')
            : (language === 'bn' ? 'আবহাওয়া ও তাপমাত্রা নিরাপত্তা নির্দেশক' : 'Weather & Thermal Comfort Level')
          }
        </h4>
        <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
          {selectedType === 'fish'
            ? (language === 'bn' ? 'অতিরিক্ত বৃষ্টি বা মেঘলা মেঘাচ্ছন্ন আবহাওয়ায় পুকুরের সার্বিক রিডিং নিয়মিত তদারকি করুন।' : 'Aggressive rain or cloudy state needs careful pond observation.')
            : (language === 'bn' ? 'ঋতু পরিবর্তনের সময় খামারের আর্দ্রতা ও তাপমাত্রা নিয়ন্ত্রণ জরুরি।' : 'Monitor livestock thermal heat index to prevent heat strokes.')
          }
        </p>
        
        {selectedType === 'fish' ? (
          <div className="bg-blue-50/40 rounded-xl p-4 border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CloudRain size={28} className="text-blue-500 shrink-0" />
              <div>
                <p className="text-xs font-black text-blue-900">{language === 'bn' ? 'টানা শীতল বৃষ্টিপাত (পানি শীতলীকরণ ঝুঁকি)' : 'Persistent Rainfall (Cool Water Warning)'}</p>
                <p className="text-[10px] text-blue-700 font-semibold">{language === 'bn' ? 'সতর্কতা: মাছের রোগপ্রতিরোধ ক্ষমতা হ্রাস ও খাবার অরুচি।' : 'Risk level: Low appetite. Minimize artificially fed portions.'}</p>
              </div>
            </div>
            <div className="bg-blue-100 text-blue-900 text-[10px] font-black tracking-wide px-3 py-1.5 rounded-lg shrink-0">
              {language === 'bn' ? 'পুকুরে হালকা লবণ ছিটান' : 'Apply Trace Coarse Salt'}
            </div>
          </div>
        ) : selectedType === 'cattle' ? (
          <div className="bg-amber-50/40 rounded-xl p-4 border border-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sun size={28} className="text-amber-500 shrink-0" />
              <div>
                <p className="text-xs font-black text-amber-900">{language === 'bn' ? 'উষ্ণ আদ্র আবহাওয়া সতর্কীকরণ স্তর (Heat Stress)' : 'High Relative Moisture Level'}</p>
                <p className="text-[10px] text-amber-700 font-semibold">{language === 'bn' ? 'সতর্কতা: গরুর শ্বাসকষ্ট বা ধহনের পরিমাণ হ্রাস কমার আশঙ্কা।' : 'Risk: High respiration rate. Retain active fans.'}</p>
              </div>
            </div>
            <div className="bg-amber-100 text-amber-900 text-[10px] font-black tracking-wide px-3 py-1.5 rounded-lg shrink-0">
              {language === 'bn' ? 'ঠান্ডা বিশুদ্ধ পানি নিশ্চিত করুন' : 'Deliver Fresh Cold Water'}
            </div>
          </div>
        ) : (
          <div className="bg-orange-50/40 rounded-xl p-4 border border-orange-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sun size={28} className="text-amber-500 animate-spin-slow shrink-0" />
              <div>
                <p className="text-xs font-black text-amber-900">{language === 'bn' ? 'তীব্র গরমের দিন (৩০°C - ৩৫°C)' : 'High Heat Index Warning (30°C - 35°C)'}</p>
                <p className="text-[10px] text-amber-700 font-semibold">{language === 'bn' ? 'সতর্কতা: হিট স্ট্রোকের সম্ভাবনা আছে।' : 'Risk level: High risk of flock heat strain.'}</p>
              </div>
            </div>
            <div className="bg-amber-100 text-amber-900 text-[10px] font-black tracking-wide px-3 py-1.5 rounded-lg shrink-0">
              {language === 'bn' ? 'পানির পরিমাণ দ্বিগুণ করুন' : 'Double Liquid Intakes'}
            </div>
          </div>
        )}
      </div>

      {/* Target Weight Companion Tool */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 shadow-sm border border-green-200">
        <div className="flex items-center gap-2 mb-3">
          <Calculator size={20} className="text-green-700" />
          <h4 className="font-bold text-green-900 text-sm sm:text-base">
            {language === 'bn' ? 'সহকারী খামার বৃদ্ধির লক্ষ্যমাত্র ক্যালকুলেটর' : 'Farm Target Growth Estimator'}
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
              className="w-full text-xs p-2.5 bg-white border border-green-200 rounded-xl text-gray-850 font-medium font-sans focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              <option value="broiler">{language === 'bn' ? 'ব্রয়লার মুরগি (Broiler)' : 'Broiler Poultry'}</option>
              <option value="sonali">{language === 'bn' ? 'সোনালী মুরগি (Sonali)' : 'Sonali Breed'}</option>
              <option value="cattle">{language === 'bn' ? 'গরু ও ছাগল (Cattle)' : 'Cattle & Sheep'}</option>
              <option value="fish">{language === 'bn' ? 'মাছ চাষ (Fishery)' : 'Fishery/Pond'}</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-green-800 uppercase tracking-wide block mb-1">
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
              className="w-full text-xs p-2.5 bg-white border border-green-200 rounded-xl text-gray-850 font-medium font-sans hover:border-green-300 focus:outline-none focus:ring-1 focus:ring-green-500" 
            />
          </div>
        </div>

        {calcResult && (
          <div className="bg-white p-3.5 rounded-xl border border-green-200/50 space-y-2">
            <div className="flex justify-between items-center pb-1.5 border-b border-gray-150 border-dotted">
              <span className="text-[11px] text-gray-500 font-bold">{language === 'bn' ? 'আদর্শ স্তর/ওজন:' : 'Target Weight/State:'}</span>
              <span className="text-sm font-black text-emerald-700 font-sans">{calcResult.weight}</span>
            </div>
            <div className="flex items-start gap-1.5">
              <Info size={14} className="text-green-600 mt-0.5 shrink-0" />
              <p className="text-[11px] text-gray-600 font-medium leading-relaxed">{calcResult.advice}</p>
            </div>
          </div>
        )}
      </div>

      {/* Developer & Owner Help Channel info */}
      <div className="bg-white rounded-2xl p-5 border border-dashed border-gray-200 flex flex-col text-center items-center justify-center p-6 bg-gray-50/20">
        <h4 className="text-xs font-extrabold text-blue-600 uppercase tracking-widest">{language === 'bn' ? 'সাহায্য ও কন্টাক্ট ইনফো' : 'Developer & Support'}</h4>
        <p className="text-xs text-gray-500 mt-1 font-semibold max-w-sm">
          {language === 'bn' ? 'যদি কোনো সমস্যা বোধ করেন বা সাহায্য লাগে, তবে সহজেই আমাদের টিমের সাথে যোগাযোগ করুন।' : 'If you face any issues or need custom setup assistance, connect with our support team.'}
        </p>
        <a 
          href="tel:+8801700000000" 
          className="mt-4 flex items-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-xs font-bold px-4 py-2 rounded-xl"
        >
          <PhoneCall size={14} />
          {language === 'bn' ? 'সাপোর্ট হটলাইন কল করুন' : 'Call Support Team'}
        </a>
      </div>

    </div>
  );
}
