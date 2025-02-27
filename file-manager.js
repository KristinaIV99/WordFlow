// file-manager.js
const DEBUG = true;  // arba false true kai norėsime išjungti

export class FileManager {
    constructor() {
        this.CLASS_NAME = '[FileManager]';
        this.debugLog('Konstruktorius inicializuotas');
        
        // Sukuriame įvykių objektą, kad galėtume pranešti apie progresą
        this.events = new EventTarget();
        
        // Kintamieji
        this.loadedFiles = new Set();
        this.abortController = null;
    }
    
    debugLog(...args) {
        if (DEBUG) {
            console.log(`${this.CLASS_NAME} [DEBUG]`, ...args);
        }
    }
    
    /**
     * Skaito failą, pranešdamas apie progresą
     * @param {File} file - Failas, kurį reikia perskaityti
     * @returns {Promise<string>} - Failo turinys
     */
    async readFile(file) {
        try {
            this.debugLog(`Pradedamas failo skaitymas: ${file.name}, dydis: ${file.size} baitų`);
            
            // Nutraukiame ankstesnę užklausą, jei tokia buvo
            if (this.abortController) {
                this.abortController.abort();
            }
            
            this.abortController = new AbortController();
            const signal = this.abortController.signal;
            
            return new Promise((resolve, reject) => {
                if (signal.aborted) {
                    reject(new DOMException('Skaitymas nutrauktas', 'AbortError'));
                    return;
                }
                
                const reader = new FileReader();
                
                // Prijungiame signal nutraukimo įvykį
                signal.addEventListener('abort', () => {
                    reader.abort();
                    reject(new DOMException('Skaitymas nutrauktas', 'AbortError'));
                });
                
                reader.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        this.reportProgress(percent);
                    }
                };
                
                reader.onload = () => {
                    resolve(reader.result);
                };
                
                reader.onerror = () => {
                    reject(new Error('Klaida skaitant failą'));
                };
                
                reader.readAsText(file);
            });
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida skaitant failą:`, error);
            throw error;
        }
    }
    
    /**
     * Praneša apie progresą
     * @param {number} percent - Progresas procentais (0-100)
     */
    reportProgress(percent) {
        this.events.dispatchEvent(new CustomEvent('progress', {
            detail: { percent }
        }));
    }
    
    /**
     * Nutraukia aktyvų failo skaitymą
     */
    abort() {
        if (this.abortController) {
            this.debugLog('Nutraukiamas failo skaitymas');
            this.abortController.abort();
            this.abortController = null;
        }
    }
    
    /**
     * Patikrina, ar failas jau buvo įkeltas
     * @param {string} fileName - Failo pavadinimas
     * @returns {boolean} - Ar failas buvo įkeltas
     */
    isFileLoaded(fileName) {
        return this.loadedFiles.has(fileName);
    }
    
    /**
     * Pažymi failą kaip įkeltą
     * @param {string} fileName - Failo pavadinimas
     */
    markFileAsLoaded(fileName) {
        this.loadedFiles.add(fileName);
    }
    
    /**
     * Pašalina failą iš įkeltų sąrašo
     * @param {string} fileName - Failo pavadinimas
     * @returns {boolean} - Ar pašalinimas pavyko
     */
    removeLoadedFile(fileName) {
        return this.loadedFiles.delete(fileName);
    }
}
