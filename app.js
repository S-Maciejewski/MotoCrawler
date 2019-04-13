const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const rp = require('request-promise');
const fs = require('fs');

class Car {
    constructor(name, price, engineSize, year, mileage, fuelType, link) {
        this.name = name;
        this.price = Math.round(Number(price));
        this.engineSize = Math.round(Number(engineSize));
        this.year = year;
        this.mileage = Math.round(Number(mileage));
        this.fuelType = fuelType;
        this.priceToEngineSizeRatio = Math.round((Number(price) / Number(engineSize) * 1000));
        this.link = link;
    }
    show() {
        console.log('\nName: ', this.name);
        console.log('Year: ', this.year);
        console.log('Mileage: ', this.mileage);
        console.log('Fuel type: ', this.fuelType);
        console.log('Price: ', this.price);
        console.log('Engine size: ', this.engineSize);
        console.log('Price per liter of engine capacity: ', this.priceToEngineSizeRatio);
    }
}

function isReal(car) {
    return !((car.year == currentYear || car.year == currentYear - 1) && car.price < 20000) && car.mileage < 1000000 && car.price < 20000000;
}

function getParsedCarData(name, price, engineSize, year, mileage, fuelType, link) {
    if (!price.textContent.includes('EUR'))
        price = price.textContent.replace(/ /g, '').replace('PLN', '').replace('\n', '').replace(',', '.');
    else
        price = Number(price.textContent.replace(/ /g, '').replace('EUR', '').replace('\n', '').replace(',', '.')) * euroPrice;

    if (!isElectric(fuelType))
        engineSize = engineSize.textContent.replace('cm3', '').replace(/ /g, '');
    else
        engineSize = 1;
    year = year.textContent.replace(/ /g, '');
    mileage = mileage.textContent.replace('km', '').replace(/ /g, '');
    fuelType = fuelType.textContent;

    let car = new Car(name, price, engineSize, year, mileage, fuelType, link);
    if (isReal(car))
        return car;
    console.log('Filtered out an unrealistic offer:', link);
    return null;
}

function isElectric(fuelType) {
    return fuelType.textContent == 'Elektryczny';
}

function getPageData(page) {
    return rp('https://www.otomoto.pl/osobowe/?search_new_used=&page=' + page).then(body => {
        console.log('Getting data from https://www.otomoto.pl/osobowe/?search_new_used=&page=' + page)
        const dom = new JSDOM(body);
        var list = dom.window.document.querySelector(".offers.list").querySelectorAll('article');

        if (list)
            for (var i = 0; i < list.length; i++) {
                name = list[i].querySelector('.offer-title a').getAttribute('title');
                price = list[i].querySelector('.offer-price__number');
                engineSize = list[i].querySelector('.offer-item__content .offer-item__params li[data-code="engine_capacity"] span');
                year = list[i].querySelector('.offer-item__content .offer-item__params li[data-code="year"] span');
                mileage = list[i].querySelector('.offer-item__content .offer-item__params li[data-code="mileage"] span');
                fuelType = list[i].querySelector('.offer-item__content .offer-item__params li[data-code="fuel_type"] span');
                link = list[i].getAttribute('data-href').replace('https://www.', '');

                if (name && price && (engineSize || (fuelType && isElectric(fuelType))) && mileage && fuelType && link) {
                    let car = getParsedCarData(name, price, engineSize, year, mileage, fuelType, link);
                    if (car)
                        results.push(getParsedCarData(name, price, engineSize, year, mileage, fuelType, link));
                }
            }
    }).catch(err => {
        console.log('Error occured while getting data, details: ', err);
    });
}

function getPages(pages) {
    let promises = [];
    for (var page = 1; page <= pages; page++)
        promises.push(getPageData(page));
    return Promise.all(promises);
}

function getEuroPriceData() {
    return rp('https://stooq.pl/q/?s=eurpln').then(body => {
        console.log('Getting data from https://stooq.pl/q/?s=eurpln');
        let price = Number(new JSDOM(body).window.document.getElementById('aq_eurpln_c5').textContent.replace(/ /g, ''));
        console.log('Euro price:', price);
        euroPrice = price ? price : 4;
    });
}

async function getDataParallel(pages, showResults = false) {
    await getEuroPriceData();
    await getPages(pages);
    results.sort((a, b) => (a.priceToEngineSizeRatio < b.priceToEngineSizeRatio) ? 1 : ((a.priceToEngineSizeRatio > b.priceToEngineSizeRatio) ? -1 : 0));
    if (showResults) results.forEach(obj => obj.show());
    writeResultsToCSV();
}

function writeResultsToCSV() {
    const replacer = (key, value) => value === null ? '' : value;
    const header = Object.keys(results[0]);
    let csv = results.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer).replace(/\"/g, '')).join(','));
    csv.unshift(header.join(','));
    csv = csv.join('\r\n');

    fs.writeFile("cars.csv", csv, function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("Csv file successfully generated");
    });
}

var euroPrice = 4;
var currentYear = new Date().getFullYear();
var results = new Array();
var pagesArg = process.argv.slice(2)[0] ? process.argv.slice(2)[0] : 10;

getDataParallel(pagesArg);
