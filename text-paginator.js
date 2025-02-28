export class TextPaginator {
    constructor(options = {}) {
        this.minWordsPerPage = 300; // Minimalus žodžių skaičius puslapyje
        this.currentPage = 1;
        this.content = '';
        this.pages = [];
        this.callbacks = {
            onPageChange: options.onPageChange || (() => {})
        };
    }

    getCurrentPage() {
        return this.currentPage;
    }

    setContent(text) {
        this.content = text;
        this.pages = this.splitIntoPages(text);
        this.currentPage = 1;
        return {
            ...this.getCurrentPageContent(),
            currentPage: this.getCurrentPage()
        };
    }

    splitIntoPages(text) {
        console.log("SKAIDOMAS TEKSTAS (pradžia):", text.substring(0, 200));
        
        // Pašaliname HTML žymes skaičiuojant žodžius
        const stripHtml = (html) => {
            const tmp = document.createElement('div');
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || '';
        };
        
        // Dalinamas tekstas į pastraipas, išlaikant žymas
        // Vietoj paprastos regexp, padarome labiau išmanų skaidymą
        const chunks = [];
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        
        // Naudojame originalų tekstą, bet tiesiog geriau jį suskaidome
        // Ieškome HTML pastraipų ir antraščių pagal žymų ribas
        const htmlChunks = text.split(/(<\/?(?:p|h[1-6]|div|section|article|blockquote)[^>]*>)/gi);
        
        let currentChunk = '';
        let inTag = false;
        let tagStack = [];
        
        for (let i = 0; i < htmlChunks.length; i++) {
            const chunk = htmlChunks[i];
            
            // Skaičiuojam žymų atidarymą/uždarymą
            if (chunk.match(/<\/?[^>]+>/)) {
                if (chunk.match(/<\//)) {
                    // Žymos uždarymas
                    if (tagStack.length > 0) {
                        tagStack.pop();
                    }
                    inTag = tagStack.length > 0;
                } else {
                    // Žymos atidarymas
                    tagStack.push(chunk);
                    inTag = true;
                }
            }
            
            currentChunk += chunk;
            
            // Jei esame už žymų ribų ir tai nėra tik tarpai, traktuojame tai kaip atskirą gabalą
            if (!inTag && chunk.trim() && !chunk.match(/<\/?[^>]+>/)) {
                chunks.push(currentChunk);
                currentChunk = '';
            }
        }
        
        // Pridedame likusį turinį
        if (currentChunk.trim()) {
            chunks.push(currentChunk);
        }
        
        // Dabar skaičiuojame žodžius ir skirstome į puslapius
        const pages = [];
        let currentPage = [];
        let wordCount = 0;
        
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const plainText = stripHtml(chunk);
            const words = plainText.trim().split(/\s+/).filter(Boolean).length;
           
           if (currentPage.length === 0) {
                currentPage.push(chunk);
                wordCount = words;
                continue;
            }
            
            if (wordCount >= this.minWordsPerPage) {
                pages.push(currentPage.join(''));
                currentPage = [chunk];
                wordCount = words;
            } else {
                currentPage.push(chunk);
                wordCount += words;
            }
        }
        
        if (currentPage.length > 0) {
            pages.push(currentPage.join(''));
        }
        
        console.log("Puslapių skaičius:", pages.length);
        return pages;
    }

    getCurrentPageContent() {
        return {
            content: this.pages[this.currentPage - 1] || '',
            currentPage: this.currentPage,
            totalPages: this.pages.length
        };
    }

    goToPage(pageNumber) {
		console.log('Bandoma pereiti į puslapį:', pageNumber);
		if (pageNumber < 1 || pageNumber > this.pages.length) {
			console.warn('Neteisingas puslapio numeris:', pageNumber);
			return false;
		}
		this.currentPage = pageNumber;
		const pageData = this.getCurrentPageContent();
		console.log('Puslapio duomenys:', pageData);
		this.callbacks.onPageChange(pageData);
		return true;
	}

    nextPage() {
        return this.goToPage(this.currentPage + 1);
    }

    previousPage() {
        return this.goToPage(this.currentPage - 1);
    }

    initializeSlider(container) {
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'page-slider';
        slider.min = 1;
        slider.value = 1;
        slider.max = this.pages.length;
        
        slider.addEventListener('input', (e) => {
            this.goToPage(parseInt(e.target.value));
        });
        
        this.slider = slider;
        return slider;
    }

    updateSlider() {
        if (this.slider) {
            this.slider.max = this.pages.length;
            this.slider.value = this.currentPage;
            console.log('Atnaujinamas slankiklis:', this.currentPage, 'iš', this.pages.length);
        }
    }
}
