// logger.js - Paprastas logger derinimui

export class Logger {
    static log(title, data) {
        console.log(`\n==== ${title} ====`);
        
        if (data === null || data === undefined) {
            console.log('NULL arba UNDEFINED');
            return;
        }
        
        if (typeof data === 'object') {
            try {
                console.log(JSON.stringify(data, this._replacer, 2));
            } catch (error) {
                console.log('Negalima konvertuoti į JSON, naudojama console.dir:');
                console.dir(data, { depth: 5, colors: true });
            }
        } else {
            console.log(data);
        }
        
        console.log(`==== PABAIGA: ${title} ====\n`);
    }
    
    static _replacer(key, value) {
        if (value instanceof Map) {
            return {
                dataType: 'Map',
                value: Array.from(value.entries())
            };
        } else if (value instanceof Set) {
            return {
                dataType: 'Set',
                value: Array.from(value)
            };
        } else if (typeof value === 'function') {
            return 'Function';
        } else {
            return value;
        }
    }
}
