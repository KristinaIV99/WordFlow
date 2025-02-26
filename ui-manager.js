// ui-manager.js
const DEBUG = false;  // arba false true kai norėsime išjungti

export class UIManager {
    constructor() {
        this.CLASS_NAME = '[UIManager]';
        this.debugLog('Konstruktorius inicializuotas');
        
        // UI elementai
        this.elements = {};
        
        // Inicializacija
        this.initUI();
    }
    
    debugLog(...args) {
        if (DEBUG) {
            console.log(`${this.CLASS_NAME} [DEBUG]`, ...args);
        }
    }
    
    initUI() {
        try {
            this.debugLog('Inicializuojami UI elementai');
            
            // Pagrindiniai elementai
            this.elements.fileInput = document.getElementById('fileInput');
            this.elements.content = document.getElementById('content');
            this.elements.dictionaryList = document.getElementById('dictionaryList');
            this.elements.dictionaryStats = document.getElementById('dictionaryStats');
            this.elements.wordSearchInput = document.getElementById('wordSearch');
            this.elements.searchResults = document.getElementById('searchResults');
            this.elements.savedTextsButton = document.getElementById('savedTextsButton');
            
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida inicializuojant UI:`, error);
        }
    }
    
    updateProgress(percent) {
        try {
            if (this.progressBar) {
                this.progressBar.style.width = `${percent}%`;
                if (percent >= 100) {
                    setTimeout(() => {
                        this.progressBar.style.width = '0%';
                    }, 500);
                }
            }
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida atnaujinant progreso juostą:`, error);
        }
    }
    
    showLoadingState() {
        try {
            this.debugLog('Rodoma įkėlimo būsena');
            const loader = document.createElement('div');
            loader.className = 'loading';
            loader.innerHTML = '<p>Kraunama...</p>';
            this.elements.content.replaceChildren(loader);
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida rodant įkėlimo būseną:`, error);
        }
    }
    
    hideLoadingState() {
        try {
            this.debugLog('Paslepiama įkėlimo būsena');
            const loader = this.elements.content.querySelector('.loading');
            if (loader) loader.remove();
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida slepiant įkėlimo būseną:`, error);
        }
    }
    
    showError(message) {
        try {
            console.warn('Klaidos pranešimas:', message);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = message;
            this.elements.content.insertAdjacentElement('afterbegin', errorDiv);
            setTimeout(() => errorDiv.remove(), 5000);
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida rodant klaidos pranešimą:`, error);
        }
    }
}
