// dictionary-stats.js
// Žodyno statistikos apdorojimas

const DEBUG = false;

export class DictionaryStats {
    constructor() {
        this.STATS_NAME = '[DictionaryStats]';
        this.statistics = {
            totalEntries: 0,
            loadedDictionaries: 0,
            wordDictionaries: 0,
            phraseDictionaries: 0,
            totalUniqueWords: 0,
            totalUniquePhrases: 0
        };
    }

    debugLog(...args) {
        if (DEBUG) {
            console.log(`${this.STATS_NAME} [DEBUG]`, ...args);
        }
    }

    updateStatisticsFromDictionaries(dictionaries) {
        const startTime = performance.now();
        
        // Atnaujiname pagrindinę statistiką
        this.statistics.loadedDictionaries = dictionaries.size;
        this.statistics.totalEntries = 0;
        this.statistics.wordDictionaries = 0;
        this.statistics.phraseDictionaries = 0;
        
        for (const dictionary of dictionaries.values()) {
            this.statistics.totalEntries += dictionary.entries;
            
            if (dictionary.type === 'word') {
                this.statistics.wordDictionaries++;
            } else if (dictionary.type === 'phrase') {
                this.statistics.phraseDictionaries++;
            }
        }
        
        const endTime = performance.now();
        console.log(`${this.STATS_NAME} Statistikos atnaujinimas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
        
        return this.statistics;
    }

    updatePatternStats(patterns) {
        const startTime = performance.now();
        
        let wordCount = 0;
        let phraseCount = 0;
        
        for (const [pattern, data] of patterns) {
            if (data?.data?.type === 'word') {
                wordCount++;
            } else if (data?.data?.type === 'phrase') {
                phraseCount++;
            }
        }
        
        this.statistics.totalUniqueWords = wordCount;
        this.statistics.totalUniquePhrases = phraseCount;
        
        const endTime = performance.now();
        console.log(`${this.STATS_NAME} Šablonų statistikos atnaujinimas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
        
        return {
            wordCount,
            phraseCount
        };
    }

    getStatistics() {
        return {
            ...this.statistics,
            totalWords: this.statistics.totalUniqueWords,
            totalPhrases: this.statistics.totalUniquePhrases
        };
    }

    getDictionaryStats(searchStats) {
        return {
            ...this.getStatistics(),
            searchStats: searchStats || {
                totalSearches: 0,
                averageSearchTime: 0
            }
        };
    }
}
