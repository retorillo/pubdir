#!/usr/bin/env node

var express = require('express');
var app = express();
var fs = require('fs');
var path = require('path');
var os = require('os');
var pug = require('pug');
var lib = require('../lib/')
var Publisher = require('../lib/pub/');
var renderlist = pug.compileFile(path.join(__dirname, 'list.pug'));

var opt = require('gnu-option').parse({
  p: '&port',
  port: 'integer',
  duration: lib.parseDuration,
});
if (opt.$.length === 0)
  opt.$.push('*');

var publisher = new Publisher(opt.$);
console.log(`[INFO] Globbing ${publisher.globpath} on ${process.cwd()}`);
publisher.update().then(
  function() {
    console.log(`[INFO] ${publisher.files.length} files are published`);
  }
);

function listdir(dir, res) {
  var items = [];
  for (var f of fs.readdirSync(dir)) {
    var f = path.join(dir, f);
    if (!publisher.listable(f)) continue;
    var stat = fs.statSync(f);
    var idir = stat.isDirectory();
    items.push({
      basename: path.basename(f),
      href: '/' + f.split(path.sep).map(p => { return encodeURIComponent(p) }).join("/"),
      fullname: '/' + f,
      size: idir ? publisher.dirs[f] : stat.size,
      atime: stat.atime,
      mtime: stat.mtime,
      ctime: stat.ctime,
      birthtime: stat.birthtime,
      type: idir ? 'dir' : 'file',
    });
  }

  var parent = path.dirname(dir);

  var title = path.sep + path.join(path.basename(process.cwd()), dir);
  var breadcrumbs = [ { href: '/' , text: path.basename(process.cwd()) } ];
  var bhref = [];
  for (var c of dir === '.' ? [] : dir.split(path.sep)) {
    bhref.push('/', c);
    breadcrumbs.push({
      href: bhref.join(''),
      text: c,
    });
  }
  breadcrumbs[breadcrumbs.length - 1].href = '';

  res.write(renderlist({
    parent: dir == '.' ? '' : path.dirname(dir).replace(/^\.$/, '/'),
    formatSize: lib.formatSize,
    formatTime: lib.formatTime,
    breadcrumbs: breadcrumbs,
    title: title,
    items: items,
  }), 'utf8');
  res.end();
}

function handler(req, res) {
  var rel = decodeURIComponent(req.path.substr(1));
  rel = rel.length === 0 ? '.' : rel;
  rel = rel.replace(/\//g, path.sep);

  const NOT_FOUND = `${rel} is not found or not published`;
  var stat = fs.statSync(rel);
  if (rel !== '.' && !publisher.listable(rel))
    throw new Error(NOT_FOUND);

  if (stat.isDirectory()) {
    console.log(`[DIR] ${rel}`);
    listdir(rel, res);
  }
  else if (stat.isFile()) {
    console.log(`[FILE_REQUEST] ${rel}`);
    res.sendFile(rel, {
      root: process.cwd(),
    }, err => {
      if (err) {
        if (err.code == 'ECONNABORTED')
          console.log(`[FILE_ABORT] ${rel}`);
        else
          res.status(err.status).end();
      }
      else
        console.log(`[FILE_SENT] ${rel}`);
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

var server = app.listen.apply(app, opt.port ? [opt.port] : []);
var startTime = new Date().getTime();
server.on('listening', () => {
  console.log(`[INFO] Listening on ${server.address().port}`);
});

if (opt.duration) {
  setInterval(() => {
    if (new Date().getTime() - startTime < opt.duration)
      return;
    console.log(`[INFO] Server is closing`);
    process.exit();
  }, 1000);
}
