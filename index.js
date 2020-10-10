//設定
const express = require("express");
const path = require("path");
const PORT = process.env.PORT || 5000;
const { Client } = require('pg');
const line = require("@line/bot-sdk");
var fs = require('fs');
var ids = require('ids');
const { resolve } = require("path");

//postgresql設定
const connection = new Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: 5432
});
connection.connect();

//施設の辞書
const placeDic = {
  0: 'ALFA-岡山',
  1: 'BETA-広島'
};

const timeDir = {
  0: "8:00~12:00",
  1: "13:00~17:00",
  2: "8:00~17:00"
}

//LINE API設定
const config = {
  channelAccessToken: process.env.ACCESS_TOKEN,
  channelSecret: process.env.SECRET_KEY
};
const client = new line.Client(config);


//テーブル作成(userテーブル)
const create_userTable =
{
  text: 'CREATE TABLE IF NOT EXISTS users (id SERIAL NOT NULL, line_uid VARCHAR(255)  PRIMARY KEY , display_name VARCHAR(255), timestamp VARCHAR(255));'
};
connection.query(create_userTable)
  .then(() => {
    console.log('table users created successfully!!');
  })
  .catch(e => console.log(e));

//テーブル作成(userテーブル)
const create_reservationTable = {
  text: 'CREATE TABLE IF NOT EXISTS reservations (id SERIAL NOT NULL, line_uid VARCHAR(255), scheduledate DATE, scheduletime VARCHAR(50), place VARCHAR(50),PRIMARY KEY(scheduledate, scheduletime, place));'
};
connection.query(create_reservationTable)
  .then(() => {
    console.log('table reservation created successfully!!');
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

const greeting_follow = async (ev) => {
  const profile = await client.getProfile(ev.source.userId);
  const table_insert = {
    text: 'INSERT INTO users (line_uid,display_name,timestamp) VALUES($1,$2,$3);',
    values: [ev.source.userId, profile.displayName, ev.timestamp]
  };
  console.log(table_insert)
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

async function handleMessageEvent(ev) {
  //ユーザー名を取得
  const profile = await client.getProfile(ev.source.userId);
  const text = (ev.message.type === 'text') ? ev.message.text : '';
  //返事を送信
  if (text === '予約する') {
    orderChoice(ev);
  } else {
    return client.replyMessage(ev.replyToken, {
      type: "text",
      text: `${profile.displayName}さん、今「${ev.message.text}」って言いました？`
    });
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
                  "type": "postback",
                  "label": "予約する",
                  "data": "place&0"
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
                  "type": "postback",
                  "label": "予約する",
                  "data": "place&1"
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

const handlePostbackEvent = async (ev) => {
  const profile = await client.getProfile(ev.source.userId);
  const data = ev.postback.data;
  const splitData = data.split('&');

  if (splitData[0] === 'place') {
    const orderedPlace = splitData[1];
    askDate(ev, orderedPlace);
  } else if (splitData[0] === 'date') {
    const orderedPlace = splitData[1];
    const selectedDate = ev.postback.params.date;
    askTime(ev, orderedPlace, selectedDate);
  } else if (splitData[0] === 'time') {
    const orderedPlace = splitData[1];
    const selectedDate = splitData[2];
    const selectedTime = splitData[3];
    confirmation(ev, orderedPlace, selectedDate, selectedTime);
  } else if (splitData[0] === 'yes') {
    const orderedPlace = splitData[1];
    const selectedDate = splitData[2];
    const selectedTime = splitData[3];
    let insertQuery
    if (selectedTime === '2') {
      console.log(selectedTime)
      insertQuery = {
        text: 'INSERT INTO reservations (line_uid, scheduledate, scheduletime, place) VALUES($1,$2,$3,$4),($1,$2,$5,$4);',
        values: [ev.source.userId, selectedDate, 0, orderedPlace, 1]
      };
      console.log(selectedTime)
      console.log(insertQuery)
    } else {
      insertQuery = {
        text: 'INSERT INTO reservations (line_uid, scheduledate, scheduletime, place) VALUES($1,$2,$3,$4);',
        values: [ev.source.userId, selectedDate, selectedTime, orderedPlace]
      };
      console.log(selectedTime)
      console.log(insertQuery)
    };

    connection.query(insertQuery)
      .then(res => {
        console.log('データ格納成功！');
        client.replyMessage(ev.replyToken, {
          "type": "text",
          "text": "予約が完了しました。"
        });
      })
      .catch(e => {
        console.log(e)
        console.log('データ格納失敗');
        client.replyMessage(ev.replyToken, {
          "type": "text",
          "text": "予約に失敗しました。\n申し訳ございませんが初めからお願いします。"
        });
      });

  } else if (splitData[0] === 'no') {
    client.replyMessage(ev.replyToken, {
      "type": "text",
      "text": "予約を終了しました。"
    });
  } else if (splitData[0] === 'richconfirm') {
    console.log("予約確認")
    const nextResrvation = await checkPersonalReservation(ev);
    const splitDate = nextReservation[0].scheduledate.split('-');
    const orderedPlace = nextReservation[0].placwe
    const strTime = timeDir[nextReservation[0].scheduledtme]
    return client.replyMessage(ev.replyToken, {
      "type": "text",
      "text": `次回予約は${placeDic[orderedPlace]}の${splitDate[1]}月${splitDate[2]}日 ${strTime}です`
    });
  };
}


const askDate = (ev, orderedPlace) => {
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
              "data": `date&${orderedPlace}`,
              "mode": "date"
            }
          }
        ]
      }
    }
  });
}

const askTime = (ev, orderedPlace, selectedDate) => {
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
                  "data": `time&${orderedPlace}&${selectedDate}&0`
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
                  "data": `time&${orderedPlace}&${selectedDate}&1`
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
                  "data": `time&${orderedPlace}&${selectedDate}&2`
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

const confirmation = (ev, orderedPlace, selectedDate, selectedTime) => {
  const splitDate = selectedDate.split('-');
  let strTime
  switch (selectedTime) {
    case '0':
      strTime = "8:00~12:00";
      break;
    case '1':
      strTime = "13:00~17:00";
      break;
    case '2':
      strTime = "8:00~17:00";
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
            "text": `予約内容は${placeDic[orderedPlace]}の${splitDate[1]}月${splitDate[2]}日 ${strTime}でよろしいですか？`,
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
              "data": `yes&${orderedPlace}&${selectedDate}&${selectedTime}`
            }
          },
          {
            "type": "button",
            "action": {
              "type": "postback",
              "label": "いいえ",
              "data": `no&${orderedPlace}&${selectedDate}&${selectedTime}`
            }
          }
        ]
      }
    }
  });
}

const checkPersonalReservation = (ev) => {
  return new Promise((resolve, rejext) => {
    const id = ev.source.userId;
    const nowTime = new Date();
    const selectQuery = {
      text: 'SELECT * FROM reservations WHERE line_uid = $1 ORDER BY scheduledate ASC;',
      values: [`${id}`]
    };
    connection.query(selectQuery)
      .then(res => {
        console.log("select成功")
        const nextRearvation = res.rows.filter(object => {
          console.log(object.scheduledate)
          return object.scheduledate >= nowTime;
        });
        console.log(nextRearvation);
        resolve(nextRearvation);
      })
      .catch(e => console.log(e))
  });
}


