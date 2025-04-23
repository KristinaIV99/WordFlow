// dictionary-search.js
// Žodžių paieškos logika

const DEBUG = false;

export class DictionarySearch {
    constructor(searcher) {
        this.SEARCH_NAME = '[DictionarySearch]';
        this.searcher = searcher; // AhoCorasick instancija
        this.searchStats = {
            totalSearches: 0,
            averageSearchTime: 0
        };
    }

    async findInText(text) {
        if (DEBUG) console.log(`${this.SEARCH_NAME} Pradedama teksto analizė, teksto ilgis:`, text.length);
        const startTime = performance.now();

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

            const searchTime = performance.now() - startTime;
            this._updateSearchStats(searchTime);

            if (DEBUG) console.log('Apdoroti results:', results);
            return { 
                results,
                searchTime 
            };
            
        } catch (error) {
            console.error(`${this.SEARCH_NAME} Klaida:`, error);
            throw error;
        }
    }

    _updateSearchStats(searchTime) {
        this.searchStats.totalSearches++;
        const prevAvg = this.searchStats.averageSearchTime;
        const newAvg = prevAvg + (searchTime - prevAvg) / this.searchStats.totalSearches;
        this.searchStats.averageSearchTime = newAvg;
    }

    getSearchStats() {
        return { ...this.searchStats };
    }
}