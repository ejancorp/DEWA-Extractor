# DEWA Extractor

## Overview

DEWA Extractor is a Node.js application designed to monitor water and electricity usage in Dubai and integrate it with a Home Assistant server. It scrapes data from DEWA (Dubai Electricity and Water Authority) accounts, saves it locally, and exposes it via JSON and CSV endpoints for easy integration with other systems.

## Features

- **Data Extraction**: Automatically retrieves water and electricity usage data from DEWA accounts.
- **Data Consolidation**: Consolidates extracted data and stores it locally.
- **JSON and CSV Endpoints**: Provides RESTful JSON and CSV endpoints for accessing historical usage data.

## Installation

To install DEWA Extractor, follow these steps:

1. Clone the repository: `git clone https://github.com/ejancorp/dewa-extractor.git`
2. Navigate to the project directory: `cd dewa-extractor`
3. Install dependencies: `npm install`
4. Set up your DEWA account credentials in the `.env` file.
5. Run the application: `npm start`

## Usage

After installation, you can access the following endpoints:

- `/csv/electricity`: Provides a CSV file of historical electricity usage data.
- `/csv/water`: Provides a CSV file of historical water usage data.
- `/`: Provides a JSON object with usage and consumption data, including summaries and reporting.

## Dependencies

DEWA Extractor relies on the following main libraries:

- **Express**: Fast, unopinionated, minimalist web framework for Node.js.
- **Puppeteer**: Headless Chrome Node.js API for web scraping.
- **SQLite3**: Asynchronous, non-blocking SQLite3 bindings for Node.js.

## Contributions

Contributions to DEWA Extractor are welcome! If you find any bugs or have suggestions for improvements, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
