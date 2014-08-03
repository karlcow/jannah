import requests
import json
import sys
import time
import os
from os.path import expanduser
MAIN_DIR = expanduser("~") + "/sameh"


def do_command(url, command, data={}):
    print "executing %s/%s" % (url, command),
    headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
    response = requests.post('%s/%s' % (url, command),
                             data=json.dumps(data), headers=headers)
    print response.status_code
    #print response.text.encode('utf-8').strip()
    if response.status_code == 500:
        sys.exit(1)
    return response


def process_url(title, link):
    
    path = MAIN_DIR + "/" + title + "/" + str(int(time.time()))
    os.makedirs(path)
    
    data = {'country': 'eg', 'city': 'cairo'}
    response = do_command("http://127.0.0.1:7331", "new", data)

    # Open URL
    url = json.loads(response.text)["url"]
    data = {'url': link}
    response = do_command(url, "open", data)
    
    # Get Resources 
    response = do_command(url, "getResources")
    resources = json.loads(response.text)["resources"]
    with open(path + "/resources.json", "w") as f:
        f.write(json.dumps(resources, sort_keys=True,
                           indent=4, separators=(',', ': ')))

    # Take Screenshot and return base64 string under data
    response = do_command(url, "getScreenshot")
    base64 = json.loads(response.text)["data"]
    
    with open(path + "/screenshot.png", "wb") as f:
        f.write(base64.decode('base64'))

    # Destroy Tab
    response = do_command(url, "destroy")


urls = {
    "filgoal": "http://Filgoal.com",
    "youm7": "http://www.youm7.com",
    "Almasryalyoum": "http://Almasryalyoum.com",
    "Hao123": "http://Hao123.com",
    "Vetogate": "http://Vetogate.com",
    "Fatakat": "http://Fatakat.com",
    "Elwatannews": "http://Elwatannews.com",
    "Albawabhnews": "http://Albawabhnews.com",
    "Akhbarak": "http://Akhbarak.net",
    "Masrawy": "http://Masrawy.com",
    "Yallakora": "http://Yallakora.com",
    "El-balad": "http://El-balad.com",
    "Mbc": "http://Mbc.net",
    "Babal": "http://Babal.net",
    "Korabia": "http://Korabia.com",
    "Nmisr": "http://Nmisr.com",
    "Kooora": "http://Kooora.com",
    "Elfagr": "http://Elfagr.org"
}

for title, url in urls.iteritems():
    process_url(title, url)
    time.sleep(1)
    break
