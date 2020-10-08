//設定
const express = require("express");
const path = require("path");
const PORT = process.env.PORT || 5000;
const { Client } = require('pg');
const line = require("@line/bot-sdk");
var fs = require('fs');

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

//リッチメニュー
const richmenu = {
  "size": {
    "width": 2500,
    "height": 843
  },
  "selected": true,
  "name": "リッチメニュー 1",
  "chatBarText": "お知らせ",
  "areas": [
    {
      "bounds": {
        "x": 0,
        "y": 4,
        "width": 825,
        "height": 839
      },
      "action": {
        "type": "message",
        "text": "アクション 1"
      }
    },
    {
      "bounds": {
        "x": 823,
        "y": 0,
        "width": 850,
        "height": 839
      },
      "action": {
        "type": "message",
        "text": "アクション 2"
      }
    },
    {
      "bounds": {
        "x": 1668,
        "y": 0,
        "width": 832,
        "height": 839
      },
      "action": {
        "type": "message",
        "text": "アクション 3"
      }
    }
  ]
}

//テーブル作成(userテーブル)
const create_userTable =
{
  text: 'CREATE TABLE IF NOT EXISTS users (id SERIAL NOT NULL, line_uid VARCHAR(255), display_name VARCHAR(255), timestamp VARCHAR(255));'
};
connection.query(create_userTable)
  .then(() => {
    console.log('table users created successfully!!');
  })
  .catch(e => console.log(e));

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
  client.createRichMenu(richmenu)
    .then((richMenuId) => {
      console.log(richMenuId)
      RichMenushow(richMenuId);
    })
 
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
      case 'postback':
        promises.push(handlePostbackEvent(ev));
        break;
    }
  }
  Promise
    .all(promises)
    .then(console.log('all promises passed'))
    .catch(e => console.error(e.stack));
}


async function handleMessageEvent(ev) {
  //ユーザー名を取得
  const pro = await client.getProfile(ev.source.userId);
  const text = (ev.message.type === 'text') ? ev.message.text : '';
  //返事を送信
  if (text === '予約する') {
    orderChoice(ev);
  } else if (text === 'ALFAを予約' || text === 'BETAを予約') {
    askDate(ev, text);
  } else {
    return client.replyMessage(ev.replyToken, {
      type: "text",
      text: `${pro.displayName}さん、今「${ev.message.text}」って言いました？`
    });
  }
}

const RichMenushow = function (richMenuId) { 
  client.setRichMenuImage(richMenuId, fs.createReadStream('./images/richmenu_def.jpg'))
  .then((richMenu) => {
    console.log('0');
})
  client.getRichMenu(richMenuId)
    .then((richMenu) => {
      console.log('①');
    console.log(richMenu.size);
    console.log(richMenu.areas[0].bounds);
    client.setRichMenuImage(richMenuId, fs.createReadStream('./images/richmenu_def.jpg'))
      .then((richMenu) => {
        console.log('②');
      client.setDefaultRichMenu(richMenuId)
        .then((richMenu) => {
          console.log('③');
      })
    })
  })
  
  
}

const greeting_follow = async (ev) => {
  const profile = await client.getProfile(ev.source.userId);
  const table_insert = {
    text: 'INSERT INTO users (line_uid,display_name,timestamp) VALUES($1,$2,$3);',
    values: [ev.source.userId, pro.displayName, timeStamp]
  };
  connection.query(table_insert)
    .then(() => {
      console.log('insert successfully!!')
    })
    .catch(e => console.log(e));
  return client.replyMessage(ev.replyToken, {
    "type": "text",
    "text": `${profile.displayName}さん、フォローありがとうございます!\uDBC0\uDC04`
  });
}

const handlePostbackEvent = async (ev) => {
  const profile = await client.getProfile(ev.source.userId);
  const data = ev.postback.data;
  const splitData = data.split('&');

  if (splitData[0] === 'menu') {
    const orderedMenu = splitData[1];
    askDate(ev, orderedMenu);
  } else if (splitData[0] === 'date') {
    const orderedMenu = splitData[1];
    const selectedDate = ev.postback.params.date;
    askTime(ev, orderedMenu, selectedDate);
  } else if (splitData[0] === 'time') {
    const orderedMenu = splitData[1];
    const selectedDate = splitData[2];
    const selectedTime = splitData[3];
    confirmation(ev, orderedMenu, selectedDate, selectedTime);
  } else if (splitData[0] === 'yes') {
    const orderedMenu = splitData[1];
    const selectedDate = splitData[2];
    const selectedTime = splitData[3];

  } else if (splitData[0] === 'no') {
    // 処理
  }
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
                  "text": "ALFAを予約"
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
                  "text": "BETAを予約"
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

const askDate = (ev, orderedMenu) => {
  return client.replyMessage(ev.replyToken, {
    "type": "flex",
    "altText": "予約日選択",
    "contents":
    {
      "type": "bubble",
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "来店希望日を選んでください。",
            "size": "md",
            "align": "center"
          }
        ]
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "button",
            "action": {
              "type": "datetimepicker",
              "label": "希望日を選択する",
              "data": `date&${orderedMenu}`,
              "mode": "date"
            }
          }
        ]
      }
    }
  });
}

const askTime = (ev, orderedMenu, selectedDate) => {
  return client.replyMessage(ev.replyToken, {
    "type": "flex",
    "altText": "予約時間選択",
    "contents":
    {
      "type": "bubble",
      "header": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "ご希望の時間帯を選択してください（緑=予約可能です）",
            "wrap": true,
            "size": "lg"
          },
          {
            "type": "separator"
          }
        ]
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "box",
            "layout": "vertical",
            "contents": [
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "午前(8:00~12:00)",
                  "data": `time&${orderedMenu}&${selectedDate}&0`
                },
                "style": "primary",
                "color": "#00AA00",
                "margin": "md"
              },
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "午後(13:00~17:00)",
                  "data": `time&${orderedMenu}&${selectedDate}&1`
                },
                "style": "primary",
                "color": "#00AA00",
                "margin": "md"
              },
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "終日(8:00~17:00)",
                  "data": `time&${orderedMenu}&${selectedDate}&2`
                },
                "style": "primary",
                "color": "#00AA00",
                "margin": "md"
              },
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "終了",
                  "data": "end"
                },
                "style": "primary",
                "color": "#0000ff",
                "margin": "md"
              }
            ],
            "margin": "md"
          }
        ]
      }
    }
  });
}

const confirmation = (ev, menu, date, time) => {
  const splitDate = date.split('-');
  let selectedTime
  switch (time) {
    case '0':
      selectedTime = "8:00~12:00";
      break;
    case '1':
      selectedTime = "13:00~17:00";
      break;
    case '2':
      selectedTime = "8:00~17:00";
      break;
  }
  return client.replyMessage(ev.replyToken, {
    "type": "flex",
    "altText": "menuSelect",
    "contents":
    {
      "type": "bubble",
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": `予約内容は${splitDate[1]}月${splitDate[2]}日 ${selectedTime}でよろしいですか？`,
            "size": "lg",
            "wrap": true
          }
        ]
      },
      "footer": {
        "type": "box",
        "layout": "horizontal",
        "contents": [
          {
            "type": "button",
            "action": {
              "type": "postback",
              "label": "はい",
              "data": `yes&${menu}&${date}&${time}`
            }
          },
          {
            "type": "button",
            "action": {
              "type": "postback",
              "label": "いいえ",
              "data": `no&${menu}&${date}&${time}`
            }
          }
        ]
      }
    }
  });
}