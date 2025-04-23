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
        
        const initStart = performance.now();
        this.initUI();
        this.bindEvents();
        const initEnd = performance.now();
        console.log(`${this.CLASS_NAME} Inicializavimas užtruko: ${(initEnd - initStart).toFixed(2)}ms`);
        
        if (DEBUG) console.log(`${this.CLASS_NAME} Konstruktorius inicializuotas`);
        
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
        const startTime = performance.now();
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
        
        const endTime = performance.now();
        console.log(`${this.CLASS_NAME} UI elementų inicializacija užtruko: ${(endTime - startTime).toFixed(2)}ms`);
        this.debugLog('UI elementai sėkmingai inicializuoti');
    }

    bindEvents() {
        const startTime = performance.now();
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

        const endTime = performance.now();
        console.log(`${this.CLASS_NAME} Įvykių prijungimas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
        this.debugLog('Įvykių klausytojai sėkmingai prijungti');
    }

    async loadDefaultDictionaries() {
        const startTime = performance.now();
        try {
            this.debugLog('Įkeliami numatytieji žodynai...')
            
            // Pirma įkeliam visus žodynus
            const fetchStart = performance.now();
            const wordsResponse = await fetch('./words.json');
            const wordsBlob = await wordsResponse.blob();
            const wordsFile = new File([wordsBlob], 'words.json', { type: 'application/json' });
            
            const phrasesResponse = await fetch('./phrases.json');
            const phrasesBlob = await phrasesResponse.blob();
            const phrasesFile = new File([phrasesBlob], 'phrases.json', { type: 'application/json' });
            const fetchEnd = performance.now();
            console.log(`${this.CLASS_NAME} Žodynų parsisiuntimas užtruko: ${(fetchEnd - fetchStart).toFixed(2)}ms`);

            // Įkeliam žodžius ir frazes
            const loadStart = performance.now();
            await this.dictionaryManager.loadDictionaries([wordsFile, phrasesFile]);
            const loadEnd = performance.now();
            console.log(`${this.CLASS_NAME} Žodynų įkėlimas užtruko: ${(loadEnd - loadStart).toFixed(2)}ms`);
            
            this.loadedFiles.add('words.json');
            this.loadedFiles.add('phrases.json');
            
            const updateStart = performance.now();
            this.updateDictionaryList();
            this.updateDictionaryStats();
            const updateEnd = performance.now();
            console.log(`${this.CLASS_NAME} Žodynų sąrašo atnaujinimas užtruko: ${(updateEnd - updateStart).toFixed(2)}ms`);
            
            const endTime = performance.now();
            console.log(`${this.CLASS_NAME} Bendras žodynų įkėlimo laikas: ${(endTime - startTime).toFixed(2)}ms`);
            this.debugLog('Numatytieji žodynai sėkmingai įkelti');
        } catch (error) {
            console.error('Klaida įkeliant žodynus:', error);
        }
    }

    saveLastPage(pageNumber) {
        const startTime = performance.now();
        // Išsaugome naują būseną su atnaujintu puslapiu
        this.stateManager.saveBookState({
            text: this.currentText,
            fileName: this.currentFileName,
            lastPage: pageNumber,
            highlights: this.textHighlighter.saveHighlights()
        });
        const endTime = performance.now();
        console.log(`${this.CLASS_NAME} Puslapio išsaugojimas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
        this.debugLog('Išsaugotas puslapis:', pageNumber);
    }

    getLastPage() {
        const startTime = performance.now();
        // Patikriname ar yra išsaugota būsena
        const savedState = this.stateManager.loadBookState();
        let result;
        
        if (savedState && savedState.fileName === this.currentFileName) {
            result = {
                pageNumber: savedState.lastPage || 1,
                fileName: savedState.fileName
            };
        } else {
            // Jei nėra išsaugotos būsenos, grąžiname numatytuosius
            result = {
                pageNumber: 1,
                fileName: ''
            };
        }
        
        const endTime = performance.now();
        console.log(`${this.CLASS_NAME} Paskutinio puslapio gavimas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
        return result;
    }

    async initializeBookState() {
        const startTime = performance.now();
        this.debugLog('Pradedama knygos būsenos inicializacija');
        const savedState = this.stateManager.loadBookState();
        if (!savedState) {
            console.log(`${this.CLASS_NAME} Nerasta išsaugota knygos būsena, inicializacija užtruko: ${(performance.now() - startTime).toFixed(2)}ms`);
            return;
        }

        try {
            // Nustatome pradinius duomenis
            this.currentFileName = savedState.fileName;
            this.currentText = savedState.text;

            const normalizeStart = performance.now();
            const normalizedText = this.normalizer.normalizeMarkdown(this.currentText);
            const normalizeEnd = performance.now();
            console.log(`${this.CLASS_NAME} Teksto normalizavimas užtruko: ${(normalizeEnd - normalizeStart).toFixed(2)}ms`);
            this.debugLog('Tekstas normalizuotas');

            // Paraleliai vykdome žodynų įkėlimą ir HTML konvertavimą
            const parallelStart = performance.now();
            const [_, html] = await Promise.all([
                this.loadDefaultDictionaries(),
                this.htmlConverter.convertToHtml(normalizedText)
            ]);
            const parallelEnd = performance.now();
            console.log(`${this.CLASS_NAME} Lygiagretus žodynų ir HTML konversijos įkėlimas užtruko: ${(parallelEnd - parallelStart).toFixed(2)}ms`);

            // Kai turime žodynus, atliekame statistikos skaičiavimus
            const statsStart = performance.now();
            const knownWords = this.dictionaryManager.getDictionaryWords();
            const textStats = this.textStatistics.calculateStats(this.currentText, knownWords);
            const statsEnd = performance.now();
            console.log(`${this.CLASS_NAME} Statistikos skaičiavimas užtruko: ${(statsEnd - statsStart).toFixed(2)}ms`);

            const contentStart = performance.now();
            this.setContent(html, textStats, { 
                highlights: savedState.highlights
            });
            const contentEnd = performance.now();
            console.log(`${this.CLASS_NAME} Turinio nustatymas užtruko: ${(contentEnd - contentStart).toFixed(2)}ms`);

            const uiStart = performance.now();
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
            const uiEnd = performance.now();
            console.log(`${this.CLASS_NAME} UI atnaujinimas užtruko: ${(uiEnd - uiStart).toFixed(2)}ms`);

            const endTime = performance.now();
            console.log(`${this.CLASS_NAME} Bendra knygos būsenos inicializacija užtruko: ${(endTime - startTime).toFixed(2)}ms`);
        } catch (error) {
            console.error('Klaida atkuriant knygos būseną:', error);
            this.stateManager.clearBookState();
            console.log(`${this.CLASS_NAME} Nepavyko inicializuoti knygos būsenos, užtruko: ${(performance.now() - startTime).toFixed(2)}ms`);
        }
    }

    async handleFile(e) {
        const startTime = performance.now();
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
            
            // Puslapio nustatymas
            const pageStart = performance.now();
            const lastPage = this.getLastPage();
            if (lastPage.fileName === file.name) {
                this.debugLog('Rastas paskutinis skaitytas puslapis:', lastPage.pageNumber);
                this.paginator.goToPage(lastPage.pageNumber);
            }
            const pageEnd = performance.now();
            console.log(`${this.CLASS_NAME} Puslapio nustatymas užtruko: ${(pageEnd - pageStart).toFixed(2)}ms`);
            
            // Failo skaitymas
            const readStart = performance.now();
            const rawText = await this.reader.readFile(file);
            const readEnd = performance.now();
            console.log(`${this.CLASS_NAME} Failo skaitymas užtruko: ${(readEnd - readStart).toFixed(2)}ms`);
            this.debugLog('Failas nuskaitytas, teksto ilgis:', rawText.length);
            
            // Teksto normalizavimas
            const normalizeStart = performance.now();
            const normalizedText = this.normalizer.normalizeMarkdown(rawText);
            const normalizeEnd = performance.now();
            console.log(`${this.CLASS_NAME} Teksto normalizavimas užtruko: ${(normalizeEnd - normalizeStart).toFixed(2)}ms`);
            this.debugLog('Tekstas normalizuotas');
            this.currentText = normalizedText;
            
            // Skaičiuojame teksto statistiką
            this.debugLog('Pradedamas teksto statistikos skaičiavimas');
            const statsStart = performance.now();
            const knownWords = this.dictionaryManager.getDictionaryWords();
            const textStats = this.textStatistics.calculateStats(normalizedText, knownWords);
            const statsEnd = performance.now();
            console.log(`${this.CLASS_NAME} Statistikos skaičiavimas užtruko: ${(statsEnd - statsStart).toFixed(2)}ms`);
            this.debugLog('Teksto statistika:', textStats);
            
            // Rodome žodyno mygtuką kai įkeliama knyga
            const uiStart = performance.now();
            const savedTextsButton = document.getElementById('savedTextsButton');
            if (savedTextsButton) {
                savedTextsButton.style.display = 'block';
                this.debugLog('Įjungtas išsaugotų tekstų mygtukas');
            }
            if (textStats.unknownWords > 0 && this.exportButton) {
                this.exportButton.style.display = 'block';
                this.debugLog('Įjungtas eksporto mygtukas, nežinomų žodžių:', textStats.unknownWords);
            }
            const uiEnd = performance.now();
            console.log(`${this.CLASS_NAME} UI elementų rodymas užtruko: ${(uiEnd - uiStart).toFixed(2)}ms`);

            // Ieškome žodžių ir frazių
            this.debugLog('Pradedama žodžių ir frazių paieška');
            const searchStart = performance.now();
            const { results, searchStats } = await this.dictionaryManager.findInText(normalizedText);
            const searchEnd = performance.now();
            console.log(`${this.CLASS_NAME} Žodžių paieška užtruko: ${(searchEnd - searchStart).toFixed(2)}ms`);
            this.debugLog('Paieškos rezultatai:', { rastiFrazių: results.length, paieškosLaikas: searchStats });
            
            // Konvertuojame į HTML
            this.debugLog('Pradedama konversija į HTML');
            const htmlStart = performance.now();
            const html = await this.htmlConverter.convertToHtml(normalizedText);
            const htmlEnd = performance.now();
            console.log(`${this.CLASS_NAME} HTML konversija užtruko: ${(htmlEnd - htmlStart).toFixed(2)}ms`);
            this.debugLog('HTML konversija baigta, ilgis:', html.length);
            
            // Nustatome turinį
            const contentStart = performance.now();
            this.setContent(html, textStats);
            const contentEnd = performance.now();
            console.log(`${this.CLASS_NAME} Turinio nustatymas užtruko: ${(contentEnd - contentStart).toFixed(2)}ms`);

            // Išsaugome būseną su pažymėjimais PO turinio nustatymo
            const saveStart = performance.now();
            const highlights = this.textHighlighter.saveHighlights();
            this.debugLog('Išsaugomi pažymėjimai:', highlights.length);
            
            this.stateManager.saveBookState({
                text: this.currentText,
                fileName: this.currentFileName,
                lastPage: this.paginator.getCurrentPage(),
                highlights: highlights
            });
            const saveEnd = performance.now();
            console.log(`${this.CLASS_NAME} Būsenos išsaugojimas užtruko: ${(saveEnd - saveStart).toFixed(2)}ms`);
            this.debugLog('Būsena išsaugota');

            // Bendras apdorojimo laikas
            const endTime = performance.now();
            console.log(`${this.CLASS_NAME} Bendras failo apdorojimo laikas: ${(endTime - startTime).toFixed(2)}ms`);

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

    async setContent(html, stats = {}, options = {}) {
        const startTime = performance.now();
        this.debugLog('Nustatomas naujas turinys...');
        
        // Naudojame UIManager.setContent metodą
        const pageData = await this.uiManager.setContent(html, stats, this.currentText, {
            textHighlighter: this.textHighlighter,
            paginator: this.paginator,
            onUpdatePageContent: (pageData) => this.updatePageContent(pageData),
            highlights: options.highlights
        });
        
        const endTime = performance.now();
        console.log(`${this.CLASS_NAME} Turinio nustatymas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
        return pageData;
    }

    _addWordInfoPopup(element, info) {
        element.addEventListener('click', (e) => {
            const popupStart = performance.now();
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
            
            const popupEnd = performance.now();
            console.log(`${this.CLASS_NAME} Popup sukūrimas užtruko: ${(popupEnd - popupStart).toFixed(2)}ms`);
        });
    }

    updatePageContent(pageData) {
        const startTime = performance.now();
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
            
        const endTime = performance.now();
        console.log(`${this.CLASS_NAME} Puslapio turinio atnaujinimas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
    }

    async handleExport() {
        const startTime = performance.now();
        try {
            // Gauname žinomus žodžius
            const wordsStart = performance.now();
            const knownWords = this.dictionaryManager.getDictionaryWords();
            // Gauname nežinomus žodžius
            const unknownWords = this.textStatistics.getUnknownWords(this.currentText, knownWords);
            const wordsEnd = performance.now();
            console.log(`${this.CLASS_NAME} Nežinomų žodžių radimas užtruko: ${(wordsEnd - wordsStart).toFixed(2)}ms`);
            this.debugLog("Nežinomų žodžių kiekis:", unknownWords.length);

            // Perduodame originalų tekstą ir nežinomus žodžius į eksporterį
            const processStart = performance.now();
            this.unknownWordsExporter.processText(this.currentText, unknownWords);
            const processEnd = performance.now();
            console.log(`${this.CLASS_NAME} Nežinomų žodžių apdorojimas užtruko: ${(processEnd - processStart).toFixed(2)}ms`);
            
            const exportStart = performance.now();
            this.unknownWordsExporter.exportToTxt();
            const exportEnd = performance.now();
            console.log(`${this.CLASS_NAME} Nežinomų žodžių eksportavimas užtruko: ${(exportEnd - exportStart).toFixed(2)}ms`);
            
            this.debugLog('Nežinomi žodžiai eksportuoti sėkmingai');
            
            const endTime = performance.now();
            console.log(`${this.CLASS_NAME} Visas eksportavimo procesas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
        } catch(error) {
            console.error('Klaida eksportuojant nežinomus žodžius:', error);
            this.showError('Klaida eksportuojant nežinomus žodžius');
        }
    }

    async handleDictionaryFiles(e) {
        const startTime = performance.now();
        const files = Array.from(e.target.files);
        
        try {
            let totalEntriesLoaded = 0;
            
            for (const file of files) {
                if (this.loadedFiles.has(file.name)) {
                    console.warn(`Žodynas ${file.name} jau įkeltas`);
                    continue;
                }

                this.debugLog(`Įkeliamas žodynas: ${file.name}`);
                const fileStart = performance.now();
                const result = await this.dictionaryManager.loadDictionary(file);
                const fileEnd = performance.now();
                console.log(`${this.CLASS_NAME} Žodyno "${file.name}" įkėlimas užtruko: ${(fileEnd - fileStart).toFixed(2)}ms`);
                
                this.loadedFiles.add(file.name);
                totalEntriesLoaded += result.entries;
            }
            
            const updateStart = performance.now();
            this.updateDictionaryList();
            this.updateDictionaryStats();
            const updateEnd = performance.now();
            console.log(`${this.CLASS_NAME} Žodynų sąrašo atnaujinimas užtruko: ${(updateEnd - updateStart).toFixed(2)}ms`);
            
            const endTime = performance.now();
            console.log(`${this.CLASS_NAME} Žodynų įkėlimas užtruko: ${(endTime - startTime).toFixed(2)}ms, įkelti ${totalEntriesLoaded} įrašai`);
        } catch (error) {
            console.error('Klaida įkeliant žodynus:', error);
            this.showError(`Klaida įkeliant žodyną: ${error.message}`);
        }
        
        this.dictionaryInput.value = '';
    }

    async handleWordSearch() {
        const startTime = performance.now();
        const text = this.wordSearchInput.value.trim();
        if (!text) {
            this.searchResults.innerHTML = '';
            return;
        }

        try {
            const searchStart = performance.now();
            const { results, stats } = await this.dictionaryManager.findInText(text);
            const searchEnd = performance.now();
            console.log(`${this.CLASS_NAME} Žodžio paieška užtruko: ${(searchEnd - searchStart).toFixed(2)}ms`);
            this.debugLog('Paieškos laikas:', stats.searchTimeMs, 'ms');
            
            const displayStart = performance.now();
            this.displaySearchResults(results);
            const displayEnd = performance.now();
            console.log(`${this.CLASS_NAME} Paieškos rezultatų atvaizdavimas užtruko: ${(displayEnd - displayStart).toFixed(2)}ms`);
            
            const endTime = performance.now();
            console.log(`${this.CLASS_NAME} Bendra paieškos užklausa užtruko: ${(endTime - startTime).toFixed(2)}ms`);
        } catch (error) {
            this.showError(`Klaida ieškant: ${error.message}`);
        }
    }

    displaySearchResults(results) {
        const startTime = performance.now();
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
        
        const endTime = performance.now();
        console.log(`${this.CLASS_NAME} Paieškos rezultatų atvaizdavimas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
    }

    renderDictionaryGroup(dictionary, isPhrase) {
        const startTime = performance.now();
        const html = `<div class="dictionary-group ${isPhrase ? 'phrases' : 'words'}">
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
        
        const endTime = performance.now();
        console.log(`${this.CLASS_NAME} Žodyno grupės generavimas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
        return html;
    }

    updateDictionaryList() {
        const startTime = performance.now();
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
        
        const endTime = performance.now();
        console.log(`${this.CLASS_NAME} Žodynų sąrašo atnaujinimas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
    }

    updateDictionaryStats() {
        const startTime = performance.now();
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
        
        const endTime = performance.now();
        console.log(`${this.CLASS_NAME} Žodynų statistikos atnaujinimas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
    }

    removeDictionary(name) {
        const startTime = performance.now();
        if (this.dictionaryManager.removeDictionary(name)) {
            this.loadedFiles.delete(name);
            this.updateDictionaryList();
            this.updateDictionaryStats();
            this.debugLog(`Žodynas pašalintas: ${name}`);
        }
        const endTime = performance.now();
        console.log(`${this.CLASS_NAME} Žodyno pašalinimas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
    }

    handleError(error) {
        const startTime = performance.now();
        console.error('Klaida:', error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = `Klaida: ${error.message}`;
        this.content.replaceChildren(errorDiv);
        const endTime = performance.now();
        console.log(`${this.CLASS_NAME} Klaidos apdorojimas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
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
    const appStart = performance.now();
    window.app = new App();
    const appEnd = performance.now();
    console.log(`[DOMContentLoaded] Aplikacijos inicializavimas užtruko: ${(appEnd - appStart).toFixed(2)}ms`);
});
