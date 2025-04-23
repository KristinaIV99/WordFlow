// dictionary-search.js
// Žodžių paieškos tekste logika

const DEBUG = false;

export class DictionarySearch {
    constructor(searcher) {
        this.SEARCH_NAME = '[DictionarySearch]';
        this.searcher = searcher; // Aho-Corasick paieškos algoritmo instancija
        this.searchStats = {
            totalSearches: 0,
            averageSearchTime: 0
        };
    }

    debugLog(...args) {
        if (DEBUG) {
            console.log(`${this.SEARCH_NAME} [DEBUG]`, ...args);
        }
    }

    async findInText(text) {
        if (DEBUG) console.log(`${this.SEARCH_NAME} Pradedama teksto analizė, teksto ilgis:`, text.length);

        const startTime = performance.now();
        
        try {
            // Naudojame Aho-Corasick algoritmą, kad rastume atitikmenis
            const matches = this.searcher.search(text);
            if (DEBUG) console.log('Gauti matches iš searcher:', matches);

            // Apdorojame rezultatus
            const results = this._processSearchResults(matches);
            
            const endTime = performance.now();
            const searchTime = endTime - startTime;
            
            // Atnaujiname paieškos statistiką
            this._updateSearchStats(searchTime);
            
            if (DEBUG) console.log('Apdoroti results:', results);
            return { 
                results,
                searchStats: {
                    searchTimeMs: searchTime,
                    matchesFound: results.length
                }
            };
            
        } catch (error) {
            console.error(`${this.SEARCH_NAME} Klaida:`, error);
            throw error;
        }
    }

    _processSearchResults(matches) {
        if (DEBUG) console.log('Apdorojami matches:', matches);
        const processed = [];

        for (const match of matches) {
            if (!match.outputs || !match.outputs[0]) {
                console.warn('Neteisingas match formatas:', match);
                continue;
            }

            const output = this._extractWordInfo(match);
            processed.push(output);
        }

        return processed;
    }

    _extractWordInfo(match) {
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
    }

    _updateSearchStats(searchTime) {
        this.searchStats.totalSearches++;
        const prevAvg = this.searchStats.averageSearchTime;
        const newAvg = prevAvg + (searchTime - prevAvg) / this.searchStats.totalSearches;
        this.searchStats.averageSearchTime = newAvg;
    }

    getSearchStats() {
        return {
            ...this.searchStats,
            averageTimeMs: this.searchStats.averageSearchTime.toFixed(2)
        };
    }
}
