
// MySQL Column Compiler
// -------
'use strict';

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _inherits = require('inherits');

var _inherits2 = _interopRequireDefault(_inherits);

var _schemaColumncompiler = require('../../../schema/columncompiler');

var _schemaColumncompiler2 = _interopRequireDefault(_schemaColumncompiler);

var _helpers = require('../../../helpers');

var helpers = _interopRequireWildcard(_helpers);

var _lodash = require('lodash');

function ColumnCompiler_MSSQL() {
  _schemaColumncompiler2['default'].apply(this, arguments);
  this.modifiers = ['nullable', 'defaultTo', 'first', 'after', 'comment'];
}
_inherits2['default'](ColumnCompiler_MSSQL, _schemaColumncompiler2['default']);

// Types
// ------

_lodash.assign(ColumnCompiler_MSSQL.prototype, {

  increments: 'int identity(1,1) not null primary key',

  bigincrements: 'bigint identity(1,1) not null primary key',

  bigint: 'bigint',

  double: function double(precision, scale) {
    if (!precision) return 'double';
    return 'double(' + this._num(precision, 8) + ', ' + this._num(scale, 2) + ')';
  },

  integer: function integer(length) {
    length = length ? '(' + this._num(length, 11) + ')' : '';
    return 'int' + length;
  },

  mediumint: 'mediumint',

  smallint: 'smallint',

  tinyint: function tinyint(length) {
    length = length ? '(' + this._num(length, 1) + ')' : '';
    return 'tinyint' + length;
  },

  varchar: function varchar(length) {
    return 'nvarchar(' + this._num(length, 255) + ')';
  },

  text: 'nvarchar(max)',

  mediumtext: 'nvarchar(max)',

  longtext: 'nvarchar(max)',

  enu: 'nvarchar(100)',

  uuid: 'uniqueidentifier',

  datetime: 'datetime',

  timestamp: 'datetime',

  bit: function bit(length) {
    return length ? 'bit(' + this._num(length) + ')' : 'bit';
  },

  binary: function binary(length) {
    return length ? 'varbinary(' + this._num(length) + ')' : 'blob';
  },

  bool: 'bit',

  // Modifiers
  // ------

  defaultTo: function defaultTo(value) {
    var defaultVal = ColumnCompiler_MSSQL.super_.prototype.defaultTo.apply(this, arguments);
    if (this.type !== 'blob' && this.type.indexOf('text') === -1) {
      return defaultVal;
    }
    return '';
  },

  first: function first() {
    return 'first';
  },

  after: function after(column) {
    return 'after ' + this.formatter.wrap(column);
  },

  comment: function comment(_comment) {
    if (_comment && _comment.length > 255) {
      helpers.warn('Your comment is longer than the max comment length for MSSQL');
    }
    return '';
  }

});

exports['default'] = ColumnCompiler_MSSQL;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9kaWFsZWN0cy9tc3NxbC9zY2hlbWEvY29sdW1uY29tcGlsZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7d0JBR3FCLFVBQVU7Ozs7b0NBQ0osZ0NBQWdDOzs7O3VCQUNsQyxrQkFBa0I7O0lBQS9CLE9BQU87O3NCQUVJLFFBQVE7O0FBRS9CLFNBQVMsb0JBQW9CLEdBQUc7QUFDOUIsb0NBQWUsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztBQUN0QyxNQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0NBQ3hFO0FBQ0Qsc0JBQVMsb0JBQW9CLG9DQUFpQixDQUFDOzs7OztBQUsvQyxlQUFPLG9CQUFvQixDQUFDLFNBQVMsRUFBRTs7QUFFckMsWUFBVSxFQUFFLHdDQUF3Qzs7QUFFcEQsZUFBYSxFQUFFLDJDQUEyQzs7QUFFMUQsUUFBTSxFQUFFLFFBQVE7O0FBRWhCLFFBQU0sRUFBQSxnQkFBQyxTQUFTLEVBQUUsS0FBSyxFQUFFO0FBQ3ZCLFFBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxRQUFRLENBQUE7QUFDL0IsdUJBQWlCLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxVQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxPQUFHO0dBQ3BFOztBQUVELFNBQU8sRUFBQSxpQkFBQyxNQUFNLEVBQUU7QUFDZCxVQUFNLEdBQUcsTUFBTSxTQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxTQUFNLEVBQUUsQ0FBQTtBQUNuRCxtQkFBYSxNQUFNLENBQUU7R0FDdEI7O0FBRUQsV0FBUyxFQUFFLFdBQVc7O0FBRXRCLFVBQVEsRUFBRSxVQUFVOztBQUVwQixTQUFPLEVBQUEsaUJBQUMsTUFBTSxFQUFFO0FBQ2QsVUFBTSxHQUFHLE1BQU0sU0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsU0FBTSxFQUFFLENBQUE7QUFDbEQsdUJBQWlCLE1BQU0sQ0FBRTtHQUMxQjs7QUFFRCxTQUFPLEVBQUEsaUJBQUMsTUFBTSxFQUFFO0FBQ2QseUJBQW1CLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxPQUFJO0dBQzlDOztBQUVELE1BQUksRUFBRSxlQUFlOztBQUVyQixZQUFVLEVBQUUsZUFBZTs7QUFFM0IsVUFBUSxFQUFFLGVBQWU7O0FBRXpCLEtBQUcsRUFBRSxlQUFlOztBQUVwQixNQUFJLEVBQUUsa0JBQWtCOztBQUV4QixVQUFRLEVBQUUsVUFBVTs7QUFFcEIsV0FBUyxFQUFFLFVBQVU7O0FBRXJCLEtBQUcsRUFBQSxhQUFDLE1BQU0sRUFBRTtBQUNWLFdBQU8sTUFBTSxZQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQU0sS0FBSyxDQUFBO0dBQ3BEOztBQUVELFFBQU0sRUFBQSxnQkFBQyxNQUFNLEVBQUU7QUFDYixXQUFPLE1BQU0sa0JBQWdCLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQU0sTUFBTSxDQUFBO0dBQzNEOztBQUVELE1BQUksRUFBRSxLQUFLOzs7OztBQUtYLFdBQVMsRUFBQSxtQkFBQyxLQUFLLEVBQUU7QUFDZixRQUFNLFVBQVUsR0FBRyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQzFGLFFBQUksSUFBSSxDQUFDLElBQUksS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUU7QUFDNUQsYUFBTyxVQUFVLENBQUE7S0FDbEI7QUFDRCxXQUFPLEVBQUUsQ0FBQTtHQUNWOztBQUVELE9BQUssRUFBQSxpQkFBRztBQUNOLFdBQU8sT0FBTyxDQUFBO0dBQ2Y7O0FBRUQsT0FBSyxFQUFBLGVBQUMsTUFBTSxFQUFFO0FBQ1osc0JBQWdCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFFO0dBQzlDOztBQUVELFNBQU8sRUFBQSxpQkFBQyxRQUFPLEVBQUU7QUFDZixRQUFJLFFBQU8sSUFBSSxRQUFPLENBQUMsTUFBTSxHQUFHLEdBQUcsRUFBRTtBQUNuQyxhQUFPLENBQUMsSUFBSSxDQUFDLDhEQUE4RCxDQUFDLENBQUE7S0FDN0U7QUFDRCxXQUFPLEVBQUUsQ0FBQTtHQUNWOztDQUVGLENBQUMsQ0FBQTs7cUJBRWEsb0JBQW9CIiwiZmlsZSI6ImNvbHVtbmNvbXBpbGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vLyBNeVNRTCBDb2x1bW4gQ29tcGlsZXJcbi8vIC0tLS0tLS1cbmltcG9ydCBpbmhlcml0cyBmcm9tICdpbmhlcml0cyc7XG5pbXBvcnQgQ29sdW1uQ29tcGlsZXIgZnJvbSAnLi4vLi4vLi4vc2NoZW1hL2NvbHVtbmNvbXBpbGVyJztcbmltcG9ydCAqIGFzIGhlbHBlcnMgZnJvbSAnLi4vLi4vLi4vaGVscGVycyc7XG5cbmltcG9ydCB7IGFzc2lnbiB9IGZyb20gJ2xvZGFzaCdcblxuZnVuY3Rpb24gQ29sdW1uQ29tcGlsZXJfTVNTUUwoKSB7XG4gIENvbHVtbkNvbXBpbGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIHRoaXMubW9kaWZpZXJzID0gWydudWxsYWJsZScsICdkZWZhdWx0VG8nLCAnZmlyc3QnLCAnYWZ0ZXInLCAnY29tbWVudCddXG59XG5pbmhlcml0cyhDb2x1bW5Db21waWxlcl9NU1NRTCwgQ29sdW1uQ29tcGlsZXIpO1xuXG4vLyBUeXBlc1xuLy8gLS0tLS0tXG5cbmFzc2lnbihDb2x1bW5Db21waWxlcl9NU1NRTC5wcm90b3R5cGUsIHtcblxuICBpbmNyZW1lbnRzOiAnaW50IGlkZW50aXR5KDEsMSkgbm90IG51bGwgcHJpbWFyeSBrZXknLFxuXG4gIGJpZ2luY3JlbWVudHM6ICdiaWdpbnQgaWRlbnRpdHkoMSwxKSBub3QgbnVsbCBwcmltYXJ5IGtleScsXG5cbiAgYmlnaW50OiAnYmlnaW50JyxcblxuICBkb3VibGUocHJlY2lzaW9uLCBzY2FsZSkge1xuICAgIGlmICghcHJlY2lzaW9uKSByZXR1cm4gJ2RvdWJsZSdcbiAgICByZXR1cm4gYGRvdWJsZSgke3RoaXMuX251bShwcmVjaXNpb24sIDgpfSwgJHt0aGlzLl9udW0oc2NhbGUsIDIpfSlgXG4gIH0sXG5cbiAgaW50ZWdlcihsZW5ndGgpIHtcbiAgICBsZW5ndGggPSBsZW5ndGggPyBgKCR7dGhpcy5fbnVtKGxlbmd0aCwgMTEpfSlgIDogJydcbiAgICByZXR1cm4gYGludCR7bGVuZ3RofWBcbiAgfSxcblxuICBtZWRpdW1pbnQ6ICdtZWRpdW1pbnQnLFxuXG4gIHNtYWxsaW50OiAnc21hbGxpbnQnLFxuXG4gIHRpbnlpbnQobGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gbGVuZ3RoID8gYCgke3RoaXMuX251bShsZW5ndGgsIDEpfSlgIDogJydcbiAgICByZXR1cm4gYHRpbnlpbnQke2xlbmd0aH1gXG4gIH0sXG5cbiAgdmFyY2hhcihsZW5ndGgpIHtcbiAgICByZXR1cm4gYG52YXJjaGFyKCR7dGhpcy5fbnVtKGxlbmd0aCwgMjU1KX0pYDtcbiAgfSxcblxuICB0ZXh0OiAnbnZhcmNoYXIobWF4KScsXG5cbiAgbWVkaXVtdGV4dDogJ252YXJjaGFyKG1heCknLFxuXG4gIGxvbmd0ZXh0OiAnbnZhcmNoYXIobWF4KScsXG5cbiAgZW51OiAnbnZhcmNoYXIoMTAwKScsXG5cbiAgdXVpZDogJ3VuaXF1ZWlkZW50aWZpZXInLFxuXG4gIGRhdGV0aW1lOiAnZGF0ZXRpbWUnLFxuXG4gIHRpbWVzdGFtcDogJ2RhdGV0aW1lJyxcblxuICBiaXQobGVuZ3RoKSB7XG4gICAgcmV0dXJuIGxlbmd0aCA/IGBiaXQoJHt0aGlzLl9udW0obGVuZ3RoKX0pYCA6ICdiaXQnXG4gIH0sXG5cbiAgYmluYXJ5KGxlbmd0aCkge1xuICAgIHJldHVybiBsZW5ndGggPyBgdmFyYmluYXJ5KCR7dGhpcy5fbnVtKGxlbmd0aCl9KWAgOiAnYmxvYidcbiAgfSxcblxuICBib29sOiAnYml0JyxcblxuICAvLyBNb2RpZmllcnNcbiAgLy8gLS0tLS0tXG5cbiAgZGVmYXVsdFRvKHZhbHVlKSB7XG4gICAgY29uc3QgZGVmYXVsdFZhbCA9IENvbHVtbkNvbXBpbGVyX01TU1FMLnN1cGVyXy5wcm90b3R5cGUuZGVmYXVsdFRvLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKHRoaXMudHlwZSAhPT0gJ2Jsb2InICYmIHRoaXMudHlwZS5pbmRleE9mKCd0ZXh0JykgPT09IC0xKSB7XG4gICAgICByZXR1cm4gZGVmYXVsdFZhbFxuICAgIH1cbiAgICByZXR1cm4gJydcbiAgfSxcblxuICBmaXJzdCgpIHtcbiAgICByZXR1cm4gJ2ZpcnN0J1xuICB9LFxuXG4gIGFmdGVyKGNvbHVtbikge1xuICAgIHJldHVybiBgYWZ0ZXIgJHt0aGlzLmZvcm1hdHRlci53cmFwKGNvbHVtbil9YFxuICB9LFxuXG4gIGNvbW1lbnQoY29tbWVudCkge1xuICAgIGlmIChjb21tZW50ICYmIGNvbW1lbnQubGVuZ3RoID4gMjU1KSB7XG4gICAgICBoZWxwZXJzLndhcm4oJ1lvdXIgY29tbWVudCBpcyBsb25nZXIgdGhhbiB0aGUgbWF4IGNvbW1lbnQgbGVuZ3RoIGZvciBNU1NRTCcpXG4gICAgfVxuICAgIHJldHVybiAnJ1xuICB9XG5cbn0pXG5cbmV4cG9ydCBkZWZhdWx0IENvbHVtbkNvbXBpbGVyX01TU1FMO1xuIl19