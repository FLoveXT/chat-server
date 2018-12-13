
const {ChatModel} = require('../models/models')

module.exports = function(server){
  const io = require('socket.io')(server)

  io.on('connection',(socket)=>{
    console.log('有用户连接上了服务器')
    socket.on('sendMessage',({myid,fdid,content})=>{
      const chat_id = myid + '_' + fdid
      const create_time = Date.now()
      new ChatModel({myid,fdid,content,chat_id,create_time}).save((err,chatMsg)=>{
        if(err){console.log(err)}
        io.emit('receiveMsg',chatMsg)
      })
    })
  })
}