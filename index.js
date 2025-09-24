const express = require('express');  
const axios = require('axios');  
const cheerio = require('cheerio');  
const compression = require('compression');
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

// Health check
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
    // Search for the character  
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
  
    // Fetch character details  
    const detailsResponse = await axios.get(`https://api.jikan.moe/v4/characters/${character.mal_id}/full`);  
    const details = detailsResponse.data.data;  
  
    // Extract anime information  
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
    return res.status(400).json({
      status: 'error',
      message: 'Missing ?url= parameter',
      creator: 'Gabimaru'
    });
  }

  try {
    const response = await axios.get('https://api-toxxic.zone.id/api/downloader/aio', {
      params: { url }
    });

    res.json({
      status: 'success',
      platform: 'tiktok',
      data: response.data,
      creator: 'Gabimaru'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch TikTok video',
      creator: 'Gabimaru'
    });
  }
});

// Instagram Downloader
app.get('/instadl', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing ?url= parameter',
      creator: 'Gabimaru'
    });
  }

  try {
    const response = await axios.get('https://api-toxxic.zone.id/api/downloader/aio', {
      params: { url }
    });

    res.json({
      status: 'success',
      platform: 'instagram',
      data: response.data,
      creator: 'Gabimaru'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch Instagram media',
      creator: 'Gabimaru'
    });
  }
});

// Facebook Downloader
app.get('/fbdl', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing ?url= parameter',
      creator: 'Gabimaru'
    });
  }

  try {
    const response = await axios.get('https://api-toxxic.zone.id/api/downloader/aio', {
      params: { url }
    });

    res.json({
      status: 'success',
      platform: 'facebook',
      data: response.data,
      creator: 'Gabimaru'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch Facebook video',
      creator: 'Gabimaru'
    });
  }
});

// All-in-one Downloader
app.get('/dl', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing ?url= parameter',
      creator: 'Gabimaru'
    });
  }

  try {
    const response = await axios.get('https://api-toxxic.zone.id/api/downloader/aio', {
      params: { url }
    });

    res.json({
      status: 'success',
      platform: 'auto-detect',
      data: response.data,
      creator: 'Gabimaru'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch media',
      creator: 'Gabimaru'
    });
  }
});

app.get('/aipic', async (req, res) => {
  const genask = req.query.prompt;
  if (!genask) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing ?prompt= parameter',
      creator: 'Gabimaru'
    });
  }

  try {
    const response = await axios.get('https://api-toxxic.zone.id/api/ai/ai4chat', {
      params: { prompt: genask }
    });

    res.json({
      status: 'success',
      data: response.data,
      creator: 'Gabimaru'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch media',
      creator: 'Gabimaru'
    });
  }
});

app.get('/aio', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing ?url= parameter',
      creator: 'Gabimaru'
    });
  }

  try {
    const response = await axios.get('https://api-toxxic.zone.id/api/downloader/aio', {
      params: { url }
    });

    res.json({
      status: 'success',
      platform: 'auto-detect',
      data: response.data,
      creator: 'Gabimaru'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch media',
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