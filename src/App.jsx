import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { useDbStudents, createStudent, updateStudent, deleteStudent } from "./api/students";
import { useDbTeachers, createTeacher, updateTeacher, deleteTeacher } from "./api/teachers";
import { useDbQuestions, createQuestion, updateQuestion, deleteQuestion } from "./api/questions";
import { systemIdToEmail } from "./api/identity";

function useLocalStorage(key,init){
  const [val,setVal]=useState(()=>{try{const s=localStorage.getItem(key);return s?JSON.parse(s):init;}catch{return init;}});
  const set=v=>{setVal(prev=>{const next=typeof v==="function"?v(prev):v;try{localStorage.setItem(key,JSON.stringify(next));}catch{}return next;});};
  return[val,set];
}

function useIsMobile(){
  const [m,setM]=useState(()=>typeof window!=="undefined"?window.innerWidth<768:false);
  useEffect(()=>{const h=()=>setM(window.innerWidth<768);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  return m;
}

const T = {
  bn: {
    appTitle:"শিক্ষার্থী KPI সিস্টেম", dashboard:"ড্যাশবোর্ড", teachers:"শিক্ষক",
    students:"শিক্ষার্থী", questions:"প্রশ্নমালা", reports:"রিপোর্ট",
    pointEntry:"পয়েন্ট এন্ট্রি", settings:"সেটিংস", accounts:"অ্যাকাউন্ট",
    admin:"অ্যাডমিন", teacher:"শিক্ষক", student:"শিক্ষার্থী", parent:"অভিভাবক",
    logout:"লগআউট", login:"লগইন", register:"রেজিস্ট্রেশন",
    username:"ব্যবহারকারী ID", password:"পাসওয়ার্ড", loginBtn:"প্রবেশ করুন",
    registerBtn:"রেজিস্ট্রেশন করুন", backToLogin:"লগইনে ফিরুন",
    totalStudents:"মোট শিক্ষার্থী", totalTeachers:"মোট শিক্ষক",
    monthlyKPI:"মাসিক KPI এন্ট্রি", topStudents:"শীর্ষ শিক্ষার্থী",
    classTeacher:"শ্রেণী শিক্ষক", subjectTeacher:"বিষয় শিক্ষক", guideTeacher:"গাইড শিক্ষক",
    addTeacher:"শিক্ষক যোগ করুন", addStudent:"শিক্ষার্থী যোগ করুন", addQuestion:"প্রশ্ন যোগ করুন",
    name:"নাম", class:"শ্রেণী", section:"শাখা", roll:"রোল", subject:"বিষয়",
    points:"পয়েন্ট", month:"মাস", save:"সংরক্ষণ", cancel:"বাতিল",
    rank:"র‍্যাংক", totalPoints:"মোট পয়েন্ট", selectDate:"তারিখ নির্বাচন",
    submitPoints:"পয়েন্ট জমা দিন", role:"ভূমিকা", activeMonths:"সক্রিয় মাস",
    pointsPerEntry:"সর্বোচ্চ পয়েন্ট", entrySuccess:"পয়েন্ট সফলভাবে জমা হয়েছে!",
    term1:"১ম প্রান্তিক", term2:"২য় প্রান্তিক", term3:"৩য় প্রান্তিক", term4:"৪র্থ প্রান্তিক",
    termConfig:"প্রান্তিক কনফিগারেশন", welcome:"স্বাগতম",
    jan:"জানুয়ারি", feb:"ফেব্রুয়ারি", mar:"মার্চ", apr:"এপ্রিল",
    may:"মে", jun:"জুন", jul:"জুলাই", aug:"আগস্ট",
    sep:"সেপ্টেম্বর", oct:"অক্টোবর", nov:"নভেম্বর", dec:"ডিসেম্বর",
    subjectAssignments:"বিষয় নিয়োগ", guideStudents:"গাইডি শিক্ষার্থী",
    noClassRole:"এই ভূমিকায় কোনো নিয়োগ নেই",
    selectClassSubject:"প্রথমে শ্রেণী ও বিষয় নির্বাচন করুন",
    pendingApprovals:"অনুমোদন অপেক্ষমাণ", approve:"অনুমোদন", reject:"বাতিল",
    approved:"অনুমোদিত", rejected:"বাতিল", pending:"অপেক্ষমাণ",
    myKPI:"আমার KPI", childKPI:"সন্তানের KPI", myProfile:"আমার প্রোফাইল",
    changePassword:"পাসওয়ার্ড পরিবর্তন", currentPassword:"বর্তমান পাসওয়ার্ড",
    newPassword:"নতুন পাসওয়ার্ড", confirmPassword:"পাসওয়ার্ড নিশ্চিত করুন",
    studentId:"শিক্ষার্থীর ID", parentName:"অভিভাবকের নাম",
    relation:"সম্পর্ক", father:"বাবা", mother:"মা", guardian:"অভিভাবক",
    autoId:"সিস্টেম ID", defaultPass:"ডিফল্ট পাসওয়ার্ড",
    accountManagement:"অ্যাকাউন্ট ম্যানেজমেন্ট",
    approvalNote:"অ্যাডমিনের অনুমোদনের পর লগইন করা যাবে",
    maxParents:"এই শিক্ষার্থীর সর্বোচ্চ ২ জন অভিভাবক নিবন্ধিত",
    invalidStudentId:"সঠিক শিক্ষার্থী ID দিন",
    passwordMismatch:"পাসওয়ার্ড মিলছে না",
    passwordChanged:"পাসওয়ার্ড পরিবর্তন হয়েছে!",
    wrongPassword:"বর্তমান পাসওয়ার্ড ভুল",
    myRank:"আমার র‍্যাংক", myMonthly:"মাসিক পয়েন্ট", myYearly:"বার্ষিক পয়েন্ট",
    progressChart:"অগ্রগতি চার্ট",
    addAdmin:"অ্যাডমিন যোগ করুন",makeAdmin:"অ্যাডমিন করুন",removeAdmin:"অ্যাডমিন সরান",adminAccounts:"অ্যাডমিন অ্যাকাউন্ট",rootAdmin:"মূল অ্যাডমিন",deleteAdmin:"মুছুন",userToAdmin:"ব্যবহারকারী → অ্যাডমিন",edit:"সম্পাদনা",teacherKPI:"শিক্ষক KPI",parentKPI:"অভিভাবক KPI",tchrKpiEntry:"শিক্ষক KPI এন্ট্রি",parKpiEntry:"অভিভাবক KPI এন্ট্রি",stdQuestions:"শিক্ষার্থী প্রশ্ন",tchrQuestions:"শিক্ষক প্রশ্ন",parQuestions:"অভিভাবক প্রশ্ন",entryHistory:"এন্ট্রি ইতিহাস",noQForMonth:"এই মাসে কোনো প্রশ্ন নেই",myTchrKPI:"আমার KPI",frequency:"পুনরাবৃত্তি",daily:"দৈনিক",weekly:"সাপ্তাহিক",monthly:"মাসিক",quarterly:"ত্রৈমাসিক",annual:"বার্ষিক",alreadyDone:"এই সময়ে দেওয়া হয়েছে",
  },
  en: {
    appTitle:"Student KPI System", dashboard:"Dashboard", teachers:"Teachers",
    students:"Students", questions:"Questions", reports:"Reports",
    pointEntry:"Point Entry", settings:"Settings", accounts:"Accounts",
    admin:"Admin", teacher:"Teacher", student:"Student", parent:"Parent",
    logout:"Logout", login:"Login", register:"Register",
    username:"User ID", password:"Password", loginBtn:"Sign In",
    registerBtn:"Register", backToLogin:"Back to Login",
    totalStudents:"Total Students", totalTeachers:"Total Teachers",
    monthlyKPI:"Monthly KPI Entries", topStudents:"Top Students",
    classTeacher:"Class Teacher", subjectTeacher:"Subject Teacher", guideTeacher:"Guide Teacher",
    addTeacher:"Add Teacher", addStudent:"Add Student", addQuestion:"Add Question",
    name:"Name", class:"Class", section:"Section", roll:"Roll", subject:"Subject",
    points:"Points", month:"Month", save:"Save", cancel:"Cancel",
    rank:"Rank", totalPoints:"Total Points", selectDate:"Select Date",
    submitPoints:"Submit Points", role:"Role", activeMonths:"Active Months",
    pointsPerEntry:"Max Points", entrySuccess:"Points submitted successfully!",
    term1:"1st Term", term2:"2nd Term", term3:"3rd Term", term4:"4th Term",
    termConfig:"Term Configuration", welcome:"Welcome",
    jan:"January", feb:"February", mar:"March", apr:"April",
    may:"May", jun:"June", jul:"July", aug:"August",
    sep:"September", oct:"October", nov:"November", dec:"December",
    subjectAssignments:"Subject Assignments", guideStudents:"Guide Students",
    noClassRole:"No assignment for this role",
    selectClassSubject:"Select class and subject first",
    pendingApprovals:"Pending Approvals", approve:"Approve", reject:"Reject",
    approved:"Approved", rejected:"Rejected", pending:"Pending",
    myKPI:"My KPI", childKPI:"Child's KPI", myProfile:"My Profile",
    changePassword:"Change Password", currentPassword:"Current Password",
    newPassword:"New Password", confirmPassword:"Confirm Password",
    studentId:"Student ID", parentName:"Parent Name",
    relation:"Relation", father:"Father", mother:"Mother", guardian:"Guardian",
    autoId:"System ID", defaultPass:"Default Password",
    accountManagement:"Account Management",
    approvalNote:"You can login after admin approval",
    maxParents:"Maximum 2 parents allowed per student",
    invalidStudentId:"Please enter a valid student ID",
    passwordMismatch:"Passwords do not match",
    passwordChanged:"Password changed successfully!",
    wrongPassword:"Current password is incorrect",
    myRank:"My Rank", myMonthly:"Monthly Points", myYearly:"Yearly Points",
    progressChart:"Progress Chart",
    addAdmin:"Add Admin",makeAdmin:"Make Admin",removeAdmin:"Remove Admin",adminAccounts:"Admin Accounts",rootAdmin:"Root Admin",deleteAdmin:"Delete",userToAdmin:"User → Admin",edit:"Edit",teacherKPI:"Teacher KPI",parentKPI:"Parent KPI",tchrKpiEntry:"Teacher KPI Entry",parKpiEntry:"Parent KPI Entry",stdQuestions:"Student Questions",tchrQuestions:"Teacher Questions",parQuestions:"Parent Questions",entryHistory:"Entry History",noQForMonth:"No questions for this month",myTchrKPI:"My KPI",frequency:"Frequency",daily:"Daily",weekly:"Weekly",monthly:"Monthly",quarterly:"Quarterly",annual:"Annual",alreadyDone:"Already done this period",
  }
};

const MONTHS=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const CLASSES=["Pre","1","2","3","4","5","6","7","8","9","10"];
const SECTIONS=["A","B","C","D"];
const SUBJECTS=["বাংলা/Bangla","ইংরেজি/English","গণিত/Math","বিজ্ঞান/Science","সমাজ/Social","ধর্ম/Religion","আইসিটি/ICT","চারু/Arts","শারীরিক/PE"];

const genId=(prefix,year,seq)=>`${prefix}-${year||new Date().getFullYear()}${String(seq).padStart(4,"0")}`;
const getWeekNumber=(dateStr)=>{const d=new Date(dateStr);const start=new Date(d.getFullYear(),0,1);return Math.ceil(((d-start)/86400000+start.getDay()+1)/7);};
const initTeachers=[
  {id:1,systemId:"TCH-20260001",name:"মোঃ রফিকুল ইসলাম",nameEn:"Md. Rafiqul Islam",password:"1234",classTeacher:{class:"8",section:"A"},subjectAssignments:[{class:"6",section:"B",subject:"গণিত/Math"},{class:"9",section:"A",subject:"বিজ্ঞান/Science"},{class:"8",section:"A",subject:"গণিত/Math"}],guideStudents:[3,4]},
  {id:2,systemId:"TCH-20260002",name:"সুমাইয়া বেগম",nameEn:"Sumaiya Begum",password:"1234",classTeacher:{class:"7",section:"A"},subjectAssignments:[{class:"7",section:"A",subject:"বাংলা/Bangla"},{class:"8",section:"A",subject:"বাংলা/Bangla"}],guideStudents:[1,2]},
  {id:3,systemId:"TCH-20260003",name:"করিম স্যার",nameEn:"Karim Sir",password:"1234",classTeacher:null,subjectAssignments:[{class:"9",section:"A",subject:"গণিত/Math"}],guideStudents:[5]},
];
const initStudents=[
  {id:1,systemId:"STD-20260001",name:"রাফি আহমেদ",nameEn:"Rafi Ahmed",class:"8",section:"A",roll:1,password:"1234"},
  {id:2,systemId:"STD-20260002",name:"সাকিব হাসান",nameEn:"Sakib Hassan",class:"8",section:"A",roll:2,password:"1234"},
  {id:3,systemId:"STD-20260003",name:"নাফিসা ইসলাম",nameEn:"Nafisa Islam",class:"8",section:"A",roll:3,password:"1234"},
  {id:4,systemId:"STD-20260004",name:"তানভীর রহমান",nameEn:"Tanvir Rahman",class:"7",section:"A",roll:1,password:"1234"},
  {id:5,systemId:"STD-20260005",name:"মেহেদী হাসান",nameEn:"Mehedi Hassan",class:"9",section:"A",roll:5,password:"1234"},
  {id:6,systemId:"STD-20260006",name:"রিমা আক্তার",nameEn:"Rima Akter",class:"6",section:"B",roll:3,password:"1234"},
];
const initParents=[
  {id:1,systemId:"PAR-20260001",name:"আহমেদ কবির",nameEn:"Ahmed Kabir",studentId:"STD-20260001",relation:"father",password:"1234",status:"approved"},
  {id:2,systemId:"PAR-20260002",name:"রহিমা বেগম",nameEn:"Rahima Begum",studentId:"STD-20260001",relation:"mother",password:"1234",status:"pending"},
  {id:3,systemId:"PAR-20260003",name:"হাসান মিয়া",nameEn:"Hasan Mia",studentId:"STD-20260002",relation:"father",password:"1234",status:"approved"},
];
const initQuestions=[
  {id:1,textBn:"উপস্থিতি ও সময়মতো আসা",textEn:"Attendance & Punctuality",role:"classTeacher",points:10,activeMonths:[0,1,2,3,4,5,6,7,8,9,10,11],frequency:"daily"},
  {id:2,textBn:"শ্রেণীকক্ষে শৃঙ্খলা",textEn:"Classroom Discipline",role:"classTeacher",points:10,activeMonths:[0,1,2,3,4,5,6,7,8,9,10,11],frequency:"daily"},
  {id:3,textBn:"পরিষ্কার-পরিচ্ছন্নতা",textEn:"Cleanliness",role:"classTeacher",points:5,activeMonths:[0,1,2,3,4,5,6,7,8,9,10,11],frequency:"daily"},
  {id:4,textBn:"সহপাঠীদের সাথে সহযোগিতা",textEn:"Cooperation with Peers",role:"classTeacher",points:5,activeMonths:[0,1,2,3,4,5,6,7,8,9,10,11],frequency:"daily"},
  {id:5,textBn:"পাঠে মনোযোগ",textEn:"Attention in Class",role:"subjectTeacher",points:10,activeMonths:[0,1,2,3,4,5,6,7,8,9,10,11],frequency:"daily"},
  {id:6,textBn:"হোমওয়ার্ক সম্পন্ন করা",textEn:"Homework Completion",role:"subjectTeacher",points:10,activeMonths:[0,1,2,3,4,5,6,7,8,9,10,11],frequency:"daily"},
  {id:7,textBn:"প্রশ্ন করার আগ্রহ",textEn:"Eagerness to Ask Questions",role:"subjectTeacher",points:5,activeMonths:[0,1,2,3,4,5,6,7,8,9,10,11],frequency:"daily"},
  {id:8,textBn:"নৈতিক আচরণ ও মূল্যবোধ",textEn:"Moral Behavior & Values",role:"guideTeacher",points:15,activeMonths:[0,1,2,3,4,5,6,7,8,9,10,11],frequency:"weekly"},
  {id:9,textBn:"ব্যক্তিগত লক্ষ্য পূরণ",textEn:"Personal Goal Achievement",role:"guideTeacher",points:15,activeMonths:[0,1,2,3,4,5,6,7,8,9,10,11],frequency:"weekly"},
  {id:10,textBn:"নেতৃত্বগুণ ও দলগত কাজ",textEn:"Leadership & Teamwork",role:"guideTeacher",points:10,activeMonths:[0,1,2,3,4,5,6,7,8,9,10,11],frequency:"weekly"},
];
const initEntries=[
  {id:1,studentId:1,teacherId:1,date:"2026-01-15",questionId:1,score:9,month:0,year:2026,role:"classTeacher",subject:"",editLog:[]},
  {id:2,studentId:1,teacherId:1,date:"2026-01-15",questionId:2,score:8,month:0,year:2026,role:"classTeacher",subject:"",editLog:[]},
  {id:3,studentId:2,teacherId:1,date:"2026-01-15",questionId:1,score:7,month:0,year:2026,role:"classTeacher",subject:"",editLog:[]},
  {id:4,studentId:3,teacherId:1,date:"2026-01-15",questionId:1,score:10,month:0,year:2026,role:"classTeacher",subject:"",editLog:[]},
  {id:5,studentId:1,teacherId:1,date:"2026-01-16",questionId:5,score:9,month:0,year:2026,role:"subjectTeacher",subject:"গণিত/Math",editLog:[]},
  {id:6,studentId:1,teacherId:1,date:"2026-01-16",questionId:6,score:8,month:0,year:2026,role:"subjectTeacher",subject:"গণিত/Math",editLog:[]},
  {id:7,studentId:1,teacherId:2,date:"2026-01-20",questionId:8,score:13,month:0,year:2026,role:"guideTeacher",subject:"",editLog:[]},
  {id:8,studentId:2,teacherId:2,date:"2026-01-20",questionId:8,score:12,month:0,year:2026,role:"guideTeacher",subject:"",editLog:[]},
  {id:9,studentId:1,teacherId:1,date:"2026-02-10",questionId:1,score:10,month:1,year:2026,role:"classTeacher",subject:"",editLog:[]},
  {id:10,studentId:2,teacherId:1,date:"2026-02-10",questionId:1,score:8,month:1,year:2026,role:"classTeacher",subject:"",editLog:[]},
  {id:11,studentId:3,teacherId:1,date:"2026-02-10",questionId:1,score:9,month:1,year:2026,role:"classTeacher",subject:"",editLog:[]},
];
const FREQ_OPTS=["daily","weekly","monthly","quarterly","annual"];
const initTeacherQuestions=[
  {id:1,textBn:"সময়মতো উপস্থিতি ও পাঠদান",textEn:"Punctuality & Teaching",points:10,activeMonths:[0,1,2,3,4,5,6,7,8,9,10,11],frequency:"monthly"},
  {id:2,textBn:"শ্রেণীকক্ষ পরিচালনা",textEn:"Classroom Management",points:10,activeMonths:[0,1,2,3,4,5,6,7,8,9,10,11],frequency:"monthly"},
  {id:3,textBn:"শিক্ষার্থীর উন্নতিতে মনোযোগ",textEn:"Student Progress Focus",points:10,activeMonths:[0,1,2,3,4,5,6,7,8,9,10,11],frequency:"monthly"},
  {id:4,textBn:"পেশাদারিত্ব ও আচরণ",textEn:"Professionalism & Conduct",points:10,activeMonths:[0,1,2,3,4,5,6,7,8,9,10,11],frequency:"monthly"},
  {id:5,textBn:"সহকর্মীদের সাথে সহযোগিতা",textEn:"Colleague Cooperation",points:10,activeMonths:[0,1,2,3,4,5,6,7,8,9,10,11],frequency:"monthly"},
];
const initParentQuestions=[
  {id:1,textBn:"অভিভাবক সভায় উপস্থিতি",textEn:"Parent Meeting Attendance",points:10,activeMonths:[0,1,2,3,4,5,6,7,8,9,10,11],frequency:"monthly"},
  {id:2,textBn:"সন্তানের পড়াশোনায় সহযোগিতা",textEn:"Child Study Support",points:10,activeMonths:[0,1,2,3,4,5,6,7,8,9,10,11],frequency:"monthly"},
  {id:3,textBn:"শিক্ষকের সাথে যোগাযোগ",textEn:"Teacher Communication",points:10,activeMonths:[0,1,2,3,4,5,6,7,8,9,10,11],frequency:"monthly"},
  {id:4,textBn:"স্কুলের নিয়ম মেনে চলা",textEn:"School Rule Compliance",points:10,activeMonths:[0,1,2,3,4,5,6,7,8,9,10,11],frequency:"monthly"},
];
export default function App() {
  const [lang,setLang]=useState("bn");
  const t=T[lang];
  const [currentUser,setCurrentUser]=useLocalStorage("kpi_currentUser",null);
  const [activeTab,setActiveTab]=useState("dashboard");
  const [teachers,setTeachers]=useLocalStorage("kpi_teachers",initTeachers);
  const [students,setStudents]=useLocalStorage("kpi_students",initStudents);
  const [parents,setParents]=useLocalStorage("kpi_parents",initParents);
  const [questions,setQuestions]=useLocalStorage("kpi_questions",initQuestions);
  const [entries,setEntries]=useLocalStorage("kpi_entries",initEntries);
  const [admins,setAdmins]=useLocalStorage("kpi_admins",[{id:0,systemId:"ADM-20260001",name:"অ্যাডমিন",nameEn:"Admin",password:"admin",isRoot:true}]);
  const [termConfig,setTermConfig]=useLocalStorage("kpi_termConfig",{term1:[0,1,2],term2:[3,4,5],term3:[6,7,8],term4:[9,10,11]});
  const [teacherQuestions,setTeacherQuestions]=useLocalStorage("kpi_tchrQ",initTeacherQuestions);
  const [teacherEntries,setTeacherEntries]=useLocalStorage("kpi_tchrE",[]);
  const [parentQuestions,setParentQuestions]=useLocalStorage("kpi_parQ",initParentQuestions);
  const [parentEntries,setParentEntries]=useLocalStorage("kpi_parE",[]);
  const [notif,setNotif]=useState("");
  const showNotif=(msg)=>{setNotif(msg);setTimeout(()=>setNotif(""),3500);};
  const curYear=new Date().getFullYear();
  const [selectedYear,setSelectedYear]=useState(curYear);
  const availableYears=[...new Set(entries.map(e=>e.year||2026))].sort((a,b)=>b-a);
  if(!availableYears.includes(curYear))availableYears.unshift(curYear);
  const getStudentMonthKPI=(sid,month,year=selectedYear)=>entries.filter(e=>e.studentId===sid&&e.month===month&&(e.year||2026)===year).reduce((s,e)=>s+e.score,0);
  const getStudentTermKPI=(sid,months,year=selectedYear)=>months.reduce((s,m)=>s+getStudentMonthKPI(sid,m,year),0);
  const getStudentYearKPI=(sid,year=selectedYear)=>MONTHS.reduce((s,_,i)=>s+getStudentMonthKPI(sid,i,year),0);
  const getTchrMonthKPI=(tid,month,year=selectedYear)=>teacherEntries.filter(e=>e.targetId===tid&&e.month===month&&(e.year||curYear)===year).reduce((s,e)=>s+e.score,0);
  const getTchrTermKPI=(tid,months,year=selectedYear)=>months.reduce((s,m)=>s+getTchrMonthKPI(tid,m,year),0);
  const getTchrYearKPI=(tid,year=selectedYear)=>MONTHS.reduce((s,_,i)=>s+getTchrMonthKPI(tid,i,year),0);
  const getParMonthKPI=(pid,month,year=selectedYear)=>parentEntries.filter(e=>e.targetId===pid&&e.month===month&&(e.year||curYear)===year).reduce((s,e)=>s+e.score,0);
  const getParTermKPI=(pid,months,year=selectedYear)=>months.reduce((s,m)=>s+getParMonthKPI(pid,m,year),0);
  const getParYearKPI=(pid,year=selectedYear)=>MONTHS.reduce((s,_,i)=>s+getParMonthKPI(pid,i,year),0);
  const handlePasswordChange=(userId,userType,newPassword)=>{
    if(userType==="teacher")setTeachers(t=>t.map(x=>x.id===userId?{...x,password:newPassword}:x));
    if(userType==="student")setStudents(s=>s.map(x=>x.id===userId?{...x,password:newPassword}:x));
    if(userType==="parent")setParents(p=>p.map(x=>x.id===userId?{...x,password:newPassword}:x));
    if(userType==="admin")setAdmins(a=>a.map(x=>x.id===userId?{...x,password:newPassword}:x));
    setCurrentUser(prev=>({...prev,password:newPassword}));
    showNotif(t.passwordChanged);
  };
  const isMobile=useIsMobile();
  const [navOpen,setNavOpen]=useState(false);
  const goTab=k=>{setActiveTab(k);setNavOpen(false);};
  const handleLogout=async()=>{try{await supabase.auth.signOut();}catch{/* no active backend session */}setCurrentUser(null);};
  if(!currentUser)return <AuthPage t={t} lang={lang} setLang={setLang} teachers={teachers} students={students} parents={parents} onLogin={(u)=>{setCurrentUser(u);setActiveTab("dashboard");}}/>;
  const isAdmin=currentUser.role==="admin",isTeacher=currentUser.role==="teacher";
  const pendingParents=parents.filter(p=>p.status==="pending");
  const navItems=[
    {key:"dashboard",icon:"⬛",label:t.dashboard},
    ...(isAdmin||isTeacher?[{key:"pointEntry",icon:"✏️",label:t.pointEntry}]:[]),
    ...(isAdmin?[
      {key:"teachers",icon:"👨‍🏫",label:t.teachers},
      {key:"students",icon:"🎓",label:t.students},
      {key:"questions",icon:"📋",label:t.questions},
      {key:"accounts",icon:"👤",label:`${t.accounts}${pendingParents.length>0?` (${pendingParents.length})`:""}`},
    ]:[]),
    {key:"reports",icon:"📊",label:t.reports},
    ...(isAdmin?[{key:"teacherKpi",icon:"📊",label:t.teacherKPI},{key:"parentKpi",icon:"👥",label:t.parentKPI},{key:"settings",icon:"⚙️",label:t.settings}]:[]),
    ...(isTeacher?[{key:"myTchrKpi",icon:"📈",label:t.myTchrKPI}]:[]),
    ...(currentUser.role==="parent"?[{key:"myParKpi",icon:"📈",label:t.myKPI}]:[]),
    {key:"profile",icon:"🔑",label:t.myProfile},
  ];
  return (
    <div style={S.app}>
      {notif&&<div style={{...S.notif,background:"#10b981",...(isMobile?{top:64,right:12,left:12,width:"auto"}:{})}}>{notif}</div>}
      {isMobile&&<header style={{position:"fixed",top:0,left:0,right:0,height:56,background:"#0f172a",display:"flex",alignItems:"center",gap:8,padding:"0 12px",zIndex:100,boxShadow:"0 2px 8px rgba(0,0,0,0.25)"}}>
        <button onClick={()=>setNavOpen(true)} style={{background:"none",border:"none",color:"#fff",fontSize:24,cursor:"pointer",padding:"2px 6px",lineHeight:1,flexShrink:0}}>☰</button>
        <div style={S.logoBox}>KPI</div>
        <span style={{fontSize:12,fontWeight:700,color:"#e2e8f0",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.appTitle}</span>
        <div style={{display:"flex",gap:4,flexShrink:0}}>
          <button onClick={()=>setLang("bn")} style={{...S.langBtn,...(lang==="bn"?S.langOn:{}),padding:"3px 7px",fontSize:11}}>বাং</button>
          <button onClick={()=>setLang("en")} style={{...S.langBtn,...(lang==="en"?S.langOn:{}),padding:"3px 7px",fontSize:11}}>EN</button>
        </div>
      </header>}
      {isMobile&&navOpen&&<div onClick={()=>setNavOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200}}/>}
      <aside style={isMobile?{...S.sidebar,position:"fixed",top:0,bottom:0,left:navOpen?0:-260,width:250,zIndex:300,transition:"left .25s ease",height:"100%",overflowY:"auto"}:S.sidebar}>
        <div style={S.sidebarTop}><div style={S.logoBox}>KPI</div><div style={S.logoText}>{t.appTitle}</div></div>
        <div style={S.langRow}>
          <button onClick={()=>setLang("bn")} style={{...S.langBtn,...(lang==="bn"?S.langOn:{})}}>বাং</button>
          <button onClick={()=>setLang("en")} style={{...S.langBtn,...(lang==="en"?S.langOn:{})}}>EN</button>
        </div>
        <nav style={S.nav}>{navItems.map(item=>(<button key={item.key} onClick={()=>goTab(item.key)} style={{...S.navBtn,...(activeTab===item.key?S.navBtnOn:{})}}><span>{item.icon}</span><span>{item.label}</span></button>))}</nav>
        <div style={S.sidebarFoot}>
          <div style={S.userRow}>
            <div style={S.ava}>{(currentUser.name||"A")[0]}</div>
            <div><div style={S.uName}>{currentUser.name}</div>
              <div style={S.uRole}>{isAdmin?t.admin:isTeacher?t.teacher:currentUser.role==="student"?t.student:t.parent}</div>
              {currentUser.systemId&&<div style={{fontSize:10,color:"#94a3b8"}}>{currentUser.systemId}</div>}
            </div>
          </div>
          <button onClick={handleLogout} style={S.logoutBtn}>{t.logout}</button>
        </div>
      </aside>
      <main style={{...S.main,...(isMobile?{marginTop:56}:{})}}>
        {activeTab==="dashboard"&&(isAdmin||isTeacher
          ?<AdminTeacherDashboard t={t} lang={lang} students={students} teachers={teachers} entries={entries} getStudentYearKPI={getStudentYearKPI} getStudentMonthKPI={getStudentMonthKPI} currentUser={currentUser} isAdmin={isAdmin} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears} pendingParents={pendingParents}/>
          :currentUser.role==="student"
            ?<StudentDashboard t={t} lang={lang} currentUser={currentUser} students={students} getStudentMonthKPI={getStudentMonthKPI} getStudentTermKPI={getStudentTermKPI} getStudentYearKPI={getStudentYearKPI} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears} termConfig={termConfig}/>
            :<ParentDashboard t={t} lang={lang} currentUser={currentUser} students={students} getStudentMonthKPI={getStudentMonthKPI} getStudentTermKPI={getStudentTermKPI} getStudentYearKPI={getStudentYearKPI} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears} termConfig={termConfig}/>
        )}
        {activeTab==="pointEntry"&&(isAdmin||isTeacher)&&<PointEntryPage t={t} lang={lang} currentUser={currentUser} students={students} questions={questions} entries={entries} setEntries={setEntries} showNotif={showNotif} isAdmin={isAdmin} teachers={teachers}/>}
        {activeTab==="teachers"&&isAdmin&&<TeachersPage t={t} lang={lang} showNotif={showNotif}/>}
        {activeTab==="students"&&isAdmin&&<StudentsPage t={t} lang={lang} teachers={teachers} parents={parents} showNotif={showNotif}/>}
        {activeTab==="questions"&&isAdmin&&<QuestionsPage t={t} lang={lang} showNotif={showNotif}/>}
        {activeTab==="accounts"&&isAdmin&&<AccountsPage t={t} lang={lang} parents={parents} setParents={setParents} students={students} setStudents={setStudents} teachers={teachers} setTeachers={setTeachers} admins={admins} setAdmins={setAdmins} showNotif={showNotif}/>}
        {activeTab==="reports"&&<ReportsPage t={t} lang={lang} students={students} entries={entries} termConfig={termConfig} getStudentMonthKPI={getStudentMonthKPI} getStudentTermKPI={getStudentTermKPI} getStudentYearKPI={getStudentYearKPI} currentUser={currentUser} isAdmin={isAdmin} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears}/>}
        {activeTab==="settings"&&isAdmin&&<SettingsPage t={t} lang={lang} termConfig={termConfig} setTermConfig={setTermConfig} showNotif={showNotif}/>}
        {activeTab==="profile"&&<ProfilePage t={t} lang={lang} currentUser={currentUser} onPasswordChange={handlePasswordChange}/>}
        {activeTab==="teacherKpi"&&isAdmin&&<TeacherKPIPage t={t} lang={lang} teachers={teachers} teacherQuestions={teacherQuestions} teacherEntries={teacherEntries} setTeacherEntries={setTeacherEntries} showNotif={showNotif} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears}/>}
        {activeTab==="parentKpi"&&isAdmin&&<ParentKPIPage t={t} lang={lang} parents={parents} parentQuestions={parentQuestions} parentEntries={parentEntries} setParentEntries={setParentEntries} showNotif={showNotif} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears}/>}
        {activeTab==="myTchrKpi"&&isTeacher&&<MyTeacherKPIPage t={t} lang={lang} currentUser={currentUser} teacherEntries={teacherEntries} getTchrMonthKPI={getTchrMonthKPI} getTchrTermKPI={getTchrTermKPI} getTchrYearKPI={getTchrYearKPI} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears} termConfig={termConfig}/>}
        {activeTab==="myParKpi"&&currentUser.role==="parent"&&<MyParentKPIPage t={t} lang={lang} currentUser={currentUser} parentEntries={parentEntries} getParMonthKPI={getParMonthKPI} getParTermKPI={getParTermKPI} getParYearKPI={getParYearKPI} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears} termConfig={termConfig}/>}
      </main>
      <style>{`*{box-sizing:border-box}body{overflow-x:hidden}@media(max-width:767px){table{font-size:12px!important}th,td{padding:6px 8px!important}}`}</style>
    </div>
  );
}
function YearSelector({t,lang,selectedYear,setSelectedYear,availableYears}){return(<div style={{display:"flex",alignItems:"center",gap:8,background:"#f8fafc",borderRadius:10,padding:"8px 14px"}}><span style={{fontSize:13,fontWeight:700,color:"#334155"}}>📅 {lang==="bn"?"বছর":"Year"}:</span><select style={{border:"none",background:"transparent",fontSize:15,fontWeight:800,color:"#334155",outline:"none",cursor:"pointer"}} value={selectedYear} onChange={e=>setSelectedYear(parseInt(e.target.value))}>{availableYears.map(y=><option key={y} value={y}>{y}</option>)}</select></div>);}
function StatCard({icon,value,label,color}){return(<div style={{...S.statCard,border:"1px solid #e2e8f0"}}><div style={{fontSize:22,marginBottom:8}}>{icon}</div><div style={{fontSize:20,fontWeight:800,color:"#0f172a",marginBottom:4}}>{value}</div><div style={{fontSize:12,color:"#64748b"}}>{label}</div></div>);}
function RankCard({title,list,lang,t}){return(<div style={S.card}><h3 style={S.ct}>{title}</h3>{list.map((s,i)=>(<div key={s.id} style={S.rankRow}><div style={{...S.rankBadge,background:i===0?"#0f172a":i===1?"#52525b":i===2?"#a1a1aa":"#f4f4f5",color:i<3?"#fff":"#64748b"}}>{i+1}</div><div style={{flex:1,fontSize:14,fontWeight:500}}>{lang==="bn"?s.name:s.nameEn}</div><div style={{fontSize:12,color:"#94a3b8"}}>{t.class} {s.class}{s.section}</div><div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{s.kpi}</div></div>))}</div>);}
function AuthPage({t,lang,setLang,teachers,students,parents,onLogin}){
  const [form,setForm]=useState({id:"",password:""});
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const doLogin=async()=>{
    setError("");
    setBusy(true);
    try{
      // 1) Supabase Auth — real backend accounts (admin migrated so far)
      const email=systemIdToEmail(form.id);
      if(email&&form.password){
        const {data,error:authErr}=await supabase.auth.signInWithPassword({email,password:form.password});
        if(!authErr&&data?.user){
          const {data:prof}=await supabase.from("profiles").select("*").eq("auth_id",data.user.id).maybeSingle();
          if(prof){
            onLogin({id:prof.id,systemId:prof.system_id,name:lang==="bn"?prof.name:prof.name_en,nameEn:prof.name_en,role:prof.role,isRoot:prof.is_root,backend:true});
            return;
          }
          // authenticated but no profile row — undo and fall through to demo auth
          await supabase.auth.signOut();
        }
      }
      // 2) Fallback — localStorage demo accounts (teacher/student/parent not yet migrated)
      doLocalLogin();
    }finally{setBusy(false);}
  };
  const doLocalLogin=()=>{
    // Admin is migrated to Supabase Auth — no localStorage admin fallback.
    // teacher/student/parent stay on demo localStorage until their slices migrate.
    const tc=teachers.find(x=>x.systemId===form.id&&x.password===form.password);
    if(tc){onLogin({...tc,name:lang==="bn"?tc.name:tc.nameEn,role:tc.isAdmin?"admin":"teacher"});return;}
    const st=students.find(x=>x.systemId===form.id&&x.password===form.password);
    if(st){onLogin({...st,name:lang==="bn"?st.name:st.nameEn,role:st.isAdmin?"admin":"student"});return;}
    const pr=parents.find(x=>x.systemId===form.id&&x.password===form.password);
    if(pr){
      if(pr.status==="pending"){setError(lang==="bn"?"অ্যাডমিনের অনুমোদন বাকি":"Awaiting admin approval");return;}
      if(pr.status==="rejected"){setError(lang==="bn"?"অ্যাকাউন্ট বাতিল":"Account rejected");return;}
      onLogin({...pr,name:lang==="bn"?pr.name:pr.nameEn,role:pr.isAdmin?"admin":"parent"});return;
    }
    setError(lang==="bn"?"ভুল ID বা পাসওয়ার্ড":"Invalid ID or password");
  };
  return(
    <div style={S.loginBg}><div style={S.loginCard}>
      <div style={{textAlign:"center",marginBottom:20}}>
        <div style={S.loginLogo}>KPI</div>
        <h1 style={{fontSize:20,fontWeight:800,color:"#0f172a",margin:"8px 0 4px"}}>{t.appTitle}</h1>
        <p style={{fontSize:12,color:"#64748b",margin:0}}>{lang==="bn"?"শিক্ষার্থী মূল্যায়ন ব্যবস্থাপনা":"Student Evaluation Management"}</p>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:20,justifyContent:"center"}}>
        <button onClick={()=>setLang("bn")} style={{...S.langBtn,...(lang==="bn"?S.langOn:{}),padding:"6px 16px"}}>বাংলা</button>
        <button onClick={()=>setLang("en")} style={{...S.langBtn,...(lang==="en"?S.langOn:{}),padding:"6px 16px"}}>English</button>
      </div>
      <div style={S.fg}><label style={S.lbl}>{t.username}</label>
        <input style={S.inp} value={form.id} onChange={e=>setForm({...form,id:e.target.value})} placeholder="admin | TCH-20260001 | STD-20260001"/></div>
      <div style={S.fg}><label style={S.lbl}>{t.password}</label>
        <input style={S.inp} type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} onKeyDown={e=>e.key==="Enter"&&!busy&&doLogin()}/></div>
      {error&&<div style={{color:"#ef4444",fontSize:13,marginBottom:8,textAlign:"center"}}>{error}</div>}
      <button onClick={doLogin} disabled={busy} style={{...S.loginBtn,...(busy?{opacity:0.6,cursor:"wait"}:{})}}>{busy?(lang==="bn"?"প্রবেশ করা হচ্ছে…":"Signing in…"):t.loginBtn}</button>
      <div style={{marginTop:14,background:"#f8fafc",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#64748b"}}>
        <div style={{fontWeight:700,marginBottom:4,color:"#475569"}}>{lang==="bn"?"ডেমো:":"Demo:"}</div>
        <div>admin / admin</div><div>TCH-20260001 / 1234</div>
        <div>STD-20260001 / 1234</div><div>PAR-20260001 / 1234</div>
      </div>
    </div></div>
  );
}
function AdminTeacherDashboard({t,lang,students,teachers,entries,getStudentYearKPI,getStudentMonthKPI,currentUser,isAdmin,selectedYear,setSelectedYear,availableYears,pendingParents}){
  const cm=new Date().getMonth();
  const ranked=[...students].map(s=>({...s,kpi:getStudentYearKPI(s.id,selectedYear)})).sort((a,b)=>b.kpi-a.kpi);
  const mRanked=[...students].map(s=>({...s,kpi:getStudentMonthKPI(s.id,cm,selectedYear)})).sort((a,b)=>b.kpi-a.kpi);
  const totalE=entries.filter(e=>e.month===cm&&(e.year||2026)===selectedYear).length;
  return(<div style={S.page}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
      <div><h2 style={S.pt}>{t.dashboard}</h2><p style={S.ps}>{lang==="bn"?`স্বাগতম, ${currentUser.name}`:`${t.welcome}, ${currentUser.name}`}</p></div>
      <YearSelector t={t} lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears}/>
    </div>
    {isAdmin&&<div style={S.grid4}>
      <StatCard icon="🎓" value={students.length} label={t.totalStudents} color="#0f172a"/>
      <StatCard icon="👨‍🏫" value={teachers.length} label={t.totalTeachers} color="#2563eb"/>
      <StatCard icon="✏️" value={totalE} label={t.monthlyKPI} color="#0f172a"/>
      <StatCard icon={pendingParents.length>0?"⏳":"🏆"} value={pendingParents.length>0?pendingParents.length:(lang==="bn"?ranked[0]?.name:ranked[0]?.nameEn||"-")} label={pendingParents.length>0?(lang==="bn"?"অনুমোদন বাকি":"Pending"):(lang==="bn"?"শীর্ষ শিক্ষার্থী":"Top Student")} color="#0f172a"/>
    </div>}
    <div style={S.two}>
      <RankCard title={`🏆 ${t.topStudents} — ${lang==="bn"?"বার্ষিক":"Yearly"} ${selectedYear}`} list={ranked.slice(0,5)} lang={lang} t={t}/>
      <RankCard title={`📅 ${T[lang][MONTHS[cm]]} — ${lang==="bn"?"মাসিক":"Monthly"}`} list={mRanked.slice(0,5)} lang={lang} t={t}/>
    </div>
  </div>);}
function BarChart({data,cm}){
  const maxVal=Math.max(...data.map(d=>d.val),1);
  return(<div style={{display:"flex",alignItems:"flex-end",gap:6,height:120,padding:"8px 0"}}>
    {data.map((d,i)=>(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <div style={{fontSize:10,color:"#0f172a",fontWeight:700}}>{d.val||""}</div>
      <div style={{width:"100%",background:i===cm?"#0f172a":"#e2e8f0",borderRadius:"4px 4px 0 0",height:`${Math.max((d.val/maxVal)*90,d.val>0?8:2)}px`}}/>
      <div style={{fontSize:9,color:"#94a3b8",fontWeight:600}}>{d.label}</div>
    </div>))}
  </div>);}
function StudentDashboard({t,lang,currentUser,students,getStudentMonthKPI,getStudentTermKPI,getStudentYearKPI,selectedYear,setSelectedYear,availableYears,termConfig}){
  const sid=currentUser.id,cm=new Date().getMonth();
  const allRanked=[...students].map(s=>({...s,kpi:getStudentYearKPI(s.id,selectedYear)})).sort((a,b)=>b.kpi-a.kpi);
  const myRank=allRanked.findIndex(s=>s.id===sid)+1;
  const monthData=MONTHS.map((m,i)=>({label:T[lang][m].slice(0,3),val:getStudentMonthKPI(sid,i,selectedYear)}));
  return(<div style={S.page}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
      <div><h2 style={S.pt}>{t.myKPI}</h2><p style={S.ps}>{lang==="bn"?`স্বাগতম, ${currentUser.name}`:`${t.welcome}, ${currentUser.name}`}</p><p style={{fontSize:12,color:"#94a3b8",margin:"2px 0 0"}}>{currentUser.systemId}</p></div>
      <YearSelector t={t} lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears}/>
    </div>
    <div style={S.grid4}>
      <StatCard icon="🏆" value={`#${myRank}`} label={t.myRank} color="#0f172a"/>
      <StatCard icon="📅" value={getStudentMonthKPI(sid,cm,selectedYear)} label={`${T[lang][MONTHS[cm]]} ${t.myMonthly}`} color="#0f172a"/>
      <StatCard icon="📊" value={getStudentYearKPI(sid,selectedYear)} label={`${selectedYear} ${t.myYearly}`} color="#0f172a"/>
      <StatCard icon="🎓" value={`${currentUser.class}${currentUser.section||""}`} label={t.class} color="#2563eb"/>
    </div>
    <div style={S.card}><h3 style={S.ct}>📈 {t.progressChart} — {selectedYear}</h3><BarChart data={monthData} cm={cm}/></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12}}>
      {["term1","term2","term3","term4"].map(term=>(<div key={term} style={{...S.card,textAlign:"center",padding:14}}><div style={{fontSize:12,color:"#64748b",marginBottom:4}}>{t[term]}</div><div style={{fontSize:22,fontWeight:800,color:"#0f172a"}}>{getStudentTermKPI(sid,termConfig[term],selectedYear)}</div><div style={{fontSize:11,color:"#94a3b8"}}>{lang==="bn"?"পয়েন্ট":"pts"}</div></div>))}
    </div>
  </div>);}
function ParentDashboard({t,lang,currentUser,students,getStudentMonthKPI,getStudentTermKPI,getStudentYearKPI,selectedYear,setSelectedYear,availableYears,termConfig}){
  const child=students.find(s=>s.systemId===currentUser.studentId);
  if(!child)return<div style={S.page}><div style={S.empty}>{lang==="bn"?"শিক্ষার্থী পাওয়া যায়নি":"Student not found"}</div></div>;
  const sid=child.id,cm=new Date().getMonth();
  const allRanked=[...students].map(s=>({...s,kpi:getStudentYearKPI(s.id,selectedYear)})).sort((a,b)=>b.kpi-a.kpi);
  const myRank=allRanked.findIndex(s=>s.id===sid)+1;
  const monthData=MONTHS.map((m,i)=>({label:T[lang][m].slice(0,3),val:getStudentMonthKPI(sid,i,selectedYear)}));
  const relLabel=currentUser.relation==="father"?t.father:currentUser.relation==="mother"?t.mother:t.guardian;
  return(<div style={S.page}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
      <div><h2 style={S.pt}>{t.childKPI}</h2><p style={S.ps}>{relLabel}: {currentUser.name}</p></div>
      <YearSelector t={t} lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears}/>
    </div>
    <div style={{...S.card,background:"linear-gradient(135deg,#f8fafc,#f0fdf4)",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{...S.ava,width:50,height:50,fontSize:22}}>{(lang==="bn"?child.name:child.nameEn)[0]}</div>
        <div><div style={{fontSize:17,fontWeight:800,color:"#0f172a"}}>{lang==="bn"?child.name:child.nameEn}</div><div style={{fontSize:13,color:"#0f172a"}}>{child.systemId}</div><div style={{fontSize:12,color:"#64748b"}}>{t.class} {child.class}{child.section} | {t.roll}: {child.roll}</div></div>
      </div>
    </div>
    <div style={S.grid4}>
      <StatCard icon="🏆" value={`#${myRank}`} label={t.myRank} color="#0f172a"/>
      <StatCard icon="📅" value={getStudentMonthKPI(sid,cm,selectedYear)} label={`${T[lang][MONTHS[cm]]} ${t.myMonthly}`} color="#0f172a"/>
      <StatCard icon="📊" value={getStudentYearKPI(sid,selectedYear)} label={`${selectedYear} ${t.myYearly}`} color="#0f172a"/>
      <StatCard icon="👥" value={students.length} label={lang==="bn"?"মোট শিক্ষার্থী":"Total Students"} color="#2563eb"/>
    </div>
    <div style={S.card}><h3 style={S.ct}>📈 {t.progressChart} — {selectedYear}</h3><BarChart data={monthData} cm={cm}/></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12}}>
      {["term1","term2","term3","term4"].map(term=>(<div key={term} style={{...S.card,textAlign:"center",padding:14}}><div style={{fontSize:12,color:"#64748b",marginBottom:4}}>{t[term]}</div><div style={{fontSize:22,fontWeight:800,color:"#0f172a"}}>{getStudentTermKPI(sid,termConfig[term],selectedYear)}</div><div style={{fontSize:11,color:"#94a3b8"}}>{lang==="bn"?"পয়েন্ট":"pts"}</div></div>))}
    </div>
  </div>);}
function AccountsPage({t,lang,parents,setParents,students,setStudents,teachers,setTeachers,admins,setAdmins,showNotif}){
  const [tab,setTab]=useState("pending");
  const [showForm,setShowForm]=useState(false);
  const [showAdminForm,setShowAdminForm]=useState(false);
  const [form,setForm]=useState({studentId:"",name:"",nameEn:"",relation:"father",password:"1234"});
  const [adminForm,setAdminForm]=useState({name:"",nameEn:"",password:"1234"});
  const [formErr,setFormErr]=useState("");
  const [editParent,setEditParent]=useState(null);
  const [parentForm,setParentForm]=useState({name:"",nameEn:"",password:"",relation:"father",status:"approved"});
  const [confirmParentDel,setConfirmParentDel]=useState(null);
  const openEditParent=p=>{setEditParent(p);setParentForm({name:p.name,nameEn:p.nameEn||"",password:p.password,relation:p.relation,status:p.status});};
  const handleSaveParent=()=>{setParents(ps=>ps.map(x=>x.id===editParent.id?{...x,...parentForm}:x));setEditParent(null);showNotif(lang==="bn"?"আপডেট হয়েছে!":"Updated!");};
  const handleAddParent=()=>{
    setFormErr("");
    const st=students.find(s=>s.systemId===form.studentId);
    if(!st){setFormErr(t.invalidStudentId);return;}
    if(!form.name){setFormErr(lang==="bn"?"নাম আবশ্যক":"Name required");return;}
    const ex=parents.filter(p=>p.studentId===form.studentId);
    if(ex.length>=2){setFormErr(t.maxParents);return;}
    if(ex.find(p=>p.relation===form.relation)){setFormErr(lang==="bn"?"ইতিমধ্যে আছে":"Already exists");return;}
    const yr=new Date().getFullYear();
    const np={id:Date.now(),systemId:genId("PAR",yr,parents.length+1),name:form.name,nameEn:form.nameEn||form.name,studentId:form.studentId,relation:form.relation,password:form.password,status:"approved"};
    setParents(p=>[...p,np]);setShowForm(false);
    setForm({studentId:"",name:"",nameEn:"",relation:"father",password:"1234"});
    showNotif(lang==="bn"?`অভিভাবক যোগ! ID: ${np.systemId}`:`Parent added! ID: ${np.systemId}`);
  };
  const handleAddAdmin=()=>{
    setFormErr("");
    if(!adminForm.name){setFormErr(lang==="bn"?"নাম আবশ্যক":"Name required");return;}
    const yr=new Date().getFullYear();
    const na={id:Date.now(),systemId:genId("ADM",yr,admins.length+1),name:adminForm.name,nameEn:adminForm.nameEn||adminForm.name,password:adminForm.password,isRoot:false};
    setAdmins(a=>[...a,na]);setShowAdminForm(false);
    setAdminForm({name:"",nameEn:"",password:"1234"});
    showNotif(lang==="bn"?`অ্যাডমিন যোগ! ID: ${na.systemId}`:`Admin added! ID: ${na.systemId}`);
  };
  const deleteAdmin=id=>{
    if(admins.find(a=>a.id===id)?.isRoot){showNotif(lang==="bn"?"মূল অ্যাডমিন মুছতে পারবেন না":"Cannot delete root admin");return;}
    setAdmins(a=>a.filter(x=>x.id!==id));
    showNotif(lang==="bn"?"মুছা হয়েছে!":"Deleted!");
  };
  const toggleUserAdmin=(type,userId)=>{
    if(type==="teacher")setTeachers(tc=>tc.map(x=>x.id===userId?{...x,isAdmin:!x.isAdmin}:x));
    else if(type==="student")setStudents(s=>s.map(x=>x.id===userId?{...x,isAdmin:!x.isAdmin}:x));
    else if(type==="parent")setParents(p=>p.map(x=>x.id===userId?{...x,isAdmin:!x.isAdmin}:x));
    showNotif(lang==="bn"?"আপডেট হয়েছে!":"Updated!");
  };
  const approve=id=>{setParents(p=>p.map(x=>x.id===id?{...x,status:"approved"}:x));showNotif(lang==="bn"?"অনুমোদন হয়েছে!":"Approved!");};
  const reject=id=>{setParents(p=>p.map(x=>x.id===id?{...x,status:"rejected"}:x));showNotif(lang==="bn"?"বাতিল হয়েছে!":"Rejected!");};
  const pending=parents.filter(p=>p.status==="pending"),approved=parents.filter(p=>p.status==="approved"),rejected=parents.filter(p=>p.status==="rejected");
  const current=tab==="pending"?pending:tab==="approved"?approved:rejected;
  const relLabel=r=>r==="father"?t.father:r==="mother"?t.mother:t.guardian;
  const sColor=s=>s==="approved"?"#f0fdf4":s==="rejected"?"#fee2e2":"#fef3c7";
  const sText=s=>s==="approved"?"#166534":s==="rejected"?"#991b1b":"#92400e";
  const adminCount=admins.length+teachers.filter(x=>x.isAdmin).length+students.filter(x=>x.isAdmin).length+parents.filter(x=>x.isAdmin).length;
  const uBtn=(isOn)=>({padding:"5px 12px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600,border:"1px solid",background:isOn?"#fee2e2":"#f0fdf4",color:isOn?"#991b1b":"#166534",borderColor:isOn?"#fca5a5":"#bbf7d0"});
  const uRow={display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f8fafc"};
  return(<div style={S.page}>
    {editParent&&(<div style={S.modalBg}><div style={S.modalBox}><h3 style={S.ct}>{lang==="bn"?"অভিভাবক সম্পাদনা":"Edit Parent"}</h3><div style={S.grid2}><div style={S.fg}><label style={S.lbl}>{t.parentName} (বাংলা)</label><input style={S.inp} value={parentForm.name} onChange={e=>setParentForm({...parentForm,name:e.target.value})}/></div><div style={S.fg}><label style={S.lbl}>{t.parentName} (English)</label><input style={S.inp} value={parentForm.nameEn} onChange={e=>setParentForm({...parentForm,nameEn:e.target.value})}/></div><div style={S.fg}><label style={S.lbl}>{t.defaultPass}</label><input style={S.inp} value={parentForm.password} onChange={e=>setParentForm({...parentForm,password:e.target.value})}/></div><div style={S.fg}><label style={S.lbl}>{t.relation}</label><select style={S.inp} value={parentForm.relation} onChange={e=>setParentForm({...parentForm,relation:e.target.value})}><option value="father">{t.father}</option><option value="mother">{t.mother}</option><option value="guardian">{t.guardian}</option></select></div><div style={S.fg}><label style={S.lbl}>{lang==="bn"?"অবস্থা":"Status"}</label><select style={S.inp} value={parentForm.status} onChange={e=>setParentForm({...parentForm,status:e.target.value})}><option value="approved">{t.approved}</option><option value="pending">{t.pending}</option><option value="rejected">{t.rejected}</option></select></div></div><div style={{display:"flex",gap:8,marginTop:12}}><button onClick={handleSaveParent} style={S.saveBtn}>{t.save}</button><button onClick={()=>setEditParent(null)} style={S.cancelBtn}>{t.cancel}</button></div></div></div>)}
    {confirmParentDel&&<ConfirmDialog lang={lang} name={confirmParentDel.name} onConfirm={()=>{setParents(ps=>ps.filter(x=>x.id!==confirmParentDel.id));setConfirmParentDel(null);showNotif(lang==="bn"?"মুছা হয়েছে!":"Deleted!");}} onCancel={()=>setConfirmParentDel(null)}/>}
    <div style={S.ph}>
      <div><h2 style={S.pt}>{t.accountManagement}</h2></div>
      {tab==="admin"
        ?<button onClick={()=>{setShowAdminForm(!showAdminForm);setFormErr("");}} style={S.addBtn}>+ {t.addAdmin}</button>
        :<button onClick={()=>setShowForm(!showForm)} style={S.addBtn}>+ {lang==="bn"?"অভিভাবক যোগ":"Add Parent"}</button>
      }
    </div>
    {tab!=="admin"&&showForm&&(<div style={S.card}>
      <h3 style={S.ct}>{lang==="bn"?"নতুন অভিভাবক":"New Parent"}</h3>
      <div style={S.grid2}>
        <div style={S.fg}><label style={S.lbl}>{t.studentId}</label><input style={S.inp} value={form.studentId} onChange={e=>setForm({...form,studentId:e.target.value})} placeholder="STD-20260001"/>
          {form.studentId&&(()=>{const st=students.find(s=>s.systemId===form.studentId);return st?<div style={{fontSize:12,color:"#0f172a",marginTop:4}}>✅ {lang==="bn"?st.name:st.nameEn}</div>:<div style={{fontSize:12,color:"#ef4444",marginTop:4}}>❌</div>;})()}
        </div>
        <div style={S.fg}><label style={S.lbl}>{t.relation}</label><select style={S.inp} value={form.relation} onChange={e=>setForm({...form,relation:e.target.value})}><option value="father">{t.father}</option><option value="mother">{t.mother}</option><option value="guardian">{t.guardian}</option></select></div>
        <div style={S.fg}><label style={S.lbl}>{t.parentName} (বাংলা)</label><input style={S.inp} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div style={S.fg}><label style={S.lbl}>{t.parentName} (English)</label><input style={S.inp} value={form.nameEn} onChange={e=>setForm({...form,nameEn:e.target.value})}/></div>
        <div style={S.fg}><label style={S.lbl}>{t.defaultPass}</label><input style={S.inp} value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></div>
      </div>
      {formErr&&<div style={{color:"#ef4444",fontSize:13,marginBottom:8}}>{formErr}</div>}
      <div style={{display:"flex",gap:8}}><button onClick={handleAddParent} style={S.saveBtn}>{t.save}</button><button onClick={()=>setShowForm(false)} style={S.cancelBtn}>{t.cancel}</button></div>
    </div>)}
    {tab==="admin"&&showAdminForm&&(<div style={S.card}>
      <h3 style={S.ct}>{lang==="bn"?"নতুন অ্যাডমিন যোগ":"New Admin"}</h3>
      <div style={S.grid2}>
        <div style={S.fg}><label style={S.lbl}>{t.name} (বাংলা)</label><input style={S.inp} value={adminForm.name} onChange={e=>setAdminForm({...adminForm,name:e.target.value})}/></div>
        <div style={S.fg}><label style={S.lbl}>{t.name} (English)</label><input style={S.inp} value={adminForm.nameEn} onChange={e=>setAdminForm({...adminForm,nameEn:e.target.value})}/></div>
        <div style={S.fg}><label style={S.lbl}>{t.defaultPass}</label><input style={S.inp} value={adminForm.password} onChange={e=>setAdminForm({...adminForm,password:e.target.value})}/></div>
      </div>
      {formErr&&<div style={{color:"#ef4444",fontSize:13,marginBottom:8}}>{formErr}</div>}
      <div style={{display:"flex",gap:8}}><button onClick={handleAddAdmin} style={S.saveBtn}>{t.save}</button><button onClick={()=>setShowAdminForm(false)} style={S.cancelBtn}>{t.cancel}</button></div>
    </div>)}
    <div style={S.grid4}>
      <StatCard icon="⏳" value={pending.length} label={t.pending} color="#0f172a"/>
      <StatCard icon="✅" value={approved.length} label={t.approved} color="#0f172a"/>
      <StatCard icon="❌" value={rejected.length} label={t.rejected} color="#ef4444"/>
      <StatCard icon="🛡️" value={adminCount} label={lang==="bn"?"মোট অ্যাডমিন":"Total Admins"} color="#0f172a"/>
    </div>
    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {[{k:"pending",l:`${t.pending}(${pending.length})`},{k:"approved",l:t.approved},{k:"rejected",l:t.rejected},{k:"admin",l:`${lang==="bn"?"অ্যাডমিন":"Admin"}(${adminCount})`}].map(x=>(<button key={x.k} onClick={()=>setTab(x.k)} style={{...S.reportTab,...(tab===x.k?S.reportTabOn:{})}}>{x.l}</button>))}
    </div>
    {tab!=="admin"&&(<>
      <div style={S.card}>{current.length===0?<div style={S.empty}>{lang==="bn"?"কোনো অ্যাকাউন্ট নেই":"No accounts"}</div>:(
        <div style={S.tableWrap}><table style={S.table}><thead><tr><th style={S.th}>{lang==="bn"?"অভিভাবক":"Parent"}</th><th style={S.th}>{lang==="bn"?"সম্পর্ক":"Relation"}</th><th style={S.th}>{lang==="bn"?"শিক্ষার্থী":"Student"}</th><th style={S.th}>{t.autoId}</th><th style={S.th}>{lang==="bn"?"অবস্থা":"Status"}</th><th style={S.th}>{lang==="bn"?"অ্যাকশন":"Action"}</th></tr></thead>
        <tbody>{current.map((p,i)=>{const st=students.find(s=>s.systemId===p.studentId);return(<tr key={p.id} style={i%2===0?{background:"#fafafa"}:{}}><td style={S.td}><strong>{p.name}</strong></td><td style={S.td}>{relLabel(p.relation)}</td><td style={S.td}><div style={{fontSize:13}}>{lang==="bn"?st?.name:st?.nameEn}</div><div style={{fontSize:11,color:"#94a3b8"}}>{p.studentId}</div></td><td style={S.td}><code style={{background:"#f8fafc",padding:"2px 6px",borderRadius:4,fontSize:11,color:"#0f172a"}}>{p.systemId}</code></td><td style={S.td}><span style={{background:sColor(p.status),color:sText(p.status),padding:"3px 8px",borderRadius:20,fontSize:12,fontWeight:700}}>{p.status==="approved"?t.approved:p.status==="rejected"?t.rejected:t.pending}</span></td>{tab==="pending"&&<td style={S.td}><div style={{display:"flex",gap:6}}><button onClick={()=>approve(p.id)} style={{padding:"4px 10px",background:"#f0fdf4",color:"#166534",border:"1px solid #86efac",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>✅ {t.approve}</button><button onClick={()=>reject(p.id)} style={{padding:"4px 10px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fca5a5",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>❌ {t.reject}</button></div></td>}</tr>);})}</tbody></table></div>
      )}</div>
      <div style={S.card}><h3 style={S.ct}>{lang==="bn"?"শিক্ষক অ্যাকাউন্ট":"Teacher Accounts"}</h3><div style={S.tableWrap}><table style={S.table}><thead><tr><th style={S.th}>{t.name}</th><th style={S.th}>{t.autoId}</th><th style={S.th}>{t.defaultPass}</th></tr></thead><tbody>{teachers.map((tc,i)=>(<tr key={tc.id} style={i%2===0?{background:"#fafafa"}:{}}><td style={S.td}>{lang==="bn"?tc.name:tc.nameEn}</td><td style={S.td}><code style={{background:"#f8fafc",padding:"2px 6px",borderRadius:4,fontSize:11,color:"#0f172a"}}>{tc.systemId}</code></td><td style={S.td}><code>{tc.password}</code></td></tr>))}</tbody></table></div></div>
      <div style={S.card}><h3 style={S.ct}>{lang==="bn"?"শিক্ষার্থী অ্যাকাউন্ট":"Student Accounts"}</h3><div style={S.tableWrap}><table style={S.table}><thead><tr><th style={S.th}>{t.name}</th><th style={S.th}>{t.autoId}</th><th style={S.th}>{t.class}</th><th style={S.th}>{t.defaultPass}</th></tr></thead><tbody>{students.map((s,i)=>(<tr key={s.id} style={i%2===0?{background:"#fafafa"}:{}}><td style={S.td}>{lang==="bn"?s.name:s.nameEn}</td><td style={S.td}><code style={{background:"#f8fafc",padding:"2px 6px",borderRadius:4,fontSize:11,color:"#0f172a"}}>{s.systemId}</code></td><td style={S.td}>{s.class}{s.section}</td><td style={S.td}><code>{s.password}</code></td></tr>))}</tbody></table></div></div>
    </>)}
    {tab==="admin"&&(<>
      <div style={S.card}>
        <h3 style={S.ct}>{t.adminAccounts}</h3>
        <div style={S.tableWrap}><table style={S.table}><thead><tr><th style={S.th}>{t.name}</th><th style={S.th}>{t.autoId}</th><th style={S.th}>{t.defaultPass}</th><th style={S.th}>{lang==="bn"?"ধরন":"Type"}</th><th style={S.th}>{lang==="bn"?"অ্যাকশন":"Action"}</th></tr></thead>
        <tbody>{admins.map((a,i)=>(<tr key={a.id} style={i%2===0?{background:"#fafafa"}:{}}><td style={S.td}><strong>{lang==="bn"?a.name:a.nameEn}</strong></td><td style={S.td}><code style={{background:"#f8fafc",padding:"2px 6px",borderRadius:4,fontSize:11,color:"#0f172a"}}>{a.systemId}</code></td><td style={S.td}><code>{a.password}</code></td><td style={S.td}>{a.isRoot?<span style={{background:"#f5f5f4",color:"#57534e",padding:"3px 8px",borderRadius:20,fontSize:12,fontWeight:700}}>{t.rootAdmin}</span>:<span style={{background:"#dbeafe",color:"#1d4ed8",padding:"3px 8px",borderRadius:20,fontSize:12,fontWeight:700}}>Custom</span>}</td><td style={S.td}>{!a.isRoot&&<button onClick={()=>deleteAdmin(a.id)} style={{padding:"4px 10px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fca5a5",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>🗑️ {t.deleteAdmin}</button>}</td></tr>))}</tbody></table></div>
      </div>
      <div style={S.card}>
        <h3 style={S.ct}>{t.userToAdmin}</h3>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,color:"#0f172a",padding:"8px 0",borderBottom:"2px solid #e2e8f0",marginBottom:8}}>👨‍🏫 {t.teachers}</div>
          {teachers.map(tc=>(<div key={tc.id} style={uRow}><div><div style={{fontSize:13,fontWeight:600}}>{lang==="bn"?tc.name:tc.nameEn}{tc.isAdmin&&<span style={{marginLeft:8,fontSize:11,background:"#f5f5f4",color:"#57534e",padding:"2px 6px",borderRadius:10,fontWeight:700}}>🛡️Admin</span>}</div><div style={{fontSize:11,color:"#94a3b8"}}>{tc.systemId}</div></div><button onClick={()=>toggleUserAdmin("teacher",tc.id)} style={uBtn(tc.isAdmin)}>{tc.isAdmin?`❌ ${t.removeAdmin}`:`✅ ${t.makeAdmin}`}</button></div>))}
        </div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,color:"#0f172a",padding:"8px 0",borderBottom:"2px solid #e2e8f0",marginBottom:8}}>🎓 {t.students}</div>
          {students.map(s=>(<div key={s.id} style={uRow}><div><div style={{fontSize:13,fontWeight:600}}>{lang==="bn"?s.name:s.nameEn}{s.isAdmin&&<span style={{marginLeft:8,fontSize:11,background:"#f5f5f4",color:"#57534e",padding:"2px 6px",borderRadius:10,fontWeight:700}}>🛡️Admin</span>}</div><div style={{fontSize:11,color:"#94a3b8"}}>{s.systemId} | {t.class} {s.class}{s.section}</div></div><button onClick={()=>toggleUserAdmin("student",s.id)} style={uBtn(s.isAdmin)}>{s.isAdmin?`❌ ${t.removeAdmin}`:`✅ ${t.makeAdmin}`}</button></div>))}
        </div>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#0f172a",padding:"8px 0",borderBottom:"2px solid #e2e8f0",marginBottom:8}}>👥 {t.parent}</div>
          {parents.filter(p=>p.status==="approved").map(p=>(<div key={p.id} style={uRow}><div><div style={{fontSize:13,fontWeight:600}}>{lang==="bn"?p.name:p.nameEn}{p.isAdmin&&<span style={{marginLeft:8,fontSize:11,background:"#f5f5f4",color:"#57534e",padding:"2px 6px",borderRadius:10,fontWeight:700}}>🛡️Admin</span>}</div><div style={{fontSize:11,color:"#94a3b8"}}>{p.systemId}</div></div><button onClick={()=>toggleUserAdmin("parent",p.id)} style={uBtn(p.isAdmin)}>{p.isAdmin?`❌ ${t.removeAdmin}`:`✅ ${t.makeAdmin}`}</button></div>))}
        </div>
      </div>
    </>)}
  </div>);}
function ProfilePage({t,lang,currentUser,onPasswordChange}){
  const [form,setForm]=useState({current:"",newPass:"",confirm:""});
  const [error,setError]=useState("");
  const handle=()=>{
    setError("");
    if(form.current!==currentUser.password){setError(t.wrongPassword);return;}
    if(form.newPass!==form.confirm){setError(t.passwordMismatch);return;}
    if(form.newPass.length<4){setError(lang==="bn"?"কমপক্ষে ৪ অক্ষর":"Min 4 chars");return;}
    onPasswordChange(currentUser.id,currentUser.role,form.newPass);
    setForm({current:"",newPass:"",confirm:""});
  };
  return(<div style={S.page}><h2 style={S.pt}>{t.myProfile}</h2><div style={S.card}>
    <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,padding:16,background:"#f8fafc",borderRadius:10}}>
      <div style={{...S.ava,width:56,height:56,fontSize:24}}>{(currentUser.name||"A")[0]}</div>
      <div><div style={{fontSize:18,fontWeight:800,color:"#0f172a"}}>{currentUser.name}</div><div style={{fontSize:13,color:"#0f172a"}}>{currentUser.systemId||"admin"}</div></div>
    </div>
    <h3 style={S.ct}>{t.changePassword}</h3>
    <div style={{maxWidth:360}}>
      <div style={S.fg}><label style={S.lbl}>{t.currentPassword}</label><input style={S.inp} type="password" value={form.current} onChange={e=>setForm({...form,current:e.target.value})}/></div>
      <div style={S.fg}><label style={S.lbl}>{t.newPassword}</label><input style={S.inp} type="password" value={form.newPass} onChange={e=>setForm({...form,newPass:e.target.value})}/></div>
      <div style={S.fg}><label style={S.lbl}>{t.confirmPassword}</label><input style={S.inp} type="password" value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})}/></div>
      {error&&<div style={{color:"#ef4444",fontSize:13,marginBottom:8}}>{error}</div>}
      <button onClick={handle} style={S.saveBtn}>{t.changePassword}</button>
    </div>
  </div></div>);}
function TeachersPage({t,lang,showNotif}){
  // Self-contained Supabase data; guide-student picker reads DB students for uuids.
  const {teachers,loading,error,reload}=useDbTeachers(true);
  const {students:dbStudents}=useDbStudents(true);
  const [showForm,setShowForm]=useState(false);
  const [editId,setEditId]=useState(null);
  const blank={name:"",nameEn:"",password:"123456",classTeacher:null,subjectAssignments:[],guideStudents:[]};
  const [form,setForm]=useState(blank);
  const [newAssign,setNewAssign]=useState({class:"8",section:"A",subject:SUBJECTS[0]});
  const [hasClass,setHasClass]=useState(false);
  const [confirmDel,setConfirmDel]=useState(null);
  const [saving,setSaving]=useState(false);
  const addAssign=()=>{if(form.subjectAssignments.find(a=>a.class===newAssign.class&&a.section===newAssign.section&&a.subject===newAssign.subject))return;setForm({...form,subjectAssignments:[...form.subjectAssignments,{...newAssign}]});};
  const removeAssign=i=>setForm({...form,subjectAssignments:form.subjectAssignments.filter((_,idx)=>idx!==i)});
  const toggleGuide=sid=>{const gs=form.guideStudents.includes(sid)?form.guideStudents.filter(x=>x!==sid):[...form.guideStudents,sid];setForm({...form,guideStudents:gs});};
  const openAdd=()=>{setEditId(null);setForm(blank);setHasClass(false);setShowForm(true);};
  const openEdit=tc=>{setEditId(tc.id);setForm({name:tc.name,nameEn:tc.nameEn||"",password:"",classTeacher:tc.classTeacher||null,subjectAssignments:tc.subjectAssignments||[],guideStudents:tc.guideStudents||[]});setHasClass(!!tc.classTeacher);setShowForm(true);};
  const nextSystemId=()=>{
    const yr=new Date().getFullYear();
    const max=teachers.reduce((m,tc)=>{const n=parseInt(String(tc.systemId||"").split("-")[1]?.slice(4))||0;return Math.max(m,n);},0);
    return genId("TCH",yr,max+1);
  };
  const handleSave=async()=>{
    if(!form.name){showNotif(lang==="bn"?"নাম আবশ্যক":"Name required");return;}
    if(!editId&&form.password&&form.password.length<6){showNotif(lang==="bn"?"পাসওয়ার্ড কমপক্ষে ৬ অক্ষর":"Password must be at least 6 characters");return;}
    setSaving(true);
    try{
      const classTeacher=hasClass?(form.classTeacher||{class:"8",section:"A"}):null;
      if(editId){
        await updateTeacher(editId,{name:form.name,nameEn:form.nameEn,classTeacher,subjectAssignments:form.subjectAssignments,guideStudents:form.guideStudents});
        showNotif(lang==="bn"?"আপডেট হয়েছে!":"Updated!");
      }else{
        const systemId=nextSystemId();
        await createTeacher({systemId,name:form.name,nameEn:form.nameEn,password:form.password,classTeacher,subjectAssignments:form.subjectAssignments,guideStudents:form.guideStudents});
        showNotif(lang==="bn"?`শিক্ষক যোগ! ID: ${systemId}`:`Teacher added! ID: ${systemId}`);
      }
      await reload();
      setShowForm(false);setEditId(null);setHasClass(false);setForm(blank);
    }catch(e){showNotif((lang==="bn"?"ত্রুটি: ":"Error: ")+(e.message||e));}
    finally{setSaving(false);}
  };
  const doDelete=async(id)=>{
    try{await deleteTeacher(id);await reload();showNotif(lang==="bn"?"মুছা হয়েছে!":"Deleted!");}
    catch(e){showNotif((lang==="bn"?"ত্রুটি: ":"Error: ")+(e.message||e));}
  };
  const aBtn=(bg,cl,bc)=>({padding:"4px 10px",background:bg,color:cl,border:`1px solid ${bc}`,borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600});
  return(<div style={S.page}>
    {confirmDel&&<ConfirmDialog lang={lang} name={confirmDel.name} onConfirm={()=>{const id=confirmDel.id;setConfirmDel(null);doDelete(id);}} onCancel={()=>setConfirmDel(null)}/>}
    <div style={S.ph}><div><h2 style={S.pt}>{t.teachers}</h2><p style={S.ps}>{lang==="bn"?`মোট ${teachers.length} জন`:`Total ${teachers.length}`}{loading?" · …":""}</p></div><button onClick={openAdd} style={S.addBtn}>+ {t.addTeacher}</button></div>
    {error&&<div style={{background:"#fee2e2",color:"#991b1b",border:"1px solid #fca5a5",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13}}>{(lang==="bn"?"ডেটা লোড ব্যর্থ: ":"Load failed: ")+error}</div>}
    {showForm&&(<div style={S.card}>
      <h3 style={S.ct}>{editId?(lang==="bn"?"শিক্ষক সম্পাদনা":"Edit Teacher"):(lang==="bn"?"নতুন শিক্ষক":"New Teacher")}</h3>
      <div style={S.grid2}>
        <div style={S.fg}><label style={S.lbl}>{t.name} (বাংলা)</label><input style={S.inp} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div style={S.fg}><label style={S.lbl}>{t.name} (English)</label><input style={S.inp} value={form.nameEn} onChange={e=>setForm({...form,nameEn:e.target.value})}/></div>
        {!editId&&<div style={S.fg}><label style={S.lbl}>{t.defaultPass} (login)</label><input style={S.inp} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder={lang==="bn"?"খালি = login ছাড়া":"blank = no login"}/></div>}
      </div>
      <div style={S.sectionBox}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><input type="checkbox" checked={hasClass} onChange={e=>setHasClass(e.target.checked)} id="hc"/><label htmlFor="hc" style={{fontWeight:700,color:"#0f172a",fontSize:14}}>{t.classTeacher}?</label></div>
        {hasClass&&<div style={{display:"flex",gap:8}}><select style={{...S.inp,width:100}} value={form.classTeacher?.class||"8"} onChange={e=>setForm({...form,classTeacher:{...form.classTeacher,class:e.target.value}})}>{CLASSES.map(c=><option key={c}>{c}</option>)}</select><select style={{...S.inp,width:80}} value={form.classTeacher?.section||"A"} onChange={e=>setForm({...form,classTeacher:{...form.classTeacher,section:e.target.value}})}>{SECTIONS.map(s=><option key={s}>{s}</option>)}</select></div>}
      </div>
      <div style={S.sectionBox}>
        <div style={{fontWeight:700,color:"#0f172a",fontSize:14,marginBottom:10}}>{t.subjectAssignments}</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
          <select style={{...S.inp,width:80}} value={newAssign.class} onChange={e=>setNewAssign({...newAssign,class:e.target.value})}>{CLASSES.map(c=><option key={c}>{c}</option>)}</select>
          <select style={{...S.inp,width:70}} value={newAssign.section} onChange={e=>setNewAssign({...newAssign,section:e.target.value})}>{SECTIONS.map(s=><option key={s}>{s}</option>)}</select>
          <select style={{...S.inp,flex:1,minWidth:140}} value={newAssign.subject} onChange={e=>setNewAssign({...newAssign,subject:e.target.value})}>{SUBJECTS.map(s=><option key={s}>{s}</option>)}</select>
          <button onClick={addAssign} style={{...S.saveBtn,padding:"8px 14px"}}>+</button>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{form.subjectAssignments.map((a,i)=>(<span key={i} style={S.assignTag}>{t.class}{a.class}{a.section}—{a.subject.split("/")[1]||a.subject}<button onClick={()=>removeAssign(i)} style={S.tagX}>×</button></span>))}</div>
      </div>
      <div style={S.sectionBox}>
        <div style={{fontWeight:700,color:"#0f172a",fontSize:14,marginBottom:10}}>{t.guideStudents}</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{dbStudents.map(s=>(<label key={s.id} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer"}}><input type="checkbox" checked={form.guideStudents.includes(s.id)} onChange={()=>toggleGuide(s.id)}/>{lang==="bn"?s.name:s.nameEn}({t.class}{s.class}{s.section})</label>))}</div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:12}}><button onClick={handleSave} disabled={saving} style={{...S.saveBtn,...(saving?{opacity:0.6,cursor:"wait"}:{})}}>{saving?(lang==="bn"?"সংরক্ষণ…":"Saving…"):t.save}</button><button onClick={()=>{setShowForm(false);setEditId(null);}} style={S.cancelBtn}>{t.cancel}</button></div>
    </div>)}
    <div style={S.tableWrap}><table style={S.table}><thead><tr><th style={S.th}>{t.autoId}</th><th style={S.th}>{t.name}</th><th style={S.th}>{t.classTeacher}</th><th style={S.th}>{t.subjectAssignments}</th><th style={S.th}>{t.guideStudents}</th><th style={S.th}>{lang==="bn"?"অ্যাকশন":"Action"}</th></tr></thead>
    <tbody>{teachers.map((tc,i)=>(<tr key={tc.id} style={i%2===0?{background:"#fafafa"}:{}}><td style={S.td}><code style={{background:"#f8fafc",padding:"2px 6px",borderRadius:4,fontSize:11,color:"#0f172a"}}>{tc.systemId}</code></td><td style={S.td}><strong>{lang==="bn"?tc.name:tc.nameEn}</strong></td><td style={S.td}>{tc.classTeacher?`${t.class} ${tc.classTeacher.class}${tc.classTeacher.section}`:"—"}</td><td style={S.td}><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{(tc.subjectAssignments||[]).map((a,j)=>(<span key={j} style={{...S.assignTag,fontSize:11}}>{t.class}{a.class}{a.section}/{a.subject.split("/")[1]||a.subject}</span>))}</div></td><td style={S.td}>{(tc.guideStudents||[]).length}{lang==="bn"?"জন":"sts"}</td><td style={S.td}><div style={{display:"flex",gap:6}}><button onClick={()=>openEdit(tc)} style={aBtn("#f8fafc","#0f172a","#e2e8f0")}>✏️ {t.edit}</button><button onClick={()=>setConfirmDel({id:tc.id,name:lang==="bn"?tc.name:tc.nameEn})} style={aBtn("#fee2e2","#991b1b","#fca5a5")}>🗑️ {t.deleteAdmin}</button></div></td></tr>))}</tbody></table></div>
  </div>);}

function StudentsPage({t,lang,teachers,parents,showNotif}){
  // Self-contained Supabase data (admin session required by RLS). Dashboards/
  // reports still read the localStorage `students` until entries are migrated.
  const {students,loading,error,reload}=useDbStudents(true);
  const [showForm,setShowForm]=useState(false);
  const [editId,setEditId]=useState(null);
  const blank={name:"",nameEn:"",class:"8",section:"",roll:"",password:"123456"};
  const [form,setForm]=useState(blank);
  const [confirmDel,setConfirmDel]=useState(null);
  const [saving,setSaving]=useState(false);
  const openAdd=()=>{setEditId(null);setForm(blank);setShowForm(true);};
  const openEdit=s=>{setEditId(s.id);setForm({name:s.name,nameEn:s.nameEn||"",class:s.class,section:s.section||"",roll:s.roll||""});setShowForm(true);};
  // Next STD id from the MAX existing suffix (not array length) — survives deletes.
  const nextSystemId=()=>{
    const yr=new Date().getFullYear();
    const max=students.reduce((m,s)=>{const n=parseInt(String(s.systemId||"").split("-")[1]?.slice(4))||0;return Math.max(m,n);},0);
    return genId("STD",yr,max+1);
  };
  const handleSave=async()=>{
    if(!form.name){showNotif(lang==="bn"?"নাম আবশ্যক":"Name required");return;}
    if(!editId&&form.password&&form.password.length<6){showNotif(lang==="bn"?"পাসওয়ার্ড কমপক্ষে ৬ অক্ষর":"Password must be at least 6 characters");return;}
    setSaving(true);
    try{
      const roll=parseInt(form.roll)||null;
      if(editId){
        await updateStudent(editId,{name:form.name,nameEn:form.nameEn,cls:form.class,section:form.section,roll});
        showNotif(lang==="bn"?"আপডেট হয়েছে!":"Updated!");
      }else{
        const systemId=nextSystemId();
        await createStudent({systemId,name:form.name,nameEn:form.nameEn,cls:form.class,section:form.section,roll,password:form.password});
        showNotif(lang==="bn"?`শিক্ষার্থী যোগ! ID: ${systemId}`:`Student added! ID: ${systemId}`);
      }
      await reload();
      setShowForm(false);setEditId(null);setForm(blank);
    }catch(e){showNotif((lang==="bn"?"ত্রুটি: ":"Error: ")+(e.message||e));}
    finally{setSaving(false);}
  };
  const doDelete=async(id)=>{
    try{await deleteStudent(id);await reload();showNotif(lang==="bn"?"মুছা হয়েছে!":"Deleted!");}
    catch(e){showNotif((lang==="bn"?"ত্রুটি: ":"Error: ")+(e.message||e));}
  };
  const aBtn=(bg,cl,bc)=>({padding:"4px 10px",background:bg,color:cl,border:`1px solid ${bc}`,borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600});
  return(<div style={S.page}>
    {confirmDel&&<ConfirmDialog lang={lang} name={confirmDel.name} onConfirm={()=>{const id=confirmDel.id;setConfirmDel(null);doDelete(id);}} onCancel={()=>setConfirmDel(null)}/>}
    <div style={S.ph}><div><h2 style={S.pt}>{t.students}</h2><p style={S.ps}>{lang==="bn"?`মোট ${students.length} জন`:`Total ${students.length}`}{loading?" · …":""}</p></div><button onClick={openAdd} style={S.addBtn}>+ {t.addStudent}</button></div>
    {error&&<div style={{background:"#fee2e2",color:"#991b1b",border:"1px solid #fca5a5",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13}}>{(lang==="bn"?"ডেটা লোড ব্যর্থ: ":"Load failed: ")+error}</div>}
    {showForm&&(<div style={S.card}>
      <h3 style={S.ct}>{editId?(lang==="bn"?"শিক্ষার্থী সম্পাদনা":"Edit Student"):(lang==="bn"?"নতুন শিক্ষার্থী":"New Student")}</h3>
      <div style={S.grid2}>
        <div style={S.fg}><label style={S.lbl}>{t.name} (বাংলা)</label><input style={S.inp} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div style={S.fg}><label style={S.lbl}>{t.name} (English)</label><input style={S.inp} value={form.nameEn} onChange={e=>setForm({...form,nameEn:e.target.value})}/></div>
        <div style={S.fg}><label style={S.lbl}>{t.class}</label><select style={S.inp} value={form.class} onChange={e=>setForm({...form,class:e.target.value})}>{CLASSES.map(c=><option key={c}>{c}</option>)}</select></div>
        <div style={S.fg}><label style={S.lbl}>{t.section}</label><input style={S.inp} value={form.section} onChange={e=>setForm({...form,section:e.target.value})} placeholder="A, B..."/></div>
        <div style={S.fg}><label style={S.lbl}>{t.roll}</label><input style={S.inp} type="number" value={form.roll} onChange={e=>setForm({...form,roll:e.target.value})}/></div>
        {!editId&&<div style={S.fg}><label style={S.lbl}>{t.defaultPass} ({lang==="bn"?"login":"login"})</label><input style={S.inp} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder={lang==="bn"?"খালি = login ছাড়া":"blank = no login"}/></div>}
      </div>
      <div style={{display:"flex",gap:8,marginTop:12}}><button onClick={handleSave} disabled={saving} style={{...S.saveBtn,...(saving?{opacity:0.6,cursor:"wait"}:{})}}>{saving?(lang==="bn"?"সংরক্ষণ…":"Saving…"):t.save}</button><button onClick={()=>{setShowForm(false);setEditId(null);}} style={S.cancelBtn}>{t.cancel}</button></div>
    </div>)}
    <div style={S.tableWrap}><table style={S.table}><thead><tr><th style={S.th}>{t.autoId}</th><th style={S.th}>{t.name}</th><th style={S.th}>{t.class}</th><th style={S.th}>{t.section}</th><th style={S.th}>{t.roll}</th><th style={S.th}>{lang==="bn"?"শ্রেণী শিক্ষক":"Class Teacher"}</th><th style={S.th}>{lang==="bn"?"অভিভাবক":"Parents"}</th><th style={S.th}>{lang==="bn"?"অ্যাকশন":"Action"}</th></tr></thead>
    <tbody>{students.map((s,i)=>{const ct=teachers.find(tc=>tc.classTeacher?.class===s.class&&tc.classTeacher?.section===s.section);const sParents=(parents||[]).filter(p=>p.studentId===s.systemId&&p.status==="approved");return(<tr key={s.id} style={i%2===0?{background:"#fafafa"}:{}}><td style={S.td}><code style={{background:"#f8fafc",padding:"2px 6px",borderRadius:4,fontSize:11,color:"#0f172a"}}>{s.systemId}</code></td><td style={S.td}><strong>{lang==="bn"?s.name:s.nameEn}</strong></td><td style={S.td}>{s.class}</td><td style={S.td}>{s.section||"—"}</td><td style={S.td}>{s.roll}</td><td style={S.td}>{ct?(lang==="bn"?ct.name:ct.nameEn):"—"}</td><td style={S.td}>{sParents.length===0?<span style={{color:"#94a3b8",fontSize:12}}>—</span>:<div style={{display:"flex",flexDirection:"column",gap:2}}>{sParents.map(p=>(<div key={p.id} style={{fontSize:12}}><span style={{fontWeight:600}}>{lang==="bn"?p.name:p.nameEn}</span><span style={{color:"#64748b",marginLeft:4,fontSize:11}}>({lang==="bn"?p.relation==="father"?"বাবা":p.relation==="mother"?"মা":"অভিভাবক":p.relation})</span></div>))}</div>}</td><td style={S.td}><div style={{display:"flex",gap:6}}><button onClick={()=>openEdit(s)} style={aBtn("#f8fafc","#0f172a","#e2e8f0")}>✏️ {t.edit}</button><button onClick={()=>setConfirmDel({id:s.id,name:lang==="bn"?s.name:s.nameEn})} style={aBtn("#fee2e2","#991b1b","#fca5a5")}>🗑️ {t.deleteAdmin}</button></div></td></tr>);})}</tbody></table></div>
  </div>);}

function QuestionsPage({t,lang,showNotif}){
  const {questions:allQ,loading,error,reload}=useDbQuestions(true);
  const [qTab,setQTab]=useState("student");
  const [showForm,setShowForm]=useState(false);
  const [editId,setEditId]=useState(null);
  const [viewQ,setViewQ]=useState(null);
  const [confirmDel,setConfirmDel]=useState(null);
  const [saving,setSaving]=useState(false);
  const blankS={textBn:"",textEn:"",role:"classTeacher",points:10,activeMonths:[0,1,2,3,4,5,6,7,8,9,10,11],frequency:"monthly"};
  const blankO={textBn:"",textEn:"",points:10,activeMonths:[0,1,2,3,4,5,6,7,8,9,10,11],frequency:"monthly"};
  const [form,setForm]=useState(blankS);
  const toggleM=m=>{const am=form.activeMonths.includes(m)?form.activeMonths.filter(x=>x!==m):[...form.activeMonths,m];setForm({...form,activeMonths:am});};
  const isStd=qTab==="student";
  const stdQ=allQ.filter(q=>q.category==="student");
  const tchrQ=allQ.filter(q=>q.category==="teacher");
  const parQ=allQ.filter(q=>q.category==="parent");
  const curQs=isStd?stdQ:qTab==="teacher"?tchrQ:parQ;
  const rColor=r=>r==="classTeacher"?"#eff6ff":r==="subjectTeacher"?"#f0fdf4":"#f5f5f4";
  const rText=r=>r==="classTeacher"?"#1d4ed8":r==="subjectTeacher"?"#166534":"#57534e";
  const rLabel=r=>r==="classTeacher"?t.classTeacher:r==="subjectTeacher"?t.subjectTeacher:t.guideTeacher;
  const openAdd=()=>{setEditId(null);setForm(isStd?blankS:blankO);setShowForm(true);};
  const openEdit=q=>{setEditId(q.id);setForm(isStd?{textBn:q.textBn,textEn:q.textEn,role:q.role,points:q.points,activeMonths:[...q.activeMonths],frequency:q.frequency||"monthly"}:{textBn:q.textBn,textEn:q.textEn,points:q.points,activeMonths:[...q.activeMonths],frequency:q.frequency||"monthly"});setShowForm(true);};
  const handleSave=async()=>{
    if(!form.textBn){showNotif(lang==="bn"?"প্রশ্ন লিখুন":"Enter question");return;}
    setSaving(true);
    try{
      const pts=parseInt(form.points)||0;
      const payload={category:qTab,role:isStd?form.role:null,textBn:form.textBn,textEn:form.textEn,points:pts,frequency:form.frequency||"monthly",activeMonths:form.activeMonths};
      if(editId){await updateQuestion(editId,payload);showNotif(lang==="bn"?"আপডেট হয়েছে!":"Updated!");}
      else{await createQuestion(payload);showNotif(lang==="bn"?"প্রশ্ন যোগ হয়েছে!":"Question added!");}
      await reload();
      setShowForm(false);setEditId(null);setForm(isStd?blankS:blankO);
    }catch(e){showNotif((lang==="bn"?"ত্রুটি: ":"Error: ")+(e.message||e));}
    finally{setSaving(false);}
  };
  const doDelete=async(id)=>{
    try{await deleteQuestion(id);await reload();showNotif(lang==="bn"?"মুছা হয়েছে!":"Deleted!");}
    catch(e){showNotif((lang==="bn"?"ত্রুটি: ":"Error: ")+(e.message||e));}
  };
  const aBtn=(bg,cl,bc)=>({padding:"4px 8px",background:bg,color:cl,border:"1px solid "+bc,borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600});
  const freqLabel=(f)=>({"daily":t.daily,"weekly":t.weekly,"monthly":t.monthly,"quarterly":t.quarterly,"annual":t.annual}[f]||t.monthly);
  const qRow=(q,i)=>(<tr key={q.id} style={i%2===0?{background:"#fafafa"}:{}}><td style={S.td}>{i+1}</td><td style={S.td}><div style={{maxWidth:200,fontWeight:500,fontSize:13}}>{lang==="bn"?q.textBn:q.textEn}</div></td><td style={S.td}><strong style={{color:"#0f172a"}}>{q.points}</strong></td><td style={S.td}><span style={{background:"#f1f5f9",color:"#334155",padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600}}>{freqLabel(q.frequency||"monthly")}</span></td><td style={S.td}><div style={{display:"flex",flexWrap:"wrap",gap:2}}>{MONTHS.map((m,mi)=>(<span key={m} style={{padding:"1px 5px",borderRadius:4,fontSize:11,fontWeight:600,background:q.activeMonths.includes(mi)?"#0f172a":"#e2e8f0",color:q.activeMonths.includes(mi)?"#fff":"#94a3b8"}}>{T[lang][m].slice(0,3)}</span>))}</div></td><td style={S.td}><div style={{display:"flex",gap:4}}><button onClick={()=>setViewQ(q)} style={aBtn("#f0fdf4","#166534","#bbf7d0")}>👁️</button><button onClick={()=>openEdit(q)} style={aBtn("#f8fafc","#0f172a","#e2e8f0")}>✏️</button><button onClick={()=>setConfirmDel({id:q.id,name:lang==="bn"?q.textBn:q.textEn})} style={aBtn("#fee2e2","#991b1b","#fca5a5")}>🗑️</button></div></td></tr>);
  const qTable=(list)=>(<div style={S.tableWrap}><table style={S.table}><thead><tr><th style={S.th}>#</th><th style={S.th}>{lang==="bn"?"প্রশ্ন":"Question"}</th><th style={S.th}>{t.pointsPerEntry}</th><th style={S.th}>{t.frequency}</th><th style={S.th}>{t.activeMonths}</th><th style={S.th}>{lang==="bn"?"অ্যাকশন":"Action"}</th></tr></thead><tbody>{list.map(qRow)}</tbody></table></div>);
  return(<div style={S.page}>
    {confirmDel&&<ConfirmDialog lang={lang} name={confirmDel.name} onConfirm={()=>{const id=confirmDel.id;setConfirmDel(null);doDelete(id);}} onCancel={()=>setConfirmDel(null)}/>}
    {viewQ&&(<div style={S.modalBg}><div style={{...S.modalBox,maxWidth:520}}>
      <h3 style={S.ct}>🔍 {lang==="bn"?"প্রশ্ন বিবরণ":"Question Details"}</h3>
      <div style={{background:"#f8fafc",borderRadius:10,padding:"14px 16px",marginBottom:14}}>
        <div style={{fontSize:15,fontWeight:700,color:"#0f172a",marginBottom:4}}>{viewQ.textBn}</div>
        <div style={{fontSize:13,color:"#64748b",marginBottom:12,fontStyle:"italic"}}>{viewQ.textEn}</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {isStd&&<span style={{background:rColor(viewQ.role),color:rText(viewQ.role),padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700}}>{rLabel(viewQ.role)}</span>}
          <span style={{background:"#f8fafc",color:"#0f172a",padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700}}>{t.pointsPerEntry}: {viewQ.points}</span>
        </div>
      </div>
      <div style={S.fg}><label style={{...S.lbl,marginBottom:8}}>{t.activeMonths}:</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{MONTHS.map((m,mi)=>(<span key={m} style={{padding:"3px 9px",borderRadius:6,fontSize:12,fontWeight:600,background:viewQ.activeMonths.includes(mi)?"#0f172a":"#e2e8f0",color:viewQ.activeMonths.includes(mi)?"#fff":"#94a3b8"}}>{T[lang][m]}</span>))}</div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:16}}>
        <button onClick={()=>{setViewQ(null);openEdit(viewQ);}} style={S.saveBtn}>✏️ {t.edit}</button>
        <button onClick={()=>setViewQ(null)} style={S.cancelBtn}>{t.cancel}</button>
      </div>
    </div></div>)}
    <div style={S.ph}><div><h2 style={S.pt}>{t.questions}</h2><p style={S.ps}>{lang==="bn"?"মোট "+curQs.length+"টি":"Total "+curQs.length}{loading?" · …":""}</p></div><button onClick={openAdd} style={S.addBtn}>+ {t.addQuestion}</button></div>
    {error&&<div style={{background:"#fee2e2",color:"#991b1b",border:"1px solid #fca5a5",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13}}>{(lang==="bn"?"ডেটা লোড ব্যর্থ: ":"Load failed: ")+error}</div>}
    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {[{k:"student",l:t.stdQuestions,n:stdQ.length},{k:"teacher",l:t.tchrQuestions,n:tchrQ.length},{k:"parent",l:t.parQuestions,n:parQ.length}].map(x=>(<button key={x.k} onClick={()=>{setQTab(x.k);setShowForm(false);setEditId(null);}} style={{...S.reportTab,...(qTab===x.k?S.reportTabOn:{})}}>{x.l} ({x.n})</button>))}
    </div>
    {showForm&&(<div style={S.card}>
      <h3 style={S.ct}>{editId?(lang==="bn"?"প্রশ্ন সম্পাদনা":"Edit Question"):(lang==="bn"?"নতুন প্রশ্ন":"New Question")}</h3>
      <div style={S.grid2}>
        <div style={S.fg}><label style={S.lbl}>{lang==="bn"?"প্রশ্ন (বাংলা)":"Question (BN)"}</label><input style={S.inp} value={form.textBn} onChange={e=>setForm({...form,textBn:e.target.value})}/></div>
        <div style={S.fg}><label style={S.lbl}>{lang==="bn"?"প্রশ্ন (ইংরেজি)":"Question (EN)"}</label><input style={S.inp} value={form.textEn} onChange={e=>setForm({...form,textEn:e.target.value})}/></div>
        {isStd&&<div style={S.fg}><label style={S.lbl}>{t.role}</label><select style={S.inp} value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="classTeacher">{t.classTeacher}</option><option value="subjectTeacher">{t.subjectTeacher}</option><option value="guideTeacher">{t.guideTeacher}</option></select></div>}
        <div style={S.fg}><label style={S.lbl}>{t.pointsPerEntry}</label><input style={S.inp} type="number" value={form.points} onChange={e=>setForm({...form,points:e.target.value})}/></div>
        <div style={S.fg}><label style={S.lbl}>{t.frequency}</label><select style={S.inp} value={form.frequency||"monthly"} onChange={e=>setForm({...form,frequency:e.target.value})}><option value="daily">{t.daily}</option><option value="weekly">{t.weekly}</option><option value="monthly">{t.monthly}</option><option value="quarterly">{t.quarterly}</option><option value="annual">{t.annual}</option></select></div>
      </div>
      <div style={S.fg}><label style={S.lbl}>{t.activeMonths}</label><div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>{MONTHS.map((m,i)=>(<button key={m} onClick={()=>toggleM(i)} style={{...S.mBtn,...(form.activeMonths.includes(i)?S.mOn:{})}}>{T[lang][m].slice(0,3)}</button>))}</div></div>
      <div style={{display:"flex",gap:8,marginTop:12}}><button onClick={handleSave} disabled={saving} style={{...S.saveBtn,...(saving?{opacity:0.6,cursor:"wait"}:{})}}>{saving?(lang==="bn"?"সংরক্ষণ…":"Saving…"):t.save}</button><button onClick={()=>{setShowForm(false);setEditId(null);}} style={S.cancelBtn}>{t.cancel}</button></div>
    </div>)}
    {isStd&&["classTeacher","subjectTeacher","guideTeacher"].map(role=>(<div key={role} style={S.card}><h3 style={S.ct}><span style={{background:rColor(role),color:rText(role),padding:"3px 10px",borderRadius:20,fontSize:13,fontWeight:700}}>{rLabel(role)}</span></h3>{qTable(curQs.filter(q=>q.role===role))}</div>))}
    {!isStd&&<div style={S.card}>{qTable(curQs)}</div>}
  </div>);}

function PointEntryPage({t,lang,currentUser,students,questions,entries,setEntries,showNotif,isAdmin,teachers}){
  const isMobile=useIsMobile();
  const [activeRole,setActiveRole]=useState("classTeacher");
  const [selectedDate,setSelectedDate]=useState(new Date().toISOString().split("T")[0]);
  const [selectedAssign,setSelectedAssign]=useState(null);
  const [allScores,setAllScores]=useState({});
  const [editEntry,setEditEntry]=useState(null);
  const [editScore,setEditScore]=useState("");
  const [fTc,setFTc]=useState("all"),[fSt,setFSt]=useState("all"),[fYr,setFYr]=useState("all"),[fMo,setFMo]=useState("all"),[fRo,setFRo]=useState("all");
  const cm=new Date(selectedDate).getMonth(),cw=getWeekNumber(selectedDate),cy=new Date(selectedDate).getFullYear();
  const classStudents=currentUser.classTeacher?students.filter(s=>s.class===currentUser.classTeacher.class&&s.section===currentUser.classTeacher.section):[];
  const subjectAssignments=currentUser.subjectAssignments||[];
  const subjectStudents=selectedAssign?students.filter(s=>s.class===selectedAssign.class&&s.section===selectedAssign.section):[];
  const guideIds=currentUser.guideStudents||[];
  const guideStudents=students.filter(s=>guideIds.includes(s.id));
  const weekDoneCheck=sid=>entries.some(e=>e.studentId===sid&&e.teacherId===currentUser.id&&e.role==="guideTeacher"&&getWeekNumber(e.date)===cw&&new Date(e.date).getFullYear()===cy);
  const isQFreqDone=(sid,qid)=>{const q=questions.find(x=>x.id===qid);const freq=q?.frequency||"monthly";const d=new Date(selectedDate),year=d.getFullYear(),month=d.getMonth();return entries.some(e=>{if(e.studentId!==sid||e.questionId!==qid)return false;const ed=new Date(e.date),eYear=e.year||2026;switch(freq){case"daily":return e.date===selectedDate;case"weekly":return getWeekNumber(e.date)===cw&&eYear===year;case"quarterly":return Math.floor(ed.getMonth()/3)===Math.floor(month/3)&&eYear===year;case"annual":return eYear===year;default:return e.month===month&&eYear===year;}});};
  const roleQs=questions.filter(q=>q.role===activeRole&&q.activeMonths.includes(cm));
  const curStudents=activeRole==="classTeacher"?classStudents:activeRole==="subjectTeacher"?subjectStudents:guideStudents;
  const setScore=(sid,qid,val)=>{const max=questions.find(q=>q.id===qid)?.points||0;setAllScores(p=>({...p,[sid]:{...(p[sid]||{}),[qid]:Math.min(parseInt(val)||0,max)}}));};
  const getScore=(sid,qid)=>allScores[sid]?.[qid]??"";
  const getTotal=sid=>roleQs.reduce((s,q)=>s+(parseInt(allScores[sid]?.[q.id])||0),0);
  const handleSubmit=()=>{
    const ne=[];curStudents.forEach(s=>{if(activeRole==="guideTeacher"&&weekDoneCheck(s.id))return;roleQs.forEach(q=>{ne.push({id:Date.now()+Math.random(),studentId:s.id,teacherId:currentUser.id,date:selectedDate,questionId:q.id,questionText:q.textBn,questionTextEn:q.textEn,maxPoints:q.points,score:parseInt(allScores[s.id]?.[q.id])||0,month:cm,year:new Date(selectedDate).getFullYear(),role:activeRole,subject:selectedAssign?.subject||"",enteredBy:"teacher",editLog:[]});});});
    setEntries(e=>[...e,...ne]);setAllScores({});showNotif(t.entrySuccess);
  };
  const handleEditSave=()=>{
    const max=questions.find(q=>q.id===editEntry.questionId)?.points||0;
    const ns=Math.min(parseInt(editScore)||0,max);
    setEntries(e=>e.map(x=>x.id===editEntry.id?{...x,score:ns,editLog:[...(x.editLog||[]),{editedBy:"admin",editedAt:new Date().toISOString().slice(0,10),oldScore:editEntry.score,newScore:ns}]}:x));
    setEditEntry(null);showNotif(lang==="bn"?"সম্পাদনা সফল!":"Edited!");
  };
  const entryYears=[...new Set(entries.map(e=>e.year||2026))].sort((a,b)=>b-a);
  const filtered=entries.filter(e=>isAdmin||e.teacherId===currentUser.id).filter(e=>fTc==="all"||e.teacherId===parseInt(fTc)).filter(e=>fSt==="all"||e.studentId===parseInt(fSt)).filter(e=>fYr==="all"||(e.year||2026)===parseInt(fYr)).filter(e=>fMo==="all"||e.month===parseInt(fMo)).filter(e=>fRo==="all"||e.role===fRo).slice().reverse();
  const tabs=[{key:"classTeacher",label:t.classTeacher,show:isAdmin||!!currentUser.classTeacher},{key:"subjectTeacher",label:t.subjectTeacher,show:isAdmin||subjectAssignments.length>0},{key:"guideTeacher",label:t.guideTeacher,show:isAdmin||guideIds.length>0}].filter(x=>x.show);
  return(<div style={S.page}>
    <h2 style={S.pt}>{t.pointEntry}</h2>
    {editEntry&&isAdmin&&(()=>{const s=students.find(x=>x.id===editEntry.studentId),q=questions.find(x=>x.id===editEntry.questionId),tc=teachers?.find(x=>x.id===editEntry.teacherId);return(
      <div style={S.modalBg}><div style={S.modalBox}>
        <h3 style={{...S.ct,marginBottom:16}}>✏️ {lang==="bn"?"পয়েন্ট সম্পাদনা":"Edit Points"}</h3>
        <div style={S.editInfoBox}>{[[lang==="bn"?"শিক্ষার্থী":"Student",lang==="bn"?s?.name:s?.nameEn],[lang==="bn"?"শিক্ষক":"Teacher",`${lang==="bn"?tc?.name:tc?.nameEn}(${editEntry.date})`],[lang==="bn"?"বর্তমান":"Current",`${editEntry.score}/${q?.points||editEntry.maxPoints}`]].map(([l,v],i)=>(<div key={i} style={S.editInfoRow}><span style={S.editInfoLabel}>{l}:</span><span style={S.editInfoVal}>{v}</span></div>))}</div>
        {(editEntry.editLog||[]).length>0&&<div style={{background:"#fef3c7",borderRadius:8,padding:"10px 12px",marginBottom:14}}><div style={{fontSize:12,fontWeight:700,color:"#92400e",marginBottom:6}}>{lang==="bn"?"ইতিহাস":"History"}</div>{editEntry.editLog.map((log,i)=>(<div key={i} style={{fontSize:12,color:"#78350f",padding:"3px 0"}}>{log.editedAt}: {log.oldScore}→{log.newScore}</div>))}</div>}
        <div style={S.fg}><label style={S.lbl}>{lang==="bn"?"নতুন পয়েন্ট":"New Score"} (max:{q?.points||editEntry.maxPoints})</label><input style={{...S.inp,maxWidth:120,fontSize:18,fontWeight:700,color:"#0f172a"}} type="number" min="0" max={q?.points||editEntry.maxPoints} value={editScore} onChange={e=>setEditScore(Math.min(parseInt(e.target.value)||0,q?.points||editEntry.maxPoints||0))}/></div>
        <div style={{display:"flex",gap:8}}><button onClick={handleEditSave} style={S.saveBtn}>{t.save}</button><button onClick={()=>setEditEntry(null)} style={S.cancelBtn}>{t.cancel}</button></div>
      </div></div>
    );})()}
    <div style={S.fg}><label style={S.lbl}>{t.selectDate}</label><input style={{...S.inp,maxWidth:200}} type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/></div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",margin:"16px 0"}}>{tabs.map(tab=>(<button key={tab.key} onClick={()=>{setActiveRole(tab.key);setAllScores({});setSelectedAssign(null);}} style={{...S.reportTab,...(activeRole===tab.key?S.reportTabOn:{})}}>{tab.label}</button>))}</div>
    {activeRole==="subjectTeacher"&&<div style={{...S.card,marginBottom:12}}><label style={S.lbl}>{lang==="bn"?"শ্রেণী ও বিষয় নির্বাচন":"Select Class & Subject"}</label><div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>{(isAdmin?[{class:"8",section:"A",subject:"গণিত/Math"}]:subjectAssignments).map((a,i)=>(<button key={i} onClick={()=>{setSelectedAssign(a);setAllScores({});}} style={{padding:"8px 14px",border:"2px solid",borderColor:selectedAssign===a?"#0f172a":"#e2e8f0",borderRadius:8,background:selectedAssign===a?"#f8fafc":"#fff",color:selectedAssign===a?"#0f172a":"#64748b",cursor:"pointer",fontSize:13,fontWeight:600}}>{t.class}{a.class}{a.section}—{a.subject}</button>))}</div></div>}
    {activeRole==="guideTeacher"&&<div style={{background:"#fef3c7",border:"1px solid #fbbf24",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13,color:"#92400e"}}>⚠️{lang==="bn"?"গাইড শিক্ষক সপ্তাহে ১ বার।":"Guide teacher: once per week."}</div>}
    {activeRole==="classTeacher"&&!isAdmin&&!currentUser.classTeacher&&<div style={S.empty}>{t.noClassRole}</div>}
    {activeRole==="subjectTeacher"&&!selectedAssign&&<div style={S.empty}>{t.selectClassSubject}</div>}
    {curStudents.length>0&&roleQs.length>0&&(activeRole!=="subjectTeacher"||selectedAssign)&&(isMobile?(
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {curStudents.map((s)=>{const wd=activeRole==="guideTeacher"&&weekDoneCheck(s.id);const maxPts=roleQs.reduce((x,q)=>x+q.points,0);return(<div key={s.id} style={{...S.card,marginBottom:0,opacity:wd?0.65:1}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingBottom:8,borderBottom:"2px solid #f8fafc"}}>
            <div><div style={{fontWeight:700,fontSize:15,color:"#0f172a"}}>{lang==="bn"?s.name:s.nameEn}</div><div style={{fontSize:11,color:"#94a3b8"}}>{s.systemId} · {t.class}{s.class}{s.section} · Roll {s.roll}</div></div>
            <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}><div style={{fontSize:24,fontWeight:900,color:"#0f172a",lineHeight:1}}>{getTotal(s.id)}</div><div style={{fontSize:11,color:"#94a3b8"}}>/{maxPts} pts</div></div>
          </div>
          {activeRole==="guideTeacher"&&wd&&<div style={{background:"#fee2e2",color:"#991b1b",borderRadius:8,padding:"8px 12px",fontSize:13,fontWeight:600,marginBottom:8}}>⚠️ {lang==="bn"?"এই সপ্তাহে পয়েন্ট দেওয়া হয়েছে":"Already submitted this week"}</div>}
          {roleQs.map(q=>{const qd=isQFreqDone(s.id,q.id);return(<div key={q.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}>
            <div style={{flex:1,marginRight:12}}><div style={{fontSize:13,fontWeight:500,color:"#334155"}}>{lang==="bn"?q.textBn:q.textEn}</div><div style={{fontSize:11,color:"#94a3b8"}}>{{"daily":t.daily,"weekly":t.weekly,"monthly":t.monthly,"quarterly":t.quarterly,"annual":t.annual}[q.frequency||"monthly"]} · max {q.points}</div></div>
            {qd?<div style={{width:64,height:44,display:"flex",alignItems:"center",justifyContent:"center",background:"#f0fdf4",borderRadius:8,fontSize:12,color:"#166534",fontWeight:700}}>✓</div>:<input type="number" min="0" max={q.points} disabled={wd} style={{...S.scoreInp,width:64,height:44,fontSize:18,fontWeight:700}} value={getScore(s.id,q.id)} onChange={e=>setScore(s.id,q.id,e.target.value)} placeholder="0"/>}
          </div>);})}
        </div>);})}
        <button onClick={handleSubmit} style={{...S.submitBtn,width:"100%",padding:14,fontSize:16,marginTop:4,borderRadius:10}}>{t.submitPoints}</button>
      </div>
    ):(<div style={S.card}>
      <div style={{overflowX:"auto"}}><table style={S.table}><thead><tr>
        <th style={{...S.th,minWidth:120}}>{lang==="bn"?"শিক্ষার্থী":"Student"}</th>
        {roleQs.map(q=>(<th key={q.id} style={{...S.th,minWidth:80,textAlign:"center"}}><div style={{fontSize:11,fontWeight:600,color:"#475569"}}>{lang==="bn"?q.textBn:q.textEn}</div><div style={{fontSize:10,color:"#0f172a"}}>/{q.points}</div><div style={{fontSize:9,color:"#64748b",marginTop:1}}>{{"daily":t.daily,"weekly":t.weekly,"monthly":t.monthly,"quarterly":t.quarterly,"annual":t.annual}[q.frequency||"monthly"]}</div></th>))}
        <th style={{...S.th,minWidth:70,textAlign:"center"}}>{lang==="bn"?"মোট":"Total"}</th>
        {activeRole==="guideTeacher"&&<th style={{...S.th,minWidth:70}}>{lang==="bn"?"অবস্থা":"Status"}</th>}
      </tr></thead><tbody>
        {curStudents.map((s,i)=>{const wd=activeRole==="guideTeacher"&&weekDoneCheck(s.id);return(<tr key={s.id} style={{...(i%2===0?{background:"#fafafa"}:{}),opacity:wd?0.5:1}}>
          <td style={S.td}><div style={{fontWeight:600,fontSize:13}}>{lang==="bn"?s.name:s.nameEn}</div><div style={{fontSize:10,color:"#94a3b8"}}>{s.systemId}</div></td>
          {roleQs.map(q=>{const qd=isQFreqDone(s.id,q.id);return(<td key={q.id} style={{...S.td,textAlign:"center"}}>{qd?<span style={{fontSize:10,color:"#94a3b8",fontWeight:600}}>✓</span>:<input type="number" min="0" max={q.points} disabled={wd} style={{...S.scoreInp,width:52}} value={getScore(s.id,q.id)} onChange={e=>setScore(s.id,q.id,e.target.value)} placeholder="0"/>}</td>);})}
          <td style={{...S.td,textAlign:"center"}}><strong style={{color:"#0f172a",fontSize:15}}>{getTotal(s.id)}</strong><div style={{fontSize:10,color:"#94a3b8"}}>/{roleQs.reduce((s,q)=>s+q.points,0)}</div></td>
          {activeRole==="guideTeacher"&&<td style={S.td}>{wd?<span style={{fontSize:11,color:"#ef4444",fontWeight:600}}>⚠️{lang==="bn"?"দেওয়া":"Done"}</span>:<span style={{fontSize:11,color:"#0f172a",fontWeight:600}}>✅{lang==="bn"?"বাকি":"Pending"}</span>}</td>}
        </tr>);})}
      </tbody></table></div>
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}><button onClick={handleSubmit} style={S.submitBtn}>{t.submitPoints}</button></div>
    </div>))}
    <div style={S.card}>
      <h3 style={S.ct}>{lang==="bn"?"এন্ট্রি তালিকা":"Entry List"}</h3>
      {isAdmin&&(<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:16,background:"#f8fafc",borderRadius:10,padding:"14px 16px"}}>
        {[{l:lang==="bn"?"বছর":"Year",v:fYr,set:setFYr,opts:[{v:"all",l:lang==="bn"?"সব":"All"},...entryYears.map(y=>({v:y,l:y}))]},{l:lang==="bn"?"শিক্ষক":"Teacher",v:fTc,set:setFTc,opts:[{v:"all",l:lang==="bn"?"সবাই":"All"},...teachers.map(tc=>({v:tc.id,l:lang==="bn"?tc.name:tc.nameEn}))]},{l:lang==="bn"?"শিক্ষার্থী":"Student",v:fSt,set:setFSt,opts:[{v:"all",l:lang==="bn"?"সবাই":"All"},...students.map(s=>({v:s.id,l:`${lang==="bn"?s.name:s.nameEn}`}))]},{l:lang==="bn"?"মাস":"Month",v:fMo,set:setFMo,opts:[{v:"all",l:lang==="bn"?"সব":"All"},...MONTHS.map((m,i)=>({v:i,l:T[lang][m]}))]},{l:lang==="bn"?"ভূমিকা":"Role",v:fRo,set:setFRo,opts:[{v:"all",l:lang==="bn"?"সব":"All"},{v:"classTeacher",l:t.classTeacher},{v:"subjectTeacher",l:t.subjectTeacher},{v:"guideTeacher",l:t.guideTeacher}]}].map(({l,v,set,opts})=>(<div key={l} style={S.fg}><label style={{...S.lbl,fontSize:12}}>{l}</label><select style={{...S.inp,fontSize:13}} value={v} onChange={e=>set(e.target.value)}>{opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></div>))}
        <div style={{display:"flex",alignItems:"flex-end"}}><button onClick={()=>{setFTc("all");setFSt("all");setFYr("all");setFMo("all");setFRo("all");}} style={{...S.cancelBtn,width:"100%",fontSize:13}}>🔄{lang==="bn"?"রিসেট":"Reset"}</button></div>
      </div>)}
      <div style={{fontSize:12,color:"#64748b",marginBottom:8}}>{lang==="bn"?`${filtered.length}টি এন্ট্রি`:`${filtered.length} entries`}</div>
      <div style={S.tableWrap}><table style={S.table}><thead><tr><th style={S.th}>{lang==="bn"?"তারিখ":"Date"}</th><th style={S.th}>{lang==="bn"?"শিক্ষক":"Teacher"}</th><th style={S.th}>{lang==="bn"?"শিক্ষার্থী":"Student"}</th><th style={S.th}>{lang==="bn"?"ভূমিকা":"Role"}</th><th style={S.th}>{lang==="bn"?"প্রশ্ন":"Q"}</th><th style={S.th}>{t.points}</th>{isAdmin&&<th style={S.th}>✏️</th>}</tr></thead>
      <tbody>{filtered.map((e,i)=>{const s=students.find(x=>x.id===e.studentId),q=questions.find(x=>x.id===e.questionId),tc=teachers?.find(x=>x.id===e.teacherId),edited=(e.editLog||[]).length>0;const rC=e.role==="classTeacher"?"#eff6ff":e.role==="subjectTeacher"?"#f0fdf4":"#f5f5f4";const rT=e.role==="classTeacher"?"#1d4ed8":e.role==="subjectTeacher"?"#166534":"#57534e";const rL=e.role==="classTeacher"?t.classTeacher:e.role==="subjectTeacher"?t.subjectTeacher:t.guideTeacher;
        return(<tr key={i} style={i%2===0?{background:"#fafafa"}:{}}><td style={S.td}>{e.date}</td><td style={S.td}><div style={{fontSize:13}}>{lang==="bn"?tc?.name:tc?.nameEn}</div>{edited&&<span style={{fontSize:10,background:"#f5f5f4",color:"#57534e",padding:"1px 5px",borderRadius:4,fontWeight:600}}>✏️{lang==="bn"?"সম্পাদিত":"Edited"}</span>}</td><td style={S.td}>{lang==="bn"?s?.name:s?.nameEn}</td><td style={S.td}><span style={{fontSize:11,background:rC,color:rT,padding:"2px 7px",borderRadius:10,fontWeight:600}}>{rL}</span></td><td style={S.td}><div style={{maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:13}}>{lang==="bn"?(q?.textBn||e.questionText):(q?.textEn||e.questionTextEn)}</div></td><td style={S.td}>{edited?<span><span style={{textDecoration:"line-through",color:"#94a3b8",fontSize:12,marginRight:4}}>{e.editLog[0].oldScore}</span><strong style={{color:"#0f172a"}}>{e.score}</strong></span>:<strong style={{color:"#0f172a"}}>{e.score}</strong>}</td>{isAdmin&&<td style={S.td}><button onClick={()=>{setEditEntry(e);setEditScore(e.score);}} style={{padding:"4px 10px",background:"#f8fafc",color:"#0f172a",border:"1px solid #e2e8f0",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>✏️</button></td>}</tr>);})}</tbody></table></div>
    </div>
  </div>);}
function ReportsPage({t,lang,students,entries,termConfig,getStudentMonthKPI,getStudentTermKPI,getStudentYearKPI,currentUser,isAdmin,selectedYear,setSelectedYear,availableYears}){
  const [rType,setRType]=useState("monthly");
  const [selMonth,setSelMonth]=useState(new Date().getMonth());
  const isStudent=currentUser.role==="student",isParent=currentUser.role==="parent";
  let vis=students;
  if(!isAdmin){if(currentUser.classTeacher)vis=students.filter(s=>s.class===currentUser.classTeacher.class&&s.section===currentUser.classTeacher.section);else if(isStudent)vis=students.filter(s=>s.id===currentUser.id);else if(isParent)vis=students.filter(s=>s.systemId===currentUser.studentId);else if((currentUser.guideStudents||[]).length>0)vis=students.filter(s=>currentUser.guideStudents.includes(s.id));}
  const ranked=[...vis].map(s=>({...s,kpi:rType==="monthly"?getStudentMonthKPI(s.id,selMonth,selectedYear):rType==="term1"?getStudentTermKPI(s.id,termConfig.term1,selectedYear):rType==="term2"?getStudentTermKPI(s.id,termConfig.term2,selectedYear):rType==="term3"?getStudentTermKPI(s.id,termConfig.term3,selectedYear):rType==="term4"?getStudentTermKPI(s.id,termConfig.term4,selectedYear):getStudentYearKPI(s.id,selectedYear)})).sort((a,b)=>b.kpi-a.kpi);
  const mc=i=>i===0?"#0f172a":i===1?"#52525b":i===2?"#a1a1aa":"transparent";
  return(<div style={S.page}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}><h2 style={{...S.pt,margin:0}}>{t.reports}</h2><YearSelector t={t} lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears}/></div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>{[{k:"monthly",l:lang==="bn"?"মাসিক":"Monthly"},{k:"term1",l:t.term1},{k:"term2",l:t.term2},{k:"term3",l:t.term3},{k:"term4",l:t.term4},{k:"yearly",l:lang==="bn"?"বার্ষিক":"Yearly"}].map(x=>(<button key={x.k} onClick={()=>setRType(x.k)} style={{...S.reportTab,...(rType===x.k?S.reportTabOn:{})}}>{x.l}</button>))}</div>
    {rType==="monthly"&&<div style={S.fg}><label style={S.lbl}>{t.month}</label><select style={{...S.inp,maxWidth:180}} value={selMonth} onChange={e=>setSelMonth(parseInt(e.target.value))}>{MONTHS.map((m,i)=><option key={m} value={i}>{T[lang][m]}</option>)}</select></div>}
    {!isStudent&&!isParent&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,margin:"16px 0"}}>{ranked.slice(0,3).map((s,i)=>(<div key={s.id} style={{...S.card,textAlign:"center",border:"1px solid #e2e8f0"}}><div style={{fontSize:28}}>{i===0?"🥇":i===1?"🥈":"🥉"}</div><div style={{fontWeight:700,fontSize:14,color:"#0f172a"}}>{lang==="bn"?s.name:s.nameEn}</div><div style={{fontSize:12,color:"#94a3b8"}}>{t.class} {s.class}{s.section}</div><div style={{fontSize:26,fontWeight:900,color:mc(i)||"#0f172a"}}>{s.kpi}</div><div style={{fontSize:11,color:"#94a3b8"}}>{lang==="bn"?"পয়েন্ট":"pts"}</div></div>))}</div>}
    <div style={S.card}><h3 style={S.ct}>{lang==="bn"?"র‍্যাংকিং":"Rankings"}</h3>
      <div style={S.tableWrap}><table style={S.table}><thead><tr><th style={S.th}>{t.rank}</th><th style={S.th}>{t.name}</th><th style={S.th}>{t.class}</th><th style={S.th}>{t.roll}</th><th style={S.th}>{t.totalPoints}</th></tr></thead>
      <tbody>{ranked.map((s,i)=>{const isMe=isStudent&&s.id===currentUser.id;return(<tr key={s.id} style={{...(i%2===0?{background:"#fafafa"}:{}),fontWeight:i<3?"700":"400",...(isMe?{background:"#f8fafc"}:{})}}><td style={S.td}><span style={{display:"inline-block",width:28,height:28,lineHeight:"28px",textAlign:"center",borderRadius:6,background:i===0?"#fef3c7":i===1?"#f1f5f9":i===2?"#fff7ed":"transparent",color:mc(i)||"#64748b",fontWeight:700}}>{i<3?["🥇","🥈","🥉"][i]:i+1}</span></td><td style={S.td}>{lang==="bn"?s.name:s.nameEn}{isMe&&<span style={{fontSize:11,color:"#0f172a",marginLeft:6}}>(আমি)</span>}</td><td style={S.td}>{s.class}{s.section}</td><td style={S.td}>{s.roll}</td><td style={S.td}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{height:8,borderRadius:4,background:"linear-gradient(90deg,#0f172a,#64748b)",width:`${Math.min(100,(s.kpi/(ranked[0]?.kpi||1))*100)}%`,minWidth:4}}/><span style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{s.kpi}</span></div></td></tr>);})}</tbody></table></div>
    </div>
  </div>);}
function SettingsPage({t,lang,termConfig,setTermConfig,showNotif}){
  const [cfg,setCfg]=useState({...termConfig});
  const toggle=(term,m)=>{const cur=cfg[term];setCfg({...cfg,[term]:cur.includes(m)?cur.filter(x=>x!==m):[...cur,m].sort((a,b)=>a-b)});};
  return(<div style={S.page}><h2 style={S.pt}>{t.settings}</h2>
    <div style={S.card}><h3 style={S.ct}>{t.termConfig}</h3>
      {["term1","term2","term3","term4"].map((term,ti)=>(<div key={term} style={{marginBottom:20}}><div style={{fontWeight:700,color:"#0f172a",fontSize:14,marginBottom:8}}>{ti===0?t.term1:ti===1?t.term2:ti===2?t.term3:t.term4}</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{MONTHS.map((m,mi)=>(<button key={m} onClick={()=>toggle(term,mi)} style={{...S.mBtn,...(cfg[term].includes(mi)?S.mOn:{})}}>{T[lang][m].slice(0,3)}</button>))}</div></div>))}
      <button onClick={()=>{setTermConfig(cfg);showNotif(lang==="bn"?"সেটিংস সংরক্ষণ!":"Settings saved!");}} style={S.saveBtn}>{t.save}</button>
    </div>
    <div style={S.card}><h3 style={S.ct}>{lang==="bn"?"বর্তমান কনফিগারেশন":"Current Configuration"}</h3>
      {["term1","term2","term3","term4"].map((term,ti)=>(<div key={term} style={{padding:"8px 0",borderBottom:"1px solid #f1f5f9",fontSize:14,color:"#374151"}}><strong>{ti===0?t.term1:ti===1?t.term2:ti===2?t.term3:t.term4}:</strong><span style={{marginLeft:8}}>{termConfig[term].map(m=>T[lang][MONTHS[m]]).join(", ")||"—"}</span></div>))}
    </div>
  </div>);}
function TeacherKPIPage({t,lang,teachers,teacherQuestions,teacherEntries,setTeacherEntries,showNotif,selectedYear,setSelectedYear,availableYears}){
  const isMobile=useIsMobile();
  const [selectedDate,setSelectedDate]=useState(new Date().toISOString().split("T")[0]);
  const [allScores,setAllScores]=useState({});
  const cm=new Date(selectedDate).getMonth(),cy=new Date(selectedDate).getFullYear();
  const activeQs=teacherQuestions.filter(q=>q.activeMonths.includes(cm));
  const setScore=(tid,qid,val)=>{const max=teacherQuestions.find(q=>q.id===qid)?.points||0;setAllScores(p=>({...p,[tid]:{...(p[tid]||{}),[qid]:Math.min(parseInt(val)||0,max)}}));};
  const getScore=(tid,qid)=>allScores[tid]?.[qid]??"";
  const getTotal=tid=>activeQs.reduce((s,q)=>s+(parseInt(allScores[tid]?.[q.id])||0),0);
  const handleSubmit=()=>{const ne=[];teachers.forEach(tc=>{activeQs.forEach(q=>{ne.push({id:Date.now()+Math.random(),targetId:tc.id,questionId:q.id,questionText:q.textBn,questionTextEn:q.textEn,maxPoints:q.points,score:parseInt(allScores[tc.id]?.[q.id])||0,month:cm,year:cy,date:selectedDate,editLog:[]});});});setTeacherEntries(e=>[...e,...ne]);setAllScores({});showNotif(lang==="bn"?"পয়েন্ট জমা হয়েছে!":"Points submitted!");};
  return(<div style={S.page}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
      <h2 style={{...S.pt,margin:0}}>{t.tchrKpiEntry}</h2>
      <YearSelector t={t} lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears}/>
    </div>
    <div style={S.fg}><label style={S.lbl}>{t.selectDate}</label><input style={{...S.inp,maxWidth:200}} type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/></div>
    {activeQs.length===0?<div style={S.empty}>{t.noQForMonth}</div>:(isMobile?(<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {teachers.map(tc=>(<div key={tc.id} style={{...S.card,marginBottom:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingBottom:8,borderBottom:"2px solid #f8fafc"}}>
          <div><div style={{fontWeight:700,fontSize:15,color:"#0f172a"}}>{lang==="bn"?tc.name:tc.nameEn}</div><div style={{fontSize:11,color:"#94a3b8"}}>{tc.systemId}</div></div>
          <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}><div style={{fontSize:24,fontWeight:900,color:"#0f172a",lineHeight:1}}>{getTotal(tc.id)}</div><div style={{fontSize:11,color:"#94a3b8"}}>/{activeQs.reduce((s,q)=>s+q.points,0)} pts</div></div>
        </div>
        {activeQs.map(q=>(<div key={q.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}>
          <div style={{flex:1,marginRight:12}}><div style={{fontSize:13,fontWeight:500,color:"#334155"}}>{lang==="bn"?q.textBn:q.textEn}</div><div style={{fontSize:11,color:"#94a3b8"}}>max {q.points}</div></div>
          <input type="number" min="0" max={q.points} style={{...S.scoreInp,width:64,height:44,fontSize:18,fontWeight:700}} value={getScore(tc.id,q.id)} onChange={e=>setScore(tc.id,q.id,e.target.value)} placeholder="0"/>
        </div>))}
      </div>))}
      <button onClick={handleSubmit} style={{...S.submitBtn,width:"100%",padding:14,fontSize:16,marginTop:4,borderRadius:10}}>{t.submitPoints}</button>
    </div>):(<div style={S.card}><div style={{overflowX:"auto"}}><table style={S.table}><thead><tr><th style={{...S.th,minWidth:140}}>{t.teachers}</th>{activeQs.map(q=>(<th key={q.id} style={{...S.th,minWidth:80,textAlign:"center"}}><div style={{fontSize:11,fontWeight:600}}>{lang==="bn"?q.textBn:q.textEn}</div><div style={{fontSize:10,color:"#0f172a"}}>/{q.points}</div></th>))}<th style={{...S.th,minWidth:70,textAlign:"center"}}>{lang==="bn"?"মোট":"Total"}</th></tr></thead><tbody>{teachers.map((tc,i)=>(<tr key={tc.id} style={i%2===0?{background:"#fafafa"}:{}}><td style={S.td}><div style={{fontWeight:600,fontSize:13}}>{lang==="bn"?tc.name:tc.nameEn}</div><div style={{fontSize:10,color:"#94a3b8"}}>{tc.systemId}</div></td>{activeQs.map(q=>(<td key={q.id} style={{...S.td,textAlign:"center"}}><input type="number" min="0" max={q.points} style={{...S.scoreInp,width:52}} value={getScore(tc.id,q.id)} onChange={e=>setScore(tc.id,q.id,e.target.value)} placeholder="0"/></td>))}<td style={{...S.td,textAlign:"center"}}><strong style={{color:"#0f172a",fontSize:15}}>{getTotal(tc.id)}</strong><div style={{fontSize:10,color:"#94a3b8"}}>/{activeQs.reduce((s,q)=>s+q.points,0)}</div></td></tr>))}</tbody></table></div><div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}><button onClick={handleSubmit} style={S.submitBtn}>{t.submitPoints}</button></div></div>))}
    <div style={S.card}><h3 style={S.ct}>{t.entryHistory}</h3><div style={S.tableWrap}><table style={S.table}><thead><tr><th style={S.th}>{lang==="bn"?"তারিখ":"Date"}</th><th style={S.th}>{t.teachers}</th><th style={S.th}>{lang==="bn"?"প্রশ্ন":"Question"}</th><th style={S.th}>{t.points}</th></tr></thead><tbody>{[...teacherEntries].reverse().slice(0,50).map((e,i)=>{const tc=teachers.find(x=>x.id===e.targetId);return(<tr key={i} style={i%2===0?{background:"#fafafa"}:{}}><td style={S.td}>{e.date}</td><td style={S.td}>{lang==="bn"?tc?.name:tc?.nameEn}</td><td style={S.td}><div style={{fontSize:13}}>{lang==="bn"?e.questionText:e.questionTextEn}</div></td><td style={S.td}><strong style={{color:"#0f172a"}}>{e.score}</strong></td></tr>);})}</tbody></table></div></div>
  </div>);}
function ParentKPIPage({t,lang,parents,parentQuestions,parentEntries,setParentEntries,showNotif,selectedYear,setSelectedYear,availableYears}){
  const isMobile=useIsMobile();
  const [selectedDate,setSelectedDate]=useState(new Date().toISOString().split("T")[0]);
  const [allScores,setAllScores]=useState({});
  const approvedParents=parents.filter(p=>p.status==="approved");
  const cm=new Date(selectedDate).getMonth(),cy=new Date(selectedDate).getFullYear();
  const activeQs=parentQuestions.filter(q=>q.activeMonths.includes(cm));
  const setScore=(pid,qid,val)=>{const max=parentQuestions.find(q=>q.id===qid)?.points||0;setAllScores(p=>({...p,[pid]:{...(p[pid]||{}),[qid]:Math.min(parseInt(val)||0,max)}}));};
  const getScore=(pid,qid)=>allScores[pid]?.[qid]??"";
  const getTotal=pid=>activeQs.reduce((s,q)=>s+(parseInt(allScores[pid]?.[q.id])||0),0);
  const handleSubmit=()=>{const ne=[];approvedParents.forEach(p=>{activeQs.forEach(q=>{ne.push({id:Date.now()+Math.random(),targetId:p.id,questionId:q.id,questionText:q.textBn,questionTextEn:q.textEn,maxPoints:q.points,score:parseInt(allScores[p.id]?.[q.id])||0,month:cm,year:cy,date:selectedDate,editLog:[]});});});setParentEntries(e=>[...e,...ne]);setAllScores({});showNotif(lang==="bn"?"পয়েন্ট জমা হয়েছে!":"Points submitted!");};
  return(<div style={S.page}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
      <h2 style={{...S.pt,margin:0}}>{t.parKpiEntry}</h2>
      <YearSelector t={t} lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears}/>
    </div>
    <div style={S.fg}><label style={S.lbl}>{t.selectDate}</label><input style={{...S.inp,maxWidth:200}} type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/></div>
    {activeQs.length===0?<div style={S.empty}>{t.noQForMonth}</div>:(isMobile?(<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {approvedParents.map(p=>(<div key={p.id} style={{...S.card,marginBottom:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingBottom:8,borderBottom:"2px solid #f8fafc"}}>
          <div><div style={{fontWeight:700,fontSize:15,color:"#0f172a"}}>{lang==="bn"?p.name:p.nameEn}</div><div style={{fontSize:11,color:"#94a3b8"}}>{p.systemId}</div></div>
          <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}><div style={{fontSize:24,fontWeight:900,color:"#0f172a",lineHeight:1}}>{getTotal(p.id)}</div><div style={{fontSize:11,color:"#94a3b8"}}>/{activeQs.reduce((s,q)=>s+q.points,0)} pts</div></div>
        </div>
        {activeQs.map(q=>(<div key={q.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}>
          <div style={{flex:1,marginRight:12}}><div style={{fontSize:13,fontWeight:500,color:"#334155"}}>{lang==="bn"?q.textBn:q.textEn}</div><div style={{fontSize:11,color:"#94a3b8"}}>max {q.points}</div></div>
          <input type="number" min="0" max={q.points} style={{...S.scoreInp,width:64,height:44,fontSize:18,fontWeight:700}} value={getScore(p.id,q.id)} onChange={e=>setScore(p.id,q.id,e.target.value)} placeholder="0"/>
        </div>))}
      </div>))}
      <button onClick={handleSubmit} style={{...S.submitBtn,width:"100%",padding:14,fontSize:16,marginTop:4,borderRadius:10}}>{t.submitPoints}</button>
    </div>):(<div style={S.card}><div style={{overflowX:"auto"}}><table style={S.table}><thead><tr><th style={{...S.th,minWidth:140}}>{t.parent}</th>{activeQs.map(q=>(<th key={q.id} style={{...S.th,minWidth:80,textAlign:"center"}}><div style={{fontSize:11,fontWeight:600}}>{lang==="bn"?q.textBn:q.textEn}</div><div style={{fontSize:10,color:"#0f172a"}}>/{q.points}</div></th>))}<th style={{...S.th,minWidth:70,textAlign:"center"}}>{lang==="bn"?"মোট":"Total"}</th></tr></thead><tbody>{approvedParents.map((p,i)=>(<tr key={p.id} style={i%2===0?{background:"#fafafa"}:{}}><td style={S.td}><div style={{fontWeight:600,fontSize:13}}>{lang==="bn"?p.name:p.nameEn}</div><div style={{fontSize:10,color:"#94a3b8"}}>{p.systemId}</div></td>{activeQs.map(q=>(<td key={q.id} style={{...S.td,textAlign:"center"}}><input type="number" min="0" max={q.points} style={{...S.scoreInp,width:52}} value={getScore(p.id,q.id)} onChange={e=>setScore(p.id,q.id,e.target.value)} placeholder="0"/></td>))}<td style={{...S.td,textAlign:"center"}}><strong style={{color:"#0f172a",fontSize:15}}>{getTotal(p.id)}</strong><div style={{fontSize:10,color:"#94a3b8"}}>/{activeQs.reduce((s,q)=>s+q.points,0)}</div></td></tr>))}</tbody></table></div><div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}><button onClick={handleSubmit} style={S.submitBtn}>{t.submitPoints}</button></div></div>))}
    <div style={S.card}><h3 style={S.ct}>{t.entryHistory}</h3><div style={S.tableWrap}><table style={S.table}><thead><tr><th style={S.th}>{lang==="bn"?"তারিখ":"Date"}</th><th style={S.th}>{t.parent}</th><th style={S.th}>{lang==="bn"?"প্রশ্ন":"Question"}</th><th style={S.th}>{t.points}</th></tr></thead><tbody>{[...parentEntries].reverse().slice(0,50).map((e,i)=>{const par=parents.find(x=>x.id===e.targetId);return(<tr key={i} style={i%2===0?{background:"#fafafa"}:{}}><td style={S.td}>{e.date}</td><td style={S.td}>{lang==="bn"?par?.name:par?.nameEn}</td><td style={S.td}><div style={{fontSize:13}}>{lang==="bn"?e.questionText:e.questionTextEn}</div></td><td style={S.td}><strong style={{color:"#0f172a"}}>{e.score}</strong></td></tr>);})}</tbody></table></div></div>
  </div>);}
function MyTeacherKPIPage({t,lang,currentUser,teacherEntries,getTchrMonthKPI,getTchrTermKPI,getTchrYearKPI,selectedYear,setSelectedYear,availableYears,termConfig}){
  const tid=currentUser.id,cm=new Date().getMonth();
  const monthData=MONTHS.map((m,i)=>({label:T[lang][m].slice(0,3),val:getTchrMonthKPI(tid,i,selectedYear)}));
  const tchrYears=[...new Set([...teacherEntries.filter(e=>e.targetId===tid).map(e=>e.year||new Date().getFullYear()),selectedYear])].sort((a,b)=>b-a);
  return(<div style={S.page}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
      <div><h2 style={S.pt}>{t.myTchrKPI}</h2><p style={S.ps}>{lang==="bn"?currentUser.name:(currentUser.nameEn||currentUser.name)}</p></div>
      <YearSelector t={t} lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={tchrYears.length>0?tchrYears:[selectedYear]}/>
    </div>
    <div style={S.grid4}>
      <StatCard icon="📅" value={getTchrMonthKPI(tid,cm,selectedYear)} label={T[lang][MONTHS[cm]]+" "+t.myMonthly} color="#0f172a"/>
      <StatCard icon="📊" value={getTchrYearKPI(tid,selectedYear)} label={selectedYear+" "+t.myYearly} color="#0f172a"/>
      <StatCard icon="🏆" value={getTchrTermKPI(tid,termConfig.term1,selectedYear)} label={t.term1} color="#0f172a"/>
      <StatCard icon="🎯" value={getTchrTermKPI(tid,termConfig.term2,selectedYear)} label={t.term2} color="#2563eb"/>
    </div>
    <div style={S.card}><h3 style={S.ct}>📈 {t.progressChart} — {selectedYear}</h3><BarChart data={monthData} cm={cm}/></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12}}>{["term1","term2","term3","term4"].map(term=>(<div key={term} style={{...S.card,textAlign:"center",padding:14}}><div style={{fontSize:12,color:"#64748b",marginBottom:4}}>{t[term]}</div><div style={{fontSize:22,fontWeight:800,color:"#0f172a"}}>{getTchrTermKPI(tid,termConfig[term],selectedYear)}</div><div style={{fontSize:11,color:"#94a3b8"}}>{lang==="bn"?"পয়েন্ট":"pts"}</div></div>))}</div>
  </div>);}
function MyParentKPIPage({t,lang,currentUser,parentEntries,getParMonthKPI,getParTermKPI,getParYearKPI,selectedYear,setSelectedYear,availableYears,termConfig}){
  const pid=currentUser.id,cm=new Date().getMonth();
  const monthData=MONTHS.map((m,i)=>({label:T[lang][m].slice(0,3),val:getParMonthKPI(pid,i,selectedYear)}));
  const parYears=[...new Set([...parentEntries.filter(e=>e.targetId===pid).map(e=>e.year||new Date().getFullYear()),selectedYear])].sort((a,b)=>b-a);
  return(<div style={S.page}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
      <div><h2 style={S.pt}>{t.myKPI}</h2><p style={S.ps}>{lang==="bn"?currentUser.name:(currentUser.nameEn||currentUser.name)}</p></div>
      <YearSelector t={t} lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={parYears.length>0?parYears:[selectedYear]}/>
    </div>
    <div style={S.grid4}>
      <StatCard icon="📅" value={getParMonthKPI(pid,cm,selectedYear)} label={T[lang][MONTHS[cm]]+" "+t.myMonthly} color="#0f172a"/>
      <StatCard icon="📊" value={getParYearKPI(pid,selectedYear)} label={selectedYear+" "+t.myYearly} color="#0f172a"/>
      <StatCard icon="🏆" value={getParTermKPI(pid,termConfig.term1,selectedYear)} label={t.term1} color="#0f172a"/>
      <StatCard icon="🎯" value={getParTermKPI(pid,termConfig.term2,selectedYear)} label={t.term2} color="#2563eb"/>
    </div>
    <div style={S.card}><h3 style={S.ct}>📈 {t.progressChart} — {selectedYear}</h3><BarChart data={monthData} cm={cm}/></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12}}>{["term1","term2","term3","term4"].map(term=>(<div key={term} style={{...S.card,textAlign:"center",padding:14}}><div style={{fontSize:12,color:"#64748b",marginBottom:4}}>{t[term]}</div><div style={{fontSize:22,fontWeight:800,color:"#0f172a"}}>{getParTermKPI(pid,termConfig[term],selectedYear)}</div><div style={{fontSize:11,color:"#94a3b8"}}>{lang==="bn"?"পয়েন্ট":"pts"}</div></div>))}</div>
  </div>);}
function ConfirmDialog({lang,name,onConfirm,onCancel}){return(<div style={S.modalBg}><div style={{...S.modalBox,maxWidth:360,textAlign:"center"}}><div style={{fontSize:40,marginBottom:8}}>⚠️</div><h3 style={{...S.ct,marginBottom:8}}>{lang==="bn"?"নিশ্চিত করুন?":"Confirm Delete?"}</h3><p style={{fontSize:14,color:"#64748b",marginBottom:20}}>{lang==="bn"?(`"${name}" মুছে ফেলবেন?`):(`Delete "${name}"?`)}</p><div style={{display:"flex",gap:8,justifyContent:"center"}}><button onClick={onConfirm} style={{padding:"9px 24px",background:"#ef4444",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:700}}>{lang==="bn"?"হ্যাঁ, মুছুন":"Yes, Delete"}</button><button onClick={onCancel} style={S.cancelBtn}>{lang==="bn"?"না":"Cancel"}</button></div></div></div>);}
const S={
  app:{display:"flex",minHeight:"100vh",background:"#f9fafb",fontFamily:"'Segoe UI','Noto Sans Bengali',sans-serif"},
  sidebar:{width:230,background:"#0f172a",color:"#e2e8f0",display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",flexShrink:0},
  sidebarTop:{padding:"20px 16px 10px",borderBottom:"1px solid #1e293b"},
  logoBox:{background:"#0f172a",color:"#fff",fontWeight:900,fontSize:13,borderRadius:7,padding:"4px 8px",display:"inline-block",marginBottom:6,letterSpacing:2},
  logoText:{fontSize:12,fontWeight:700,color:"#e2e8f0",lineHeight:1.4},
  langRow:{display:"flex",gap:4,padding:"8px 16px"},
  langBtn:{flex:1,padding:"4px 8px",border:"1px solid #334155",background:"transparent",color:"#94a3b8",borderRadius:6,cursor:"pointer",fontSize:12},
  langOn:{background:"#0f172a",color:"#fff",borderColor:"#0f172a"},
  nav:{flex:1,padding:"6px 8px",overflowY:"auto"},
  navBtn:{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 12px",background:"transparent",border:"none",color:"#94a3b8",borderRadius:8,cursor:"pointer",fontSize:13,textAlign:"left",marginBottom:2},
  navBtnOn:{background:"#0f172a",color:"#fff"},
  sidebarFoot:{padding:"12px 16px",borderTop:"1px solid #1e293b"},
  userRow:{display:"flex",alignItems:"center",gap:10,marginBottom:8},
  ava:{width:34,height:34,borderRadius:"50%",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:15,color:"#fff",flexShrink:0},
  uName:{fontSize:13,fontWeight:600,color:"#e2e8f0"},
  uRole:{fontSize:11,color:"#94a3b8"},
  logoutBtn:{width:"100%",padding:"7px",background:"transparent",border:"1px solid #334155",color:"#94a3b8",borderRadius:6,cursor:"pointer",fontSize:13},
  main:{flex:1,overflowY:"auto",minWidth:0},
  page:{padding:"clamp(12px,3vw,24px)",maxWidth:960,margin:"0 auto"},
  ph:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:10},
  pt:{fontSize:"clamp(17px,4vw,22px)",fontWeight:800,color:"#0f172a",margin:0},
  ps:{fontSize:13,color:"#64748b",margin:"4px 0 0"},
  grid4:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10,marginBottom:14},
  grid2:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:12},
  two:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:16},
  statCard:{background:"#fff",borderRadius:12,padding:"clamp(10px,2.5vw,18px)",boxShadow:"0 1px 3px rgba(0,0,0,0.08)"},
  card:{background:"#fff",borderRadius:12,padding:"clamp(12px,2.5vw,20px)",boxShadow:"0 1px 3px rgba(0,0,0,0.08)",marginBottom:16},
  ct:{fontSize:15,fontWeight:700,color:"#0f172a",marginBottom:14,marginTop:0},
  rankRow:{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #f1f5f9"},
  rankBadge:{width:26,height:26,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,flexShrink:0},
  addBtn:{padding:"9px 16px",background:"#0f172a",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:600},
  fg:{marginBottom:12},
  lbl:{display:"block",fontSize:13,fontWeight:600,color:"#374151",marginBottom:5},
  inp:{width:"100%",padding:"9px 12px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:14,color:"#1e293b",background:"#fff",boxSizing:"border-box",outline:"none"},
  saveBtn:{padding:"9px 20px",background:"#0f172a",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:600},
  cancelBtn:{padding:"9px 20px",background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:8,cursor:"pointer",fontSize:14},
  submitBtn:{padding:"11px 28px",background:"#0f172a",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:15,fontWeight:700},
  tableWrap:{overflowX:"auto"},
  table:{width:"100%",borderCollapse:"collapse",fontSize:14},
  th:{padding:"10px 12px",textAlign:"left",background:"#f8fafc",color:"#475569",fontWeight:600,fontSize:13,borderBottom:"2px solid #e2e8f0"},
  td:{padding:"9px 12px",color:"#334155",borderBottom:"1px solid #f1f5f9",verticalAlign:"middle"},
  mBtn:{padding:"5px 10px",border:"1px solid #e2e8f0",borderRadius:6,background:"#fff",color:"#64748b",cursor:"pointer",fontSize:13},
  mOn:{background:"#0f172a",color:"#fff",borderColor:"#0f172a"},
  reportTab:{padding:"7px 14px",border:"1px solid #e2e8f0",borderRadius:20,background:"#fff",color:"#64748b",cursor:"pointer",fontSize:13},
  reportTabOn:{background:"#0f172a",color:"#fff",borderColor:"#0f172a",fontWeight:700},
  scoreInp:{padding:"5px 4px",border:"1px solid #d1d5db",borderRadius:6,fontSize:14,fontWeight:700,textAlign:"center",color:"#0f172a",outline:"none",boxSizing:"border-box"},
  assignTag:{display:"inline-flex",alignItems:"center",gap:4,background:"#f8fafc",color:"#334155",padding:"3px 8px",borderRadius:20,fontSize:12,fontWeight:600},
  tagX:{background:"none",border:"none",cursor:"pointer",color:"#0f172a",fontSize:14,padding:"0 2px",lineHeight:1},
  sectionBox:{background:"#f8fafc",borderRadius:8,padding:"12px 14px",marginBottom:12},
  empty:{textAlign:"center",padding:32,color:"#94a3b8",fontSize:14},
  notif:{position:"fixed",top:20,right:20,color:"#fff",padding:"12px 20px",borderRadius:8,fontWeight:600,zIndex:999,boxShadow:"0 4px 12px rgba(0,0,0,0.15)",fontSize:14},
  modalBg:{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:998,padding:16},
  modalBox:{background:"#fff",borderRadius:14,padding:"clamp(14px,4vw,24px)",width:"100%",maxWidth:440,boxShadow:"0 20px 60px rgba(0,0,0,0.25)"},
  editInfoBox:{background:"#f8fafc",borderRadius:8,padding:"12px 14px",marginBottom:14},
  editInfoRow:{display:"flex",gap:8,padding:"4px 0",borderBottom:"1px solid #f1f5f9",fontSize:13},
  editInfoLabel:{color:"#64748b",minWidth:120,fontWeight:600},
  editInfoVal:{color:"#1e293b",flex:1},
  loginBg:{minHeight:"100vh",background:"linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#4f46e5 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:12},
  loginCard:{background:"#fff",borderRadius:16,padding:"clamp(16px,5vw,32px)",width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"},
  loginLogo:{display:"inline-block",background:"#0f172a",color:"#fff",fontWeight:900,fontSize:18,borderRadius:10,padding:"8px 16px",letterSpacing:3},
  loginBtn:{width:"100%",padding:12,background:"#0f172a",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:16,fontWeight:700,marginTop:4},
};