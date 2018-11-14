#!/usr/bin/env node

const express = require('express');
const app = express();
const mime = require('mime');
const fs = require('fs');
const path = require('path');
const os = require('os');
const pug = require('pug');
const lib = require('../lib/')
const Publisher = require('../lib/pub/');
const renderlist = pug.compileFile(path.join(__dirname, 'list.pug'));
const resizeImage = require('resize-img');
const octicons = require('octicons');

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

function sortByName(items) {
  return items.sort((a, b) => {
    return lib.compareString(b.basename, a.basename);
  });
}
function sortByType(items) {
  return items.sort((a, b) => {
    if (a.type == 'dir') return -1;
    if (b.type == 'dir') return 1;
    return lib.compareString(path.extname(a.basename),
      path.extname(b.basename));
  });
}
function sortByTime(items) {
  return items.sort((a, b) => {
    if (a.type == 'dir') return -1;
    if (b.type == 'dir') return 1;
    return b.mtime.getTime() - a.mtime.getTime();
  });
}
function handler_dir(req, res) {
  var localpath = lib.getLocalPath(req);
  console.log(`[DIR] ${localpath}`);
  var items = [];
  for (var f of fs.readdirSync(localpath)) {
    var f = path.join(localpath, f);
    if (!publisher.listable(f)) continue;
    var stat = fs.statSync(f);
    var idir = stat.isDirectory();
    var href = '/' + f.split(path.sep).map(p => { return encodeURIComponent(p) }).join("/");
    items.push({
      basename: path.basename(f),
      href: idir ? href + lib.buildQuery(req.query, {}) : href,
      tileHref: href + "?request=tile",
      fullname: '/' + f,
      size: idir ? publisher.dirs[f] : stat.size,
      atime: stat.atime,
      mtime: stat.mtime,
      ctime: stat.ctime,
      birthtime: stat.birthtime,
      type: idir ? 'dir' : 'file',
    });
  }

  switch (req.query.sort) {
    case "name":
      items = sortByName(items);
      break;
    case "type":
      items = sortByType(items);
      break;
    default:
      items = sortByTime(items);
      break;
  }

  var parent = path.dirname(localpath);

  var title = path.sep + path.join(path.basename(process.cwd()), localpath);
  var breadcrumbs = [ { href: '/' , text: path.basename(process.cwd()) } ];
  var bhref = [];
  for (var c of localpath === '.' ? [] : localpath.split(path.sep)) {
    bhref.push('/', c);
    breadcrumbs.push({
      href: bhref.join(''),
      text: c,
    });
  }
  breadcrumbs[breadcrumbs.length - 1].href = '';

  var views = [];
  for (var v of ['details', 'tiles']) {
    if (v == req.query.view || (v == 'tiles' && !req.query.view))
      views.push({ text: v });
    else
      views.push({
        href: lib.buildQuery(req.query, { view: v }),
        text: v,
      });
  }
  var sorts = [];
  for (var v of ['time', 'name', 'type']) {
    if (v == req.query.sort || (v == 'time' && !req.query.sort))
      sorts.push({ text: v });
    else
      sorts.push({
        href: lib.buildQuery(req.query, { sort: v }),
        text: v,
      });
  }

  res.write(renderlist({
    query: req.query,
    parent: localpath == '.' ? '' : path.dirname(localpath).replace(/^\.$/, '/'),
    formatSize: lib.formatSize,
    formatTime: lib.formatTime,
    breadcrumbs: breadcrumbs,
    title: title,
    items: items,
    views: views,
    sorts: sorts,
  }), 'utf8');
  res.end();
}

function handler_fileicon(req, res) {
  const xmlver = '<?xml version="1.0" encoding="utf-8"?>';
  const svgct = '<!DOCTYPE svg PUBLIC "-//W4C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';

  var icon;
  var m = mime.lookup(req.path);

  var localpath = lib.getLocalPath(req);
  var stat = fs.statSync(localpath);
  if (stat.isDirectory())
    icon = 'file-directory';
  else if (/^application\/zip$/.test(m) || /^application\x-/.test(m))
    icon = 'file-zip';
  else if (/^image\//.test(m) || /^video\//.test(m))
    icon = 'file-media';
  else if (/^text\//.test(m))
    icon = 'file-text';
  else if (/^application\/pdf$/)
    icon = 'file-pdf';
  else
    icon = 'file';
  res.set('Content-Type', "image/svg+xml");
  res.end(xmlver + svgct + octicons[icon].toSVG({
    xmlns: "http://www.w3.org/2000/svg",
    width: 128,
    height: 128,
 }));
}

function handler_tile(req, res) {
  var localpath = lib.getLocalPath(req);
  console.log(`[TILE_REQUEST] ${localpath}`);
  var ext = path.extname(localpath).toLowerCase();
  var img = ![".jpg", ".jpeg", ".png"].every(e => { return e != ext });
  if (!img) {
    handler_fileicon(req, res);
    return;
  }
  fs.readFile(localpath, (err, data) => {
    if (err) res.end(500);
    resizeImage(data, { width: 256, }).then(buf => {
      res.end(buf, 'binary');
    }).catch(e => {
      handler_fileicon(req, res);
    });
  });
}
function handler_file(req, res) {
  var localpath = lib.getLocalPath(req);
  console.log(`[FILE_REQUEST] ${localpath}`);
  res.sendFile(localpath, {
    root: process.cwd(),
  }, err => {
    if (err) {
      if (err.code == 'ECONNABORTED')
        console.log(`[FILE_ABORT] ${localpath}`);
      else
        res.status(err.status).end();
    }
    else
      console.log(`[FILE_SENT] ${localpath}`);
  });
}

function handler(req, res) {
  var localpath = lib.getLocalPath(req);
  const NOT_FOUND = `${localpath} is not found or not published`;
  var stat = fs.statSync(localpath);
  if (localpath !== '.' && !publisher.listable(localpath))
    throw new Error(NOT_FOUND);
  if (req.query.request == 'tile')
    handler_tile(req, res);
  else if (stat.isDirectory())
    handler_dir(req,res);
  else if (stat.isFile())
    handler_file(req, res);
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
