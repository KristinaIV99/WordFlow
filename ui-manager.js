// ui-manager.js
const DEBUG = true;  // arba false true kai norėsime išjungti

export class UIManager {
    constructor({ 
        onFileSelect, 
        onExport, 
        onPreviousPage, 
        onNextPage, 
        onPageSliderChange,
        onWordSearch,
        onDictionaryRemove
    }) {
        this.CLASS_NAME = '[UIManager]';
        this.debugLog('Konstruktorius inicializuotas');
        
        // Callback funkcijos
        this.onFileSelect = onFileSelect;
        this.onExport = onExport;
        this.onPreviousPage = onPreviousPage;
        this.onNextPage = onNextPage;
        this.onPageSliderChange = onPageSliderChange;
        this.onWordSearch = onWordSearch;
        this.onDictionaryRemove = onDictionaryRemove;
        
        // UI elementai
        this.elements = {};
        
        // Inicializacija
        this.initUI();
        this.bindEvents();
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
            
            // Eksporto mygtukas
            this.elements.exportButton = document.createElement('button');
            this.elements.exportButton.textContent = 'Eksportas';
            this.elements.exportButton.className = 'export-button';
            this.elements.exportButton.style.display = 'none';
            document.body.appendChild(this.elements.exportButton);
            
            // Progreso juosta
            this.elements.progressBar = document.createElement('div');
            this.elements.progressBar.className = 'progress-bar';
            document.body.prepend(this.elements.progressBar);
            
            // Puslapiavimo kontrolės
            this.elements.paginationControls = document.createElement('div');
            this.elements.paginationControls.className = 'pagination-controls';
            this.elements.paginationControls.innerHTML = `
                <button class="prev-page">&#8592;</button>
                <span class="page-info">1 / 1</span>
                <button class="next-page">&#8594;</button>
            `;
            this.elements.paginationControls.style.display = 'none';
            document.body.appendChild(this.elements.paginationControls);
            
            this.elements.prevPageBtn = this.elements.paginationControls.querySelector('.prev-page');
            this.elements.nextPageBtn = this.elements.paginationControls.querySelector('.next-page');
            this.elements.pageInfo = this.elements.paginationControls.querySelector('.page-info');
            
            // Globalus click handler popup'ams
            document.addEventListener('click', (e) => {
                const popup = document.querySelector('.word-info-popup');
                if (popup && !e.target.closest('.word-info-popup') && 
                    !e.target.closest('.highlight-word') && 
                    !e.target.closest('.highlight-phrase')) {
                    popup.remove();
                }
            });
            
            this.debugLogEnd('Inicializuojami UI elementai');
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida inicializuojant UI:`, error);
        }
    }
    
    bindEvents() {
        try {
            this.debugLog('Prijungiami įvykių klausytojai');
            
            // Failo įkėlimas
            if (this.elements.fileInput) {
                this.elements.fileInput.addEventListener('change', (e) => {
                    if (this.onFileSelect) this.onFileSelect(e);
                });
            }
            
            // Eksporto mygtukas
            if (this.elements.exportButton) {
                this.elements.exportButton.addEventListener('click', () => {
                    if (this.onExport) this.onExport();
                });
            }
            
            // Puslapiavimo mygtukai
            if (this.elements.prevPageBtn) {
                this.elements.prevPageBtn.addEventListener('click', () => {
                    this.debugLog('Pereinama į ankstesnį puslapį');
                    if (this.onPreviousPage) this.onPreviousPage();
                });
            }
            
            if (this.elements.nextPageBtn) {
                this.elements.nextPageBtn.addEventListener('click', () => {
                    this.debugLog('Pereinama į kitą puslapį');
                    if (this.onNextPage) this.onNextPage();
                });
            }
            
            // Žodžių paieška
            if (this.elements.wordSearchInput) {
                this.elements.wordSearchInput.addEventListener('input', () => {
                    if (this.onWordSearch) this.onWordSearch(this.elements.wordSearchInput.value);
                });
            }
            
            this.debugLogEnd('Prijungiami įvykių klausytojai');
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida prijungiant įvykius:`, error);
        }
    }
    
    insertSlider(slider) {
        try {
            this.debugLog('Įterpiamas slankiklis');
            if (this.elements.paginationControls && slider) {
                this.elements.paginationControls.insertBefore(
                    slider, 
                    this.elements.pageInfo
                );
            }
            this.debugLogEnd('Įterpiamas slankiklis');
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida įterpiant slankiklį:`, error);
        }
    }
    
    updateProgress(percent) {
        try {
            if (this.elements.progressBar) {
                this.elements.progressBar.style.width = `${percent}%`;
                if (percent >= 100) {
                    setTimeout(() => {
                        this.elements.progressBar.style.width = '0%';
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
            this.debugLogEnd('Rodoma įkėlimo būsena');
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida rodant įkėlimo būseną:`, error);
        }
    }
    
    hideLoadingState() {
        try {
            this.debugLog('Paslepiama įkėlimo būsena');
            const loader = this.elements.content.querySelector('.loading');
            if (loader) loader.remove();
            this.debugLogEnd('Paslepiama įkėlimo būsena');
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida slepiant įkėlimo būseną:`, error);
        }
    }
    
    updatePageInfo(currentPage, totalPages) {
        try {
            this.debugLog('Atnaujinama puslapio informacija');
            if (this.elements.pageInfo) {
                this.elements.pageInfo.textContent = `${currentPage} / ${totalPages}`;
            }
            
            if (this.elements.paginationControls) {
                this.elements.paginationControls.style.display = 
                    totalPages > 1 ? 'flex' : 'none';
            }
            this.debugLogEnd('Atnaujinama puslapio informacija');
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida atnaujinant puslapio informaciją:`, error);
        }
    }
    
    setContent(html) {
        try {
            this.debugLog('Nustatomas turinys');
            this.elements.content.innerHTML = html;
            this.debugLogEnd('Nustatomas turinys');
            return this.elements.content.querySelector('.paginated-content');
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida nustatant turinį:`, error);
            return null;
        }
    }
    
    showExportButton(show = true) {
        try {
            if (this.elements.exportButton) {
                this.elements.exportButton.style.display = show ? 'block' : 'none';
            }
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida rodant/slepiant eksporto mygtuką:`, error);
        }
    }
    
    showSavedTextsButton(show = true) {
        try {
            if (this.elements.savedTextsButton) {
                this.elements.savedTextsButton.style.display = show ? 'block' : 'none';
            }
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida rodant/slepiant išsaugotų tekstų mygtuką:`, error);
        }
    }
    
    displaySearchResults(results) {
        try {
            this.debugLog('Rodomi paieškos rezultatai');
            if (!this.elements.searchResults) return;
            
            let html = '<div class="search-results">';
            
            if (results.length > 0) {
                results.forEach(result => {
                    html += `
                        <div class="search-item ${result.type}-section">
                            <div class="pattern">${result.pattern}</div>
                            <div class="info">
                                <div>Vertimas: ${result.info.vertimas}</div>
                                <div>CEFR: ${result.info.CEFR}</div>
                            </div>
                            ${result.related.length > 0 ? `
                                <div class="related">
                                    <div>Susiję:</div>
                                    ${result.related.map(r => `
                                        <span>${r.pattern} (${r.type})</span>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `;
                });
            } else {
                html += '<div class="no-results">Nieko nerasta</div>';
            }
            
            html += '</div>';
            this.elements.searchResults.innerHTML = html;
            this.debugLogEnd('Rodomi paieškos rezultatai');
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida rodant paieškos rezultatus:`, error);
        }
    }
    
    updateDictionaryList(dictionaries) {
        try {
            this.debugLog('Atnaujinamas žodynų sąrašas');
            if (!this.elements.dictionaryList) return;
            
            this.elements.dictionaryList.innerHTML = dictionaries.map(dict => `
                <div class="dictionary-item">
                    <div class="dictionary-info">
                        <span class="dictionary-name">${dict.name}</span>
                        <span class="dictionary-count">${dict.entries} įrašų</span>
                    </div>
                    <button class="remove-dictionary" data-name="${dict.name}">
                        Šalinti
                    </button>
                </div>
            `).join('');
            
            // Pridedame event listeners šalinimo mygtukams
            const removeButtons = this.elements.dictionaryList.querySelectorAll('.remove-dictionary');
            removeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const dictionaryName = button.getAttribute('data-name');
                    if (this.onDictionaryRemove) {
                        this.onDictionaryRemove(dictionaryName);
                    }
                });
            });
            
            this.debugLogEnd('Atnaujinamas žodynų sąrašas');
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida atnaujinant žodynų sąrašą:`, error);
        }
    }
    
    updateDictionaryStats(stats) {
        try {
            this.debugLog('Atnaujinama žodynų statistika');
            if (!this.elements.dictionaryStats) return;
            
            this.elements.dictionaryStats.innerHTML = `
                <div class="stats-container">
                    <div class="stats-item">
                        <span class="stats-label">Žodžių:</span>
                        <span class="stats-value">${stats.totalWords}</span>
                    </div>
                    <div class="stats-item">
                        <span class="stats-label">Frazių:</span>
                        <span class="stats-value">${stats.totalPhrases}</span>
                    </div>
                    <div class="stats-item">
                        <span class="stats-label">Žodynų:</span>
                        <span class="stats-value">${stats.loadedDictionaries}</span>
                    </div>
                </div>
            `;
            this.debugLogEnd('Atnaujinama žodynų statistika');
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida atnaujinant žodynų statistiką:`, error);
        }
    }
    
    showError(message) {
        try {
            this.debugLog('Rodoma klaida');
            console.warn('Klaidos pranešimas:', message);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = message;
            this.elements.content.insertAdjacentElement('afterbegin', errorDiv);
            setTimeout(() => errorDiv.remove(), 5000);
            this.debugLogEnd('Rodoma klaida');
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida rodant klaidos pranešimą:`, error);
        }
    }
    
    handleError(error) {
        try {
            console.error('Klaida:', error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = `Klaida: ${error.message}`;
            this.elements.content.replaceChildren(errorDiv);
        } catch (err) {
            console.error(`${this.CLASS_NAME} Klaida apdorojant klaidą:`, err);
        }
    }
    
    disableFileInput(disable = true) {
        try {
            if (this.elements.fileInput) {
                this.elements.fileInput.disabled = disable;
            }
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida keičiant failo įvedimo lauką:`, error);
        }
    }
    
    resetFileInput() {
        try {
            if (this.elements.fileInput) {
                this.elements.fileInput.value = '';
            }
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida nustatant failo įvedimo lauką:`, error);
        }
    }
    
    addWordInfoPopup(element, info) {
        try {
            element.addEventListener('click', (e) => {
                const popup = document.createElement('div');
                popup.className = 'word-info-popup';
                
                if (info.meanings) {
                    // Homonimų rodymas
                    popup.innerHTML = `
                        <div class="popup-title">${info.text}</div>
                        ${info.meanings.map(meaning => `
                            <div class="meaning-item">
                                <div class="kalbos-dalis">${meaning["kalbos dalis"]}</div>
                                <div>Vertimas: ${meaning.vertimas}</div>
                                <div>Bazinė forma: ${meaning["bazinė forma"]}</div>
                                <div>Bazės vertimas: ${meaning["bazė vertimas"]}</div>
                                <div>CEFR: ${meaning.CEFR}</div>
                            </div>
                        `).join('')}
                    `;
                } else {
                    // Paprastas žodis/frazė
                    popup.innerHTML = `
                        <div class="popup-title">${info.text}</div>
                        <div>Vertimas: ${info.vertimas}</div>
                        <div>Bazinė forma: ${info["bazinė forma"]}</div>
                        <div>Bazės vertimas: ${info["bazė vertimas"]}</div>
                        <div>CEFR: ${info.CEFR}</div>
                    `;
                }
                
                // Pozicionuojame popupą
                popup.style.position = 'absolute';
                popup.style.left = `${e.pageX}px`;
                popup.style.top = `${e.pageY}px`;
                
                document.body.appendChild(popup);
                
                // Uždarome popupą paspaudus kitur
                const closePopup = () => {
                    popup.remove();
                    document.removeEventListener('click', closePopup);
                };
                setTimeout(() => document.addEventListener('click', closePopup), 0);
            });
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida pridedant žodžio info popupą:`, error);
        }
    }
}
