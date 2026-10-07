/**
 * AM-07: Multilingual Adverse-Media Query Expansion & Translation Adapter
 * Generates local-script variants, transliterations, and language-specific adverse event keywords.
 * Preserves original and translated query provenance with confidence scores and approval states.
 */
import { EventCategory, QueryVariant, Subject, TranslationRecord } from '../types/index.ts';

export interface KeywordDictionary {
  [language: string]: {
    [category in EventCategory]?: string[];
  };
}

// Enterprise adverse media keyword dictionary across supported demonstration languages
export const ADVERSE_EVENT_KEYWORDS: KeywordDictionary = {
  en: {
    BRIBERY_CORRUPTION: ['bribery', 'corruption', 'kickback', 'graft', 'embezzlement', 'extortion'],
    FINANCIAL_CRIME_FRAUD: ['fraud', 'money laundering', 'illicit funds', 'wire fraud', 'tax evasion', 'shell company'],
    TERRORIST_FINANCING: ['terrorist financing', 'illicit funding', 'extremist network', 'proliferation'],
    NARCOTICS_TRAFFICKING: ['narcotics trafficking', 'drug cartel', 'contraband', 'smuggling'],
    SANCTIONS_EVASION: ['sanctions evasion', 'blacklisted entity', 'trade embargo', 'shadow fleet', 'circumvention'],
    ORGANIZED_CRIME: ['organized crime', 'syndicate', 'racketeering', 'mafia'],
    TAX_EVASION: ['tax evasion', 'unreported offshore accounts', 'panama papers', 'tax fraud'],
    ENVIRONMENTAL_CRIME: ['illegal mining', 'toxic dumping', 'wildlife trafficking', 'illegal logging'],
    COURT_RECORDS: ['indictment', 'prosecution', 'arbitration award', 'subpoena', 'conviction', 'inquest'],
  },
  ar: {
    BRIBERY_CORRUPTION: ['رشوة', 'فساد', 'اختلاس', 'عمولات غير مشروعة', 'استغلال النفوذ'],
    FINANCIAL_CRIME_FRAUD: ['احتيال مالي', 'غسل الأموال', 'أموال غير مشروعة', 'شركات وهمية', 'تهرب ضريبي'],
    TERRORIST_FINANCING: ['تمويل الإرهاب', 'شبكة تمويل محظورة', 'دعم غير مشروع'],
    NARCOTICS_TRAFFICKING: ['تهريب المخدرات', 'تجارة غير مشروعة'],
    SANCTIONS_EVASION: ['انتهاك العقوبات', 'كيان مدرج في القائمة السوداء', 'شبكة تهرب', 'التفاف على العقوبات'],
    ORGANIZED_CRIME: ['جريمة منظمة', 'عصابة إجرامية'],
    TAX_EVASION: ['تهرب ضريبي', 'حسابات سرية'],
    ENVIRONMENTAL_CRIME: ['تعدين غير قانوني', 'تلوث بيئي محظور'],
    COURT_RECORDS: ['دعوى قضائية', 'حكم تحكيم', 'لائحة اتهام', 'تحقيق نيابة'],
  },
  hi: {
    BRIBERY_CORRUPTION: ['रिश्वत', 'भ्रष्टाचार', 'गबन', 'घूसखोरी', 'कमीशन घोटाला'],
    FINANCIAL_CRIME_FRAUD: ['धोखाधड़ी', 'मनी लॉन्ड्रिंग', 'काले धन का लेनदेन', 'शेल कंपनी', 'कर चोरी'],
    TERRORIST_FINANCING: ['आतंकी वित्तपोषण', 'अवैध फंडिंग'],
    NARCOTICS_TRAFFICKING: ['मादक पदार्थों की तस्करी', 'ड्रग्स रैकेट'],
    SANCTIONS_EVASION: ['प्रतिबंध उल्लंघन', 'काली सूची', 'प्रतिबंधों से बचना'],
    ORGANIZED_CRIME: ['संगठित अपराध', 'माफिया सिंडिकेट'],
    TAX_EVASION: ['आयकर चोरी', 'बेनामी संपत्ति'],
    ENVIRONMENTAL_CRIME: ['अवैध खनन', 'पर्यावरण अपराध'],
    COURT_RECORDS: ['आरोप पत्र', 'मुकदमा', 'अदालती आदेश', 'सीबीआई जांच'],
  },
  ml: {
    BRIBERY_CORRUPTION: ['കൈക്കൂലി', 'അഴിമതി', 'തട്ടിപ്പ്', 'അനധികൃത പണമിടപാട്'],
    FINANCIAL_CRIME_FRAUD: ['സാമ്പത്തിക തട്ടിപ്പ്', 'കള്ളപ്പണം വെളുപ്പിക്കൽ', 'ഷെൽ കമ്പനി', 'വ്യാജരേഖ'],
    TERRORIST_FINANCING: ['ഭീകരവാദ ധനസഹായം', 'അനധികൃത ഫണ്ടിംഗ്'],
    NARCOTICS_TRAFFICKING: ['ലഹരിമരുന്ന് കടത്ത്', 'കള്ളക്കടത്ത്'],
    SANCTIONS_EVASION: ['ഉപരോധ ലംഘനം', 'കരിമ്പട്ടികയിൽ ഉൾപ്പെട്ട സ്ഥാപനം'],
    ORGANIZED_CRIME: ['സംഘടിത കുറ്റകൃത്യം'],
    TAX_EVASION: ['നികുതി വെട്ടിപ്പ്', 'ബിനാമി ഇടപാടുകൾ'],
    ENVIRONMENTAL_CRIME: ['പരിസ്ഥിതി മലിനീകരണം', 'അനധികൃത ഖനനം'],
    COURT_RECORDS: ['കോടതി നടപടി', 'വിചാരണ', 'കുറ്റപത്രം'],
  },
  es: {
    BRIBERY_CORRUPTION: ['soborno', 'corrupción', 'cohecho', 'malversación', 'tráfico de influencias'],
    FINANCIAL_CRIME_FRAUD: ['fraude financiero', 'blanqueo de capitales', 'lavado de dinero', 'sociedad pantalla', 'evasión fiscal'],
    TERRORIST_FINANCING: ['financiación del terrorismo', 'fondos ilícitos'],
    NARCOTICS_TRAFFICKING: ['narcotráfico', 'cártel de drogas', 'contrabando'],
    SANCTIONS_EVASION: ['violación de sanciones', 'entidad sancionada', 'red de evasión', 'elusión de embargos'],
    ORGANIZED_CRIME: ['crimen organizado', 'asociación ilícita'],
    TAX_EVASION: ['evasión fiscal', 'cuentas opacas', 'paraíso fiscal'],
    ENVIRONMENTAL_CRIME: ['delito ambiental', 'minería ilegal'],
    COURT_RECORDS: ['imputación', 'procedimiento penal', 'laudo arbitral', 'investigación judicial'],
  },
  ru: {
    BRIBERY_CORRUPTION: ['взятка', 'коррупция', 'откат', 'хищение', 'злоупотребление полномочиями'],
    FINANCIAL_CRIME_FRAUD: ['мошенничество', 'отмывание денег', 'фирма-однодневка', 'незаконный вывод средств', 'уклонение от налогов'],
    TERRORIST_FINANCING: ['финансирование терроризма', 'незаконные транзакции'],
    NARCOTICS_TRAFFICKING: ['наркоторговля', 'контрабанда'],
    SANCTIONS_EVASION: ['нарушение санкций', 'санкционный список', 'обход ограничений', 'теневой флот'],
    ORGANIZED_CRIME: ['организованная преступность', 'рэкет'],
    TAX_EVASION: ['налоговое мошенничество', 'офшорные счета'],
    ENVIRONMENTAL_CRIME: ['экологическое преступление', 'незаконная добыча'],
    COURT_RECORDS: ['уголовное дело', 'арбитражный суд', 'обвинительное заключение', 'судебное решение'],
  },
};

// Known synthetic transliteration and script mappings for high-risk demonstration entities
const KNOWN_ENTITY_TRANSLITERATIONS: Record<
  string,
  Array<{
    language: string;
    script: string;
    variantName: string;
    isRTL: boolean;
    method: TranslationRecord['translationMethod'];
  }>
> = {
  vance: [
    { language: 'ar', script: 'ARAB', variantName: 'ألكسندر فانس', isRTL: true, method: 'OFFICIAL_REGISTRY' },
    { language: 'hi', script: 'DEVA', variantName: 'अलेक्जेंडर वेंस', isRTL: false, method: 'APPROVED_RULE' },
    { language: 'ml', script: 'MLYM', variantName: 'അലക്സാണ്ടർ വാൻസ്', isRTL: false, method: 'DETERMINISTIC_TRANSLITERATOR' },
    { language: 'es', script: 'LATN', variantName: 'Alexánder Vance', isRTL: false, method: 'APPROVED_RULE' },
    { language: 'ru', script: 'CYRL', variantName: 'Александр Вэнс', isRTL: false, method: 'OFFICIAL_REGISTRY' },
  ],
  apex: [
    { language: 'ar', script: 'ARAB', variantName: 'شركة أبيكس العالمية للطاقة', isRTL: true, method: 'OFFICIAL_REGISTRY' },
    { language: 'hi', script: 'DEVA', variantName: 'एपेक्स ग्लोबल एनर्जी लिमिटेड', isRTL: false, method: 'APPROVED_RULE' },
    { language: 'ml', script: 'MLYM', variantName: 'എപെക്സ് ഗ്ലോബൽ എനർജി', isRTL: false, method: 'DETERMINISTIC_TRANSLITERATOR' },
    { language: 'es', script: 'LATN', variantName: 'Apex Energía Global S.L.', isRTL: false, method: 'APPROVED_RULE' },
    { language: 'ru', script: 'CYRL', variantName: 'Апекс Глобал Энерджи', isRTL: false, method: 'OFFICIAL_REGISTRY' },
  ],
  mansoor: [
    { language: 'ar', script: 'ARAB', variantName: 'طارق المنصور', isRTL: true, method: 'OFFICIAL_REGISTRY' },
    { language: 'hi', script: 'DEVA', variantName: 'तारिक अल-मंसूर', isRTL: false, method: 'APPROVED_RULE' },
    { language: 'ml', script: 'MLYM', variantName: 'താരിഖ് അൽ മൻസൂർ', isRTL: false, method: 'DETERMINISTIC_TRANSLITERATOR' },
    { language: 'es', script: 'LATN', variantName: 'Tarek Al-Mansoor', isRTL: false, method: 'APPROVED_RULE' },
    { language: 'ru', script: 'CYRL', variantName: 'Тарик Аль-Мансур', isRTL: false, method: 'OFFICIAL_REGISTRY' },
  ],
};

export class QueryExpansionService {
  /**
   * Locale-aware text normalization
   */
  public normalizeQueryText(text: string, language: string): string {
    if (!text) return '';
    let normalized = text.trim().normalize('NFKC');

    if (language === 'ar') {
      // Normalize Arabic diacritics, tatweel, and specific alef/yaa variations
      normalized = normalized
        .replace(/[\u064B-\u0652\u0640]/g, '') // Remove harakat and tatweel
        .replace(/[إأآا]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي');
    } else if (language === 'ru') {
      // Normalize Cyrillic yo to ye if needed for broad search
      normalized = normalized.replace(/ё/g, 'е').replace(/Ё/g, 'Е');
    } else {
      // Latin case folding
      normalized = normalized.replace(/\s+/g, ' ');
    }

    return normalized;
  }

  /**
   * Detect whether text contains Right-to-Left characters (Arabic, Hebrew, Persian)
   */
  public isRTLScript(text: string): boolean {
    const rtlRegex = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
    return rtlRegex.test(text);
  }

  /**
   * Detect language code based on unicode character ranges
   */
  public detectLanguageFromScript(text: string): { language: string; script: string; isRTL: boolean } {
    if (/[\u0600-\u06FF\u0750-\u077F]/.test(text)) {
      return { language: 'ar', script: 'ARAB', isRTL: true };
    }
    if (/[\u0900-\u097F]/.test(text)) {
      return { language: 'hi', script: 'DEVA', isRTL: false };
    }
    if (/[\u0D00-\u0D7F]/.test(text)) {
      return { language: 'ml', script: 'MLYM', isRTL: false };
    }
    if (/[\u0400-\u04FF]/.test(text)) {
      return { language: 'ru', script: 'CYRL', isRTL: false };
    }
    if (/[áéíóúñ¿¡]/i.test(text)) {
      return { language: 'es', script: 'LATN', isRTL: false };
    }
    return { language: 'en', script: 'LATN', isRTL: false };
  }

  /**
   * Expand a subject into approved multilingual query variants
   */
  public expandMultilingualQueries(params: {
    runId: string;
    subject: Subject;
    targetLanguages: string[];
    eventCategories: EventCategory[];
  }): QueryVariant[] {
    const variants: QueryVariant[] = [];
    const lowerName = params.subject.primaryName.toLowerCase();

    // 1. Primary Name (English / Base)
    const baseLangInfo = this.detectLanguageFromScript(params.subject.primaryName);
    variants.push({
      id: `qv-${Date.now()}-primary`,
      runId: params.runId,
      subjectId: params.subject.id,
      language: baseLangInfo.language,
      script: baseLangInfo.script,
      originalQuery: params.subject.primaryName,
      normalizedQuery: this.normalizeQueryText(params.subject.primaryName, baseLangInfo.language),
      variantType: 'PRIMARY_NAME',
      searchType: 'LEXICAL',
      keywords: this.getKeywordsForCategories(baseLangInfo.language, params.eventCategories),
      eventCategories: params.eventCategories,
      isRTL: baseLangInfo.isRTL,
      approvalState: 'APPROVED',
      approvedBy: 'SYSTEM_DETERMINISTIC_POLICY',
      approvedAt: new Date().toISOString(),
    });

    // 2. Approved Aliases (from Prompt 1 AM-03)
    const approvedAliases = params.subject.aliases.filter((a) => a.state === 'APPROVED');
    for (const alias of approvedAliases) {
      const aliasLang = this.detectLanguageFromScript(alias.aliasName);
      variants.push({
        id: `qv-${Date.now()}-alias-${alias.id}`,
        runId: params.runId,
        subjectId: params.subject.id,
        language: aliasLang.language,
        script: alias.script || aliasLang.script,
        originalQuery: alias.aliasName,
        normalizedQuery: this.normalizeQueryText(alias.aliasName, aliasLang.language),
        variantType: 'APPROVED_ALIAS',
        searchType: 'LEXICAL',
        keywords: this.getKeywordsForCategories(aliasLang.language, params.eventCategories),
        eventCategories: params.eventCategories,
        isRTL: aliasLang.isRTL,
        approvalState: 'APPROVED',
        approvedBy: alias.approvedBy || 'SYSTEM',
        approvedAt: alias.approvedAt || new Date().toISOString(),
      });
    }

    // 3. Multilingual Transliterations & Local-Script Name Expansion
    // Find matching transliteration profile
    let matchedKey: string | null = null;
    for (const key of Object.keys(KNOWN_ENTITY_TRANSLITERATIONS)) {
      if (lowerName.includes(key)) {
        matchedKey = key;
        break;
      }
    }

    if (matchedKey) {
      const transliterations = KNOWN_ENTITY_TRANSLITERATIONS[matchedKey];
      for (const t of transliterations) {
        if (!params.targetLanguages.includes(t.language)) continue;

        const translationRecord: TranslationRecord = {
          id: `tr-${Date.now()}-${t.language}`,
          sourceText: params.subject.primaryName,
          sourceLanguage: 'en',
          targetText: t.variantName,
          targetLanguage: t.language,
          translationMethod: t.method,
          translationVersion: '2.1.0',
          confidence: t.method === 'OFFICIAL_REGISTRY' ? 0.98 : 0.94,
          approvedBy: 'COMPLIANCE_DICTIONARY_V2',
          approvedAt: new Date().toISOString(),
          approvalState: 'APPROVED',
        };

        // Lexical Query Variant in Local Script
        variants.push({
          id: `qv-${Date.now()}-${t.language}-lex`,
          runId: params.runId,
          subjectId: params.subject.id,
          language: t.language,
          script: t.script,
          originalQuery: t.variantName,
          normalizedQuery: this.normalizeQueryText(t.variantName, t.language),
          variantType: 'LOCAL_SCRIPT',
          searchType: 'LEXICAL',
          keywords: this.getKeywordsForCategories(t.language, params.eventCategories),
          eventCategories: params.eventCategories,
          isRTL: t.isRTL,
          approvalState: 'APPROVED',
          approvedBy: 'COMPLIANCE_OFFICER_AUTHORIZED',
          approvedAt: new Date().toISOString(),
          translationRecord,
        });

        // Provider-supported Semantic Query Variant
        variants.push({
          id: `qv-${Date.now()}-${t.language}-sem`,
          runId: params.runId,
          subjectId: params.subject.id,
          language: t.language,
          script: t.script,
          originalQuery: `${t.variantName} ${this.getKeywordsForCategories(t.language, params.eventCategories).slice(0, 3).join(' ')}`,
          normalizedQuery: this.normalizeQueryText(t.variantName, t.language),
          variantType: 'SEMANTIC_EXPANSION',
          searchType: 'SEMANTIC',
          keywords: this.getKeywordsForCategories(t.language, params.eventCategories),
          eventCategories: params.eventCategories,
          isRTL: t.isRTL,
          approvalState: 'APPROVED',
          approvedBy: 'COMPLIANCE_OFFICER_AUTHORIZED',
          approvedAt: new Date().toISOString(),
          translationRecord,
        });
      }
    }

    return variants;
  }

  /**
   * Retrieve adverse media keywords for the given language and event categories
   */
  public getKeywordsForCategories(language: string, categories: EventCategory[]): string[] {
    const langDict = ADVERSE_EVENT_KEYWORDS[language] || ADVERSE_EVENT_KEYWORDS['en'];
    const keywordsSet = new Set<string>();

    for (const cat of categories) {
      const kw = langDict[cat] || ADVERSE_EVENT_KEYWORDS['en'][cat] || [];
      kw.forEach((k) => keywordsSet.add(k));
    }

    return Array.from(keywordsSet);
  }
}

export const queryExpansionService = new QueryExpansionService();
