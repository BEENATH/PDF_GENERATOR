const puppeteer = require('puppeteer');
const { marked } = require('marked');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');


marked.setOptions({
  gfm: true,
  breaks: true
});

async function getBrowser() {
  const isLinux = process.platform === 'linux';

  
  const baseArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--no-first-run',
    '--disable-extensions',
  ];

  
  const linuxOnlyArgs = [
    '--no-zygote',
  ];

  const launchOptions = {
    headless: true, 
    args: isLinux ? [...baseArgs, ...linuxOnlyArgs] : baseArgs,
  };

  
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    if (fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    } else {
      console.warn(`WARNING: Configured PUPPETEER_EXECUTABLE_PATH not found at ${process.env.PUPPETEER_EXECUTABLE_PATH}. Falling back to default browser...`);
    }
  }

  try {
    return await puppeteer.launch(launchOptions);
  } catch (error) {
    console.error('Initial Puppeteer launch failed. Trying fallback launch options...', error);
    
    const fallbackOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };
    return await puppeteer.launch(fallbackOptions);
  }
}

function parsePdfOptions(options = {}) {
  return {
    format: options.format || 'A4',
    landscape: options.landscape === 'true' || options.landscape === true,
    printBackground: options.printBackground !== 'false' && options.printBackground !== false,
    scale: parseFloat(options.scale) || 1,
    displayHeaderFooter: options.displayHeaderFooter === 'true' || options.displayHeaderFooter === true,
    headerTemplate: options.headerTemplate || ' ', 
    footerTemplate: options.footerTemplate || ' ',
    margin: {
      top: options.marginTop || '15mm',
      bottom: options.marginBottom || '15mm',
      left: options.marginLeft || '15mm',
      right: options.marginRight || '15mm'
    }
  };
}

async function generateFromHtml(htmlContent, options = {}) {
  let browser = null;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();

    
    await page.setViewport({ width: 1280, height: 800 });

    
    
    
    
    
    
    
    await page.setContent(htmlContent, {
      waitUntil: ['load', 'domcontentloaded'],
      timeout: 60000
    });

    const pdfOptions = parsePdfOptions(options);
    const pdfBuffer = await page.pdf(pdfOptions);

    return pdfBuffer;
  } catch (error) {
    console.error('Error in generateFromHtml:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function generateFromUrl(url, options = {}) {
  let browser = null;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();

    
    await page.setViewport({ width: 1280, height: 800 });

    
    
    await page.goto(url, {
      waitUntil: ['load', 'domcontentloaded'],
      timeout: 60000 
    });

    const pdfOptions = parsePdfOptions(options);
    const pdfBuffer = await page.pdf(pdfOptions);

    return pdfBuffer;
  } catch (error) {
    console.error('Error in generateFromUrl:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function generateFromMarkdown(markdownContent, options = {}) {
  const parsedHtml = marked(markdownContent);
  
  
  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 20px;
        }
        h1, h2, h3, h4, h5, h6 {
          font-weight: 600;
          color: #111;
          margin-top: 24px;
          margin-bottom: 16px;
        }
        h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
        p { margin-top: 0; margin-bottom: 16px; }
        code {
          font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
          background-color: rgba(27,31,35,0.05);
          border-radius: 3px;
          font-size: 85%;
          padding: 0.2em 0.4em;
        }
        pre {
          background-color: #f6f8fa;
          border-radius: 3px;
          padding: 16px;
          overflow: auto;
        }
        pre code {
          background-color: transparent;
          padding: 0;
          font-size: 100%;
        }
        blockquote {
          margin: 0 0 16px 0;
          padding: 0 1em;
          color: #6a737d;
          border-left: 0.25em solid #dfe2e5;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 16px;
        }
        table th, table td {
          border: 1px solid #dfe2e5;
          padding: 6px 13px;
        }
        table tr:nth-child(even) {
          background-color: #f6f8fa;
        }
        img {
          max-width: 100%;
          box-sizing: content-box;
        }
      </style>
    </head>
    <body>
      ${parsedHtml}
    </body>
    </html>
  `;
  
  return await generateFromHtml(fullHtml, options);
}

async function generateFromTemplate(templateSource, templateData, options = {}) {
  const template = handlebars.compile(templateSource);
  const compiledHtml = template(templateData);
  return await generateFromHtml(compiledHtml, options);
}

module.exports = {
  generateFromHtml,
  generateFromUrl,
  generateFromMarkdown,
  generateFromTemplate
};
