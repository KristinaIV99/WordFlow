const DEBUG = false;  // arba false, true kai norėsime išjungti

// Pastovus reguliarių išraiškų objektas - sukuriamas tik kartą
const quoteRegex = /[""'\u201C\u201D\u2018\u2019"]/gu;
const punctuationRegex = /[.,!?;#]/g;

export class TextStatistics {
    constructor() {
        this.CLASS_NAME = '[TextStatistics]';
        this.currentText = '';
        // Žodžių kešas greitesnei paieškai
        this._cleanWordsCache = new Map();
        // Kešas žodynui
        this._dictionaryWordsCache = null;
    }

    debugLog(...args) {
        if (DEBUG) {
            console.log(`${this.CLASS_NAME} [DEBUG]`, ...args);
        }
    }

    calculateStats(text, knownWords) {
        const startTime = performance.now();
        this.currentText = text;
        
        // Kešuojame žodyno žodžius, jei dar neturime
        if (!this._dictionaryWordsCache) {
            this._prepareKnownWordsCache(knownWords);
        }
        
        const unknownWordsList = this.getUnknownWords(text, knownWords);
        const words = this._getWords(text);
        const self = this;  // Tik viena deklaracija
        
        // Sukuriame Map žodžių originalių formų saugojimui
        const wordMap = new Map();
        
        // Renkame unikalius žodžius - optimizuota versija
        const uniqueWords = new Set();
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            let lowerWord = word.toLowerCase();
            
            // Jei žodis turi brūkšnelį arba dvitaškį ir atitinka kriterijus, palikti jį nepakeistą
            if (!self._shouldKeepAsOneWord(lowerWord)) {
                lowerWord = lowerWord
                    .replace(punctuationRegex, '')
                    .replace(quoteRegex, '')
                    .trim();
            }
            
            if (lowerWord.length > 0) {
                uniqueWords.add(lowerWord);
                
                // Saugome originalias formas
                if (!wordMap.has(lowerWord)) {
                    wordMap.set(lowerWord, new Set());
                }
                wordMap.get(lowerWord).add(word);
            }
        }

        // Išvedame statistiką
        this.debugLog('=== ŽODŽIŲ STATISTIKA ===');
        this.debugLog('Visi žodžiai:', words);
        this.debugLog('Visi unikalūs žodžiai:', Array.from(uniqueWords));
        this.debugLog('Unikalių žodžių kiekis:', uniqueWords.size);
        this.debugLog('Bendras žodžių kiekis:', words.length);

        const stats = {
            totalWords: words.length,
            uniqueWords: uniqueWords.size,
            unknownWords: unknownWordsList.length,
            unknownPercentage: ((unknownWordsList.length / uniqueWords.size) * 100).toFixed(2)
        };

        const endTime = performance.now();
        console.log(`${this.CLASS_NAME} Statistikos skaičiavimas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
        this.debugLog('Statistika:', stats);
        return stats;
    }
    
    _shouldKeepAsOneWord(word) {
        // Tikrina ar žodis turi brūkšnelį arba dvitaškį tarp raidžių
        return /^[a-zåäöA-ZÅÄÖ]+[-:][a-zåäöA-ZÅÄÖ]+$/.test(word);
    }

    _getWords(text) {
        this.debugLog('Išskiriami žodžiai iš teksto');
        const normalizedText = text.normalize('NFC');
        const cleanText = normalizedText
            .replace(/§SECTION_BREAK§/g, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/[0-9]+(?:_+)?/g, ' ')
            .replace(/\s-\s/g, ' ')
            .replace(/\s:\s/g, ' ')
            .replace(/[_#\[\](){}.,!?;""'\u201C\u201D\u2018\u2019"]/g, function(match) {
                if (/[''\u2019]/.test(match)) {
                    return match;
                }
                return ' ';
            })
            .replace(/___\w+/g, ' ')
            .replace(/_\w+/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/[0-9]-\w+/g, ' ')
            .replace(/[•…"""]/g, ' ')
            .replace(/^"+|"+$/g, '')
            .replace(/"+/g, ' ')
            .replace(/[%‰]/g, '')
            .trim();

        const words = cleanText.split(' ')
            .filter(word => {
                // Jei žodis turi brūkšnelį arba dvitaškį, tikriname ar jis atitinka mūsų kriterijus
                if (word.includes('-') || word.includes(':')) {
                    return this._shouldKeepAsOneWord(word);
                }
                return word.length > 0 && /\p{L}/u.test(word);
            })
            .map(word => word.trim());
        
        this.debugLog('Rasta žodžių:', words.length);
        return words;
    }

    // Optimizuotas žodžių tikrinimas žodyne
    _isWordInDictionary(word, knownWords) {
        // Pritaikome tik vieną kartą valymą
        const cleanWord = word.toLowerCase().replace(quoteRegex, '').trim();
        
        // Patikriname, ar jau turime šio žodžio rezultatą
        if (this._cleanWordsCache.has(cleanWord)) {
            return this._cleanWordsCache.get(cleanWord);
        }
        
        // Tiesioginis tikrinimas kešuotuose žodynuose
        let isKnown = false;
        
        // Pirmiausiai tiesiogiai patikriname, ar žodis yra žodyne
        if (this._dictionaryWordsCache.has(cleanWord)) {
            isKnown = true;
        } else {
            // Tikriname, ar bazinis žodis (iki '_') yra žodyne
            for (const dictWord of this._dictionaryWordsCache) {
                const baseWord = dictWord.split('_')[0];
                if (baseWord === cleanWord) {
                    isKnown = true;
                    break;
                }
            }
        }

        // Išsaugome rezultatą kešavimui
        this._cleanWordsCache.set(cleanWord, isKnown);
        
        if (DEBUG) this.debugLog('Žodžio patikrinimas žodyne:', { žodis: word, rastas: isKnown });
        return isKnown;
    }
    
    // Naujas metodas žodyno žodžiams kešuoti
    _prepareKnownWordsCache(knownWords) {
        const startTime = performance.now();
        this._dictionaryWordsCache = new Set();
        
        // Surenkame visus žodžius į Set greitesnei paieškai
        for (const dictWord in knownWords) {
            const cleanWord = dictWord.toLowerCase().replace(quoteRegex, '').trim();
            this._dictionaryWordsCache.add(cleanWord);
            
            // Pridedame ir bazinį žodį (iki '_')
            const baseWord = dictWord.split('_')[0].toLowerCase().replace(quoteRegex, '').trim();
            this._dictionaryWordsCache.add(baseWord);
        }
        
        const endTime = performance.now();
        console.log(`${this.CLASS_NAME} Žodyno kešavimas užtruko: ${(endTime - startTime).toFixed(2)}ms, kešuota ${this._dictionaryWordsCache.size} žodžių`);
    }
    
    getUnknownWords(text, knownWords) {
        const startTime = performance.now();
        this.currentText = text;
        this.debugLog('Pradedu nežinomų žodžių paiešką');
        
        // Jei nėra kešuotų žodyno žodžių, sukuriame juos
        if (!this._dictionaryWordsCache) {
            this._prepareKnownWordsCache(knownWords);
        }
        
        // Išvalome žodžių kešą prieš naują paiešką
        this._cleanWordsCache.clear();
        
        const words = this._getWords(text);
        
        // Saugome originalius žodžius ir jų mažąsias versijas žodyno paieškai
        const wordMap = new Map();
        
        for (const word of words) {
            let lowerWord = word.toLowerCase();
            
            // Jei žodis turi brūkšnelį arba dvitaškį ir atitinka kriterijus, palikti jį nepakeistą
            if (!this._shouldKeepAsOneWord(lowerWord)) {
                lowerWord = lowerWord
                    .replace(punctuationRegex, '')
                    .replace(quoteRegex, '')
                    .trim();
            }
            
            if (lowerWord.length > 0) {
                if (!wordMap.has(lowerWord)) {
                    wordMap.set(lowerWord, new Set());
                }
                wordMap.get(lowerWord).add(word);
            }
        }

        this.debugLog('Unikalių žodžių Map:', wordMap);
        
        const unknownWords = [];
        
        // Greitesnis tikrinimas per Map
        for (const [lowerWord] of wordMap) {
            // Tiesiogiai naudojame _isWordInDictionary, kuris kešuoja rezultatus
            if (!this._isWordInDictionary(lowerWord, knownWords)) {
                this.debugLog('Žodis nežinomas:', lowerWord);
                unknownWords.push(lowerWord);
            }
        }

        const endTime = performance.now();
        console.log(`${this.CLASS_NAME} Nežinomų žodžių paieška užtruko: ${(endTime - startTime).toFixed(2)}ms`);
        this.debugLog('Nežinomų žodžių kiekis:', unknownWords.length);
        this.debugLog('Pirmi 10 nežinomų žodžių:', unknownWords.slice(0, 10));
        
        return unknownWords;
    }
}
