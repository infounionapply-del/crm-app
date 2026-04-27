import en from './en.json';
import th from './th.json';

const dictionaries: Record<string, any> = { en, th };

export const translate = (lang: string, key: string): string => {
  const dictionary = dictionaries[lang] || dictionaries['en'];
  
  // Check flat key first
  if (dictionary[key]) {
    return dictionary[key];
  }
  
  // Support nested keys (e.g. if we had { nav: { dashboard: "..." } })
  const keys = key.split('.');
  let value: any = dictionary;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      console.warn(`[i18n] Missing translation for key: "${key}" in language: "${lang}"`);
      return key; // Fallback to key
    }
  }

  if (typeof value === 'string') {
    return value;
  }
  
  console.warn(`[i18n] Key "${key}" does not resolve to a string in language: "${lang}"`);
  return key;
};
