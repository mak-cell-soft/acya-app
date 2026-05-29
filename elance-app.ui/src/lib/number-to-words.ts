/**
 * Converts a numeric amount to French words using the Tunisian Dinar format.
 * Since Tunisian Dinars have 3 decimal places, the fractional part represents Millimes (0-999).
 * 
 * NOTE: This is a direct port from the Angular `number-to-words.util.ts` file to maintain consistency
 * in print outputs.
 *
 * @param amount - The numeric amount to convert (e.g. 219.538)
 * @returns The amount in French words (e.g. "DEUX CENT DIX NEUF DINARS CINQ CENT TRENTE HUIT MILLIMES")
 */
export function numberToFrenchWords(amount: number): string {
    const dinars = Math.floor(amount);
    
    // Math.round is used here to avoid floating point precision issues when multiplying by 1000.
    // e.g. 0.538 * 1000 can sometimes yield 537.9999999999999
    const millimes = Math.round((amount - dinars) * 1000);

    let result = '';

    // Convert the integer portion (Dinars)
    if (dinars === 0) {
        result = 'ZERO DINAR';
    } else {
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

        // Handle singular/plural dinars word ending
        result += dinars > 1 ? 'DINARS' : 'DINAR';
    }

    // Convert the fractional portion (Millimes)
    if (millimes > 0) {
        result += ' ' + convertHundreds(millimes) + ' MILLIMES';
    }

    return result.trim();
}

/**
 * Helper function to convert any number from 1 to 999 into French words.
 * Used recursively for the thousands, hundreds, and units columns.
 */
function convertHundreds(num: number): string {
    const units = ['', 'UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ', 'SIX', 'SEPT', 'HUIT', 'NEUF'];
    const teens = ['DIX', 'ONZE', 'DOUZE', 'TREIZE', 'QUATORZE', 'QUINZE', 'SEIZE', 'DIX-SEPT', 'DIX-HUIT', 'DIX-NEUF'];
    const tens = ['', '', 'VINGT', 'TRENTE', 'QUARANTE', 'CINQUANTE', 'SOIXANTE', 'SOIXANTE-DIX', 'QUATRE-VINGT', 'QUATRE-VINGT-DIX'];

    let result = '';
    const hundredsDigit = Math.floor(num / 100);
    const remainder = num % 100;

    // Convert hundreds digit
    if (hundredsDigit > 0) {
        if (hundredsDigit === 1) {
            result += 'CENT ';
        } else {
            result += units[hundredsDigit] + ' CENT ';
        }
    }

    // Convert remaining two digits
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
