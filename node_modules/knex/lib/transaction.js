
// Transaction
// -------
'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _promise = require('./promise');

var _promise2 = _interopRequireDefault(_promise);

var _events = require('events');

var _inherits = require('inherits');

var _inherits2 = _interopRequireDefault(_inherits);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _utilMakeKnex = require('./util/make-knex');

var _utilMakeKnex2 = _interopRequireDefault(_utilMakeKnex);

var _utilNoop = require('./util/noop');

var _utilNoop2 = _interopRequireDefault(_utilNoop);

var _lodash = require('lodash');

// Acts as a facade for a Promise, keeping the internal state
// and managing any child transactions.

var debug = _debug2['default']('knex:tx');

function Transaction(client, container, config, outerTx) {
  var _this = this;

  var txid = this.txid = _lodash.uniqueId('trx');

  this.client = client;
  this.outerTx = outerTx;
  this.trxClient = undefined;
  this._debug = client.config && client.config.debug;

  debug('%s: Starting %s transaction', txid, outerTx ? 'nested' : 'top level');

  this._promise = _promise2['default'].using(this.acquireConnection(client, config, txid), function (connection) {

    var trxClient = _this.trxClient = makeTxClient(_this, client, connection);
    var init = client.transacting ? _this.savepoint(connection) : _this.begin(connection);

    init.then(function () {
      return makeTransactor(_this, connection, trxClient);
    }).then(function (transactor) {
      // If we've returned a "thenable" from the transaction container, assume
      // the rollback and commit are chained to this object's success / failure.
      // Directly thrown errors are treated as automatic rollbacks.
      var result = undefined;
      try {
        result = container(transactor);
      } catch (err) {
        result = _promise2['default'].reject(err);
      }
      if (result && result.then && typeof result.then === 'function') {
        result.then(function (val) {
          transactor.commit(val);
        })['catch'](function (err) {
          transactor.rollback(err);
        });
      }
    })['catch'](function (e) {
      return _this._rejecter(e);
    });

    return new _promise2['default'](function (resolver, rejecter) {
      _this._resolver = resolver;
      _this._rejecter = rejecter;
    });
  });

  this._completed = false;

  // If there's a wrapping transaction, we need to wait for any older sibling
  // transactions to settle (commit or rollback) before we can start, and we
  // need to register ourselves with the parent transaction so any younger
  // siblings can wait for us to complete before they can start.
  this._previousSibling = _promise2['default'].resolve(true);
  if (outerTx) {
    if (outerTx._lastChild) this._previousSibling = outerTx._lastChild;
    outerTx._lastChild = this._promise;
  }
}
_inherits2['default'](Transaction, _events.EventEmitter);

_lodash.assign(Transaction.prototype, {

  isCompleted: function isCompleted() {
    return this._completed || this.outerTx && this.outerTx.isCompleted() || false;
  },

  begin: function begin(conn) {
    return this.query(conn, 'BEGIN;');
  },

  savepoint: function savepoint(conn) {
    return this.query(conn, 'SAVEPOINT ' + this.txid + ';');
  },

  commit: function commit(conn, value) {
    return this.query(conn, 'COMMIT;', 1, value);
  },

  release: function release(conn, value) {
    return this.query(conn, 'RELEASE SAVEPOINT ' + this.txid + ';', 1, value);
  },

  rollback: function rollback(conn, error) {
    var _this2 = this;

    return this.query(conn, 'ROLLBACK;', 2, error).timeout(5000)['catch'](_promise2['default'].TimeoutError, function () {
      _this2._resolver();
    });
  },

  rollbackTo: function rollbackTo(conn, error) {
    var _this3 = this;

    return this.query(conn, 'ROLLBACK TO SAVEPOINT ' + this.txid, 2, error).timeout(5000)['catch'](_promise2['default'].TimeoutError, function () {
      _this3._resolver();
    });
  },

  query: function query(conn, sql, status, value) {
    var _this4 = this;

    var q = this.trxClient.query(conn, sql)['catch'](function (err) {
      status = 2;
      value = err;
      _this4._completed = true;
      debug('%s error running transaction query', _this4.txid);
    }).tap(function () {
      if (status === 1) _this4._resolver(value);
      if (status === 2) _this4._rejecter(value);
    });
    if (status === 1 || status === 2) {
      this._completed = true;
    }
    return q;
  },

  debug: function debug(enabled) {
    this._debug = arguments.length ? enabled : true;
    return this;
  },

  // Acquire a connection and create a disposer - either using the one passed
  // via config or getting one off the client. The disposer will be called once
  // the original promise is marked completed.
  acquireConnection: function acquireConnection(client, config, txid) {
    var configConnection = config && config.connection;
    return _promise2['default']['try'](function () {
      return configConnection || client.acquireConnection().completed;
    }).disposer(function (connection) {
      if (!configConnection) {
        debug('%s: releasing connection', txid);
        client.releaseConnection(connection);
      } else {
        debug('%s: not releasing external connection', txid);
      }
    });
  }

});

// The transactor is a full featured knex object, with a "commit", a "rollback"
// and a "savepoint" function. The "savepoint" is just sugar for creating a new
// transaction. If the rollback is run inside a savepoint, it rolls back to the
// last savepoint - otherwise it rolls back the transaction.
function makeTransactor(trx, connection, trxClient) {

  var transactor = _utilMakeKnex2['default'](trxClient);

  transactor.transaction = function (container, options) {
    return new trxClient.Transaction(trxClient, container, options, trx);
  };

  transactor.savepoint = function (container, options) {
    return transactor.transaction(container, options);
  };

  if (trx.client.transacting) {
    transactor.commit = function (value) {
      return trx.release(connection, value);
    };
    transactor.rollback = function (error) {
      return trx.rollbackTo(connection, error);
    };
  } else {
    transactor.commit = function (value) {
      return trx.commit(connection, value);
    };
    transactor.rollback = function (error) {
      return trx.rollback(connection, error);
    };
  }

  return transactor;
}

// We need to make a client object which always acquires the same
// connection and does not release back into the pool.
function makeTxClient(trx, client, connection) {

  var trxClient = Object.create(client.constructor.prototype);
  trxClient.config = client.config;
  trxClient.driver = client.driver;
  trxClient.connectionSettings = client.connectionSettings;
  trxClient.transacting = true;
  trxClient.valueForUndefined = client.valueForUndefined;

  trxClient.on('query', function (arg) {
    trx.emit('query', arg);
    client.emit('query', arg);
  });

  trxClient.on('query-error', function (err, obj) {
    trx.emit('query-error', err, obj);
    client.emit('query-error', err, obj);
  });

  trxClient.on('query-response', function (response, obj, builder) {
    trx.emit('query-response', response, obj, builder);
    client.emit('query-response', response, obj, builder);
  });

  var _query = trxClient.query;
  trxClient.query = function (conn, obj) {
    var completed = trx.isCompleted();
    return _promise2['default']['try'](function () {
      if (conn !== connection) throw new Error('Invalid connection for transaction query.');
      if (completed) completedError(trx, obj);
      return _query.call(trxClient, conn, obj);
    });
  };
  var _stream = trxClient.stream;
  trxClient.stream = function (conn, obj, stream, options) {
    var completed = trx.isCompleted();
    return _promise2['default']['try'](function () {
      if (conn !== connection) throw new Error('Invalid connection for transaction query.');
      if (completed) completedError(trx, obj);
      return _stream.call(trxClient, conn, obj, stream, options);
    });
  };
  trxClient.acquireConnection = function () {
    return {
      completed: trx._previousSibling.reflect().then(function () {
        return connection;
      }),
      abort: _utilNoop2['default']
    };
  };
  trxClient.releaseConnection = function () {
    return _promise2['default'].resolve();
  };

  return trxClient;
}

function completedError(trx, obj) {
  var sql = typeof obj === 'string' ? obj : obj && obj.sql;
  debug('%s: Transaction completed: %s', trx.id, sql);
  throw new Error('Transaction query already complete, run with DEBUG=knex:tx for more info');
}

var promiseInterface = ['then', 'bind', 'catch', 'finally', 'asCallback', 'spread', 'map', 'reduce', 'tap', 'thenReturn', 'return', 'yield', 'ensure', 'exec', 'reflect'];

// Creates a method which "coerces" to a promise, by calling a
// "then" method on the current `Target`.
promiseInterface.forEach(function (method) {
  Transaction.prototype[method] = function () {
    return this._promise = this._promise[method].apply(this._promise, arguments);
  };
});

exports['default'] = Transaction;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;base64,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QU8sRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUNoRCxRQUFRLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUM5QyxRQUFRLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUMvQyxDQUFBOzs7O0FBSUQsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFVBQVMsTUFBTSxFQUFFO0FBQ3hDLGFBQVcsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsWUFBVztBQUN6QyxXQUFRLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztHQUMvRSxDQUFBO0NBQ0YsQ0FBQyxDQUFBOztxQkFFYSxXQUFXIiwiZmlsZSI6InRyYW5zYWN0aW9uLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vLyBUcmFuc2FjdGlvblxuLy8gLS0tLS0tLVxuaW1wb3J0IFByb21pc2UgZnJvbSAnLi9wcm9taXNlJztcbmltcG9ydCB7IEV2ZW50RW1pdHRlciB9IGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQgaW5oZXJpdHMgZnJvbSAnaW5oZXJpdHMnO1xuaW1wb3J0IERlYnVnIGZyb20gJ2RlYnVnJ1xuXG5pbXBvcnQgbWFrZUtuZXggZnJvbSAnLi91dGlsL21ha2Uta25leCc7XG5pbXBvcnQgbm9vcCBmcm9tICcuL3V0aWwvbm9vcCc7XG5cbmNvbnN0IGRlYnVnID0gRGVidWcoJ2tuZXg6dHgnKTtcblxuaW1wb3J0IHsgYXNzaWduLCB1bmlxdWVJZCB9IGZyb20gJ2xvZGFzaCc7XG5cbi8vIEFjdHMgYXMgYSBmYWNhZGUgZm9yIGEgUHJvbWlzZSwga2VlcGluZyB0aGUgaW50ZXJuYWwgc3RhdGVcbi8vIGFuZCBtYW5hZ2luZyBhbnkgY2hpbGQgdHJhbnNhY3Rpb25zLlxuZnVuY3Rpb24gVHJhbnNhY3Rpb24oY2xpZW50LCBjb250YWluZXIsIGNvbmZpZywgb3V0ZXJUeCkge1xuXG4gIGNvbnN0IHR4aWQgPSB0aGlzLnR4aWQgPSB1bmlxdWVJZCgndHJ4JylcblxuICB0aGlzLmNsaWVudCAgICA9IGNsaWVudFxuICB0aGlzLm91dGVyVHggICA9IG91dGVyVHhcbiAgdGhpcy50cnhDbGllbnQgPSB1bmRlZmluZWQ7XG4gIHRoaXMuX2RlYnVnICAgID0gY2xpZW50LmNvbmZpZyAmJiBjbGllbnQuY29uZmlnLmRlYnVnXG5cbiAgZGVidWcoJyVzOiBTdGFydGluZyAlcyB0cmFuc2FjdGlvbicsIHR4aWQsIG91dGVyVHggPyAnbmVzdGVkJyA6ICd0b3AgbGV2ZWwnKVxuXG4gIHRoaXMuX3Byb21pc2UgPSBQcm9taXNlLnVzaW5nKHRoaXMuYWNxdWlyZUNvbm5lY3Rpb24oY2xpZW50LCBjb25maWcsIHR4aWQpLCAoY29ubmVjdGlvbikgPT4ge1xuXG4gICAgY29uc3QgdHJ4Q2xpZW50ID0gdGhpcy50cnhDbGllbnQgPSBtYWtlVHhDbGllbnQodGhpcywgY2xpZW50LCBjb25uZWN0aW9uKVxuICAgIGNvbnN0IGluaXQgPSBjbGllbnQudHJhbnNhY3RpbmcgPyB0aGlzLnNhdmVwb2ludChjb25uZWN0aW9uKSA6IHRoaXMuYmVnaW4oY29ubmVjdGlvbilcblxuICAgIGluaXQudGhlbigoKSA9PiB7XG4gICAgICByZXR1cm4gbWFrZVRyYW5zYWN0b3IodGhpcywgY29ubmVjdGlvbiwgdHJ4Q2xpZW50KVxuICAgIH0pXG4gICAgLnRoZW4oKHRyYW5zYWN0b3IpID0+IHtcbiAgICAgIC8vIElmIHdlJ3ZlIHJldHVybmVkIGEgXCJ0aGVuYWJsZVwiIGZyb20gdGhlIHRyYW5zYWN0aW9uIGNvbnRhaW5lciwgYXNzdW1lXG4gICAgICAvLyB0aGUgcm9sbGJhY2sgYW5kIGNvbW1pdCBhcmUgY2hhaW5lZCB0byB0aGlzIG9iamVjdCdzIHN1Y2Nlc3MgLyBmYWlsdXJlLlxuICAgICAgLy8gRGlyZWN0bHkgdGhyb3duIGVycm9ycyBhcmUgdHJlYXRlZCBhcyBhdXRvbWF0aWMgcm9sbGJhY2tzLlxuICAgICAgbGV0IHJlc3VsdFxuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzdWx0ID0gY29udGFpbmVyKHRyYW5zYWN0b3IpXG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmVzdWx0ID0gUHJvbWlzZS5yZWplY3QoZXJyKVxuICAgICAgfVxuICAgICAgaWYgKHJlc3VsdCAmJiByZXN1bHQudGhlbiAmJiB0eXBlb2YgcmVzdWx0LnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmVzdWx0LnRoZW4oKHZhbCkgPT4ge1xuICAgICAgICAgIHRyYW5zYWN0b3IuY29tbWl0KHZhbClcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICB0cmFuc2FjdG9yLnJvbGxiYWNrKGVycilcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KVxuICAgIC5jYXRjaCgoZSkgPT4gdGhpcy5fcmVqZWN0ZXIoZSkpXG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmVyLCByZWplY3RlcikgPT4ge1xuICAgICAgdGhpcy5fcmVzb2x2ZXIgPSByZXNvbHZlclxuICAgICAgdGhpcy5fcmVqZWN0ZXIgPSByZWplY3RlclxuICAgIH0pXG4gIH0pXG5cbiAgdGhpcy5fY29tcGxldGVkICA9IGZhbHNlXG5cbiAgLy8gSWYgdGhlcmUncyBhIHdyYXBwaW5nIHRyYW5zYWN0aW9uLCB3ZSBuZWVkIHRvIHdhaXQgZm9yIGFueSBvbGRlciBzaWJsaW5nXG4gIC8vIHRyYW5zYWN0aW9ucyB0byBzZXR0bGUgKGNvbW1pdCBvciByb2xsYmFjaykgYmVmb3JlIHdlIGNhbiBzdGFydCwgYW5kIHdlXG4gIC8vIG5lZWQgdG8gcmVnaXN0ZXIgb3Vyc2VsdmVzIHdpdGggdGhlIHBhcmVudCB0cmFuc2FjdGlvbiBzbyBhbnkgeW91bmdlclxuICAvLyBzaWJsaW5ncyBjYW4gd2FpdCBmb3IgdXMgdG8gY29tcGxldGUgYmVmb3JlIHRoZXkgY2FuIHN0YXJ0LlxuICB0aGlzLl9wcmV2aW91c1NpYmxpbmcgPSBQcm9taXNlLnJlc29sdmUodHJ1ZSk7XG4gIGlmIChvdXRlclR4KSB7XG4gICAgaWYgKG91dGVyVHguX2xhc3RDaGlsZCkgdGhpcy5fcHJldmlvdXNTaWJsaW5nID0gb3V0ZXJUeC5fbGFzdENoaWxkO1xuICAgIG91dGVyVHguX2xhc3RDaGlsZCA9IHRoaXMuX3Byb21pc2U7XG4gIH1cbn1cbmluaGVyaXRzKFRyYW5zYWN0aW9uLCBFdmVudEVtaXR0ZXIpXG5cbmFzc2lnbihUcmFuc2FjdGlvbi5wcm90b3R5cGUsIHtcblxuICBpc0NvbXBsZXRlZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fY29tcGxldGVkIHx8IHRoaXMub3V0ZXJUeCAmJiB0aGlzLm91dGVyVHguaXNDb21wbGV0ZWQoKSB8fCBmYWxzZVxuICB9LFxuXG4gIGJlZ2luKGNvbm4pIHtcbiAgICByZXR1cm4gdGhpcy5xdWVyeShjb25uLCAnQkVHSU47JylcbiAgfSxcblxuICBzYXZlcG9pbnQoY29ubikge1xuICAgIHJldHVybiB0aGlzLnF1ZXJ5KGNvbm4sIGBTQVZFUE9JTlQgJHt0aGlzLnR4aWR9O2ApXG4gIH0sXG5cbiAgY29tbWl0KGNvbm4sIHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMucXVlcnkoY29ubiwgJ0NPTU1JVDsnLCAxLCB2YWx1ZSlcbiAgfSxcblxuICByZWxlYXNlKGNvbm4sIHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMucXVlcnkoY29ubiwgYFJFTEVBU0UgU0FWRVBPSU5UICR7dGhpcy50eGlkfTtgLCAxLCB2YWx1ZSlcbiAgfSxcblxuICByb2xsYmFjayhjb25uLCBlcnJvcikge1xuICAgIHJldHVybiB0aGlzLnF1ZXJ5KGNvbm4sICdST0xMQkFDSzsnLCAyLCBlcnJvcilcbiAgICAgIC50aW1lb3V0KDUwMDApXG4gICAgICAuY2F0Y2goUHJvbWlzZS5UaW1lb3V0RXJyb3IsICgpID0+IHtcbiAgICAgICAgdGhpcy5fcmVzb2x2ZXIoKTtcbiAgICAgIH0pO1xuICB9LFxuXG4gIHJvbGxiYWNrVG8oY29ubiwgZXJyb3IpIHtcbiAgICByZXR1cm4gdGhpcy5xdWVyeShjb25uLCBgUk9MTEJBQ0sgVE8gU0FWRVBPSU5UICR7dGhpcy50eGlkfWAsIDIsIGVycm9yKVxuICAgICAgLnRpbWVvdXQoNTAwMClcbiAgICAgIC5jYXRjaChQcm9taXNlLlRpbWVvdXRFcnJvciwgKCkgPT4ge1xuICAgICAgICB0aGlzLl9yZXNvbHZlcigpO1xuICAgICAgfSk7XG4gIH0sXG5cbiAgcXVlcnkoY29ubiwgc3FsLCBzdGF0dXMsIHZhbHVlKSB7XG4gICAgY29uc3QgcSA9IHRoaXMudHJ4Q2xpZW50LnF1ZXJ5KGNvbm4sIHNxbClcbiAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIHN0YXR1cyA9IDJcbiAgICAgICAgdmFsdWUgID0gZXJyXG4gICAgICAgIHRoaXMuX2NvbXBsZXRlZCA9IHRydWVcbiAgICAgICAgZGVidWcoJyVzIGVycm9yIHJ1bm5pbmcgdHJhbnNhY3Rpb24gcXVlcnknLCB0aGlzLnR4aWQpXG4gICAgICB9KVxuICAgICAgLnRhcCgoKSA9PiB7XG4gICAgICAgIGlmIChzdGF0dXMgPT09IDEpIHRoaXMuX3Jlc29sdmVyKHZhbHVlKVxuICAgICAgICBpZiAoc3RhdHVzID09PSAyKSB0aGlzLl9yZWplY3Rlcih2YWx1ZSlcbiAgICAgIH0pXG4gICAgaWYgKHN0YXR1cyA9PT0gMSB8fCBzdGF0dXMgPT09IDIpIHtcbiAgICAgIHRoaXMuX2NvbXBsZXRlZCA9IHRydWVcbiAgICB9XG4gICAgcmV0dXJuIHE7XG4gIH0sXG5cbiAgZGVidWcoZW5hYmxlZCkge1xuICAgIHRoaXMuX2RlYnVnID0gYXJndW1lbnRzLmxlbmd0aCA/IGVuYWJsZWQgOiB0cnVlO1xuICAgIHJldHVybiB0aGlzXG4gIH0sXG5cbiAgLy8gQWNxdWlyZSBhIGNvbm5lY3Rpb24gYW5kIGNyZWF0ZSBhIGRpc3Bvc2VyIC0gZWl0aGVyIHVzaW5nIHRoZSBvbmUgcGFzc2VkXG4gIC8vIHZpYSBjb25maWcgb3IgZ2V0dGluZyBvbmUgb2ZmIHRoZSBjbGllbnQuIFRoZSBkaXNwb3NlciB3aWxsIGJlIGNhbGxlZCBvbmNlXG4gIC8vIHRoZSBvcmlnaW5hbCBwcm9taXNlIGlzIG1hcmtlZCBjb21wbGV0ZWQuXG4gIGFjcXVpcmVDb25uZWN0aW9uKGNsaWVudCwgY29uZmlnLCB0eGlkKSB7XG4gICAgY29uc3QgY29uZmlnQ29ubmVjdGlvbiA9IGNvbmZpZyAmJiBjb25maWcuY29ubmVjdGlvblxuICAgIHJldHVybiBQcm9taXNlLnRyeSgoKSA9PiBjb25maWdDb25uZWN0aW9uIHx8IGNsaWVudC5hY3F1aXJlQ29ubmVjdGlvbigpLmNvbXBsZXRlZClcbiAgICAuZGlzcG9zZXIoZnVuY3Rpb24oY29ubmVjdGlvbikge1xuICAgICAgaWYgKCFjb25maWdDb25uZWN0aW9uKSB7XG4gICAgICAgIGRlYnVnKCclczogcmVsZWFzaW5nIGNvbm5lY3Rpb24nLCB0eGlkKVxuICAgICAgICBjbGllbnQucmVsZWFzZUNvbm5lY3Rpb24oY29ubmVjdGlvbilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlYnVnKCclczogbm90IHJlbGVhc2luZyBleHRlcm5hbCBjb25uZWN0aW9uJywgdHhpZClcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbn0pXG5cbi8vIFRoZSB0cmFuc2FjdG9yIGlzIGEgZnVsbCBmZWF0dXJlZCBrbmV4IG9iamVjdCwgd2l0aCBhIFwiY29tbWl0XCIsIGEgXCJyb2xsYmFja1wiXG4vLyBhbmQgYSBcInNhdmVwb2ludFwiIGZ1bmN0aW9uLiBUaGUgXCJzYXZlcG9pbnRcIiBpcyBqdXN0IHN1Z2FyIGZvciBjcmVhdGluZyBhIG5ld1xuLy8gdHJhbnNhY3Rpb24uIElmIHRoZSByb2xsYmFjayBpcyBydW4gaW5zaWRlIGEgc2F2ZXBvaW50LCBpdCByb2xscyBiYWNrIHRvIHRoZVxuLy8gbGFzdCBzYXZlcG9pbnQgLSBvdGhlcndpc2UgaXQgcm9sbHMgYmFjayB0aGUgdHJhbnNhY3Rpb24uXG5mdW5jdGlvbiBtYWtlVHJhbnNhY3Rvcih0cngsIGNvbm5lY3Rpb24sIHRyeENsaWVudCkge1xuXG4gIGNvbnN0IHRyYW5zYWN0b3IgPSBtYWtlS25leCh0cnhDbGllbnQpO1xuXG4gIHRyYW5zYWN0b3IudHJhbnNhY3Rpb24gPSAoY29udGFpbmVyLCBvcHRpb25zKSA9PlxuICAgIG5ldyB0cnhDbGllbnQuVHJhbnNhY3Rpb24odHJ4Q2xpZW50LCBjb250YWluZXIsIG9wdGlvbnMsIHRyeCk7XG5cbiAgdHJhbnNhY3Rvci5zYXZlcG9pbnQgPSAoY29udGFpbmVyLCBvcHRpb25zKSA9PlxuICAgIHRyYW5zYWN0b3IudHJhbnNhY3Rpb24oY29udGFpbmVyLCBvcHRpb25zKTtcblxuICBpZiAodHJ4LmNsaWVudC50cmFuc2FjdGluZykge1xuICAgIHRyYW5zYWN0b3IuY29tbWl0ID0gdmFsdWUgPT4gdHJ4LnJlbGVhc2UoY29ubmVjdGlvbiwgdmFsdWUpXG4gICAgdHJhbnNhY3Rvci5yb2xsYmFjayA9IGVycm9yID0+IHRyeC5yb2xsYmFja1RvKGNvbm5lY3Rpb24sIGVycm9yKVxuICB9IGVsc2Uge1xuICAgIHRyYW5zYWN0b3IuY29tbWl0ID0gdmFsdWUgPT4gdHJ4LmNvbW1pdChjb25uZWN0aW9uLCB2YWx1ZSlcbiAgICB0cmFuc2FjdG9yLnJvbGxiYWNrID0gZXJyb3IgPT4gdHJ4LnJvbGxiYWNrKGNvbm5lY3Rpb24sIGVycm9yKVxuICB9XG5cbiAgcmV0dXJuIHRyYW5zYWN0b3Jcbn1cblxuXG4vLyBXZSBuZWVkIHRvIG1ha2UgYSBjbGllbnQgb2JqZWN0IHdoaWNoIGFsd2F5cyBhY3F1aXJlcyB0aGUgc2FtZVxuLy8gY29ubmVjdGlvbiBhbmQgZG9lcyBub3QgcmVsZWFzZSBiYWNrIGludG8gdGhlIHBvb2wuXG5mdW5jdGlvbiBtYWtlVHhDbGllbnQodHJ4LCBjbGllbnQsIGNvbm5lY3Rpb24pIHtcblxuICBjb25zdCB0cnhDbGllbnQgPSBPYmplY3QuY3JlYXRlKGNsaWVudC5jb25zdHJ1Y3Rvci5wcm90b3R5cGUpXG4gIHRyeENsaWVudC5jb25maWcgICAgICAgICAgICAgPSBjbGllbnQuY29uZmlnXG4gIHRyeENsaWVudC5kcml2ZXIgICAgICAgICAgICAgPSBjbGllbnQuZHJpdmVyXG4gIHRyeENsaWVudC5jb25uZWN0aW9uU2V0dGluZ3MgPSBjbGllbnQuY29ubmVjdGlvblNldHRpbmdzXG4gIHRyeENsaWVudC50cmFuc2FjdGluZyAgICAgICAgPSB0cnVlXG4gIHRyeENsaWVudC52YWx1ZUZvclVuZGVmaW5lZCAgPSBjbGllbnQudmFsdWVGb3JVbmRlZmluZWRcblxuICB0cnhDbGllbnQub24oJ3F1ZXJ5JywgZnVuY3Rpb24oYXJnKSB7XG4gICAgdHJ4LmVtaXQoJ3F1ZXJ5JywgYXJnKVxuICAgIGNsaWVudC5lbWl0KCdxdWVyeScsIGFyZylcbiAgfSlcblxuICB0cnhDbGllbnQub24oJ3F1ZXJ5LWVycm9yJywgZnVuY3Rpb24oZXJyLCBvYmopIHtcbiAgICB0cnguZW1pdCgncXVlcnktZXJyb3InLCBlcnIsIG9iailcbiAgICBjbGllbnQuZW1pdCgncXVlcnktZXJyb3InLCBlcnIsIG9iailcbiAgfSlcblxuICB0cnhDbGllbnQub24oJ3F1ZXJ5LXJlc3BvbnNlJywgZnVuY3Rpb24ocmVzcG9uc2UsIG9iaiwgYnVpbGRlcikge1xuICAgIHRyeC5lbWl0KCdxdWVyeS1yZXNwb25zZScsIHJlc3BvbnNlLCBvYmosIGJ1aWxkZXIpXG4gICAgY2xpZW50LmVtaXQoJ3F1ZXJ5LXJlc3BvbnNlJywgcmVzcG9uc2UsIG9iaiwgYnVpbGRlcilcbiAgfSlcblxuICBjb25zdCBfcXVlcnkgPSB0cnhDbGllbnQucXVlcnk7XG4gIHRyeENsaWVudC5xdWVyeSAgPSBmdW5jdGlvbihjb25uLCBvYmopIHtcbiAgICBjb25zdCBjb21wbGV0ZWQgPSB0cnguaXNDb21wbGV0ZWQoKVxuICAgIHJldHVybiBQcm9taXNlLnRyeShmdW5jdGlvbigpIHtcbiAgICAgIGlmIChjb25uICE9PSBjb25uZWN0aW9uKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29ubmVjdGlvbiBmb3IgdHJhbnNhY3Rpb24gcXVlcnkuJylcbiAgICAgIGlmIChjb21wbGV0ZWQpIGNvbXBsZXRlZEVycm9yKHRyeCwgb2JqKVxuICAgICAgcmV0dXJuIF9xdWVyeS5jYWxsKHRyeENsaWVudCwgY29ubiwgb2JqKVxuICAgIH0pXG4gIH1cbiAgY29uc3QgX3N0cmVhbSA9IHRyeENsaWVudC5zdHJlYW1cbiAgdHJ4Q2xpZW50LnN0cmVhbSA9IGZ1bmN0aW9uKGNvbm4sIG9iaiwgc3RyZWFtLCBvcHRpb25zKSB7XG4gICAgY29uc3QgY29tcGxldGVkID0gdHJ4LmlzQ29tcGxldGVkKClcbiAgICByZXR1cm4gUHJvbWlzZS50cnkoZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoY29ubiAhPT0gY29ubmVjdGlvbikgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvbm5lY3Rpb24gZm9yIHRyYW5zYWN0aW9uIHF1ZXJ5LicpXG4gICAgICBpZiAoY29tcGxldGVkKSBjb21wbGV0ZWRFcnJvcih0cngsIG9iailcbiAgICAgIHJldHVybiBfc3RyZWFtLmNhbGwodHJ4Q2xpZW50LCBjb25uLCBvYmosIHN0cmVhbSwgb3B0aW9ucylcbiAgICB9KVxuICB9XG4gIHRyeENsaWVudC5hY3F1aXJlQ29ubmVjdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgY29tcGxldGVkOiB0cnguX3ByZXZpb3VzU2libGluZy5yZWZsZWN0KCkudGhlbigoKSA9PiBjb25uZWN0aW9uKSxcbiAgICAgIGFib3J0OiBub29wXG4gICAgfVxuICB9XG4gIHRyeENsaWVudC5yZWxlYXNlQ29ubmVjdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICB9XG5cbiAgcmV0dXJuIHRyeENsaWVudFxufVxuXG5mdW5jdGlvbiBjb21wbGV0ZWRFcnJvcih0cngsIG9iaikge1xuICBjb25zdCBzcWwgPSB0eXBlb2Ygb2JqID09PSAnc3RyaW5nJyA/IG9iaiA6IG9iaiAmJiBvYmouc3FsXG4gIGRlYnVnKCclczogVHJhbnNhY3Rpb24gY29tcGxldGVkOiAlcycsIHRyeC5pZCwgc3FsKVxuICB0aHJvdyBuZXcgRXJyb3IoJ1RyYW5zYWN0aW9uIHF1ZXJ5IGFscmVhZHkgY29tcGxldGUsIHJ1biB3aXRoIERFQlVHPWtuZXg6dHggZm9yIG1vcmUgaW5mbycpXG59XG5cbmNvbnN0IHByb21pc2VJbnRlcmZhY2UgPSBbXG4gICd0aGVuJywgJ2JpbmQnLCAnY2F0Y2gnLCAnZmluYWxseScsICdhc0NhbGxiYWNrJyxcbiAgJ3NwcmVhZCcsICdtYXAnLCAncmVkdWNlJywgJ3RhcCcsICd0aGVuUmV0dXJuJyxcbiAgJ3JldHVybicsICd5aWVsZCcsICdlbnN1cmUnLCAnZXhlYycsICdyZWZsZWN0J1xuXVxuXG4vLyBDcmVhdGVzIGEgbWV0aG9kIHdoaWNoIFwiY29lcmNlc1wiIHRvIGEgcHJvbWlzZSwgYnkgY2FsbGluZyBhXG4vLyBcInRoZW5cIiBtZXRob2Qgb24gdGhlIGN1cnJlbnQgYFRhcmdldGAuXG5wcm9taXNlSW50ZXJmYWNlLmZvckVhY2goZnVuY3Rpb24obWV0aG9kKSB7XG4gIFRyYW5zYWN0aW9uLnByb3RvdHlwZVttZXRob2RdID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICh0aGlzLl9wcm9taXNlID0gdGhpcy5fcHJvbWlzZVttZXRob2RdLmFwcGx5KHRoaXMuX3Byb21pc2UsIGFyZ3VtZW50cykpXG4gIH1cbn0pXG5cbmV4cG9ydCBkZWZhdWx0IFRyYW5zYWN0aW9uO1xuIl19