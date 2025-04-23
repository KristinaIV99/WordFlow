// text-highlighter.js
// Importuojame visus komponentus
import { PopupManager } from './popup-manager.js';
import { DomProcessor } from './dom-processor.js';
import { HighlighterCore } from './highlighter-core.js';

const DEBUG = false;

export class TextHighlighter {
    constructor(dictionaryManager) {
        const constructorStart = performance.now();
        this.HIGHLIGHTER_NAME = '[TextHighlighter]';
        
        // Sukuriame visas komponentų instancijas
        this.core = new HighlighterCore(dictionaryManager);
        this.popupManager = new PopupManager();
        this.domProcessor = new DomProcessor();
        
        // Inicializuojame įvykių klausytojus
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

    // Dabar tiesiog perduodame metodus į HighlighterCore
    saveHighlights() {
        return this.core.saveHighlights();
    }

    loadHighlights(savedHighlights) {
        this.core.loadHighlights(savedHighlights);
    }

    async processText(text, html, savedHighlights = null) {
        return this.core.processText(text, html, this.domProcessor, savedHighlights);
    }

    // Šis metodas naudoja PopupManager
    _handlePopup(event) {
        this.popupManager._handlePopup(event);
    }
}
