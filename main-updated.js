import Papa from 'papaparse'
import Chart from 'chart.js/auto';
const LINES = [
    'total',
    'cs149',
    'cs159',
    'cs227',
    'cs240',
    'cs261',
  ]
function noNBSP(x) {
  return x.replaceAll(String.fromCharCode(160), ' ');
}

function chartDataSetFromData(d, key, color='#450084') {
  return {
    label: key, // Y-axis label from CSV
    data: d.map((x) => x[key]),
    borderColor: color,
    borderWidth: 2,
    fill: false,
  }
}

function TADataToChartDataSets (data) {

  // from Wong7: https://davidmathlogic.com/colorblind/#%23000000-%23E69F00-%2356B4E9-%23009E73-%23F0E442-%230072B2-%23D55E00-%23CC79A7
  const colors = [
    'black',
    '#E69F00',
    '#56B4E9',
    '#009E73',
    '#F0E442',
    '#0072B2',
    '#D55E00',
    '#CC79A7'
  ]
  return LINES.map((line, i) => chartDataSetFromData(data, line, colors[i]))
}

async function init() {
  document.getElementById("csvFileInput").addEventListener("change", function (event) {
    const file = event.target.files[0];

    if (file) {
      // console.log('file', file)
      Papa.parse(file, {
        header: true, // Set to false if your CSV does not have headers
        transformHeader: noNBSP,
        transform: noNBSP,
        skipEmptyLines: true,
        complete: function (results) {
          console.log(results.data)
          // debugger
          const mapped = results.data.map((d) => {
            // const chars = Object.keys(d).map(k => { 
            //   return k.split("").map(c => { 
            //     if (c.charCodeAt(0) === 160) {
            //     console.log(c, c.charCodeAt(0)); }
            //     return c.charCodeAt(0) 
            //   }) 
            // })
            // console.log(chars)
            return {
              'date': d["What is the date of the shift you are reporting for?"],
              'day': d["Please choose the day of the week."],
              'time': d["Please enter the time slot."],
              'total': parseInt(d["Approximately how many times did you help a student during your shift?"], 10),
              cs149: parseInt(d["How many CS 149 students?"], 10),
              cs159: parseInt(d["How many CS 159 Students?"], 10),
              cs227: parseInt(d["How many CS 227 Students?"], 10),
              cs240: parseInt(d["How many CS 240 Students?"], 10),
              cs261: parseInt(d["How many CS 261 Students?"], 10),
            }
          })
          console.log(mapped)

          const labels = mapped.map(d => d.date)
          console.log(labels)
          const datavals = mapped.map(({
            total,
            cs149,
            cs159,
            cs227,
            cs240,
            cs261
          }) => {
            // console.log(total,
            //   cs149,
            //   cs159,
            //   cs227,
            //   cs240,
            //   cs261);
            return {total: Math.max(total,
              cs149 +
              cs159 +
              cs227 +
              cs240 +
              cs261),cs149,
            cs159,
            cs227,
            cs240,
            cs261}
          })
          console.log(datavals)
          // const data = datavals
          // const data = datavals.map(d => d.total)
          // console.log(data); // Parsed data
          // document.getElementById("output").textContent = JSON.stringify(results.data, null, 2);


          // Create the line chart
          const container = document.getElementById('attendance-charts')
          LINES.forEach(makeAndAddChart(datavals))
        }
      });
    } else {
      alert("No file selected!");
    }
  });
}


function makeAndAddChart(data) {
  return (line) => {
    const canvas = document.createElement('canvas')
    canvas.setAttribute('width', 600)
    canvas.setAttribute('height', 400)
    canvas.classList.add('attendance-chart')
    document.getElementById('attendance-charts').appendChild(canvas)
    const ctx = canvas.getContext("2d");
    new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: TADataToChartDataSets(data),
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'date', // X-axis label
            },
          },
          y: {
            title: {
              display: true,
              text: 'helped', // Y-axis label
            },
            max: 25,
          },
        },
      },
    });
  }
}

init()