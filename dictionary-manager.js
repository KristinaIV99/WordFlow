const DEBUG = false;

import { AhoCorasick } from './aho-corasick.js';
import { DictionaryLoader } from './dictionary-loader.js';
import { DictionarySearch } from './dictionary-search.js';

export class DictionaryManager {
    constructor() {
        this.MANAGER_NAME = '[DictionaryManager]';
        this.dictionaries = new Map();
        this.searcher = new AhoCorasick();
        this.loader = new DictionaryLoader();
        this.search = new DictionarySearch(this.searcher); // Pridėta search instancija
        this.statistics = {
            totalEntries: 0,
            loadedDictionaries: 0,
            searchStats: {
                totalSearches: 0,
                averageSearchTime: 0
            }
        };
    }

    async loadDictionary(file) {
        const startTime = performance.now();
        if (DEBUG) console.log(`${this.MANAGER_NAME} Pradedamas žodyno įkėlimas:`, file.name);
        
        try {
            const text = await this.loader.readFileAsText(file);
            const dictionary = this.loader.parseJSON(text);
            const type = file.name.includes('phrases') ? 'phrase' : 'word';
            let entryCount = 0;

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
            
            this.statistics.totalEntries += entryCount;
            this.statistics.loadedDictionaries++;
            
            this.dictionaries.set(file.name, {
                name: file.name,
                type,
                entries: entryCount,
                timestamp: new Date()
            });

            const loadTime = performance.now() - startTime;
            if (DEBUG) console.log(`${this.MANAGER_NAME} Žodynas įkeltas per ${loadTime.toFixed(2)}ms`);
            
            return {
                name: file.name,
                type,
                entries: entryCount,
                loadTimeMs: loadTime
            };
            
        } catch (error) {
            console.error(`${this.MANAGER_NAME} Klaida įkeliant žodyną:`, error);
            throw new Error(`Klaida įkeliant žodyną ${file.name}: ${error.message}`);
        }
    }

    // Naudojame DictionarySearch klasę, bet išsaugome originalų metodą kaip atsarginį
    async findInText(text) {
        if (DEBUG) console.log(`${this.MANAGER_NAME} Pradedama teksto analizė, teksto ilgis:`, text.length);
        
        try {
            // Naudojame search.findInText, bet jei įvyktų klaida, grįžtame prie originalaus metodo
            const result = await this.search.findInText(text);
            return result;
        } catch (error) {
            console.error(`${this.MANAGER_NAME} Klaida naudojant search.findInText, grįžtama prie originalaus metodo:`, error);
            return this._originalFindInText(text);
        }
    }

    // Išsaugome originalią logiką kaip atsarginį metodą
    async _originalFindInText(text) {
        if (DEBUG) console.log(`${this.MANAGER_NAME} Naudojamas originalus findInText, teksto ilgis:`, text.length);

        try {
            const matches = this.searcher.search(text);
            if (DEBUG) console.log('Gauti matches iš searcher:', matches);

            const results = matches.map(match => {
                if (DEBUG) console.log('Apdorojamas match:', match);
                return {
                    pattern: match.pattern,
                    type: match.type,
                    info: {
                        meanings: match.outputs.map(output => ({
                            "vertimas": output.vertimas || '-',
                            "kalbos dalis": output["kalbos dalis"] || '-',
                            "bazinė forma": output["bazinė forma"] || '-',
                            "bazė vertimas": output["bazė vertimas"] || '-',
                            "CEFR": output.CEFR || '-'
                        }))
                    },
                    positions: [{
                        start: match.start,
                        end: match.end,
                        text: match.text
                    }]
                };
            });

            if (DEBUG) console.log('Apdoroti results:', results);
            return { results };
            
        } catch (error) {
            console.error(`${this.MANAGER_NAME} Klaida:`, error);
            throw error;
        }
    }

    _processSearchResults(matches) {
        if (DEBUG) console.log('Apdorojami matches:', matches);
        const processed = new Map();

        for (const match of matches) {
            if (!match.outputs || !match.outputs[0]) {
                console.warn('Neteisingas match formatas:', match);
                continue;
            }

            const output = match.outputs[0];
            const key = `${output.type}_${match.pattern}`;
            
            if (DEBUG) console.log('Apdorojamas match:', {
                pattern: match.pattern,
                type: output.type,
                text: match.text
            });

            if (!processed.has(key)) {
                processed.set(key, {
                    pattern: match.pattern,
                    type: output.type,
                    info: this._extractWordInfo(output),
                    positions: [],
                    length: match.pattern.length,
                    related: new Set()
                });
            }

            const entry = processed.get(key);
            entry.positions.push({
                start: match.start,
                end: match.end,
                text: match.text
            });

            if (match.related) {
                match.related.forEach(relatedPattern => {
                    if (relatedPattern !== match.pattern) {
                        const relatedInfo = this._findPatternInfo(relatedPattern);
                        if (relatedInfo) {
                            entry.related.add(JSON.stringify(relatedInfo));
                        }
                    }
                });
            }
        }

        return Array.from(processed.values())
            .sort((a, b) => b.length - a.length)
            .map(entry => ({
                ...entry,
                related: Array.from(entry.related).map(r => JSON.parse(r))
            }));
    }

    _findPatternInfo(pattern) {
        const matches = Array.from(this.dictionaries.values())
            .filter(dict => dict.entries > 0)
            .map(dict => {
                const entry = this.searcher.patterns.get(pattern);
                if (entry && entry.data) {
                    return this._extractWordInfo(entry.data);
                }
                return null;
            })
            .filter(info => info !== null);

        return matches[0] || null;
    }

    _extractWordInfo(data) {
        if (DEBUG) console.log('Extracting info from:', data);

        const text = data.originalKey || data.pattern || '';
        const meanings = [];
        
        if (data.originalKey) {
            for (const [pattern, patternInfo] of this.searcher.patterns) {
                if (patternInfo.data && patternInfo.data.originalKey === data.originalKey) {
                    meanings.push({
                        "kalbos dalis": patternInfo.data["kalbos dalis"],
                        "vertimas": patternInfo.data.vertimas,
                        "bazinė forma": patternInfo.data["bazinė forma"],
                        "bazė vertimas": patternInfo.data["bazė vertimas"],
                        "CEFR": patternInfo.data.CEFR
                    });
                }
            }
        }

        return {
            text: text,
            originalText: data.text || text,
            type: data.type || 'word',
            pattern: data.pattern || text,
            source: data.source,
            meanings: meanings.length > 0 ? meanings : [{
                "kalbos dalis": data["kalbos dalis"] || '-',
                "vertimas": data.vertimas || '-',
                "bazinė forma": data["bazinė forma"] || '-',
                "bazė vertimas": data["bazė vertimas"] || '-',
                "CEFR": data.CEFR || '-'
            }]
        };
    }

    _updateSearchStats(searchTime) {
        this.statistics.searchStats.totalSearches++;
        const prevAvg = this.statistics.searchStats.averageSearchTime;
        const newAvg = prevAvg + (searchTime - prevAvg) / this.statistics.searchStats.totalSearches;
        this.statistics.searchStats.averageSearchTime = newAvg;
    }

    getDictionaryList() {
        return Array.from(this.dictionaries.values());
    }

    getStatistics() {
        // Įtraukiame search statistiką
        return {
            ...this.statistics,
            searchStats: this.search.getSearchStats(),
            searcherStats: this.searcher.getStats ? this.searcher.getStats() : {}
        };
    }

    removeDictionary(name) {
        const dict = this.dictionaries.get(name);
        if (!dict) return false;

        this.statistics.totalEntries -= dict.entries;
        this.statistics.loadedDictionaries--;
        this.dictionaries.delete(name);
        this._rebuildDictionaries();
        
        return true;
    }

    _rebuildDictionaries() {
        this.searcher.clear();
        const existingDictionaries = Array.from(this.dictionaries.values());
        
        for (const dict of existingDictionaries) {
            if (DEBUG) console.log(`${this.MANAGER_NAME} Perkraunamas žodynas: ${dict.name}`);
        }
    }

    clearAll() {
        this.dictionaries.clear();
        this.searcher.clear();
        this.statistics = {
            totalEntries: 0,
            loadedDictionaries: 0,
            searchStats: {
                totalSearches: 0,
                averageSearchTime: 0
            }
        };
    }

    getDictionaryWords() {
        const words = new Map();
        
        if (DEBUG) console.log('Pradinis žodžių kiekis:', this.searcher.patterns.size);
        
        for (const [pattern, data] of this.searcher.patterns) {
            if (data?.data?.type === 'word') {
                words.set(pattern, data.data);
            }
        }
        
        if (DEBUG) console.log('Žodžių po filtravimo:', words.size);
        
        return Object.fromEntries(words);
    }

    async loadDictionaries(files) {
        this.searcher = new AhoCorasick();
        
        for (const file of files) {
            const text = await this.loader.readFileAsText(file);
            const dictionary = this.loader.parseJSON(text);
            const type = file.name.includes('phrases') ? 'phrase' : 'word';
            
            for (const [key, data] of Object.entries(dictionary)) {
                if (!this.loader.validateDictionaryEntry(key, data)) continue;
                
                const baseWord = key.split('_')[0];
                const entry = { ...data, type, source: file.name, originalKey: key, baseWord };
                this.searcher.addPattern(baseWord, entry);
            }
            
            this.dictionaries.set(file.name, {
                name: file.name,
                type,
                entries: Object.keys(dictionary).length,
                timestamp: new Date()
            });
        }
        
        this.searcher.buildFailureLinks();
    }
}
