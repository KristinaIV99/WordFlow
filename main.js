
// main.js
const DEBUG = true;  // arba false true kai norėsime išjungti

import { UIManager } from './ui-manager.js';
import { TextReader } from './text-reader.js';
import { TextNormalizer } from './text-normalizer.js';
import { HtmlConverter } from './html-converter.js';
import { DictionaryManager } from './dictionary-manager.js';
import { TextStatistics } from './text-statistics.js';
import { UnknownWordsExporter } from './unknown-words-exporter.js';
import { TextPaginator } from './text-paginator.js';
import { TextHighlighter } from './text-highlighter.js';
import { TextSelectionHandler } from './text-selection-handler.js';
import { StateManager } from './state-manager.js';

class App {
    constructor() {
        this.CLASS_NAME = '[App]';
        this.reader = new TextReader();
        this.normalizer = new TextNormalizer();
        this.htmlConverter = new HtmlConverter();
        this.dictionaryManager = new DictionaryManager();
        this.textStatistics = new TextStatistics();
        this.unknownWordsExporter = new UnknownWordsExporter();
        this.paginator = new TextPaginator({
            pageSize: 2000,
            onPageChange: (pageData) => this.updatePageContent(pageData)
        });
        this.textHighlighter = new TextHighlighter(this.dictionaryManager);
        this.textSelectionHandler = new TextSelectionHandler();
        this.stateManager = new StateManager();
        
        // Nauja UI Manager instancija
        this.uiManager = new UIManager();
        
        this.isProcessing = false;
        this.currentText = '';
        this.loadedFiles = new Set();
        this.currentFileName = '';
        
        if (DEBUG) console.log(`${this.CLASS_NAME} Konstruktorius inicializuotas`);
        this.initUI();
        this.bindEvents();
        this.initializeBookState().then(() => {
            if (!this.currentText) {
                this.loadDefaultDictionaries();
            }
        });
    }

    debugLog(...args) {
        if (DEBUG) {
            console.log(`${this.CLASS_NAME} [DEBUG]`, ...args);
        }
    }

    initUI() {
        this.debugLog('Inicializuojami UI elementai...');
        
        // Naudokite UIManager elementus, kurie jau inicializuoti
        this.fileInput = this.uiManager.fileInput;
        this.content = this.uiManager.content;
        this.dictionaryList = this.uiManager.dictionaryList;
        this.dictionaryStats = this.uiManager.dictionaryStats;
        this.wordSearchInput = this.uiManager.wordSearchInput;
        this.searchResults = this.uiManager.searchResults;
        this.exportButton = this.uiManager.exportButton;
        this.progressBar = this.uiManager.progressBar;
        
        // Inicializuokime puslapiavimo kontroles per UIManager
        this.uiManager.initPagination(this.paginator);
        this.paginationControls = this.uiManager.paginationControls;
        
        this.debugLog('UI elementai sėkmingai inicializuoti');
    }

    bindEvents() {
        this.debugLog('Prijungiami įvykių klausytojai...');

        // Naudojame UIManager bindEvents metodą
        this.uiManager.bindEvents({
            onFileChange: (e) => this.handleFile(e),
            onExport: () => this.handleExport(),
            onPrevPage: () => this.paginator.previousPage(),
            onNextPage: () => this.paginator.nextPage(),
            onWordSearch: () => this.handleWordSearch()
        });
        
        // Palikite reader.events klausytojus čia, nes jie susiję su failų skaitymu
        this.reader.events.addEventListener('progress', (e) => this.updateProgress(e.detail));

        this.debugLog('Įvykių klausytojai sėkmingai prijungti');
    }

    async loadDefaultDictionaries() {
        try {
            this.debugLog('Įkeliami numatytieji žodynai...')
            
            // Pirma įkeliam visus žodynus
            const wordsResponse = await fetch('./words.json');
            const wordsBlob = await wordsResponse.blob();
            const wordsFile = new File([wordsBlob], 'words.json', { type: 'application/json' });
            
            const phrasesResponse = await fetch('./phrases.json');
            const phrasesBlob = await phrasesResponse.blob();
            const phrasesFile = new File([phrasesBlob], 'phrases.json', { type: 'application/json' });

            // Įkeliam žodžius ir frazes
            await this.dictionaryManager.loadDictionaries([wordsFile, phrasesFile]);
            
            this.loadedFiles.add('words.json');
            this.loadedFiles.add('phrases.json');
            
            this.updateDictionaryList();
            this.updateDictionaryStats();
            
            this.debugLog('Numatytieji žodynai sėkmingai įkelti');
        } catch (error) {
            console.error('Klaida įkeliant žodynus:', error);
        }
    }

    saveLastPage(pageNumber) {
        // Išsaugome naują būseną su atnaujintu puslapiu
        this.stateManager.saveBookState({
            text: this.currentText,
            fileName: this.currentFileName,
            lastPage: pageNumber,
            highlights: this.textHighlighter.saveHighlights()
        });
        this.debugLog('Išsaugotas puslapis:', pageNumber);
    }

    getLastPage() {
        // Patikriname ar yra išsaugota būsena
        const savedState = this.stateManager.loadBookState();
        if (savedState && savedState.fileName === this.currentFileName) {
            return {
                pageNumber: savedState.lastPage || 1,
                fileName: savedState.fileName
            };
        }
        // Jei nėra išsaugotos būsenos, grąžiname numatytuosius
        return {
            pageNumber: 1,
            fileName: ''
        };
    }

    async initializeBookState() {
        this.debugLog('Pradedama knygos būsenos inicializacija');
        const savedState = this.stateManager.loadBookState();
        if (!savedState) return;

        try {
            // Nustatome pradinius duomenis
            this.currentFileName = savedState.fileName;
            this.currentText = savedState.text;

			const normalizedText = this.normalizer.normalizeMarkdown(this.currentText);
			this.debugLog('Tekstas normalizuotas');

            // Paraleliai vykdome žodynų įkėlimą ir HTML konvertavimą
            const [_, html] = await Promise.all([
                this.loadDefaultDictionaries(),
                this.htmlConverter.convertToHtml(normalizedText)
            ]);

            // Kai turime žodynus, atliekame statistikos skaičiavimus
            const knownWords = this.dictionaryManager.getDictionaryWords();
            const textStats = this.textStatistics.calculateStats(this.currentText, knownWords);

            this.setContent(html, textStats, { 
                highlights: savedState.highlights
            });

            const savedTextsButton = document.getElementById('savedTextsButton');
            if (savedTextsButton) {
                savedTextsButton.style.display = 'block';
            }

            if (textStats.unknownWords > 0 && this.exportButton) {
                this.exportButton.style.display = 'block';
            }

            // Nustatome puslapį pačiame gale
            if (savedState.lastPage) {
                setTimeout(() => {
                    this.paginator.goToPage(savedState.lastPage);
                }, 0);
            }

        } catch (error) {
            console.error('Klaida atkuriant knygos būseną:', error);
            this.stateManager.clearBookState();
        }
    }

    async handleFile(e) {
        try {
            if(this.isProcessing) {
                console.warn('Atšaukiama esama užklausa...');
                this.reader.abort();
            }
            
            this.isProcessing = true;
            this.fileInput.disabled = true;
            this.showLoadingState();
            
            const file = e.target.files[0];
            if(!file) {
                console.warn('Nepasirinktas failas');
                return;
            }
            
            this.debugLog('Pradedamas failo apdorojimas:', file.name);
            this.currentFileName = file.name;
            
            const lastPage = this.getLastPage();
            if (lastPage.fileName === file.name) {
                this.debugLog('Rastas paskutinis skaitytas puslapis:', lastPage.pageNumber);
                this.paginator.goToPage(lastPage.pageNumber);
            }
            
            const rawText = await this.reader.readFile(file);
			this.debugLog('Failas nuskaitytas, teksto ilgis:', rawText.length);
			
			const normalizedText = this.normalizer.normalizeMarkdown(rawText);
			this.debugLog('Tekstas normalizuotas');
			this.currentText = normalizedText;
            
            // Skaičiuojame teksto statistiką
            this.debugLog('Pradedamas teksto statistikos skaičiavimas');
            const knownWords = this.dictionaryManager.getDictionaryWords();
            const textStats = this.textStatistics.calculateStats(normalizedText, knownWords);
            this.debugLog('Teksto statistika:', textStats);
            
            // Rodome žodyno mygtuką kai įkeliama knyga
            const savedTextsButton = document.getElementById('savedTextsButton');
            if (savedTextsButton) {
                savedTextsButton.style.display = 'block';
                this.debugLog('Įjungtas išsaugotų tekstų mygtukas');
            }
            if (textStats.unknownWords > 0 && this.exportButton) {
                this.exportButton.style.display = 'block';
                this.debugLog('Įjungtas eksporto mygtukas, nežinomų žodžių:', textStats.unknownWords);
            }

            // Ieškome žodžių ir frazių
            this.debugLog('Pradedama žodžių ir frazių paieška');
            const { results, searchStats } = await this.dictionaryManager.findInText(normalizedText);
            this.debugLog('Paieškos rezultatai:', { rastiFrazių: results.length, paieškosLaikas: searchStats });
            
            // Konvertuojame į HTML
            this.debugLog('Pradedama konversija į HTML');
            const html = await this.htmlConverter.convertToHtml(normalizedText);
            this.debugLog('HTML konversija baigta, ilgis:', html.length);
            
            this.setContent(html, textStats);

            // Išsaugome būseną su pažymėjimais PO turinio nustatymo
            const highlights = this.textHighlighter.saveHighlights();
            this.debugLog('Išsaugomi pažymėjimai:', highlights.length);
            
            this.stateManager.saveBookState({
                text: this.currentText,
                fileName: this.currentFileName,
                lastPage: this.paginator.getCurrentPage(),
                highlights: highlights
            });
            this.debugLog('Būsena išsaugota');

        } catch(error) {
            this.debugLog('KLAIDA apdorojant failą:', error);
            this.handleError(error);
        } finally {
            this.isProcessing = false;
            this.fileInput.disabled = false;
            this.fileInput.value = '';
            this.hideLoadingState();
            this.debugLog('Failo apdorojimas baigtas');
        }
    }

    async setContent(html, stats = {}) {
        this.debugLog('Nustatomas naujas turinys...');
        
        // Naudojame UIManager.setContent metodą
         const pageData = await this.uiManager.setContent(html, stats, this.currentText, {
            textHighlighter: this.textHighlighter,
            paginator: this.paginator,
            onUpdatePageContent: (pageData) => this.updatePageContent(pageData)
            highlights: options.highlights
        });
        
        return pageData;
    }

    _addWordInfoPopup(element, info) {
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
    }

    updatePageContent(pageData) {
        const contentDiv = document.querySelector('.paginated-content');
        if (!contentDiv) return;
        
        contentDiv.innerHTML = pageData.content;
        
        this.saveLastPage(pageData.currentPage);
        
        const pageInfo = this.paginationControls.querySelector('.page-info');
        pageInfo.textContent = `${pageData.currentPage} / ${pageData.totalPages}`;
        
        // Atnaujinti slankiklį
        this.paginator.updateSlider();
        
        this.paginationControls.style.display = 
            pageData.totalPages > 1 ? 'flex' : 'none';
    }

    async handleExport() {
        try {
            const knownWords = this.dictionaryManager.getDictionaryWords();
            // Gauname nežinomus žodžius
            const unknownWords = this.textStatistics.getUnknownWords(this.currentText, knownWords);
            this.debugLog("Nežinomų žodžių kiekis:", unknownWords.length);

            // Perduodame originalų tekstą ir nežinomus žodžius į eksporterį
            this.unknownWordsExporter.processText(this.currentText, unknownWords);
            this.unknownWordsExporter.exportToTxt();
            
            this.debugLog('Nežinomi žodžiai eksportuoti sėkmingai');
        } catch(error) {
            console.error('Klaida eksportuojant nežinomus žodžius:', error);
            this.showError('Klaida eksportuojant nežinomus žodžius');
        }
    }

    async handleDictionaryFiles(e) {
        const files = Array.from(e.target.files);
        
        try {
            for (const file of files) {
                if (this.loadedFiles.has(file.name)) {
                    console.warn(`Žodynas ${file.name} jau įkeltas`);
                    continue;
                }

                this.debugLog(`Įkeliamas žodynas: ${file.name}`);
                const result = await this.dictionaryManager.loadDictionary(file);
                this.loadedFiles.add(file.name);
                
                this.updateDictionaryList();
                this.updateDictionaryStats();
            }
        } catch (error) {
            console.error('Klaida įkeliant žodynus:', error);
            this.showError(`Klaida įkeliant žodyną: ${error.message}`);
        }
        
        this.dictionaryInput.value = '';
    }

    async handleWordSearch() {
        const text = this.wordSearchInput.value.trim();
        if (!text) {
            this.searchResults.innerHTML = '';
            return;
        }

        try {
            const { results, stats } = await this.dictionaryManager.findInText(text);
            this.debugLog('Paieškos laikas:', stats.searchTimeMs, 'ms');
            this.displaySearchResults(results);
        } catch (error) {
            this.showError(`Klaida ieškant: ${error.message}`);
        }
    }

    displaySearchResults(results) {
        if (!this.searchResults) return;
        
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
        this.searchResults.innerHTML = html;
    }

    renderDictionaryGroup(dictionary, isPhrase) {
        return `<div class="dictionary-group ${isPhrase ? 'phrases' : 'words'}">
            <h4>${dictionary.dictionary}</h4>
            ${dictionary.matches.map(match => `
                <div class="match-item">
                    <div class="match-header">
                        <strong>${match.word}</strong>
                        <span class="cefr-badge">${match.CEFR || 'N/A'}</span>
                    </div>
                    <div class="match-details">
                        <div>Vertimas: ${match.vertimas}</div>
                        <div>Kalbos dalis: ${match['kalbos dalis']}</div>
                        <div>Bazinė forma: ${match['bazinė forma']}</div>
                        <div>Bazės vertimas: ${match['bazė vertimas']}</div>
                    </div>
                </div>
            `).join('')}
        </div>`;
    }

    updateDictionaryList() {
        if (!this.dictionaryList) return;

        const dictionaries = this.dictionaryManager.getDictionaryList();
        this.dictionaryList.innerHTML = dictionaries.map(dict => `
            <div class="dictionary-item">
                <div class="dictionary-info">
                    <span class="dictionary-name">${dict.name}</span>
                    <span class="dictionary-count">${dict.entries} įrašų</span>
                </div>
                < onclick="window.app.removeDictionary('${dict.name}')" class="remove-">
                    Šalinti
                </>
            </div>
        `).join('');
    }

    updateDictionaryStats() {
        if (!this.dictionaryStats) return;

        const stats = this.dictionaryManager.getStatistics();
        this.dictionaryStats.innerHTML = `
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
    }

    removeDictionary(name) {
        if (this.dictionaryManager.removeDictionary(name)) {
            this.loadedFiles.delete(name);
            this.updateDictionaryList();
            this.updateDictionaryStats();
            this.debugLog(`Žodynas pašalintas: ${name}`);
        }
    }

    handleError(error) {
        console.error('Klaida:', error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = `Klaida: ${error.message}`;
        this.content.replaceChildren(errorDiv);
    }

    updateProgress({ percent }) {
        this.uiManager.updateProgress(percent);
    }

    showLoadingState() {
        this.debugLog('Rodoma įkėlimo būsena...');
        this.uiManager.showLoadingState();
    }

    hideLoadingState() {
        this.debugLog('Paslepiama įkėlimo būsena');
        this.uiManager.hideLoadingState();
    }

    showError(message) {
        this.uiManager.showError(message);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
