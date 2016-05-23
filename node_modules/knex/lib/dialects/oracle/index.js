
// Oracle Client
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

var _queryString = require('../../query/string');

var _queryString2 = _interopRequireDefault(_queryString);

var _transaction = require('./transaction');

var _transaction2 = _interopRequireDefault(_transaction);

var _queryCompiler = require('./query/compiler');

var _queryCompiler2 = _interopRequireDefault(_queryCompiler);

var _schemaCompiler = require('./schema/compiler');

var _schemaCompiler2 = _interopRequireDefault(_schemaCompiler);

var _schemaColumnbuilder = require('./schema/columnbuilder');

var _schemaColumnbuilder2 = _interopRequireDefault(_schemaColumnbuilder);

var _schemaColumncompiler = require('./schema/columncompiler');

var _schemaColumncompiler2 = _interopRequireDefault(_schemaColumncompiler);

var _schemaTablecompiler = require('./schema/tablecompiler');

var _schemaTablecompiler2 = _interopRequireDefault(_schemaTablecompiler);

var _stream2 = require('./stream');

var _stream3 = _interopRequireDefault(_stream2);

var _utils = require('./utils');

// Always initialize with the "QueryBuilder" and "QueryCompiler"
// objects, which extend the base 'lib/query/builder' and
// 'lib/query/compiler', respectively.
function Client_Oracle(config) {
  _client2['default'].call(this, config);
}
_inherits2['default'](Client_Oracle, _client2['default']);

_lodash.assign(Client_Oracle.prototype, {

  dialect: 'oracle',

  driverName: 'oracle',

  _driver: function _driver() {
    return require('oracle');
  },

  Transaction: _transaction2['default'],

  Formatter: _formatter2['default'],

  QueryCompiler: _queryCompiler2['default'],

  SchemaCompiler: _schemaCompiler2['default'],

  ColumnBuilder: _schemaColumnbuilder2['default'],

  ColumnCompiler: _schemaColumncompiler2['default'],

  TableCompiler: _schemaTablecompiler2['default'],

  prepBindings: function prepBindings(bindings) {
    var _this = this;

    return _lodash.map(bindings, function (value) {
      // returning helper uses always ROWID as string
      if (value instanceof _utils.ReturningHelper && _this.driver) {
        return new _this.driver.OutParam(_this.driver.OCCISTRING);
      } else if (typeof value === 'boolean') {
        return value ? 1 : 0;
      } else if (Buffer.isBuffer(value)) {
        return _queryString2['default'].bufferToString(value);
      }
      return value;
    });
  },

  // Get a raw connection, called by the `pool` whenever a new
  // connection needs to be added to the pool.
  acquireRawConnection: function acquireRawConnection() {
    var client = this;
    return new _promise2['default'](function (resolver, rejecter) {
      client.driver.connect(client.connectionSettings, function (err, connection) {
        if (err) return rejecter(err);
        _promise2['default'].promisifyAll(connection);
        if (client.connectionSettings.prefetchRowCount) {
          connection.setPrefetchRowCount(client.connectionSettings.prefetchRowCount);
        }
        resolver(connection);
      });
    });
  },

  // Used to explicitly close a connection, called internally by the pool
  // when a connection times out or the pool is shutdown.
  destroyRawConnection: function destroyRawConnection(connection, cb) {
    connection.close();
    cb();
  },

  // Return the database for the Oracle client.
  database: function database() {
    return this.connectionSettings.database;
  },

  // Position the bindings for the query.
  positionBindings: function positionBindings(sql) {
    var questionCount = 0;
    return sql.replace(/\?/g, function () {
      questionCount += 1;
      return ':' + questionCount;
    });
  },

  _stream: function _stream(connection, obj, stream, options) {
    obj.sql = this.positionBindings(obj.sql);
    return new _promise2['default'](function (resolver, rejecter) {
      stream.on('error', rejecter);
      stream.on('end', resolver);
      var queryStream = new _stream3['default'](connection, obj.sql, obj.bindings, options);
      queryStream.pipe(stream);
    });
  },

  // Runs the query on the specified connection, providing the bindings
  // and any other necessary prep work.
  _query: function _query(connection, obj) {

    // convert ? params into positional bindings (:1)
    obj.sql = this.positionBindings(obj.sql);

    if (!obj.sql) throw new Error('The query is empty');

    return connection.executeAsync(obj.sql, obj.bindings).then(function (response) {
      if (!obj.returning) return response;
      var rowIds = obj.outParams.map(function (v, i) {
        return response['returnParam' + (i ? i : '')];
      });
      return connection.executeAsync(obj.returningSql, rowIds);
    }).then(function (response) {
      obj.response = response;
      return obj;
    });
  },

  // Process the response as returned from the query.
  processResponse: function processResponse(obj, runner) {
    var response = obj.response;
    var method = obj.method;

    if (obj.output) return obj.output.call(runner, response);
    switch (method) {
      case 'select':
      case 'pluck':
      case 'first':
        response = helpers.skim(response);
        if (obj.method === 'pluck') response = _lodash.map(response, obj.pluck);
        return obj.method === 'first' ? response[0] : response;
      case 'insert':
      case 'del':
      case 'update':
      case 'counter':
        if (obj.returning) {
          if (obj.returning.length > 1 || obj.returning[0] === '*') {
            return response;
          }
          // return an array with values if only one returning value was specified
          return _lodash.flatten(_lodash.map(response, _lodash.values));
        }
        return response.updateCount;
      default:
        return response;
    }
  },

  ping: function ping(resource, callback) {
    resource.execute('SELECT 1', [], callback);
  }

});

exports['default'] = Client_Oracle;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9kaWFsZWN0cy9vcmFjbGUvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7c0JBRzZDLFFBQVE7O3dCQUVoQyxVQUFVOzs7O3lCQUNULGFBQWE7Ozs7c0JBQ2hCLGNBQWM7Ozs7dUJBQ2IsZUFBZTs7Ozt1QkFDVixlQUFlOztJQUE1QixPQUFPOzsyQkFDRyxvQkFBb0I7Ozs7MkJBRWxCLGVBQWU7Ozs7NkJBQ2Isa0JBQWtCOzs7OzhCQUNqQixtQkFBbUI7Ozs7bUNBQ3BCLHdCQUF3Qjs7OztvQ0FDdkIseUJBQXlCOzs7O21DQUMxQix3QkFBd0I7Ozs7dUJBQ3BCLFVBQVU7Ozs7cUJBQ1IsU0FBUzs7Ozs7QUFLekMsU0FBUyxhQUFhLENBQUMsTUFBTSxFQUFFO0FBQzdCLHNCQUFPLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUE7Q0FDMUI7QUFDRCxzQkFBUyxhQUFhLHNCQUFTLENBQUE7O0FBRS9CLGVBQU8sYUFBYSxDQUFDLFNBQVMsRUFBRTs7QUFFOUIsU0FBTyxFQUFFLFFBQVE7O0FBRWpCLFlBQVUsRUFBRSxRQUFROztBQUVwQixTQUFPLEVBQUEsbUJBQUc7QUFDUixXQUFPLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtHQUN6Qjs7QUFFRCxhQUFXLDBCQUFBOztBQUVYLFdBQVMsd0JBQUE7O0FBRVQsZUFBYSw0QkFBQTs7QUFFYixnQkFBYyw2QkFBQTs7QUFFZCxlQUFhLGtDQUFBOztBQUViLGdCQUFjLG1DQUFBOztBQUVkLGVBQWEsa0NBQUE7O0FBRWIsY0FBWSxFQUFBLHNCQUFDLFFBQVEsRUFBRTs7O0FBQ3JCLFdBQU8sWUFBSSxRQUFRLEVBQUUsVUFBQyxLQUFLLEVBQUs7O0FBRTlCLFVBQUksS0FBSyxrQ0FBMkIsSUFBSSxNQUFLLE1BQU0sRUFBRTtBQUNuRCxlQUFPLElBQUksTUFBSyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQUssTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFB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QUFTO0FBQ1osWUFBSSxHQUFHLENBQUMsU0FBUyxFQUFFO0FBQ2pCLGNBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0FBQ3hELG1CQUFPLFFBQVEsQ0FBQztXQUNqQjs7QUFFRCxpQkFBTyxnQkFBUSxZQUFJLFFBQVEsaUJBQVMsQ0FBQyxDQUFDO1NBQ3ZDO0FBQ0QsZUFBTyxRQUFRLENBQUMsV0FBVyxDQUFDO0FBQUEsQUFDOUI7QUFDRSxlQUFPLFFBQVEsQ0FBQztBQUFBLEtBQ25CO0dBQ0Y7O0FBRUQsTUFBSSxFQUFBLGNBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRTtBQUN2QixZQUFRLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7R0FDNUM7O0NBRUYsQ0FBQyxDQUFBOztxQkFFYSxhQUFhIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vLyBPcmFjbGUgQ2xpZW50XG4vLyAtLS0tLS0tXG5pbXBvcnQgeyBhc3NpZ24sIG1hcCwgZmxhdHRlbiwgdmFsdWVzIH0gZnJvbSAnbG9kYXNoJ1xuXG5pbXBvcnQgaW5oZXJpdHMgZnJvbSAnaW5oZXJpdHMnO1xuaW1wb3J0IEZvcm1hdHRlciBmcm9tICcuL2Zvcm1hdHRlcic7XG5pbXBvcnQgQ2xpZW50IGZyb20gJy4uLy4uL2NsaWVudCc7XG5pbXBvcnQgUHJvbWlzZSBmcm9tICcuLi8uLi9wcm9taXNlJztcbmltcG9ydCAqIGFzIGhlbHBlcnMgZnJvbSAnLi4vLi4vaGVscGVycyc7XG5pbXBvcnQgU3FsU3RyaW5nIGZyb20gJy4uLy4uL3F1ZXJ5L3N0cmluZyc7XG5cbmltcG9ydCBUcmFuc2FjdGlvbiBmcm9tICcuL3RyYW5zYWN0aW9uJztcbmltcG9ydCBRdWVyeUNvbXBpbGVyIGZyb20gJy4vcXVlcnkvY29tcGlsZXInO1xuaW1wb3J0IFNjaGVtYUNvbXBpbGVyIGZyb20gJy4vc2NoZW1hL2NvbXBpbGVyJztcbmltcG9ydCBDb2x1bW5CdWlsZGVyIGZyb20gJy4vc2NoZW1hL2NvbHVtbmJ1aWxkZXInO1xuaW1wb3J0IENvbHVtbkNvbXBpbGVyIGZyb20gJy4vc2NoZW1hL2NvbHVtbmNvbXBpbGVyJztcbmltcG9ydCBUYWJsZUNvbXBpbGVyIGZyb20gJy4vc2NoZW1hL3RhYmxlY29tcGlsZXInO1xuaW1wb3J0IE9yYWNsZVF1ZXJ5U3RyZWFtIGZyb20gJy4vc3RyZWFtJztcbmltcG9ydCB7IFJldHVybmluZ0hlbHBlciB9IGZyb20gJy4vdXRpbHMnO1xuXG4vLyBBbHdheXMgaW5pdGlhbGl6ZSB3aXRoIHRoZSBcIlF1ZXJ5QnVpbGRlclwiIGFuZCBcIlF1ZXJ5Q29tcGlsZXJcIlxuLy8gb2JqZWN0cywgd2hpY2ggZXh0ZW5kIHRoZSBiYXNlICdsaWIvcXVlcnkvYnVpbGRlcicgYW5kXG4vLyAnbGliL3F1ZXJ5L2NvbXBpbGVyJywgcmVzcGVjdGl2ZWx5LlxuZnVuY3Rpb24gQ2xpZW50X09yYWNsZShjb25maWcpIHtcbiAgQ2xpZW50LmNhbGwodGhpcywgY29uZmlnKVxufVxuaW5oZXJpdHMoQ2xpZW50X09yYWNsZSwgQ2xpZW50KVxuXG5hc3NpZ24oQ2xpZW50X09yYWNsZS5wcm90b3R5cGUsIHtcblxuICBkaWFsZWN0OiAnb3JhY2xlJyxcblxuICBkcml2ZXJOYW1lOiAnb3JhY2xlJyxcblxuICBfZHJpdmVyKCkge1xuICAgIHJldHVybiByZXF1aXJlKCdvcmFjbGUnKVxuICB9LFxuXG4gIFRyYW5zYWN0aW9uLFxuXG4gIEZvcm1hdHRlcixcblxuICBRdWVyeUNvbXBpbGVyLFxuXG4gIFNjaGVtYUNvbXBpbGVyLFxuXG4gIENvbHVtbkJ1aWxkZXIsXG5cbiAgQ29sdW1uQ29tcGlsZXIsXG5cbiAgVGFibGVDb21waWxlcixcblxuICBwcmVwQmluZGluZ3MoYmluZGluZ3MpIHtcbiAgICByZXR1cm4gbWFwKGJpbmRpbmdzLCAodmFsdWUpID0+IHtcbiAgICAgIC8vIHJldHVybmluZyBoZWxwZXIgdXNlcyBhbHdheXMgUk9XSUQgYXMgc3RyaW5nXG4gICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBSZXR1cm5pbmdIZWxwZXIgJiYgdGhpcy5kcml2ZXIpIHtcbiAgICAgICAgcmV0dXJuIG5ldyB0aGlzLmRyaXZlci5PdXRQYXJhbSh0aGlzLmRyaXZlci5PQ0NJU1RSSU5HKVxuICAgICAgfVxuICAgICAgZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlID8gMSA6IDBcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKEJ1ZmZlci5pc0J1ZmZlcih2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIFNxbFN0cmluZy5idWZmZXJUb1N0cmluZyh2YWx1ZSlcbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZVxuICAgIH0pXG4gIH0sXG5cbiAgLy8gR2V0IGEgcmF3IGNvbm5lY3Rpb24sIGNhbGxlZCBieSB0aGUgYHBvb2xgIHdoZW5ldmVyIGEgbmV3XG4gIC8vIGNvbm5lY3Rpb24gbmVlZHMgdG8gYmUgYWRkZWQgdG8gdGhlIHBvb2wuXG4gIGFjcXVpcmVSYXdDb25uZWN0aW9uKCkge1xuICAgIGNvbnN0IGNsaWVudCA9IHRoaXNcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZXIsIHJlamVjdGVyKSB7XG4gICAgICBjbGllbnQuZHJpdmVyLmNvbm5lY3QoY2xpZW50LmNvbm5lY3Rpb25TZXR0aW5ncyxcbiAgICAgICAgZnVuY3Rpb24oZXJyLCBjb25uZWN0aW9uKSB7XG4gICAgICAgICAgaWYgKGVycikgcmV0dXJuIHJlamVjdGVyKGVycilcbiAgICAgICAgICBQcm9taXNlLnByb21pc2lmeUFsbChjb25uZWN0aW9uKVxuICAgICAgICAgIGlmIChjbGllbnQuY29ubmVjdGlvblNldHRpbmdzLnByZWZldGNoUm93Q291bnQpIHtcbiAgICAgICAgICAgIGNvbm5lY3Rpb24uc2V0UHJlZmV0Y2hSb3dDb3VudChjbGllbnQuY29ubmVjdGlvblNldHRpbmdzLnByZWZldGNoUm93Q291bnQpXG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc29sdmVyKGNvbm5lY3Rpb24pXG4gICAgICAgIH0pXG4gICAgfSlcbiAgfSxcblxuICAvLyBVc2VkIHRvIGV4cGxpY2l0bHkgY2xvc2UgYSBjb25uZWN0aW9uLCBjYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcG9vbFxuICAvLyB3aGVuIGEgY29ubmVjdGlvbiB0aW1lcyBvdXQgb3IgdGhlIHBvb2wgaXMgc2h1dGRvd24uXG4gIGRlc3Ryb3lSYXdDb25uZWN0aW9uKGNvbm5lY3Rpb24sIGNiKSB7XG4gICAgY29ubmVjdGlvbi5jbG9zZSgpXG4gICAgY2IoKVxuICB9LFxuXG4gIC8vIFJldHVybiB0aGUgZGF0YWJhc2UgZm9yIHRoZSBPcmFjbGUgY2xpZW50LlxuICBkYXRhYmFzZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jb25uZWN0aW9uU2V0dGluZ3MuZGF0YWJhc2VcbiAgfSxcblxuICAvLyBQb3NpdGlvbiB0aGUgYmluZGluZ3MgZm9yIHRoZSBxdWVyeS5cbiAgcG9zaXRpb25CaW5kaW5ncyhzcWwpIHtcbiAgICBsZXQgcXVlc3Rpb25Db3VudCA9IDBcbiAgICByZXR1cm4gc3FsLnJlcGxhY2UoL1xcPy9nLCBmdW5jdGlvbigpIHtcbiAgICAgIHF1ZXN0aW9uQ291bnQgKz0gMVxuICAgICAgcmV0dXJuIGA6JHtxdWVzdGlvbkNvdW50fWBcbiAgICB9KVxuICB9LFxuXG4gIF9zdHJlYW0oY29ubmVjdGlvbiwgb2JqLCBzdHJlYW0sIG9wdGlvbnMpIHtcbiAgICBvYmouc3FsID0gdGhpcy5wb3NpdGlvbkJpbmRpbmdzKG9iai5zcWwpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZXIsIHJlamVjdGVyKSB7XG4gICAgICBzdHJlYW0ub24oJ2Vycm9yJywgcmVqZWN0ZXIpO1xuICAgICAgc3RyZWFtLm9uKCdlbmQnLCByZXNvbHZlcik7XG4gICAgICBjb25zdCBxdWVyeVN0cmVhbSA9IG5ldyBPcmFjbGVRdWVyeVN0cmVhbShjb25uZWN0aW9uLCBvYmouc3FsLCBvYmouYmluZGluZ3MsIG9wdGlvbnMpO1xuICAgICAgcXVlcnlTdHJlYW0ucGlwZShzdHJlYW0pXG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gUnVucyB0aGUgcXVlcnkgb24gdGhlIHNwZWNpZmllZCBjb25uZWN0aW9uLCBwcm92aWRpbmcgdGhlIGJpbmRpbmdzXG4gIC8vIGFuZCBhbnkgb3RoZXIgbmVjZXNzYXJ5IHByZXAgd29yay5cbiAgX3F1ZXJ5KGNvbm5lY3Rpb24sIG9iaikge1xuXG4gICAgLy8gY29udmVydCA/IHBhcmFtcyBpbnRvIHBvc2l0aW9uYWwgYmluZGluZ3MgKDoxKVxuICAgIG9iai5zcWwgPSB0aGlzLnBvc2l0aW9uQmluZGluZ3Mob2JqLnNxbCk7XG5cbiAgICBpZiAoIW9iai5zcWwpIHRocm93IG5ldyBFcnJvcignVGhlIHF1ZXJ5IGlzIGVtcHR5Jyk7XG5cbiAgICByZXR1cm4gY29ubmVjdGlvbi5leGVjdXRlQXN5bmMob2JqLnNxbCwgb2JqLmJpbmRpbmdzKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICBpZiAoIW9iai5yZXR1cm5pbmcpIHJldHVybiByZXNwb25zZVxuICAgICAgY29uc3Qgcm93SWRzID0gb2JqLm91dFBhcmFtcy5tYXAoKHYsIGkpID0+IHJlc3BvbnNlW2ByZXR1cm5QYXJhbSR7aSA/IGkgOiAnJ31gXSk7XG4gICAgICByZXR1cm4gY29ubmVjdGlvbi5leGVjdXRlQXN5bmMob2JqLnJldHVybmluZ1NxbCwgcm93SWRzKVxuICAgIH0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgIG9iai5yZXNwb25zZSA9IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIG9ialxuICAgIH0pXG5cbiAgfSxcblxuICAvLyBQcm9jZXNzIHRoZSByZXNwb25zZSBhcyByZXR1cm5lZCBmcm9tIHRoZSBxdWVyeS5cbiAgcHJvY2Vzc1Jlc3BvbnNlKG9iaiwgcnVubmVyKSB7XG4gICAgbGV0IHsgcmVzcG9uc2UgfSA9IG9iajtcbiAgICBjb25zdCB7IG1ldGhvZCB9ID0gb2JqO1xuICAgIGlmIChvYmoub3V0cHV0KSByZXR1cm4gb2JqLm91dHB1dC5jYWxsKHJ1bm5lciwgcmVzcG9uc2UpO1xuICAgIHN3aXRjaCAobWV0aG9kKSB7XG4gICAgICBjYXNlICdzZWxlY3QnOlxuICAgICAgY2FzZSAncGx1Y2snOlxuICAgICAgY2FzZSAnZmlyc3QnOlxuICAgICAgICByZXNwb25zZSA9IGhlbHBlcnMuc2tpbShyZXNwb25zZSk7XG4gICAgICAgIGlmIChvYmoubWV0aG9kID09PSAncGx1Y2snKSByZXNwb25zZSA9IG1hcChyZXNwb25zZSwgb2JqLnBsdWNrKTtcbiAgICAgICAgcmV0dXJuIG9iai5tZXRob2QgPT09ICdmaXJzdCcgPyByZXNwb25zZVswXSA6IHJlc3BvbnNlO1xuICAgICAgY2FzZSAnaW5zZXJ0JzpcbiAgICAgIGNhc2UgJ2RlbCc6XG4gICAgICBjYXNlICd1cGRhdGUnOlxuICAgICAgY2FzZSAnY291bnRlcic6XG4gICAgICAgIGlmIChvYmoucmV0dXJuaW5nKSB7XG4gICAgICAgICAgaWYgKG9iai5yZXR1cm5pbmcubGVuZ3RoID4gMSB8fCBvYmoucmV0dXJuaW5nWzBdID09PSAnKicpIHtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gcmV0dXJuIGFuIGFycmF5IHdpdGggdmFsdWVzIGlmIG9ubHkgb25lIHJldHVybmluZyB2YWx1ZSB3YXMgc3BlY2lmaWVkXG4gICAgICAgICAgcmV0dXJuIGZsYXR0ZW4obWFwKHJlc3BvbnNlLCB2YWx1ZXMpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzcG9uc2UudXBkYXRlQ291bnQ7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgfVxuICB9LFxuXG4gIHBpbmcocmVzb3VyY2UsIGNhbGxiYWNrKSB7XG4gICAgcmVzb3VyY2UuZXhlY3V0ZSgnU0VMRUNUIDEnLCBbXSwgY2FsbGJhY2spO1xuICB9XG5cbn0pXG5cbmV4cG9ydCBkZWZhdWx0IENsaWVudF9PcmFjbGVcbiJdfQ==