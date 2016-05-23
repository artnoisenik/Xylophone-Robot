
// MSSQL Client
// -------
'use strict';

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodash = require('lodash');

var _inherits = require('inherits');

var _inherits2 = _interopRequireDefault(_inherits);

var _formatter = require('./formatter');

var _formatter2 = _interopRequireDefault(_formatter);

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

var isArray = Array.isArray;

// Always initialize with the "QueryBuilder" and "QueryCompiler" objects, which
// extend the base 'lib/query/builder' and 'lib/query/compiler', respectively.
function Client_MSSQL(config) {
  // #1235 mssql module wants 'server', not 'host'. This is to enforce the same
  // options object across all dialects.
  if (config && config.connection && config.connection.host) {
    config.connection.server = config.connection.host;
  }
  _client2['default'].call(this, config);
}
_inherits2['default'](Client_MSSQL, _client2['default']);

_lodash.assign(Client_MSSQL.prototype, {

  dialect: 'mssql',

  driverName: 'mssql',

  _driver: function _driver() {
    return require('mssql');
  },

  Transaction: _transaction2['default'],

  Formatter: _formatter2['default'],

  QueryCompiler: _queryCompiler2['default'],

  SchemaCompiler: _schemaCompiler2['default'],

  TableCompiler: _schemaTablecompiler2['default'],

  ColumnCompiler: _schemaColumncompiler2['default'],

  wrapIdentifier: function wrapIdentifier(value) {
    return value !== '*' ? '[' + value.replace(/\[/g, '\[') + ']' : '*';
  },

  // Get a raw connection, called by the `pool` whenever a new
  // connection needs to be added to the pool.
  acquireRawConnection: function acquireRawConnection() {
    var client = this;
    var connection = new this.driver.Connection(this.connectionSettings);
    return new _promise2['default'](function (resolver, rejecter) {
      connection.connect(function (err) {
        if (err) return rejecter(err);
        connection.on('error', connectionErrorHandler.bind(null, client, connection));
        connection.on('end', connectionErrorHandler.bind(null, client, connection));
        resolver(connection);
      });
    });
  },

  // Used to explicitly close a connection, called internally by the pool
  // when a connection times out or the pool is shutdown.
  destroyRawConnection: function destroyRawConnection(connection, cb) {
    connection.close(cb);
  },

  // Position the bindings for the query.
  positionBindings: function positionBindings(sql) {
    var questionCount = -1;
    return sql.replace(/\?/g, function () {
      questionCount += 1;
      return '@p' + questionCount;
    });
  },

  // Grab a connection, run the query via the MSSQL streaming interface,
  // and pass that through to the stream we've sent back to the client.
  _stream: function _stream(connection, obj, stream, options) {
    options = options || {};
    if (!obj || typeof obj === 'string') obj = { sql: obj };
    // convert ? params into positional bindings (@p1)
    obj.sql = this.positionBindings(obj.sql);
    return new _promise2['default'](function (resolver, rejecter) {
      stream.on('error', rejecter);
      stream.on('end', resolver);
      var _obj = obj;
      var sql = _obj.sql;

      if (!sql) return resolver();
      if (obj.options) {
        ;

        var _assign = _lodash.assign({ sql: sql }, obj.options);

        sql = _assign.sql;
      }var req = (connection.tx_ || connection).request();
      //req.verbose = true;
      req.multiple = true;
      req.stream = true;
      if (obj.bindings) {
        for (var i = 0; i < obj.bindings.length; i++) {
          req.input('p' + i, obj.bindings[i]);
        }
      }
      req.pipe(stream);
      req.query(sql);
    });
  },

  // Runs the query on the specified connection, providing the bindings
  // and any other necessary prep work.
  _query: function _query(connection, obj) {
    if (!obj || typeof obj === 'string') obj = { sql: obj };
    // convert ? params into positional bindings (@p1)
    obj.sql = this.positionBindings(obj.sql);
    return new _promise2['default'](function (resolver, rejecter) {
      var _obj2 = obj;
      var sql = _obj2.sql;

      if (!sql) return resolver();
      if (obj.options) {
        ;

        var _assign2 = _lodash.assign({ sql: sql }, obj.options);

        sql = _assign2.sql;
      }var req = (connection.tx_ || connection).request();
      // req.verbose = true;
      req.multiple = true;
      if (obj.bindings) {
        for (var i = 0; i < obj.bindings.length; i++) {
          req.input('p' + i, obj.bindings[i]);
        }
      }
      req.query(sql, function (err, recordset) {
        if (err) return rejecter(err);
        obj.response = recordset[0];
        resolver(obj);
      });
    });
  },

  // Process the response as returned from the query.
  processResponse: function processResponse(obj, runner) {
    if (obj == null) return;
    var response = obj.response;
    var method = obj.method;

    if (obj.output) return obj.output.call(runner, response);
    switch (method) {
      case 'select':
      case 'pluck':
      case 'first':
        response = helpers.skim(response);
        if (method === 'pluck') return _lodash.map(response, obj.pluck);
        return method === 'first' ? response[0] : response;
      case 'insert':
      case 'del':
      case 'update':
      case 'counter':
        if (obj.returning) {
          if (obj.returning === '@@rowcount') {
            return response[0][''];
          }

          if (isArray(obj.returning) && obj.returning.length > 1 || obj.returning[0] === '*') {
            return response;
          }
          // return an array with values if only one returning value was specified
          return _lodash.flatten(_lodash.map(response, _lodash.values));
        }
        return response;
      default:
        return response;
    }
  },

  ping: function ping(resource, callback) {
    resource.request().query('SELECT 1', callback);
  }

});

// MSSQL Specific error handler
function connectionErrorHandler(client, connection, err) {
  if (connection && err && err.fatal) {
    if (connection.__knex__disposed) return;
    connection.__knex__disposed = true;
    client.pool.destroy(connection);
  }
}

exports['default'] = Client_MSSQL;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9kaWFsZWN0cy9tc3NxbC9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztzQkFHNkMsUUFBUTs7d0JBQ2hDLFVBQVU7Ozs7eUJBRVQsYUFBYTs7OztzQkFDaEIsY0FBYzs7Ozt1QkFDYixlQUFlOzs7O3VCQUNWLGVBQWU7O0lBQTVCLE9BQU87OzJCQUVLLGVBQWU7Ozs7NkJBQ2Isa0JBQWtCOzs7OzhCQUNqQixtQkFBbUI7Ozs7bUNBQ3BCLHdCQUF3Qjs7OztvQ0FDdkIseUJBQXlCOzs7O0lBRTVDLE9BQU8sR0FBSyxLQUFLLENBQWpCLE9BQU87Ozs7QUFJZixTQUFTLFlBQVksQ0FBQyxNQUFNLEVBQUU7OztBQUc1QixNQUFHLE1BQU0sSUFBSSxNQUFNLENBQUMsVUFBVSxJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFO0FBQ3hELFVBQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO0dBQ25EO0FBQ0Qsc0JBQU8sSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztDQUMzQjtBQUNELHNCQUFTLFlBQVksc0JBQVMsQ0FBQzs7QUFFL0IsZUFBTyxZQUFZLENBQUMsU0FBUyxFQUFFOztBQUU3QixTQUFPLEVBQUUsT0FBTzs7QUFFaEIsWUFBVSxFQUFFLE9BQU87O0FBRW5CLFNBQU8sRUFBQSxtQkFBRztBQUNSLFdBQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0dBQ3pCOztBQUVELGFBQVcsMEJBQUE7O0FBRVgsV0FBUyx3QkFBQTs7QUFFVCxlQUFhLDRCQUFBOztBQUViLGdCQUFjLDZCQUFBOztBQUVkLGVBQWEsa0NBQUE7O0FBRWIsZ0JBQWMsbUNBQUE7O0FBRWQsZ0JBQWMsRUFBQSx3QkFBQyxLQUFLLEVBQUU7QUFDcEIsV0FBUSxLQUFLLEtBQUssR0FBRyxTQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFF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Q0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtXQUN2Qjs7QUFFRCxjQUNFLEFBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQ25ELEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUN4QjtBQUNBLG1CQUFPLFFBQVEsQ0FBQztXQUNqQjs7QUFFRCxpQkFBTyxnQkFBUSxZQUFJLFFBQVEsaUJBQVMsQ0FBQyxDQUFDO1NBQ3ZDO0FBQ0QsZUFBTyxRQUFRLENBQUM7QUFBQSxBQUNsQjtBQUNFLGVBQU8sUUFBUSxDQUFBO0FBQUEsS0FDbEI7R0FDRjs7QUFFRCxNQUFJLEVBQUEsY0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFO0FBQ3ZCLFlBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0dBQ2hEOztDQUVGLENBQUMsQ0FBQTs7O0FBR0YsU0FBUyxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRTtBQUN2RCxNQUFJLFVBQVUsSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRTtBQUNsQyxRQUFJLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRSxPQUFPO0FBQ3hDLGNBQVUsQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7QUFDbkMsVUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7R0FDakM7Q0FDRjs7cUJBRWMsWUFBWSIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuLy8gTVNTUUwgQ2xpZW50XG4vLyAtLS0tLS0tXG5pbXBvcnQgeyBhc3NpZ24sIG1hcCwgZmxhdHRlbiwgdmFsdWVzIH0gZnJvbSAnbG9kYXNoJ1xuaW1wb3J0IGluaGVyaXRzIGZyb20gJ2luaGVyaXRzJztcblxuaW1wb3J0IEZvcm1hdHRlciBmcm9tICcuL2Zvcm1hdHRlcic7XG5pbXBvcnQgQ2xpZW50IGZyb20gJy4uLy4uL2NsaWVudCc7XG5pbXBvcnQgUHJvbWlzZSBmcm9tICcuLi8uLi9wcm9taXNlJztcbmltcG9ydCAqIGFzIGhlbHBlcnMgZnJvbSAnLi4vLi4vaGVscGVycyc7XG5cbmltcG9ydCBUcmFuc2FjdGlvbiBmcm9tICcuL3RyYW5zYWN0aW9uJztcbmltcG9ydCBRdWVyeUNvbXBpbGVyIGZyb20gJy4vcXVlcnkvY29tcGlsZXInO1xuaW1wb3J0IFNjaGVtYUNvbXBpbGVyIGZyb20gJy4vc2NoZW1hL2NvbXBpbGVyJztcbmltcG9ydCBUYWJsZUNvbXBpbGVyIGZyb20gJy4vc2NoZW1hL3RhYmxlY29tcGlsZXInO1xuaW1wb3J0IENvbHVtbkNvbXBpbGVyIGZyb20gJy4vc2NoZW1hL2NvbHVtbmNvbXBpbGVyJztcblxuY29uc3QgeyBpc0FycmF5IH0gPSBBcnJheTtcblxuLy8gQWx3YXlzIGluaXRpYWxpemUgd2l0aCB0aGUgXCJRdWVyeUJ1aWxkZXJcIiBhbmQgXCJRdWVyeUNvbXBpbGVyXCIgb2JqZWN0cywgd2hpY2hcbi8vIGV4dGVuZCB0aGUgYmFzZSAnbGliL3F1ZXJ5L2J1aWxkZXInIGFuZCAnbGliL3F1ZXJ5L2NvbXBpbGVyJywgcmVzcGVjdGl2ZWx5LlxuZnVuY3Rpb24gQ2xpZW50X01TU1FMKGNvbmZpZykge1xuICAvLyAjMTIzNSBtc3NxbCBtb2R1bGUgd2FudHMgJ3NlcnZlcicsIG5vdCAnaG9zdCcuIFRoaXMgaXMgdG8gZW5mb3JjZSB0aGUgc2FtZVxuICAvLyBvcHRpb25zIG9iamVjdCBhY3Jvc3MgYWxsIGRpYWxlY3RzLlxuICBpZihjb25maWcgJiYgY29uZmlnLmNvbm5lY3Rpb24gJiYgY29uZmlnLmNvbm5lY3Rpb24uaG9zdCkge1xuICAgIGNvbmZpZy5jb25uZWN0aW9uLnNlcnZlciA9IGNvbmZpZy5jb25uZWN0aW9uLmhvc3Q7XG4gIH1cbiAgQ2xpZW50LmNhbGwodGhpcywgY29uZmlnKTtcbn1cbmluaGVyaXRzKENsaWVudF9NU1NRTCwgQ2xpZW50KTtcblxuYXNzaWduKENsaWVudF9NU1NRTC5wcm90b3R5cGUsIHtcblxuICBkaWFsZWN0OiAnbXNzcWwnLFxuXG4gIGRyaXZlck5hbWU6ICdtc3NxbCcsXG5cbiAgX2RyaXZlcigpIHtcbiAgICByZXR1cm4gcmVxdWlyZSgnbXNzcWwnKTtcbiAgfSxcblxuICBUcmFuc2FjdGlvbixcblxuICBGb3JtYXR0ZXIsXG5cbiAgUXVlcnlDb21waWxlcixcblxuICBTY2hlbWFDb21waWxlcixcblxuICBUYWJsZUNvbXBpbGVyLFxuXG4gIENvbHVtbkNvbXBpbGVyLFxuXG4gIHdyYXBJZGVudGlmaWVyKHZhbHVlKSB7XG4gICAgcmV0dXJuICh2YWx1ZSAhPT0gJyonID8gYFske3ZhbHVlLnJlcGxhY2UoL1xcWy9nLCAnXFxbJyl9XWAgOiAnKicpXG4gIH0sXG5cbiAgLy8gR2V0IGEgcmF3IGNvbm5lY3Rpb24sIGNhbGxlZCBieSB0aGUgYHBvb2xgIHdoZW5ldmVyIGEgbmV3XG4gIC8vIGNvbm5lY3Rpb24gbmVlZHMgdG8gYmUgYWRkZWQgdG8gdGhlIHBvb2wuXG4gIGFjcXVpcmVSYXdDb25uZWN0aW9uKCkge1xuICAgIGNvbnN0IGNsaWVudCA9IHRoaXM7XG4gICAgY29uc3QgY29ubmVjdGlvbiA9IG5ldyB0aGlzLmRyaXZlci5Db25uZWN0aW9uKHRoaXMuY29ubmVjdGlvblNldHRpbmdzKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZXIsIHJlamVjdGVyKSB7XG4gICAgICBjb25uZWN0aW9uLmNvbm5lY3QoZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgIGlmIChlcnIpIHJldHVybiByZWplY3RlcihlcnIpO1xuICAgICAgICBjb25uZWN0aW9uLm9uKCdlcnJvcicsIGNvbm5lY3Rpb25FcnJvckhhbmRsZXIuYmluZChudWxsLCBjbGllbnQsIGNvbm5lY3Rpb24pKTtcbiAgICAgICAgY29ubmVjdGlvbi5vbignZW5kJywgY29ubmVjdGlvbkVycm9ySGFuZGxlci5iaW5kKG51bGwsIGNsaWVudCwgY29ubmVjdGlvbikpO1xuICAgICAgICByZXNvbHZlcihjb25uZWN0aW9uKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFVzZWQgdG8gZXhwbGljaXRseSBjbG9zZSBhIGNvbm5lY3Rpb24sIGNhbGxlZCBpbnRlcm5hbGx5IGJ5IHRoZSBwb29sXG4gIC8vIHdoZW4gYSBjb25uZWN0aW9uIHRpbWVzIG91dCBvciB0aGUgcG9vbCBpcyBzaHV0ZG93bi5cbiAgZGVzdHJveVJhd0Nvbm5lY3Rpb24oY29ubmVjdGlvbiwgY2IpIHtcbiAgICBjb25uZWN0aW9uLmNsb3NlKGNiKTtcbiAgfSxcblxuICAvLyBQb3NpdGlvbiB0aGUgYmluZGluZ3MgZm9yIHRoZSBxdWVyeS5cbiAgcG9zaXRpb25CaW5kaW5ncyhzcWwpIHtcbiAgICBsZXQgcXVlc3Rpb25Db3VudCA9IC0xXG4gICAgcmV0dXJuIHNxbC5yZXBsYWNlKC9cXD8vZywgZnVuY3Rpb24oKSB7XG4gICAgICBxdWVzdGlvbkNvdW50ICs9IDFcbiAgICAgIHJldHVybiBgQHAke3F1ZXN0aW9uQ291bnR9YFxuICAgIH0pXG4gIH0sXG5cbiAgLy8gR3JhYiBhIGNvbm5lY3Rpb24sIHJ1biB0aGUgcXVlcnkgdmlhIHRoZSBNU1NRTCBzdHJlYW1pbmcgaW50ZXJmYWNlLFxuICAvLyBhbmQgcGFzcyB0aGF0IHRocm91Z2ggdG8gdGhlIHN0cmVhbSB3ZSd2ZSBzZW50IGJhY2sgdG8gdGhlIGNsaWVudC5cbiAgX3N0cmVhbShjb25uZWN0aW9uLCBvYmosIHN0cmVhbSwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gICAgaWYgKCFvYmogfHwgdHlwZW9mIG9iaiA9PT0gJ3N0cmluZycpIG9iaiA9IHtzcWw6IG9ian1cbiAgICAvLyBjb252ZXJ0ID8gcGFyYW1zIGludG8gcG9zaXRpb25hbCBiaW5kaW5ncyAoQHAxKVxuICAgIG9iai5zcWwgPSB0aGlzLnBvc2l0aW9uQmluZGluZ3Mob2JqLnNxbCk7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmVyLCByZWplY3Rlcikge1xuICAgICAgc3RyZWFtLm9uKCdlcnJvcicsIHJlamVjdGVyKTtcbiAgICAgIHN0cmVhbS5vbignZW5kJywgcmVzb2x2ZXIpO1xuICAgICAgbGV0IHsgc3FsIH0gPSBvYmpcbiAgICAgIGlmICghc3FsKSByZXR1cm4gcmVzb2x2ZXIoKVxuICAgICAgaWYgKG9iai5vcHRpb25zKSAoeyBzcWwgfSA9IGFzc2lnbih7c3FsfSwgb2JqLm9wdGlvbnMpKVxuICAgICAgY29uc3QgcmVxID0gKGNvbm5lY3Rpb24udHhfIHx8IGNvbm5lY3Rpb24pLnJlcXVlc3QoKTtcbiAgICAgIC8vcmVxLnZlcmJvc2UgPSB0cnVlO1xuICAgICAgcmVxLm11bHRpcGxlID0gdHJ1ZTtcbiAgICAgIHJlcS5zdHJlYW0gPSB0cnVlO1xuICAgICAgaWYgKG9iai5iaW5kaW5ncykge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG9iai5iaW5kaW5ncy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHJlcS5pbnB1dChgcCR7aX1gLCBvYmouYmluZGluZ3NbaV0pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJlcS5waXBlKHN0cmVhbSlcbiAgICAgIHJlcS5xdWVyeShzcWwpXG4gICAgfSlcbiAgfSxcblxuICAvLyBSdW5zIHRoZSBxdWVyeSBvbiB0aGUgc3BlY2lmaWVkIGNvbm5lY3Rpb24sIHByb3ZpZGluZyB0aGUgYmluZGluZ3NcbiAgLy8gYW5kIGFueSBvdGhlciBuZWNlc3NhcnkgcHJlcCB3b3JrLlxuICBfcXVlcnkoY29ubmVjdGlvbiwgb2JqKSB7XG4gICAgaWYgKCFvYmogfHwgdHlwZW9mIG9iaiA9PT0gJ3N0cmluZycpIG9iaiA9IHtzcWw6IG9ian1cbiAgICAvLyBjb252ZXJ0ID8gcGFyYW1zIGludG8gcG9zaXRpb25hbCBiaW5kaW5ncyAoQHAxKVxuICAgIG9iai5zcWwgPSB0aGlzLnBvc2l0aW9uQmluZGluZ3Mob2JqLnNxbCk7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmVyLCByZWplY3Rlcikge1xuICAgICAgbGV0IHsgc3FsIH0gPSBvYmpcbiAgICAgIGlmICghc3FsKSByZXR1cm4gcmVzb2x2ZXIoKVxuICAgICAgaWYgKG9iai5vcHRpb25zKSAoeyBzcWwgfSA9IGFzc2lnbih7c3FsfSwgb2JqLm9wdGlvbnMpKVxuICAgICAgY29uc3QgcmVxID0gKGNvbm5lY3Rpb24udHhfIHx8IGNvbm5lY3Rpb24pLnJlcXVlc3QoKTtcbiAgICAgIC8vIHJlcS52ZXJib3NlID0gdHJ1ZTtcbiAgICAgIHJlcS5tdWx0aXBsZSA9IHRydWU7XG4gICAgICBpZiAob2JqLmJpbmRpbmdzKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb2JqLmJpbmRpbmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgcmVxLmlucHV0KGBwJHtpfWAsIG9iai5iaW5kaW5nc1tpXSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmVxLnF1ZXJ5KHNxbCwgZnVuY3Rpb24oZXJyLCByZWNvcmRzZXQpIHtcbiAgICAgICAgaWYgKGVycikgcmV0dXJuIHJlamVjdGVyKGVycilcbiAgICAgICAgb2JqLnJlc3BvbnNlID0gcmVjb3Jkc2V0WzBdXG4gICAgICAgIHJlc29sdmVyKG9iailcbiAgICAgIH0pXG4gICAgfSlcbiAgfSxcblxuICAvLyBQcm9jZXNzIHRoZSByZXNwb25zZSBhcyByZXR1cm5lZCBmcm9tIHRoZSBxdWVyeS5cbiAgcHJvY2Vzc1Jlc3BvbnNlKG9iaiwgcnVubmVyKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm47XG4gICAgbGV0IHsgcmVzcG9uc2UgfSA9IG9ialxuICAgIGNvbnN0IHsgbWV0aG9kIH0gPSBvYmpcbiAgICBpZiAob2JqLm91dHB1dCkgcmV0dXJuIG9iai5vdXRwdXQuY2FsbChydW5uZXIsIHJlc3BvbnNlKVxuICAgIHN3aXRjaCAobWV0aG9kKSB7XG4gICAgICBjYXNlICdzZWxlY3QnOlxuICAgICAgY2FzZSAncGx1Y2snOlxuICAgICAgY2FzZSAnZmlyc3QnOlxuICAgICAgICByZXNwb25zZSA9IGhlbHBlcnMuc2tpbShyZXNwb25zZSlcbiAgICAgICAgaWYgKG1ldGhvZCA9PT0gJ3BsdWNrJykgcmV0dXJuIG1hcChyZXNwb25zZSwgb2JqLnBsdWNrKVxuICAgICAgICByZXR1cm4gbWV0aG9kID09PSAnZmlyc3QnID8gcmVzcG9uc2VbMF0gOiByZXNwb25zZVxuICAgICAgY2FzZSAnaW5zZXJ0JzpcbiAgICAgIGNhc2UgJ2RlbCc6XG4gICAgICBjYXNlICd1cGRhdGUnOlxuICAgICAgY2FzZSAnY291bnRlcic6XG4gICAgICAgIGlmIChvYmoucmV0dXJuaW5nKSB7XG4gICAgICAgICAgaWYgKG9iai5yZXR1cm5pbmcgPT09ICdAQHJvd2NvdW50Jykge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlWzBdWycnXVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIChpc0FycmF5KG9iai5yZXR1cm5pbmcpICYmIG9iai5yZXR1cm5pbmcubGVuZ3RoID4gMSkgfHxcbiAgICAgICAgICAgIG9iai5yZXR1cm5pbmdbMF0gPT09ICcqJ1xuICAgICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyByZXR1cm4gYW4gYXJyYXkgd2l0aCB2YWx1ZXMgaWYgb25seSBvbmUgcmV0dXJuaW5nIHZhbHVlIHdhcyBzcGVjaWZpZWRcbiAgICAgICAgICByZXR1cm4gZmxhdHRlbihtYXAocmVzcG9uc2UsIHZhbHVlcykpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiByZXNwb25zZVxuICAgIH1cbiAgfSxcblxuICBwaW5nKHJlc291cmNlLCBjYWxsYmFjaykge1xuICAgIHJlc291cmNlLnJlcXVlc3QoKS5xdWVyeSgnU0VMRUNUIDEnLCBjYWxsYmFjayk7XG4gIH1cblxufSlcblxuLy8gTVNTUUwgU3BlY2lmaWMgZXJyb3IgaGFuZGxlclxuZnVuY3Rpb24gY29ubmVjdGlvbkVycm9ySGFuZGxlcihjbGllbnQsIGNvbm5lY3Rpb24sIGVycikge1xuICBpZiAoY29ubmVjdGlvbiAmJiBlcnIgJiYgZXJyLmZhdGFsKSB7XG4gICAgaWYgKGNvbm5lY3Rpb24uX19rbmV4X19kaXNwb3NlZCkgcmV0dXJuO1xuICAgIGNvbm5lY3Rpb24uX19rbmV4X19kaXNwb3NlZCA9IHRydWU7XG4gICAgY2xpZW50LnBvb2wuZGVzdHJveShjb25uZWN0aW9uKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBDbGllbnRfTVNTUUxcbiJdfQ==