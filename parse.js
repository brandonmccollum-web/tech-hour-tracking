/* RTHS parser. CDK Technician Hours Summary, text layer, letter landscape.
   Match key is RO + line. A split ticket keeps the S on the RO. */
function parseRTHSText(text) {
  var rows = [];
  var techNumber = "";
  var techName = "";
  var periodStart = "";
  var periodEnd = "";
  var asOf = "";
  var who = text.match(/Technician Hours Summary Report for\s+(\d+)\s+-\s+([A-Z0-9 ,.'-]+)/i);
  if (who) {
    techNumber = who[1];
    techName = who[2].replace(/\s+Current as of[\s\S]*$/, "").replace(/\s+/g, " ").trim();
  }
  var period = text.match(/Start Date:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*End Date:\s*(\d{2}\/\d{2}\/\d{4})/);
  if (period) {
    periodStart = period[1];
    periodEnd = period[2];
  }
  var current = text.match(/Current as of\s+(\d{2}\/\d{2}\/\d{4})\s*\(([^)]+)\)/);
  if (current) asOf = current[1] + " " + current[2];

  var pending = null;
  text.split(/\n/).forEach(function (line) {
    var match = line.match(/^\s*(\d+[A-Z]?)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})\s+([A-Z])\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(\*\s+)?([A-Z0-9]+)\s+(\S+)\s+(.*?)\s*$/);
    if (match) {
      pending = {
        ro: match[1],
        split: /S$/i.test(match[1]),
        date: match[2],
        iso: match[2].slice(6) + "-" + match[2].slice(0, 2) + "-" + match[2].slice(3, 5),
        time: match[3],
        line: match[4],
        clock: Number(match[5]),
        flagged: Number(match[6]),
        adjusted: !!match[7],
        labor: match[8],
        opcode: match[9],
        description: match[10]
      };
      rows.push(pending);
      return;
    }
    var extra = line.match(/^\s{20,}(\S.*?)\s*$/);
    if (extra && pending && !/Technician Hours Summary|Current as of|Start Date:|Page \d+|Day Totals|Grand Total|Op\/Int Code/.test(extra[1])) {
      pending.description += " " + extra[1];
    }
  });
  var clock = rows.reduce(function (sum, row) { return sum + row.clock; }, 0);
  var flagged = rows.reduce(function (sum, row) { return sum + row.flagged; }, 0);
  return {
    techNumber: techNumber,
    techName: techName,
    periodStart: periodStart,
    periodEnd: periodEnd,
    asOf: asOf,
    rows: rows,
    clock: Math.round(clock * 100) / 100,
    flagged: Math.round(flagged * 100) / 100
  };
}

if (typeof module !== "undefined") module.exports = { parseRTHSText: parseRTHSText };
