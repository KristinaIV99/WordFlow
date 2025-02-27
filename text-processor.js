// text-processor.js
const DEBUG = true;  // arba false true kai norėsime išjungti

// Tekstų normalizavimas
export class TextProcessor {
    constructor() {
        this.CLASS_NAME = '[TextProcessor]';
        this.debugLog('Konstruktorius inicializuotas');
    }
    
    debugLog(...args) {
        if (DEBUG) {
            console.log(`${this.CLASS_NAME} [DEBUG]`, ...args);
        }
    }
    
    // Normalizuoja tekstą (perkelta iš TextNormalizer)
    normalizeMarkdown(text) {
        try {
            this.debugLog('Pradedamas teksto normalizavimas');
            
            // Pakeičiame tabuliacijos simbolius tarpais
            let normalizedText = text.replace(/\t/g, '    ');
            
            // Pašaliname ne UTF-8 simbolius
            normalizedText = normalizedText.replace(/[^\x00-\x7F\xC0-\xFF]/g, '');
            
            // Pašaliname kartotinius tuščius tarpus
            normalizedText = normalizedText.replace(/[ ]{2,}/g, ' ');
            
            // Pašaliname kartotines naujas eilutes
            normalizedText = normalizedText.replace(/\n{3,}/g, '\n\n');
            
            this.debugLog('Tekstas normalizuotas');
            
            return normalizedText;
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida normalizuojant tekstą:`, error);
            throw error;
        }
    }
    
    // Konvertuoja į HTML (perkelta iš HtmlConverter)
    async convertToHtml(text) {
        try {
            this.debugLog('Pradedama konversija į HTML');
            
            // Čia galite panaudoti esamą htmlConverter logiką
            // Pavyzdžiui, galite kviesti išorinį HtmlConverter modulį
            
            // Tai yra tik pavyzdys, jūs turėtumėte naudoti savo esamą kodą:
            let html = text
                .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
                .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
                .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');
                
            // Pridėkite kitus HTML konvertavimo žingsnius pagal poreikį
            
            this.debugLog('HTML konversija baigta');
            
            return html;
        } catch (error) {
            console.error(`${this.CLASS_NAME} Klaida konvertuojant į HTML:`, error);
            throw error;
        }
    }
}
