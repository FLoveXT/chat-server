// 引入
const mongoose = require('mongoose')
//连接指定数据库
mongoose.connect('mongodb://localhost:27017/chat',{useNewUrlParser:true})
//获取连接对象
const conn = mongoose.connection
//监听
conn.on('connected',function(){
  console.log('database connected')
})

//  创建对应的model
// 定义user的schema
const userSchema = mongoose.Schema({
  username:{type:String,requirer:true},
  password:{type:String,requirer:true},
  sex:{type:String,requirer:true},
  header:{type:String},
  nickname:{type:String},
  company:{type:String},
  job:{type:String},
  city:{type:Array},
  applyFriends:{type:Array},
  Friends:{type:Array},
  chatFriends:{type:Array,required:true}
})

//定义model
const UserModel = mongoose.model('user',userSchema)
//向外暴露
exports.UserModel = UserModel

//定义聊天的schema
const chatSchema = mongoose.Schema({
  myid:{type:String,required:true}, //我的id
  fdid:{type:String,required:true}, //朋友的id
  content:{type:String,required:true},
  chat_id:{type:String,required:true}, //两个id组成的字符串
  read:{type:Boolean,default:false},//判断是否已读
  create_time:{type:Number}
})

const ChatModel = mongoose.model('chatmsg',chatSchema)

exports.ChatModel = ChatModel

