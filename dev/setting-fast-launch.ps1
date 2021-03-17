Invoke-WebRequest "https://chromedriver.storage.googleapis.com/88.0.4324.96/chromedriver_win32.zip" -OutFile "chromedriver_win32.zip"
Expand-Archive chromedriver_win32.zip -DestinationPath .
Remove-Item chromedriver_win32.zip
npm install