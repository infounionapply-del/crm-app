/**
 * Translation Service
 * 
 * Handles auto-translation of input strings into bilingual JSON strings (en/th)
 * before inserting into Supabase JSONB columns.
 */

// Helper to detect if text contains mostly Thai characters
const isThai = (text: string) => {
  const thaiRegex = /[\u0E00-\u0E7F]/;
  return thaiRegex.test(text);
};

// Uses Google Translate public API for instant translation without keys
// In production, you can replace this with OpenAI API or Supabase Edge Function
const translateText = async (text: string, targetLang: 'en' | 'th'): Promise<string> => {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const data = await response.json();
    return data[0][0][0]; // Extract the translated text from Google's response
  } catch (error) {
    console.error(`Translation to ${targetLang} failed:`, error);
    return text; // Fallback to original text if API fails
  }
};

/**
 * Converts a normal string into a bilingual JSON string.
 * Example: "บริษัท" -> '{"en": "Company", "th": "บริษัท"}'
 * 
 * @param text The single-language string input by the user
 * @returns A JSON string representing { en, th }
 */
export const createTranslatedRecord = async (text: string): Promise<string> => {
  if (!text || text.trim() === '') {
    return JSON.stringify({ en: '', th: '' });
  }

  // 1. Check if it's already a bilingual JSON string (safety check)
  try {
    const parsed = JSON.parse(text);
    if (parsed && (typeof parsed.en === 'string' || typeof parsed.th === 'string')) {
      return text; // Already translated, do not double-process
    }
  } catch (e) {
    // Not JSON, normal text. Proceed to translation.
  }

  // 2. Auto-detect source language and translate to the other
  const sourceIsThai = isThai(text);
  
  let enText = text;
  let thText = text;

  if (sourceIsThai) {
    // Source is Thai, translate to English
    enText = await translateText(text, 'en');
  } else {
    // Source is English, translate to Thai
    thText = await translateText(text, 'th');
  }

  // 3. Return stringified JSON for Supabase JSONB column insertion
  return JSON.stringify({
    en: enText,
    th: thText
  });
};

/**
 * Extracts the correct language from a bilingual JSON string or object
 * Example: getLocalizedValue('{"en": "Apple", "th": "แอปเปิ้ล"}', 'th') -> "แอปเปิ้ล"
 * 
 * @param data The JSON string or parsed object from DB
 * @param lang Current UI language ('en' | 'th')
 * @returns Localized string
 */
export const getLocalizedValue = (data: string | any, lang: string): string => {
  if (!data) return '';
  
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (parsed && (parsed.en || parsed.th)) {
        return parsed[lang] || parsed.en || parsed.th || data;
      }
    } catch (e) {
      return data; // Normal string fallback
    }
  } else if (typeof data === 'object') {
    return data[lang] || data.en || data.th || '';
  }

  return String(data);
};
