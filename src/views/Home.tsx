import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Sun, 
  CloudRain, 
  Clock, 
  Thermometer, 
  ChevronRight,
  ShieldCheck,
  Package,
  Waves,
  Beef
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Selected Farm Type State: 'poultry' (পোল্ট্রি), 'cattle' (পশুপালন/গরু), 'fish' (মৎস্য/মাছ)
  const [selectedType, setSelectedType] = useState<'poultry' | 'cattle' | 'fish'>(
    () => (localStorage.getItem('selected_farm_type') as any) || 'poultry'
  );
  
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
    setTipIndex(0);
  }, [selectedType]);

  useEffect(() => {
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
      
      const timeOptions: Intl.DateTimeFormatOptions = { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      };
      setTimeStr(now.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', timeOptions));

      if (hrs >= 5 && hrs < 12) {
        setGreeting({ bn: 'শুভ সকাল 🌅', en: 'Good Morning 🌅' });
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

  useEffect(() => {
    if (currentUser) {
      const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (docObj) => {
        if (docObj.exists()) {
          setProfileData(docObj.data());
        }
        setLoading(false);
      });
      return () => unsub();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const handleSelectType = (type: 'poultry' | 'cattle' | 'fish') => {
    setSelectedType(type);
    localStorage.setItem('selected_farm_type', type);
  };

  const styleConfig = {
    poultry: {
      gradient: 'from-green-700 via-emerald-600 to-green-600 border-green-500/20',
      tagColor: 'bg-green-100 text-green-800',
      tabLabelBn: 'পোল্ট্রি খামার সংস্করণ',
      tabLabelEn: 'Poultry Edition',
      bannerIcon: <Package className="text-yellow-300 animate-pulse" size={18} />
    },
    cattle: {
      gradient: 'from-amber-700 via-orange-600 to-amber-600 border-orange-500/20',
      tagColor: 'bg-amber-100 text-amber-900',
      tabLabelBn: 'পশুপালন খামার সংস্করণ',
      tabLabelEn: 'Cattle & Dairy Edition',
      bannerIcon: <Beef className="text-amber-100 animate-bounce" size={18} />
    },
    fish: {
      gradient: 'from-blue-700 via-cyan-600 to-blue-600 border-blue-500/20',
      tagColor: 'bg-blue-100 text-blue-900',
      tabLabelBn: 'মৎস্য চাষ খামার সংস্করণ',
      tabLabelEn: 'Pond & Fisheries Edition',
      bannerIcon: <Waves className="text-cyan-200 animate-pulse" size={18} />
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">{t('common.loading')}</div>;
  }

  const selectStyle = styleConfig[selectedType] || styleConfig.poultry;

  return (
    <div className="space-y-4 pb-4 select-none">

      {/* Switch Farm Mode */}
      <div className="bg-white p-2.5 rounded-2xl shadow-xs border border-slate-100">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 px-1">
          {language === 'bn' ? 'খামারের ক্যাটাগরি পরিবর্তন করুন' : 'Change View Category'}
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleSelectType('poultry')}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
              selectedType === 'poultry'
                ? 'bg-gradient-to-r from-emerald-600 to-green-500 text-white shadow-sm ring-2 ring-emerald-50'
                : 'bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100'
            }`}
          >
            🐔 <span className="truncate">{language === 'bn' ? 'মুরগি/হাঁস' : 'Poultry'}</span>
          </button>
          
          <button
            onClick={() => handleSelectType('cattle')}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
              selectedType === 'cattle'
                ? 'bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-sm ring-2 ring-amber-50'
                : 'bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100'
            }`}
          >
            🐄 <span className="truncate">{language === 'bn' ? 'গরু ও ছাগল' : 'Cattle/Goat'}</span>
          </button>

          <button
            onClick={() => handleSelectType('fish')}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
              selectedType === 'fish'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm ring-2 ring-blue-50'
                : 'bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100'
            }`}
          >
            🐟 <span className="truncate">{language === 'bn' ? 'মাছ চাষ' : 'Fishery'}</span>
          </button>
        </div>
      </div>

      {/* Header Greeting Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Profile" className="w-11 h-11 rounded-xl border-2 border-emerald-500 object-cover shadow-xs" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-base shadow-xs border-2 border-white">
                {(profileData?.name || currentUser?.displayName || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white"></span>
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <span className={`text-[8px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded ${selectStyle.tagColor}`}>
                {language === 'bn' ? selectStyle.tabLabelBn : selectStyle.tabLabelEn}
              </span>
              <div className="flex items-center gap-1 text-[8px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full border border-slate-100">
                <Clock size={8} className="text-slate-400 animate-spin" style={{ animationDuration: '6s' }} />
                <span className="font-mono font-bold tracking-tight">{timeStr}</span>
              </div>
            </div>
            
            <p className="text-slate-400 text-[10px] font-bold leading-none">
              {language === 'bn' ? `${greeting.bn},` : `${greeting.en},`}
            </p>
            <h3 className="text-base font-black text-slate-800 tracking-tight mt-0.5 leading-tight">
              {profileData?.name || currentUser?.displayName || t('dashboard.khamari')}
            </h3>
          </div>
        </div>
        
        {/* Farm Health Tag */}
        <div className="hidden sm:flex bg-emerald-50/20 border border-emerald-100/50 p-2 rounded-xl items-center gap-2">
          <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-xs">
            <ShieldCheck size={12} />
          </div>
          <div className="text-left">
            <p className="text-[8px] text-emerald-800 font-extrabold uppercase leading-none">{language === 'bn' ? 'অনলাইন' : 'Secure'}</p>
          </div>
        </div>
      </div>

      {/* Farm Dynamic Advice Banner */}
      <div className={`relative overflow-hidden bg-gradient-to-r ${selectStyle.gradient} rounded-2xl p-4 text-white shadow-xs border border-slate-100/10`}>
        <div className="relative z-10">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="p-0.5 px-1.5 rounded bg-white/20 backdrop-blur-xs text-[9px] font-black tracking-wide uppercase text-white flex items-center gap-1">
              {selectStyle.bannerIcon}
              <span>{language === 'bn' ? 'স্মার্ট খামার পরামর্শ' : 'Expert Farm Advice'}</span>
            </div>
          </div>
          <p className="text-xs font-bold leading-relaxed text-emerald-50">
            {language === 'bn' ? activeTips[tipIndex].bn : activeTips[tipIndex].en}
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-white/10 to-transparent skew-x-12 pointer-events-none"></div>
      </div>

      {/* Weather Comfort Level Indicator */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100">
        <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5 text-xs sm:text-sm">
          <Thermometer size={16} className="text-orange-500" />
          {selectedType === 'fish' 
            ? (language === 'bn' ? 'জলবায়ু ও পানির মান নিরাপত্তা নির্দেশক' : 'Water & Climatic Safety Meter')
            : (language === 'bn' ? 'আবহাওয়া ও তাপমাত্রা নিরাপত্তা নির্দেশক' : 'Weather & Thermal Comfort Level')
          }
        </h4>
        <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
          {selectedType === 'fish'
            ? (language === 'bn' ? 'অতিরিক্ত বৃষ্টি বা মেঘলা মেঘাচ্ছন্ন আবহাওয়ায় পুকুরের সার্বিক রিডিং নিয়মিত তদারকি করুন।' : 'Aggressive rain or cloudy state needs pond inspection.')
            : (language === 'bn' ? 'ঋতু পরিবর্তনের সময় খামারের আর্দ্রতা ও তাপমাত্রা নিয়ন্ত্রণ করা জরুরি।' : 'Monitor livestock thermal heat index to prevent heat strokes.')
          }
        </p>
        
        {selectedType === 'fish' ? (
          <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CloudRain size={24} className="text-blue-500 shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-slate-800">{language === 'bn' ? 'টানা শীতল বৃষ্টিপাত (পানি শীতলীকরণ ঝুঁকি)' : 'Persistent Rainfall (Cool Water Warning)'}</p>
                <p className="text-[9px] text-blue-700 font-extrabold mt-0.5">{language === 'bn' ? 'সতর্কতা: মাছের রোগপ্রতিরোধ ক্ষমতা হ্রাস ও অরুচি।' : 'Risk level: Low appetite. Minimize forced portions.'}</p>
              </div>
            </div>
            <div className="bg-blue-150 text-blue-900 text-[9px] font-black tracking-wide px-2 py-1 rounded shrink-0">
              {language === 'bn' ? 'পুকুরে হালকা চুন/লবণ দিন' : 'Apply Trace Coarse Salt'}
            </div>
          </div>
        ) : selectedType === 'cattle' ? (
          <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sun size={24} className="text-amber-500 shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-slate-800">{language === 'bn' ? 'উষ্ণ আদ্র আবহাওয়া সতর্কীকরণ স্তর' : 'High Relative Moisture Level'}</p>
                <p className="text-[9px] text-amber-700 font-extrabold mt-0.5">{language === 'bn' ? 'সতর্কতা: পশুর শ্বাসকষ্ট বা দুধের পরিমাণ হ্রাসের আশঙ্কা।' : 'Risk: High respiration rate. Retain fans active.'}</p>
              </div>
            </div>
            <div className="bg-amber-100 text-amber-900 text-[9px] font-black tracking-wide px-2 py-1 rounded shrink-0">
              {language === 'bn' ? 'ঠান্ডা বিশুদ্ধ পানি নিশ্চিত করুন' : 'Deliver Fresh Cold Water'}
            </div>
          </div>
        ) : (
          <div className="bg-orange-50/50 rounded-xl p-3 border border-orange-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sun size={24} className="text-amber-500 shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-slate-800">{language === 'bn' ? 'তীব্র গরমের দিন (৩০°C - ৩৫°C)' : 'High Heat Index Warning (30°C - 35°C)'}</p>
                <p className="text-[9px] text-amber-700 font-extrabold mt-0.5">{language === 'bn' ? 'সতর্কতা: হিট স্ট্রোকের সম্ভাবনা আছে।' : 'Risk level: High risk of flock heat strain.'}</p>
              </div>
            </div>
            <div className="bg-orange-100 text-orange-900 text-[9px] font-black tracking-wide px-2 py-1 rounded shrink-0">
              {language === 'bn' ? 'পানির পরিমাণ দ্বিগুণ করুন' : 'Double Liquid Intakes'}
            </div>
          </div>
        )}
      </div>

      {/* Prominent Dashboard Switcher CTA */}
      <Link 
        to="/dashboard" 
        className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-emerald-600 to-green-500 rounded-2xl text-white shadow-sm border border-emerald-500/10 hover:from-emerald-700 hover:to-green-600 transition-all duration-200 cursor-pointer group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-sm">
            📊
          </div>
          <div className="text-left">
            <p className="text-xs font-black tracking-tight">{language === 'bn' ? 'কুইক অ্যাকশন ও বিস্তারিত ড্যাশবোর্ড' : 'Quick Actions & Detailed Dashboard'}</p>
            <p className="text-[9px] text-emerald-100 font-bold">{language === 'bn' ? 'তদারকি লিস্ট, বয়স ও প্রবৃদ্ধি এনালাইটিক্স' : 'Checklists, Age & Growth Calculators'}</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-white transform transition-transform group-hover:translate-x-0.5 duration-200" />
      </Link>

    </div>
  );
}
