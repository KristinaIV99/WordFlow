// file-manager.js
const DEBUG = false;  // arba false true kai norėsime išjungti

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
            console.time(`${this.CLASS_NAME} ${args[0]}`);
        }
    }
    
    debugLogEnd(...args) {
        if (DEBUG) {
            console.timeEnd(`${this.CLASS_NAME} ${args[0]}`);
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
            
            // Failų skaitymo optimizacija dideliems failams
            if (file.size > 5 * 1024 * 1024) { // 5 MB
                return await this.readLargeFile(file, signal);
            } else {
                return await this.readSmallFile(file, signal);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                this.debugLog('Failo skaitymas nutrauktas');
                throw new Error('Failo skaitymas nutrauktas');
            } else {
                console.error(`${this.CLASS_NAME} Klaida skaitant failą:`, error);
                throw error;
            }
        }
    }
    
    /**
     * Skaito mažą failą įprastu būdu
     * @param {File} file - Failas
     * @param {AbortSignal} signal - Nutraukimo signalas
     * @returns {Promise<string>} - Failo turinys
     */
    async readSmallFile(file, signal) {
        try {
            this.debugLog('Skaitomas mažas failas');
            const startTime = performance.now();
            
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
                    const endTime = performance.now();
                    this.debugLog(`Mažas failas perskaitytas, užtruko: ${endTime - startTime} ms`);
                    resolve(reader.result);
                };
                
                reader.onerror = () => {
                    reject(new Error('Klaida skaitant failą'));
                };
                
                reader.readAsText(file);
            });
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida skaitant mažą failą:`, error);
            throw error;
        } finally {
            this.debugLogEnd('Skaitomas mažas failas');
        }
    }
    
    /**
     * Skaito didelį failą dalimis
     * @param {File} file - Failas
     * @param {AbortSignal} signal - Nutraukimo signalas
     * @returns {Promise<string>} - Failo turinys
     */
    async readLargeFile(file, signal) {
        try {
            this.debugLog('Skaitomas didelis failas dalimis');
            const startTime = performance.now();
            
            const CHUNK_SIZE = 1024 * 1024; // 1 MB
            const fileSize = file.size;
            let offset = 0;
            let result = '';
            
            while (offset < fileSize) {
                if (signal.aborted) {
                    throw new DOMException('Skaitymas nutrauktas', 'AbortError');
                }
                
                const chunk = file.slice(offset, offset + CHUNK_SIZE);
                const chunkText = await this.readChunk(chunk);
                result += chunkText;
                
                offset += CHUNK_SIZE;
                const percent = Math.min(100, Math.round((offset / fileSize) * 100));
                this.reportProgress(percent);
            }
            
            const endTime = performance.now();
            this.debugLog(`Didelis failas perskaitytas, užtruko: ${endTime - startTime} ms`);
            
            return result;
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida skaitant didelį failą:`, error);
            throw error;
        } finally {
            this.debugLogEnd('Skaitomas didelis failas dalimis');
        }
    }
    
    /**
     * Skaito vieną failo dalį
     * @param {Blob} chunk - Failo dalis
     * @returns {Promise<string>} - Dalies turinys
     */
    async readChunk(chunk) {
        try {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Klaida skaitant failo dalį'));
                reader.readAsText(chunk);
            });
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida skaitant failo dalį:`, error);
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
    
    /**
     * Gauna visų įkeltų failų sąrašą
     * @returns {string[]} - Įkeltų failų sąrašas
     */
    getLoadedFiles() {
        return Array.from(this.loadedFiles);
    }
    
    /**
     * Įkelia numatytuosius žodynus
     * @returns {Promise<File[]>} - Žodynų failai
     */
    async loadDefaultDictionaries() {
        try {
            this.debugLog('Įkeliami numatytieji žodynai');
            
            // Įkeliame žodžių žodyną
            const wordsResponse = await fetch('./words.json');
            const wordsBlob = await wordsResponse.blob();
            const wordsFile = new File([wordsBlob], 'words.json', { type: 'application/json' });
            
            // Įkeliame frazių žodyną
            const phrasesResponse = await fetch('./phrases.json');
            const phrasesBlob = await phrasesResponse.blob();
            const phrasesFile = new File([phrasesBlob], 'phrases.json', { type: 'application/json' });
            
            this.markFileAsLoaded('words.json');
            this.markFileAsLoaded('phrases.json');
            
            this.debugLogEnd('Įkeliami numatytieji žodynai');
            
            return [wordsFile, phrasesFile];
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida įkeliant numatytuosius žodynus:`, error);
            throw error;
        }
    }
}
