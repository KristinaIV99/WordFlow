// text-processor.js
const DEBUG = true;  // arba false true kai norėsime išjungti

// Tekstų normalizavimas
export class TextNormalizer {
    constructor() {
        this.CLASS_NAME = '[TextNormalizer]';
        this.debugLog('Konstruktorius inicializuotas');
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
    
    normalizeMarkdown(text) {
        try {
            this.debugLog('Pradedamas teksto normalizavimas');
            const startTime = performance.now();
            
            // Pakeičiame tabuliacijos simbolius tarpais
            let normalizedText = text.replace(/\t/g, '    ');
            
            // Pašaliname ne UTF-8 simbolius
            normalizedText = normalizedText.replace(/[^\x00-\x7F\xC0-\xFF]/g, '');
            
            // Pašaliname kartotinius tuščius tarpus
            normalizedText = normalizedText.replace(/[ ]{2,}/g, ' ');
            
            // Pašaliname kartotines naujas eilutes
            normalizedText = normalizedText.replace(/\n{3,}/g, '\n\n');
            
            const endTime = performance.now();
            this.debugLog(`Tekstas normalizuotas, užtruko: ${endTime - startTime} ms`);
            
            return normalizedText;
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida normalizuojant tekstą:`, error);
            throw error;
        } finally {
            this.debugLogEnd('Pradedamas teksto normalizavimas');
        }
    }
}

// HTML konvertavimas
export class HtmlConverter {
    constructor() {
        this.CLASS_NAME = '[HtmlConverter]';
        this.debugLog('Konstruktorius inicializuotas');
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
    
    async convertToHtml(text) {
        try {
            this.debugLog('Pradedama konversija į HTML');
            const startTime = performance.now();
            
            // Pakeisti markdown į HTML
            let html = this.convertMarkdownToHtml(text);
            
            // Papildomos taisyklės
            html = this.applyCustomRules(html);
            
            const endTime = performance.now();
            this.debugLog(`HTML konversija baigta, užtruko: ${endTime - startTime} ms, rezultato ilgis: ${html.length}`);
            
            return html;
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida konvertuojant į HTML:`, error);
            throw error;
        } finally {
            this.debugLogEnd('Pradedama konversija į HTML');
        }
    }
    
    convertMarkdownToHtml(text) {
        try {
            // Antraštės
            let html = text
                .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
                .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
                .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
                .replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
                
            // Pasvirasis tekstas
            html = html
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/_(.*?)_/g, '<em>$1</em>');
                
            // Įtraukos
            html = html
                .replace(/^\> (.*?)$/gm, '<blockquote>$1</blockquote>');
                
            // Sąrašai
            html = html
                .replace(/^- (.*?)$/gm, '<li>$1</li>')
                .replace(/^([0-9]+)\. (.*?)$/gm, '<li>$2</li>');
                
            // Nauja eilutė
            html = html
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>');
                
            // Apgaubiame teksto paragrafais
            html = '<p>' + html + '</p>';
            
            return html;
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida konvertuojant Markdown į HTML:`, error);
            throw error;
        }
    }
    
    applyCustomRules(html) {
        try {
            // Taisoma kelių paragrafų problema
            html = html.replace(/<\/p><p><\/p><p>/g, '</p><p>');
            
            // Čia galima pridėti papildomus pakeitimus pagal poreikį
            
            return html;
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida taikant papildomas taisykles:`, error);
            throw error;
        }
    }
}

// Teksto puslapiavimas
export class TextPaginator {
    constructor(options = {}) {
        this.CLASS_NAME = '[TextPaginator]';
        this.pageSize = options.pageSize || 2000;
        this.onPageChange = options.onPageChange || (() => {});
        
        this.content = '';
        this.totalPages = 1;
        this.currentPage = 1;
        this.slider = null;
        
        this.debugLog('Konstruktorius inicializuotas');
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
    
    setContent(html) {
        try {
            this.debugLog('Nustatomas puslapiuojamas turinys');
            const startTime = performance.now();
            
            this.content = html;
            this.calculatePages();
            const pageData = this.getPageContent(this.currentPage);
            
            const endTime = performance.now();
            this.debugLog(`Turinys nustatytas, užtruko: ${endTime - startTime} ms`);
            
            return pageData;
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida nustatant turinį:`, error);
            throw error;
        } finally {
            this.debugLogEnd('Nustatomas puslapiuojamas turinys');
        }
    }
    
    calculatePages() {
        try {
            this.totalPages = Math.max(1, Math.ceil(this.content.length / this.pageSize));
            this.currentPage = Math.min(this.currentPage, this.totalPages);
            
            this.debugLog(`Puslapių kiekis: ${this.totalPages}, dabartinis: ${this.currentPage}`);
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida skaičiuojant puslapius:`, error);
            throw error;
        }
    }
    
    getPageContent(pageNumber) {
        try {
            this.debugLog(`Gaunamas ${pageNumber} puslapio turinys`);
            
            pageNumber = Math.max(1, Math.min(pageNumber, this.totalPages));
            
            const startIndex = (pageNumber - 1) * this.pageSize;
            const endIndex = Math.min(startIndex + this.pageSize, this.content.length);
            
            let pageContent = this.content.substring(startIndex, endIndex);
            
            // Pasirūpiname, kad nebūtų "nukirstų" HTML žymių
            pageContent = this.ensureValidHtml(pageContent);
            
            return {
                content: pageContent,
                currentPage: pageNumber,
                totalPages: this.totalPages
            };
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida gaunant puslapio turinį:`, error);
            throw error;
        }
    }
    
    ensureValidHtml(html) {
        try {
            // Paprastas būdas užtikrinti, kad HTML būtų validus
            // Realiame projekte būtų geriau naudoti DOM parserius
            
            // Užtikriname, kad nelieka neuždarytų žymių
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            return tempDiv.innerHTML;
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida validuojant HTML:`, error);
            return html; // Jei nepavyko, grąžiname originalų HTML
        }
    }
    
    goToPage(pageNumber) {
        try {
            this.debugLog(`Pereinama į ${pageNumber} puslapį`);
            
            if (pageNumber < 1 || pageNumber > this.totalPages) {
                throw new Error(`Neteisingas puslapio numeris: ${pageNumber}`);
            }
            
            this.currentPage = pageNumber;
            const pageData = this.getPageContent(pageNumber);
            
            if (this.slider) {
                this.slider.value = pageNumber;
            }
            
            this.onPageChange(pageData);
            return pageData;
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida pereinant į puslapį:`, error);
            throw error;
        }
    }
    
    nextPage() {
        try {
            if (this.currentPage < this.totalPages) {
                return this.goToPage(this.currentPage + 1);
            }
            return this.getPageContent(this.currentPage);
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida pereinant į kitą puslapį:`, error);
            throw error;
        }
    }
    
    previousPage() {
        try {
            if (this.currentPage > 1) {
                return this.goToPage(this.currentPage - 1);
            }
            return this.getPageContent(this.currentPage);
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida pereinant į ankstesnį puslapį:`, error);
            throw error;
        }
    }
    
    getCurrentPage() {
        return this.currentPage;
    }
    
    getTotalPages() {
        return this.totalPages;
    }
    
    initializeSlider() {
        try {
            this.debugLog('Inicializuojamas slankiklis');
            
            this.slider = document.createElement('input');
            this.slider.type = 'range';
            this.slider.min = 1;
            this.slider.max = this.totalPages;
            this.slider.value = this.currentPage;
            this.slider.className = 'page-slider';
            
            this.slider.addEventListener('input', () => {
                const pageNumber = parseInt(this.slider.value);
                this.goToPage(pageNumber);
            });
            
            return this.slider;
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida inicializuojant slankiklį:`, error);
            throw error;
        }
    }
    
    updateSlider() {
        try {
            if (this.slider) {
                this.slider.max = this.totalPages;
                this.slider.value = this.currentPage;
            }
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida atnaujinant slankiklį:`, error);
        }
    }
}
