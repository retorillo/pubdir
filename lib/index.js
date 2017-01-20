const path = require('path');

function parseDuration (value) {
  var m = /^([0-9]+)([hms])?$/i.exec(value);
  if (!m)
    throw new Error();
  var number = parseInt(m[1]);
  var unit = m.length > 2 ? m[2].toLowerCase() : 'm';
  switch (unit) {
    case 'h': return number * 60 * 60 * 1000
    case 'm': return number * 60 * 1000;
    case 's': return number * 1000;
  }
  throw new Error(`unit "${unit}" is not implemented.`);
}
function formatSize(size) {
  if (size == 0) return size.toString();
  const kib = 1024;
  const unit = ['K', 'M', 'G']
  var c = 0;
  do {
    size /= kib;
  } while (c+1 < unit.length
    && size >= kib
    && ++c);
  return [size.toFixed(2), unit[c] + 'iB'].join(' ');
}

const timeUnits = [ [1000, 'second'],
  [60, 'minute'],
  [60, 'hour'],
  [30, 'month', 'monthes'],
  [365, 'year'] ]

function formatTime(date) {
  var time = new Date().getTime() - date.getTime();
  var c = 0;
  do {
    time /= timeUnits[c][0];
  } while ( c+1 < timeUnits.length
    && time >= timeUnits[c+1][0]
    && ++c)
  var v = Math.ceil(time);
  return [v, v <= 1
    ? timeUnits[c][1]
    : (timeUnits[c][2]
      || timeUnits[c][1] + 's'),
      'ago'].join(' ');
}

function getLocalPath(req) {
  var rel = decodeURIComponent(req.path.substr(1));
  rel = rel.length === 0 ? '.' : rel;
  return rel.replace(/\//g, path.sep);
}
function getStringBlocks(a) {
  var r = /([0-9]+)|([^0-9]+)/g;
  var blocks = [], b;
  while ((b = r.exec(a)) !== null)
    blocks.push(b[0]);
  return blocks;
}
function compareString(a, b) {
  var ablocks = getStringBlocks(a);
  var bblocks = getStringBlocks(b);
  for (var c = 0; c < Math.min(ablocks.length, bblocks.length); c++) {
    var diff = compareStringBlock(ablocks[c], bblocks[c]);
    if (diff != 0)
      return diff;
  }
  return bblocks.length - ablocks.length;
}
function compareStringBlock(a, b) {
  var ia = parseInt(a);
  var ib = parseInt(b);
  if (!isNaN(ia) && !isNaN(ib))
    return ib - ia;
  for (var c = 0; c < Math.min(a.length, b.length); c++){
    var diff = b.charCodeAt(c) - a.charCodeAt(c);
    if (diff != 0)
      return diff;
  }
  return b.length - a.length;
}

var cloneQuery = function(q1){
  var q2 = {};
  for (var q in q1)
    if (typeof(q1[q]) === 'string')
      q2[q] = q1[q];
  return q2;
}
var buildQuery = function(q1, setters) {
  var q1 = cloneQuery(q1);
  for (var n in setters)
    q1[n] = setters[n];
  var q2 = [];
  for (var n in q1)
    q2.push([encodeURI(n), encodeURI(q1[n])].join('='));
  return "?" + q2.join("&");
}
module.exports = {
  compareString: compareString,
  getStringBlocks: getStringBlocks,
  getLocalPath: getLocalPath,
  parseDuration: parseDuration,
  formatSize: formatSize,
  formatTime: formatTime,
  buildQuery: buildQuery,
}
