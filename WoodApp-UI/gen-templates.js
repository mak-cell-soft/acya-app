const ExcelJS = require('exceljs');
const path = require('path');

// Target directory relative to this script (assumed to be in the root of WoodApp-UI)
const targetDir = path.join(__dirname, 'src', 'assets', 'templates');

async function generateArticleTemplate() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Articles');
    
    sheet.columns = [
        { header: 'Reference', key: 'ref' },
        { header: 'Description', key: 'desc' },
        { header: 'CategoryName', key: 'cat' },
        { header: 'SubCategoryName', key: 'sub' },
        { header: 'IsWood', key: 'wood' },
        { header: 'Thickness', key: 'thick' },
        { header: 'Width', key: 'width' },
        { header: 'Unit', key: 'unit' },
        { header: 'SellPriceHT', key: 'price' },
        { header: 'LastPurchasePriceTTC', key: 'pur' },
        { header: 'TvaRate', key: 'tva' },
        { header: 'MinQuantity', key: 'min' },
        { header: 'Lengths', key: 'len' }
    ];
    
    sheet.addRow(['REF001', 'Exemple Article Bois', 'BOIS', 'CHENE', true, 25, 150, 'm3', 1200, 1000, 19, 10, '330,360']);
    sheet.addRow(['REF002', 'Exemple Article Accessoire', 'ACCESSOIRES', 'VIS', false, '', '', 'unite', 0.5, 0.3, 19, 100, '']);
    
    await workbook.xlsx.writeFile(path.join(targetDir, 'template_article.xlsx'));
    console.log('Article template generated');
}

async function generateCounterpartTemplate(type) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(type === 'customer' ? 'Clients' : 'Fournisseurs');
    
    sheet.columns = [
        { header: 'Name', key: 'name' },
        { header: 'FirstName', key: 'fname' },
        { header: 'LastName', key: 'lname' },
        { header: 'Email', key: 'email' },
        { header: 'TaxRegistrationNumber', key: 'tax' },
        { header: 'IdentityCardNumber', key: 'cin' },
        { header: 'Address', key: 'addr' },
        { header: 'Gouvernorate', key: 'gov' },
        { header: 'PhoneNumberOne', key: 'ph1' },
        { header: 'PhoneNumberTwo', key: 'ph2' },
        { header: 'JobTitle', key: 'job' },
        { header: 'Notes', key: 'notes' }
    ];
    
    if (type === 'customer') {
        sheet.addRow(['STE EXEMPLE', '', '', 'contact@exemple.com', '1234567/A/M/000', '', 'Avenue de l\'Indépendance', 'Tunis', '71000000', '', 'Industrie', 'Client fidèle']);
    } else {
        sheet.addRow(['FOURNISSEUR BOIS', '', '', 'import@bois.com', '7654321/B/N/000', '', 'Zone Industrielle', 'Sfax', '74000000', '', 'Grossiste', '']);
    }
    
    await workbook.xlsx.writeFile(path.join(targetDir, `template_${type}.xlsx`));
    console.log(`${type} template generated`);
}

async function main() {
    await generateArticleTemplate();
    await generateCounterpartTemplate('customer');
    await generateCounterpartTemplate('provider');
}

main().catch(console.error);
