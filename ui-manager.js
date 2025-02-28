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
    bindEvents(callbacks) {
        try {
            this.debugLog('Prijungiami įvykių klausytojai');
            
            if (this.fileInput && callbacks.onFileChange) {
                this.fileInput.addEventListener('change', callbacks.onFileChange);
            }
            
            if (this.exportButton && callbacks.onExport) {
                this.exportButton.addEventListener('click', callbacks.onExport);
            }
            
            if (this.paginationControls) {
                const prevBtn = this.paginationControls.querySelector('.prev-page');
                const nextBtn = this.paginationControls.querySelector('.next-page');
               
                if (prevBtn && callbacks.onPrevPage) {
                    prevBtn.addEventListener('click', callbacks.onPrevPage);
                }
                
                if (nextBtn && callbacks.onNextPage) {
                    nextBtn.addEventListener('click', callbacks.onNextPage);
                }
            }
            
            if (this.wordSearchInput && callbacks.onWordSearch) {
                this.wordSearchInput.addEventListener('input', callbacks.onWordSearch);
            }
            
            this.debugLog('Įvykių klausytojai sėkmingai prijungti');
        } catch (error) {
           console.error(`${this.CLASS_NAME} Klaida prijungiant įvykius:`, error);
        }
    }
    /**
     * Nustatome turinio elementą ir atnaujiname vartotojo sąsają
     * @param {string} html - HTML turinys
     * @param {object} stats - Teksto statistika
     * @param {string} currentText - Originalus tekstas
     * @param {object} options - Papildomos parinktys
     * @returns {object} - Puslapiavimo duomenys
     */
    async setContent(html, stats = {}, currentText = '', options = {}) {
        this.debugLog('Nustatomas naujas turinys...');
        
        const div = document.createElement('div');
        div.className = 'text-content';

        // Statistikos dalis
        if (stats && Object.keys(stats).length > 0) {
            const statsDiv = document.createElement('div');
            statsDiv.className = 'text-stats';
            statsDiv.innerHTML = `
               <div class="stat-item">
                    <div class="stat-value">${stats.totalWords || 0}</div>
                    <div class="stat-label">Iš viso žodžių</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.uniqueWords || 0}</div>
                    <div class="stat-label">Unikalių žodžių</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.unknownWords || 0}</div>
                    <div class="stat-label">Nežinomų žodžių</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.unknownPercentage || 0}%</div>
                    <div class="stat-label">Nežinomų žodžių %</div>
                </div>
            `;
            div.appendChild(statsDiv);
        }

        // Tekstas su žymėjimais
        let highlightedHtml = html;
        if (options.textHighlighter && currentText) {
            highlightedHtml = await options.textHighlighter.processText(currentText, html);
            this.debugLog('Pažymėtas tekstas:', highlightedHtml.slice(0, 200));
        }
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'paginated-content';
        contentDiv.innerHTML = highlightedHtml;
        
        div.appendChild(contentDiv);
        
        let pageData = { content: contentDiv.innerHTML, currentPage: 1, totalPages: 1 };
        
        if (options.paginator) {
            pageData = options.paginator.setContent(contentDiv.innerHTML);
            this.debugLog('Puslapiavimo duomenys:', pageData);
            contentDiv.innerHTML = pageData.content;
        }
        
        this.content.replaceChildren(div);
        
        if (options.onUpdatePageContent) {
            options.onUpdatePageContent(pageData);
        }
        
        return pageData;
    }
}
