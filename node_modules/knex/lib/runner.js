'use strict';

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodash = require('lodash');

var _promise = require('./promise');

var _promise2 = _interopRequireDefault(_promise);

var _helpers = require('./helpers');

var helpers = _interopRequireWildcard(_helpers);

var PassThrough = undefined;

// The "Runner" constructor takes a "builder" (query, schema, or raw)
// and runs through each of the query statements, calling any additional
// "output" method provided alongside the query and bindings.
function Runner(client, builder) {
  this.client = client;
  this.builder = builder;
  this.queries = [];

  // The "connection" object is set on the runner when
  // "run" is called.
  this.connection = void 0;
}

_lodash.assign(Runner.prototype, {

  // "Run" the target, calling "toSQL" on the builder, returning
  // an object or array of queries to run, each of which are run on
  // a single connection.
  run: function run() {
    var runner = this;
    return _promise2['default'].using(this.ensureConnection(), function (connection) {
      runner.connection = connection;

      runner.client.emit('start', runner.builder);
      runner.builder.emit('start', runner.builder);
      var sql = runner.builder.toSQL();

      if (runner.builder._debug) {
        helpers.debugLog(sql);
      }

      if (_lodash.isArray(sql)) {
        return runner.queryArray(sql);
      }
      return runner.query(sql);
    })

    // If there are any "error" listeners, we fire an error event
    // and then re-throw the error to be eventually handled by
    // the promise chain. Useful if you're wrapping in a custom `Promise`.
    ['catch'](function (err) {
      if (runner.builder._events && runner.builder._events.error) {
        runner.builder.emit('error', err);
      }
      throw err;
    })

    // Fire a single "end" event on the builder when
    // all queries have successfully completed.
    .tap(function () {
      runner.builder.emit('end');
    });
  },

  // Stream the result set, by passing through to the dialect's streaming
  // capabilities. If the options are
  stream: function stream(options, handler) {

    // If we specify stream(handler).then(...
    if (arguments.length === 1) {
      if (typeof options === 'function') {
        handler = options;
        options = {};
      }
    }

    // Determines whether we emit an error or throw here.
    var hasHandler = typeof handler === 'function';

    // Lazy-load the "PassThrough" dependency.
    PassThrough = PassThrough || require('readable-stream').PassThrough;

    var runner = this;
    var stream = new PassThrough({ objectMode: true });
    var promise = _promise2['default'].using(this.ensureConnection(), function (connection) {
      runner.connection = connection;
      var sql = runner.builder.toSQL();
      var err = new Error('The stream may only be used with a single query statement.');
      if (_lodash.isArray(sql)) {
        if (hasHandler) throw err;
        stream.emit('error', err);
      }
      return runner.client.stream(runner.connection, sql, stream, options);
    });

    // If a function is passed to handle the stream, send the stream
    // there and return the promise, otherwise just return the stream
    // and the promise will take care of itsself.
    if (hasHandler) {
      handler(stream);
      return promise;
    }
    return stream;
  },

  // Allow you to pipe the stream to a writable stream.
  pipe: function pipe(writable, options) {
    return this.stream(options).pipe(writable);
  },

  // "Runs" a query, returning a promise. All queries specified by the builder are guaranteed
  // to run in sequence, and on the same connection, especially helpful when schema building
  // and dealing with foreign key constraints, etc.
  query: _promise2['default'].method(function (obj) {
    var _this = this;

    this.builder.emit('query', _lodash.assign({ __knexUid: this.connection.__knexUid }, obj));
    var runner = this;
    var queryPromise = this.client.query(this.connection, obj);

    if (obj.timeout) {
      queryPromise = queryPromise.timeout(obj.timeout);
    }

    return queryPromise.then(function (resp) {
      var processedResponse = _this.client.processResponse(resp, runner);
      _this.builder.emit('query-response', processedResponse, _lodash.assign({ __knexUid: _this.connection.__knexUid }, obj), _this.builder);
      _this.client.emit('query-response', processedResponse, _lodash.assign({ __knexUid: _this.connection.__knexUid }, obj), _this.builder);
      return processedResponse;
    })['catch'](_promise2['default'].TimeoutError, function (error) {
      var timeout = obj.timeout;
      var sql = obj.sql;
      var bindings = obj.bindings;

      throw _lodash.assign(error, {
        message: 'Defined query timeout of ' + timeout + 'ms exceeded when running query.',
        sql: sql, bindings: bindings, timeout: timeout
      });
    })['catch'](function (error) {
      _this.builder.emit('query-error', error, _lodash.assign({ __knexUid: _this.connection.__knexUid }, obj));
      throw error;
    });
  }),

  // In the case of the "schema builder" we call `queryArray`, which runs each
  // of the queries in sequence.
  queryArray: function queryArray(queries) {
    return queries.length === 1 ? this.query(queries[0]) : _promise2['default'].bind(this)['return'](queries).reduce(function (memo, query) {
      return this.query(query).then(function (resp) {
        memo.push(resp);
        return memo;
      });
    }, []);
  },

  // Check whether there's a transaction flag, and that it has a connection.
  ensureConnection: function ensureConnection() {
    var runner = this;
    var acquireConnectionTimeout = runner.client.config.acquireConnectionTimeout || 60000;
    return _promise2['default']['try'](function () {
      return runner.connection || new _promise2['default'](function (resolver, rejecter) {
        var acquireConnection = runner.client.acquireConnection();

        acquireConnection.completed.timeout(acquireConnectionTimeout).then(resolver)['catch'](_promise2['default'].TimeoutError, function (error) {
          var timeoutError = new Error('Knex: Timeout acquiring a connection. The pool is probably full. ' + 'Are you missing a .transacting(trx) call?');
          var additionalErrorInformation = {
            timeoutStack: error.stack
          };

          if (runner.builder) {
            additionalErrorInformation.sql = runner.builder.sql;
            additionalErrorInformation.bindings = runner.builder.bindings;
          }

          _lodash.assign(timeoutError, additionalErrorInformation);

          // Let the pool know that this request for a connection timed out
          acquireConnection.abort('Knex: Timeout acquiring a connection.');

          rejecter(timeoutError);
        })['catch'](rejecter);
      });
    }).disposer(function () {
      if (runner.connection.__knex__disposed) return;
      runner.client.releaseConnection(runner.connection);
    });
  }

});

exports['default'] = Runner;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;base64,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QTJDLENBQzVDLENBQUM7QUFDRixjQUFNLDBCQUEwQixHQUFHO0FBQ2pDLHdCQUFZLEVBQUUsS0FBSyxDQUFDLEtBQUs7V0FDMUIsQ0FBQTs7QUFFRCxjQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUU7QUFDakIsc0NBQTBCLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO0FBQ3BELHNDQUEwQixDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztXQUMvRDs7QUFFRCx5QkFBTyxZQUFZLEVBQUUsMEJBQTBCLENBQUMsQ0FBQTs7O0FBR2hELDJCQUFpQixDQUFDLEtBQUssQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFBOztBQUVoRSxrQkFBUSxDQUFDLFlBQVksQ0FBQyxDQUFBO1NBQ3ZCLENBQUMsU0FDSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO09BQ25CLENBQUMsQ0FBQTtLQUNILENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBVztBQUNyQixVQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsT0FBTTtBQUM5QyxZQUFNLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQTtLQUNuRCxDQUFDLENBQUE7R0FDSDs7Q0FFRixDQUFDLENBQUE7O3FCQUVhLE1BQU0iLCJmaWxlIjoicnVubmVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgYXNzaWduLCBpc0FycmF5IH0gZnJvbSAnbG9kYXNoJ1xuaW1wb3J0IFByb21pc2UgZnJvbSAnLi9wcm9taXNlJztcbmltcG9ydCAqIGFzIGhlbHBlcnMgZnJvbSAnLi9oZWxwZXJzJztcblxubGV0IFBhc3NUaHJvdWdoO1xuXG4vLyBUaGUgXCJSdW5uZXJcIiBjb25zdHJ1Y3RvciB0YWtlcyBhIFwiYnVpbGRlclwiIChxdWVyeSwgc2NoZW1hLCBvciByYXcpXG4vLyBhbmQgcnVucyB0aHJvdWdoIGVhY2ggb2YgdGhlIHF1ZXJ5IHN0YXRlbWVudHMsIGNhbGxpbmcgYW55IGFkZGl0aW9uYWxcbi8vIFwib3V0cHV0XCIgbWV0aG9kIHByb3ZpZGVkIGFsb25nc2lkZSB0aGUgcXVlcnkgYW5kIGJpbmRpbmdzLlxuZnVuY3Rpb24gUnVubmVyKGNsaWVudCwgYnVpbGRlcikge1xuICB0aGlzLmNsaWVudCA9IGNsaWVudFxuICB0aGlzLmJ1aWxkZXIgPSBidWlsZGVyXG4gIHRoaXMucXVlcmllcyA9IFtdXG5cbiAgLy8gVGhlIFwiY29ubmVjdGlvblwiIG9iamVjdCBpcyBzZXQgb24gdGhlIHJ1bm5lciB3aGVuXG4gIC8vIFwicnVuXCIgaXMgY2FsbGVkLlxuICB0aGlzLmNvbm5lY3Rpb24gPSB2b2lkIDBcbn1cblxuYXNzaWduKFJ1bm5lci5wcm90b3R5cGUsIHtcblxuICAvLyBcIlJ1blwiIHRoZSB0YXJnZXQsIGNhbGxpbmcgXCJ0b1NRTFwiIG9uIHRoZSBidWlsZGVyLCByZXR1cm5pbmdcbiAgLy8gYW4gb2JqZWN0IG9yIGFycmF5IG9mIHF1ZXJpZXMgdG8gcnVuLCBlYWNoIG9mIHdoaWNoIGFyZSBydW4gb25cbiAgLy8gYSBzaW5nbGUgY29ubmVjdGlvbi5cbiAgcnVuKCkge1xuICAgIGNvbnN0IHJ1bm5lciA9IHRoaXNcbiAgICByZXR1cm4gUHJvbWlzZS51c2luZyh0aGlzLmVuc3VyZUNvbm5lY3Rpb24oKSwgZnVuY3Rpb24oY29ubmVjdGlvbikge1xuICAgICAgcnVubmVyLmNvbm5lY3Rpb24gPSBjb25uZWN0aW9uO1xuXG4gICAgICBydW5uZXIuY2xpZW50LmVtaXQoJ3N0YXJ0JywgcnVubmVyLmJ1aWxkZXIpXG4gICAgICBydW5uZXIuYnVpbGRlci5lbWl0KCdzdGFydCcsIHJ1bm5lci5idWlsZGVyKVxuICAgICAgY29uc3Qgc3FsID0gcnVubmVyLmJ1aWxkZXIudG9TUUwoKTtcblxuICAgICAgaWYgKHJ1bm5lci5idWlsZGVyLl9kZWJ1Zykge1xuICAgICAgICBoZWxwZXJzLmRlYnVnTG9nKHNxbClcbiAgICAgIH1cblxuICAgICAgaWYgKGlzQXJyYXkoc3FsKSkge1xuICAgICAgICByZXR1cm4gcnVubmVyLnF1ZXJ5QXJyYXkoc3FsKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBydW5uZXIucXVlcnkoc3FsKTtcblxuICAgIH0pXG5cbiAgICAvLyBJZiB0aGVyZSBhcmUgYW55IFwiZXJyb3JcIiBsaXN0ZW5lcnMsIHdlIGZpcmUgYW4gZXJyb3IgZXZlbnRcbiAgICAvLyBhbmQgdGhlbiByZS10aHJvdyB0aGUgZXJyb3IgdG8gYmUgZXZlbnR1YWxseSBoYW5kbGVkIGJ5XG4gICAgLy8gdGhlIHByb21pc2UgY2hhaW4uIFVzZWZ1bCBpZiB5b3UncmUgd3JhcHBpbmcgaW4gYSBjdXN0b20gYFByb21pc2VgLlxuICAgIC5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgIGlmIChydW5uZXIuYnVpbGRlci5fZXZlbnRzICYmIHJ1bm5lci5idWlsZGVyLl9ldmVudHMuZXJyb3IpIHtcbiAgICAgICAgcnVubmVyLmJ1aWxkZXIuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgICAgfVxuICAgICAgdGhyb3cgZXJyO1xuICAgIH0pXG5cbiAgICAvLyBGaXJlIGEgc2luZ2xlIFwiZW5kXCIgZXZlbnQgb24gdGhlIGJ1aWxkZXIgd2hlblxuICAgIC8vIGFsbCBxdWVyaWVzIGhhdmUgc3VjY2Vzc2Z1bGx5IGNvbXBsZXRlZC5cbiAgICAudGFwKGZ1bmN0aW9uKCkge1xuICAgICAgcnVubmVyLmJ1aWxkZXIuZW1pdCgnZW5kJyk7XG4gICAgfSlcblxuICB9LFxuXG4gIC8vIFN0cmVhbSB0aGUgcmVzdWx0IHNldCwgYnkgcGFzc2luZyB0aHJvdWdoIHRvIHRoZSBkaWFsZWN0J3Mgc3RyZWFtaW5nXG4gIC8vIGNhcGFiaWxpdGllcy4gSWYgdGhlIG9wdGlvbnMgYXJlXG4gIHN0cmVhbShvcHRpb25zLCBoYW5kbGVyKSB7XG5cbiAgICAvLyBJZiB3ZSBzcGVjaWZ5IHN0cmVhbShoYW5kbGVyKS50aGVuKC4uLlxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgaGFuZGxlciA9IG9wdGlvbnM7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBEZXRlcm1pbmVzIHdoZXRoZXIgd2UgZW1pdCBhbiBlcnJvciBvciB0aHJvdyBoZXJlLlxuICAgIGNvbnN0IGhhc0hhbmRsZXIgPSB0eXBlb2YgaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJztcblxuICAgIC8vIExhenktbG9hZCB0aGUgXCJQYXNzVGhyb3VnaFwiIGRlcGVuZGVuY3kuXG4gICAgUGFzc1Rocm91Z2ggPSBQYXNzVGhyb3VnaCB8fCByZXF1aXJlKCdyZWFkYWJsZS1zdHJlYW0nKS5QYXNzVGhyb3VnaDtcblxuICAgIGNvbnN0IHJ1bm5lciA9IHRoaXM7XG4gICAgY29uc3Qgc3RyZWFtID0gbmV3IFBhc3NUaHJvdWdoKHtvYmplY3RNb2RlOiB0cnVlfSk7XG4gICAgY29uc3QgcHJvbWlzZSA9IFByb21pc2UudXNpbmcodGhpcy5lbnN1cmVDb25uZWN0aW9uKCksIGZ1bmN0aW9uKGNvbm5lY3Rpb24pIHtcbiAgICAgIHJ1bm5lci5jb25uZWN0aW9uID0gY29ubmVjdGlvbjtcbiAgICAgIGNvbnN0IHNxbCA9IHJ1bm5lci5idWlsZGVyLnRvU1FMKClcbiAgICAgIGNvbnN0IGVyciA9IG5ldyBFcnJvcignVGhlIHN0cmVhbSBtYXkgb25seSBiZSB1c2VkIHdpdGggYSBzaW5nbGUgcXVlcnkgc3RhdGVtZW50LicpO1xuICAgICAgaWYgKGlzQXJyYXkoc3FsKSkge1xuICAgICAgICBpZiAoaGFzSGFuZGxlcikgdGhyb3cgZXJyO1xuICAgICAgICBzdHJlYW0uZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJ1bm5lci5jbGllbnQuc3RyZWFtKHJ1bm5lci5jb25uZWN0aW9uLCBzcWwsIHN0cmVhbSwgb3B0aW9ucyk7XG4gICAgfSlcblxuICAgIC8vIElmIGEgZnVuY3Rpb24gaXMgcGFzc2VkIHRvIGhhbmRsZSB0aGUgc3RyZWFtLCBzZW5kIHRoZSBzdHJlYW1cbiAgICAvLyB0aGVyZSBhbmQgcmV0dXJuIHRoZSBwcm9taXNlLCBvdGhlcndpc2UganVzdCByZXR1cm4gdGhlIHN0cmVhbVxuICAgIC8vIGFuZCB0aGUgcHJvbWlzZSB3aWxsIHRha2UgY2FyZSBvZiBpdHNzZWxmLlxuICAgIGlmIChoYXNIYW5kbGVyKSB7XG4gICAgICBoYW5kbGVyKHN0cmVhbSk7XG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG4gICAgcmV0dXJuIHN0cmVhbTtcbiAgfSxcblxuICAvLyBBbGxvdyB5b3UgdG8gcGlwZSB0aGUgc3RyZWFtIHRvIGEgd3JpdGFibGUgc3RyZWFtLlxuICBwaXBlKHdyaXRhYmxlLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RyZWFtKG9wdGlvbnMpLnBpcGUod3JpdGFibGUpO1xuICB9LFxuXG4gIC8vIFwiUnVuc1wiIGEgcXVlcnksIHJldHVybmluZyBhIHByb21pc2UuIEFsbCBxdWVyaWVzIHNwZWNpZmllZCBieSB0aGUgYnVpbGRlciBhcmUgZ3VhcmFudGVlZFxuICAvLyB0byBydW4gaW4gc2VxdWVuY2UsIGFuZCBvbiB0aGUgc2FtZSBjb25uZWN0aW9uLCBlc3BlY2lhbGx5IGhlbHBmdWwgd2hlbiBzY2hlbWEgYnVpbGRpbmdcbiAgLy8gYW5kIGRlYWxpbmcgd2l0aCBmb3JlaWduIGtleSBjb25zdHJhaW50cywgZXRjLlxuICBxdWVyeTogUHJvbWlzZS5tZXRob2QoZnVuY3Rpb24ob2JqKSB7XG4gICAgdGhpcy5idWlsZGVyLmVtaXQoJ3F1ZXJ5JywgYXNzaWduKHtfX2tuZXhVaWQ6IHRoaXMuY29ubmVjdGlvbi5fX2tuZXhVaWR9LCBvYmopKVxuICAgIGNvbnN0IHJ1bm5lciA9IHRoaXNcbiAgICBsZXQgcXVlcnlQcm9taXNlID0gdGhpcy5jbGllbnQucXVlcnkodGhpcy5jb25uZWN0aW9uLCBvYmopXG5cbiAgICBpZihvYmoudGltZW91dCkge1xuICAgICAgcXVlcnlQcm9taXNlID0gcXVlcnlQcm9taXNlLnRpbWVvdXQob2JqLnRpbWVvdXQpXG4gICAgfVxuXG4gICAgcmV0dXJuIHF1ZXJ5UHJvbWlzZVxuICAgICAgLnRoZW4oKHJlc3ApID0+IHtcbiAgICAgICAgY29uc3QgcHJvY2Vzc2VkUmVzcG9uc2UgPSB0aGlzLmNsaWVudC5wcm9jZXNzUmVzcG9uc2UocmVzcCwgcnVubmVyKTtcbiAgICAgICAgdGhpcy5idWlsZGVyLmVtaXQoXG4gICAgICAgICAgJ3F1ZXJ5LXJlc3BvbnNlJyxcbiAgICAgICAgICBwcm9jZXNzZWRSZXNwb25zZSxcbiAgICAgICAgICBhc3NpZ24oe19fa25leFVpZDogdGhpcy5jb25uZWN0aW9uLl9fa25leFVpZH0sIG9iaiksXG4gICAgICAgICAgdGhpcy5idWlsZGVyXG4gICAgICAgICk7XG4gICAgICAgIHRoaXMuY2xpZW50LmVtaXQoXG4gICAgICAgICAgJ3F1ZXJ5LXJlc3BvbnNlJyxcbiAgICAgICAgICBwcm9jZXNzZWRSZXNwb25zZSxcbiAgICAgICAgICBhc3NpZ24oe19fa25leFVpZDogdGhpcy5jb25uZWN0aW9uLl9fa25leFVpZH0sIG9iaiksXG4gICAgICAgICAgdGhpcy5idWlsZGVyXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiBwcm9jZXNzZWRSZXNwb25zZTtcbiAgICAgIH0pLmNhdGNoKFByb21pc2UuVGltZW91dEVycm9yLCBlcnJvciA9PiB7XG4gICAgICAgIGNvbnN0IHsgdGltZW91dCwgc3FsLCBiaW5kaW5ncyB9ID0gb2JqO1xuICAgICAgICB0aHJvdyBhc3NpZ24oZXJyb3IsIHtcbiAgICAgICAgICBtZXNzYWdlOiBgRGVmaW5lZCBxdWVyeSB0aW1lb3V0IG9mICR7dGltZW91dH1tcyBleGNlZWRlZCB3aGVuIHJ1bm5pbmcgcXVlcnkuYCxcbiAgICAgICAgICBzcWwsIGJpbmRpbmdzLCB0aW1lb3V0XG4gICAgICAgIH0pO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgdGhpcy5idWlsZGVyLmVtaXQoJ3F1ZXJ5LWVycm9yJywgZXJyb3IsIGFzc2lnbih7X19rbmV4VWlkOiB0aGlzLmNvbm5lY3Rpb24uX19rbmV4VWlkfSwgb2JqKSlcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9KTtcbiAgfSksXG5cbiAgLy8gSW4gdGhlIGNhc2Ugb2YgdGhlIFwic2NoZW1hIGJ1aWxkZXJcIiB3ZSBjYWxsIGBxdWVyeUFycmF5YCwgd2hpY2ggcnVucyBlYWNoXG4gIC8vIG9mIHRoZSBxdWVyaWVzIGluIHNlcXVlbmNlLlxuICBxdWVyeUFycmF5KHF1ZXJpZXMpIHtcbiAgICByZXR1cm4gcXVlcmllcy5sZW5ndGggPT09IDEgPyB0aGlzLnF1ZXJ5KHF1ZXJpZXNbMF0pIDogUHJvbWlzZS5iaW5kKHRoaXMpXG4gICAgICAucmV0dXJuKHF1ZXJpZXMpXG4gICAgICAucmVkdWNlKGZ1bmN0aW9uKG1lbW8sIHF1ZXJ5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5KHF1ZXJ5KS50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcbiAgICAgICAgICBtZW1vLnB1c2gocmVzcClcbiAgICAgICAgICByZXR1cm4gbWVtbztcbiAgICAgICAgfSk7XG4gICAgICB9LCBbXSlcbiAgfSxcblxuICAvLyBDaGVjayB3aGV0aGVyIHRoZXJlJ3MgYSB0cmFuc2FjdGlvbiBmbGFnLCBhbmQgdGhhdCBpdCBoYXMgYSBjb25uZWN0aW9uLlxuICBlbnN1cmVDb25uZWN0aW9uKCkge1xuICAgIGNvbnN0IHJ1bm5lciA9IHRoaXNcbiAgICBjb25zdCBhY3F1aXJlQ29ubmVjdGlvblRpbWVvdXQgPSBydW5uZXIuY2xpZW50LmNvbmZpZy5hY3F1aXJlQ29ubmVjdGlvblRpbWVvdXQgfHwgNjAwMDA7XG4gICAgcmV0dXJuIFByb21pc2UudHJ5KCgpID0+IHtcbiAgICAgIHJldHVybiBydW5uZXIuY29ubmVjdGlvbiB8fCBuZXcgUHJvbWlzZSgocmVzb2x2ZXIsIHJlamVjdGVyKSA9PiB7XG4gICAgICAgIGNvbnN0IGFjcXVpcmVDb25uZWN0aW9uID0gcnVubmVyLmNsaWVudC5hY3F1aXJlQ29ubmVjdGlvbigpO1xuXG4gICAgICAgIGFjcXVpcmVDb25uZWN0aW9uLmNvbXBsZXRlZFxuICAgICAgICAgIC50aW1lb3V0KGFjcXVpcmVDb25uZWN0aW9uVGltZW91dClcbiAgICAgICAgICAudGhlbihyZXNvbHZlcilcbiAgICAgICAgICAuY2F0Y2goUHJvbWlzZS5UaW1lb3V0RXJyb3IsIChlcnJvcikgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGltZW91dEVycm9yID0gbmV3IEVycm9yKFxuICAgICAgICAgICAgICAnS25leDogVGltZW91dCBhY3F1aXJpbmcgYSBjb25uZWN0aW9uLiBUaGUgcG9vbCBpcyBwcm9iYWJseSBmdWxsLiAnICtcbiAgICAgICAgICAgICAgJ0FyZSB5b3UgbWlzc2luZyBhIC50cmFuc2FjdGluZyh0cngpIGNhbGw/J1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGNvbnN0IGFkZGl0aW9uYWxFcnJvckluZm9ybWF0aW9uID0ge1xuICAgICAgICAgICAgICB0aW1lb3V0U3RhY2s6IGVycm9yLnN0YWNrXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKHJ1bm5lci5idWlsZGVyKSB7XG4gICAgICAgICAgICAgIGFkZGl0aW9uYWxFcnJvckluZm9ybWF0aW9uLnNxbCA9IHJ1bm5lci5idWlsZGVyLnNxbDtcbiAgICAgICAgICAgICAgYWRkaXRpb25hbEVycm9ySW5mb3JtYXRpb24uYmluZGluZ3MgPSBydW5uZXIuYnVpbGRlci5iaW5kaW5ncztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYXNzaWduKHRpbWVvdXRFcnJvciwgYWRkaXRpb25hbEVycm9ySW5mb3JtYXRpb24pXG5cbiAgICAgICAgICAgIC8vIExldCB0aGUgcG9vbCBrbm93IHRoYXQgdGhpcyByZXF1ZXN0IGZvciBhIGNvbm5lY3Rpb24gdGltZWQgb3V0XG4gICAgICAgICAgICBhY3F1aXJlQ29ubmVjdGlvbi5hYm9ydCgnS25leDogVGltZW91dCBhY3F1aXJpbmcgYSBjb25uZWN0aW9uLicpXG5cbiAgICAgICAgICAgIHJlamVjdGVyKHRpbWVvdXRFcnJvcilcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5jYXRjaChyZWplY3RlcilcbiAgICAgIH0pXG4gICAgfSkuZGlzcG9zZXIoZnVuY3Rpb24oKSB7XG4gICAgICBpZiAocnVubmVyLmNvbm5lY3Rpb24uX19rbmV4X19kaXNwb3NlZCkgcmV0dXJuXG4gICAgICBydW5uZXIuY2xpZW50LnJlbGVhc2VDb25uZWN0aW9uKHJ1bm5lci5jb25uZWN0aW9uKVxuICAgIH0pXG4gIH1cblxufSlcblxuZXhwb3J0IGRlZmF1bHQgUnVubmVyO1xuIl19