const cheerio = require('cheerio');
const axios = require('axios');
const fetch = require('node-fetch');

const covidDataSourceUrl = 'http://covid19asi.saglik.gov.tr';
const totalPopulationInTurkey = 82000000;

function getCovidReportHtmlContent(html) {
    const content = cheerio.load(html);

  return {
        "singleDoze": Number((content('script')[13].children[0].data.match(/var asiyapilankisisayisi1Doz = (.*);/)[1]).replace("'", "").replace("'", "").split(".").join("")),
        "twoDozes": Number((content('script')[14].children[0].data.match(/var asiyapilankisisayisi2Doz = (.*);/)[1]).replace("'", "").replace("'", "").split(".").join("")),
        "threeDozes": Number((content('script')[15].children[0].data.match(/var asiyapilankisisayisi3Doz = (.*);/)[1]).replace("'", "").replace("'", "").split(".").join(""))
    };
}

function calculateSingleDozePercentage(data) {
    const totalCasualty = data.map(it => it.singleDoze).reduce((x, y) => x + y, 0);

    return Number((totalCasualty / totalPopulationInTurkey) * 100).toFixed(2);
}

function calculateTwoDozesPercentage(data) {
    const totalCasualty = data.map(it => it.twoDozes).reduce((x, y) => x + y, 0);

    return Number((totalCasualty / totalPopulationInTurkey) * 100).toFixed(2);
}

async function sendMessage2Twitter(singleDose, twoDozes) {
    let message = "Percentage%20of%20Population%20Vaccinated%20%0AProgress%20Bar:%20%20";
    const formattedPercentage = Math.round(twoDozes / 10);

    for (let idx = 1; idx < 11; idx++) {
        if (formattedPercentage >= idx) {
            message = message + "X";
        } else {
            message = message + "-";
        }
    }

    message = message + "%0ASingleDose%20Percentage:%20%20" + singleDose;
    message = message + "%0ATwoDoses%20Percentage:%20%20" + twoDozes;
    message = message + "%0APercentage%20of%20Effective%20Immunity:%20%20" + twoDozes + "%0A%23covid19%20%23covid";

    const opts = {
        "headers": {
            // your auth headers
        },
        "body": `status=${message}`,
        "method": "POST",
    };

    await fetch("https://api.twitter.com/1.1/statuses/update.json", opts);
    return message;
}

exports.handler = async function (event, context, callback) {
    try {
        console.log("Reading options from event:\n", event);
        const response = await axios.get(covidDataSourceUrl, {responseType: 'text'});

        const covidReport = getCovidReportHtmlContent(response.data);
        const calculateTotalSingleDozePercentage = calculateSingleDozePercentage(covidReport);
        const calculateTotalTwoDozesPercentage = calculateTwoDozesPercentage(covidReport);

        const message = await sendMessage2Twitter(calculateTotalSingleDozePercentage, calculateTotalTwoDozesPercentage);
        console.log(`daily covid computation success totalCasualtyPercentage: ${calculateTotalTwoDozesPercentage} ,message to twitter: ${message}`);
    } catch (err) {
        console.error(`error getting :(  ${err.name} ${err.message} ${err.stack}`);
    }

    callback(null, 'completion success');
};
