const express = require('express');
const router = express.Router();
// 加密
const md5 = require('blueimp-md5')
//引入model
const { UserModel, ChatModel } = require('../models/models')

//过滤掉密码
const filter = { password: 0, __v: 0 }

/* rigster page. */
router.post('/register', function (req, res, next) {
  const { username, password, password2, sex } = req.body
  UserModel.findOne({ username }, (err, user) => {
    if (user) {
      return res.send({ code: 1, msg: '此用户名存在' })
    } else {
      //保存数据
      new UserModel({ username, password: md5(password + 'Allen'), sex, applyFriends: [], Friends: [], chatFriends: [] }).save((err, user) => {
        if (err) {
          console.log(err)
        }
        //保存成功，同时生产cookie(userid:user._id)
        res.cookie('userid', user._id, { maxAge: 1000 * 60 * 60 * 24 * 10 })
        //返回数据
        return res.send({ code: 0, data: user })
      })
    }
  })
});
/* login page. */
router.post('/login', function (req, res, next) {
  const { username, password } = req.body
  UserModel.findOne({ username, password: md5(password + 'Allen') }, filter, (err, user) => {
    if (err) {
      console.log(err)
    }
    else if (!user) {
      return res.send({ code: 1, msg: '用户名或密码错误' })
    } else {
      //登录成功，保存到cookie
      res.cookie('userid', user._id, { maxAge: 1000 * 60 * 60 * 24 * 10 })
      //返回数据
      return res.send({ code: 0, data: user })
    }
  })
});

/* user 信息完善 page. */
router.post('/update', function (req, res) {
  //得到用户的userid，从cookie中
  const userid = req.cookies.userid
  if (!userid) {
    return res.send({ code: 1, msg: '请先登录' })
  }
  //从数据库中找到用户并更新数据库资料
  UserModel.findByIdAndUpdate({ _id: userid }, req.body, (err, user) => {

    //这里的user是数据库中原来的数据，要把req.body中的数据和user原来的数据拼接到一起去
    const { _id, username, sex } = user
    //合并
    const data = Object.assign(req.body, { _id, username, sex, applyFriends: [], Friends: [], chatFriends: [] })
    return res.send({ code: 0, data })
  })

});
/* 获取user 信息 page. */
router.get('/user', function (req, res) {
  //根据cookie获取userid
  const userid = req.cookies.userid
  if (!userid) {
    return res.send({ code: 1, msg: '请先登录' })
  }
  UserModel.findOne({ _id: userid }, filter, (err, user) => {

    return res.send({ code: 0, data: user })
  })
})

/* 根据用户名获取用户信息 page. */
router.post('/find', function (req, res) {

  const { username } = req.body
  UserModel.findOne({ username }, filter, (err, user) => {
    if (err) {
      console.log(err)
    }
    if (!user) {
      return res.send({ code: 1, msg: '该用户不存在' })
    }
    return res.send({ code: 0, data: user })
  })
})

/* 根据发送过来的用户数据，组成新的user数据，处理对方发送申请后，自己这边的申请人的渲染 page. */
router.post('/apply', function (req, res) {

  const { friendID, _id, header, nickname } = req.body
  // 先要获得原来的applyFriends的数组
  UserModel.findOne({ _id: friendID }, filter, (err, user) => {
    const initArray = user.applyFriends
    //再把新来的申请人的数据放到里面
    initArray.unshift({ _id, nickname, header })
    //再去修改被申请人数据
    UserModel.findByIdAndUpdate({ _id: friendID }, { applyFriends: initArray }, (err, newuser) => {

      if (!newuser) {
        return res.send({ code: 1, msg: '发送申请失败' })
      }
      return res.send({ code: 0, msg: '发送申请成功' })
    })
  })
})

// 用户点击通过按钮后，添加朋友成功
router.post('/applyconfirm', function (req, res) {
  // 临时放朋友的对象
  let friend = {}
  //获取用户的id
  const userid = req.cookies.userid
  //获取一个申请人的id，自己user的一个id
  const { itemIndex, friendID } = req.body

  //根据applyid从applyFriends中拿出数据，
  UserModel.findOne({ _id: userid }, filter, (err, user) => {
    // 对user里面的applyFriends和Friends进行处理
    //拿出点击通过的那个用户的信息，存到Friends中去

    friend = user.applyFriends[itemIndex]
    //获取原来的Friends数组值
    let oldFriends = user.Friends

    //放进去 
    if (friend) {
      oldFriends.unshift(friend)
    } else {
      return res.send({ code: 1, msg: '添加失败1' })
    }

    //applyFriends删掉这个friend
    //才有过滤filter返回一个新的数组
    let newapplyFriends = user.applyFriends
    newapplyFriends.splice(itemIndex, 1)
    //更新
    UserModel.findByIdAndUpdate({ _id: userid }, { applyFriends: newapplyFriends, Friends: oldFriends }, (err, newuser) => {

      if (!newuser) {
        return res.send({ code: 1, msg: '添加失败' })
      }
      // 根据friendID 找到申请人的数据库进行更改，把被申请人的数据放入到friends中
      let { _id, nickname, header } = newuser
      UserModel.findOne({ _id: friendID }, filter, (err, applyer) => {
        const oldApplyFriends = applyer.Friends
        oldApplyFriends.unshift({ _id, nickname, header })
        UserModel.findByIdAndUpdate({ _id: friendID }, { Friends: oldApplyFriends }, (err, newapplyer) => {
          if (!newapplyer) {
            return res.send({ code: 1, msg: '添加失败' })
          }
          return res.send({ code: 0, msg: '添加成功' })
        })
      })
    })
  })
})

/*当点击发送时，互相把对方放到了自己的聊天朋友数据库了 */
router.post('/postchatfriend', function (req, res) {
  //从提交的数据中提出
  const { fdid, nickname, header } = req.body

  //获取我的id从cookies中
  const myid = req.cookies.userid
  // 先处理my的
  //先获取老的朋友数据
  UserModel.findOne({ _id: myid }, (err, my) => {
    let oldchatFriends = my.chatFriends
    //先判断老的数据里面有没有这个fdid

    if (JSON.stringify(oldchatFriends).indexOf(JSON.stringify({ fdid, nickname, header })) === -1) {
      //数据--更新
      // 这里前台去判断对象数组里面有没有这个对象，如果有，不调用这个请求，没有再调用
      oldchatFriends.unshift({ fdid, nickname, header })
      UserModel.findOneAndUpdate({ _id: myid }, { chatFriends: oldchatFriends }, (err, newmy) => {
        if (err) {
          console.log(err)
        }
        //处理对方的
        let { header, nickname } = newmy
        UserModel.findOne({ _id: fdid }, (err, fd) => {
          const oldfdchatFriends = fd.chatFriends
          oldfdchatFriends.unshift({ fdid: myid, nickname, header })
          UserModel.findOneAndUpdate({ _id: fdid }, { chatFriends: oldfdchatFriends }, (err, newfd) => {
            if (err) {
              return res.send({ code: 1, msg: '互相保存失败' })
            }
            return res.send({ code: 0, msg: '互相保存成功' })
          })
        })
      })
    } else {
      // return res.send({code:0,msg:'已经有这个人了'})
      console.log('已经有了')
    }
  })
})

/* 获取当前用户所有相关聊天消息列表 */
router.get('/chatmsg', function (req, res) {
  //获取我的用户id
  const myid = req.cookies.userid

  //根据我的id查找与我相关的聊天信息，这里我的 myid 可能是作为myid，也有可能是fdid
  // {myid:{ '$in':[myid,fdid]} {fdid:{ '$in':[myid,fdid]}

  ChatModel.find({ '$or': [{ myid }, { fdid: myid }] }, filter, (err, chatMsgs) => {
    if (err) {
      console.log(err)
    }
    // const cc = chatMsgs.filter(msg => msg.fdid === fdid || msg.)
    return res.send({ code: 0, data: chatMsgs })
  })
})
/*修改指定消息为已读*/
router.post('/readchatmsg', function (req, res) {
  const myid = req.cookies.userid
  const fdid = req.body.fdid
  console.log(fdid)
  ChatModel.update({ myid: fdid, fdid: myid, read: false }, { read: true }, { multi: true }, (err, doc) => {
    if(err){
      console.log(err)
    }
    console.log(doc)
    return res.send({ code: 0, data: doc.nModified }) //更新的数量
  })
})

module.exports = router;
