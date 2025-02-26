// ui-manager.js
const DEBUG = true;  // arba false true kai norėsime išjungti

export class UIManager {
    constructor() {
        this.CLASS_NAME = '[UIManager]';
        this.debugLog('Konstruktorius inicializuotas');
        
        // Pagrindiniai elementai - inicializuojami konstruktoriuje
        this.fileInput = document.getElementById('fileInput');
        this.content = document.getElementById('content');
        this.dictionaryList = document.getElementById('dictionaryList');
        this.dictionaryStats = document.getElementById('dictionaryStats');
        this.wordSearchInput = document.getElementById('wordSearch');
        this.searchResults = document.getElementById('searchResults');
        
        // Eksporto mygtukas
        this.exportButton = document.createElement('button');
        this.exportButton.textContent = 'Eksportas';
        this.exportButton.className = 'export-button';
        this.exportButton.style.display = 'none';
        document.body.appendChild(this.exportButton);
        
        // Progreso juosta  
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'progress-bar';
        document.body.prepend(this.progressBar);
        
        // Puslapiavimo kontrolės inicializuojamos atskirai su initPagination metodu
        this.paginationControls = null;
    }
    
    debugLog(...args) {
        if (DEBUG) {
            console.log(`${this.CLASS_NAME} [DEBUG]`, ...args);
        }
    }
    
    // Inicializuojame puslapiavimo kontroles (iškviečiama iš main.js)
    initPagination(paginator) {
        try {
            this.debugLog('Inicializuojamos puslapiavimo kontrolės');
            
            this.paginationControls = document.createElement('div');
            this.paginationControls.className = 'pagination-controls';
            this.paginationControls.innerHTML = `
                <button class="prev-page">&#8592;</button>
                <span class="page-info">1 / 1</span>
                <button class="next-page">&#8594;</button>
            `;
            
            // Įterpiame slankiklį tarp mygtukų, jei paginator perduotas
            if (paginator) {
                const slider = paginator.initializeSlider();
                this.paginationControls.insertBefore(slider, 
                    this.paginationControls.querySelector('.page-info'));
            }
                
            this.paginationControls.style.display = 'none';
            document.body.appendChild(this.paginationControls);
            
            // Globalus popup uždarymo įvykis
            document.addEventListener('click', (e) => {
                const popup = document.querySelector('.word-info-popup');
                if (popup && !e.target.closest('.word-info-popup') && 
                    !e.target.closest('.highlight-word') && 
                    !e.target.closest('.highlight-phrase')) {
                    popup.remove();
                }
            });
            
            this.debugLog('Puslapiavimo kontrolės inicializuotos');
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida inicializuojant puslapiavimo kontroles:`, error);
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
            if (this.content) {
                const loader = document.createElement('div');
                loader.className = 'loading';
                loader.innerHTML = '<p>Kraunama...</p>';
                this.content.replaceChildren(loader);
            }
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida rodant įkėlimo būseną:`, error);
        }
    }
    
    hideLoadingState() {
        try {
            this.debugLog('Paslepiama įkėlimo būsena');
            if (this.content) {
                const loader = this.content.querySelector('.loading');
                if (loader) loader.remove();
            }
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida slepiant įkėlimo būseną:`, error);
        }
    }
    
    showError(message) {
        try {
            console.warn('Klaidos pranešimas:', message);
            if (this.content) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = message;
                this.content.insertAdjacentElement('afterbegin', errorDiv);
                setTimeout(() => errorDiv.remove(), 5000);
            }
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida rodant klaidos pranešimą:`, error);
        }
    }
}
