var should = require('should');
var spawn = require('child_process').spawn;
var lib = require('../lib');

describe('getStringBlocks', function() {
  it ('split blocks', function() {
    should(lib.getStringBlocks("123456abcdefg789")).eql(['123456', 'abcdefg', '789'])
  });
});
describe('parseDuration', function() {
  it ('parse "5s"', function() {
    should(lib.parseDuration('5s')).eql(5 * 1000);
  });
  it ('parse "3m"', function() {
    should(lib.parseDuration('3m')).eql(3 * 1000 * 60);
  });
});

describe('duration', function(){
  it ('must close after 2 seconds', function() {
    this.timeout(5 * 1000);
    return new Promise(function(resolve, reject) {
      var p = spawn('node', [ '../bin/cli.js', '--duration', '2s' ], {
        cwd: __dirname,
      });
      p.stdout.on('data', data => {
        process.stdout.write(data.toString());
      });
      p.stderr.on('data', data => {
        reject(data.toString());
      });
      p.on('close', code => {
        resolve();
      });
    });
  });
});


