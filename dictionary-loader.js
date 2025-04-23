// Minimalus dictionary-loader.js

export class DictionaryLoader {
    constructor() {
        this.LOADER_NAME = '[DictionaryLoader]';
    }

    async readFileAsText(file) {
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
            return false;
        }

        if (!Array.isArray(data)) {
            return false;
        }

        const requiredFields = ['vertimas', 'kalbos dalis', 'bazinė forma'];
        for (const meaning of data) {
            const missingFields = requiredFields.filter(field => !meaning[field]);
            if (missingFields.length > 0) {
                return false;
            }
        }

        return true;
    }
}
