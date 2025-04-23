// dictionary-loader.js
// Žodynų įkėlimo ir validavimo logika

const DEBUG = false;

export class DictionaryLoader {
    constructor() {
        this.LOADER_NAME = '[DictionaryLoader]';
    }

    async loadDictionary(file) {
        const startTime = performance.now();
        if (DEBUG) console.log(`${this.LOADER_NAME} Pradedamas žodyno įkėlimas:`, file.name);
        
        try {
            const text = await this._readFileAsText(file);
            const dictionary = this._parseJSON(text);
            const type = file.name.includes('phrases') ? 'phrase' : 'word';
            
            const loadTime = performance.now() - startTime;
            if (DEBUG) console.log(`${this.LOADER_NAME} Žodynas įkeltas per ${loadTime.toFixed(2)}ms`);
            
            return {
                dictionary,
                type,
                loadTimeMs: loadTime
            };
            
        } catch (error) {
            console.error(`${this.LOADER_NAME} Klaida įkeliant žodyną:`, error);
            throw new Error(`Klaida įkeliant žodyną ${file.name}: ${error.message}`);
        }
    }

    validateDictionaryEntry(key, data) {
        if (!key || typeof key !== 'string') {
            console.warn(`${this.LOADER_NAME} Neteisingas raktas:`, key);
            return false;
        }

        if (!Array.isArray(data)) {
            console.warn(`${this.LOADER_NAME} Neteisingas formatas, tikimasi masyvo:`, key);
            return false;
        }

        const requiredFields = ['vertimas', 'kalbos dalis', 'bazinė forma'];
        for (const meaning of data) {
            const missingFields = requiredFields.filter(field => !meaning[field]);
            if (missingFields.length > 0) {
                console.warn(`${this.LOADER_NAME} Trūksta laukų ${key} reikšmėje:`, missingFields);
                return false;
            }
        }

        return true;
    }

    async _readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error('Klaida skaitant failą'));
            reader.readAsText(file);
        });
    }

    _parseJSON(text) {
        try {
            const data = JSON.parse(text);
            if (typeof data !== 'object' || data === null) {
                throw new Error('Neteisingas JSON formatas - tikimasi objekto');
            }
            return data;
        } catch (error) {
            throw new Error(`Neteisingas žodyno formatas: ${error.message}`);
        }
    }
}