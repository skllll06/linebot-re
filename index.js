const express = require("express");
const path = require("path");
const PORT = process.env.PORT || 5000;
const { Client } = require('pg');
const line = require("@line/bot-sdk");

//postgresql設定
const connection = new Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: 5432
});
connection.connect();

//LINE API設定
const config = {
  channelAccessToken: process.env.ACCESS_TOKEN,
  channelSecret: process.env.SECRET_KEY
};
const client = new line.Client(config);

express()
  .use(express.static(path.join(__dirname, "public")))
  .set("views", path.join(__dirname, "views"))
  .set("view engine", "ejs")
  .get("/", (req, res) => res.render("pages/index"))
  .post("/hook/", line.middleware(config), (req, res) => lineBot(req, res))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

function lineBot(req, res) {
  //とりあえず200番を返す
  res.status(200).end();
  // ボディからイベントを取得
  const events = req.body.events;
  const promises = [];
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    switch (ev.type) {
      case 'follow':
        promises.push(greeting_follow(ev));
        break;
      case 'message':
        promises.push(handleMessageEvent(ev));
        break;
    }
  }
  Promise
    .all(promises)
    .then(console.log('all promises passed'))
    .catch(e => console.error(e.stack));
}


// 追加
async function handleMessageEvent(ev) {
  //ユーザー名を取得
  const pro = await client.getProfile(ev.source.userId);
  const text = (ev.message.type === 'text') ? ev.message.text : '';
  //返事を送信
  if (text === '予約する') {
    orderChoice(ev);
  } else {
    return client.replyMessage(ev.replyToken, {
      type: "text",
      text: `${pro.displayName}さん、今「${ev.message.text}」って言いました？`
    })
  }
}

const greeting_follow = async (ev) => {
  const profile = await client.getProfile(ev.source.userId);
  return client.replyMessage(ev.replyToken, {
    "type": "text",
    "text": `${profile.displayName}さん、フォローありがとうございます!\uDBC0\uDC04`
  });
}


const orderChoice = (ev) => {
  return client.replyMessage(ev.replyToken, {
    "type": "flex",
    "altText": "menuSelect",
    "contents":
    {
      "type": "carousel",
      "contents": [
        {
          "type": "bubble",
          "hero": {
            "type": "image",
            "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_5_carousel.png",
            "size": "full",
            "aspectRatio": "20:13",
            "aspectMode": "cover"
          },
          "body": {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": [
              {
                "type": "text",
                "text": "KEISEN ALFA-岡山",
                "weight": "regular",
                "size": "xl",
                "align": "center",
                "gravity": "bottom",
                "margin": "sm",
                "wrap": true,
                "contents": []
              }
            ]
          },
          "footer": {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": [
              {
                "type": "button",
                "action": {
                  "type": "message",
                  "label": "予約する",
                  "text": "ALFA"
                },
                "style": "primary"
              },
              {
                "type": "button",
                "action": {
                  "type": "uri",
                  "label": "Access",
                  "uri": "https://eeej.jp/villa_keisen/"
                }
              }
            ]
          }
        },
        {
          "type": "bubble",
          "hero": {
            "type": "image",
            "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_5_carousel.png",
            "size": "full",
            "aspectRatio": "20:13",
            "aspectMode": "cover"
          },
          "body": {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": [
              {
                "type": "text",
                "text": "KEISEN BETA-広島",
                "weight": "regular",
                "size": "xl",
                "align": "center",
                "gravity": "bottom",
                "margin": "sm",
                "wrap": true,
                "contents": []
              }
            ]
          },
          "footer": {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": [
              {
                "type": "button",
                "action": {
                  "type": "message",
                  "label": "予約する",
                  "text": "BETA"
                },
                "style": "primary"
              },
              {
                "type": "button",
                "action": {
                  "type": "uri",
                  "label": "Access",
                  "uri": "https://eeej.jp/villa_keisen/"
                }
              }
            ]
          }
        },
        {
          "type": "bubble",
          "body": {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": [
              {
                "type": "button",
                "action": {
                  "type": "uri",
                  "label": "See more",
                  "uri": "https://eeej.jp/villa_keisen/"
                },
                "flex": 1,
                "gravity": "center"
              }
            ]
          }
        }
      ]
    }
  });
}