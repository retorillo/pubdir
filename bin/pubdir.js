#!/usr/bin/env node

var express = require('express');
var app = express();
var fs = require('fs');
var glob = require('glob');
var path = require('path');
var pug = require('pug');

var renderlist = pug.compileFile(path.join(__dirname, 'list.pug'));

var opt = require('gnu-option').parse({
  p: '&port',
  port: 'integer',
  a: '&all',
  all: 'switch',
});

if (opt.$.length === 0)
  opt.$.push('*');

var published;
function loadfiles() {
  var files = [], dirs = { };
  var pending = {
    files: files,
    dirs: dirs,
  }
  published = published || pending;

  var globpath = opt.$.join('|');
  console.log(`[INFO] Globbing ${globpath} on ${process.cwd()}`);
  glob(globpath, {
      dot: opt.all,
    }, (err, pathes) => {
    if (err)
      return;
    for (var p of pathes) {
      var stat = fs.statSync(p);

      if (stat.isFile())
        files.push(p);

      var dir = p;
      while(dir !== '.') {
        dir = path.dirname(dir);
        if (dir === p) throw new Error(`Unexpected dirname: ${p}`);
        if (dirs.hasOwnProperty(dir))
          dirs[dir]++;
        else
          dirs[dir] = 1;
      }
    }
  }).on('end', () => {
    published = pending;
    console.log(`[INFO] ${published.files.length} files are published`);
  });
}

function listable(f) {
  var stat = fs.statSync(f);
  var idir = stat.isDirectory();
  var ifile = stat.isFile();
  if (f === 'index.js') debugger;
  if (!idir && !ifile) return false;
  if (ifile)
    return published.files.indexOf(f) !== -1;
  else
    return published.dirs.hasOwnProperty(f);
}

const timeunits = [ [1000, 'second'],
  [60, 'minute'],
  [60, 'hour'],
  [30, 'month', 'monthes'],
  [365, 'year'] ]

function formatsize(size) {
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

function formattime(date) {
  var time = new Date().getTime() - date.getTime();
  var c = 0;
  do {
    time /= timeunits[c][0];
  } while ( c+1 < timeunits.length
    && time >= timeunits[c+1][0]
    && ++c)
  var v = Math.ceil(time);
  return [v, v <= 1
    ? timeunits[c][1]
    : (timeunits[c][2]
      || timeunits[c][1] + 's'),
      'ago'].join(' ');
}

function listdir(dir, res) {
  var items = [];
  for (var f of fs.readdirSync(dir)) {
    var f = path.join(dir, f);
    if (!listable(f)) continue;
    var stat = fs.statSync(f);
    var idir = stat.isDirectory();
    items.push({
      basename: path.basename(f),
      href: '/' + encodeURI(f),
      fullname: '/' + f,
      size: idir ? published.dirs[f] : stat.size,
      atime: stat.atime,
      mtime: stat.mtime,
      ctime: stat.ctime,
      birthtime: stat.birthtime,
      type: idir ? 'dir' : 'file',
    });
  }

  var parent = path.dirname(dir);

  var title = '/' + path.join(path.basename(process.cwd()), dir);
  var breadcrumbs = [ { href: '/' , text: path.basename(process.cwd()) } ];
  var bhref = [];
  for (var c of dir === '.' ? [] : dir.split('/')) {
    bhref.push('/', c);
    breadcrumbs.push({
      href: bhref.join(''),
      text: c,
    });
  }
  breadcrumbs[breadcrumbs.length - 1].href = '';

  res.write(renderlist({
    parent: dir == '.' ? '' : path.dirname(dir).replace(/^\.$/, '/'),
    formatsize: formatsize,
    formattime: formattime,
    breadcrumbs: breadcrumbs,
    title: title,
    items: items,
  }));
  res.end();
}

function handler(req, res) {
  var rel = decodeURI(req.path.substr(1));
  rel = rel.length === 0 ? '.' : rel;
  const NOT_FOUND = `${rel} is not found or not published`;
  var stat = fs.statSync(rel);
  if (rel !== '.' && !listable(rel))
    throw new Error(NOT_FOUND);

  if (stat.isDirectory()) {
    console.log(`[DIR] ${rel}`);
    listdir(rel, res);
  }
  else if (stat.isFile()) {
    console.log(`[FILE_START] ${rel}`);
    res.sendFile(rel, {
      root: process.cwd(),
    }, err => {
      if (err) {
        console.log(`[FILE_ERROR] ${rel}`);
        res.status(err.status).end();
      }
      else
        console.log(`[FILE_SUCCESS] ${rel}`);
    });
  }
  else
    throw new Error(NOT_FOUND);
}


app.get('*', (req, res, next) => {
  try {
    handler(req, res);
  }
  catch (e){
    console.log(e);
    next();
  }
});

app.get('*', (req, res) => {
  res.status(404)
    .send(`Not found or not public: ${req.path.substr(1)}`)
    .end();
});

loadfiles();
var server = app.listen.apply(app, opt.port ? [opt.port] : []);
server.on('listening', () => {
  console.log(`[INFO] Listening on ${server.address().port}`);
});
