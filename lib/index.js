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
module.exports = {
  parseDuration: parseDuration,
  formatSize: formatSize,
  formatTime: formatTime,
}
