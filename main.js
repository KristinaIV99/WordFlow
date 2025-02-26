// main.js
const DEBUG = true;  // arba false true kai norėsime išjungti

import { UIManager } from './ui-manager.js';
import { FileManager } from './file-manager.js';
import { TextNormalizer, HtmlConverter, TextPaginator } from './text-processor.js';
import { DictionaryManager } from './dictionary-manager.js';
import { TextStatistics } from './text-statistics.js';
import { UnknownWordsExporter } from './unknown-words-exporter.js';
import { TextHighlighter } from './text-highlighter.js';
import { TextSelectionHandler } from './text-selection-handler.js';
import { StateManager } from './state-manager.js';

class App {
    constructor() {
        this.CLASS_NAME = '[App]';
        this.debugLog('Konstruktorius inicializuotas');
        
        // Modulių inicializacija
        this.initializeModules();
        
        // Kintamieji
        this.isProcessing = false;
        this.currentText = '';
        this.currentFileName = '';
        
        // Aplikacijos paleidimas
        this.initializeBookState().then(() => {
            if (!this.currentText) {
                this.loadDefaultDictionaries();
            }
        });
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
    
    initializeModules() {
        try {
            this.debugLog('Inicializuojami moduliai');
            const startTime = performance.now();
            
            // Teksto apdorojimo moduliai
            this.normalizer = new TextNormalizer();
            this.htmlConverter = new HtmlConverter();
            this.paginator = new TextPaginator({
                pageSize: 2000,
                onPageChange: (pageData) => this.updatePageContent(pageData)
            });
            
            // Failų valdymo modulis
            this.fileManager = new FileManager();
            this.fileManager.events.addEventListener('progress', (e) => this.updateProgress(e.detail));
            
            // Žodynų moduliai
            this.dictionaryManager = new DictionaryManager();
            this.textStatistics = new TextStatistics();
            this.unknownWordsExporter = new UnknownWordsExporter();
            
            // Teksto žymėjimo moduliai
            this.textHighlighter = new TextHighlighter(this.dictionaryManager);
            this.textSelectionHandler = new TextSelectionHandler();
            
            // Būsenos valdymo modulis
            this.stateManager = new StateManager();
            
            // UI valdymo modulis (paskutinis, nes reikia visų kitų modulių)
            this.uiManager = new UIManager({
                onFileSelect: (e) => this.handleFile(e),
                onExport: () => this.handleExport(),
                onPreviousPage: () => this.paginator.previousPage(),
                onNextPage: () => this.paginator.nextPage(),
                onWordSearch: (text) => this.handleWordSearch(text),
                onDictionaryRemove: (name) => this.removeDictionary(name)
            });
            
            // Prijungiame slankiklį iš paginator į UI
            const slider = this.paginator.initializeSlider();
            this.uiManager.insertSlider(slider);
            
            const endTime = performance.now();
            this.debugLog(`Moduliai inicializuoti, užtruko: ${endTime - startTime} ms`);
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida inicializuojant modulius:`, error);
            throw error;
        } finally {
            this.debugLogEnd('Inicializuojami moduliai');
        }
    }
    
    async loadDefaultDictionaries() {
        try {
            this.debugLog('Įkeliami numatytieji žodynai');
            const startTime = performance.now();
            
            // Įkeliame žodynus per failų valdymo modulį
            const dictionaryFiles = await this.fileManager.loadDefaultDictionaries();
            
            // Perduodame žodynus į žodynų modulį
            await this.dictionaryManager.loadDictionaries(dictionaryFiles);
            
            // Atnaujiname UI
            this.updateDictionaryList();
            this.updateDictionaryStats();
            
            const endTime = performance.now();
            this.debugLog(`Numatytieji žodynai įkelti, užtruko: ${endTime - startTime} ms`);
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida įkeliant numatytuosius žodynus:`, error);
            this.uiManager.showError(`Klaida įkeliant žodynus: ${error.message}`);
        }
    }
    
    async initializeBookState() {
        try {
            this.debugLog('Pradedama knygos būsenos inicializacija');
            const startTime = performance.now();
            
            const savedState = this.stateManager.loadBookState();
            if (!savedState) return;
            
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
            
            // Nustatome turinį ir mygtukus
            this.setContent(processedHtml, textStats);
            
            this.uiManager.showSavedTextsButton(true);
            
            if (textStats.unknownWords > 0) {
                this.uiManager.showExportButton(true);
            }
            
            // Nustatome puslapį pačiame gale
            if (savedState.lastPage) {
                setTimeout(() => {
                    this.paginator.goToPage(savedState.lastPage);
                }, 0);
            }
            
            const endTime = performance.now();
            this.debugLog(`Knygos būsena inicializuota, užtruko: ${endTime - startTime} ms`);
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida atkuriant knygos būseną:`, error);
            this.stateManager.clearBookState();
        }
    }
    
    async handleFile(e) {
        try {
            if (this.isProcessing) {
                this.debugLog('Atšaukiama esama užklausa');
                this.fileManager.abort();
            }
            
            this.isProcessing = true;
            this.uiManager.disableFileInput(true);
            this.uiManager.showLoadingState();
            
            const file = e.target.files[0];
            if (!file) {
                console.warn('Nepasirinktas failas');
                return;
            }
            
            this.debugLog(`Pradedamas failo apdorojimas: ${file.name}`);
            const startTime = performance.now();
            
            this.currentFileName = file.name;
            
            // Patikriname ar yra išsaugotas paskutinis puslapis
            const lastPage = this.getLastPage();
            if (lastPage.fileName === file.name) {
                this.debugLog(`Rastas paskutinis skaitytas puslapis: ${lastPage.pageNumber}`);
                this.paginator.goToPage(lastPage.pageNumber);
            }
            
            // Skaitome ir apdorojame failą
            const rawText = await this.fileManager.readFile(file);
            this.debugLog(`Failas nuskaitytas, teksto ilgis: ${rawText.length}`);
            
            const normalizedText = this.normalizer.normalizeMarkdown(rawText);
            this.debugLog('Tekstas normalizuotas');
            this.currentText = normalizedText;
            
            // Skaičiuojame teksto statistiką
            this.debugLog('Pradedamas teksto statistikos skaičiavimas');
            const knownWords = this.dictionaryManager.getDictionaryWords();
            const textStats = this.textStatistics.calculateStats(normalizedText, knownWords);
            this.debugLog(`Teksto statistika: ${JSON.stringify(textStats)}`);
            
            // Rodome mygtukus
            this.uiManager.showSavedTextsButton(true);
            
            if (textStats.unknownWords > 0) {
                this.uiManager.showExportButton(true);
                this.debugLog(`Įjungtas eksporto mygtukas, nežinomų žodžių: ${textStats.unknownWords}`);
            }
            
            // Konvertuojame į HTML
            this.debugLog('Pradedama konversija į HTML');
            const html = await this.htmlConverter.convertToHtml(normalizedText);
            this.debugLog(`HTML konversija baigta, ilgis: ${html.length}`);
            
            // Nustatome turinį
            this.setContent(html, textStats);
            
            // Išsaugome būseną su pažymėjimais
            const highlights = this.textHighlighter.saveHighlights();
            this.debugLog(`Išsaugomi pažymėjimai: ${highlights.length}`);
            
            this.stateManager.saveBookState({
                text: this.currentText,
                fileName: this.currentFileName,
                lastPage: this.paginator.getCurrentPage(),
                highlights: highlights
            });
            
            this.debugLog('Būsena išsaugota');
            
            const endTime = performance.now();
            this.debugLog(`Failo apdorojimas baigtas, užtruko: ${endTime - startTime} ms`);
        } catch (error) {
            this.debugLog(`KLAIDA apdorojant failą: ${error.message}`);
            this.uiManager.handleError(error);
        } finally {
            this.isProcessing = false;
            this.uiManager.disableFileInput(false);
            this.uiManager.resetFileInput();
            this.uiManager.hideLoadingState();
            this.debugLogEnd('Pradedamas failo apdorojimas');
        }
    }
    
    async setContent(html, stats = {}) {
        try {
            this.debugLog('Nustatomas naujas turinys');
            const startTime = performance.now();
            
            // Sukuriame HTML turinį
            let contentHtml = '<div class="text-content">';
            
            // Statistikos dalis
            if (stats && Object.keys(stats).length > 0) {
                contentHtml += `
                    <div class="text-stats">
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
                    </div>
                `;
            }
            
            // Tekstas su žymėjimais
            const highlightedHtml = await this.textHighlighter.processText(this.currentText, html);
            this.debugLog(`Pažymėtas tekstas: ${highlightedHtml.slice(0, 100)}...`);
            
            contentHtml += '<div class="paginated-content">' + highlightedHtml + '</div>';
            contentHtml += '</div>';
            
            // Nustatome turinį į UI
            const contentElement = this.uiManager.setContent(contentHtml);
            
            // Inicializuojame puslapiavimą
            if (contentElement) {
                const pageData = this.paginator.setContent(contentElement.innerHTML);
                this.updatePageContent(pageData);
            }
            
            const endTime = performance.now();
            this.debugLog(`Turinys nustatytas, užtruko: ${endTime - startTime} ms`);
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida nustatant turinį:`, error);
            this.uiManager.showError(`Klaida nustatant turinį: ${error.message}`);
        } finally {
            this.debugLogEnd('Nustatomas naujas turinys');
        }
    }
    
    updatePageContent(pageData) {
        try {
            this.debugLog(`Atnaujinamas puslapio turinys: ${pageData.currentPage} / ${pageData.totalPages}`);
            
            // Randame turinio elementą ir atnaujiname
            const contentDiv = document.querySelector('.paginated-content');
            if (!contentDiv) return;
            
            contentDiv.innerHTML = pageData.content;
            
            // Išsaugome paskutinį puslapį
            this.saveLastPage(pageData.currentPage);
            
            // Atnaujiname UI
            this.uiManager.updatePageInfo(pageData.currentPage, pageData.totalPages);
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida atnaujinant puslapio turinį:`, error);
        }
    }
    
    saveLastPage(pageNumber) {
        try {
            // Išsaugome naują būseną su atnaujintu puslapiu
            this.stateManager.saveBookState({
                text: this.currentText,
                fileName: this.currentFileName,
                lastPage: pageNumber,
                highlights: this.textHighlighter.saveHighlights()
            });
            this.debugLog(`Išsaugotas puslapis: ${pageNumber}`);
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida išsaugant paskutinį puslapį:`, error);
        }
    }
    
    getLastPage() {
        try {
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
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida gaunant paskutinį puslapį:`, error);
            return { pageNumber: 1, fileName: '' };
        }
    }
    
    async handleExport() {
        try {
            this.debugLog('Pradedamas nežinomų žodžių eksportas');
            const startTime = performance.now();
            
            const knownWords = this.dictionaryManager.getDictionaryWords();
            
            // Gauname nežinomus žodžius
            const unknownWords = this.textStatistics.getUnknownWords(this.currentText, knownWords);
            this.debugLog(`Nežinomų žodžių kiekis: ${unknownWords.length}`);
            
            // Perduodame originalų tekstą ir nežinomus žodžius į eksporterį
            this.unknownWordsExporter.processText(this.currentText, unknownWords);
            this.unknownWordsExporter.exportToTxt();
            
            const endTime = performance.now();
            this.debugLog(`Nežinomi žodžiai eksportuoti sėkmingai, užtruko: ${endTime - startTime} ms`);
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida eksportuojant nežinomus žodžius:`, error);
            this.uiManager.showError('Klaida eksportuojant nežinomus žodžius');
        } finally {
            this.debugLogEnd('Pradedamas nežinomų žodžių eksportas');
        }
    }
    
    async handleWordSearch(text) {
        try {
            this.debugLog('Pradedama žodžių paieška');
            
            if (!text || text.trim() === '') {
                this.uiManager.displaySearchResults([]);
                return;
            }
            
            const startTime = performance.now();
            
            // Ieškome tekste pagal paieškos raktažodį
            const { results, stats } = await this.dictionaryManager.findInText(text);
            this.debugLog(`Paieškos laikas: ${stats.searchTimeMs} ms`);
            
            // Rodome rezultatus
            this.uiManager.displaySearchResults(results);
            
            const endTime = performance.now();
            this.debugLog(`Žodžių paieška baigta, užtruko: ${endTime - startTime} ms, rasta: ${results.length}`);
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida ieškant žodžių:`, error);
            this.uiManager.showError(`Klaida ieškant: ${error.message}`);
        } finally {
            this.debugLogEnd('Pradedama žodžių paieška');
        }
    }
    
    updateProgress(progressData) {
        try {
            this.uiManager.updateProgress(progressData.percent);
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida atnaujinant progresą:`, error);
        }
    }
    
    updateDictionaryList() {
        try {
            const dictionaries = this.dictionaryManager.getDictionaryList();
            this.uiManager.updateDictionaryList(dictionaries);
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida atnaujinant žodynų sąrašą:`, error);
        }
    }
    
    updateDictionaryStats() {
        try {
            const stats = this.dictionaryManager.getStatistics();
            this.uiManager.updateDictionaryStats(stats);
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida atnaujinant žodynų statistiką:`, error);
        }
    }
    
    removeDictionary(name) {
        try {
            this.debugLog(`Bandoma pašalinti žodyną: ${name}`);
            
            if (this.dictionaryManager.removeDictionary(name)) {
                this.fileManager.removeLoadedFile(name);
                this.updateDictionaryList();
                this.updateDictionaryStats();
                this.debugLog(`Žodynas pašalintas: ${name}`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida šalinant žodyną:`, error);
            this.uiManager.showError(`Klaida šalinant žodyną: ${error.message}`);
            return false;
        }
    }
}

// Globali App instancija
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
