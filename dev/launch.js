const {Builder, By, Key, until} = require('selenium-webdriver');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async function () {
  let driver = await new Builder().forBrowser('chrome').build();
    await driver.get("http://localhost:8080");
    await driver.findElement(By.name('username')).sendKeys('debug');
    await driver.findElement(By.name('password')).sendKeys("debug", Key.RETURN);
	
	await driver.findElement(By.xpath(`//*[@id="top-menu2"]/div/div/ul[1]/li[3]`)).click();
	await driver.findElement(By.xpath(`//*[@id="play-list-div"]/a`)).click();
	
	await sleep(2000);
	await driver.findElement(By.xpath("//body")).sendKeys('yyyy ');
})();