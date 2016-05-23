
// MySQL Client
// -------
'use strict';

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _inherits = require('inherits');

var _inherits2 = _interopRequireDefault(_inherits);

var _client = require('../../client');

var _client2 = _interopRequireDefault(_client);

var _promise = require('../../promise');

var _promise2 = _interopRequireDefault(_promise);

var _helpers = require('../../helpers');

var helpers = _interopRequireWildcard(_helpers);

var _transaction = require('./transaction');

var _transaction2 = _interopRequireDefault(_transaction);

var _queryCompiler = require('./query/compiler');

var _queryCompiler2 = _interopRequireDefault(_queryCompiler);

var _schemaCompiler = require('./schema/compiler');

var _schemaCompiler2 = _interopRequireDefault(_schemaCompiler);

var _schemaTablecompiler = require('./schema/tablecompiler');

var _schemaTablecompiler2 = _interopRequireDefault(_schemaTablecompiler);

var _schemaColumncompiler = require('./schema/columncompiler');

var _schemaColumncompiler2 = _interopRequireDefault(_schemaColumncompiler);

var _lodash = require('lodash');

// Always initialize with the "QueryBuilder" and "QueryCompiler"
// objects, which extend the base 'lib/query/builder' and
// 'lib/query/compiler', respectively.
function Client_MySQL(config) {
  _client2['default'].call(this, config);
}
_inherits2['default'](Client_MySQL, _client2['default']);

_lodash.assign(Client_MySQL.prototype, {

  dialect: 'mysql',

  driverName: 'mysql',

  _driver: function _driver() {
    return require('mysql');
  },

  QueryCompiler: _queryCompiler2['default'],

  SchemaCompiler: _schemaCompiler2['default'],

  TableCompiler: _schemaTablecompiler2['default'],

  ColumnCompiler: _schemaColumncompiler2['default'],

  Transaction: _transaction2['default'],

  wrapIdentifier: function wrapIdentifier(value) {
    return value !== '*' ? '`' + value.replace(/`/g, '``') + '`' : '*';
  },

  // Get a raw connection, called by the `pool` whenever a new
  // connection needs to be added to the pool.
  acquireRawConnection: function acquireRawConnection() {
    var client = this;
    var connection = this.driver.createConnection(this.connectionSettings);
    return new _promise2['default'](function (resolver, rejecter) {
      connection.connect(function (err) {
        if (err) return rejecter(err);
        connection.on('error', client._connectionErrorHandler.bind(null, client, connection));
        connection.on('end', client._connectionErrorHandler.bind(null, client, connection));
        resolver(connection);
      });
    });
  },

  // Used to explicitly close a connection, called internally by the pool
  // when a connection times out or the pool is shutdown.
  destroyRawConnection: function destroyRawConnection(connection, cb) {
    connection.end(cb);
  },

  // Grab a connection, run the query via the MySQL streaming interface,
  // and pass that through to the stream we've sent back to the client.
  _stream: function _stream(connection, obj, stream, options) {
    options = options || {};
    return new _promise2['default'](function (resolver, rejecter) {
      stream.on('error', rejecter);
      stream.on('end', resolver);
      connection.query(obj.sql, obj.bindings).stream(options).pipe(stream);
    });
  },

  // Runs the query on the specified connection, providing the bindings
  // and any other necessary prep work.
  _query: function _query(connection, obj) {
    if (!obj || typeof obj === 'string') obj = { sql: obj };
    return new _promise2['default'](function (resolver, rejecter) {
      var _obj = obj;
      var sql = _obj.sql;

      if (!sql) return resolver();
      if (obj.options) sql = _lodash.assign({ sql: sql }, obj.options);
      connection.query(sql, obj.bindings, function (err, rows, fields) {
        if (err) return rejecter(err);
        obj.response = [rows, fields];
        resolver(obj);
      });
    });
  },

  // Process the response as returned from the query.
  processResponse: function processResponse(obj, runner) {
    if (obj == null) return;
    var response = obj.response;
    var method = obj.method;

    var rows = response[0];
    var fields = response[1];
    if (obj.output) return obj.output.call(runner, rows, fields);
    switch (method) {
      case 'select':
      case 'pluck':
      case 'first':
        {
          var resp = helpers.skim(rows);
          if (method === 'pluck') return _lodash.map(resp, obj.pluck);
          return method === 'first' ? resp[0] : resp;
        }
      case 'insert':
        return [rows.insertId];
      case 'del':
      case 'update':
      case 'counter':
        return rows.affectedRows;
      default:
        return response;
    }
  },

  // MySQL Specific error handler
  _connectionErrorHandler: function _connectionErrorHandler(client, connection, err) {
    if (connection && err && err.fatal && !connection.__knex__disposed) {
      connection.__knex__disposed = true;
      client.pool.destroy(connection);
    }
  },

  ping: function ping(resource, callback) {
    resource.query('SELECT 1', callback);
  }

});

exports['default'] = Client_MySQL;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9kaWFsZWN0cy9teXNxbC9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozt3QkFHcUIsVUFBVTs7OztzQkFFWixjQUFjOzs7O3VCQUNiLGVBQWU7Ozs7dUJBQ1YsZUFBZTs7SUFBNUIsT0FBTzs7MkJBRUssZUFBZTs7Ozs2QkFDYixrQkFBa0I7Ozs7OEJBQ2pCLG1CQUFtQjs7OzttQ0FDcEIsd0JBQXdCOzs7O29DQUN2Qix5QkFBeUI7Ozs7c0JBRXhCLFFBQVE7Ozs7O0FBS3BDLFNBQVMsWUFBWSxDQUFDLE1BQU0sRUFBRTtBQUM1QixzQkFBTyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0NBQzNCO0FBQ0Qsc0JBQVMsWUFBWSxzQkFBUyxDQUFDOztBQUUvQixlQUFPLFlBQVksQ0FBQyxTQUFTLEVBQUU7O0FBRTdCLFNBQU8sRUFBRSxPQUFPOztBQUVoQixZQUFVLEVBQUUsT0FBTzs7QUFFbkIsU0FBTyxFQUFBLG1CQUFHO0FBQ1IsV0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7R0FDeEI7O0FBRUQsZUFBYSw0QkFBQTs7QUFFYixnQkFBYyw2QkFBQTs7QUFFZCxlQUFhLGtDQUFBOztBQUViLGdCQUFjLG1DQUFBOztBQUVkLGFBQVcsMEJBQUE7O0FBRVgsZ0JBQWMsRUFBQSx3QkFBQyxLQUFLLEVBQUU7QUFDcEIsV0FBUSxLQUFLLEtBQUssR0FBRyxTQUFRLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFPLEdBQUcsQ0FBQztHQUNsRTs7OztBQUlELHNCQUFvQixFQUFBLGdDQUFHO0FBQ3JCLFFBQU0sTUFBTSxHQUFHLElBQUksQ0FBQTtBQUNuQixRQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0FBQ3hFLFdBQU8seUJBQVksVUFBUyxRQUFRLEVBQUUsUUFBUSxF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IE15U1FMIENsaWVudFxuLy8gLS0tLS0tLVxuaW1wb3J0IGluaGVyaXRzIGZyb20gJ2luaGVyaXRzJztcblxuaW1wb3J0IENsaWVudCBmcm9tICcuLi8uLi9jbGllbnQnO1xuaW1wb3J0IFByb21pc2UgZnJvbSAnLi4vLi4vcHJvbWlzZSc7XG5pbXBvcnQgKiBhcyBoZWxwZXJzIGZyb20gJy4uLy4uL2hlbHBlcnMnO1xuXG5pbXBvcnQgVHJhbnNhY3Rpb24gZnJvbSAnLi90cmFuc2FjdGlvbic7XG5pbXBvcnQgUXVlcnlDb21waWxlciBmcm9tICcuL3F1ZXJ5L2NvbXBpbGVyJztcbmltcG9ydCBTY2hlbWFDb21waWxlciBmcm9tICcuL3NjaGVtYS9jb21waWxlcic7XG5pbXBvcnQgVGFibGVDb21waWxlciBmcm9tICcuL3NjaGVtYS90YWJsZWNvbXBpbGVyJztcbmltcG9ydCBDb2x1bW5Db21waWxlciBmcm9tICcuL3NjaGVtYS9jb2x1bW5jb21waWxlcic7XG5cbmltcG9ydCB7IGFzc2lnbiwgbWFwIH0gZnJvbSAnbG9kYXNoJ1xuXG4vLyBBbHdheXMgaW5pdGlhbGl6ZSB3aXRoIHRoZSBcIlF1ZXJ5QnVpbGRlclwiIGFuZCBcIlF1ZXJ5Q29tcGlsZXJcIlxuLy8gb2JqZWN0cywgd2hpY2ggZXh0ZW5kIHRoZSBiYXNlICdsaWIvcXVlcnkvYnVpbGRlcicgYW5kXG4vLyAnbGliL3F1ZXJ5L2NvbXBpbGVyJywgcmVzcGVjdGl2ZWx5LlxuZnVuY3Rpb24gQ2xpZW50X015U1FMKGNvbmZpZykge1xuICBDbGllbnQuY2FsbCh0aGlzLCBjb25maWcpO1xufVxuaW5oZXJpdHMoQ2xpZW50X015U1FMLCBDbGllbnQpO1xuXG5hc3NpZ24oQ2xpZW50X015U1FMLnByb3RvdHlwZSwge1xuXG4gIGRpYWxlY3Q6ICdteXNxbCcsXG5cbiAgZHJpdmVyTmFtZTogJ215c3FsJyxcblxuICBfZHJpdmVyKCkge1xuICAgIHJldHVybiByZXF1aXJlKCdteXNxbCcpXG4gIH0sXG5cbiAgUXVlcnlDb21waWxlcixcblxuICBTY2hlbWFDb21waWxlcixcblxuICBUYWJsZUNvbXBpbGVyLFxuXG4gIENvbHVtbkNvbXBpbGVyLFxuXG4gIFRyYW5zYWN0aW9uLFxuXG4gIHdyYXBJZGVudGlmaWVyKHZhbHVlKSB7XG4gICAgcmV0dXJuICh2YWx1ZSAhPT0gJyonID8gYFxcYCR7dmFsdWUucmVwbGFjZSgvYC9nLCAnYGAnKX1cXGBgIDogJyonKVxuICB9LFxuXG4gIC8vIEdldCBhIHJhdyBjb25uZWN0aW9uLCBjYWxsZWQgYnkgdGhlIGBwb29sYCB3aGVuZXZlciBhIG5ld1xuICAvLyBjb25uZWN0aW9uIG5lZWRzIHRvIGJlIGFkZGVkIHRvIHRoZSBwb29sLlxuICBhY3F1aXJlUmF3Q29ubmVjdGlvbigpIHtcbiAgICBjb25zdCBjbGllbnQgPSB0aGlzXG4gICAgY29uc3QgY29ubmVjdGlvbiA9IHRoaXMuZHJpdmVyLmNyZWF0ZUNvbm5lY3Rpb24odGhpcy5jb25uZWN0aW9uU2V0dGluZ3MpXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmVyLCByZWplY3Rlcikge1xuICAgICAgY29ubmVjdGlvbi5jb25uZWN0KGZ1bmN0aW9uKGVycikge1xuICAgICAgICBpZiAoZXJyKSByZXR1cm4gcmVqZWN0ZXIoZXJyKVxuICAgICAgICBjb25uZWN0aW9uLm9uKCdlcnJvcicsIGNsaWVudC5fY29ubmVjdGlvbkVycm9ySGFuZGxlci5iaW5kKG51bGwsIGNsaWVudCwgY29ubmVjdGlvbikpXG4gICAgICAgIGNvbm5lY3Rpb24ub24oJ2VuZCcsIGNsaWVudC5fY29ubmVjdGlvbkVycm9ySGFuZGxlci5iaW5kKG51bGwsIGNsaWVudCwgY29ubmVjdGlvbikpXG4gICAgICAgIHJlc29sdmVyKGNvbm5lY3Rpb24pXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBVc2VkIHRvIGV4cGxpY2l0bHkgY2xvc2UgYSBjb25uZWN0aW9uLCBjYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcG9vbFxuICAvLyB3aGVuIGEgY29ubmVjdGlvbiB0aW1lcyBvdXQgb3IgdGhlIHBvb2wgaXMgc2h1dGRvd24uXG4gIGRlc3Ryb3lSYXdDb25uZWN0aW9uKGNvbm5lY3Rpb24sIGNiKSB7XG4gICAgY29ubmVjdGlvbi5lbmQoY2IpO1xuICB9LFxuXG4gIC8vIEdyYWIgYSBjb25uZWN0aW9uLCBydW4gdGhlIHF1ZXJ5IHZpYSB0aGUgTXlTUUwgc3RyZWFtaW5nIGludGVyZmFjZSxcbiAgLy8gYW5kIHBhc3MgdGhhdCB0aHJvdWdoIHRvIHRoZSBzdHJlYW0gd2UndmUgc2VudCBiYWNrIHRvIHRoZSBjbGllbnQuXG4gIF9zdHJlYW0oY29ubmVjdGlvbiwgb2JqLCBzdHJlYW0sIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlciwgcmVqZWN0ZXIpIHtcbiAgICAgIHN0cmVhbS5vbignZXJyb3InLCByZWplY3RlcilcbiAgICAgIHN0cmVhbS5vbignZW5kJywgcmVzb2x2ZXIpXG4gICAgICBjb25uZWN0aW9uLnF1ZXJ5KG9iai5zcWwsIG9iai5iaW5kaW5ncykuc3RyZWFtKG9wdGlvbnMpLnBpcGUoc3RyZWFtKVxuICAgIH0pXG4gIH0sXG5cbiAgLy8gUnVucyB0aGUgcXVlcnkgb24gdGhlIHNwZWNpZmllZCBjb25uZWN0aW9uLCBwcm92aWRpbmcgdGhlIGJpbmRpbmdzXG4gIC8vIGFuZCBhbnkgb3RoZXIgbmVjZXNzYXJ5IHByZXAgd29yay5cbiAgX3F1ZXJ5KGNvbm5lY3Rpb24sIG9iaikge1xuICAgIGlmICghb2JqIHx8IHR5cGVvZiBvYmogPT09ICdzdHJpbmcnKSBvYmogPSB7c3FsOiBvYmp9XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmVyLCByZWplY3Rlcikge1xuICAgICAgbGV0IHsgc3FsIH0gPSBvYmpcbiAgICAgIGlmICghc3FsKSByZXR1cm4gcmVzb2x2ZXIoKVxuICAgICAgaWYgKG9iai5vcHRpb25zKSBzcWwgPSBhc3NpZ24oe3NxbH0sIG9iai5vcHRpb25zKVxuICAgICAgY29ubmVjdGlvbi5xdWVyeShzcWwsIG9iai5iaW5kaW5ncywgZnVuY3Rpb24oZXJyLCByb3dzLCBmaWVsZHMpIHtcbiAgICAgICAgaWYgKGVycikgcmV0dXJuIHJlamVjdGVyKGVycilcbiAgICAgICAgb2JqLnJlc3BvbnNlID0gW3Jvd3MsIGZpZWxkc11cbiAgICAgICAgcmVzb2x2ZXIob2JqKVxuICAgICAgfSlcbiAgICB9KVxuICB9LFxuXG4gIC8vIFByb2Nlc3MgdGhlIHJlc3BvbnNlIGFzIHJldHVybmVkIGZyb20gdGhlIHF1ZXJ5LlxuICBwcm9jZXNzUmVzcG9uc2Uob2JqLCBydW5uZXIpIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybjtcbiAgICBjb25zdCB7IHJlc3BvbnNlIH0gPSBvYmpcbiAgICBjb25zdCB7IG1ldGhvZCB9ID0gb2JqXG4gICAgY29uc3Qgcm93cyA9IHJlc3BvbnNlWzBdXG4gICAgY29uc3QgZmllbGRzID0gcmVzcG9uc2VbMV1cbiAgICBpZiAob2JqLm91dHB1dCkgcmV0dXJuIG9iai5vdXRwdXQuY2FsbChydW5uZXIsIHJvd3MsIGZpZWxkcylcbiAgICBzd2l0Y2ggKG1ldGhvZCkge1xuICAgICAgY2FzZSAnc2VsZWN0JzpcbiAgICAgIGNhc2UgJ3BsdWNrJzpcbiAgICAgIGNhc2UgJ2ZpcnN0Jzoge1xuICAgICAgICBjb25zdCByZXNwID0gaGVscGVycy5za2ltKHJvd3MpXG4gICAgICAgIGlmIChtZXRob2QgPT09ICdwbHVjaycpIHJldHVybiBtYXAocmVzcCwgb2JqLnBsdWNrKVxuICAgICAgICByZXR1cm4gbWV0aG9kID09PSAnZmlyc3QnID8gcmVzcFswXSA6IHJlc3BcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2luc2VydCc6XG4gICAgICAgIHJldHVybiBbcm93cy5pbnNlcnRJZF1cbiAgICAgIGNhc2UgJ2RlbCc6XG4gICAgICBjYXNlICd1cGRhdGUnOlxuICAgICAgY2FzZSAnY291bnRlcic6XG4gICAgICAgIHJldHVybiByb3dzLmFmZmVjdGVkUm93c1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlXG4gICAgfVxuICB9LFxuXG4gIC8vIE15U1FMIFNwZWNpZmljIGVycm9yIGhhbmRsZXJcbiAgX2Nvbm5lY3Rpb25FcnJvckhhbmRsZXI6IChjbGllbnQsIGNvbm5lY3Rpb24sIGVycikgPT4ge1xuICAgIGlmKGNvbm5lY3Rpb24gJiYgZXJyICYmIGVyci5mYXRhbCAmJiAhY29ubmVjdGlvbi5fX2tuZXhfX2Rpc3Bvc2VkKSB7XG4gICAgICBjb25uZWN0aW9uLl9fa25leF9fZGlzcG9zZWQgPSB0cnVlO1xuICAgICAgY2xpZW50LnBvb2wuZGVzdHJveShjb25uZWN0aW9uKTtcbiAgICB9XG4gIH0sXG5cbiAgcGluZyhyZXNvdXJjZSwgY2FsbGJhY2spIHtcbiAgICByZXNvdXJjZS5xdWVyeSgnU0VMRUNUIDEnLCBjYWxsYmFjayk7XG4gIH1cblxufSlcblxuZXhwb3J0IGRlZmF1bHQgQ2xpZW50X015U1FMXG4iXX0=