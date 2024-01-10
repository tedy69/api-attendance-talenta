const { spawnSync } = require('child_process');
const express = require('express');
const playwright = require('playwright-chromium');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc.js');
const timezone = require('dayjs/plugin/timezone.js');
const codec = require('string-codec');
const FormData = require('form-data');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

dayjs.extend(utc);
dayjs.extend(timezone);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

app.post('/', async (req, res) => {
  try {
    const {
      LOCATION_TYPE,
      LAT_LNG,
      ACCOUNT_EMAIL,
      ACCOUNT_PASSWORD,
      CHECK_TYPE,
    } = req.body;

    await main(
      LOCATION_TYPE,
      LAT_LNG,
      ACCOUNT_EMAIL,
      ACCOUNT_PASSWORD,
      CHECK_TYPE,
    );

    // Return success message with status code 200 with json format
    res
      .status(200)
      .json({ status_code: 200, message: 'Success ' + CHECK_TYPE });
  } catch (error) {
    console.error(error);
    // Return error message with status code 500 with json format
    res.status(500).json({ status_code: 500, message: error.message });
  }
});

const PUBLIC_HOLIDAYS = [
  '23 Jan 2023', // cuti bersama imlek
  '23 Mar 2023', // nyepi
  '23 Mar 2023', // cuti bersama nyepi
  '7 Apr 2023', // wafat isa almasih
  '21 Apr 2023', // idul fitri
  '24 Apr 2023', // idul fitri
  '25 Apr 2023', // idul fitri
  '26 Apr 2023', // idul fitri
  '1 Mei 2023', // hari buruh
  '18 Mei 2023', // kenaikan isa almasih
  '1 Jun 2023', // hari lahir pancasila
  '2 Jun 2023', // cuti bersama waisak
  '29 Jun 2023', // idul adha
  '19 Jul 2023', // tahun baru islam
  '17 Aug 2023', // kemerdekaan indonesia
  '28 Sep 2023', // maulid nabi muhammad
  '25 Dec 2023', // natal
  '26 Dec 2023', // cuti bersama natal
  '1 Jan 2024', // tahun baru
  '8 Feb 2024', // imlek
  '9 Feb 2024', // cuti bersama imlek
  '11 Mar 2024', // nyepi
  '12 Mar 2024', // cuti bersama nyepi
  '29 Mar 2024', // wafat isa almasih
  '8 Apr 2024', // cuti bersama idul fitri
  '9 Apr 2024', // cuti bersama idul fitri
  '10 Apr 2024', // idul fitri
  '11 Apr 2024', // idul fitri
  '12 Apr 2024', // cuti bersama idul fitri
  '1 May 2024', // hari buruh
  '9 May 2024', // kenaikan isa almasih
];

const main = async (
  locationType,
  latlng,
  accountEmail,
  accountPassword,
  checkType,
) => {
  let geoLatitude = '';
  let geoLongitude = '';

  spawnSync('yarn', ['playwright', 'install', 'chromium']);
  spawnSync('yarn', ['playwright', 'install-deps']);

  const isHeadless = process.env.HEADLESS_BROWSER === 'true';

  const TODAY = dayjs().tz('Asia/Jakarta').format('D MMM YYYY');

  if (PUBLIC_HOLIDAYS.includes(TODAY)) {
    console.log('Today is a public holiday, skipping check in/out...');
    return;
  }

  const browser = await playwright['chromium'].launch({
    headless: isHeadless,
  });

  if (locationType === 'OFFICE_DALTON') {
    geoLatitude = process.env.GEO_LATITUDE_DALTON;
    geoLongitude = process.env.GEO_LONGITUDE_DALTON;
  } else if (locationType === 'OFFICE_APL') {
    geoLatitude = process.env.GEO_LATITUDE_APL;
    geoLongitude = process.env.GEO_LONGITUDE_APL;
  } else if (locationType === 'OFFICE_SYNERGY') {
    geoLatitude = process.env.GEO_LATITUDE_SYNERGY;
    geoLongitude = process.env.GEO_LONGITUDE_SYNERGY;
  } else if (locationType === 'HOME') {
    geoLatitude = process.env.GEO_LATITUDE_HOME;
    geoLongitude = process.env.GEO_LONGITUDE_HOME;
  } else if (locationType === 'CUSTOM') {
    geoLatitude = latlng.latitude;
    geoLongitude = latlng.longitude;
  }

  const context = await browser.newContext({
    viewport: { width: 1080, height: 560 },
    geolocation: {
      latitude: Number(geoLatitude),
      longitude: Number(geoLongitude),
    },
    permissions: ['geolocation'],
  });

  const page = await context.newPage();

  console.log('Opening login page...');
  await page.goto(
    'https://account.mekari.com/users/sign_in?client_id=TAL-73645&return_to=L2F1dGg_Y2xpZW50X2lkPVRBTC03MzY0NSZyZXNwb25zZV90eXBlPWNvZGUmc2NvcGU9c3NvOnByb2ZpbGU%3D',
  );

  await page.setViewportSize({ width: 1080, height: 560 });

  console.log('Filling in account email & password...');
  await page.click('#user_email');
  await page.fill('#user_email', accountEmail);

  await page.press('#user_email', 'Tab');
  await page.fill('#user_password', accountPassword); // Updated code

  console.log('Signing in...');
  await Promise.all([
    page.click('#new-signin-button'),
    page.waitForNavigation(),
  ]);

  const dashboardNav = page.getByText('Dashboard');
  if ((await dashboardNav.innerText()) === 'Dashboard') {
    console.log('Successfully Logged in...');
  }

  const myName = (await page.locator('#navbar-name').textContent()).trim();
  const whoIsOffToday = await page
    .locator('.tl-card-small', { hasText: `Who's Off` })
    .innerText();

  const isOffToday = whoIsOffToday.includes(myName);

  if (isOffToday) {
    console.log('You are off today, skipping check in/out...');
    await browser.close();
    return;
  }

  if (process.env.SKIP_CHECK_IN_OUT === 'true') {
    console.log('Skipping Check In/Out...');
    await browser.close();
    return;
  }

  const cookies = await context.cookies();

  let obj = cookies.find((o) => o.name === 'PHPSESSID');

  if (obj === undefined) {
    console.log("Can't find PHPSESSID Cookies");
    await browser.close();
    return;
  }

  let desc = 'Check In';
  if (checkType === 'CHECK_OUT') {
    desc = 'Check Out';
  }

  const isCheckOut = checkType === 'CHECK_OUT';

  const config = prepForm({
    long: geoLongitude,
    lat: geoLatitude,
    desc: desc,
    cookies: 'PHPSESSID=' + obj.value,
    isCheckOut: isCheckOut,
  });

  const data = await attendancePost(config);

  console.log('Success ' + checkType);

  await browser.close();

  return data;
};

const prepForm = (obj) => {
  const { long, lat, desc, cookies, isCheckOut = false } = obj;
  const data = new FormData();
  const status = isCheckOut ? 'checkout' : 'checkin';

  const longEncoded = codec.encoder(codec.encoder(long, 'base64'), 'rot13');
  const latEncoded = codec.encoder(codec.encoder(lat, 'base64'), 'rot13');

  data.append('longitude', longEncoded);
  data.append('latitude', latEncoded);
  data.append('status', status);
  data.append('description', desc);

  const config = {
    method: 'post',
    url: 'https://hr.talenta.co/api/web/live-attendance/request',
    headers: {
      Cookie: cookies,
      ...data.getHeaders(),
    },
    data: data,
  };

  return config;
};

const attendancePost = async (config) => {
  const resp = await axios(config);

  return resp.data;
};

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
