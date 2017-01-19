var fs = require('fs');
var glob = require('glob');
var path = require('path');
var os = require('os');

var _globs = new WeakMap();
var _published = new WeakMap();

class Publisher {
  constructor(globs) {
    _published.set(this, { files: [], dirs: [] });
    _globs.set(this, globs);
  }
  get files() { return _published.get(this).files; }
  get dirs() { return _published.get(this).dirs; }
  get globpath () {
    var globs = _globs.get(this);
    // NOTE: (Windows) Please only use forward-slashes in glob expressions
    // https://github.com/isaacs/node-glob#windows
    if (os.platform() === 'win32')
      globs = globs.map(p => { return p.replace(/\\/g, '/'); });
    return globs.join('|')
  }
  listable(f) {
    var p = _published.get(this);
    var stat = fs.statSync(f);
    var idir = stat.isDirectory();
    var ifile = stat.isFile();
    if (!idir && !ifile) return false;
    if (ifile)
      return p.files.indexOf(f) !== -1;
    else
      return p.dirs.hasOwnProperty(f);
  }
  update() {
    var _self = this;
    return Publisher.glob(this.globpath).then(function(data){
      _published.set(_self, data);
    });
  }

  static glob(globpath) {
    var files = [], dirs = { };
    return new Promise(function(resolve, reject) {
      glob(globpath, (err, pathes) => {
        if (err)
          return;
        for (var p of pathes) {
          // NOTE: glob may return with Linux path seperator
          p = p.replace(/\//g, path.sep);
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
        resolve({ files: files, dirs: dirs, });
      });
    });
  }
}

module.exports = Publisher;
