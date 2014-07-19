import requests
import json
import sys
import time


def do_command(url, command, data={}):
    print "executing %s/%s      " % (url, command),
    headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
    response = requests.post('%s/%s' % (url, command),
                             data=json.dumps(data), headers=headers)
    print response.status_code
    print response.text.encode('utf-8').strip()
    if response.status_code == 500:
        sys.exit(1)

    return response

# Get a tab from the Netherlands

data = {'country': 'gb'}
response = do_command("http://127.0.0.1:7331", "new", data)
url = json.loads(response.text)["url"]

# Set Cookies
cookie = {"domain": ".sweatytacobo.com",
    "httponly": False,
    "name": "__utmz",
    "path": "/",
    "secure": False,
    "value": "268881515.13222266.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none)"
}
response = do_command(url, "addCookie", cookie)

# Set User Agent
data = {'userAgent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.9; rv:30.0) Gecko/20100101 Firefox/30.0'}
response = do_command(url, "setUserAgent", data)


data = {'script': 'self._page.onLoadFinished = function(){ console.log("HELP"); };'}
response = do_command(url, "evaluateOnGecko", data)

# Open URL
data = {'url': 'http://www.ebay.com/'}
response = do_command(url, "open", data)

# Get Resources
response = do_command(url, "getResources")
resources = json.loads(response.text)["resources"]
keys = sorted(resources.keys(), key=lambda x: int(x))
print "\nThe Resources \n"
for key in keys:
    print key, json.dumps(resources[key], sort_keys=True, indent=4, separators=(',', ': '))
print ""

# Take Screenshot
response = do_command(url, "getScreenshot")
base64 = json.loads(response.text)["data"]
fh = open("imageToSave.png", "wb")
fh.write(base64.decode('base64'))
fh.close()

data = {'script': "function(){return document.getElementsByClassName('ctr-p').length>0}"}
response = do_command(url, "evaluate", data)

response = do_command(url, "getConsoleLog")

# Destroy Tab
response = do_command(url, "destroy")
