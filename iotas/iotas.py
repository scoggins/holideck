  #!/usr/bin/python
#
"""
Internet of Things Access Server - MooresCloud preliminary implementation for Holiday

Homepage and documentation: http://dev.moorescloud.com/

Copyright (c) 2013, Mark Pesce.
License: MIT (see LICENSE for details)
"""

__author__ = 'Mark Pesce'
__version__ = '1.0b3'
__license__ = 'MIT'

import json, socket, os, sys
import drawlight, setlights
from bottle import Bottle, run, static_file, post, request, error, abort
import colorsys

# On the command line we can tell iotas to go into real mode possibly
# invoke as python iotas.py nosim to avoid simulation mode -- which holideck won't
#
if len(sys.argv) == 1:
	SIM_STATE = True
else:
	if sys.argv[1] == 'nosim':
		SIM_STATE = False
	else:
		SIM_STATE = True

app = Bottle()
app.devices = []
app.licht = 0
app.toggleState = False

# Add in SWIFT modules
try:
	import swift.swift as swifty
	swift_obj = swifty.Swift(bottle=app)
	print "SWIFT capabilities"
except ImportError:
	print "No SWIFT capabilities"

#docroot = '/home/mpesce/iotas'
#docroot = os.path.join(os.getcwd(), 'iotas') 		# Hopefully we startup in this directory
if SIM_STATE == False:
	docroot = os.getcwd()				# Bare startup directory
else:
	docroot = os.path.join(os.getcwd(), 'iotas') 	# Holideck startup in this directory

print "Startup directory %s" % docroot
default_name = 'index.html'

homebridge_last_rgb = None

# If we 404, we go to the root.
# Let's do the basic page loadery here
@app.error(404)
def redirect_404(error):
    ua = request.headers.get('User-Agent')
    if ua.find('CaptiveNetworkSupport') != -1:
        print 'This is a WiFi login probe'
	return 'Not a Wifi login, sorry'
    else:
        return server_root()

@app.route('/')
def server_root():
	global docroot
	#print docroot
	return static_file('index.html', root=docroot+'/www')

# Everything will need to be adjusted appropriately, but whatevs.
@app.route('/apps/<filepath:path>')
def server_static(filepath):
	global docroot, default_name
	#print filepath[-1]
	if (filepath[-1] == """/"""):
		filepath = filepath + default_name
	#print docroot, filepath
	return static_file(filepath, root=docroot+'/www/apps')

@app.route('/stylesheets/<filepath:path>')
def server_static(filepath):
	global docroot
	return static_file(filepath, root=docroot+'/www/stylesheets')

@app.route('/assets/<filepath:path>')
def server_static(filepath):
	global docroot
	return static_file(filepath, root=docroot+'/www/assets')

@app.route('/css/<filepath:path>')
def server_static(filepath):
	global docroot
	return static_file(filepath, root=docroot+'/www/css')

@app.route('/js/<filepath:path>')
def server_static(filepath):
	global docroot
	return static_file(filepath, root=docroot+'/www/js')


# And here begin the IoTAS RESTful interfaces
@app.get('/iotas')
def do_iotas_info():

	#for thingy in request.headers:
	#	print thingy, request.headers[thingy]

	# Getting the internal IP address is kind of easy.  Kind of.
	hostname = socket.gethostname()
	#internal_ip = socket.gethostbyname(hostname)
	external_ip = request.headers['Host']
	# import urllib, re, string
	# url = urllib.URLopener()
	# resp = url.open('http://checkip.dyndns.org')
	# html = resp.read()
	# end = html.find("</body>")
	# start = html.find("Address:") + 9
	# external_ip = html[start:end].strip() 
	resp = { "version": __version__, "apis": [], "host_name": hostname, "ip": external_ip, "local_device": app.licht.device_type, "local_name": app.licht.name }
	return json.dumps(resp)

@app.get('/devices')
def do_devices():
	try:
		thename = socket.gethostname()
	except:
		thename = "unknown"
	devs = app.licht.get_devices()
	for devi in app.devices:
		devs.append(app.licht.get_info())
	resp = { "block": "Holiday by MooresCloud", "devices": devs, "name": thename }
	return json.dumps(resp)

# THESE API CALLS ARE DEPRECATED
# YOU REALLY OUGHT TO USE THE NEW FORMAT API
# WE WILL STOP SUPPORTING THIS BEFORE VERY LONG
# YOU HAVE BEEN WARNED
# A few commands that either get or set the state of the entire Light

@app.get('/device/light/value')
def read_light_values():
	value = app.licht.get_light_values()
	return json.dumps(value)

@app.put('/device/light/value')
def set_light_values():
	d = request.body.read()
	if len(d) == 0:
		return json.dumps({"value": False})
	#print "Received %s" % d
	try:
		dj = json.loads(d)
	except:
		print "Bad JSON data, aborting..."
		return json.dumps({"value": False})
	if 'value' in dj:
		#print "there is a value"
		triplet = dj['value']
	else:
		return json.dumps({"value": False})
			
	#print "set_light_values %s" % triplet
	retval = app.licht.set_light_values(triplet)
	return json.dumps(retval)

@app.put('/device/light/setlights')
def do_setlights():
	d = request.body.read()
	#print "Received %s" % d
	try:
		dj = json.loads(d)
		#print len(dj['lights'])
	except:
		print "Bad JSON data, aborting..."
		return json.dumps({"value": False})
	resp = setlights.setlights(app.licht, dj)
	return json.dumps(resp)	

@app.put('/device/light/setvalues')
def do_setvalues():
	d = request.body.read()
	#print "Received %s" % d
	try:
		dj = json.loads(d)
	except:
		print "Bad JSON data, aborting..."
		return json.dumps({"value": False})
	resp = app.licht.do_setvalues(dj['values'])
	return json.dumps(resp)	

# Now some individual LED manipulations

@app.get('/device/led/<num>/value')
def read_led_value(num):
	print "read_led_value %s" % num
	value = app.licht.get_led_value(int(num))
	return """{"led": %s, "value": %s}""" % (num, value)
	
@app.put('/device/led/<num>/value')
def set_led_value(num):
	d = request.body.read()
	print "Received %s" % d
	try:
		dj = json.loads(d)
	except:
		print "Bad JSON data, aborting..."
		return json.dumps({"value": False})
	if 'value' in dj:
		print "there is a value"
		triplet = dj['value']
	else:
		return json.dumps({"value": False})
			
	print "set_led_value %s %s" % (int(num), triplet)
	app.licht.set_led_value(int(num), triplet)
	return """{"led": %s, "value": %s}""" % (num, triplet)

# And add some animation effects (this needs revising)

@app.put('/device/light/gradient')
def gradient():
	d = request.body.read()
	#print "Received %s" % d
	try:
		dj = json.loads(d)
	except:
		print "Bad JSON data, aborting..."
		return json.dumps({"value": False})

	if 'begin' in dj:
		#print "there is a beginning"
		begin = dj['begin']
	else:
		return json.dumps({"value": False})

	if 'end' in dj:
		#print "there is a ending"
		end = dj['end']
	else:
		return json.dumps({"value": False})

	if 'steps' in dj:
		#print "and some steps"
		steps = dj['steps']
	else:
		return json.dumps({"value": False})
					
	print "gradient %s %s %s" % (begin, end, steps)
	resp = app.licht.gradient(begin, end, int(steps))
	return json.dumps(resp)

@app.put('/device/holiday/app/nrl')
def nrl():
	d = request.body.read()
	#print "Received %s" % d
	try:
		dj = json.loads(d)
	except:
		print "Bad JSON data, aborting..."
		return json.dumps({"value": False})	

	# Ok, so we should have the team nubmer now
	# Pass that along to wherever it needs to go
	resp = app.licht.nrl(dj)
	return json.dumps(resp)

@app.put('/device/holiday/app/afl')
def afl():
	d = request.body.read()
	#print "Received %s" % d
	try:
		dj = json.loads(d)
	except:
		print "Bad JSON data, aborting..."
		return json.dumps({"value": False})	

	# Ok, so we should have the team nubmer now
	# Pass that along to wherever it needs to go
	resp = app.licht.afl(dj)
	return json.dumps(resp)

# API Code to interface with homebridge-better-http-rgb 
# -Simon Coggins <simon@zethos.org>

@app.get('/device/holiday/homebridge/switch/on')
def homebridge_switch_on():
	global homebridge_last_rgb

	RGB = [ 255, 255, 255 ]
	if homebridge_last_rgb:
		RGB = homebridge_last_rgb
	app.licht.set_light_values(RGB)
	return "1\n"

@app.get('/device/holiday/homebridge/switch/off')
def homebridge_switch_off():
	global homebridge_last_rgb
	
	homebridge_last_rgb = list(app.licht.get_led_value(0))
	app.licht.set_light_values([0, 0, 0])
	return "1\n"

@app.get('/device/holiday/homebridge/switch/status')
def homebridge_switch_status():
	status = app.licht.get_led_value(0)
	if status[0] == 0 and status[1] == 0 and status[2] == 0:
		status = "0\n"
	else:
		status = "1\n"

	return status

@app.get('/device/holiday/homebridge/leds/set/<rgb>')
def homebridge_leds_set(rgb):
	global homebridge_last_rgb
	R = int(rgb[:2], 16)
	G = int(rgb[2:4], 16)
	B = int(rgb[4:6], 16)

	print "leds-set ", homebridge_last_rgb

	app.licht.set_light_values([R, G, B])
	homebridge_last_rgb = list(app.licht.get_led_value(0))

	return "1\n"

@app.get('/device/holiday/homebridge/leds/set')
def homebridge_leds_set():
	RGB = app.licht.get_led_value(0)
	print "leds set = %02x%02x%02x\n" % (RGB[0], RGB[1], RGB[2])
	print "homebridge_last_rgb = ", homebridge_last_rgb

	return "%02x%02x%02x\n" % (RGB[0], RGB[1], RGB[2])

@app.get('/device/holiday/homebridge/leds/brightness')
def homebridge_leds_brightness():
	RGB = app.licht.get_led_value(0)
	HLS = colorsys.rgb_to_hls(RGB[0], RGB[1], RGB[2])


	print "HLS: ", HLS
	if HLS[1]:
		pct = (HLS[1]/255)*100
	else:
		pct = 0
	return "%d\n" % pct

@app.get('/device/holiday/homebridge/leds/brightness/<brightness>')
def homebridge_leds_brightness(brightness):
	print "B %s" % brightness

	RGB = app.licht.get_led_value(0)
	HLS = colorsys.rgb_to_hls(RGB[0], RGB[1], RGB[2])
	HLS[1] = brightness
	RGB = colorsys.hls_to_rgb(HLS[0], HLS[1], HLS[2])

	apt.licht.set_light_values(RGB)

	return "1\n"


def new_run():
	""" This is the real run method, we hope"""
	# Instance the devices that we're going to control
	# Add each to the control ring. For no very good reason.
	#
	ourname = "%s.local" % socket.gethostname()
	import devices.moorescloud.holiday.driver as driver
	app.licht = driver.Holiday(remote=False, address='localhost', name='localhost')	# Connect to a real, local device
	app.licht.create_routes(app)										# Adds in all the routes for device

	#the_srv = 'wsgiref'  
	the_srv = 'cherrypy'
	#print app.licht

	#print 'Routes'
	#for rt in app.routes:
	#	print rt.method, rt.rule, rt.callback
	
	print "Running..."
	# Try to run on port 80, if that fails, go to 8080
	try:
		app.run(host='0.0.0.0', port=80, debug=True, server=the_srv)
	except socket.error as msg:
		print "Couldn't get port, you need to run in superuser!"
		sys.exit(1)

def old_run(port):
	"""invoke run when loading as a module in the simulator"""
	# Instance the devices that we're going to control
	# Add each to the control ring. For no very good reason.
	#
	ourname = "%s.local" % socket.gethostname()
	discover = False	# No discovery right now

	# Now we're using our newfangled IoTAS code to find the device
	if discover == True:
		import devices.moorescloud.holiday.discover as discover
		disc = discover.Discovery()
		print "Scanning for Holidays..."
		disc.discover()

		if len(discover.discovered) < 1:
			print "We got nuthin, going to use the simulator"
			lichtname = 'sim'
			lichtremote = False
			lichtapiname = 'sim'
		else:
			lichtname = "%s:%s" % (discover.discovered[0][0], discover.discovered[0][1])
			lichtremote = True
			lichtapiname = discover.discovered[0][0]
		print "Using %s" % lichtname
	else:
		lichtname = 'sim'
		lichtremote = False
		lichtapiname = 'sim'		

	#app.licht = devices.holiday.driver.Holiday(ourname)
	#app.licht = devices.moorescloud.holiday.driver.Holiday('sim')			# Connect to the simulator
	#app.licht = devices.moorescloud.holiday.driver.Holiday(remote=True, address='yule.local')	# Connect to a real device
	import devices.moorescloud.holiday.driver as driver
	#app.licht = driver.Holiday(remote=lichtremote, address=lichtname, name=lichtapiname)	# Connect to a real device
	app.licht = driver.Holiday(remote=False, address='sim', name='sim')
	app.licht.create_routes(app)										# Adds in all the routes for device

	#the_srv = 'wsgiref'  
	the_srv = 'cherrypy'
	#print app.licht

	print 'Routes'
	for rt in app.routes:
		print rt.method, rt.rule, rt.callback
	
	print "Running..."
	# Try to run on port 80, if that fails, go to 8080
	try:
		app.run(host='0.0.0.0', port=80, debug=False, server=the_srv)
	except socket.error as msg:

		# Starting with port 8080, try to grab a port!
		starting = True
		socknum = port
		while starting:
			try:	
				app.run(host='0.0.0.0', port=socknum, server=the_srv, debug=False)  # Start the server
				starting = False
			except socket.error as msg:
				print("Port %s not available, trying another" % socknum)
				socknum += 1

def run(port, queue):
	"""invoke run when loading as a module in the simulator"""
	# Instance the devices that we're going to control
	# Add each to the control ring. For no very good reason.
	#
	lichtname = 'sim'
	lichtremote = False
	lichtapiname = 'sim'		

	import devices.moorescloud.holiday.driver as driver
	app.licht = driver.Holiday(remote=False, address='sim', name='sim', queue=queue)
	app.licht.create_routes(app)										# Adds in all the routes for device

	#for rt in app.routes:
	#	print rt.method, rt.rule, rt.callback

	#the_srv = 'wsgiref'  
	the_srv = 'cherrypy'

	# Starting with port 8080, try to grab a port!
	starting = True
	socknum = port
	while starting:
		try:	
			app.run(host='0.0.0.0', port=socknum, server=the_srv, debug=False)  # Start the server
			starting = False
		except socket.error as msg:
			print("Port %s not available, trying another" % socknum)
			socknum += 1

if __name__ == '__main__':
	if SIM_STATE == True:
		old_run(port=8080)
	else:
		new_run()

