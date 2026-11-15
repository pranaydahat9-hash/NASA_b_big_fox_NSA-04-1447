export type Lang = "en" | "hi" | "mr";
const dict = {
  dashboard: { en: "Dashboard", hi: "डैशबोर्ड", mr: "डॅशबोर्ड" },
  map: { en: "Map", hi: "नक्शा", mr: "नकाशा" },
  sos: { en: "SOS", hi: "SOS", mr: "SOS" },
  prevent: { en: "Prevent", hi: "बचाव", mr: "प्रतिबंध" },
  reports: { en: "Reports", hi: "रिपोर्ट", mr: "अहवाल" },
  settings: { en: "Settings", hi: "सेटिंग्स", mr: "सेटिंग्ज" },
  offline: { en: "Offline guide", hi: "ऑफ़लाइन गाइड", mr: "ऑफलाइन मार्गदर्शक" },
  riskNow: { en: "Risk right now", hi: "अभी का जोखिम", mr: "सध्याचा धोका" },
  yourArea: { en: "Your area", hi: "आपका क्षेत्र", mr: "तुमचा परिसर" },
  low: { en: "Low", hi: "कम", mr: "कमी" },
  medium: { en: "Medium", hi: "मध्यम", mr: "मध्यम" },
  high: { en: "High", hi: "उच्च", mr: "उच्च" },
  searchPlace: { en: "Search a place — e.g. Mumbai", hi: "जगह खोजें — जैसे मुंबई", mr: "ठिकाण शोधा — उदा. मुंबई" },
  safeZones: { en: "Safe zones", hi: "सुरक्षित क्षेत्र", mr: "सुरक्षित क्षेत्रे" },
  holdSos: { en: "Hold to send SOS", hi: "SOS भेजने के लिए दबाए रखें", mr: "SOS पाठवण्यासाठी दाबून ठेवा" },
  contacts: { en: "Emergency contacts", hi: "आपातकालीन संपर्क", mr: "आपत्कालीन संपर्क" },
  askFox: { en: "Ask B fox or say “Hey B fox, help me”", hi: "B fox से पूछें या कहें “Hey B fox, मदद”", mr: "B fox ला विचारा किंवा म्हणा “Hey B fox, मदत”" },
  useMyLocation: { en: "Use my location", hi: "मेरा स्थान", mr: "माझे स्थान" },
  weatherOutlook: { en: "16-day weather outlook", hi: "16-दिन मौसम पूर्वानुमान", mr: "16-दिवस हवामान अंदाज" },
  waterLevel: { en: "Water level & flood gauge", hi: "जल स्तर और बाढ़ संकेत", mr: "पाणी पातळी व पूर संकेत" },
  glacier: { en: "Glacier melt watch", hi: "ग्लेशियर पिघलन", mr: "हिमनदी वितळणे" },
  signOut: { en: "Sign out", hi: "साइन आउट", mr: "साइन आउट" },
  sources: { en: "Sources & timestamps", hi: "स्रोत और समय", mr: "स्रोत व वेळ" },
  download: { en: "Download PDF", hi: "PDF डाउनलोड", mr: "PDF डाउनलोड" },
} as const;
export type Key = keyof typeof dict;
export const t = (k: Key, l: Lang) => dict[k][l] ?? dict[k].en;
export const speechLang = (l: Lang) => (l === "hi" ? "hi-IN" : l === "mr" ? "mr-IN" : "en-IN");
