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
    function addChange(version, addition, bounds) {
      var entry = {
        addition: addition,
        bounds: bounds
      };

      if (version in log) {
        log[version].push(entry);
      } else if (version >= maxVersion) {
        log[version] = [ entry ];
        maxVersion = version + 1;
      } else {
        console.log('Attempted to add an old version!');
      }

      console.log("New Log:"); console.log(JSON.stringify(log));
    }
    function playback(textBase, versionBase) {
      var text = textBase;
      for (var version = versionBase; version < maxVersion; version ++) {
        if (!(version in log)) {
          console.log('Missing version!');
          return textBase;
        }

        var entries = log[version];

        console.log("playing back entries:");
        console.log(text);
        console.log(JSON.stringify(entries));

        text = mergeEntries(text, entries);
      }

      return text;

      // Helpers
      function mergeEntries(text, entries) {
        // Note that bounds in the entries are in format:
        // [index from beginning, index from end (length of string)]

        var segments = [{
          start: 0,
          end: text.length - 1 // inclusive
        }];
        var additions = [];

        // Go through each entry and cut up the segments accordingly.
        entries.forEach(function (entry) {
          var entryStart = entry.bounds[0];
          var entryEnd = text.length - 1 - entry.bounds[1];

          var addition = entry.addition;
          additions.push({
            text: addition,
            index: entryStart,
            used: false
          });

          var newSegments = [];

          // Cut up each segment according to the bounds of the entry.
          segments.forEach(function (segment) {
            if (segment.start <= entryEnd || segment.end >= entryStart) {
              var removeStart = Math.max(segment.start, entryStart);
              var removeEnd = Math.min(segment.end, entryEnd);

              if (segment.start < removeStart) {
                newSegments.push({
                  start: segment.start,
                  end: Math.min(segment.end, removeStart - 1)
                });
              }
              if (segment.end > removeEnd) {
                newSegments.push({
                  start: Math.max(segment.start, removeEnd + 1),
                  end: segment.end
                });
              }
            }
          });

          console.log("Current entry:");
          console.log(entry);
          console.log("Current segments:");
          console.log(segments);
          console.log("New segments:");
          console.log(newSegments);

          segments = newSegments;
        });

        console.log("Segments:");
        console.log(segments);
        console.log("Additions:");
        console.log(additions);

        var newText = '';
        segments.forEach(function (segment) {
          additions.forEach(function (addition) {
            if (!addition.used && addition.index <= segment.start) {
              newText += addition.text;
              addition.used = true;
            }
          });
          newText += text.substring(segment.start, segment.end + 1);
        });
        additions.forEach(function (addition) {
          if (!addition.used) newText += addition.text;
        });

        return newText;

        // This needs to be rewritten to do concurrent additions/deletions.
        // entries.forEach(function (entry) {
        //   text = getNewText(text, entry.addition, entry.bounds);
        // });

        // return text;

        // Helpers
        // function getNewText(prev, addition, bounds) {
        //   var head = prev.substring(0, bounds[0]);
        //   var tail = prev.substring(prev.length - bounds[1]);
        //   return head + addition + tail;
        // }
      }
    }
    function getMaxVersion() { return maxVersion; }

    // Public interface
    this.addChange = addChange;
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
  this.addChange = log.addChange;
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
      socket.on('change', function (data) { change(socket, data); });
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
  function change(socket, data) {
    texter.addChange(data.version, data.addition, data.bounds);

    socket.emit('version', {
      version: texter.getVersion()
    });
  }

  // Public interface
  this.start = start;
}

var io = new IOServer();

module.exports = {
  start: io.start
};