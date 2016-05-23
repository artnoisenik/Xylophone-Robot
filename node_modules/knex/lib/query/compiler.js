
// Query Compiler
// -------
'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _helpers = require('../helpers');

var helpers = _interopRequireWildcard(_helpers);

var _raw = require('../raw');

var _raw2 = _interopRequireDefault(_raw);

var _joinclause = require('./joinclause');

var _joinclause2 = _interopRequireDefault(_joinclause);

var _lodash = require('lodash');

// The "QueryCompiler" takes all of the query statements which
// have been gathered in the "QueryBuilder" and turns them into a
// properly formatted / bound query string.
function QueryCompiler(client, builder) {
  this.client = client;
  this.method = builder._method || 'select';
  this.options = builder._options;
  this.single = builder._single;
  this.timeout = builder._timeout || false;
  this.grouped = _lodash.groupBy(builder._statements, 'grouping');
  this.formatter = client.formatter();
}

var components = ['columns', 'join', 'where', 'union', 'group', 'having', 'order', 'limit', 'offset', 'lock'];

_lodash.assign(QueryCompiler.prototype, {

  // Used when the insert call is empty.
  _emptyInsertValue: 'default values',

  // Collapse the builder into a single object
  toSQL: function toSQL(method, tz) {
    method = method || this.method;
    var val = this[method]();
    var defaults = {
      method: method,
      options: _lodash.reduce(this.options, _lodash.assign, {}),
      timeout: this.timeout,
      bindings: this.formatter.bindings
    };
    if (_lodash.isString(val)) {
      val = { sql: val };
    }
    if (method === 'select' && this.single.as) {
      defaults.as = this.single.as;
    }

    defaults.bindings = this.client.prepBindings(defaults.bindings || [], tz);

    return _lodash.assign(defaults, val);
  },

  // Compiles the `select` statement, or nested sub-selects by calling each of
  // the component compilers, trimming out the empties, and returning a
  // generated query string.
  select: function select() {
    var _this = this;

    var statements = components.map(function (component) {
      return _this[component](_this);
    });
    return _lodash.compact(statements).join(' ');
  },

  pluck: function pluck() {
    return {
      sql: this.select(),
      pluck: this.single.pluck
    };
  },

  // Compiles an "insert" query, allowing for multiple
  // inserts using a single query statement.
  insert: function insert() {
    var insertValues = this.single.insert || [];
    var sql = 'insert into ' + this.tableName + ' ';

    if (Array.isArray(insertValues)) {
      if (insertValues.length === 0) {
        return '';
      }
    } else if (typeof insertValues === 'object' && _lodash.isEmpty(insertValues)) {
      return sql + this._emptyInsertValue;
    }

    var insertData = this._prepInsert(insertValues);
    if (typeof insertData === 'string') {
      sql += insertData;
    } else {
      if (insertData.columns.length) {
        sql += '(' + this.formatter.columnize(insertData.columns);
        sql += ') values (';
        var i = -1;
        while (++i < insertData.values.length) {
          if (i !== 0) sql += '), (';
          sql += this.formatter.parameterize(insertData.values[i], this.client.valueForUndefined);
        }
        sql += ')';
      } else if (insertValues.length === 1 && insertValues[0]) {
        sql += this._emptyInsertValue;
      } else {
        sql = '';
      }
    }
    return sql;
  },

  // Compiles the "update" query.
  update: function update() {
    // Make sure tableName is processed by the formatter first.
    var tableName = this.tableName;

    var updateData = this._prepUpdate(this.single.update);
    var wheres = this.where();
    return 'update ' + tableName + ' set ' + updateData.join(', ') + (wheres ? ' ' + wheres : '');
  },

  // Compiles the columns in the query, specifying if an item was distinct.
  columns: function columns() {
    var distinct = false;
    if (this.onlyUnions()) return '';
    var columns = this.grouped.columns || [];
    var i = -1,
        sql = [];
    if (columns) {
      while (++i < columns.length) {
        var stmt = columns[i];
        if (stmt.distinct) distinct = true;
        if (stmt.type === 'aggregate') {
          sql.push(this.aggregate(stmt));
        } else if (stmt.value && stmt.value.length > 0) {
          sql.push(this.formatter.columnize(stmt.value));
        }
      }
    }
    if (sql.length === 0) sql = ['*'];
    return 'select ' + (distinct ? 'distinct ' : '') + sql.join(', ') + (this.tableName ? ' from ' + this.tableName : '');
  },

  aggregate: function aggregate(stmt) {
    var val = stmt.value;
    var splitOn = val.toLowerCase().indexOf(' as ');
    var distinct = stmt.aggregateDistinct ? 'distinct ' : '';
    // Allows us to speciy an alias for the aggregate types.
    if (splitOn !== -1) {
      var col = val.slice(0, splitOn);
      var alias = val.slice(splitOn + 4);
      return stmt.method + '(' + (distinct + this.formatter.wrap(col)) + ') ' + ('as ' + this.formatter.wrap(alias));
    }
    return stmt.method + '(' + (distinct + this.formatter.wrap(val)) + ')';
  },

  // Compiles all each of the `join` clauses on the query,
  // including any nested join queries.
  join: function join() {
    var sql = '';
    var i = -1;
    var joins = this.grouped.join;
    if (!joins) return '';
    while (++i < joins.length) {
      var join = joins[i];
      var table = join.schema ? join.schema + '.' + join.table : join.table;
      if (i > 0) sql += ' ';
      if (join.joinType === 'raw') {
        sql += this.formatter.unwrapRaw(join.table);
      } else {
        sql += join.joinType + ' join ' + this.formatter.wrap(table);
        var ii = -1;
        while (++ii < join.clauses.length) {
          var clause = join.clauses[ii];
          if (ii > 0) {
            sql += ' ' + clause.bool + ' ';
          } else {
            sql += ' ' + (clause.type === 'onUsing' ? 'using' : 'on') + ' ';
          }
          var val = this[clause.type].call(this, clause);
          if (val) {
            sql += val;
          }
        }
      }
    }
    return sql;
  },

  // Compiles all `where` statements on the query.
  where: function where() {
    var wheres = this.grouped.where;
    if (!wheres) return;
    var sql = [];
    var i = -1;
    while (++i < wheres.length) {
      var stmt = wheres[i];
      var val = this[stmt.type](stmt);
      if (val) {
        if (sql.length === 0) {
          sql[0] = 'where';
        } else {
          sql.push(stmt.bool);
        }
        sql.push(val);
      }
    }
    return sql.length > 1 ? sql.join(' ') : '';
  },

  group: function group() {
    return this._groupsOrders('group');
  },

  order: function order() {
    return this._groupsOrders('order');
  },

  // Compiles the `having` statements.
  having: function having() {
    var havings = this.grouped.having;
    if (!havings) return '';
    var sql = ['having'];
    for (var i = 0, l = havings.length; i < l; i++) {
      var str = '';
      var s = havings[i];
      if (i !== 0) str = s.bool + ' ';
      if (s.type === 'havingBasic') {
        sql.push(str + this.formatter.columnize(s.column) + ' ' + this.formatter.operator(s.operator) + ' ' + this.formatter.parameter(s.value));
      } else {
        if (s.type === 'whereWrapped') {
          var val = this.whereWrapped(s);
          if (val) sql.push(val);
        } else {
          sql.push(str + this.formatter.unwrapRaw(s.value));
        }
      }
    }
    return sql.length > 1 ? sql.join(' ') : '';
  },

  // Compile the "union" queries attached to the main query.
  union: function union() {
    var onlyUnions = this.onlyUnions();
    var unions = this.grouped.union;
    if (!unions) return '';
    var sql = '';
    for (var i = 0, l = unions.length; i < l; i++) {
      var union = unions[i];
      if (i > 0) sql += ' ';
      if (i > 0 || !onlyUnions) sql += union.clause + ' ';
      var statement = this.formatter.rawOrFn(union.value);
      if (statement) {
        if (union.wrap) sql += '(';
        sql += statement;
        if (union.wrap) sql += ')';
      }
    }
    return sql;
  },

  // If we haven't specified any columns or a `tableName`, we're assuming this
  // is only being used for unions.
  onlyUnions: function onlyUnions() {
    return !this.grouped.columns && this.grouped.union && !this.tableName;
  },

  limit: function limit() {
    var noLimit = !this.single.limit && this.single.limit !== 0;
    if (noLimit) return '';
    return 'limit ' + this.formatter.parameter(this.single.limit);
  },

  offset: function offset() {
    if (!this.single.offset) return '';
    return 'offset ' + this.formatter.parameter(this.single.offset);
  },

  // Compiles a `delete` query.
  del: function del() {
    // Make sure tableName is processed by the formatter first.
    var tableName = this.tableName;

    var wheres = this.where();
    return 'delete from ' + tableName + (wheres ? ' ' + wheres : '');
  },

  // Compiles a `truncate` query.
  truncate: function truncate() {
    return 'truncate ' + this.tableName;
  },

  // Compiles the "locks".
  lock: function lock() {
    if (this.single.lock) {
      if (!this.client.transacting) {
        helpers.warn('You are attempting to perform a "lock" command outside of a transaction.');
      } else {
        return this[this.single.lock]();
      }
    }
  },

  // Compile the "counter".
  counter: function counter() {
    var counter = this.single.counter;

    var toUpdate = {};
    toUpdate[counter.column] = this.client.raw(this.formatter.wrap(counter.column) + ' ' + (counter.symbol || '+') + ' ' + counter.amount);
    this.single.update = toUpdate;
    return this.update();
  },

  // On Clause
  // ------

  onWrapped: function onWrapped(clause) {
    var self = this;

    var wrapJoin = new _joinclause2['default']();
    clause.value.call(wrapJoin, wrapJoin);

    var sql = '';
    wrapJoin.clauses.forEach(function (wrapClause, ii) {
      if (ii > 0) {
        sql += ' ' + wrapClause.bool + ' ';
      }
      var val = self[wrapClause.type](wrapClause);
      if (val) {
        sql += val;
      }
    });

    if (sql.length) {
      return '(' + sql + ')';
    }
    return '';
  },

  onBasic: function onBasic(clause) {
    return this.formatter.wrap(clause.column) + ' ' + this.formatter.operator(clause.operator) + ' ' + this.formatter.wrap(clause.value);
  },

  onRaw: function onRaw(clause) {
    return this.formatter.unwrapRaw(clause.value);
  },

  onUsing: function onUsing(clause) {
    return this.formatter.wrap(clause.column);
  },

  // Where Clause
  // ------

  whereIn: function whereIn(statement) {
    if (Array.isArray(statement.column)) return this.multiWhereIn(statement);
    return this.formatter.wrap(statement.column) + ' ' + this._not(statement, 'in ') + this.wrap(this.formatter.parameterize(statement.value));
  },

  multiWhereIn: function multiWhereIn(statement) {
    var i = -1,
        sql = '(' + this.formatter.columnize(statement.column) + ') ';
    sql += this._not(statement, 'in ') + '((';
    while (++i < statement.value.length) {
      if (i !== 0) sql += '),(';
      sql += this.formatter.parameterize(statement.value[i]);
    }
    return sql + '))';
  },

  whereNull: function whereNull(statement) {
    return this.formatter.wrap(statement.column) + ' is ' + this._not(statement, 'null');
  },

  // Compiles a basic "where" clause.
  whereBasic: function whereBasic(statement) {
    return this._not(statement, '') + this.formatter.wrap(statement.column) + ' ' + this.formatter.operator(statement.operator) + ' ' + this.formatter.parameter(statement.value);
  },

  whereExists: function whereExists(statement) {
    return this._not(statement, 'exists') + ' (' + this.formatter.rawOrFn(statement.value) + ')';
  },

  whereWrapped: function whereWrapped(statement) {
    var val = this.formatter.rawOrFn(statement.value, 'where');
    return val && this._not(statement, '') + '(' + val.slice(6) + ')' || '';
  },

  whereBetween: function whereBetween(statement) {
    return this.formatter.wrap(statement.column) + ' ' + this._not(statement, 'between') + ' ' + _lodash.map(statement.value, _lodash.bind(this.formatter.parameter, this.formatter)).join(' and ');
  },

  // Compiles a "whereRaw" query.
  whereRaw: function whereRaw(statement) {
    return this._not(statement, '') + this.formatter.unwrapRaw(statement.value);
  },

  wrap: function wrap(str) {
    if (str.charAt(0) !== '(') return '(' + str + ')';
    return str;
  },

  // Determines whether to add a "not" prefix to the where clause.
  _not: function _not(statement, str) {
    if (statement.not) return 'not ' + str;
    return str;
  },

  _prepInsert: function _prepInsert(data) {
    var isRaw = this.formatter.rawOrFn(data);
    if (isRaw) return isRaw;
    var columns = [];
    var values = [];
    if (!Array.isArray(data)) data = data ? [data] : [];
    var i = -1;
    while (++i < data.length) {
      if (data[i] == null) break;
      if (i === 0) columns = Object.keys(data[i]).sort();
      var row = new Array(columns.length);
      var keys = Object.keys(data[i]);
      var j = -1;
      while (++j < keys.length) {
        var key = keys[j];
        var idx = columns.indexOf(key);
        if (idx === -1) {
          columns = columns.concat(key).sort();
          idx = columns.indexOf(key);
          var k = -1;
          while (++k < values.length) {
            values[k].splice(idx, 0, undefined);
          }
          row.splice(idx, 0, undefined);
        }
        row[idx] = data[i][key];
      }
      values.push(row);
    }
    return {
      columns: columns,
      values: values
    };
  },

  // "Preps" the update.
  _prepUpdate: function _prepUpdate(data) {
    data = _lodash.omitBy(data, _lodash.isUndefined);
    var vals = [];
    var sorted = Object.keys(data).sort();
    var i = -1;
    while (++i < sorted.length) {
      vals.push(this.formatter.wrap(sorted[i]) + ' = ' + this.formatter.parameter(data[sorted[i]]));
    }
    return vals;
  },

  // Compiles the `order by` statements.
  _groupsOrders: function _groupsOrders(type) {
    var items = this.grouped[type];
    if (!items) return '';
    var formatter = this.formatter;

    var sql = items.map(function (item) {
      var column = item.value instanceof _raw2['default'] ? formatter.unwrapRaw(item.value) : formatter.columnize(item.value);
      var direction = type === 'order' && item.type !== 'orderByRaw' ? ' ' + formatter.direction(item.direction) : '';
      return column + direction;
    });
    return sql.length ? type + ' by ' + sql.join(', ') : '';
  }

});

QueryCompiler.prototype.first = QueryCompiler.prototype.select;

// Get the table name, wrapping it if necessary.
// Implemented as a property to prevent ordering issues as described in #704.
Object.defineProperty(QueryCompiler.prototype, 'tableName', {
  get: function get() {
    if (!this._tableName) {
      // Only call this.formatter.wrap() the first time this property is accessed.
      var tableName = this.single.table;
      var schemaName = this.single.schema;

      if (tableName && schemaName) tableName = schemaName + '.' + tableName;

      this._tableName = tableName ? this.formatter.wrap(tableName) : '';
    }
    return this._tableName;
  }
});

exports['default'] = QueryCompiler;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9xdWVyeS9jb21waWxlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozt1QkFHeUIsWUFBWTs7SUFBekIsT0FBTzs7bUJBQ0gsUUFBUTs7OzswQkFDRCxjQUFjOzs7O3NCQUs5QixRQUFROzs7OztBQUtmLFNBQVMsYUFBYSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUU7QUFDdEMsTUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUE7QUFDcEIsTUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxJQUFJLFFBQVEsQ0FBQztBQUMxQyxNQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUM7QUFDaEMsTUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO0FBQzlCLE1BQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLFFBQVEsSUFBSSxLQUFLLENBQUM7QUFDekMsTUFBSSxDQUFDLE9BQU8sR0FBRyxnQkFBUSxPQUFPLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBQ3hELE1BQUksQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFBO0NBQ3BDOztBQUVELElBQU0sVUFBVSxHQUFHLENBQ2pCLFNBQVMsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQzVDLFFBQVEsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQzdDLENBQUM7O0FBRUYsZUFBTyxhQUFhLENBQUMsU0FBUyxFQUFFOzs7QUFHOUIsbUJBQWlCLEVBQUUsZ0JBQWdCOzs7QUFHbkMsT0FBSyxFQUFBLGVBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRTtBQUNoQixVQUFNLEdBQUcsTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUE7QUFDOUIsUUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUE7QUFDeEIs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QUFNLFNBQVMsR0FBRyxJQUFJLEtBQUssT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssWUFBWSxTQUN4RCxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FDdkMsRUFBRSxDQUFDO0FBQ1AsYUFBTyxNQUFNLEdBQUcsU0FBUyxDQUFDO0tBQzNCLENBQUMsQ0FBQztBQUNILFdBQU8sR0FBRyxDQUFDLE1BQU0sR0FBRyxJQUFJLEdBQUcsTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0dBQ3pEOztDQUVGLENBQUMsQ0FBQTs7QUFFRixhQUFhLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQzs7OztBQUkvRCxNQUFNLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsV0FBVyxFQUFFO0FBQzFELEtBQUcsRUFBQSxlQUFHO0FBQ0osUUFBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUU7O0FBRW5CLFVBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO0FBQ2xDLFVBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDOztBQUV0QyxVQUFJLFNBQVMsSUFBSSxVQUFVLEVBQUUsU0FBUyxHQUFNLFVBQVUsU0FBSSxTQUFTLEFBQUUsQ0FBQzs7QUFFdEUsVUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDO0tBQ25FO0FBQ0QsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO0dBQ3hCO0NBQ0YsQ0FBQyxDQUFDOztxQkFHWSxhQUFhIiwiZmlsZSI6ImNvbXBpbGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vLyBRdWVyeSBDb21waWxlclxuLy8gLS0tLS0tLVxuaW1wb3J0ICogYXMgaGVscGVycyBmcm9tICcuLi9oZWxwZXJzJztcbmltcG9ydCBSYXcgZnJvbSAnLi4vcmF3JztcbmltcG9ydCBKb2luQ2xhdXNlIGZyb20gJy4vam9pbmNsYXVzZSc7XG5cbmltcG9ydCB7XG4gIGFzc2lnbiwgYmluZCwgY29tcGFjdCwgZ3JvdXBCeSwgaXNFbXB0eSwgaXNTdHJpbmcsIGlzVW5kZWZpbmVkLCBtYXAsIG9taXRCeSxcbiAgcmVkdWNlXG59IGZyb20gJ2xvZGFzaCc7XG5cbi8vIFRoZSBcIlF1ZXJ5Q29tcGlsZXJcIiB0YWtlcyBhbGwgb2YgdGhlIHF1ZXJ5IHN0YXRlbWVudHMgd2hpY2hcbi8vIGhhdmUgYmVlbiBnYXRoZXJlZCBpbiB0aGUgXCJRdWVyeUJ1aWxkZXJcIiBhbmQgdHVybnMgdGhlbSBpbnRvIGFcbi8vIHByb3Blcmx5IGZvcm1hdHRlZCAvIGJvdW5kIHF1ZXJ5IHN0cmluZy5cbmZ1bmN0aW9uIFF1ZXJ5Q29tcGlsZXIoY2xpZW50LCBidWlsZGVyKSB7XG4gIHRoaXMuY2xpZW50ID0gY2xpZW50XG4gIHRoaXMubWV0aG9kID0gYnVpbGRlci5fbWV0aG9kIHx8ICdzZWxlY3QnO1xuICB0aGlzLm9wdGlvbnMgPSBidWlsZGVyLl9vcHRpb25zO1xuICB0aGlzLnNpbmdsZSA9IGJ1aWxkZXIuX3NpbmdsZTtcbiAgdGhpcy50aW1lb3V0ID0gYnVpbGRlci5fdGltZW91dCB8fCBmYWxzZTtcbiAgdGhpcy5ncm91cGVkID0gZ3JvdXBCeShidWlsZGVyLl9zdGF0ZW1lbnRzLCAnZ3JvdXBpbmcnKTtcbiAgdGhpcy5mb3JtYXR0ZXIgPSBjbGllbnQuZm9ybWF0dGVyKClcbn1cblxuY29uc3QgY29tcG9uZW50cyA9IFtcbiAgJ2NvbHVtbnMnLCAnam9pbicsICd3aGVyZScsICd1bmlvbicsICdncm91cCcsXG4gICdoYXZpbmcnLCAnb3JkZXInLCAnbGltaXQnLCAnb2Zmc2V0JywgJ2xvY2snXG5dO1xuXG5hc3NpZ24oUXVlcnlDb21waWxlci5wcm90b3R5cGUsIHtcblxuICAvLyBVc2VkIHdoZW4gdGhlIGluc2VydCBjYWxsIGlzIGVtcHR5LlxuICBfZW1wdHlJbnNlcnRWYWx1ZTogJ2RlZmF1bHQgdmFsdWVzJyxcblxuICAvLyBDb2xsYXBzZSB0aGUgYnVpbGRlciBpbnRvIGEgc2luZ2xlIG9iamVjdFxuICB0b1NRTChtZXRob2QsIHR6KSB7XG4gICAgbWV0aG9kID0gbWV0aG9kIHx8IHRoaXMubWV0aG9kXG4gICAgbGV0IHZhbCA9IHRoaXNbbWV0aG9kXSgpXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBtZXRob2QsXG4gICAgICBvcHRpb25zOiByZWR1Y2UodGhpcy5vcHRpb25zLCBhc3NpZ24sIHt9KSxcbiAgICAgIHRpbWVvdXQ6IHRoaXMudGltZW91dCxcbiAgICAgIGJpbmRpbmdzOiB0aGlzLmZvcm1hdHRlci5iaW5kaW5nc1xuICAgIH07XG4gICAgaWYgKGlzU3RyaW5nKHZhbCkpIHtcbiAgICAgIHZhbCA9IHtzcWw6IHZhbH07XG4gICAgfVxuICAgIGlmIChtZXRob2QgPT09ICdzZWxlY3QnICYmIHRoaXMuc2luZ2xlLmFzKSB7XG4gICAgICBkZWZhdWx0cy5hcyA9IHRoaXMuc2luZ2xlLmFzO1xuICAgIH1cblxuICAgIGRlZmF1bHRzLmJpbmRpbmdzID0gdGhpcy5jbGllbnQucHJlcEJpbmRpbmdzKGRlZmF1bHRzLmJpbmRpbmdzIHx8IFtdLCB0eik7XG5cbiAgICByZXR1cm4gYXNzaWduKGRlZmF1bHRzLCB2YWwpO1xuICB9LFxuXG4gIC8vIENvbXBpbGVzIHRoZSBgc2VsZWN0YCBzdGF0ZW1lbnQsIG9yIG5lc3RlZCBzdWItc2VsZWN0cyBieSBjYWxsaW5nIGVhY2ggb2ZcbiAgLy8gdGhlIGNvbXBvbmVudCBjb21waWxlcnMsIHRyaW1taW5nIG91dCB0aGUgZW1wdGllcywgYW5kIHJldHVybmluZyBhXG4gIC8vIGdlbmVyYXRlZCBxdWVyeSBzdHJpbmcuXG4gIHNlbGVjdCgpIHtcbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gY29tcG9uZW50cy5tYXAoY29tcG9uZW50ID0+XG4gICAgICB0aGlzW2NvbXBvbmVudF0odGhpcylcbiAgICApO1xuICAgIHJldHVybiBjb21wYWN0KHN0YXRlbWVudHMpLmpvaW4oJyAnKTtcbiAgfSxcblxuICBwbHVjaygpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3FsOiB0aGlzLnNlbGVjdCgpLFxuICAgICAgcGx1Y2s6IHRoaXMuc2luZ2xlLnBsdWNrXG4gICAgfTtcbiAgfSxcblxuICAvLyBDb21waWxlcyBhbiBcImluc2VydFwiIHF1ZXJ5LCBhbGxvd2luZyBmb3IgbXVsdGlwbGVcbiAgLy8gaW5zZXJ0cyB1c2luZyBhIHNpbmdsZSBxdWVyeSBzdGF0ZW1lbnQuXG4gIGluc2VydCgpIHtcbiAgICBjb25zdCBpbnNlcnRWYWx1ZXMgPSB0aGlzLnNpbmdsZS5pbnNlcnQgfHwgW107XG4gICAgbGV0IHNxbCA9IGBpbnNlcnQgaW50byAke3RoaXMudGFibGVOYW1lfSBgO1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoaW5zZXJ0VmFsdWVzKSkge1xuICAgICAgaWYgKGluc2VydFZhbHVlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuICcnXG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgaW5zZXJ0VmFsdWVzID09PSAnb2JqZWN0JyAmJiBpc0VtcHR5KGluc2VydFZhbHVlcykpIHtcbiAgICAgIHJldHVybiBzcWwgKyB0aGlzLl9lbXB0eUluc2VydFZhbHVlXG4gICAgfVxuXG4gICAgY29uc3QgaW5zZXJ0RGF0YSA9IHRoaXMuX3ByZXBJbnNlcnQoaW5zZXJ0VmFsdWVzKTtcbiAgICBpZiAodHlwZW9mIGluc2VydERhdGEgPT09ICdzdHJpbmcnKSB7XG4gICAgICBzcWwgKz0gaW5zZXJ0RGF0YTtcbiAgICB9IGVsc2UgIHtcbiAgICAgIGlmIChpbnNlcnREYXRhLmNvbHVtbnMubGVuZ3RoKSB7XG4gICAgICAgIHNxbCArPSBgKCR7dGhpcy5mb3JtYXR0ZXIuY29sdW1uaXplKGluc2VydERhdGEuY29sdW1ucyl9YFxuICAgICAgICBzcWwgKz0gJykgdmFsdWVzICgnXG4gICAgICAgIGxldCBpID0gLTFcbiAgICAgICAgd2hpbGUgKCsraSA8IGluc2VydERhdGEudmFsdWVzLmxlbmd0aCkge1xuICAgICAgICAgIGlmIChpICE9PSAwKSBzcWwgKz0gJyksICgnXG4gICAgICAgICAgc3FsICs9IHRoaXMuZm9ybWF0dGVyLnBhcmFtZXRlcml6ZShpbnNlcnREYXRhLnZhbHVlc1tpXSwgdGhpcy5jbGllbnQudmFsdWVGb3JVbmRlZmluZWQpXG4gICAgICAgIH1cbiAgICAgICAgc3FsICs9ICcpJztcbiAgICAgIH0gZWxzZSBpZiAoaW5zZXJ0VmFsdWVzLmxlbmd0aCA9PT0gMSAmJiBpbnNlcnRWYWx1ZXNbMF0pIHtcbiAgICAgICAgc3FsICs9IHRoaXMuX2VtcHR5SW5zZXJ0VmFsdWVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNxbCA9ICcnXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzcWw7XG4gIH0sXG5cbiAgLy8gQ29tcGlsZXMgdGhlIFwidXBkYXRlXCIgcXVlcnkuXG4gIHVwZGF0ZSgpIHtcbiAgICAvLyBNYWtlIHN1cmUgdGFibGVOYW1lIGlzIHByb2Nlc3NlZCBieSB0aGUgZm9ybWF0dGVyIGZpcnN0LlxuICAgIGNvbnN0IHsgdGFibGVOYW1lIH0gPSB0aGlzO1xuICAgIGNvbnN0IHVwZGF0ZURhdGEgPSB0aGlzLl9wcmVwVXBkYXRlKHRoaXMuc2luZ2xlLnVwZGF0ZSk7XG4gICAgY29uc3Qgd2hlcmVzID0gdGhpcy53aGVyZSgpO1xuICAgIHJldHVybiBgdXBkYXRlICR7dGFibGVOYW1lfWAgK1xuICAgICAgJyBzZXQgJyArIHVwZGF0ZURhdGEuam9pbignLCAnKSArXG4gICAgICAod2hlcmVzID8gYCAke3doZXJlc31gIDogJycpO1xuICB9LFxuXG4gIC8vIENvbXBpbGVzIHRoZSBjb2x1bW5zIGluIHRoZSBxdWVyeSwgc3BlY2lmeWluZyBpZiBhbiBpdGVtIHdhcyBkaXN0aW5jdC5cbiAgY29sdW1ucygpIHtcbiAgICBsZXQgZGlzdGluY3QgPSBmYWxzZTtcbiAgICBpZiAodGhpcy5vbmx5VW5pb25zKCkpIHJldHVybiAnJ1xuICAgIGNvbnN0IGNvbHVtbnMgPSB0aGlzLmdyb3VwZWQuY29sdW1ucyB8fCBbXVxuICAgIGxldCBpID0gLTEsIHNxbCA9IFtdO1xuICAgIGlmIChjb2x1bW5zKSB7XG4gICAgICB3aGlsZSAoKytpIDwgY29sdW1ucy5sZW5ndGgpIHtcbiAgICAgICAgY29uc3Qgc3RtdCA9IGNvbHVtbnNbaV07XG4gICAgICAgIGlmIChzdG10LmRpc3RpbmN0KSBkaXN0aW5jdCA9IHRydWVcbiAgICAgICAgaWYgKHN0bXQudHlwZSA9PT0gJ2FnZ3JlZ2F0ZScpIHtcbiAgICAgICAgICBzcWwucHVzaCh0aGlzLmFnZ3JlZ2F0ZShzdG10KSlcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzdG10LnZhbHVlICYmIHN0bXQudmFsdWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHNxbC5wdXNoKHRoaXMuZm9ybWF0dGVyLmNvbHVtbml6ZShzdG10LnZhbHVlKSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoc3FsLmxlbmd0aCA9PT0gMCkgc3FsID0gWycqJ107XG4gICAgcmV0dXJuIGBzZWxlY3QgJHtkaXN0aW5jdCA/ICdkaXN0aW5jdCAnIDogJyd9YCArXG4gICAgICBzcWwuam9pbignLCAnKSArICh0aGlzLnRhYmxlTmFtZSA/IGAgZnJvbSAke3RoaXMudGFibGVOYW1lfWAgOiAnJyk7XG4gIH0sXG5cbiAgYWdncmVnYXRlKHN0bXQpIHtcbiAgICBjb25zdCB2YWwgPSBzdG10LnZhbHVlO1xuICAgIGNvbnN0IHNwbGl0T24gPSB2YWwudG9Mb3dlckNhc2UoKS5pbmRleE9mKCcgYXMgJyk7XG4gICAgY29uc3QgZGlzdGluY3QgPSBzdG10LmFnZ3JlZ2F0ZURpc3RpbmN0ID8gJ2Rpc3RpbmN0ICcgOiAnJztcbiAgICAvLyBBbGxvd3MgdXMgdG8gc3BlY2l5IGFuIGFsaWFzIGZvciB0aGUgYWdncmVnYXRlIHR5cGVzLlxuICAgIGlmIChzcGxpdE9uICE9PSAtMSkge1xuICAgICAgY29uc3QgY29sID0gdmFsLnNsaWNlKDAsIHNwbGl0T24pO1xuICAgICAgY29uc3QgYWxpYXMgPSB2YWwuc2xpY2Uoc3BsaXRPbiArIDQpO1xuICAgICAgcmV0dXJuIChcbiAgICAgICAgYCR7c3RtdC5tZXRob2R9KCR7ZGlzdGluY3QgKyB0aGlzLmZvcm1hdHRlci53cmFwKGNvbCl9KSBgICtcbiAgICAgICAgYGFzICR7dGhpcy5mb3JtYXR0ZXIud3JhcChhbGlhcyl9YFxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIGAke3N0bXQubWV0aG9kfSgke2Rpc3RpbmN0ICsgdGhpcy5mb3JtYXR0ZXIud3JhcCh2YWwpfSlgO1xuICB9LFxuXG4gIC8vIENvbXBpbGVzIGFsbCBlYWNoIG9mIHRoZSBgam9pbmAgY2xhdXNlcyBvbiB0aGUgcXVlcnksXG4gIC8vIGluY2x1ZGluZyBhbnkgbmVzdGVkIGpvaW4gcXVlcmllcy5cbiAgam9pbigpIHtcbiAgICBsZXQgc3FsID0gJyc7XG4gICAgbGV0IGkgPSAtMTtcbiAgICBjb25zdCBqb2lucyA9IHRoaXMuZ3JvdXBlZC5qb2luO1xuICAgIGlmICgham9pbnMpIHJldHVybiAnJztcbiAgICB3aGlsZSAoKytpIDwgam9pbnMubGVuZ3RoKSB7XG4gICAgICBjb25zdCBqb2luID0gam9pbnNbaV07XG4gICAgICBjb25zdCB0YWJsZSA9IGpvaW4uc2NoZW1hID8gYCR7am9pbi5zY2hlbWF9LiR7am9pbi50YWJsZX1gIDogam9pbi50YWJsZTtcbiAgICAgIGlmIChpID4gMCkgc3FsICs9ICcgJ1xuICAgICAgaWYgKGpvaW4uam9pblR5cGUgPT09ICdyYXcnKSB7XG4gICAgICAgIHNxbCArPSB0aGlzLmZvcm1hdHRlci51bndyYXBSYXcoam9pbi50YWJsZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNxbCArPSBqb2luLmpvaW5UeXBlICsgJyBqb2luICcgKyB0aGlzLmZvcm1hdHRlci53cmFwKHRhYmxlKVxuICAgICAgICBsZXQgaWkgPSAtMVxuICAgICAgICB3aGlsZSAoKytpaSA8IGpvaW4uY2xhdXNlcy5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBjbGF1c2UgPSBqb2luLmNsYXVzZXNbaWldXG4gICAgICAgICAgaWYgKGlpID4gMCkge1xuICAgICAgICAgICAgc3FsICs9IGAgJHtjbGF1c2UuYm9vbH0gYDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3FsICs9IGAgJHtjbGF1c2UudHlwZSA9PT0gJ29uVXNpbmcnID8gJ3VzaW5nJyA6ICdvbid9IGA7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IHZhbCA9IHRoaXNbY2xhdXNlLnR5cGVdLmNhbGwodGhpcywgY2xhdXNlKTtcbiAgICAgICAgICBpZiAodmFsKSB7XG4gICAgICAgICAgICBzcWwgKz0gdmFsO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3FsO1xuICB9LFxuXG4gIC8vIENvbXBpbGVzIGFsbCBgd2hlcmVgIHN0YXRlbWVudHMgb24gdGhlIHF1ZXJ5LlxuICB3aGVyZSgpIHtcbiAgICBjb25zdCB3aGVyZXMgPSB0aGlzLmdyb3VwZWQud2hlcmU7XG4gICAgaWYgKCF3aGVyZXMpIHJldHVybjtcbiAgICBjb25zdCBzcWwgPSBbXTtcbiAgICBsZXQgaSA9IC0xO1xuICAgIHdoaWxlICgrK2kgPCB3aGVyZXMubGVuZ3RoKSB7XG4gICAgICBjb25zdCBzdG10ID0gd2hlcmVzW2ldXG4gICAgICBjb25zdCB2YWwgPSB0aGlzW3N0bXQudHlwZV0oc3RtdClcbiAgICAgIGlmICh2YWwpIHtcbiAgICAgICAgaWYgKHNxbC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBzcWxbMF0gPSAnd2hlcmUnXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3FsLnB1c2goc3RtdC5ib29sKVxuICAgICAgICB9XG4gICAgICAgIHNxbC5wdXNoKHZhbClcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHNxbC5sZW5ndGggPiAxID8gc3FsLmpvaW4oJyAnKSA6ICcnO1xuICB9LFxuXG4gIGdyb3VwKCkge1xuICAgIHJldHVybiB0aGlzLl9ncm91cHNPcmRlcnMoJ2dyb3VwJyk7XG4gIH0sXG5cbiAgb3JkZXIoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2dyb3Vwc09yZGVycygnb3JkZXInKTtcbiAgfSxcblxuICAvLyBDb21waWxlcyB0aGUgYGhhdmluZ2Agc3RhdGVtZW50cy5cbiAgaGF2aW5nKCkge1xuICAgIGNvbnN0IGhhdmluZ3MgPSB0aGlzLmdyb3VwZWQuaGF2aW5nO1xuICAgIGlmICghaGF2aW5ncykgcmV0dXJuICcnO1xuICAgIGNvbnN0IHNxbCA9IFsnaGF2aW5nJ107XG4gICAgZm9yIChsZXQgaSA9IDAsIGwgPSBoYXZpbmdzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgbGV0IHN0ciA9ICcnO1xuICAgICAgY29uc3QgcyA9IGhhdmluZ3NbaV07XG4gICAgICBpZiAoaSAhPT0gMCkgc3RyID0gcy5ib29sICsgJyAnO1xuICAgICAgaWYgKHMudHlwZSA9PT0gJ2hhdmluZ0Jhc2ljJykge1xuICAgICAgICBzcWwucHVzaChzdHIgKyB0aGlzLmZvcm1hdHRlci5jb2x1bW5pemUocy5jb2x1bW4pICsgJyAnICtcbiAgICAgICAgICB0aGlzLmZvcm1hdHRlci5vcGVyYXRvcihzLm9wZXJhdG9yKSArICcgJyArIHRoaXMuZm9ybWF0dGVyLnBhcmFtZXRlcihzLnZhbHVlKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZihzLnR5cGUgPT09ICd3aGVyZVdyYXBwZWQnKXtcbiAgICAgICAgICBjb25zdCB2YWwgPSB0aGlzLndoZXJlV3JhcHBlZChzKVxuICAgICAgICAgIGlmICh2YWwpIHNxbC5wdXNoKHZhbClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzcWwucHVzaChzdHIgKyB0aGlzLmZvcm1hdHRlci51bndyYXBSYXcocy52YWx1ZSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzcWwubGVuZ3RoID4gMSA/IHNxbC5qb2luKCcgJykgOiAnJztcbiAgfSxcblxuICAvLyBDb21waWxlIHRoZSBcInVuaW9uXCIgcXVlcmllcyBhdHRhY2hlZCB0byB0aGUgbWFpbiBxdWVyeS5cbiAgdW5pb24oKSB7XG4gICAgY29uc3Qgb25seVVuaW9ucyA9IHRoaXMub25seVVuaW9ucygpO1xuICAgIGNvbnN0IHVuaW9ucyA9IHRoaXMuZ3JvdXBlZC51bmlvbjtcbiAgICBpZiAoIXVuaW9ucykgcmV0dXJuICcnO1xuICAgIGxldCBzcWwgPSAnJztcbiAgICBmb3IgKGxldCBpID0gMCwgbCA9IHVuaW9ucy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGNvbnN0IHVuaW9uID0gdW5pb25zW2ldO1xuICAgICAgaWYgKGkgPiAwKSBzcWwgKz0gJyAnO1xuICAgICAgaWYgKGkgPiAwIHx8ICFvbmx5VW5pb25zKSBzcWwgKz0gdW5pb24uY2xhdXNlICsgJyAnO1xuICAgICAgY29uc3Qgc3RhdGVtZW50ID0gdGhpcy5mb3JtYXR0ZXIucmF3T3JGbih1bmlvbi52YWx1ZSk7XG4gICAgICBpZiAoc3RhdGVtZW50KSB7XG4gICAgICAgIGlmICh1bmlvbi53cmFwKSBzcWwgKz0gJygnO1xuICAgICAgICBzcWwgKz0gc3RhdGVtZW50O1xuICAgICAgICBpZiAodW5pb24ud3JhcCkgc3FsICs9ICcpJztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHNxbDtcbiAgfSxcblxuICAvLyBJZiB3ZSBoYXZlbid0IHNwZWNpZmllZCBhbnkgY29sdW1ucyBvciBhIGB0YWJsZU5hbWVgLCB3ZSdyZSBhc3N1bWluZyB0aGlzXG4gIC8vIGlzIG9ubHkgYmVpbmcgdXNlZCBmb3IgdW5pb25zLlxuICBvbmx5VW5pb25zKCkge1xuICAgIHJldHVybiAoIXRoaXMuZ3JvdXBlZC5jb2x1bW5zICYmIHRoaXMuZ3JvdXBlZC51bmlvbiAmJiAhdGhpcy50YWJsZU5hbWUpO1xuICB9LFxuXG4gIGxpbWl0KCkge1xuICAgIGNvbnN0IG5vTGltaXQgPSAhdGhpcy5zaW5nbGUubGltaXQgJiYgdGhpcy5zaW5nbGUubGltaXQgIT09IDA7XG4gICAgaWYgKG5vTGltaXQpIHJldHVybiAnJztcbiAgICByZXR1cm4gYGxpbWl0ICR7dGhpcy5mb3JtYXR0ZXIucGFyYW1ldGVyKHRoaXMuc2luZ2xlLmxpbWl0KX1gO1xuICB9LFxuXG4gIG9mZnNldCgpIHtcbiAgICBpZiAoIXRoaXMuc2luZ2xlLm9mZnNldCkgcmV0dXJuICcnO1xuICAgIHJldHVybiBgb2Zmc2V0ICR7dGhpcy5mb3JtYXR0ZXIucGFyYW1ldGVyKHRoaXMuc2luZ2xlLm9mZnNldCl9YDtcbiAgfSxcblxuICAvLyBDb21waWxlcyBhIGBkZWxldGVgIHF1ZXJ5LlxuICBkZWwoKSB7XG4gICAgLy8gTWFrZSBzdXJlIHRhYmxlTmFtZSBpcyBwcm9jZXNzZWQgYnkgdGhlIGZvcm1hdHRlciBmaXJzdC5cbiAgICBjb25zdCB7IHRhYmxlTmFtZSB9ID0gdGhpcztcbiAgICBjb25zdCB3aGVyZXMgPSB0aGlzLndoZXJlKCk7XG4gICAgcmV0dXJuIGBkZWxldGUgZnJvbSAke3RhYmxlTmFtZX1gICtcbiAgICAgICh3aGVyZXMgPyBgICR7d2hlcmVzfWAgOiAnJyk7XG4gIH0sXG5cbiAgLy8gQ29tcGlsZXMgYSBgdHJ1bmNhdGVgIHF1ZXJ5LlxuICB0cnVuY2F0ZSgpIHtcbiAgICByZXR1cm4gYHRydW5jYXRlICR7dGhpcy50YWJsZU5hbWV9YDtcbiAgfSxcblxuICAvLyBDb21waWxlcyB0aGUgXCJsb2Nrc1wiLlxuICBsb2NrKCkge1xuICAgIGlmICh0aGlzLnNpbmdsZS5sb2NrKSB7XG4gICAgICBpZiAoIXRoaXMuY2xpZW50LnRyYW5zYWN0aW5nKSB7XG4gICAgICAgIGhlbHBlcnMud2FybignWW91IGFyZSBhdHRlbXB0aW5nIHRvIHBlcmZvcm0gYSBcImxvY2tcIiBjb21tYW5kIG91dHNpZGUgb2YgYSB0cmFuc2FjdGlvbi4nKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbdGhpcy5zaW5nbGUubG9ja10oKVxuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvLyBDb21waWxlIHRoZSBcImNvdW50ZXJcIi5cbiAgY291bnRlcigpIHtcbiAgICBjb25zdCB7IGNvdW50ZXIgfSA9IHRoaXMuc2luZ2xlO1xuICAgIGNvbnN0IHRvVXBkYXRlID0ge307XG4gICAgdG9VcGRhdGVbY291bnRlci5jb2x1bW5dID0gdGhpcy5jbGllbnQucmF3KHRoaXMuZm9ybWF0dGVyLndyYXAoY291bnRlci5jb2x1bW4pICtcbiAgICAgICcgJyArIChjb3VudGVyLnN5bWJvbCB8fCAnKycpICtcbiAgICAgICcgJyArIGNvdW50ZXIuYW1vdW50KTtcbiAgICB0aGlzLnNpbmdsZS51cGRhdGUgPSB0b1VwZGF0ZTtcbiAgICByZXR1cm4gdGhpcy51cGRhdGUoKTtcbiAgfSxcblxuICAvLyBPbiBDbGF1c2VcbiAgLy8gLS0tLS0tXG5cbiAgb25XcmFwcGVkKGNsYXVzZSkge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gICAgY29uc3Qgd3JhcEpvaW4gPSBuZXcgSm9pbkNsYXVzZSgpO1xuICAgIGNsYXVzZS52YWx1ZS5jYWxsKHdyYXBKb2luLCB3cmFwSm9pbik7XG5cbiAgICBsZXQgc3FsID0gJyc7XG4gICAgd3JhcEpvaW4uY2xhdXNlcy5mb3JFYWNoKGZ1bmN0aW9uKHdyYXBDbGF1c2UsIGlpKSB7XG4gICAgICBpZiAoaWkgPiAwKSB7XG4gICAgICAgIHNxbCArPSBgICR7d3JhcENsYXVzZS5ib29sfSBgO1xuICAgICAgfVxuICAgICAgY29uc3QgdmFsID0gc2VsZlt3cmFwQ2xhdXNlLnR5cGVdKHdyYXBDbGF1c2UpO1xuICAgICAgaWYgKHZhbCkge1xuICAgICAgICBzcWwgKz0gdmFsO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHNxbC5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBgKCR7c3FsfSlgO1xuICAgIH1cbiAgICByZXR1cm4gJyc7XG4gIH0sXG5cbiAgb25CYXNpYyhjbGF1c2UpIHtcbiAgICByZXR1cm4gKFxuICAgICAgdGhpcy5mb3JtYXR0ZXIud3JhcChjbGF1c2UuY29sdW1uKSArICcgJyArXG4gICAgICB0aGlzLmZvcm1hdHRlci5vcGVyYXRvcihjbGF1c2Uub3BlcmF0b3IpICsgJyAnICtcbiAgICAgIHRoaXMuZm9ybWF0dGVyLndyYXAoY2xhdXNlLnZhbHVlKVxuICAgICk7XG4gIH0sXG5cbiAgb25SYXcoY2xhdXNlKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9ybWF0dGVyLnVud3JhcFJhdyhjbGF1c2UudmFsdWUpO1xuICB9LFxuXG4gIG9uVXNpbmcoY2xhdXNlKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9ybWF0dGVyLndyYXAoY2xhdXNlLmNvbHVtbik7XG4gIH0sXG5cbiAgLy8gV2hlcmUgQ2xhdXNlXG4gIC8vIC0tLS0tLVxuXG4gIHdoZXJlSW4oc3RhdGVtZW50KSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoc3RhdGVtZW50LmNvbHVtbikpIHJldHVybiB0aGlzLm11bHRpV2hlcmVJbihzdGF0ZW1lbnQpO1xuICAgIHJldHVybiB0aGlzLmZvcm1hdHRlci53cmFwKHN0YXRlbWVudC5jb2x1bW4pICsgJyAnICsgdGhpcy5fbm90KHN0YXRlbWVudCwgJ2luICcpICtcbiAgICAgIHRoaXMud3JhcCh0aGlzLmZvcm1hdHRlci5wYXJhbWV0ZXJpemUoc3RhdGVtZW50LnZhbHVlKSk7XG4gIH0sXG5cbiAgbXVsdGlXaGVyZUluKHN0YXRlbWVudCkge1xuICAgIGxldCBpID0gLTEsIHNxbCA9IGAoJHt0aGlzLmZvcm1hdHRlci5jb2x1bW5pemUoc3RhdGVtZW50LmNvbHVtbil9KSBgXG4gICAgc3FsICs9IHRoaXMuX25vdChzdGF0ZW1lbnQsICdpbiAnKSArICcoKCdcbiAgICB3aGlsZSAoKytpIDwgc3RhdGVtZW50LnZhbHVlLmxlbmd0aCkge1xuICAgICAgaWYgKGkgIT09IDApIHNxbCArPSAnKSwoJ1xuICAgICAgc3FsICs9IHRoaXMuZm9ybWF0dGVyLnBhcmFtZXRlcml6ZShzdGF0ZW1lbnQudmFsdWVbaV0pXG4gICAgfVxuICAgIHJldHVybiBzcWwgKyAnKSknXG4gIH0sXG5cbiAgd2hlcmVOdWxsKHN0YXRlbWVudCkge1xuICAgIHJldHVybiB0aGlzLmZvcm1hdHRlci53cmFwKHN0YXRlbWVudC5jb2x1bW4pICsgJyBpcyAnICsgdGhpcy5fbm90KHN0YXRlbWVudCwgJ251bGwnKTtcbiAgfSxcblxuICAvLyBDb21waWxlcyBhIGJhc2ljIFwid2hlcmVcIiBjbGF1c2UuXG4gIHdoZXJlQmFzaWMoc3RhdGVtZW50KSB7XG4gICAgcmV0dXJuIHRoaXMuX25vdChzdGF0ZW1lbnQsICcnKSArXG4gICAgICB0aGlzLmZvcm1hdHRlci53cmFwKHN0YXRlbWVudC5jb2x1bW4pICsgJyAnICtcbiAgICAgIHRoaXMuZm9ybWF0dGVyLm9wZXJhdG9yKHN0YXRlbWVudC5vcGVyYXRvcikgKyAnICcgK1xuICAgICAgdGhpcy5mb3JtYXR0ZXIucGFyYW1ldGVyKHN0YXRlbWVudC52YWx1ZSk7XG4gIH0sXG5cbiAgd2hlcmVFeGlzdHMoc3RhdGVtZW50KSB7XG4gICAgcmV0dXJuIHRoaXMuX25vdChzdGF0ZW1lbnQsICdleGlzdHMnKSArICcgKCcgKyB0aGlzLmZvcm1hdHRlci5yYXdPckZuKHN0YXRlbWVudC52YWx1ZSkgKyAnKSc7XG4gIH0sXG5cbiAgd2hlcmVXcmFwcGVkKHN0YXRlbWVudCkge1xuICAgIGNvbnN0IHZhbCA9IHRoaXMuZm9ybWF0dGVyLnJhd09yRm4oc3RhdGVtZW50LnZhbHVlLCAnd2hlcmUnKVxuICAgIHJldHVybiB2YWwgJiYgdGhpcy5fbm90KHN0YXRlbWVudCwgJycpICsgJygnICsgdmFsLnNsaWNlKDYpICsgJyknIHx8ICcnO1xuICB9LFxuXG4gIHdoZXJlQmV0d2VlbihzdGF0ZW1lbnQpIHtcbiAgICByZXR1cm4gdGhpcy5mb3JtYXR0ZXIud3JhcChzdGF0ZW1lbnQuY29sdW1uKSArICcgJyArIHRoaXMuX25vdChzdGF0ZW1lbnQsICdiZXR3ZWVuJykgKyAnICcgK1xuICAgICAgbWFwKHN0YXRlbWVudC52YWx1ZSwgYmluZCh0aGlzLmZvcm1hdHRlci5wYXJhbWV0ZXIsIHRoaXMuZm9ybWF0dGVyKSkuam9pbignIGFuZCAnKTtcbiAgfSxcblxuICAvLyBDb21waWxlcyBhIFwid2hlcmVSYXdcIiBxdWVyeS5cbiAgd2hlcmVSYXcoc3RhdGVtZW50KSB7XG4gICAgcmV0dXJuIHRoaXMuX25vdChzdGF0ZW1lbnQsICcnKSArIHRoaXMuZm9ybWF0dGVyLnVud3JhcFJhdyhzdGF0ZW1lbnQudmFsdWUpO1xuICB9LFxuXG4gIHdyYXAoc3RyKSB7XG4gICAgaWYgKHN0ci5jaGFyQXQoMCkgIT09ICcoJykgcmV0dXJuIGAoJHtzdHJ9KWA7XG4gICAgcmV0dXJuIHN0cjtcbiAgfSxcblxuICAvLyBEZXRlcm1pbmVzIHdoZXRoZXIgdG8gYWRkIGEgXCJub3RcIiBwcmVmaXggdG8gdGhlIHdoZXJlIGNsYXVzZS5cbiAgX25vdChzdGF0ZW1lbnQsIHN0cikge1xuICAgIGlmIChzdGF0ZW1lbnQubm90KSByZXR1cm4gYG5vdCAke3N0cn1gO1xuICAgIHJldHVybiBzdHI7XG4gIH0sXG5cbiAgX3ByZXBJbnNlcnQoZGF0YSkge1xuICAgIGNvbnN0IGlzUmF3ID0gdGhpcy5mb3JtYXR0ZXIucmF3T3JGbihkYXRhKTtcbiAgICBpZiAoaXNSYXcpIHJldHVybiBpc1JhdztcbiAgICBsZXQgY29sdW1ucyA9IFtdO1xuICAgIGNvbnN0IHZhbHVlcyA9IFtdO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShkYXRhKSkgZGF0YSA9IGRhdGEgPyBbZGF0YV0gOiBbXTtcbiAgICBsZXQgaSA9IC0xXG4gICAgd2hpbGUgKCsraSA8IGRhdGEubGVuZ3RoKSB7XG4gICAgICBpZiAoZGF0YVtpXSA9PSBudWxsKSBicmVhaztcbiAgICAgIGlmIChpID09PSAwKSBjb2x1bW5zID0gT2JqZWN0LmtleXMoZGF0YVtpXSkuc29ydCgpXG4gICAgICBjb25zdCByb3cgPSBuZXcgQXJyYXkoY29sdW1ucy5sZW5ndGgpXG4gICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMoZGF0YVtpXSlcbiAgICAgIGxldCBqID0gLTFcbiAgICAgIHdoaWxlICgrK2ogPCBrZXlzLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBrZXkgPSBrZXlzW2pdO1xuICAgICAgICBsZXQgaWR4ID0gY29sdW1ucy5pbmRleE9mKGtleSk7XG4gICAgICAgIGlmIChpZHggPT09IC0xKSB7XG4gICAgICAgICAgY29sdW1ucyA9IGNvbHVtbnMuY29uY2F0KGtleSkuc29ydCgpXG4gICAgICAgICAgaWR4ID0gY29sdW1ucy5pbmRleE9mKGtleSlcbiAgICAgICAgICBsZXQgayA9IC0xXG4gICAgICAgICAgd2hpbGUgKCsrayA8IHZhbHVlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHZhbHVlc1trXS5zcGxpY2UoaWR4LCAwLCB1bmRlZmluZWQpXG4gICAgICAgICAgfVxuICAgICAgICAgIHJvdy5zcGxpY2UoaWR4LCAwLCB1bmRlZmluZWQpXG4gICAgICAgIH1cbiAgICAgICAgcm93W2lkeF0gPSBkYXRhW2ldW2tleV1cbiAgICAgIH1cbiAgICAgIHZhbHVlcy5wdXNoKHJvdylcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbHVtbnMsXG4gICAgICB2YWx1ZXNcbiAgICB9O1xuICB9LFxuXG4gIC8vIFwiUHJlcHNcIiB0aGUgdXBkYXRlLlxuICBfcHJlcFVwZGF0ZShkYXRhKSB7XG4gICAgZGF0YSA9IG9taXRCeShkYXRhLCBpc1VuZGVmaW5lZClcbiAgICBjb25zdCB2YWxzID0gW11cbiAgICBjb25zdCBzb3J0ZWQgPSBPYmplY3Qua2V5cyhkYXRhKS5zb3J0KClcbiAgICBsZXQgaSA9IC0xXG4gICAgd2hpbGUgKCsraSA8IHNvcnRlZC5sZW5ndGgpIHtcbiAgICAgIHZhbHMucHVzaChcbiAgICAgICAgdGhpcy5mb3JtYXR0ZXIud3JhcChzb3J0ZWRbaV0pICtcbiAgICAgICAgJyA9ICcgK1xuICAgICAgICB0aGlzLmZvcm1hdHRlci5wYXJhbWV0ZXIoZGF0YVtzb3J0ZWRbaV1dKVxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHM7XG4gIH0sXG5cbiAgLy8gQ29tcGlsZXMgdGhlIGBvcmRlciBieWAgc3RhdGVtZW50cy5cbiAgX2dyb3Vwc09yZGVycyh0eXBlKSB7XG4gICAgY29uc3QgaXRlbXMgPSB0aGlzLmdyb3VwZWRbdHlwZV07XG4gICAgaWYgKCFpdGVtcykgcmV0dXJuICcnO1xuICAgIGNvbnN0IHsgZm9ybWF0dGVyIH0gPSB0aGlzO1xuICAgIGNvbnN0IHNxbCA9IGl0ZW1zLm1hcChpdGVtID0+IHtcbiAgICAgIGNvbnN0IGNvbHVtbiA9IGl0ZW0udmFsdWUgaW5zdGFuY2VvZiBSYXdcbiAgICAgICAgPyBmb3JtYXR0ZXIudW53cmFwUmF3KGl0ZW0udmFsdWUpXG4gICAgICAgIDogZm9ybWF0dGVyLmNvbHVtbml6ZShpdGVtLnZhbHVlKTtcbiAgICAgIGNvbnN0IGRpcmVjdGlvbiA9IHR5cGUgPT09ICdvcmRlcicgJiYgaXRlbS50eXBlICE9PSAnb3JkZXJCeVJhdydcbiAgICAgICAgPyBgICR7Zm9ybWF0dGVyLmRpcmVjdGlvbihpdGVtLmRpcmVjdGlvbil9YFxuICAgICAgICA6ICcnO1xuICAgICAgcmV0dXJuIGNvbHVtbiArIGRpcmVjdGlvbjtcbiAgICB9KTtcbiAgICByZXR1cm4gc3FsLmxlbmd0aCA/IHR5cGUgKyAnIGJ5ICcgKyBzcWwuam9pbignLCAnKSA6ICcnO1xuICB9XG5cbn0pXG5cblF1ZXJ5Q29tcGlsZXIucHJvdG90eXBlLmZpcnN0ID0gUXVlcnlDb21waWxlci5wcm90b3R5cGUuc2VsZWN0O1xuXG4vLyBHZXQgdGhlIHRhYmxlIG5hbWUsIHdyYXBwaW5nIGl0IGlmIG5lY2Vzc2FyeS5cbi8vIEltcGxlbWVudGVkIGFzIGEgcHJvcGVydHkgdG8gcHJldmVudCBvcmRlcmluZyBpc3N1ZXMgYXMgZGVzY3JpYmVkIGluICM3MDQuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUXVlcnlDb21waWxlci5wcm90b3R5cGUsICd0YWJsZU5hbWUnLCB7XG4gIGdldCgpIHtcbiAgICBpZighdGhpcy5fdGFibGVOYW1lKSB7XG4gICAgICAvLyBPbmx5IGNhbGwgdGhpcy5mb3JtYXR0ZXIud3JhcCgpIHRoZSBmaXJzdCB0aW1lIHRoaXMgcHJvcGVydHkgaXMgYWNjZXNzZWQuXG4gICAgICBsZXQgdGFibGVOYW1lID0gdGhpcy5zaW5nbGUudGFibGU7XG4gICAgICBjb25zdCBzY2hlbWFOYW1lID0gdGhpcy5zaW5nbGUuc2NoZW1hO1xuXG4gICAgICBpZiAodGFibGVOYW1lICYmIHNjaGVtYU5hbWUpIHRhYmxlTmFtZSA9IGAke3NjaGVtYU5hbWV9LiR7dGFibGVOYW1lfWA7XG5cbiAgICAgIHRoaXMuX3RhYmxlTmFtZSA9IHRhYmxlTmFtZSA/IHRoaXMuZm9ybWF0dGVyLndyYXAodGFibGVOYW1lKSA6ICcnO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fdGFibGVOYW1lO1xuICB9XG59KTtcblxuXG5leHBvcnQgZGVmYXVsdCBRdWVyeUNvbXBpbGVyO1xuIl19