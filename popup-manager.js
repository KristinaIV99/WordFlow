// popup-manager.js
// Žodžių popup langų valdymo klasė

const DEBUG = false;

export class PopupManager {
    constructor() {
        this.POPUP_MANAGER_NAME = '[PopupManager]';
        this.activePopup = null;
    }

    _handlePopup(event) {
        const startTime = performance.now();
        
        if (DEBUG) {
            console.log('Popup event:', event);
            console.log('Target:', event.target);
            console.log('Dataset:', event.target.dataset);
        }
        
        event.stopPropagation();
        event.preventDefault();
        this._removeAllPopups();

        try {
            // Duomenų apdorojimas
            const parseStart = performance.now();
            const data = event.target.dataset.info;
            if (DEBUG) {
                console.log('Raw data:', data);
            }
            const info = JSON.parse(data.replace(/&quot;/g, '"'));
            if (DEBUG) {
                console.log('Parsed info:', info);
            }
            const parseEnd = performance.now();
            console.log(`${this.POPUP_MANAGER_NAME} Popup duomenų apdorojimas užtruko: ${(parseEnd - parseStart).toFixed(2)}ms`);
            
            // Popup sukūrimas
            const createStart = performance.now();
            const popup = document.createElement('div');
            popup.className = 'word-info-popup';
            
            popup.style.cssText = `
                position: absolute;
                z-index: 9999;
                display: block;
                visibility: visible;
                opacity: 1;
            `;

            popup.innerHTML = `
                <div class="word-info-container">
                    <div class="word-text">${info.text}</div>
                    <hr class="thick-divider">
                    ${info.meanings.map((meaning, index) => `
                        ${index > 0 ? '<hr class="thin-divider">' : ''}
                        <div class="meaning-block">
                            ${meaning.vertimas && meaning.vertimas !== '-' ? `<div class="translation">${meaning.vertimas}</div>` : ''}
                            ${meaning["kalbos dalis"] && meaning["kalbos dalis"] !== '-' ? `<div class="part-of-speech">${meaning["kalbos dalis"]}</div>` : ''}
                            ${meaning["bazinė forma"] && meaning["bazinė forma"] !== '-' ? `
                                <div class="base-form">
                                    <strong>${meaning["bazinė forma"]}</strong>${meaning["bazė vertimas"] && meaning["bazė vertimas"] !== '-' ? ` - ${meaning["bazė vertimas"]}` : ''}
                                </div>
                            ` : ''}
                            ${meaning.CEFR && meaning.CEFR !== '-' ? `<div class="cefr">${meaning.CEFR}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
            const createEnd = performance.now();
            console.log(`${this.POPUP_MANAGER_NAME} Popup kūrimas užtruko: ${(createEnd - createStart).toFixed(2)}ms`);

            // Popup pozicionavimas
            const positionStart = performance.now();
            const targetRect = event.target.getBoundingClientRect();
            popup.style.left = `${window.scrollX + targetRect.left}px`;
            popup.style.top = `${window.scrollY + targetRect.bottom + 5}px`;

            document.body.appendChild(popup);
            this.activePopup = popup;
            this._adjustPopupPosition(popup);

            document.addEventListener('click', (e) => {
                if (!popup.contains(e.target) && !event.target.contains(e.target)) {
                    popup.remove();
                }
            });
            const positionEnd = performance.now();
            console.log(`${this.POPUP_MANAGER_NAME} Popup pozicionavimas užtruko: ${(positionEnd - positionStart).toFixed(2)}ms`);

            const endTime = performance.now();
            console.log(`${this.POPUP_MANAGER_NAME} Viso popup apdorojimas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
        } catch (error) {
            console.error('Error in popup:', error);
            console.error('Stack:', error.stack);
        }
    }

    _adjustPopupPosition(popup) {
        const startTime = performance.now();
        
        const rect = popup.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const contentWidth = document.querySelector('.text-content').getBoundingClientRect().width;
        const contentLeft = document.querySelector('.text-content').getBoundingClientRect().left;

        // Horizontalus pozicionavimas
        const maxRight = contentLeft + contentWidth - 10; // 10px tarpas nuo dešinio krašto
        if (rect.right > maxRight) {
            // Jei išeina už teksto dešinio krašto
            const newLeft = maxRight - rect.width;
            popup.style.left = `${Math.max(10, newLeft)}px`;
        }

        // Papildomas patikrinimas dešiniam kraštui
        const updatedRect = popup.getBoundingClientRect();
        if (updatedRect.right > maxRight) {
            // Jei vis dar išeina už ribų, mažiname plotį
            const maxWidth = contentWidth - 20; // 20px tarpas (10px iš abiejų pusių)
            popup.style.maxWidth = `${maxWidth}px`;
            popup.style.left = `${contentLeft + 10}px`; // Pridedame minimalų tarpą nuo kairės
        }

        // Vertikalus pozicionavimas lieka toks pat
        if (rect.bottom > viewportHeight) {
            const top = parseInt(popup.style.top) - rect.height - 30;
            popup.style.top = `${Math.max(10, top)}px`;
        }
        
        const endTime = performance.now();
        console.log(`${this.POPUP_MANAGER_NAME} Popup pozicijos korekcija užtruko: ${(endTime - startTime).toFixed(2)}ms`);
    }

    _removeAllPopups() {
        const startTime = performance.now();
        
        const popups = document.querySelectorAll('.word-info-popup');
        popups.forEach(popup => popup.remove());
        this.activePopup = null;
        
        const endTime = performance.now();
        if (popups.length > 0) {
            console.log(`${this.POPUP_MANAGER_NAME} Visų popup šalinimas užtruko: ${(endTime - startTime).toFixed(2)}ms, pašalinta: ${popups.length}`);
        }
    }
}
