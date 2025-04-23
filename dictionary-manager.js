// dictionary-manager.js
// Pagrindinis žodyno tvarkymo modulis

const DEBUG = false;

import { AhoCorasick } from './aho-corasick.js';
import { DictionaryLoader } from './dictionary-loader.js';
import { DictionarySearch } from './dictionary-search.js';
import { DictionaryStats } from './dictionary-stats.js';

export class DictionaryManager {
    constructor() {
        this.MANAGER_NAME = '[DictionaryManager]';
        
        // Inicializuojame pagalbines klases
        this.searcher = new AhoCorasick();
        this.loader = new DictionaryLoader();
        this.search = new DictionarySearch(this.searcher);
        this.stats = new DictionaryStats();
        
        // Inicializuojame vidinį stovį
        this.dictionaries = new Map();
    }

    debugLog(...args) {
        if (DEBUG) {
            console.log(`${this.MANAGER_NAME} [DEBUG]`, ...args);
        }
    }

    async loadDictionary(file) {
        const startTime = performance.now();
        this.debugLog(`Pradedamas žodyno įkėlimas:`, file.name);
        
        try {
            // Naudojame loaderį žodynui įkelti
            const { dictionaryData, loadTimeMs } = await this.loader.loadDictionary(file);
            
            // Tvarkomės su žodyno duomenimis
            let entryCount = 0;
            const dictionary = dictionaryData.data;
            const type = dictionaryData.type;

            for (const [word, meanings] of Object.entries(dictionary)) {
                if (!this.loader.validateDictionaryEntry(word, meanings)) continue;
                
                meanings.forEach(meaning => {
                    const entry = {
                        ...meaning,
                        type: type,
                        source: file.name,
                        originalKey: word
                    };
                    
                    try {
                        this.searcher.addPattern(word, entry);
                        entryCount++;
                    } catch (error) {
                        console.error(`Klaida pridedant šabloną ${word}:`, error);
                    }
                });
            }

            this.searcher.buildFailureLinks();
            
            // Išsaugome įkeltą žodyną
            this.dictionaries.set(file.name, {
                name: file.name,
                type,
                entries: entryCount,
                timestamp: new Date()
            });
            
            // Atnaujiname statistiką
            this.stats.updateStatisticsFromDictionaries(this.dictionaries);

            const totalTime = performance.now() - startTime;
            console.log(`${this.MANAGER_NAME} Žodynas ${file.name} įkeltas per ${totalTime.toFixed(2)}ms`);
            
            return {
                name: file.name,
                type,
                entries: entryCount,
                loadTimeMs: totalTime
            };
            
        } catch (error) {
            console.error(`${this.MANAGER_NAME} Klaida įkeliant žodyną:`, error);
            throw new Error(`Klaida įkeliant žodyną ${file.name}: ${error.message}`);
        }
    }

    async findInText(text) {
        this.debugLog(`Pradedama teksto analizė, teksto ilgis:`, text.length);
        // Naudojame DictionarySearch klasę
        return this.search.findInText(text);
    }

    getDictionaryList() {
        return Array.from(this.dictionaries.values());
    }

    getStatistics() {
        // Naudojame DictionaryStats klasę
        return this.stats.getDictionaryStats(this.search.getSearchStats());
    }

    removeDictionary(name) {
        const dict = this.dictionaries.get(name);
        if (!dict) return false;

        this.dictionaries.delete(name);
        this._rebuildDictionaries();
        
        // Atnaujiname statistiką
        this.stats.updateStatisticsFromDictionaries(this.dictionaries);
        
        return true;
    }

    _rebuildDictionaries() {
        this.searcher.clear();
        const existingDictionaries = Array.from(this.dictionaries.values());
        
        for (const dict of existingDictionaries) {
            this.debugLog(`Perkraunamas žodynas: ${dict.name}`);
            // Čia reikėtų iš naujo įkelti žodynus iš kažkur, bet tai reikalauja
            // papildomos logikos, kurią galima būtų įgyvendinti vėliau
        }
    }

    clearAll() {
        this.dictionaries.clear();
        this.searcher.clear();
        
        // Atnaujiname statistiką
        this.stats.updateStatisticsFromDictionaries(this.dictionaries);
    }

    getDictionaryWords() {
        const words = new Map();
        
        this.debugLog('Pradinis žodžių kiekis:', this.searcher.patterns.size);
        
        for (const [pattern, data] of this.searcher.patterns) {
            if (data?.data?.type === 'word') {
                words.set(pattern, data.data);
            }
        }
        
        this.debugLog('Žodžių po filtravimo:', words.size);
        
        return Object.fromEntries(words);
    }

    async loadDictionaries(files) {
        const startTime = performance.now();
        this.debugLog(`Pradedamas kelių žodynų įkėlimas`);
        
        // Iš naujo inicializuojame paieškos klasę
        this.searcher = new AhoCorasick();
        
        // Naudojame loader klasę žodynams įkelti
        const loadedDictionaries = await this.loader.loadDictionaries(files);
        
        for (const dictionary of loadedDictionaries) {
            this.dictionaries.set(dictionary.name, dictionary);
            
            // Kitoks būdas šablonams pridėti būtų čia
            // kadangi mums reikia pilnos DictionaryLoader realizacijos
        }
        
        this.searcher.buildFailureLinks();
        
        // Atnaujiname statistiką
        this.stats.updateStatisticsFromDictionaries(this.dictionaries);
        this.stats.updatePatternStats(this.searcher.patterns.entries());
        
        const endTime = performance.now();
        console.log(`${this.MANAGER_NAME} Kelių žodynų įkėlimas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
        
        return loadedDictionaries;
    }
}
