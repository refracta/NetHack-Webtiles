const {Builder, By, Key, until} = require('selenium-webdriver');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const chrome = require('selenium-webdriver/chrome');
const options   = new chrome.Options().headless().windowSize({width:1920, height:1080});
options.addArguments('--no-sandbox');

(async function () {
  let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
    await driver.get("http://127.0.0.1:8080");


    await driver.findElement(By.name('username')).sendKeys('debug');
    await driver.findElement(By.name('password')).sendKeys("debug", Key.RETURN);
	
	await driver.findElement(By.xpath(`//*[@id="top-menu2"]/div/div/ul[1]/li[3]`)).click();
	await driver.findElement(By.xpath(`//*[@id="play-list-div"]/a`)).click();
	
	await sleep(2000);
	await driver.findElement(By.xpath("//body")).sendKeys('yyyy ');

	await sleep(1000);

	driver.takeScreenshot().then(
    function(image, err) {
        require('fs').writeFile('game-launch.png', image, 'base64', function(err) {
            console.log(err);
        });
    }
);
	await driver.quit();
})();
