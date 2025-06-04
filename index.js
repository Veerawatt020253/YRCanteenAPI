const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3001; //เปลี่ยนตามใจตัวเองเลยจ้า
const DEBUG = process.env.DEBUG === 'true'; //ไว้ใครอยาก debug ฉันทำไว้ให้แล้ว

app.use(cors());
app.use(express.json());

app.post('/get-balance', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.goto('https://www.yupparaj.ac.th/canteen/login.php', {
      waitUntil: 'networkidle2'
    });

    await page.type('input[name="username"]', username, { delay: 50 });
    await page.type('input[name="password"]', password, { delay: 50 });
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ]);

    const currentUrl = page.url();
    if (DEBUG) console.log('Current URL after login:', currentUrl);

    if (!currentUrl.includes('index.php')) {
      await browser.close();
      return res.status(401).json({ error: 'Login failed (URL check)' });
    }

    const values = await page.$$eval('.small-box .inner h3', els =>
      els.map(el => el.textContent.trim())
    );

    const [balance, topUp, expense] = values;

    if (DEBUG) {
      console.log('Balance:', balance);
      console.log('Top-up:', topUp);
      console.log('Expense:', expense);
    }

    await browser.close();
    return res.json({ balance, topUp, expense });

  } catch (err) {
    await browser.close();
    console.error('[ERROR]', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
