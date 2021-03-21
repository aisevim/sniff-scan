const {createWriteStream, existsSync} = require('fs');
const {mkdir} = require("fs/promises");
const axios = require('axios');
const { join } = require('path');
const { parse } = require('node-html-parser');
const _range = require('lodash/range')


const DIR = `${__dirname}/air-gear/`
// const RANGE = [147.5]
// const RANGE = [147.5,119.5,]
const RANGE = _range(0,37).map(a => a + 1)
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

async function writeChapter(numc) {
    const numChapter = numc
    try {
        const currentDir = join(DIR, `chapitre-${numChapter}`)

        if (!existsSync(currentDir)) {
            try {
                await mkdir(currentDir, { recursive: true });
            } catch (e) {
                throw numChapter
            }
        }


        // const {data} = await axios.get(`https://www.scan-fr.cc/manga/air-gear`)
        // const html = parse(data)
        // const links = html.querySelectorAll('.chapter-title-rtlrr a') || []

        // await asyncForEach(
        //     links,
        //     async (link) => {
        //         const {data} = await axios.get(link.getAttribute(`href`))
        //         const html = parse(data)
        //         const is = html.querySelectorAll('script') || []
                
        //         const match = is.find((script) => script.toString().includes('var pages = [')) 
        //         const string = match.toString().substring(
        //             match.toString().lastIndexOf("var pages = [") + 12, 
        //             match.toString().lastIndexOf(":1}];")
        //         ) + ":1}]"
                
        //         await asyncForEach(
        //             JSON.parse(string),
        //             async ({page_image, page_slug}) => {
        //                 await download_image(
        //                     page_image,
        //                     join(currentDir, `${page_slug}.png`),
        //                 )
        //             },
        //         )
        //     },    
        // )

        // await asyncForEach(
        //     ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'],
        //     async (num) => {
        //         console.log(`https://www.scan-fr.cc/uploads/manga/tales-of-demons-and-gods/chapters/${numChapter}/${num}.jpeg`)
        //         await download_image(
        //             `https://www.scan-fr.cc/uploads/manga/tales-of-demons-and-gods/chapters/${numChapter}/${num}.jpeg`,
        //             join(currentDir, `${num}.jpg`),
        //         )
        //     },
        // )

        // const {data} = await axios.get(`https://www.scan-fr.cc/manga/tales-of-demons-and-gods/${numChapter}/1`)
        // const html = parse(data)
        // const is = html.querySelectorAll('script') || []

        // await asyncForEach(
        //     _range(is.length).map(a => a + 1),
        //     async (num) => {
        //         const {data} = await axios.get(`https://www.scan-fr.cc/manga/tales-of-demons-and-gods/${numChapter}/${num}`)
        //         const html = parse(data)
        //         const is = html.querySelectorAll('.dropdown-menu .inner .selectpicker li') || []
        //         // const img = is.find((_img) => _img.getAttribute(`class`).includes(`img-responsive scan-page`))

        //         await download_image(
        //             `https://www.scan-fr.cc/manga/black-clover/${numChapter}/${num}.jpg`,
        //             join(currentDir, `${num}.jpg`),
        //         )
        //     },
        // )
        
        // const {data} = await axios.get(`https://blackcloverscan.fr/manga/black-clover-scan-${numChapter}-vf/`)
        // const html = parse(data)
        // const imgs = html.querySelectorAll('img') || []

        // await asyncForEach(
        //     _range(imgs.length).map(a => a + 1),
        //     async (img, index) => {
        //         await download_image(imgs[index].getAttribute(`src`), join(currentDir, `${index}.png`))
        //     },
        // )

        const {data} = await axios.get(`https://www.scan-fr.cc/manga/air-gear/${numChapter}/1`)
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
        throw numChapter
    }
}

let retry = 0
const runMain = async (tower) => {
    const fails = []
    try {
        console.log('init sniff')
        await asyncForEach(tower, async (numc) => {
            try {
                await writeChapter(numc)
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
        await runMain(RANGE)
    } catch (e) {
        console.log(e)
    }
})()

  
