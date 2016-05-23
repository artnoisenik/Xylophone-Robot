'use strict';

exports.__esModule = true;
exports['default'] = makeKnex;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _events = require('events');

var _migrate = require('../migrate');

var _migrate2 = _interopRequireDefault(_migrate);

var _seed = require('../seed');

var _seed2 = _interopRequireDefault(_seed);

var _functionhelper = require('../functionhelper');

var _functionhelper2 = _interopRequireDefault(_functionhelper);

var _queryMethods = require('../query/methods');

var _queryMethods2 = _interopRequireDefault(_queryMethods);

var _helpers = require('../helpers');

var helpers = _interopRequireWildcard(_helpers);

var _lodash = require('lodash');

var _batchInsert = require('./batchInsert');

var _batchInsert2 = _interopRequireDefault(_batchInsert);

var _index = require("../index");

var _index2 = _interopRequireDefault(_index);

function makeKnex(client) {

  // The object we're potentially using to kick off an initial chain.
  function knex(tableName) {
    var qb = knex.queryBuilder();
    if (!tableName) helpers.warn('calling knex without a tableName is deprecated. Use knex.queryBuilder() instead.');
    return tableName ? qb.table(tableName) : qb;
  }

  _lodash.assign(knex, {

    Promise: require('../promise'),

    // A new query builder instance.
    queryBuilder: function queryBuilder() {
      return client.queryBuilder();
    },

    raw: function raw() {
      return client.raw.apply(client, arguments);
    },

    batchInsert: function batchInsert(table, batch) {
      var chunkSize = arguments.length <= 2 || arguments[2] === undefined ? 1000 : arguments[2];

      return new _batchInsert2['default'](this, table, batch, chunkSize);
    },

    // Runs a new transaction, taking a container and returning a promise
    // for when the transaction is resolved.
    transaction: function transaction(container, config) {
      return client.transaction(container, config);
    },

    // Typically never needed, initializes the pool for a knex client.
    initialize: function initialize(config) {
      return client.initialize(config);
    },

    // Convenience method for tearing down the pool.
    destroy: function destroy(callback) {
      return client.destroy(callback);
    }

  });

  // The `__knex__` is used if you need to duck-type check whether this
  // is a knex builder, without a full on `instanceof` check.
  knex.VERSION = knex.__knex__ = _index2['default'].VERSION;

  // Hook up the "knex" object as an EventEmitter.
  var ee = new _events.EventEmitter();
  for (var key in ee) {
    knex[key] = ee[key];
  }

  // Allow chaining methods from the root object, before
  // any other information is specified.
  _queryMethods2['default'].forEach(function (method) {
    knex[method] = function () {
      var builder = knex.queryBuilder();
      return builder[method].apply(builder, arguments);
    };
  });

  knex.client = client;

  Object.defineProperties(knex, {

    schema: {
      get: function get() {
        return client.schemaBuilder();
      }
    },

    migrate: {
      get: function get() {
        return new _migrate2['default'](knex);
      }
    },

    seed: {
      get: function get() {
        return new _seed2['default'](knex);
      }
    },

    fn: {
      get: function get() {
        return new _functionhelper2['default'](client);
      }
    }

  });

  // Passthrough all "start" and "query" events to the knex object.
  client.on('start', function (obj) {
    knex.emit('start', obj);
  });

  client.on('query', function (obj) {
    knex.emit('query', obj);
  });

  client.on('query-error', function (err, obj) {
    knex.emit('query-error', err, obj);
  });

  client.on('query-response', function (response, obj, builder) {
    knex.emit('query-response', response, obj, builder);
  });

  client.makeKnex = makeKnex;

  return knex;
}

module.exports = exports['default'];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlsL21ha2Uta25leC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7cUJBWXdCLFFBQVE7Ozs7OztzQkFYSCxRQUFROzt1QkFFaEIsWUFBWTs7OztvQkFDZCxTQUFTOzs7OzhCQUNELG1CQUFtQjs7Ozs0QkFDbkIsa0JBQWtCOzs7O3VCQUNwQixZQUFZOztJQUF6QixPQUFPOztzQkFDSSxRQUFROzsyQkFDUCxlQUFlOzs7O3FCQUN0QixVQUFVOzs7O0FBRVosU0FBUyxRQUFRLENBQUMsTUFBTSxFQUFFOzs7QUFHdkMsV0FBUyxJQUFJLENBQUMsU0FBUyxFQUFFO0FBQ3ZCLFFBQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtBQUM5QixRQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQzFCLGtGQUFrRixDQUNuRixDQUFDO0FBQ0YsV0FBTyxTQUFTLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUE7R0FDNUM7O0FBRUQsaUJBQU8sSUFBSSxFQUFFOztBQUVYLFdBQU8sRUFBRSxPQUFPLENBQUMsWUFBWSxDQUFDOzs7QUFHOUIsZ0JBQVksRUFBQSx3QkFBRztBQUNiLGFBQU8sTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFBO0tBQzdCOztBQUVELE9BQUcsRUFBQSxlQUFHO0FBQ0osYUFBTyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7S0FDM0M7O0FBRUQsZUFBVyxFQUFBLHFCQUFDLEtBQUssRUFBRSxLQUFLLEVBQW9CO1VBQWxCLFNBQVMseURBQUcsSUFBSTs7QUFDeEMsYUFBTyw2QkFBZ0IsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7S0FDdkQ7Ozs7QUFJRCxlQUFXLEVBQUEscUJBQUMsU0FBUyxFQUFFLE1BQU0sRUFBRTtBQUM3QixhQUFPLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0tBQzdDOzs7QUFHRCxjQUFVLEVBQUEsb0JBQUMsTUFBTSxFQUFFO0FBQ2pCLGFBQU8sTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtLQUNqQzs7O0FBR0QsV0FBTyxFQUFBLGlCQUFDLFFBQVEsRUFBRTtBQUNoQixhQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7S0FDaEM7O0dBRUYsQ0FBQyxDQUFBOzs7O0FBSUYsTUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLG1CQUFLLE9BQU8sQ0FBQzs7O0FBRzVDLE1BQU0sRUFBRSxHQUFHLDBCQUFrQixDQUFBO0FBQzdCLE9BQUssSUFBTSxHQUFHLElBQUksRUFBRSxFQUFFO0FBQ3BCLFFBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUE7R0FDcEI7Ozs7QUFJRCw0QkFBZSxPQUFPLENBQUMsVUFBUyxNQUFNLEVBQUU7QUFDdEMsUUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLFlBQVc7QUFDeEIsVUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO0FBQ25DLGFBQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUE7S0FDakQsQ0FBQTtHQUNGLENBQUMsQ0FBQTs7QUFFRixNQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTs7QUFFcEIsUUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRTs7QUFFNUIsVUFBTSxFQUFFO0FBQ04sU0FBRyxFQUFBLGVBQUc7QUFDSixlQUFPLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQTtPQUM5QjtLQUNGOztBQUVELFdBQU8sRUFBRTtBQUNQLFNBQUcsRUFBQSxlQUFHO0FBQ0osZUFBTyx5QkFBYSxJQUFJLENBQUMsQ0FBQTtPQUMxQjtLQUNGOztBQUVELFFBQUksRUFBRTtBQUNKLFNBQUcsRUFBQSxlQUFHO0FBQ0osZUFBTyxzQkFBVyxJQUFJLENBQUMsQ0FBQTtPQUN4QjtLQUNGOztBQUVELE1BQUUsRUFBRTtBQUNGLFNBQUcsRUFBQSxlQUFHO0FBQ0osZUFBTyxnQ0FBbUIsTUFBTSxDQUFDLENBQUE7T0FDbEM7S0FDRjs7R0FFRixDQUFDLENBQUE7OztBQUdGLFFBQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLFVBQVMsR0FBRyxFQUFFO0FBQy9CLFFBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFBO0dBQ3hCLENBQUMsQ0FBQTs7QUFFRixRQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxVQUFTLEdBQUcsRUFBRTtBQUMvQixRQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQTtHQUN4QixDQUFDLENBQUE7O0FBRUYsUUFBTSxDQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUUsVUFBUyxHQUFHLEVBQUUsR0FBRyxFQUFFO0FBQzFDLFFBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQTtHQUNuQyxDQUFDLENBQUE7O0FBRUYsUUFBTSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFTLFFBQVEsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFO0FBQzNELFFBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQTtHQUNwRCxDQUFDLENBQUE7O0FBRUYsUUFBTSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUE7O0FBRTFCLFNBQU8sSUFBSSxDQUFBO0NBQ1oiLCJmaWxlIjoibWFrZS1rbmV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQgeyBFdmVudEVtaXR0ZXIgfSBmcm9tICdldmVudHMnO1xuXG5pbXBvcnQgTWlncmF0b3IgZnJvbSAnLi4vbWlncmF0ZSc7XG5pbXBvcnQgU2VlZGVyIGZyb20gJy4uL3NlZWQnO1xuaW1wb3J0IEZ1bmN0aW9uSGVscGVyIGZyb20gJy4uL2Z1bmN0aW9uaGVscGVyJztcbmltcG9ydCBRdWVyeUludGVyZmFjZSBmcm9tICcuLi9xdWVyeS9tZXRob2RzJztcbmltcG9ydCAqIGFzIGhlbHBlcnMgZnJvbSAnLi4vaGVscGVycyc7XG5pbXBvcnQgeyBhc3NpZ24gfSBmcm9tICdsb2Rhc2gnXG5pbXBvcnQgQmF0Y2hJbnNlcnQgZnJvbSAnLi9iYXRjaEluc2VydCc7XG5pbXBvcnQgS25leCBmcm9tIFwiLi4vaW5kZXhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gbWFrZUtuZXgoY2xpZW50KSB7XG5cbiAgLy8gVGhlIG9iamVjdCB3ZSdyZSBwb3RlbnRpYWxseSB1c2luZyB0byBraWNrIG9mZiBhbiBpbml0aWFsIGNoYWluLlxuICBmdW5jdGlvbiBrbmV4KHRhYmxlTmFtZSkge1xuICAgIGNvbnN0IHFiID0ga25leC5xdWVyeUJ1aWxkZXIoKVxuICAgIGlmICghdGFibGVOYW1lKSBoZWxwZXJzLndhcm4oXG4gICAgICAnY2FsbGluZyBrbmV4IHdpdGhvdXQgYSB0YWJsZU5hbWUgaXMgZGVwcmVjYXRlZC4gVXNlIGtuZXgucXVlcnlCdWlsZGVyKCkgaW5zdGVhZC4nXG4gICAgKTtcbiAgICByZXR1cm4gdGFibGVOYW1lID8gcWIudGFibGUodGFibGVOYW1lKSA6IHFiXG4gIH1cblxuICBhc3NpZ24oa25leCwge1xuXG4gICAgUHJvbWlzZTogcmVxdWlyZSgnLi4vcHJvbWlzZScpLFxuXG4gICAgLy8gQSBuZXcgcXVlcnkgYnVpbGRlciBpbnN0YW5jZS5cbiAgICBxdWVyeUJ1aWxkZXIoKSB7XG4gICAgICByZXR1cm4gY2xpZW50LnF1ZXJ5QnVpbGRlcigpXG4gICAgfSxcblxuICAgIHJhdygpIHtcbiAgICAgIHJldHVybiBjbGllbnQucmF3LmFwcGx5KGNsaWVudCwgYXJndW1lbnRzKVxuICAgIH0sXG5cbiAgICBiYXRjaEluc2VydCh0YWJsZSwgYmF0Y2gsIGNodW5rU2l6ZSA9IDEwMDApIHtcbiAgICAgIHJldHVybiBuZXcgQmF0Y2hJbnNlcnQodGhpcywgdGFibGUsIGJhdGNoLCBjaHVua1NpemUpO1xuICAgIH0sXG5cbiAgICAvLyBSdW5zIGEgbmV3IHRyYW5zYWN0aW9uLCB0YWtpbmcgYSBjb250YWluZXIgYW5kIHJldHVybmluZyBhIHByb21pc2VcbiAgICAvLyBmb3Igd2hlbiB0aGUgdHJhbnNhY3Rpb24gaXMgcmVzb2x2ZWQuXG4gICAgdHJhbnNhY3Rpb24oY29udGFpbmVyLCBjb25maWcpIHtcbiAgICAgIHJldHVybiBjbGllbnQudHJhbnNhY3Rpb24oY29udGFpbmVyLCBjb25maWcpXG4gICAgfSxcblxuICAgIC8vIFR5cGljYWxseSBuZXZlciBuZWVkZWQsIGluaXRpYWxpemVzIHRoZSBwb29sIGZvciBhIGtuZXggY2xpZW50LlxuICAgIGluaXRpYWxpemUoY29uZmlnKSB7XG4gICAgICByZXR1cm4gY2xpZW50LmluaXRpYWxpemUoY29uZmlnKVxuICAgIH0sXG5cbiAgICAvLyBDb252ZW5pZW5jZSBtZXRob2QgZm9yIHRlYXJpbmcgZG93biB0aGUgcG9vbC5cbiAgICBkZXN0cm95KGNhbGxiYWNrKSB7XG4gICAgICByZXR1cm4gY2xpZW50LmRlc3Ryb3koY2FsbGJhY2spXG4gICAgfVxuXG4gIH0pXG5cbiAgLy8gVGhlIGBfX2tuZXhfX2AgaXMgdXNlZCBpZiB5b3UgbmVlZCB0byBkdWNrLXR5cGUgY2hlY2sgd2hldGhlciB0aGlzXG4gIC8vIGlzIGEga25leCBidWlsZGVyLCB3aXRob3V0IGEgZnVsbCBvbiBgaW5zdGFuY2VvZmAgY2hlY2suXG4gIGtuZXguVkVSU0lPTiA9IGtuZXguX19rbmV4X18gPSBLbmV4LlZFUlNJT047XG5cbiAgLy8gSG9vayB1cCB0aGUgXCJrbmV4XCIgb2JqZWN0IGFzIGFuIEV2ZW50RW1pdHRlci5cbiAgY29uc3QgZWUgPSBuZXcgRXZlbnRFbWl0dGVyKClcbiAgZm9yIChjb25zdCBrZXkgaW4gZWUpIHtcbiAgICBrbmV4W2tleV0gPSBlZVtrZXldXG4gIH1cblxuICAvLyBBbGxvdyBjaGFpbmluZyBtZXRob2RzIGZyb20gdGhlIHJvb3Qgb2JqZWN0LCBiZWZvcmVcbiAgLy8gYW55IG90aGVyIGluZm9ybWF0aW9uIGlzIHNwZWNpZmllZC5cbiAgUXVlcnlJbnRlcmZhY2UuZm9yRWFjaChmdW5jdGlvbihtZXRob2QpIHtcbiAgICBrbmV4W21ldGhvZF0gPSBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0IGJ1aWxkZXIgPSBrbmV4LnF1ZXJ5QnVpbGRlcigpXG4gICAgICByZXR1cm4gYnVpbGRlclttZXRob2RdLmFwcGx5KGJ1aWxkZXIsIGFyZ3VtZW50cylcbiAgICB9XG4gIH0pXG5cbiAga25leC5jbGllbnQgPSBjbGllbnRcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhrbmV4LCB7XG5cbiAgICBzY2hlbWE6IHtcbiAgICAgIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIGNsaWVudC5zY2hlbWFCdWlsZGVyKClcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgbWlncmF0ZToge1xuICAgICAgZ2V0KCkge1xuICAgICAgICByZXR1cm4gbmV3IE1pZ3JhdG9yKGtuZXgpXG4gICAgICB9XG4gICAgfSxcblxuICAgIHNlZWQ6IHtcbiAgICAgIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTZWVkZXIoa25leClcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgZm46IHtcbiAgICAgIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGdW5jdGlvbkhlbHBlcihjbGllbnQpXG4gICAgICB9XG4gICAgfVxuXG4gIH0pXG5cbiAgLy8gUGFzc3Rocm91Z2ggYWxsIFwic3RhcnRcIiBhbmQgXCJxdWVyeVwiIGV2ZW50cyB0byB0aGUga25leCBvYmplY3QuXG4gIGNsaWVudC5vbignc3RhcnQnLCBmdW5jdGlvbihvYmopIHtcbiAgICBrbmV4LmVtaXQoJ3N0YXJ0Jywgb2JqKVxuICB9KVxuXG4gIGNsaWVudC5vbigncXVlcnknLCBmdW5jdGlvbihvYmopIHtcbiAgICBrbmV4LmVtaXQoJ3F1ZXJ5Jywgb2JqKVxuICB9KVxuXG4gIGNsaWVudC5vbigncXVlcnktZXJyb3InLCBmdW5jdGlvbihlcnIsIG9iaikge1xuICAgIGtuZXguZW1pdCgncXVlcnktZXJyb3InLCBlcnIsIG9iailcbiAgfSlcblxuICBjbGllbnQub24oJ3F1ZXJ5LXJlc3BvbnNlJywgZnVuY3Rpb24ocmVzcG9uc2UsIG9iaiwgYnVpbGRlcikge1xuICAgIGtuZXguZW1pdCgncXVlcnktcmVzcG9uc2UnLCByZXNwb25zZSwgb2JqLCBidWlsZGVyKVxuICB9KVxuXG4gIGNsaWVudC5tYWtlS25leCA9IG1ha2VLbmV4XG5cbiAgcmV0dXJuIGtuZXhcbn1cbiJdfQ==