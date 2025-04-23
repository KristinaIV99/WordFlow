// dom-processor.js
// DOM medžio apdorojimo ir žymėjimo logika - optimizuota versija

const DEBUG = false;

export class DomProcessor {
    constructor() {
        this.DOM_PROCESSOR_NAME = '[DomProcessor]';
        
        // Sukuriame span šablonus, kad nereikėtų kurti naujų elementų kiekvieną kartą
        this.spanTemplates = {
            'word': document.createElement('span'),
            'phrase': document.createElement('span')
        };
        this.spanTemplates['word'].className = 'highlight-word';
        this.spanTemplates['phrase'].className = 'highlight-phrase';
    }

    debugLog(...args) {
        if (DEBUG) {
            console.log(`${this.DOM_PROCESSOR_NAME} [DEBUG]`, ...args);
        }
    }

    processNode(node, words) {
        const nodesProcessed = { count: 0, textNodes: 0, elementNodes: 0 };
        const startTime = performance.now();
        
        const processNodeInternal = (node) => {
            nodesProcessed.count++;
            
            if (DEBUG) console.log('Processing node:', node.nodeType, node.textContent?.slice(0, 50));
            
            if (node.nodeType === Node.TEXT_NODE && !this._isInPaginationControls(node)) {
                nodesProcessed.textNodes++;
                const text = node.textContent;
                
                // Optimizuota: tikrinti, ar reikia apdoroti tekstą
                // Jei tekste nėra žodžių, neatliekame brangių DOM operacijų
                if (text.trim().length === 0) {
                    return;
                }
                
                const newNode = this._highlightWords(text, words);
                if (newNode) {
                    node.parentNode.replaceChild(newNode, node);
                }
            } else if (node.childNodes && !node.classList?.contains('pagination-controls')) {
                nodesProcessed.elementNodes++;
                
                // Optimizuota: naudojame masyvą vietoj nodelisto konvertavimo
                const childNodes = Array.from(node.childNodes);
                for (let i = 0; i < childNodes.length; i++) {
                    processNodeInternal(childNodes[i]);
                }
            }
            
            // Periodiniai pranešimai apie progresą
            if (nodesProcessed.count % 1000 === 0) {
                const currentTime = performance.now();
                console.log(`${this.DOM_PROCESSOR_NAME} Apdorota ${nodesProcessed.count} mazgų (${nodesProcessed.textNodes} teksto, ${nodesProcessed.elementNodes} elemento), užtruko: ${(currentTime - startTime).toFixed(2)}ms`);
            }
        };
        
        processNodeInternal(node);
        
        const endTime = performance.now();
        console.log(`${this.DOM_PROCESSOR_NAME} DOM apdorojimas užtruko: ${(endTime - startTime).toFixed(2)}ms, apdorota ${nodesProcessed.count} mazgų (${nodesProcessed.textNodes} teksto, ${nodesProcessed.elementNodes} elemento)`);
    }

    _isInPaginationControls(node) {
        let current = node;
        while (current) {
            if (current.classList?.contains('pagination-controls')) {
                return true;
            }
            current = current.parentNode;
        }
        return false;
    }

    _highlightWords(text, words) {
        const startTime = performance.now();
        const wordBoundaryRegex = /[\s.,!?;:'"„"\(\)\[\]{}<>\/\-—–]/;
        
        function isWordBoundary(char) {
            return !char || wordBoundaryRegex.test(char);
        }

        function isFullWord(text, start, end) {
            const prevChar = start > 0 ? text[start - 1] : ' ';
            const nextChar = end < text.length ? text[end] : ' ';
            return isWordBoundary(prevChar) && isWordBoundary(nextChar);
        }

        // Greitai tikriname, ar yra bent vienas galimas atitikmuo šiame tekste
        // Tai padeda išvengti brangių operacijų, jei tekste nėra tinkamų žodžių
        const wordKeys = Object.keys(words);
        let hasAnyPotentialMatch = false;
        const lowerText = text.toLowerCase();
        
        // Greitas pirminė patikra, ar yra bent vienas potencialus atitikmuo
        for (let i = 0; i < wordKeys.length && !hasAnyPotentialMatch; i++) {
            if (lowerText.includes(wordKeys[i])) {
                hasAnyPotentialMatch = true;
            }
        }
        
        // Jei nėra potencialių atitikmenų, grąžiname originalų tekstą
        if (!hasAnyPotentialMatch) {
            return document.createTextNode(text);
        }

        // Žodžių paieška ir filtravimas - optimizuota versija
        const matches = this._findMatches(text, words, isFullWord);
        
        // Jei nėra atitikmenų, grąžiname originalų tekstą
        if (matches.length === 0) {
            return document.createTextNode(text);
        }

        // Filtruojame persidengimus
        const filteredMatches = this._filterOverlappingMatches(matches);
        
        if (filteredMatches.length === 0) {
            return document.createTextNode(text);
        }
        
        // DOM fragmento kūrimas - optimizuota
        const fragment = this._createFragment(text, filteredMatches);

        const endTime = performance.now();
        if (matches.length > 0) {
            console.log(`${this.DOM_PROCESSOR_NAME} Žodžių žymėjimas užtruko: ${(endTime - startTime).toFixed(2)}ms, pažymėta ${filteredMatches.length} žodžių`);
        }
        
        return fragment;
    }

    _findMatches(text, words, isFullWordCallback) {
        const startTime = performance.now();
        const matches = [];
        let totalComparisons = 0;
        
        const lowerText = text.toLowerCase();
        
        // Optimizuota žodžių paieška
        for (const word in words) {
            // Peršokame tuščius žodžius
            if (!word || word.length === 0) continue;
            
            let index = 0;
            
            // Naudojame String.indexOf visiems žodžiams viename cikle
            while ((index = lowerText.indexOf(word, index)) !== -1) {
                totalComparisons++;
                
                if (isFullWordCallback(text, index, index + word.length)) {
                    matches.push({
                        start: index,
                        end: index + word.length,
                        word: text.slice(index, index + word.length),
                        ...words[word]
                    });
                }
                index += 1;
            }
        }
        
        const endTime = performance.now();
        if (matches.length > 0 || totalComparisons > 1000) {
            console.log(`${this.DOM_PROCESSOR_NAME} Žodžių paieška tekste užtruko: ${(endTime - startTime).toFixed(2)}ms, rasta ${matches.length} atitikmenų iš ${totalComparisons} palyginimų`);
        }
        
        return matches;
    }

    _filterOverlappingMatches(matches) {
        const startTime = performance.now();
        
        // Jei yra mažai atitikmenų, nereikia optimizacijos
        if (matches.length <= 1) {
            return matches;
        }
        
        // Rūšiuojame pagal tipą (frazės prieš žodžius), pradžią ir ilgį
        matches.sort((a, b) => {
            if (a.type === 'phrase' && b.type !== 'phrase') return -1;
            if (a.type !== 'phrase' && b.type === 'phrase') return 1;
            
            if (a.start === b.start) {
                return b.word.length - a.word.length;
            }
            return a.start - b.start;
        });

        // Optimizuotas persidengimų algoritmas
        const filtered = [];
        let lastEnd = -1;  // Paskutinio pridėto elemento pabaiga
        
        // Greitesnis algoritmas, tinkamas daugumai atvejų
        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            
            // Jei šis match prasideda už paskutinio pabaigos, jis nepersidengia
            if (match.start >= lastEnd) {
                filtered.push(match);
                lastEnd = match.end;
                continue;
            }
            
            // Tikrinti persidengimą su jau pridėtais elementais
            let hasOverlap = false;
            for (let j = 0; j < filtered.length; j++) {
                const existingMatch = filtered[j];
                if (!(match.end <= existingMatch.start || match.start >= existingMatch.end)) {
                    hasOverlap = true;
                    break;
                }
            }
            
            if (!hasOverlap) {
                filtered.push(match);
                lastEnd = Math.max(lastEnd, match.end);
            }
        }
        
        const endTime = performance.now();
        if (matches.length > 10) {
            console.log(`${this.DOM_PROCESSOR_NAME} Persidengimų filtravimas užtruko: ${(endTime - startTime).toFixed(2)}ms, liko ${filtered.length} iš ${matches.length}`);
        }
        
        return filtered;
    }

    _createFragment(text, matches) {
        // Jei nėra atitikmenų, grąžiname tekstą
        if (matches.length === 0) {
            return document.createTextNode(text);
        }
        
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        for (const match of matches) {
            // Pridėti tekstą prieš atitikmenį
            if (match.start > lastIndex) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.start)));
            }

            // Naudojame iš anksto sukurtų šablonų klonavimą, kas yra greičiau
            const type = match.type || 'word';
            const span = this.spanTemplates[type].cloneNode(false);
            span.textContent = match.word;
            
            // Duomenys bus naudojami popup lange
            const meanings = match.info?.meanings || [{
                "vertimas": match.info?.vertimas || '-',
                "kalbos dalis": match.info?.["kalbos dalis"] || '-',
                "bazinė forma": match.info?.["bazinė forma"] || '-',
                "bazė vertimas": match.info?.["bazė vertimas"] || '-',
                "CEFR": match.info?.CEFR || '-'
            }];

            span.dataset.info = JSON.stringify({
                text: match.word,
                type: match.type,
                meanings: meanings
            });

            fragment.appendChild(span);
            lastIndex = match.end;
        }

        // Pridedame likusį tekstą
        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
        
        return fragment;
    }
}