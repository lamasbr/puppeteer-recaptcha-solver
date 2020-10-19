const getTextAudio = require('../wit.ai-api/speech');
const utils = require('../utils');

async function solverByAudio(page) {
  try {
    let frames = await page.frames();
    const bframe = frames.find((frame) => frame.url().includes('api2/bframe'));

    const audioButton = await bframe.$('#recaptcha-audio-button');
    await audioButton.click({delay: utils.rdn(30, 600)});

    await page.waitForTimeout(1500);

    const valueRecaptcha = await utils.isValueRecaptcha(page);
    if (valueRecaptcha) return true;

    const resolutionAudioDisable = await utils.resolutionRecaptchaDisabled(page);

    if (resolutionAudioDisable) {
      console.info('Audio resolution disabled');
      return false;
    }

    console.info('Download audio captcha');

    await page.waitForFunction(() => {
      const iframe = document.querySelector('iframe[src*="api2/bframe"]');
      if (!iframe) return false;
      return !!iframe.contentWindow.document.querySelector('.rc-audiochallenge-tdownload-link');
    });

    const audioLink = await page.evaluate(() => {
      const iframe = document.querySelector('iframe[src*="api2/bframe"]');
      return iframe.contentWindow.document.querySelector('.rc-audiochallenge-tdownload-link').href;
    });

    const audioBytes = await page.evaluate((audioLink) => {
      return (async () => {
        const response = await window.fetch(audioLink);
        const buffer = await response.arrayBuffer();
        return Array.from(new Uint8Array(buffer));
      })();
    }, audioLink);

    console.info('Checking audio in the api');

    const audioTranscript = await getTextAudio(audioBytes);

    console.info('Writing audio');

    const input = await bframe.$('#audio-response');
    await input.click({delay: utils.rdn(30, 1000)});
    await input.type(audioTranscript, {delay: utils.rdn(30, 75)});

    await page.evaluate(() => {
      const iframe = document.querySelector('iframe[src*="api2/bframe"]');
      if (!iframe) return false;
      const documentFrame = iframe.contentWindow.document;
      function rdn(min, max) {
        return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min))) + Math.ceil(min);
      }
      documentFrame.querySelector('#recaptcha-verify-button').click({delay: rdn(40, 200)});
    });

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

module.exports = solverByAudio;