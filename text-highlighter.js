// text-highlighter.js
// Importuojame PopupManager ir DomProcessor
import { PopupManager } from './popup-manager.js';
import { DomProcessor } from './dom-processor.js';

const DEBUG = false;

export class TextHighlighter {
    constructor(dictionaryManager) {
        const constructorStart = performance.now();
        this.HIGHLIGHTER_NAME = '[TextHighlighter]';
        this.dictionaryManager = dictionaryManager;
        
        // Sukuriame PopupManager ir DomProcessor instancijas
        this.popupManager = new PopupManager();
        this.domProcessor = new DomProcessor();
        
        this.boundHandlePopup = this._handlePopup.bind(this);
        this.activePopup = null;
        this.savedHighlights = null;

        document.addEventListener('click', (e) => {
            const target = e.target.closest('.highlight-word, .highlight-phrase');
            if (target) {
                if (DEBUG) console.log('Clicked on word:', target);
                this._handlePopup(e);
            }
        });
        
        const constructorEnd = performance.now();
        console.log(`${this.HIGHLIGHTER_NAME} Konstruktoriaus inicializacija užtruko: ${(constructorEnd - constructorStart).toFixed(2)}ms`);
    }

    saveHighlights() {
        const startTime = performance.now();
        const highlights = document.querySelectorAll('.highlight-word, .highlight-phrase');
        this.savedHighlights = Array.from(highlights).map(el => ({
            text: el.textContent,
            info: el.dataset.info,
            type: el.classList.contains('highlight-phrase') ? 'phrase' : 'word'
        }));
        const endTime = performance.now();
        console.log(`${this.HIGHLIGHTER_NAME} Pažymėjimų išsaugojimas užtruko: ${(endTime - startTime).toFixed(2)}ms, išsaugota ${this.savedHighlights.length} pažymėjimų`);
        return this.savedHighlights;
    }

    loadHighlights(savedHighlights) {
        const startTime = performance.now();
        if (savedHighlights) {
            this.savedHighlights = savedHighlights;
        }
        const endTime = performance.now();
        console.log(`${this.HIGHLIGHTER_NAME} Pažymėjimų įkėlimas užtruko: ${(endTime - startTime).toFixed(2)}ms, įkelta ${this.savedHighlights ? this.savedHighlights.length : 0} pažymėjimų`);
    }

    async processText(text, html, savedHighlights = null) {
        const startTime = performance.now();
        console.log("PRADINIS HTML (pradžia):", html.substring(0, 200));

        if (DEBUG) console.log(`${this.HIGHLIGHTER_NAME} Pradedamas teksto žymėjimas`);

        try {
            // Pažymėjimų įkėlimas
            const highlightsStart = performance.now();
            if (savedHighlights) {
                this.loadHighlights(savedHighlights);
            }
            const highlightsEnd = performance.now();
            console.log(`${this.HIGHLIGHTER_NAME} Pažymėjimų paruošimas užtruko: ${(highlightsEnd - highlightsStart).toFixed(2)}ms`);
            
            // Žodžių paieška
            const searchStart = performance.now();
            const { results } = await this.dictionaryManager.findInText(text);
            const searchEnd = performance.now();
            console.log(`${this.HIGHLIGHTER_NAME} Žodžių paieška užtruko: ${(searchEnd - searchStart).toFixed(2)}ms, rasta ${results.length} rezultatų`);
            
            // HTML dokumento apdorojimas
            const parseStart = performance.now();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const parseEnd = performance.now();
            console.log(`${this.HIGHLIGHTER_NAME} HTML dokumento apdorojimas užtruko: ${(parseEnd - parseStart).toFixed(2)}ms`);

            const controlsStart = performance.now();
            const paginationControls = doc.querySelector('.pagination-controls');
            if (paginationControls) {
                paginationControls.remove();
            }
            const controlsEnd = performance.now();
            console.log(`${this.HIGHLIGHTER_NAME} Puslapiavimo kontrolių apdorojimas užtruko: ${(controlsEnd - controlsStart).toFixed(2)}ms`);

            // Šablonų apdorojimas
            const patternsStart = performance.now();
            const patterns = {};
            results.forEach(result => {
                const pattern = result.pattern.toLowerCase();
                if (!patterns[pattern]) {
                    patterns[pattern] = {
                        pattern: result.pattern,
                        type: result.type,
                        info: result.info,
                        length: pattern.length
                    };
                }
            });

            const sortedPatterns = Object.entries(patterns).sort((a, b) => b[1].length - a[1].length);
            if (DEBUG) console.log('Surūšiuoti šablonai:', sortedPatterns);
            const patternsEnd = performance.now();
            console.log(`${this.HIGHLIGHTER_NAME} Šablonų apdorojimas užtruko: ${(patternsEnd - patternsStart).toFixed(2)}ms, unikalių šablonų: ${Object.keys(patterns).length}`);

            // Žymėjimas - naudojame DomProcessor
            const processStart = performance.now();
            this.domProcessor.processNode(doc.body, Object.fromEntries(sortedPatterns));
            const processEnd = performance.now();
            console.log(`${this.HIGHLIGHTER_NAME} Žymėjimo procesas užtruko: ${(processEnd - processStart).toFixed(2)}ms`);

            // Kontrolių grąžinimas
            if (paginationControls) {
                doc.body.appendChild(paginationControls);
            }

            // Galutinio HTML generavimas
            const htmlStart = performance.now();
            const processedHtml = doc.body.innerHTML;
            const htmlEnd = performance.now();
            console.log(`${this.HIGHLIGHTER_NAME} HTML generavimas užtruko: ${(htmlEnd - htmlStart).toFixed(2)}ms`);
            
            // Pažymėjimų išsaugojimas
            const saveStart = performance.now();
            this.saveHighlights();
            const saveEnd = performance.now();
            console.log(`${this.HIGHLIGHTER_NAME} Galutinis pažymėjimų išsaugojimas užtruko: ${(saveEnd - saveStart).toFixed(2)}ms`);
            
            console.log("GALUTINIS HTML (pradžia):", processedHtml.substring(0, 200));
            
            const endTime = performance.now();
            console.log(`${this.HIGHLIGHTER_NAME} Visas teksto žymėjimo procesas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
            
            return processedHtml;
        } catch (error) {
            console.error('Klaida žymint tekstą:', error);
            const endTime = performance.now();
            console.log(`${this.HIGHLIGHTER_NAME} Teksto žymėjimas nepavyko, užtruko: ${(endTime - startTime).toFixed(2)}ms`);
            return html;
        }
    }

    // Šis metodas naudoja PopupManager
    _handlePopup(event) {
        this.popupManager._handlePopup(event);
    }
}
