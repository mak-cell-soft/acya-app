/**
 * Convert number to French words (Tunisian Dinar format)
 */
export function numberToFrenchWords(amount: number): string {
    const units = ['', 'UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ', 'SIX', 'SEPT', 'HUIT', 'NEUF'];
    const teens = ['DIX', 'ONZE', 'DOUZE', 'TREIZE', 'QUATORZE', 'QUINZE', 'SEIZE', 'DIX-SEPT', 'DIX-HUIT', 'DIX-NEUF'];
    const tens = ['', '', 'VINGT', 'TRENTE', 'QUARANTE', 'CINQUANTE', 'SOIXANTE', 'SOIXANTE-DIX', 'QUATRE-VINGT', 'QUATRE-VINGT-DIX'];

    const dinars = Math.floor(amount);
    const millimes = Math.round((amount - dinars) * 1000);

    let result = '';

    // Convert dinars
    if (dinars === 0) {
        result = 'ZERO DINAR';
    } else {
        // Thousands
        const thousands = Math.floor(dinars / 1000);
        const remainder = dinars % 1000;

        if (thousands > 0) {
            if (thousands === 1) {
                result += 'MILLE ';
            } else {
                result += convertHundreds(thousands) + ' MILLE ';
            }
        }

        if (remainder > 0) {
            result += convertHundreds(remainder) + ' ';
        }

        result += dinars > 1 ? 'DINARS' : 'DINAR';
    }

    // Convert millimes
    if (millimes > 0) {
        result += ' ' + convertHundreds(millimes) + ' MILLIMES';
    }

    return result.trim();
}

/**
 * Helper function to convert hundreds
 */
function convertHundreds(num: number): string {
    const units = ['', 'UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ', 'SIX', 'SEPT', 'HUIT', 'NEUF'];
    const teens = ['DIX', 'ONZE', 'DOUZE', 'TREIZE', 'QUATORZE', 'QUINZE', 'SEIZE', 'DIX-SEPT', 'DIX-HUIT', 'DIX-NEUF'];
    const tens = ['', '', 'VINGT', 'TRENTE', 'QUARANTE', 'CINQUANTE', 'SOIXANTE', 'SOIXANTE-DIX', 'QUATRE-VINGT', 'QUATRE-VINGT-DIX'];

    let result = '';
    const hundredsDigit = Math.floor(num / 100);
    const remainder = num % 100;

    if (hundredsDigit > 0) {
        if (hundredsDigit === 1) {
            result += 'CENT ';
        } else {
            result += units[hundredsDigit] + ' CENT ';
        }
    }

    if (remainder >= 10 && remainder < 20) {
        result += teens[remainder - 10];
    } else {
        const tensDigit = Math.floor(remainder / 10);
        const unitsDigit = remainder % 10;

        if (tensDigit > 0) {
            result += tens[tensDigit];
            if (unitsDigit > 0) {
                result += ' ' + units[unitsDigit];
            }
        } else if (unitsDigit > 0) {
            result += units[unitsDigit];
        }
    }

    return result.trim();
}
