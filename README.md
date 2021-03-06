# Quick API Reference

## API summary

We provide a very simple API:

* Get tab from desired location
* Perform Actions on tab.


## More detailed

* $HUB_URL / new:
  - input:
      - (optional) country: Two letter representation of the country, such as DE, US, UK or NL
      - (optional) city: lower-cased city name
  - returns:
      - url: a url ($URL) of a provisioned tab for the requested location, all other calls will be done against this url.


* $URL / open:
  - input:
      - url: a url to open
  - returns:
      - success: boolean (true/false) if opening the url was successful 
      - elapsedTime: Time it took to complete the operation
      

* $URL / addCookie:
  - input:
      - name: the name of the cookie (string)
      - value: the value of the cookie (string)
      - domain: the domain name on which the cookie is attached
      - path: the path in URLs on which the cookie is valid
      - httponly: true if the cookie should only be sent to, and can only be modified by, an HTTP connection.
      - secure: true if the cookie should only be sent over a secure connection.
      - expires: Holds the expiration date, in milliseconds since the epoch. This property should be null for cookies existing only during a session.
  - returns:
      - success: boolean (true/false) if adding the cookie was successful 


* $URL / setUserAgent:
  - input:
      - userAgent: the value of the userAgent (string)
  - returns:
      - success: boolean (true/false) if setting the user-agent was successful


* $URL / getResources:
  - returns:
      - resources: a dict with all resources loaded
      - success: boolean (true/false) if fetching the resources was successful 


* $URL / getScreenshot:
  - returns:
      - data: a base64 string representation of the rendered page
      - success: boolean (true/false) if taking a screenshot was successful
    

* $URL / evaluate:
  - input:
      - script: a javascript function to be executed on the DOM with optional primitive return value
  - returns:
      - script: the executed javascript function (string)
      - result: result of the executed javascript function
      

* $URL / evaluateOnGecko:
  - input:
      - script: a javascript function to be executed on the Gecko engine with optional primitive return value
  - returns:
      - script: the executed javascript function (string)
      - result: result of the executed javascript function


* $URL / getConsoleLog:
  - returns:
      - consoleLog: a list of logs in form of {msg: msg, lineNum: lineNum, sourceId: sourceId}
   
   
* $URL / destroy:
  - returns:
      - success: boolean (true/false) if opening the url was successful


* $URL / getCookies:
  - returns:
      - cookies: a list of cookies