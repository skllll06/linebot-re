const express = require("express");
const path = require("path");
const PORT = process.env.PORT || 5000;
const line = require("@line/bot-sdk");
const config = {
  channelAccessToken: process.env.ACCESS_TOKEN,
  channelSecret: process.env.SECRET_KEY
};

const client = new line.Client(config); // 追加

express()
  .use(express.static(path.join(__dirname, "public")))
  .set("views", path.join(__dirname, "views"))
  .set("view engine", "ejs")
  .get("/", (req, res) => res.render("pages/index"))
  .post("/hook/", line.middleware(config), (req, res) => lineBot(req, res))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

function lineBot(req, res) {
  //200番を返す
  res.status(200).end();
  // ボディからイベントを取得
  const events = req.body.events;
  const promises = [];
  for(let i=0;i<events.length;i++){
    const ev = events[i];
    switch(ev.type){
        case 'follow':
            promises.push(greeting_follow(ev));
            break;
        case 'text':
            promises.push(echoman(ev));
            break;
    }
}
Promise
    .all(promises)
    .then(console.log('all promises passed'))
    .catch(e=>console.error(e.stack));
}


// 追加
async function echoman(ev) {
  //ユーザー名を取得
  const pro = await client.getProfile(ev.source.userId);
  //返事を送信
  return client.replyMessage(ev.replyToken, {
    type: "text",
    text: `${pro.displayName}さん、今「${ev.message.text}」って言いました？`
  })
}

const greeting_follow = async (ev) => {
  const profile = await client.getProfile(ev.source.userId);
  return client.replyMessage(ev.replyToken,{
      "type":"text",
      "text":`${profile.displayName}さん、フォローありがとうございます!\uDBC0\uDC04`
  });
}