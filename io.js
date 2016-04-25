function TextServer() {
  // Private vars
  var textBase = '';
  var versionBase = 0;

  var log = new VersionLog();

  // Private classes
  function VersionLog() {
    // Private vars
    var log = {};
    var maxVersion = 0;

    // Methods
    function addChange(version, entry) {
      if (version in log) {
        log[version].push(entry);
      } else if (version >= maxVersion) {
        log[version] = [ entry ];
        maxVersion = version + 1;
      } else {
        console.log('Attempted to add an old version!');
      }
    }
    function addAddition(version, addition, bounds) {
      var entry = {
        type: 'addition',
        addition: addition,
        bounds: bounds
      };

      addChange(version, entry);
    }
    function addDeletion(version, bounds) {
      var entry = {
        type: 'deletion',
        bounds: bounds
      };

      addChange(version, entry);
    }
    function playback(textBase, versionBase) {
      var text = textBase;
      for (var version = versionBase; version < maxVersion; version ++) {
        if (!(version in log)) {
          console.log('Missing version!');
          return textBase;
        }

        var entries = log[version];
        text = playbackEntriesOnText(text, entries);
      }

      return text;

      // Helpers
      function playbackEntriesOnText(text, entries) {
        // This needs to be rewritten to do concurrent additions/deletions.
        entries.forEach(function (entry) {
          if (entry.type == 'addition') {
            text = getNewTextWithAddition(text, entry.addition, entry.bounds);
          } else if (entry.type == 'deletion') {
            text = getNewTextWithDeletion(text, entry.bounds);
          }
        });

        return text;

        // Helpers
        function getNewTextWithAddition(prev, addition, bounds) {
          var head = prev.substring(0, bounds[0]);
          var tail = prev.substring(prev.length - bounds[1]);
          return head + addition + tail;
        }
        function getNewTextWithDeletion(prev, bounds) {
          var head = prev.substring(0, bounds[0]);
          var tail = prev.substring(prev.length - bounds[1]);
          return head + tail;
        }
      }
    }
    function getMaxVersion() { return maxVersion; }

    // Public interface
    this.addAddition = addAddition;
    this.addDeletion = addDeletion;
    this.getMaxVersion = getMaxVersion;
    this.playback = playback;
  }

  // Methods
  function getText() {
    return log.playback(textBase, versionBase);
  }
  function getVersion() {
    return log.getMaxVersion();
  }

  // Public interface
  this.getText = getText;
  this.getVersion = getVersion;
  this.addAddition = log.addAddition;
  this.addDeletion = log.addDeletion;
}

function IOServer() {
  // Private vars
  var texter = new TextServer();

  // Methods
  function start(http) {
    var io = require('socket.io')(http);

    io.on('connection', function (socket) {
      connection(socket);
      socket.on('disconnect', disconnect);
      socket.on('addition', addition);
      socket.on('deletion', deletion);
    });
  }

  function connection(socket) {
    console.log('a user connected');
    socket.emit('init', {
      version: texter.getVersion(),
      text: texter.getText()
    });
  }
  function disconnect() {
    console.log('user disconnected');
  }
  function addition(data) {
    texter.addAddition(data.version, data.addition, data.bounds);
  }
  function deletion(data) {
    texter.addDeletion(data.version, data.bounds);
  }

  // Public interface
  this.start = start;
}

var io = new IOServer();

module.exports = {
  start: io.start
};