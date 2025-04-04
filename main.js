import Papa from "papaparse";
import Chart from "chart.js/auto";

const LEAD_PAY_RATE = 13.0;
const NON_LEAD_PAY_RATE = 12.0;
const TAS_PER_ONLINE_SHIFT = 0;
const LEAD_TAS_PER_ONLINE_SHIFT = 1;
const TAS_PER_LAB_SHIFT = 2;
const LEAD_TAS_PER_LAB_SHIFT = 1;
const S25 = {
  LEAD_PAY_RATE: 13.0,
  NON_LEAD_PAY_RATE: 12.41,
  TAS_PER_ONLINE_SHIFT: 1,
  LEAD_TAS_PER_ONLINE_SHIFT: 1,
  TAS_PER_LAB_SHIFT: 2,
  LEAD_TAS_PER_LAB_SHIFT: 1,
};

let onlineSessionCount, inPersonSessionCount, laborEstimate;

const LINES = ["total", "cs149", "cs159", "cs227", "cs240", "cs261"];

// from Wong7: https://davidmathlogic.com/colorblind/#%23000000-%23E69F00-%2356B4E9-%23009E73-%23F0E442-%230072B2-%23D55E00-%23CC79A7
const COLORS = [
  "black",
  "#E69F00",
  "#56B4E9",
  "#009E73",
  "#F0E442",
  "#0072B2",
  "#D55E00",
  "#CC79A7",
];

function transformHeader(x) {
  return noNBSP(x);
}

function noNBSP(x) {
  return x.replaceAll(String.fromCharCode(160), " ");
}

function beforeFirstChunk(x) {
  const allRows = x.split(/\r\n|\r|\n/); // https://stackoverflow.com/a/35265175/1449799
  const withoutFirst3 = allRows.splice(3).join("\r\n");
  return withoutFirst3;
}

function chartDataSetFromData(d, key, color = "#450084") {
  const mpd = d.map((x) => x[key]);
  return {
    label: key, // Y-axis label from CSV
    data: mpd,
    borderColor: color,
    borderWidth: 2,
    fill: false,
  };
}

function TADataToChartDataSets(data, singleLine = false, idx = false) {
  if (singleLine !== false && idx !== false) {
    return [chartDataSetFromData(data, singleLine, COLORS[idx])];
  }
  return LINES.map((line, i) => chartDataSetFromData(data, line, COLORS[i]));
}

async function init() {
  // document.getElementById("csvFileInput").addEventListener("change", function (event) {
  const formElem = document.getElementById("file-selection-form");
  formElem.addEventListener("submit", function (event) {
    console.log('got submit')
    event.preventDefault();
    const formData = new FormData(formElem);
    const files = formData.getAll("csv");
    // debugger;
    Promise.all(files.map(file=>csvToChartData(file, file.name)))
      .then((semesters) => {
        semesters.forEach(({labels,datavals, uniqueCounts}, i) => {
          console.log(i, uniqueCounts, labels, datavals);
        });
    });
  });
  const defaultBtn = document.getElementById('default-button');
  defaultBtn.addEventListener('click', async (ev) => {
    // ev.preventDefault();
    ev.stopPropagation();
    const defaultData = [
      // 'sanitized-logs/1231-spring23-ta-hours-log-sanitized.csv', // we don't have info about which course attendees were asking about in s23
      'sanitized-logs/1238-fall23-ta-hours-log-sanitized.csv',
      'sanitized-logs/1241-spring24-ta-hours-log-sanitized.csv',
      'sanitized-logs/1248-fall24-ta-hours-log-sanitized.csv',
      'sanitized-logs/1251-spring25-to-date-sanitized.csv',
    ];
    const csvText = await Promise.all(defaultData.map(async filename=>(await fetch(filename)).text()))
    console.log('csvText', csvText)
    const results = await Promise.all(csvText.map((file,i) => csvToChartData(file, defaultData[i])))
      .then((semesters) => {
        semesters.forEach(({ labels, datavals, uniqueCounts }, i) => {
          console.log(i, uniqueCounts, labels, datavals);
        });
      });
  })
}

function csvToChartData(file, dataLabel) {
  const semesterResultsPromise = new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true, // Set to false if your CSV does not have headers
      transformHeader: noNBSP,
      transform: noNBSP,
      skipEmptyLines: true,
      beforeFirstChunk: beforeFirstChunk,
      complete: r => resolve(didParse(r, file, dataLabel)),
    });
  });
  return semesterResultsPromise;
}

function taDataToChartData(data) {
  const mapped = data.map((d) => {
    return {
      date: d["What is the date of the shift you are reporting for?"],
      day: d["Please choose the day of the week."],
      time: d["Please enter the time slot."],
      total: parseInt(
        d[
          "Approximately how many times did you help a student during your shift?"
        ],
        10
      ),
      cs149: parseInt(d["How many CS 149 students?"], 10),
      cs159: parseInt(d["How many CS 159 Students?"], 10),
      cs227: parseInt(d["How many CS 227 Students?"], 10),
      cs240: parseInt(d["How many CS 240 Students?"], 10),
      cs261: parseInt(d["How many CS 261 Students?"], 10),
    };
  });
  const labels = mapped.map((d) => d.date);

  const uniqueDates = new Set(labels);
  const uniqueLabels = Array.from(uniqueDates);
  let missingReports = 0;
  for (let ul of uniqueLabels) {
    const reportCount = labels.filter((l) => l === ul).length;
    let d = new Date(ul);
    if (d.getDay() === 0 && reportCount < 4) {
      missingReports += 4 - reportCount;
      console.log(
        ul,
        "expected",
        4,
        "got",
        reportCount,
        "missing",
        4 - reportCount
      );
    } else if (d.getDay() < 5 && reportCount < 3) {
      missingReports += 3 - reportCount;
      console.log(
        ul,
        "expected",
        3,
        "got",
        reportCount,
        "missing",
        3 - reportCount
      );
    }
  }
  console.log("missingReports", missingReports);
  console.log("collected reports", mapped.length);
  onlineSessionCount = mapped.filter((shift) => shift.time == 4).length;
  inPersonSessionCount = mapped.length - onlineSessionCount;
  console.log(
    "in-person vs. online sessions:",
    inPersonSessionCount,
    onlineSessionCount
  );
  laborEstimate =
    onlineSessionCount *
      (LEAD_PAY_RATE * LEAD_TAS_PER_ONLINE_SHIFT +
        NON_LEAD_PAY_RATE * TAS_PER_ONLINE_SHIFT) +
    inPersonSessionCount *
      (LEAD_PAY_RATE * LEAD_TAS_PER_LAB_SHIFT +
        NON_LEAD_PAY_RATE * TAS_PER_LAB_SHIFT);
  console.log("appx labor for shifts", laborEstimate);
  const uniqueCounts = uniqueLabels.map((x) => ({
    total: 0,
    cs149: 0,
    cs159: 0,
    cs227: 0,
    cs240: 0,
    cs261: 0,
  }));
  const datavals = mapped.map(
    ({ total, cs149, cs159, cs227, cs240, cs261, date }) => {
      const lblIdx = uniqueLabels.indexOf(date);
      uniqueCounts[lblIdx].total += total;
      uniqueCounts[lblIdx].cs149 += cs149;
      uniqueCounts[lblIdx].cs159 += cs159;
      uniqueCounts[lblIdx].cs227 += cs227;
      uniqueCounts[lblIdx].cs240 += cs240;
      uniqueCounts[lblIdx].cs261 += cs261;
      return {
        total: Math.max(total, cs149 + cs159 + cs227 + cs240 + cs261),
        cs149,
        cs159,
        cs227,
        cs240,
        cs261,
      };
    }
  );
  console.log("uniqueLabels", uniqueLabels);
  console.log("labels", labels, "datavals", datavals, mapped, data);
  return { labels: uniqueLabels, datavals, uniqueCounts };
}

function makeAggregateChart(
  { labels, datavals },
  { details, pieCanvas, lineCanvas }
) {
  const pieLabels = Object.keys(datavals[0]).filter((k) => k != "total");
  datavals.forEach((d, i) => {
    let nightTotal = 0;
    for (let k of pieLabels) {
      if (isNaN(d[k])) {
        continue;
      }
      nightTotal += d[k];
    }

    // some validation
    // if the sum of the totals per course isn't the same as the total,
    // log it and
    // if the sum of the totals is more than 5 diff to the total use the sum as the total
    if (!isNaN(d.total) && nightTotal != d.total) {
      console.log(
        "nightTotal",
        d,
        nightTotal,
        "d.total",
        d.total,
        "i",
        i,
        "labels[i]",
        labels[i]
      );
      if (Math.abs(nightTotal - d.total) > 5) {
        d.total = nightTotal;
      }
    }
  });
  const sums = {};
  for (let k of pieLabels) {
    sums[k] = 0;
  }
  const totals = datavals.reduce((acc, curr) => {
    // console.log('acc', acc, 'curr', curr)
    const res = {};
    for (const [k, v] of Object.entries(acc)) {
      if (isNaN(curr[k])) {
        res[k] = v;
      } else {
        res[k] = curr[k] + v;
      }
    }
    return res;
  }, sums);
  const datasets = [
    {
      label: "Total attendance by course",
      data: pieLabels.map((k, i) => totals[k]),
      backgroundColor: COLORS.slice(1, pieLabels.length + 1),
    },
  ];

  const dataTable = document.createElement("table");
  dataTable.classList.add("table");
  const tHead = document.createElement("thead");
  const dataHeaders = document.createElement("tr");
  const header0 = document.createElement("th");
  const header1 = document.createElement("th");
  const header2 = document.createElement("th");
  header0.setAttribute("scope", "col");
  header1.setAttribute("scope", "col");
  header2.setAttribute("scope", "col");
  header0.textContent = "Course";
  header1.textContent = "Count";
  header2.textContent = "Percentage";
  dataHeaders.appendChild(header0);
  dataHeaders.appendChild(header1);
  dataHeaders.appendChild(header2);
  tHead.appendChild(dataHeaders);
  dataTable.appendChild(tHead);
  const tb = document.createElement("tbody");
  const totalSum = Object.values(totals).reduce((acc, curr) => acc + curr, 0);
  for (let k of pieLabels) {
    const row = document.createElement("tr");
    const cell0 = document.createElement("th");
    cell0.setAttribute("scope", "row");
    const cell1 = document.createElement("td");
    const cell2 = document.createElement("td");
    cell0.textContent = k;
    cell1.textContent = totals[k];
    cell2.textContent = `${((totals[k] / totalSum) * 100).toFixed(2)}%`;
    row.appendChild(cell0);
    row.appendChild(cell1);
    row.appendChild(cell2);
    tb.appendChild(row);
  }
  dataTable.appendChild(tb);
  const tf = document.createElement("tfoot");
  const row = document.createElement("tr");
  const cell0 = document.createElement("th");
  cell0.setAttribute("scope", "row");
  const cell1 = document.createElement("td");
  const cell2 = document.createElement("td");
  cell0.textContent = "Grand Total";
  cell1.textContent = totalSum;
  if (onlineSessionCount && inPersonSessionCount && laborEstimate) {
    console.log(
      "Estimated Cost of each student question: ",
      laborEstimate / totalSum
    );
  }
  cell2.textContent = `${((totalSum / totalSum) * 100).toFixed(2)}%`;
  row.appendChild(cell0);
  row.appendChild(cell1);
  row.appendChild(cell2);
  tf.appendChild(row);
  if (onlineSessionCount && inPersonSessionCount && laborEstimate) {
    const labCostRow = document.createElement("tr");
    const labCostCell0 = document.createElement("th");
    labCostCell0.setAttribute("scope", "row");
    const labCostCell1 = document.createElement("td");
    const labCostCell2 = document.createElement("td");
    labCostCell0.textContent = "Estimated Cost of each student question";
    labCostCell1.textContent = `\$${(laborEstimate / totalSum).toFixed(2)}`;
    labCostCell2.textContent = "";
    labCostRow.appendChild(labCostCell0);
    labCostRow.appendChild(labCostCell1);
    labCostRow.appendChild(labCostCell2);
    tf.appendChild(labCostRow);

    const estLabCostRow = document.createElement("tr");
    const estLabCostCell0 = document.createElement("th");
    estLabCostCell0.setAttribute("scope", "row");
    const estLabCostCell1 = document.createElement("td");
    const estLabCostCell2 = document.createElement("td");
    estLabCostCell0.textContent = "Estimated Cost of each student question with changed staff and pay rates but fixed student attendance in s25";
    const s25Estimate = onlineSessionCount * (S25.LEAD_PAY_RATE * S25.LEAD_TAS_PER_ONLINE_SHIFT + S25.NON_LEAD_PAY_RATE * S25.TAS_PER_ONLINE_SHIFT) + inPersonSessionCount * (S25.LEAD_PAY_RATE * S25.LEAD_TAS_PER_LAB_SHIFT + S25.NON_LEAD_PAY_RATE * S25.TAS_PER_LAB_SHIFT);
    estLabCostCell1.textContent = `\$${(s25Estimate / totalSum).toFixed(2)}`;
    estLabCostCell2.textContent = "";
    estLabCostRow.appendChild(estLabCostCell0);
    estLabCostRow.appendChild(estLabCostCell1);
    estLabCostRow.appendChild(estLabCostCell2);
    tf.appendChild(estLabCostRow);
  }
  dataTable.appendChild(tf);
  details.prepend(dataTable);
  const pieCtx = pieCanvas.getContext("2d");
  new Chart(pieCtx, {
    type: "doughnut",
    data: {
      labels: pieLabels,
      datasets,
    },
    options: {
      // responsive: true,
    },
  });

  const ctx = lineCanvas.getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: TADataToChartDataSets(datavals),
    },
    options: {
      // responsive: true,
      plugins: {
        legend: {
          display: true,
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "date", // X-axis label
          },
        },
        y: {
          title: {
            display: true,
            text: "helped", // Y-axis label
          },
          suggestedMax: 70,
        },
      },
    },
  });
}

function makeIndividualChart({ labels, datavals }, line, i, elem) {
  const ctx = elem.getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: TADataToChartDataSets(datavals, line, i),
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
            text: "date", // X-axis label
          },
        },
        y: {
          title: {
            display: true,
            text: "helped", // Y-axis label
          },
          max: 25,
        },
      },
    },
  });
}

function addAggregateChartContainer(container, title, isOpen = false) {
  const pieChartContainer = document.createElement("section");
  pieChartContainer.classList.add("attendance-chart-container");
  const lineChartContainer = document.createElement("section");
  lineChartContainer.classList.add("attendance-chart-container");
  const pieCanvas = document.createElement("canvas");
  const lineCanvas = document.createElement("canvas");
  pieCanvas.setAttribute("width", 2000);
  pieCanvas.setAttribute("height", 400);
  pieCanvas.classList.add("attendance-chart");
  pieChartContainer.appendChild(pieCanvas);
  lineCanvas.setAttribute("width", 40);
  lineCanvas.setAttribute("height", 20);
  lineCanvas.classList.add("attendance-chart");
  lineChartContainer.appendChild(lineCanvas);
  const details = document.createElement("details");
  if (isOpen) {
    details.setAttribute("open", true);
  }
  const header = document.createElement("h2");
  header.textContent = title;
  const summary = document.createElement("summary");
  summary.appendChild(header);
  details.appendChild(pieChartContainer);
  details.appendChild(lineChartContainer);
  details.appendChild(summary);
  container.appendChild(details);
  container.appendChild(document.createElement("hr"));
  return { details, pieCanvas, lineCanvas };
}

function addChartContainer(container, title, isOpen = false) {
  const lineChartContainer = document.createElement("section");
  lineChartContainer.classList.add("attendance-chart-container");
  const lineCanvas = document.createElement("canvas");
  lineCanvas.setAttribute("width", 600);
  lineCanvas.setAttribute("height", 400);
  lineCanvas.classList.add("attendance-chart");
  lineChartContainer.add(lineCanvas);
  const details = document.createElement("details");
  if (isOpen) {
    details.setAttribute("open", true);
  }
  const header = document.createElement("h2");
  header.textContent = title;
  const summary = document.createElement("summary");
  summary.appendChild(header);
  details.appendChild(lineChartContainer);
  details.appendChild(summary);
  container.appendChild(details);
  container.appendChild(document.createElement("hr"));
  return lineCanvas;
}

function didParse(results, file, dataLabel) {
  const { labels, datavals, uniqueCounts } = taDataToChartData(results.data);
  const chartContainer = document.getElementById("attendance-charts");
  // makeAggregateChart({ labels, datavals }, addAggregateChartContainer(chartContainer, "All Courses", true));
  console.log('about to makeaggregate for ', results, file, dataLabel)
  makeAggregateChart(
    { labels, datavals: uniqueCounts },
    addAggregateChartContainer(chartContainer, `All Courses ${dataLabel}`, true)
  );

  // if the first chart is interactive, maybe we don't want the subsequent?
  // LINES.forEach((line, i) => {
  //   makeIndividualChart({labels, datavals}, line, i, addChartContainer(chartContainer, line));
  // })
  return {labels, datavals, uniqueCounts};
}

init();
