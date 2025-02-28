// main.js
const DEBUG = true;  // arba false true kai norėsime išjungti

import { UIManager } from './ui-manager.js';
import { FileManager } from './file-manager.js';
import { TextProcessor } from './text-processor.js';
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
        this.fileManager = new FileManager();
        this.textProcessor = new TextProcessor();
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
        
        // Perduodame reikalingus komponentus į UI Manager
        this.uiManager.setComponents({
            textHighlighter: this.textHighlighter,
            paginator: this.paginator
        });
        
        this.isProcessing = false;
        this.currentText = '';
        this.currentFileName = '';
        
        // Inicializacija
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
        
        // Klausomės FileManager progreso
        this.fileManager.events.addEventListener('progress', (e) => this.updateProgress(e.detail));

        this.debugLog('Įvykių klausytojai sėkmingai prijungti');
    }

    async loadDefaultDictionaries() {
        try {
            this.debugLog('Įkeliami numatytieji žodynai...')
            
            // Patikriname, ar žodynai jau įkelti
            if (this.fileManager.isFileLoaded('words.json') && 
                this.fileManager.isFileLoaded('phrases.json')) {
                this.debugLog('Žodynai jau įkelti, praleidžiama');
                return;
            }
            
            // Pirma įkeliam visus žodynus
            const wordsResponse = await fetch('./words.json');
            const wordsBlob = await wordsResponse.blob();
            const wordsFile = new File([wordsBlob], 'words.json', { type: 'application/json' });
            
            const phrasesResponse = await fetch('./phrases.json');
            const phrasesBlob = await phrasesResponse.blob();
            const phrasesFile = new File([phrasesBlob], 'phrases.json', { type: 'application/json' });

            // Įkeliam žodžius ir frazes
            await this.dictionaryManager.loadDictionaries([wordsFile, phrasesFile]);
            
            // Pažymime failus kaip įkeltus FileManager klasėje
            this.fileManager.markFileAsLoaded('words.json');
            this.fileManager.markFileAsLoaded('phrases.json');
            
            this.updateDictionaryList();
            this.updateDictionaryStats();
            
            this.debugLog('Numatytieji žodynai sėkmingai įkelti');
        } catch (error) {
            console.error('Klaida įkeliant žodynus:', error);
            this.uiManager.showError(`Klaida įkeliant žodynus: ${error.message}`);
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

            // Pritaikome pažymėjimus
            const processedHtml = await this.textHighlighter.processText(
                this.currentText, 
                html,
                savedState.highlights
            );

            // Nustatome turinį ir mygtukus (naudojame UIManager)
            const pageData = await this.uiManager.setContent(processedHtml, textStats, this.currentText);

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
            if (this.isProcessing) {
                console.warn('Atšaukiama esama užklausa...');
                this.reader.abort(); // Naudojame reader.abort() - tai teisingas metodas
            }
            
            this.isProcessing = true;
            this.fileInput.disabled = true;
            this.uiManager.showLoadingState();
            
            const file = e.target.files[0];
            if (!file) {
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
            
            // Naudojame TextReader (ne FileManager) teksto skaitymui,
            // nes jis turi papildomų funkcijų kaip normalizavimas
            const rawText = await this.reader.readFile(file);
            this.debugLog('Failas nuskaitytas, teksto ilgis:', rawText.length);
            
            // Kiti metodai lieka nepakitę, nes TextReader jau atliko normalizavimą
            this.currentText = rawText;
            
            // Skaičiuojame teksto statistiką
            this.debugLog('Pradedamas teksto statistikos skaičiavimas');
            const knownWords = this.dictionaryManager.getDictionaryWords();
            const textStats = this.textStatistics.calculateStats(rawText, knownWords);
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
            const { results, searchStats } = await this.dictionaryManager.findInText(rawText);
            this.debugLog('Paieškos rezultatai:', { rastiFrazių: results.length, paieškosLaikas: searchStats });
            
            // Konvertuojame į HTML
            this.debugLog('Pradedama konversija į HTML');
           const html = await this.textProcessor.convertToHtml(rawText);
           this.debugLog('HTML konversija baigta, ilgis:', html.length);
            
            // Naudojame UIManager setContent metodą
           await this.uiManager.setContent(html, textStats, this.currentText);

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
            console.error('Klaida:', error);
            this.uiManager.showError(`Klaida: ${error.message}`);
        } finally {
            this.isProcessing = false;
            this.fileInput.disabled = false;
            this.fileInput.value = '';
            this.uiManager.hideLoadingState();
            this.debugLog('Failo apdorojimas baigtas');
        }
    }

    updatePageContent(pageData) {
        // Naudojame UIManager updatePageContent metodą
        this.uiManager.updatePageContent(pageData);
        this.saveLastPage(pageData.currentPage);
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
            this.uiManager.showError('Klaida eksportuojant nežinomus žodžius');
        }
    }

    async handleDictionaryFiles(e) {
        const files = Array.from(e.target.files);
        
        try {
            for (const file of files) {
                // Naudojame fileManager.isFileLoaded vietoj this.loadedFiles.has
                if (this.fileManager.isFileLoaded(file.name)) {
                    console.warn(`Žodynas ${file.name} jau įkeltas`);
                    continue;
                }

                this.debugLog(`Įkeliamas žodynas: ${file.name}`);
                const result = await this.dictionaryManager.loadDictionary(file);
                // Naudojame fileManager.markFileAsLoaded vietoj this.loadedFiles.add
                this.fileManager.markFileAsLoaded(file.name);
                
                this.updateDictionaryList();
                this.updateDictionaryStats();
            }
        } catch (error) {
            console.error('Klaida įkeliant žodynus:', error);
            this.uiManager.showError(`Klaida įkeliant žodyną: ${error.message}`);
        }
        
        if (this.dictionaryInput) {
            this.dictionaryInput.value = '';
        }
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
            
            // Naudojame UIManager.displaySearchResults
            this.uiManager.displaySearchResults(results);
        } catch (error) {
            this.uiManager.showError(`Klaida ieškant: ${error.message}`);
        }
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
            // Naudojame fileManager.removeLoadedFile vietoj this.loadedFiles.delete
            this.fileManager.removeLoadedFile(`${name}.json`);
            this.updateDictionaryList();
            this.updateDictionaryStats();
            this.debugLog(`Žodynas pašalintas: ${name}`);
        }
    }

    updateProgress({ percent }) {
        this.uiManager.updateProgress(percent);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
