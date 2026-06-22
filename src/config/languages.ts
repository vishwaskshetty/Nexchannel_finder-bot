export const LANGUAGES = [
  "English",
  "Hindi",
  "Kannada",
  "Tamil",
  "Telugu",
  "Malayalam",
  "Marathi",
  "Bengali",
  "Gujarati",
  "Punjabi",
  "Urdu",
  "Spanish",
  "Arabic",
  "Russian",
  "French",
  "German",
  "Portuguese",
  "Indonesian",
  "Turkish",
  "Mixed",
  "Other"
];

export function parseLanguage(langStr: string): string {
  const lower = langStr.trim().toLowerCase();
  
  if (lower.startsWith('en')) return "English";
  if (lower.startsWith('hi')) return "Hindi";
  if (lower.startsWith('kn') || lower.startsWith('kan')) return "Kannada";
  if (lower.startsWith('ta')) return "Tamil";
  if (lower.startsWith('te')) return "Telugu";
  if (lower.startsWith('ml') || lower.startsWith('mal')) return "Malayalam";
  if (lower.startsWith('mr') || lower.startsWith('mar')) return "Marathi";
  if (lower.startsWith('bn') || lower.startsWith('ben')) return "Bengali";
  if (lower.startsWith('gu')) return "Gujarati";
  if (lower.startsWith('pa') || lower.startsWith('pun')) return "Punjabi";
  if (lower.startsWith('ur')) return "Urdu";
  if (lower.startsWith('es') || lower.startsWith('spa')) return "Spanish";
  if (lower.startsWith('ar')) return "Arabic";
  if (lower.startsWith('ru')) return "Russian";
  if (lower.startsWith('fr')) return "French";
  if (lower.startsWith('de') || lower.startsWith('ger')) return "German";
  if (lower.startsWith('pt') || lower.startsWith('por')) return "Portuguese";
  if (lower.startsWith('id') || lower.startsWith('ind')) return "Indonesian";
  if (lower.startsWith('tr') || lower.startsWith('tur')) return "Turkish";
  if (lower === 'mixed' || lower === 'all') return "Mixed";

  const directMatch = LANGUAGES.find(l => {
    if (l.toLowerCase() === lower) return true;
    const regex = new RegExp(`\\b${l.toLowerCase()}\\b`);
    return regex.test(lower);
  });
  if (directMatch) return directMatch;

  return "Other";
}
