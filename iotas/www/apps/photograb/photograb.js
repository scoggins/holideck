/*
	@file: apps/photograb/photograb.js
*/

var photograb_img = null; // Hmm, not used…

function photograb() {
	
	// Start & Stop
	this.appStart = appStart;
	this.appQuit = appQuit;
	
	// Functions (We Register Functions?)
	this.drawPaintArea = drawPaintArea;
	this.clr2hex = clr2hex;
	this.lastTouch = null;
	this.setCanvasSize = setCanvasSize;
	this.mpImg = null;
	this.getPageOffset = getPageOffset;
	
	// Coords
	this.mouseX = 0;
	this.mouseY = 0;
	
	// Colors
	this.theRed = 0;
	this.theGreen = 0;
	this.theBlue = 0;
	
	// RGB
	this.r = 0;
	this.g = 0;
	this.b = 0;
	
	// Canvases
	this.theCanvas = document.getElementById('canvas');
	this.context = this.theCanvas.getContext('2d');
	this.thePainter = document.getElementById('paintarea');
	this.painterContext = this.thePainter.getContext('2d');
	
	// Listeners
	this.theCanvas.addEventListener("mousemove", onSampMouseMove, false);
	//this.theCanvas.addEventListener("click", onSampMouseClick, false);
	//this.theCanvas.addEventListener("touchstart", onSampTouchStart, false);
	//this.theCanvas.addEventListener("touchmove", onSampTouchMove, false);
	this.thePainter.addEventListener("mousemove", onPaintMouseMove, false);
	this.thePainter.addEventListener("click", onPaintMouseClick, false);
	this.thePainter.addEventListener("touchstart", onPaintTouchStart, false);
	this.thePainter.addEventListener("touchmove", onPaintTouchMove, false);

	// Are we running on a Retina-class display?
	// If so, track the pixel ratio, as we'll need it.
	this.devicePixelRatio = 1;
	if ('devicePixelRatio' in window) {
		this.devicePixelRatio = window.devicePixelRatio;
	}
	console.log("The devicePixelRatio is: ", this.devicePixelRatio);

	function appStart() {
		console.log("photograb.appStart");
		$('head').append('<link rel="stylesheet" href="photograb.css" />'); // Muy importante!
		sampApp();
		setTimeout(function() {
			setCanvasSize();
			setPainterSize();
		}, 500);
	}
	
	$(window).resize(function() {
		setCanvasSize();
		setPainterSize();
	});
	
	function appQuit() {
		console.log("photograb.appQuit");
	}
	
	function setCanvasSize() {

		console.log("photograb.setCanvasSize");
		
		var w = $('.canvas-container').width();
		var h = $('.canvas-container').height();
		
		var wRetina = w * theApp.devicePixelRatio;
		var hRetina = h * theApp.devicePixelRatio;
		
		// Bad: Canvas Exceeds Viewport
		//$('#canvas').attr('width', wRetina);
		//$('#canvas').attr('height', hRetina);
		
		// Bad: Canvas’ Image Not Full Size
		$('#canvas').attr('width', w);
		$('#canvas').attr('height', h);
		
		// PROBLEM
		// Note, initially the canvas is 100% wide but just 290px high, which inputs to this problem
		// Function handleFiles() image is set using maxWidth and maxHeight
		// But this misbehaves depending on a portrait or landscape image, i.e.
		// Whichever is the smallest, constrains the image size
		// This rendering constraint is recursive, subsequent images get smaller and smaller :)
		// Load a portrait followed by a landscape, rinse & repeat, to see this recursion in action
		
		// PROPOSAL
		// Something like…
		// Find the aspect ratio, or the larger of the image width or height
		// Then render the image constrained by that dimension, and not the other
		// Question is, how, considering megapix-image.js
		
		// SOLUTION ONE (Mediocre)
		// Set maxHeight manually to 1024px 
		// Note, this is based on iPad height in line with the 768px responsive max width
		// This (poorly) assumes portrait orientation, but allows a max size load for most images
		// Note, the below function works okay, because canvas has already been resized
		// Note, it’s the handleFiles() function that has this dimension update
		
		// Resized So Redraw
		if (theApp.mpImg != null) {
			var resCanvas1 = document.getElementById('canvas');
			theApp.mpImg.render(resCanvas1, { maxWidth: theApp.theCanvas.width, maxHeight: theApp.theCanvas.height });
		}
	}
	
	function setPainterSize() {
		console.log("photograb.setPaintAreaSize");
		//var w = $('.paintarea-container').width();
		var w = $('.paintarea-container').width() / 2;
		//var h = $('.paintarea-container').height();
		var h = 50;
		$('#paintarea').attr('width', w);
		$('#paintarea').attr('height', h);
	}
	
	function drawPaintArea() {
		
		console.log("photograb.drawPaintArea");
		
		// Take the fastlights values and render them to the paint area
		// This should reflect any user strokes to the paint area. We hope.
		
		// Get Painter Dimensions
		var w = theApp.thePainter.width;
		var h = theApp.thePainter.height;
		
		// Width / 50 Globes
		var i = w / 50.0;
		
		// Start 0
		var startWidth = 0;
		
		// Loop Globes
		for (var j = 0; j < 50; j++) {

			// Get Current Light Colour
			var clr = currentLight.fastbulbs[j];
			// Convert To Hex Value
			var clh = theApp.clr2hex(clr);
			
			// Paint One Globe
			theApp.painterContext.beginPath();
			theApp.painterContext.rect(startWidth, 0, i, h);
			theApp.painterContext.fillStyle = clh;
			theApp.painterContext.fill();
			
			// Increment Start
			startWidth += i;
			
		}

		// Convert RGB to Colour
		redstr = theApp.r.toString(16);
		if (redstr.length < 2) {
			redstr = "0" + redstr;
		}
		greenstr = theApp.g.toString(16);
		if (greenstr.length < 2) {
			greenstr = "0" + greenstr;
		}
		bluestr = theApp.b.toString(16);
		if (bluestr.length < 2) {
			bluestr = "0" + bluestr;
		}
		clh = "#" + redstr + greenstr + bluestr;
		
		// Outline Painter With Colour
		theApp.painterContext.beginPath();
		theApp.painterContext.rect(0, 0, w, h);
		theApp.painterContext.lineWidth = 1;
		theApp.painterContext.strokeStyle = clh;
		theApp.painterContext.stroke();
		
		$("#pick").css('background-color', clh);

	}

	$('#canvas').bind('vmousedown', function(e) {
		console.log('photograb.vmousedown');
		e.preventDefault();
	  	var pos = theApp.getPageOffset(this);
	  	var x = e.pageX - pos.x;
	  	var y = e.pageY - pos.y;

		// New RGB
		var rgb = theApp.context.getImageData(x, y, 1, 1).data;
		theApp.r = rgb[0];
		theApp.g = rgb[1];
		theApp.b = rgb[2];
		
		// UI Output
		var colour = "#" + rgbToHex(theApp.r, theApp.g, theApp.b);
		$(".canvas").html("Canvas: " + x + " / " + y + " (#" + colour + ")");
		
		// Refresh
		theApp.drawPaintArea();
		theApp.lastTouch = new Date().getTime();
	});
	
	$('#canvas').bind('touchmove', function(e) {
		console.log("photograb.touchmove");
		console.log(e);
		e.preventDefault();
		curr = new Date().getTime();
		if ((curr - theApp.lastTouch) > 100) {
			  console.log("Accepting touchmove");
	 		  var touchpt = e.originalEvent.touches[0];
			  var pos = theApp.getPageOffset(this);
			  var x = touchpt.pageX - pos.x;
			  var y = touchpt.pageY - pos.y;
			  var c = document.getElementById('canvas').getContext('2d');

			// New RGB
			var rgb = c.getImageData(x, y, 1, 1).data;
			theApp.r = rgb[0];
			theApp.g = rgb[1];
			theApp.b = rgb[2];
			
			// UI Output
			var colour = rgbToHex(theApp.r, theApp.g, theApp.b);
			$(".canvas").html("Canvas: " + x + " / " + y + " (#" + colour + ")");
		
			// Refresh
			theApp.drawPaintArea();
			theApp.lastTouch = new Date().getTime();
		} /*else {
			console.log("Declining touchmove");
		}*/
	});


	function onPaintMouseMove(e) {
		console.log('photograb.onPaintMouseMove');
	}

	function onPaintMouseClick(e) {
		
		console.log('photograb.onPaintMouseClick');
		
		// Paint Click Coordinates
		var pos = getPageOffset(this);
		var x = e.pageX - pos.x;
	  var y = e.pageY - pos.y;
	  //console.log("X: " + x + ", Y: " + y);

		// Get Painter Dimensions
		var w = theApp.thePainter.width;
		var h = theApp.thePainter.height;

		// Width / 50 Globes
		var i = w / 50.0;
		var theGlobe = Math.floor(x / i)

		// Set Globe Colour
		if (theGlobe >= 0 && theGlobe < 50) {
			currentLight.fastset(theApp.r, theApp.g, theApp.b, theGlobe);
		}
		
		// UI Output
		$(".paintarea").html("PaintArea: " + x + " / " + y + " (Globe " + theGlobe + "/50)");
		
		// UI & Holiday
		theApp.drawPaintArea();
		currentLight.fastlights();

	}

	function onPaintTouchStart(e) {
		
		console.log('photograb.onPaintTouchStart');
		
		var touch = e.touches[0];
		
		// Paint Touch Coordinates
		var pos = getPageOffset(this);
		var x = touch.pageX - pos.x;
	  var y = touch.pageY - pos.y;
	  
		// Get Painter Dimensions
		var w = theApp.thePainter.width;

		// Width / 50 Globes
		var i = w / 50.0;
		var theGlobe = Math.floor(x / i)

		var currTouch = new Date().getTime();

		// Set Globe Colour
		if (theGlobe >= 0 && theGlobe < 50) {
			if ((currTouch - theApp.lastTouch) > 50 ) {	// Max 20hz refresh rate
				currentLight.fastset(theApp.r, theApp.g, theApp.b, theGlobe);
				theApp.lastTouch = currTouch;
			}
		}
		
		// Refresh
		theApp.drawPaintArea();
		currentLight.fastlights();

	}

	function onPaintTouchMove(e) {
		console.log('photograb.onPaintTouchMove');
		event.preventDefault();
		onPaintTouchStart(e);
	}

	function onSampMouseMove(e) {
		//console.log('photograb.onSampMouseMove');
	}
	
/*	function onSampMouseClick(e) {
		
		console.log('photograb.onSampMouseClick');
		
		// Old Coordinates
		//theApp.mouseX = e.clientX - theApp.theCanvas.offsetLeft;
		//theApp.mouseY = e.clientY - theApp.theCanvas.offsetTop;
		//console.log("click: " + theApp.mouseX + ", " + theApp.mouseY);
		
		// Old RGB
		//imageData = theApp.context.getImageData(theApp.mouseX, theApp.mouseY, 1, 1);
		//var red = theApp.theRed = imageData.data[0];
		//var green = theApp.theGreen = imageData.data[1];
		//var blue = theApp.theBlue = imageData.data[2];
		//console.log("color (" + red.toString(16) + ", " + green.toString(16) + ", " + blue.toString(16) + ")")
		
		// New Coordinates
		var pos = getPageOffset(this);
		var x = e.pageX - pos.x;
	  var y = e.pageY - pos.y;
	  //console.log("X: " + x + ", Y: " + y);
		
		// New RGB
		var rgb = theApp.context.getImageData(x, y, 1, 1).data;
		theApp.r = rgb[0];
		theApp.g = rgb[1];
		theApp.b = rgb[2];
		
		// UI Output
		var colour = rgbToHex(theApp.r, theApp.g, theApp.b);
		$(".canvas").html("Canvas: " + x + " / " + y + " (#" + colour + ")");
		
		// Refresh
		theApp.drawPaintArea();
		
	}

	function onSampTouchStart(e) {
		
		console.log('photograb.onSampTouchStart');
		
		event.preventDefault();
		
		//var touch = e.originalEvent.touches[0];
		var touch = e.originalEvent.touches[0];
		//var touch = e.touches[0];
		
		// Old Coordinates
		//theApp.mouseX = touch.clientX - theApp.theCanvas.offsetLeft;
		//theApp.mouseY = touch.clientY - theApp.theCanvas.offsetTop;
		//console.log("touch: " + theApp.mouseX + "," + theApp.mouseY);
		
		// New Coordinates
		var pos = getPageOffset(this);
		var x = touch.pageX - pos.x;
	  var y = touch.pageY - pos.y;
	  //console.log("X: " + x + ", Y: " + y);
		
		// Old RGB
		//imageData = theApp.context.getImageData(theApp.mouseX,theApp.mouseY,1,1);
		//var red = theApp.theRed = imageData.data[0];
		//var green = theApp.theGreen = imageData.data[1];
		//var blue = theApp.theBlue = imageData.data[2];
		//console.log("color (" + red.toString(16) + ", " + green.toString(16) + ", " + blue.toString(16) + ")")
		
		// New RGB
		var rgb = theApp.context.getImageData(x, y, 1, 1).data;
		theApp.r = rgb[0];
		theApp.g = rgb[1];
		theApp.b = rgb[2];
		
		// UI Output
		var colour = rgbToHex(theApp.r, theApp.g, theApp.b);
		$(".canvas").html("Canvas: " + x + " / " + y + " (#" + colour + ")");
		
		// Refresh
		theApp.drawPaintArea();
		theApp.lastTouch = new Date().getTime();
		
	}*/
	
	function onSampTouchMove(e) {
		
		console.log('photograb.onSampTouchMove');
		
		event.preventDefault();
		
		curr = new Date().getTime();
		if ((curr - theApp.lastTouch) > 50) {
			onSampTouchStart(e);
		} else {
			//console.log("ignoring");
		}
		
	}
	
	
	/* Sub Functions … */
	
	function rgbToHex(r, g, b) {
		if (r > 255 || g > 255 || b > 255)
	    throw "Invalid";
		return ((r << 16) | (g << 8) | b).toString(16);
	}
	
	function sampSupport () {
		console.log('photograb.sampSupport');
		if (window.File && window.FileReader && window.FileList && window.Blob) {
			return true;
		} else {
			return false;
		}
	}
	
	function sampApp() {
		console.log('photograb.sampApp');
		if (sampSupport() == false) {
			alert("HTML5 file upload not fully supported!");
			return;
		} else {
			console.log("HTML5 file upload fully supported.");
		}
	}
	
	function clr2hex(clr) {
		console.log("photograb.clr2hex");
		r = clr >> 16;
		redstr = r.toString(16);
		if (redstr.length < 2) {
			redstr = "0" + redstr;
		}
		g = (clr >> 8) & 0xff;
		greenstr = g.toString(16);
		if (greenstr.length < 2) {
			greenstr = "0" + greenstr;
		}
		b = clr & 0xff;
		bluestr = b.toString(16);
		if (bluestr.length < 2) {
			bluestr = "0" + bluestr;
		}	
		return "#" + redstr + greenstr + bluestr;
	}
	
	function getPageOffset(obj) {
		console.log("photograb.getPageOffset");
	  var cursorX = 0, cursorY = 0;
	  if (obj.offsetParent) {
	    do {
	      cursorX += obj.offsetLeft;
	      cursorY += obj.offsetTop;
	    } while (obj = obj.offsetParent);
	    return { x: cursorX, y: cursorY };
	  }
	  return undefined;
	}
	
}

function handlefiles(tf){
	console.log("handlefiles got ", tf.length, " files");	
	theApp.setCanvasSize();
	var file = tf[0];
	theApp.mpImg = new MegaPixImage(file);
	var resCanvas1 = document.getElementById('canvas');
	//theApp.mpImg.render(resCanvas1, { maxWidth: theApp.theCanvas.width, maxHeight: theApp.theCanvas.height });
	theApp.mpImg.render(resCanvas1, { maxWidth: theApp.theCanvas.width, maxHeight: 1024 });
	theApp.drawPaintArea();
	return;
}