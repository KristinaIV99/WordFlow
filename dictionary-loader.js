// dictionary-loader.js
// Žodynų įkėlimo ir validavimo logika

export class DictionaryLoader {
    constructor() {
        this.LOADER_NAME = '[DictionaryLoader]';
    }

    // Metodai perkelti iš DictionaryManager
    
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error('Klaida skaitant failą'));
            reader.readAsText(file);
        });
    }

    parseJSON(text) {
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
}
