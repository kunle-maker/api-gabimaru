const express = require('express');  
const axios = require('axios');  
const cheerio = require('cheerio');  
const compression = require('compression');
const path = require('path');
const cors = require('cors');  
const puppeteer = require('puppeteer');  
  
const app = express();  
app.set("json spaces", 2);
const PORT = process.env.PORT || 3000;  
app.use(cors());  
app.use(express.static(__dirname));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

function getBaseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

function simplify(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    author: raw.author,
    username: raw.unique_id,
    title: raw.title,
    thumbnail: raw.thumbnail,
    duration: raw.duration,
    medias: raw.medias?.map(m => ({
      url: m.url,
      quality: m.quality,
      type: m.type,
      extension: m.extension
    }))
  };
}

function startSelfPing(app) {
  let baseUrl = null;
  
  app.use((req, res, next) => {
    if (!baseUrl) {
      baseUrl = getBaseUrl(req);
      console.log(`Detected base URL: ${baseUrl}`);
      startPingInterval();
    }
    next();
  });
  
  function startPingInterval() {
    // Ping every 5 minutes (300,000 ms)
    setInterval(async () => {
      try {
        if (baseUrl) {
          const response = await axios.get(`${baseUrl}/health`);
          console.log(`Self-ping successful: ${response.status}`);
        }
      } catch (error) {
        console.log('Self-ping failed (this is normal during initial deployment)');
      }
    }, 300000);
  }
}

  app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    creator: 'Gabimaru'
  });
});

app.get('/api/animechar', async (req, res) => {  
  const name = req.query.name;  
  if (!name) {  
    return res.status(400).json({  
      status: 'error',  
      message: 'Missing ?name= parameter',  
      creator: 'Gabimaru'  
    });  
  }  
  
  try {
    const searchResponse = await axios.get(`https://api.jikan.moe/v4/characters`, {  
      params: { q: name }  
    });  
  
    const results = searchResponse.data.data;  
    if (!results || results.length === 0) {  
      return res.status(404).json({  
        status: 'error',  
        message: 'Character not found',  
        creator: 'Gabimaru'  
      });  
    }  
  
    const character = results[0];  
    
    const detailsResponse = await axios.get(`https://api.jikan.moe/v4/characters/${character.mal_id}/full`);  
    const details = detailsResponse.data.data;  
    
    const anime = details.anime?.[0]?.anime?.title || 'Unknown';  
  
    res.json({  
      name: details.name,  
      anime: anime,  
      description: details.about,  
      image: details.images.jpg.image_url,  
      source: details.url,  
      status: 'success',  
      creator: 'Gabimaru'  
    });  
  } catch (error) {  
    res.status(500).json({  
      status: 'error',  
      message: 'Failed to fetch character information',  
      error: error.message,  
      creator: 'Gabimaru'  
    });  
  }  
});  

app.get('/chatbot', async (req, res) => {  
  const userMessage = req.query.ask;  
  
  if (!userMessage) {  
    return res.status(400).json({  
      status: 'error',  
      creator: 'Ayodele David (Gabimaru)',  
      error: 'Missing "ask" query parameter.'  
    });  
  }  
  
  try {  
    const response = await axios.get(`https://botfather.cloud/Apis/AI/client.php`, {  
      params: { message: userMessage }  
    });  
  
    const { data } = response;  
  
    if (data.success) {  
      res.json({  
        status: 'success',  
        creator: 'Ayodele David (Gabimaru)',  
        question: userMessage,  
        reply: data.response,  
        answer_time: data.answer_time  
      });  
    } else {  
      res.status(500).json({  
        status: 'error',  
        creator: 'Ayodele David (Gabimaru)',  
        error: 'AI API returned failure',  
        data  
      });  
    }  
  
  } catch (err) {  
    console.error(err);  
    res.status(500).json({  
      status: 'error',  
      creator: 'Ayodele David (Gabimaru)',  
      error: 'Failed to connect to AI API.'  
    });  
  }  
});  

// TikTok Downloader
app.get('/tiktokdl', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ status: 'error', message: 'Missing ?url=', creator: 'Gabimaru' });
  }

  try {
    const response = await axios.get('https://api-toxxic.zone.id/api/downloader/aio', { params: { url } });
    const simplified = simplify(response.data?.data?.data);

    if (!simplified) {
      return res.status(500).json({ status: 'error', message: 'Unexpected API response', creator: 'Gabimaru' });
    }

    res.json({ status: 'success', platform: 'tiktok', data: simplified, creator: 'Gabimaru' });
  } catch {
    res.status(500).json({ status: 'error', message: 'Failed to fetch TikTok video', creator: 'Gabimaru' });
  }
});

// Instagram Downloader
app.get('/instadl', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ status: 'error', message: 'Missing ?url=', creator: 'Gabimaru' });
  }

  try {
    const response = await axios.get('https://api-toxxic.zone.id/api/downloader/aio', { params: { url } });
    const simplified = simplify(response.data?.data?.data);

    if (!simplified) {
      return res.status(500).json({ status: 'error', message: 'Unexpected API response', creator: 'Gabimaru' });
    }

    res.json({ status: 'success', platform: 'instagram', data: simplified, creator: 'Gabimaru' });
  } catch {
    res.status(500).json({ status: 'error', message: 'Failed to fetch Instagram media', creator: 'Gabimaru' });
  }
});

// Facebook Downloader
app.get('/fbdl', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ status: 'error', message: 'Missing ?url=', creator: 'Gabimaru' });
  }

  try {
    const response = await axios.get('https://api-toxxic.zone.id/api/downloader/aio', { params: { url } });
    const simplified = simplify(response.data?.data?.data);

    if (!simplified) {
      return res.status(500).json({ status: 'error', message: 'Unexpected API response', creator: 'Gabimaru' });
    }

    res.json({ status: 'success', platform: 'facebook', data: simplified, creator: 'Gabimaru' });
  } catch {
    res.status(500).json({ status: 'error', message: 'Failed to fetch Facebook video', creator: 'Gabimaru' });
  }
});

app.get(['/dl', '/aio'], async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ status: 'error', message: 'Missing ?url=', creator: 'Gabimaru' });
  }

  try {
    const response = await axios.get('https://api-toxxic.zone.id/api/downloader/aio', { params: { url } });
    const simplified = simplify(response.data?.data?.data);

    if (!simplified) {
      return res.status(500).json({ status: 'error', message: 'Unexpected API response', creator: 'Gabimaru' });
    }

    res.json({ status: 'success', platform: 'auto-detect', data: simplified, creator: 'Gabimaru' });
  } catch {
    res.status(500).json({ status: 'error', message: 'Failed to fetch media', creator: 'Gabimaru' });
  }
});

app.get('/fancy', (req, res) => {  
  const text = req.query.text;  
  const style = req.query.style || 'all';  
    
  if (!text) {    
    return res.status(400).json({    
      status: 'error',    
      message: 'Missing ?text= parameter',    
      creator: 'Gabimaru'    
    });    
  }    
  
  const fontStyles = {
  bold: '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇',
  italic: '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘌𝘝𝘞𝘟𝘠𝘡𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻',
  boldItalic: '𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯',
  script: '𝒜𝐵𝒞𝒟𝐸𝐹𝒢𝐻𝐼𝒥𝒦𝐿𝑀𝒩𝒪𝒫𝒬𝑅𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵𝒶𝒷𝒸𝒹𝑒𝒻𝑔𝒽𝒾𝒿𝓀𝓁𝓂𝓃𝑜𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏',
  boldScript: '𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃',
  mono: '𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣',
  doubleStruck: '𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫',
  circled: 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ',
  squared: '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉',
  gothic: '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷',
  smallCaps: 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ',
  upsideDown: '∀ᗺƆᗡƎℲ⅁HIſʞ˥WNOԀὉᴚS⊥UVWXYZoʍxʎzɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz',
  reversed: 'ZYXWVUTSRQPONMLKJIHGFEDCBAzyxwvutsrqponmlkjihgfedcba',
  tiny: 'ᵃᵇᶜᵈᵉᶠᵍʰᶦʲᵏˡᵐⁿᵒᵖᵠʳˢᵗᵘᵛʷˣʸᶻ',
  wide: 'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ',
  bubble: 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ',
  blackSquare: '🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉',
  fairy: 'ᏗᏰፈᎴᏋᎦᎶᏂᎥᏠᏦᏝᎷᏁᎧᎮᎤᏒᏕᏖᏬᏉᏇጀᎩᏃ'
};
  
  const normalAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';  
    
  function convertText(inputText, fontMap) {  
    return inputText.split('').map(char => {  
      const index = normalAlphabet.indexOf(char);  
      return index !== -1 ? fontMap[index] : char;  
    }).join('');  
  }  
  
  let result;  
  if (style === 'all') {  
    result = {};  
    Object.keys(fontStyles).forEach(font => {  
      result[font] = convertText(text, fontStyles[font]);  
    });  
  } else {  
    result = convertText(text, fontStyles[style] || fontStyles.bold);  
  }  
  
  res.json({  
    status: 'success',  
    original: text,  
    fonts: result,  
    available_styles: Object.keys(fontStyles),  
    creator: 'Gabimaru'  
  });  
}); 

app.get('/aipic', async (req, res) => {
  const prompt = req.query.prompt;
  if (!prompt) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing ?prompt= parameter',
      creator: 'Gabimaru'
    });
  }

  try {
    const response = await axios.get('https://api-toxxic.zone.id/api/ai/ai4chat', {
      params: { prompt }
    });

    const raw = response.data?.data;
    if (!raw) {
      return res.status(500).json({
        status: 'error',
        message: 'Unexpected API response',
        creator: 'Gabimaru'
      });
    }

    const simplified = {
      url: raw,
    };

    res.json({
      status: 'success',
      image: simplified,
      creator: 'Gabimaru'
    });
  } catch {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch AI image',
      creator: 'Gabimaru'
    });
  }
});

app.get('/waifu', async (req, res) => {  
  try {  
    const response = await axios.get('https://waifu.pics/api/sfw/waifu');  
    const imageUrl = response.data.url;  
  
    res.json({  
      status: 'success',  
      category: 'waifu',  
      url: imageUrl,  
      creator: 'Gabimaru'  
    });  
  } catch (error) {  
    res.status(500).json({  
      status: 'error',  
      message: 'Failed to fetch waifu image',  
      creator: 'Gabimaru'  
    });  
  }  
});  
  
app.get('/nsfw', async (req, res) => {  
  try {  
    const response = await axios.get('https://waifu.pics/api/nsfw/waifu');  
    const imageUrl = response.data.url;  
  
    res.json({  
      status: 'success',  
      category: 'nsfw',  
      url: imageUrl,  
      creator: 'Gabimaru'  
    });  
  } catch (error) {  
    res.status(500).json({  
      status: 'error',  
      message: 'Failed to fetch nsfw image',  
      creator: 'Gabimaru'  
    });  
  }  
});  

app.get('/bibleverse', async (req, res) => {  
  const query = req.query.verse;  
  if (!query) {  
    return res.status(400).json({  
      status: 'error',  
      message: 'Please provide a verse, e.g., /bibleverse?verse=John:3+16',  
      creator: 'Gabimaru'  
    });  
  }  
  
  try {  
    const url = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(query)}&version=KJV`;  
    const { data } = await axios.get(url);  
    const $ = cheerio.load(data);  
  
    const verseText = $('.passage-text .text').text().trim().replace(/\s+/g, ' ');  
  
    if (!verseText) {  
      return res.status(404).json({  
        status: 'error',  
        message: 'Verse not found or invalid reference',  
        creator: 'Gabimaru'  
      });  
    }  
  
    res.json({  
      verse: query.replace(/\+/g, ' '),  
      text: verseText,  
      version: 'KJV',  
      status: 'success',  
      creator: 'Gabimaru'  
    });  
  } catch (error) {  
    res.status(500).json({  
      status: 'error',  
      message: 'Failed to fetch Bible verse',  
      creator: 'Gabimaru'  
    });  
  }  
});  


app.get('/quote', async (req, res) => {  
  try {  
    const { data } = await axios.get('https://quotes.toscrape.com/random');  
    const $ = cheerio.load(data);  
    const quote = $('.text').text();  
    const author = $('.author').text();  
  
    res.json({  
      quote,  
      author,  
      status: 'success',  
      creator: 'Gabimaru'  
    });  
  } catch (error) {  
    res.status(500).json({  
      status: 'error',  
      message: 'Failed to fetch quote',  
      creator: 'Gabimaru'  
    });  
  }  
});  

// Start self-pinging functionality
startSelfPing(app);
  
app.listen(PORT, () => {  
  console.log(`- Server running on port ${PORT}`);  
  console.log(`- Check server health at: http://localhost:${PORT}/health`);  
  console.log(`- API available at: http://localhost:${PORT}`);  
});