var Board = require("./board");
var Fn = require("./fn");
// var Emitter = require("events").Emitter;
var util = require("util");

var priv = new Map();

function I2C(options) {

  if (!(this instanceof I2C)) {
    return new I2C(options);
  }

  Board.Component.call(
    this, options = Board.Options(options)
  );

  var state = {
    address: options
  };

  Object.defineProperty(this, {
    address: {
      get: function() {
        return state.address;
      },
    },
  });

  priv.set(this, state);

  this.io.i2cConfig(options);
}

function flatten(list) {
  return list.reduce(function(accum, entry) {
    if (Array.isArray(entry)) {
      return accum.concat(entry);
    }
    accum.push(entry);
    return accum;
  }, []);
}

/**
 * write Write bytes to I2C bus.
 *
 * @return {I2C}
 */
I2C.prototype.write = function() {
  // (register, byte)
  // (command, byte)
  // (register, [data])
  // (command, [data])
  // ([data])
  // ([d1][, d2])
  this.io.i2cWrite.apply(this.io, [this.address].concat(flatten(Array.from(arguments))));

  return this;
};

/**
 * readOnce Read bytes from I2C bus, _once_
 *           T
 *
 * @return {Promise}
 */
I2C.prototype.readOnce = function(register, length, handler) {
  var args = Array.from(arguments);

  // Called without a register
  if (handler === undefined && typeof length === "function") {
    handler = length;
    length = register;
  }

  // (register, length, function() {})
  // (length, function() {})
  this.io.i2cReadOnce.apply(this.address, flatten(Array.from(arguments)));

  return new Promise(function(resolve) {

  });
};

/**
 * read Read bytes from I2C bus
 *
 * @return {Promise}
 */
I2C.prototype.read = function() {
  // (register, length, function() {})
  // (length, function() {})
  this.io.i2cRead.apply(this.io, [this.address].concat(flatten(Array.from(arguments))));
};

