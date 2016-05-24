var five = require("johnny-five");
var board = new five.Board();

fiv.Board({
  port: "/dev/cu.usbmodem1411"
})

board.on("ready", function() {

  // Create a standard `led` component instance
  var led = new five.Led(13);

  // "blink" the led in 500ms
  // on-off phase periods
  led.blink(500);
});
