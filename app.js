const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const rp = require('request-promise');
const fs = require('fs');

class Car {
    constructor(name, price, engineSize, year, mileage, fuelType, link) {
        this.name = name;
        this.price = price;
        this.engineSize = engineSize;
        this.year = year;
        this.mileage = mileage;
        this.fuelType = fuelType;
        this.priceToEngineSizeRatio = parseFloat((Number(price) / Number(engineSize) * 1000).toFixed(2));
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

function getPageData(page) {
    return rp('https://www.otomoto.pl/osobowe/?search_new_used=&page=' + page).then(body => {
        console.log('Getting data from https://www.otomoto.pl/osobowe/?search_new_used=&page=' + page)
        const dom = new JSDOM(body);
        var list = dom.window.document.querySelector(".offers.list").querySelectorAll('article');

        if (list)
            for (var i = 0; i < list.length; i++) {
                name = list[i].querySelector('.offer-title a').getAttribute('title');

                price = list[i].querySelector('.offer-price__number');
                if (price) price = price.textContent.replace(/ /g, '').replace('PLN', '').replace('EUR', '').replace('\n', '').replace(',', '.');

                engineSize = list[i].querySelector('.offer-item__content .offer-item__params li[data-code="engine_capacity"] span');
                if (engineSize) engineSize = engineSize.textContent.replace('cm3', '').replace(/ /g, '');

                year = list[i].querySelector('.offer-item__content .offer-item__params li[data-code="year"] span');
                if (year) year = year.textContent.replace(/ /g, '');

                mileage = list[i].querySelector('.offer-item__content .offer-item__params li[data-code="mileage"] span');
                if (mileage) mileage = list[i].querySelector('.offer-item__content .offer-item__params li[data-code="mileage"] span').textContent.replace('km', '').replace(/ /g, '');

                fuelType = list[i].querySelector('.offer-item__content .offer-item__params li[data-code="fuel_type"] span');
                if (fuelType) fuelType = fuelType.textContent;

                link = list[i].getAttribute('data-href').replace('https://www.', '');

                if (name && price && engineSize && mileage && fuelType && link)
                    results.push(new Car(name, price, engineSize, year, mileage, fuelType, link));
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

async function getDataParallel(pages, showResults = true) {
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

var results = new Array();
var pagesArg = process.argv.slice(2)[0] ? process.argv.slice(2)[0] : 10;

getDataParallel(pagesArg, false);
