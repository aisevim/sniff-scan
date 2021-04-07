const {createWriteStream, existsSync} = require('fs');
const {mkdir} = require("fs/promises");
const axios = require('axios');
const { join } = require('path');
const { parse } = require('node-html-parser');
const _range = require('lodash/range')


const DIR = `the-breaker-new-waves`
const RETRY = 2

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
}

const download_image = (url, image_path, currenChap) =>
  axios({
    url,
    responseType: 'stream',
  }).then(
    response =>
      new Promise((resolve, reject) => {
        response.data
          .pipe(createWriteStream(image_path))
          .on('finish', () => resolve())
          .on('error', () => reject(currenChap));
      }),
  );

async function writeChapter(link) {
    const numChapter = parseFloat(link.getAttribute(`href`).replace(`https://www.scan-fr.cc/manga/${DIR}/`, ''))

    try {
        const currentDir = join(`${__dirname}/${DIR}/`, `chapitre-${numChapter}`)

        if (!existsSync(currentDir)) {
            try {
                await mkdir(currentDir, { recursive: true });
            } catch (e) {
                throw link
            }
        }

        const {data} = await axios.get(link.getAttribute(`href`))
        const html = parse(data)
        const is = html.querySelectorAll('script') || []
        
        const match = is.find((script) => script.toString().includes('var pages = [')) 
        const string = match.toString().substring(
            match.toString().lastIndexOf("var pages = [") + 12, 
            match.toString().lastIndexOf(":1}];")
        ) + ":1}]"

        await asyncForEach(
            JSON.parse(string),
            async ({page_image, page_slug}) => {
                await download_image(
                    page_image,
                    join(currentDir, `${page_slug}.png`),
                )
            },
        )
        console.log(`chapter ${numChapter} done`);
    } catch(e) {
        console.log(`fail on process ${numChapter}`)
        throw link
    }
}

let retry = 2
const runMain = async () => {
    const fails = []
    try {
        console.log('init sniff')
        
        const {data} = await axios.get(`https://www.scan-fr.cc/manga/${DIR}/`)
        const html = parse(data)
        const links = html.querySelectorAll('.chapter-title-rtlrr a') || []

        await asyncForEach(links, async (link) => {
            try {
                await writeChapter(link)
            } catch (e) {
                fails.push(e)
            }
        })
        console.log('first sniff done')
    } catch (e) {
        console.log(`fail on ${e}`)
        if(fails.includes(e)) {
            return
        }
        
        fails.push(e)
    } finally {
        if(fails.length && RETRY !== retry) {
            retry++
            await runMain(fails)
            console.log(`current error: ${fails}`)
        }
    }  
}

(async() => {
    try {
        await runMain()
    } catch (e) {
        console.log(e)
    }
})()

  
