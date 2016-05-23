/* eslint no-console:0 */

'use strict';

exports.__esModule = true;
exports.skim = skim;
exports.normalizeArr = normalizeArr;
exports.debugLog = debugLog;
exports.error = error;
exports.deprecate = deprecate;
exports.warn = warn;
exports.exit = exit;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodash = require('lodash');

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

// Pick off the attributes from only the current layer of the object.

function skim(data) {
  return _lodash.map(data, function (obj) {
    return _lodash.pick(obj, _lodash.keys(obj));
  });
}

// Check if the first argument is an array, otherwise uses all arguments as an
// array.

function normalizeArr() {
  var args = new Array(arguments.length);
  for (var i = 0; i < args.length; i++) {
    args[i] = arguments[i];
  }
  if (Array.isArray(args[0])) {
    return args[0];
  }
  return args;
}

function debugLog(msg) {
  console.log(msg);
}

function error(msg) {
  console.log(_chalk2['default'].red('Knex:Error ' + msg));
}

// Used to signify deprecated functionality.

function deprecate(method, alternate) {
  warn(method + ' is deprecated, please use ' + alternate);
}

// Used to warn about incorrect use, without error'ing

function warn(msg) {
  console.log(_chalk2['default'].yellow('Knex:warning - ' + msg));
}

function exit(msg) {
  console.log(_chalk2['default'].red(msg));
  process.exit(1);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9oZWxwZXJzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztzQkFFZ0MsUUFBUTs7cUJBQ3RCLE9BQU87Ozs7OztBQUdsQixTQUFTLElBQUksQ0FBQyxJQUFJLEVBQUU7QUFDekIsU0FBTyxZQUFJLElBQUksRUFBRSxVQUFDLEdBQUc7V0FBSyxhQUFLLEdBQUcsRUFBRSxhQUFLLEdBQUcsQ0FBQyxDQUFDO0dBQUEsQ0FBQyxDQUFDO0NBQ2pEOzs7OztBQUlNLFNBQVMsWUFBWSxHQUFHO0FBQzdCLE1BQU0sSUFBSSxHQUFHLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN6QyxPQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUNwQyxRQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0dBQ3hCO0FBQ0QsTUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzFCLFdBQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0dBQ2hCO0FBQ0QsU0FBTyxJQUFJLENBQUM7Q0FDYjs7QUFFTSxTQUFTLFFBQVEsQ0FBQyxHQUFHLEVBQUU7QUFDNUIsU0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztDQUNsQjs7QUFFTSxTQUFTLEtBQUssQ0FBQyxHQUFHLEVBQUU7QUFDekIsU0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBTSxHQUFHLGlCQUFlLEdBQUcsQ0FBRyxDQUFDLENBQUE7Q0FDNUM7Ozs7QUFHTSxTQUFTLFNBQVMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFO0FBQzNDLE1BQUksQ0FBSSxNQUFNLG1DQUE4QixTQUFTLENBQUcsQ0FBQztDQUMxRDs7OztBQUdNLFNBQVMsSUFBSSxDQUFDLEdBQUcsRUFBRTtBQUN4QixTQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFNLE1BQU0scUJBQW1CLEdBQUcsQ0FBRyxDQUFDLENBQUE7Q0FDbkQ7O0FBRU0sU0FBUyxJQUFJLENBQUMsR0FBRyxFQUFFO0FBQ3hCLFNBQU8sQ0FBQyxHQUFHLENBQUMsbUJBQU0sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFDM0IsU0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtDQUNoQiIsImZpbGUiOiJoZWxwZXJzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50IG5vLWNvbnNvbGU6MCAqL1xuXG5pbXBvcnQgeyBtYXAsIHBpY2ssIGtleXMgfSBmcm9tICdsb2Rhc2gnXG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuXG4vLyBQaWNrIG9mZiB0aGUgYXR0cmlidXRlcyBmcm9tIG9ubHkgdGhlIGN1cnJlbnQgbGF5ZXIgb2YgdGhlIG9iamVjdC5cbmV4cG9ydCBmdW5jdGlvbiBza2ltKGRhdGEpIHtcbiAgcmV0dXJuIG1hcChkYXRhLCAob2JqKSA9PiBwaWNrKG9iaiwga2V5cyhvYmopKSk7XG59XG5cbi8vIENoZWNrIGlmIHRoZSBmaXJzdCBhcmd1bWVudCBpcyBhbiBhcnJheSwgb3RoZXJ3aXNlIHVzZXMgYWxsIGFyZ3VtZW50cyBhcyBhblxuLy8gYXJyYXkuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplQXJyKCkge1xuICBjb25zdCBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGgpO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICBhcmdzW2ldID0gYXJndW1lbnRzW2ldO1xuICB9XG4gIGlmIChBcnJheS5pc0FycmF5KGFyZ3NbMF0pKSB7XG4gICAgcmV0dXJuIGFyZ3NbMF07XG4gIH1cbiAgcmV0dXJuIGFyZ3M7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWJ1Z0xvZyhtc2cpIHtcbiAgY29uc29sZS5sb2cobXNnKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVycm9yKG1zZykge1xuICBjb25zb2xlLmxvZyhjaGFsay5yZWQoYEtuZXg6RXJyb3IgJHttc2d9YCkpXG59XG5cbiAgLy8gVXNlZCB0byBzaWduaWZ5IGRlcHJlY2F0ZWQgZnVuY3Rpb25hbGl0eS5cbmV4cG9ydCBmdW5jdGlvbiBkZXByZWNhdGUobWV0aG9kLCBhbHRlcm5hdGUpIHtcbiAgd2FybihgJHttZXRob2R9IGlzIGRlcHJlY2F0ZWQsIHBsZWFzZSB1c2UgJHthbHRlcm5hdGV9YCk7XG59XG5cbiAgLy8gVXNlZCB0byB3YXJuIGFib3V0IGluY29ycmVjdCB1c2UsIHdpdGhvdXQgZXJyb3InaW5nXG5leHBvcnQgZnVuY3Rpb24gd2Fybihtc2cpIHtcbiAgY29uc29sZS5sb2coY2hhbGsueWVsbG93KGBLbmV4Ondhcm5pbmcgLSAke21zZ31gKSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4aXQobXNnKSB7XG4gIGNvbnNvbGUubG9nKGNoYWxrLnJlZChtc2cpKVxuICBwcm9jZXNzLmV4aXQoMSlcbn1cbiJdfQ==