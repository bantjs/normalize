var through = require('through2');
var path = require('path');
var defined = require('defined');
var toposort = require('toposort');


module.exports = function (opts) {
  if (!opts) opts = {};

  var rows = [];

  return through.obj(write, end);

  function write (row, enc, cb) { 
    if (isVinylBuffer(row) && row.isBuffer()) {
      var basedir = row.base;
      row = JSON.parse(row.contents);
      row.basedir = basedir;
    }
    rows.push(row);
    cb(); 
  }

  function end () { normalize.bind(this, rows, opts)(); }
};

function normalize (rows, opts) {
  var self = this,
      nodes = [], edges = [], index = {};

  rows.forEach(function (row, i) {
    var files = [],
        basedir = path.resolve(defined(row.basedir, opts.basedir, process.cwd())),
        scripts = [];

    row.basedir = basedir;
    row.id = defined(row.id, 'module_' + i);
    row.locals = defined(row.locals, []);

    if (has(row, 'main')) {
      var obj = {
        file: row.main,
        expose: defined(row.expose, row.id),
        entry: true
      };

      if (!isStream(row.main))
        obj.file = path.resolve(basedir, row.main);
      else
        obj.basedir = basedir;

      scripts.push(obj);
    }
    
    row.scripts = scripts.concat(defined(row.scripts, []).filter(Boolean)
      .map(function (file) {
        var obj = { file: row.main };
        if (!isStream(file))
          obj.file = path.resolve(basedir, file);
        else
          obj.basedir = basedir;
        return obj;
      }));
    
    nodes.push(row.id);
    row.locals.forEach(function (id) {
      edges.push([row.id, id]);
    });

    index[row.id] = row;
  });

  rows = toposort.array(nodes, edges).reverse().map(function (id) {
    return index[id];
  });

  rows.forEach(function (row) { self.push(row); });

  self.push(null);
}

function isVinylBuffer (row) { return row && typeof row.isBuffer === 'function'; }

function has (row, key) { return row && row.hasOwnProperty(key); }

function isStream (s) { return s && typeof s.pipe === 'function'; }

