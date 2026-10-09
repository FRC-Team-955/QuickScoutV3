import en from "../i18n/en.json";
import es from "../i18n/es.json";
import zh from "../i18n/zh.json";
import tr from "../i18n/tr.json";
import he from "../i18n/he.json";
import pt from "../i18n/pt.json";
import { pitLabelKeys } from "./pit-fields";
const translations: Record<string, Record<string, string>> = { en, es, zh, tr, he, pt };
export const languages = {
  en: "English",
  es: "Español",
  zh: "中文",
  tr: "Türkçe",
  he: "עברית",
  pt: "Português",
};
export function translate(label: string, language: string) {
  const key = pitLabelKeys[label] ?? Object.entries(en).find(([, value]) => value === label)?.[0] ?? label;
  return translations[language]?.[key] ?? en[key as keyof typeof en] ?? label;
}
