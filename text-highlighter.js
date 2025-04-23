const DEBUG = true;

export class TextHighlighter {
    constructor(dictionaryManager) {
        const constructorStart = performance.now();
        this.HIGHLIGHTER_NAME = '[TextHighlighter]';
        this.dictionaryManager = dictionaryManager;
        this.boundHandlePopup = this._handlePopup.bind(this);
        this.activePopup = null;
        this.savedHighlights = null;

        document.addEventListener('click', (e) => {
            const target = e.target.closest('.highlight-word, .highlight-phrase');
            if (target) {
                if (DEBUG) console.log('Clicked on word:', target);
                this._handlePopup(e);
            }
        });
        
        const constructorEnd = performance.now();
        console.log(`${this.HIGHLIGHTER_NAME} Konstruktoriaus inicializacija užtruko: ${(constructorEnd - constructorStart).toFixed(2)}ms`);
    }

    saveHighlights() {
        const startTime = performance.now();
        const highlights = document.querySelectorAll('.highlight-word, .highlight-phrase');
        this.savedHighlights = Array.from(highlights).map(el => ({
            text: el.textContent,
            info: el.dataset.info,
            type: el.classList.contains('highlight-phrase') ? 'phrase' : 'word'
        }));
        const endTime = performance.now();
        console.log(`${this.HIGHLIGHTER_NAME} Pažymėjimų išsaugojimas užtruko: ${(endTime - startTime).toFixed(2)}ms, išsaugota ${this.savedHighlights.length} pažymėjimų`);
        return this.savedHighlights;
    }

    loadHighlights(savedHighlights) {
        const startTime = performance.now();
        if (savedHighlights) {
            this.savedHighlights = savedHighlights;
        }
        const endTime = performance.now();
        console.log(`${this.HIGHLIGHTER_NAME} Pažymėjimų įkėlimas užtruko: ${(endTime - startTime).toFixed(2)}ms, įkelta ${this.savedHighlights ? this.savedHighlights.length : 0} pažymėjimų`);
    }

    async processText(text, html, savedHighlights = null) {
        const startTime = performance.now();
        console.log("PRADINIS HTML (pradžia):", html.substring(0, 200));

        if (DEBUG) console.log(`${this.HIGHLIGHTER_NAME} Pradedamas teksto žymėjimas`);

        try {
            // Pažymėjimų įkėlimas
            const highlightsStart = performance.now();
            if (savedHighlights) {
                this.loadHighlights(savedHighlights);
            }
            const highlightsEnd = performance.now();
            console.log(`${this.HIGHLIGHTER_NAME} Pažymėjimų paruošimas užtruko: ${(highlightsEnd - highlightsStart).toFixed(2)}ms`);
            
            // Žodžių paieška
            const searchStart = performance.now();
            const { results } = await this.dictionaryManager.findInText(text);
            const searchEnd = performance.now();
            console.log(`${this.HIGHLIGHTER_NAME} Žodžių paieška užtruko: ${(searchEnd - searchStart).toFixed(2)}ms, rasta ${results.length} rezultatų`);
            
            // Šablonų apdorojimas
            const patternsStart = performance.now();
            const patterns = {};
            results.forEach(result => {
                const pattern = result.pattern.toLowerCase();
                if (!patterns[pattern]) {
                    patterns[pattern] = {
                        pattern: result.pattern,
                        type: result.type,
                        info: result.info,
                        length: pattern.length
                    };
                }
            });

            const sortedPatterns = Object.entries(patterns).sort((a, b) => b[1].length - a[1].length);
            const patternsObj = Object.fromEntries(sortedPatterns);
            if (DEBUG) console.log('Surūšiuoti šablonai:', sortedPatterns);
            const patternsEnd = performance.now();
            console.log(`${this.HIGHLIGHTER_NAME} Šablonų apdorojimas užtruko: ${(patternsEnd - patternsStart).toFixed(2)}ms, unikalių šablonų: ${Object.keys(patterns).length}`);

            // NAUJAS ŽINGSNIS: Sukuriame žymių žemėlapį
            const markupMapStart = performance.now();
            const markupMap = await this._createMarkupMap(text, patternsObj);
            const markupMapEnd = performance.now();
            console.log(`${this.HIGHLIGHTER_NAME} Žymių žemėlapio ruošimas užtruko: ${(markupMapEnd - markupMapStart).toFixed(2)}ms`);
            
            // HTML dokumento apdorojimas
            const parseStart = performance.now();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const parseEnd = performance.now();
            console.log(`${this.HIGHLIGHTER_NAME} HTML dokumento apdorojimas užtruko: ${(parseEnd - parseStart).toFixed(2)}ms`);

            const controlsStart = performance.now();
            const paginationControls = doc.querySelector('.pagination-controls');
            if (paginationControls) {
                paginationControls.remove();
            }
            const controlsEnd = performance.now();
           console.log(`${this.HIGHLIGHTER_NAME} Puslapiavimo kontrolių apdorojimas užtruko: ${(controlsEnd - controlsStart).toFixed(2)}ms`);

            // Vietoj _processNode, naudosime naują metodą, kuris naudoja žymių žemėlapį
            const processStart = performance.now();
            this._applyMarkupMap(doc.body, markupMap);
            const processEnd = performance.now();
            console.log(`${this.HIGHLIGHTER_NAME} Žymėjimo procesas užtruko: ${(processEnd - processStart).toFixed(2)}ms`);

            // Kontrolių grąžinimas
            if (paginationControls) {
                doc.body.appendChild(paginationControls);
            }

            // Galutinio HTML generavimas
            const htmlStart = performance.now();
            const processedHtml = doc.body.innerHTML;
            const htmlEnd = performance.now();
            console.log(`${this.HIGHLIGHTER_NAME} HTML generavimas užtruko: ${(htmlEnd - htmlStart).toFixed(2)}ms`);
            
            // Pažymėjimų išsaugojimas
            const saveStart = performance.now();
            this.saveHighlights();
            const saveEnd = performance.now();
            console.log(`${this.HIGHLIGHTER_NAME} Galutinis pažymėjimų išsaugojimas užtruko: ${(saveEnd - saveStart).toFixed(2)}ms`);
            
            console.log("GALUTINIS HTML (pradžia):", processedHtml.substring(0, 200));
            
            const endTime = performance.now();
            console.log(`${this.HIGHLIGHTER_NAME} Visas teksto žymėjimo procesas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
            
            return processedHtml;
        } catch (error) {
            console.error('Klaida žymint tekstą:', error);
            const endTime = performance.now();
            console.log(`${this.HIGHLIGHTER_NAME} Teksto žymėjimas nepavyko, užtruko: ${(endTime - startTime).toFixed(2)}ms`);
            return html;
        }
    }

    _processNode(node, words) {
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
                console.log(`${this.HIGHLIGHTER_NAME} Apdorota ${nodesProcessed.count} mazgų (${nodesProcessed.textNodes} teksto, ${nodesProcessed.elementNodes} elemento), užtruko: ${(currentTime - startTime).toFixed(2)}ms`);
            }
        };
        
        processNodeInternal(node);
        
        const endTime = performance.now();
        console.log(`${this.HIGHLIGHTER_NAME} DOM apdorojimas užtruko: ${(endTime - startTime).toFixed(2)}ms, apdorota ${nodesProcessed.count} mazgų (${nodesProcessed.textNodes} teksto, ${nodesProcessed.elementNodes} elemento)`);
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
            console.log(`${this.HIGHLIGHTER_NAME} Žodžių paieška tekste užtruko: ${(matchEnd - matchStart).toFixed(2)}ms, rasta ${matches.length} atitikmenų iš ${totalComparisons} palyginimų`);
        }

        // Rūšiavimas
        const sortStart = performance.now();
        matches.sort((a, b) => a.start - b.start);
        const sortEnd = performance.now();
        
        if (matches.length > 100) {
            console.log(`${this.HIGHLIGHTER_NAME} Atitikmenų rūšiavimas užtruko: ${(sortEnd - sortStart).toFixed(2)}ms`);
        }

        // Persidengimų filtravimas
        const filterStart = performance.now();
        const filteredMatches = this._filterOverlappingMatches(matches);
        const filterEnd = performance.now();
        
        if (matches.length > 0) {
            console.log(`${this.HIGHLIGHTER_NAME} Persidengimų filtravimas užtruko: ${(filterEnd - filterStart).toFixed(2)}ms, atmesta ${matches.length - filteredMatches.length} persidengimų`);
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
            console.log(`${this.HIGHLIGHTER_NAME} DOM fragmento kūrimas užtruko: ${(fragmentEnd - fragmentStart).toFixed(2)}ms, sukurta ${filteredMatches.length} pažymėtų elementų`);
        }

        const endTime = performance.now();
        if (matches.length > 0) {
            console.log(`${this.HIGHLIGHTER_NAME} Žodžių žymėjimas užtruko: ${(endTime - startTime).toFixed(2)}ms, pažymėta ${filteredMatches.length} žodžių`);
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
            console.log(`${this.HIGHLIGHTER_NAME} Persidengimų filtravimas užtruko: ${(endTime - startTime).toFixed(2)}ms, atlikta ${comparisons} palyginimų, liko ${filteredMatches.length} iš ${matches.length}`);
        }
        
        return filteredMatches;
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
            console.log(`${this.HIGHLIGHTER_NAME} Popup duomenų apdorojimas užtruko: ${(parseEnd - parseStart).toFixed(2)}ms`);
            
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
            console.log(`${this.HIGHLIGHTER_NAME} Popup kūrimas užtruko: ${(createEnd - createStart).toFixed(2)}ms`);

            // Popup pozicionavimas
            const positionStart = performance.now();
			const targetRect = event.target.getBoundingClientRect();
			popup.style.left = `${window.scrollX + targetRect.left}px`;
			popup.style.top = `${window.scrollY + targetRect.bottom + 5}px`;

			const rect = event.target.getBoundingClientRect();
			document.body.appendChild(popup);
			this.activePopup = popup;
			this._adjustPopupPosition(popup);

			document.addEventListener('click', (e) => {
				if (!popup.contains(e.target) && !event.target.contains(e.target)) {
					popup.remove();
				}
			});
            const positionEnd = performance.now();
            console.log(`${this.HIGHLIGHTER_NAME} Popup pozicionavimas užtruko: ${(positionEnd - positionStart).toFixed(2)}ms`);

            const endTime = performance.now();
            console.log(`${this.HIGHLIGHTER_NAME} Viso popup apdorojimas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
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
        console.log(`${this.HIGHLIGHTER_NAME} Popup pozicijos korekcija užtruko: ${(endTime - startTime).toFixed(2)}ms`);
	}

    _handleDocumentClick(event) {
        const startTime = performance.now();
        
        if (this.activePopup && !event.target.closest('.word-info-popup')) {
            this._removeAllPopups();
            document.removeEventListener('click', this._handleDocumentClick.bind(this));
        }
        
        const endTime = performance.now();
        console.log(`${this.HIGHLIGHTER_NAME} Dokumento paspaudimo apdorojimas užtruko: ${(endTime - startTime).toFixed(2)}ms`);
    }

    _removeAllPopups() {
        const startTime = performance.now();
        
        const popups = document.querySelectorAll('.word-info-popup');
        popups.forEach(popup => popup.remove());
        this.activePopup = null;
        
        const endTime = performance.now();
        if (popups.length > 0) {
            console.log(`${this.HIGHLIGHTER_NAME} Visų popup šalinimas užtruko: ${(endTime - startTime).toFixed(2)}ms, pašalinta: ${popups.length}`);
        }
    }

    async _createMarkupMap(text, patterns) {
        const startTime = performance.now();
        
        // Sukuriame bazinį HTML iš teksto
        const tempDoc = document.createElement('div');
        tempDoc.innerHTML = text;
        
        // Žemėlapis, kuriame saugosime rastas žymėjimo vietas
        const markupMap = [];
        
        // Analizuojame grynąjį tekstą
        const plainText = tempDoc.textContent;
        
        // Ieškome kiekvieno žodžio grynajame tekste
        Object.entries(patterns).forEach(([pattern, info]) => {
            let index = 0;
            const lowerText = plainText.toLowerCase();
            const lowerPattern = pattern.toLowerCase();
            
            while ((index = lowerText.indexOf(lowerPattern, index)) !== -1) {
                // Tikriname, ar tai pilnas žodis
                if (this._isFullWord(plainText, index, index + lowerPattern.length)) {
                    markupMap.push({
                        start: index,
                        end: index + lowerPattern.length,
                        text: plainText.slice(index, index + lowerPattern.length),
                        pattern: pattern,
                        info: info
                    });
                }
                index += 1;
            }
        });
        
        // Surūšiuojame markupMap pagal start poziciją
        markupMap.sort((a, b) => a.start - b.start);
        
        // Filtruojame persidengimus
        const filteredMap = this._filterOverlappingMatches(markupMap);
        
        const endTime = performance.now();
        console.log(`${this.HIGHLIGHTER_NAME} Žymių žemėlapio sukūrimas užtruko: ${(endTime - startTime).toFixed(2)}ms, rasta ${filteredMap.length} žymėtinų vietų`);
        
        return filteredMap;
    }

    // Papildomas pagalbinis metodas žodžio riboms patikrinti
    _isFullWord(text, start, end) {
        const wordBoundaryRegex = /[\s.,!?;:'"„"\(\)\[\]{}<>\/\-—–]/;
        
        function isWordBoundary(char) {
            return !char || wordBoundaryRegex.test(char);
        }
        
        const prevChar = start > 0 ? text[start - 1] : ' ';
        const nextChar = end < text.length ? text[end] : ' ';
        return isWordBoundary(prevChar) && isWordBoundary(nextChar);
    }

    _applyMarkupMap(rootNode, markupMap) {
        const startTime = performance.now();
        
        // Surenkame visus teksto mazgus
        const textNodes = [];
        this._collectTextNodes(rootNode, textNodes);
        
        console.log(`${this.HIGHLIGHTER_NAME} Rasta ${textNodes.length} teksto mazgų`);
        
        // Taikome žymių žemėlapį teksto mazgams
        let processedNodes = 0;
        
        textNodes.forEach(node => {
            if (this._isInPaginationControls(node)) return;
            
            // Žiūrime, kurie markup elementai patenka į šį teksto mazgą
            const nodeMarkups = markupMap.filter(markup => {
                const nodeText = node.textContent;
                const markupText = markup.text.toLowerCase();
                const nodeTextLower = nodeText.toLowerCase();
                
                // Ieškome ar šis mazgas turi pažymėtiną tekstą
                return nodeTextLower.includes(markupText);
            });
            
            if (nodeMarkups.length > 0) {
                // Turime ką pažymėti šiame mazge
                const fragment = this._createHighlightedFragment(node.textContent, nodeMarkups);
                node.parentNode.replaceChild(fragment, node);
                processedNodes++;
            }
        });
        
        const endTime = performance.now();
        console.log(`${this.HIGHLIGHTER_NAME} Žymių žemėlapio taikymas užtruko: ${(endTime - startTime).toFixed(2)}ms, apdorota ${processedNodes} mazgų iš ${textNodes.length}`);
    }

    // Pagalbinis metodas teksto mazgams surinkti
    _collectTextNodes(node, textNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            if (node.textContent.trim()) {
                textNodes.push(node);
            }
        } else if (node.childNodes && !node.classList?.contains('pagination-controls')) {
            Array.from(node.childNodes).forEach(child => {
                this._collectTextNodes(child, textNodes);
            });
        }
    }

    // Pagalbinis metodas fragmentui su pažymėjimais sukurti
    _createHighlightedFragment(text, markups) {
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        
        // Surūšiuojame pagal pradžios poziciją
        markups.sort((a, b) => a.start - b.start);
        
        markups.forEach(markup => {
            const markupTextLower = markup.text.toLowerCase();
            const textLower = text.toLowerCase();
            
            let index = textLower.indexOf(markupTextLower, lastIndex);
            if (index === -1) return;
            
            // Pridedame tekstą prieš šį markup
            if (index > lastIndex) {
                fragment.appendChild(
                    document.createTextNode(text.slice(lastIndex, index))
                );
            }
            
            // Sukuriame span su pažymėjimu
            const span = document.createElement('span');
            span.className = markup.info.type === 'phrase' ? 'highlight-phrase' : 'highlight-word';
            span.textContent = text.slice(index, index + markup.text.length);
            
            // Pridedame duomenis apie pažymėjimą
            span.dataset.info = JSON.stringify({
                text: markup.text,
                type: markup.info.type,
                meanings: markup.info.info?.meanings || [{
                    "vertimas": markup.info.info?.vertimas || '-',
                    "kalbos dalis": markup.info.info?.["kalbos dalis"] || '-',
                    "bazinė forma": markup.info.info?.["bazinė forma"] || '-',
                    "bazė vertimas": markup.info.info?.["bazė vertimas"] || '-',
                    "CEFR": markup.info.info?.CEFR || '-'
                }]
            });
            
            fragment.appendChild(span);
            lastIndex = index + markup.text.length;
        });
        
        // Pridedame likusį tekstą po paskutinio markup
        if (lastIndex < text.length) {
            fragment.appendChild(
                document.createTextNode(text.slice(lastIndex))
            );
        }
        
        return fragment;
    }
}
