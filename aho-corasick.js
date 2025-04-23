const DEBUG = false;

class AhoCorasick {
    constructor() {
        const constructorStart = performance.now();
        this.root = this.createNode();
        this.ready = false;
        this.patternCount = 0;
        this.wordBoundaryRegex = /[\s.,!?;:'"„"\(\)\[\]{}<>\/\-—–]/;
        this.patterns = new Map();
        const constructorEnd = performance.now();
        console.log(`[AhoCorasick] Konstruktoriaus inicializacija užtruko: ${(constructorEnd - constructorStart).toFixed(2)}ms`);
    }

    createNode() {
        return {
            next: new Map(),
            fail: null,
            outputs: [],
            relatedPatterns: new Set(),
            isEnd: false,
            pattern: null,
            depth: 0
        };
    }

    addPattern(pattern, data) {
        const startTime = performance.now();
        if (DEBUG) {
            console.log(`[AhoCorasick] Pridedamas šablonas:`, pattern, data);
        }
        
        if (this.ready) {
            throw new Error('Negalima pridėti šablonų po buildFailureLinks()');
        }

        const meanings = [];
        for (let i = 0; data[i]; i++) {
            meanings.push({
                type: data.type,
                "kalbos dalis": data[i]["kalbos dalis"],
                "vertimas": data[i].vertimas,
                "bazinė forma": data[i]["bazinė forma"],
                "bazė vertimas": data[i]["bazė vertimas"],
                "CEFR": data[i].CEFR
            });
        }

        let node = this.root;
        const normalizedPattern = pattern.toLowerCase().trim();
        
        this.patterns.set(normalizedPattern, {
            pattern: normalizedPattern,
            data: {
                type: data.type,
                meanings: meanings
            },
            type: data.type,
            length: normalizedPattern.length
        });

        for (let i = 0; i < normalizedPattern.length; i++) {
            const char = normalizedPattern[i];
            if (!node.next.has(char)) {
                const newNode = this.createNode();
                newNode.depth = i + 1;
                node.next.set(char, newNode);
            }
            
            node = node.next.get(char);
        }

        node.isEnd = true;
        node.pattern = normalizedPattern;
        node.outputs = meanings;
        
        this.patternCount++;
        if (DEBUG) {
            console.log(`[AhoCorasick] Šablonas pridėtas su reikšmėmis:`, meanings);
        }
        
        const endTime = performance.now();
        if (this.patternCount % 1000 === 0) {
            console.log(`[AhoCorasick] Pridėta ${this.patternCount} šablonų, paskutinio pridėjimas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
        }
    }

    buildFailureLinks() {
        const startTime = performance.now();
        if (DEBUG) {
            console.log('[AhoCorasick] Kuriami failure links');
        }
        
        const queue = [];
        
        const initStart = performance.now();
        for (const [char, node] of this.root.next) {
            node.fail = this.root;
            queue.push(node);
        }
        const initEnd = performance.now();
        console.log(`[AhoCorasick] Pradinių ryšių sukūrimas užtruko: ${(initEnd - initStart).toFixed(2)}ms`);

        const processStart = performance.now();
        let processedNodes = 0;
        while (queue.length > 0) {
            const current = queue.shift();
            processedNodes++;

            for (const [char, child] of current.next) {
                queue.push(child);

                let failNode = current.fail;
                
                while (failNode && !failNode.next.has(char)) {
                    failNode = failNode.fail;
                }

                child.fail = failNode ? failNode.next.get(char) : this.root;

                if (child.fail.outputs.length > 0) {
                    child.outputs = [...child.outputs, ...child.fail.outputs];
                }
                
                child.fail.relatedPatterns.forEach(pattern => {
                    child.relatedPatterns.add(pattern);
                });
            }
            
            if (processedNodes % 10000 === 0) {
                console.log(`[AhoCorasick] Apdorota ${processedNodes} mazgų iš ${queue.length} likusių eilėje`);
            }
        }
        const processEnd = performance.now();
        console.log(`[AhoCorasick] Ryšių apdorojimas užtruko: ${(processEnd - processStart).toFixed(2)}ms, apdorota mazgų: ${processedNodes}`);

        this.ready = true;
        const endTime = performance.now();
        console.log(`[AhoCorasick] Viso failure links sukūrimas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
        
        if (DEBUG) {
            console.log('[AhoCorasick] Failure links sukurti');
        }
    }

    search(text) {
        const startTime = performance.now();
        
        if (DEBUG) {
            console.log('\n=== PRADEDAMA PAIEŠKA ===');
            console.log('Teksto ilgis:', text.length);
        }

        const matches = [];
        const allText = text.toLowerCase();
        
        const prepStart = performance.now();
        const allPatterns = Array.from(this.patterns.entries())
            .sort((a, b) => b[0].length - a[0].length);
            
        if (DEBUG) {
            console.log('\nŠABLONŲ PRADŽIA:');
            allPatterns.forEach(([pattern, data], index) => {
                console.log(`${index + 1}. "${pattern}" (${data.data.type}) - ilgis: ${pattern.length}`);
            });
        }
        const prepEnd = performance.now();
        console.log(`[AhoCorasick] Šablonų paruošimas užtruko: ${(prepEnd - prepStart).toFixed(2)}ms, šablonų kiekis: ${allPatterns.length}`);

        const searchStart = performance.now();
        let totalComparisons = 0;
        for (const [pattern, data] of allPatterns) {
            let index = 0;
            let patternMatches = 0;
            
            if (DEBUG) {
                console.log(`\nIeškoma: "${pattern}" (${data.data.type})`);
            }
            
            while ((index = allText.indexOf(pattern, index)) !== -1) {
                totalComparisons++;
                
                if (DEBUG) {
                    const context = allText.slice(Math.max(0, index - 20), 
                        Math.min(allText.length, index + pattern.length + 20));
                    console.log(`Rastas "${pattern}" pozicijoje ${index}`);
                    console.log(`Kontekstas: "...${context}..."`);
                }
                
                const isValid = this._isFullWord(text, index, index + pattern.length);
                if (DEBUG) {
                    console.log(`Ar tinkamas? ${isValid}`);
                }

                if (isValid) {
                    patternMatches++;
                    matches.push({
                        pattern: pattern,
                        start: index,
                        end: index + pattern.length,
                        text: text.slice(index, index + pattern.length),
                        outputs: data.data.meanings,
                        type: data.data.type
                    });

                    if (DEBUG) {
                        console.log('Pridėtas match su duomenimis:', {
                            pattern: pattern,
                            outputs: data.data
                        });
                    }
                }
                index += 1;
            }
            if (DEBUG) {
                console.log(`Rasta atitikmenų "${pattern}": ${patternMatches}`);
            }
            
            if (totalComparisons > 0 && totalComparisons % 10000 === 0) {
                const currentSearchTime = performance.now() - searchStart;
                console.log(`[AhoCorasick] Atlikta ${totalComparisons} palyginimų, užtruko: ${currentSearchTime.toFixed(2)}ms`);
            }
        }
        const searchEnd = performance.now();
        console.log(`[AhoCorasick] Paieška užtruko: ${(searchEnd - searchStart).toFixed(2)}ms, rasta atitikmenų: ${matches.length}, palyginimai: ${totalComparisons}`);

        if (DEBUG) {
            console.log('\n=== PAIEŠKA BAIGTA ===');
            console.log('Viso rasta atitikmenų:', matches.length);
        }
        
        const filterStart = performance.now();
        const filteredMatches = this._filterOverlappingMatches(matches);
        const filterEnd = performance.now();
        console.log(`[AhoCorasick] Persidengimų filtravimas užtruko: ${(filterEnd - filterStart).toFixed(2)}ms, atfiltruoti ${matches.length - filteredMatches.length} persidengiantys`);
        
        const endTime = performance.now();
        console.log(`[AhoCorasick] Visa paieška užtruko: ${(endTime - startTime).toFixed(2)}ms`);
        
        return filteredMatches;
    }

    _filterOverlappingMatches(matches) {
        const startTime = performance.now();
        
        if (DEBUG) {
            console.log('[AhoCorasick] Pradedamas persidengimų filtravimas');
        }
    
        const sortStart = performance.now();
        const sortedMatches = matches.sort((a, b) => {
            if (a.type === 'phrase' && b.type !== 'phrase') return -1;
            if (a.type !== 'phrase' && b.type === 'phrase') return 1;
            
            if (a.start === b.start) {
                return b.pattern.length - a.pattern.length;
            }
            return a.start - b.start;
        });
        const sortEnd = performance.now();
        console.log(`[AhoCorasick] Atitikmenų rūšiavimas užtruko: ${(sortEnd - sortStart).toFixed(2)}ms`);

        if (DEBUG) {
            console.log('Surūšiuoti atitimenys:', sortedMatches);
        }

        const filtered = [];
        const usedRanges = [];

        const filterStart = performance.now();
        for (const match of sortedMatches) {
            let hasOverlap = false;
        
            for (const range of usedRanges) {
                if (!(match.end <= range.start || match.start >= range.end)) {
                    hasOverlap = true;
                    break;
                }
            }

            if (!hasOverlap) {
                filtered.push(match);
                usedRanges.push({
                    start: match.start,
                    end: match.end,
                    pattern: match.pattern
                });
                if (DEBUG) {
                    console.log(`Pridėtas ${match.type}: "${match.pattern}"`);
                }
            } else if (DEBUG) {
                console.log(`Praleista dėl persidengimo: "${match.pattern}"`);
            }
        }
        const filterEnd = performance.now();
        console.log(`[AhoCorasick] Atitikmenų filtravimas užtruko: ${(filterEnd - filterStart).toFixed(2)}ms`);

        const endTime = performance.now();
        console.log(`[AhoCorasick] Persidengimų filtravimas užtruko: ${(endTime - startTime).toFixed(2)}ms, rezultate liko: ${filtered.length} iš ${matches.length}`);
        
        return filtered;
    }

    _isFullWord(text, start, end) {
        if (DEBUG) {
            const context = {
                before: text.slice(Math.max(0, start - 10), start),
                word: text.slice(start, end),
                after: text.slice(end, Math.min(text.length, end + 10))
            };
            console.log('Tikriname kontekstą:', context);
        }

        let isValidStart = true;
        if (start > 0) {
            const beforeChar = text[start - 1];
            isValidStart = beforeChar === ' ' || beforeChar === '\n' || beforeChar === '_';
        }

        let isValidEnd = true;
        if (end < text.length) {
            const afterChar = text[end];
            isValidEnd = afterChar === ' ' || afterChar === '\n' || 
                        afterChar === '_' || afterChar === '.' || 
                        afterChar === ',' || afterChar === '-' ||
                        afterChar === '!' || afterChar === '?';
        }

        if (DEBUG) {
            console.log('Validacija:', {
                start: isValidStart,
                end: isValidEnd,
                result: isValidStart && isValidEnd
            });
        }

        return isValidStart && isValidEnd;
    }
    
    // Pridedame trūkstamą clear metodą
    clear() {
        const startTime = performance.now();
        this.root = this.createNode();
        this.ready = false;
        this.patternCount = 0;
        this.patterns = new Map();
        const endTime = performance.now();
        console.log(`[AhoCorasick] Searcher išvalymas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
    }
    
    // Pridedame metodą statistikos gavimui
    getStats() {
        return {
            patternCount: this.patternCount,
            ready: this.ready
        };
    }
}

export { AhoCorasick };
