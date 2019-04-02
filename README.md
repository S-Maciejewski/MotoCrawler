# MotoCrawler
Node.js application for screen scraping data about cars listed for sale at otomoto.pl.

To run this script, be sure to have **node** and **npm** installed.
To install the necessary libraries run `npm install`,
then run script with `node app.js <howManyPages>`.

Retrieves information about cars, including:
- name (usually model and manufacturer)
- price in PLN
- engine capacity
- year of production
- mileage in km
- fuel type
- price to engine capacity ratio

Results are sorted by ratio, most expensive per liter first.