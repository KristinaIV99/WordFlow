// dom-processor.js
// DOM medžio apdorojimo ir žymėjimo logika

const DEBUG = false;

export class DomProcessor {
    constructor() {
        this.DOM_PROCESSOR_NAME = '[DomProcessor]';
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
                const newNode = this._highlightWords(text, words);
                if (newNode) {
                    node.parentNode.replaceChild(newNode, node);
                }
            } else if (node.childNodes && !node.classList?.contains('pagination-controls')) {
                nodesProcessed.elementNodes++;
                Array.from(node.childNodes).forEach(child => {
                    processNodeInternal(child);
                });
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

        // Žodžių paieška
        const matchStart = performance.now();
        const matches = [];
        let totalComparisons = 0;
        
        Object.keys(words).forEach(word => {
            let index = 0;
            const lowerText = text.toLowerCase();
            
            while ((index = lowerText.indexOf(word, index)) !== -1) {
                totalComparisons++;
                
                if (isFullWord(text, index, index + word.length)) {
                    matches.push({
                        start: index,
                        end: index + word.length,
                        word: text.slice(index, index + word.length),
                        ...words[word]
                    });
                }
                index += 1;
            }
        });
        const matchEnd = performance.now();
        
        if (matches.length > 0 || totalComparisons > 1000) {
            console.log(`${this.DOM_PROCESSOR_NAME} Žodžių paieška tekste užtruko: ${(matchEnd - matchStart).toFixed(2)}ms, rasta ${matches.length} atitikmenų iš ${totalComparisons} palyginimų`);
        }

        // Rūšiavimas
        const sortStart = performance.now();
        matches.sort((a, b) => a.start - b.start);
        const sortEnd = performance.now();
        
        if (matches.length > 100) {
            console.log(`${this.DOM_PROCESSOR_NAME} Atitikmenų rūšiavimas užtruko: ${(sortEnd - sortStart).toFixed(2)}ms`);
        }

        // Persidengimų filtravimas
        const filterStart = performance.now();
        const filteredMatches = this._filterOverlappingMatches(matches);
        const filterEnd = performance.now();
        
        if (matches.length > 0) {
            console.log(`${this.DOM_PROCESSOR_NAME} Persidengimų filtravimas užtruko: ${(filterEnd - filterStart).toFixed(2)}ms, atmesta ${matches.length - filteredMatches.length} persidengimų`);
        }

        // DOM fragmento kūrimas
        const fragmentStart = performance.now();
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        filteredMatches.forEach(match => {
            if (match.start > lastIndex) {
                fragment.appendChild(
                    document.createTextNode(text.slice(lastIndex, match.start))
                );
            }

            const span = document.createElement('span');
            span.className = match.type === 'phrase' ? 'highlight-phrase' : 'highlight-word';
            span.textContent = match.word;
            
            if (DEBUG) console.log('Match info:', match.info);
            
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
        });

        if (lastIndex < text.length) {
            fragment.appendChild(
                document.createTextNode(text.slice(lastIndex))
            );
        }
        const fragmentEnd = performance.now();
        
        if (filteredMatches.length > 10) {
            console.log(`${this.DOM_PROCESSOR_NAME} DOM fragmento kūrimas užtruko: ${(fragmentEnd - fragmentStart).toFixed(2)}ms, sukurta ${filteredMatches.length} pažymėtų elementų`);
        }

        const endTime = performance.now();
        if (matches.length > 0) {
            console.log(`${this.DOM_PROCESSOR_NAME} Žodžių žymėjimas užtruko: ${(endTime - startTime).toFixed(2)}ms, pažymėta ${filteredMatches.length} žodžių`);
        }
        
        return fragment;
    }

    _filterOverlappingMatches(matches) {
        const startTime = performance.now();
        // Rūšiuojame pagal poziciją ir ilgį (ilgesni turi prioritetą)
        matches.sort((a, b) => {
            if (a.start === b.start) {
                return b.word.length - a.word.length;
            }
            return a.start - b.start;
        });

        let comparisons = 0;
        // Filtruojame persidengimus
        const filteredMatches = matches.filter((match, index) => {
            // Ar šis match nepersidengia su jokiu ankstesniu match
            return !matches.some((otherMatch, otherIndex) => {
                // Tikriname tik ankstesnius matches
                if (otherIndex >= index) return false;
                
                comparisons++;
                
                // Ar persidengia pozicijos
                const overlaps = !(otherMatch.end <= match.start || 
                                otherMatch.start >= match.end);
                
                return overlaps;
            });
        });
        
        const endTime = performance.now();
        if (matches.length > 50) {
            console.log(`${this.DOM_PROCESSOR_NAME} Persidengimų filtravimas užtruko: ${(endTime - startTime).toFixed(2)}ms, atlikta ${comparisons} palyginimų, liko ${filteredMatches.length} iš ${matches.length}`);
        }
        
        return filteredMatches;
    }
}
