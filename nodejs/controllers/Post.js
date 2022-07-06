const connectToDatabase = require('../config/database')
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const fs = require('fs');
require('dotenv').config();
let multer  = require('multer');
let multerS3 = require('multer-s3');
let aws = require('aws-sdk');
let s3 = new aws.S3();
const DIR = 'public/profiles/posts/';
const { Op } = require("sequelize");
const Sequelize = require('sequelize');
var encryptor = require('simple-encryptor')(process.env.ECRP_PRIVATE_KEY);

const { transporter, postCommentEmailTemp, postLikeEmailTemp, postReportEmailTemp, postCommentLikeEmailTemp, postCommentReplyEmailTemp } = require('../controllers/Emails')
const { wtPostCommentTemp, wtPostLike, txtPostLike, txtPostComment, txtPostCommentLike, wtPostCommentLike, wtPostReply, txtPostReply } = require('../controllers/SMSTwilio')
const { createPost, likePost, commentPost, commentPortfolioProject, setCachePromis, removeCachePromis, productUse } = require('../controllers/Mixpanel')

const halper = require('../halpers/index');
// socket.io
// var app = require('express')();
// var http = require('http').createServer(app);
// var io = require('socket.io')(http);


module.exports.postStore = postStore = async (req, res) => {
  const { Post, PostImage, User } = await connectToDatabase()
  let decoded = jwt.decode(req.header("x-auth-token"), {complete: true});
  let user_id = decoded.payload.id;
  let id = user_id;
  let currThis = this;
  const storage = multerS3({
      s3: s3,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_BUCKET_NAME,
      acl: 'public-read',
      contentType: multerS3.AUTO_CONTENT_TYPE,
      contentDisposition: 'inline',
      metadata: function (req, file, cb) {
        cb(null, {fieldName: file.fieldname});
      },
      key: function (req, file, cb) {
        let datetime = Date.now();
        fileName = id+'_'+datetime+'_'+file.originalname.toLowerCase().split(' ').join('-');
        fileName = fileName.replace(/'/g, "").replace(/\(|\)/g, "");
        cb(null, `${process.env.POST_IMG_DIR}/${fileName}`)
      },
    });

  let upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
        cb(null, true);
      } else {
        cb(null, false);
        return cb(('Only .png, .jpg and .jpeg format allowed!'));
      }
    },
    limits:{
          fileSize: 1024 * 1024 * 5
      }
  }).array('post_image');
  const user = await User.findByPk(id, {attributes:['id','name', 'last_name', 'distinct_id', 'analytic_user_id']});
  upload(req, res, function (err) {
    if (err) {
      if (err.message) { message = 'File too large, Please try with image less than 5 MB of size.'; } else { message = err.message; }
      res.json({
        'status':false,
        'message':message
      })
    } else {

      Post.create({
        user_id: user_id,
        description: req.body.description,
        post_type: (req.body.post_type == undefined) ? 'img_text' : req.body.post_type,
        link_content: (req.body.link_data == undefined) ? '' : req.body.link_data,
        created_by: user_id
      })
      .then(post => {
        let post_id = post.dataValues.id;
        image_count = 0;
        req.files.forEach( 
          (files) => { 
            let old_url = files.location;
            let new_url = old_url.replace(`https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`, `${process.env.S3_URL}`);
            PostImage.create({ 'post_id': post_id, 'post_image': new_url })
            image_count ++;
        });
        currThis.tagMentioed({comment : post.dataValues.description, action_user:user.id, content: "TagPost", action_username:`${user.name} ${user.last_name}`, post_id: post_id}, req).then(ind => {
          })
        post.dataValues.distinct_id = user.dataValues.distinct_id;
        post.dataValues.analytic_user_id = user.dataValues.analytic_user_id;
        createPost(post, image_count)

      });
      setCachePromis(`posts-${id}`);

      res.json({
        'status':true,
        'message':'The post has been shared with your community'
      })
    }
  })
}

module.exports.getPosts = getPosts = async (req,res) => {
  const { Post, PostImage, User, Capability, Like, Comment, Follower, Portfolio, PortfolioTag, Skill, UserWork, UserQualification, UserAward, UserLanguage, ContactSuggested, sequelize, Job, JobApply, PostCommentLike} = await connectToDatabase()
  let decoded = jwt.decode(req.header("x-auth-token"), {complete: true});
  let user_id = decoded.payload.id;
  let offset = (req.query.offset == undefined) ? 0 : req.query.offset;
  let loginUser = await User.findOne({ where:{id:user_id}, attributes:['distinct_id', 'analytic_user_id'] });
  let curentUserLikes = await Like.findAll({ where:{user_id:user_id} });
  let curentUserPostCommentLikes = await PostCommentLike.findAll({ where:{user_id:user_id}, attributes:['id', 'comment_id', 'comment_type'] });


  let getLoginUser = await User.findByPk(user_id, {
    attributes:['id', 'latitude', 'longitude'],
    include: [
      {
        model: Follower, attributes: ['id', 'user_id', 'follower_id'], required: false
      },
      {
        model: ContactSuggested, attributes:['id', 'user_id', 'contact', 'type', 'is_fb'], required: false,
      },
      {
        model: Portfolio, attributes:['id'], required: false,
        include: [
          {
            model: PortfolioTag, attributes: ['tag', 'portfolio_id'], required: false,
          }
        ]
      },
      {
        model: Capability, attributes: ['id', 'cpb_name', 'is_pending'], required: false, where: { is_pending: 0 },
        include: [
          {
            model: Skill, attributes: ['skill_name', 'is_pending'], required: false, where: { is_pending: 0 },
          }
        ]
      },
      {
        model: UserWork, attributes: ['id', 'title', 'company'], required: false
      },
      {
        model: UserQualification, attributes: ['id', 'qualifications', 'obtained_from'], required: false
      },
      {
        model: UserAward, attributes: ['id', 'award', 'awarded_by'], required: false
      },
    ]
  });

  let whereQueryUser = [];
  let whereQueryPost = [];
  let getPostUserID = [];

  // Start Network
  let getFollowerUserID = [];
  if (getLoginUser.dataValues.followers.length > 0) {
    for (var follower of getLoginUser.dataValues.followers) {
      getPostUserID.push(follower.dataValues.user_id);
      getPostUserID.push(follower.dataValues.follower_id);

      if (![process.env.FOLLOWER_SKIPP_ID_ONE, process.env.FOLLOWER_SKIPP_ID_TWO].includes(follower.dataValues.follower_id)) {
        getFollowerUserID.push(follower.dataValues.follower_id);
      }
    }
  }
  let followersData = await Follower.findAll({attributes:['follower_id', "user_id"],
    where:{ 
      // [Op.or]: [{user_id: getFollowerUserID}]
      [Op.or]: [{user_id: getFollowerUserID}, {follower_id: user_id}]
    }
  });
  if (followersData.length > 0) {
    for (var follower of followersData) {
      // getPostUserID.push(follower.dataValues.follower_id);
      getPostUserID.push(follower.dataValues.user_id);
    }
  }
  // End Network

  // Start Suggested Contacts  
  let userConatctEmail = [];
  let userConatctMobile = [];
  let userConatctFBID = [];
  if (getLoginUser.dataValues.contact_suggesteds.length > 0) {
    for (let user_contact of getLoginUser.dataValues.contact_suggesteds) {
      if (user_contact.dataValues.is_fb == 0) {
        if (user_contact.dataValues.type == 'email') {
          userConatctEmail.push(user_contact.dataValues.contact);
        }
        if (user_contact.dataValues.type == 'mobile') {
          userConatctMobile.push(user_contact.dataValues.contact);
        }
      } else {
        userConatctFBID.push(user_contact.dataValues.contact);
      }
    }
  }
  if(userConatctEmail.length > 0){
    whereQueryUser.push({ [Op.or]: [{email : userConatctEmail}]});
  }
  if(userConatctMobile.length > 0){
    whereQueryUser.push({ [Op.or]: [{mobile : {[Op.regexp]: userConatctMobile.join('|') }}]});
  }
  if(userConatctFBID.length > 0){
    whereQueryUser.push({ [Op.or]: [{facebook_user_id : userConatctFBID}]});
  }

  let miles = 5;
  let latitude = (getLoginUser.dataValues.latitude == undefined || getLoginUser.dataValues.latitude == 'undefined') ? null : getLoginUser.dataValues.latitude;
  let longitude = (getLoginUser.dataValues.longitude == undefined || getLoginUser.dataValues.longitude == 'undefined') ? null : getLoginUser.dataValues.longitude;
  if (miles <= 5 && (latitude && longitude)) {
    let distanceUsers = await sequelize.query(`SELECT id , (3956 * 2 * ASIN(SQRT( POWER(SIN(( ${latitude} - latitude) * pi()/180 / 2), 2) +COS( ${latitude} * pi()/180) * COS(latitude * pi()/180) * POWER(SIN(( ${longitude} - longitude) * pi()/180 / 2), 2) ))) as distance from users having distance <= ${miles} order by distance`, {
      type: Op.SELECT
    });
    let temp = distanceUsers[0];
    var normalResults = temp.map((mysqlObj, index) => {
      return Object.assign({}, mysqlObj);
    });

    for (let disUser in normalResults) {
      getPostUserID.push(normalResults[disUser].id);
    }
  }
  // End Suggested Contacts

  // Start Profile Similarity
  let tagNameArray = [];
  if (getLoginUser.dataValues.portfolios.length > 0) {
    for (var portfolio of getLoginUser.dataValues.portfolios) {
      for (var tag of portfolio.dataValues.portfolio_tags) {
        tagNameArray.push(tag.dataValues.tag);
      }
    }
  }
  if (tagNameArray.length > 0) {
    let getPortfolioTagDetail = await PortfolioTag.findAll({ where:{tag: tagNameArray}, attributes:['portfolio_id'], include: [ { model: Portfolio, attributes:['id', 'user_id'], required: false, } ] });
    if (getPortfolioTagDetail.length > 0) {
      for (var portfolioTag of getPortfolioTagDetail) {
        if (portfolioTag.dataValues.portfolio) {
          getPostUserID.push(portfolioTag.dataValues.portfolio.dataValues.user_id);
        }
      }
    }
  }
  let cpbNameArray = [];
  let skillNameArray = [];
  if (getLoginUser.dataValues.capabilities.length > 0) {
    for (var capability of getLoginUser.dataValues.capabilities) {
      cpbNameArray.push(capability.dataValues.cpb_name);
      for (var skill of capability.dataValues.skills) {
        skillNameArray.push(skill.dataValues.skill_name);
      }
    }
  }
  let capabilityIdArray = [];
  if (skillNameArray.length > 0) {
    let getSkillDetail = await Skill.findAll({ where:{skill_name: skillNameArray}, attributes:['capability_id'] });
    if (getSkillDetail.length > 0) {
      for (var skill of getSkillDetail) {
        capabilityIdArray.push(skill.dataValues.capability_id);
      }
    }
  }
  if (cpbNameArray.length > 0 || capabilityIdArray.length > 0) {
    let getCapabilityDetail = await Capability.findAll({ where:{ user_id: { [Op.not]: user_id }, [Op.or]: [{cpb_name : cpbNameArray}, {id: capabilityIdArray}] }, attributes:['user_id'] });
    if (getCapabilityDetail.length > 0) {
      for (var capability of getCapabilityDetail) {
        getPostUserID.push(capability.dataValues.user_id);
      }
    }
  }
  let userWorkTitleArray = [];
  let userWorkCompanyArray = [];
  if (getLoginUser.dataValues.user_works.length > 0) {
    for (var user_work of getLoginUser.dataValues.user_works) {
      userWorkTitleArray.push(user_work.dataValues.title);
      userWorkCompanyArray.push(user_work.dataValues.company);
    }
  }
  if (userWorkTitleArray.length > 0 || userWorkCompanyArray.length > 0) {
    let getUserWorkDetail = await UserWork.findAll({ where:{ user_id: { [Op.not]: user_id }, [Op.or]: [{title : userWorkTitleArray}, {company: userWorkCompanyArray}] }, attributes:['user_id'] });
    if (getUserWorkDetail.length > 0) {
      for (var userWork of getUserWorkDetail) {
        getPostUserID.push(userWork.dataValues.user_id);
      }
    }
  }
  let userQualificationsArray = [];
  let userObtainedFromArray = [];
  if (getLoginUser.dataValues.user_qualifications.length > 0) {
    for (var user_qualifications of getLoginUser.dataValues.user_qualifications) {
      userQualificationsArray.push(user_qualifications.dataValues.qualifications);
      userObtainedFromArray.push(user_qualifications.dataValues.obtained_from);
    }
  }
  if (userQualificationsArray.length > 0 || userObtainedFromArray.length > 0) {
    let getUserQualificationDetail = await UserQualification.findAll({ where:{ user_id: { [Op.not]: user_id }, [Op.or]: [{qualifications : userQualificationsArray}, {obtained_from: userObtainedFromArray}] }, attributes:['user_id'] });
    if (getUserQualificationDetail.length > 0) {
      for (var qualification of getUserQualificationDetail) {
        getPostUserID.push(qualification.dataValues.user_id);
      }
    }
  }
  let userAwardArray = [];
  let userAwardedByArray = [];
  if (getLoginUser.dataValues.user_awards.length > 0) {
    for (var user_awards of getLoginUser.dataValues.user_awards) {
      userAwardArray.push(user_awards.dataValues.award);
      userAwardedByArray.push(user_awards.dataValues.awarded_by);
    }
  }
  if (userAwardArray.length > 0 || userAwardedByArray.length > 0) {
    let getUserAwardDetail = await UserAward.findAll({ where:{ user_id: { [Op.not]: user_id }, [Op.or]: [{award : userAwardArray}, {awarded_by: userAwardedByArray}] }, attributes:['user_id'] });
    if (getUserAwardDetail.length > 0) {
      for (var user_award of getUserAwardDetail) {
        getPostUserID.push(user_award.dataValues.user_id);
      }
    }
  }
  // End Profile Similarity

  if (userConatctEmail.length > 0 || userConatctEmail.length > 0 || userConatctEmail.length > 0) {
    let getUserDetail = await User.findAll({ where:whereQueryUser, attributes:['id'] });
    if (getUserDetail.length > 0) {
      for (var userDetail of getUserDetail) {
        getPostUserID.push(userDetail.dataValues.id);
      }
    }
  }

  if (getPostUserID.length == 0) {
    let followers = await Follower.findAll({attributes:['follower_id', "user_id"],
     where:{ 
        [Op.or]: [{user_id}, {follower_id: user_id}]
        }
    });
    for (var follower of followers) {
      getPostUserID.push(follower.dataValues.follower_id);
      getPostUserID.push(follower.dataValues.user_id);
    }
    getPostUserID.push(user_id);
    getPostUserID = getPostUserID.filter(function(elem, pos) {
        return getPostUserID.indexOf(elem) == pos;
    })
  }

  let postCount = await Post.count({where:{user_id:getPostUserID}});
  const result = await Post.findAll({ offset: +offset, limit: 10, order: [ ['id', 'DESC'] ],
        where:{user_id:getPostUserID},
        include: [
          {
            model: Post, as:'sharePost', attributes:['id', 'user_id', 'description', 'link_content', 'post_type', 'share_type', 'created_by'], required: false,
            include: [
              { model: User, attributes:['id',[Sequelize.fn("CONCAT", Sequelize.col("sharePost->user.name"), " ", Sequelize.col("sharePost->user.last_name")), 'name'], 'profile'], required: false },
              { model: PostImage, attributes:['post_image'], required: false },
              { model: Portfolio, attributes:['id'], required: false, include: [ { model: PortfolioTag, attributes:['tag'], required: false } ] },
              { 
                model: Job, attributes:['id', 'user_id', 'title', 'city', 'state', 'country', 'frequency', 'pay_currency', 'pay_amount', 'pay_time', 'day_application_close', 'description', 'is_publish', 'is_complete', 'createdAt'], required: false,
                include: [
                  { model: JobApply, attributes:['id', 'apply_id'], required: false, },
                  { model: User, attributes:['id',[Sequelize.fn("CONCAT", Sequelize.col("job->user.name"), " ", Sequelize.col("job->user.last_name")), 'name'], 'profile', 'user_role'], required: false, }
                ]
              },
            ]
          },
          {
            limit: 2, order: [ ['id', 'DESC']], where:{parent_comment_id:{ [Op.eq]: null }}, model: Comment, attributes:['id', 'comment', 'parent_comment_id', 'user_id', 'createdAt', 'link_data', 'image'], required: false,
            include: [
              { model: PostCommentLike, attributes:['id','comment_id','comment_type'], required: false, where:{comment_type: 'comment'} },
              { model: User, attributes:['id',[Sequelize.fn("CONCAT", Sequelize.col("user.name"), " ", Sequelize.col("user.last_name")), 'name'], 'profile'], required: false },
              {
                limit: 5000, order: [ ['id', 'DESC']], where:{parent_comment_id:{ [Op.not]: null }}, model: Comment, attributes:['id', 'comment', 'parent_comment_id', 'user_id', 'createdAt', 'link_data', 'image'], required: false,
                include: [
                { model: PostCommentLike, attributes:['id','comment_id','comment_type'], required: false, where:{comment_type: 'reply'} },
                { model: User, attributes:['id',[Sequelize.fn("CONCAT", Sequelize.col("user.name"), " ", Sequelize.col("user.last_name")), 'name'], 'profile'], required: false },
              ]
              },

            ]
          },
          {
            model: Comment, as:'shareComment', attributes:['id', 'user_id', 'comment', 'link_data', 'image'], required: false,
            include: [{ model: User, attributes:['id',[Sequelize.fn("CONCAT", Sequelize.col("shareComment->user.name"), " ", Sequelize.col("shareComment->user.last_name")), 'name'], 'profile'], required: false }]
          },
          { model: PostImage, attributes:['post_image'], required: false },          
          { 
            model: User, 
            attributes:['id',[Sequelize.fn("CONCAT", Sequelize.col("name"), " ", Sequelize.col("last_name")), 'name'], 'street_address', 'city', 'country', 'profile', 'latitude', 'longitude', 'city', 'country', 'state', 'user_role', 'gender', [Sequelize.literal('(SELECT COUNT(*) FROM socket_infos WHERE user.id = socket_infos.user_id)'), 'islives']],
            required: true,
            include: [ { model: Capability, attributes:['cpb_name', 'is_pending'], required: false, where:{is_pending:0} } ]
          },
          { 
            model: Portfolio, attributes:['id'], required: false,
            include: [ { model: PortfolioTag, attributes:['tag'], required: false } ]
          },
          { 
            model: Job, attributes:['id', 'user_id', 'title', 'city', 'state', 'country', 'frequency', 'pay_currency', 'pay_amount', 'pay_time', 'day_application_close', 'description', 'is_publish', 'is_complete', 'createdAt'], required: false,
            include: [
              { model: JobApply, attributes:['id', 'apply_id'], required: false, },
              { model: User, attributes:['id',[Sequelize.fn("CONCAT", Sequelize.col("job->user.name"), " ", Sequelize.col("job->user.last_name")), 'name'], 'profile', 'user_role'], required: false, }
            ]
          },
        ],
        attributes:['id', 'user_id', 'post_name', 'description', 'link_content', 'post_type', 'createdAt', 'updatedAt', 'share_type', [Sequelize.literal('(SELECT COUNT(*) FROM likes WHERE posts.id = likes.post_id)'), 'likeCount'], [Sequelize.literal('(SELECT COUNT(*) FROM comments WHERE posts.id = comments.post_id AND comments.parent_comment_id IS NULL)'), 'commentCount'], [Sequelize.literal(`(SELECT IF(posts.user_id = ${user_id}, 1,0) )`), 'editable']]});
      if(result){
        let resultCount = 0;
        let curentUserPostIns = [];
        let curentUserLikeVal = '';
        for (var getlikes of curentUserLikes) {
          curentUserPostIns.push(getlikes.dataValues.post_id);
        }
        let curentUserPostCommentIns = [];
        let curentUserPostReplyIns = [];
        for (var getlikes of curentUserPostCommentLikes) {
          if (getlikes.dataValues.comment_type == "comment") {
            curentUserPostCommentIns.push(getlikes.dataValues.comment_id);
          } else {
            curentUserPostReplyIns.push(getlikes.dataValues.comment_id);
          }
        }
        let key = 0;
        for (var countval of result) {

            var cm = 0;
            for (var commentData of countval.dataValues.comments) {
              var k = 0;
              let replyArray = [];
              for (var reply of commentData.dataValues.comments) {
                if (replyArray.length != 2) {
                  reply.dataValues.comment = await this.manageTagsString(reply.dataValues.comment);
                  let is_edit = false;
                  if (user_id == reply.dataValues.user_id) {
                    is_edit = true;
                  }
                  reply.dataValues.is_edit = is_edit;
                  let is_like = false;
                  if(curentUserPostReplyIns.includes(reply.dataValues.id)){
                    is_like = true;
                  }
                  reply.dataValues.curentUserReplyCommentLikeVal = is_like;
                  reply.dataValues.post_reply_like_count = reply.dataValues.post_comment_likes.length;
                  reply.dataValues.post_comment_likes = [];
                  replyArray.push(reply);
                  k++;
                }
              }
              result[key].dataValues.comments[cm].dataValues.comment = await this.manageTagsString(commentData.dataValues.comment);
              let is_edit = false;
              if (user_id == commentData.dataValues.user_id) {
                is_edit = true;
              }
              result[key].dataValues.comments[cm].dataValues.is_edit = is_edit;
              let is_like = false;
              if(curentUserPostCommentIns.includes(commentData.dataValues.id)){
                is_like = true;
              }
              result[key].dataValues.comments[cm].dataValues.curentUserCommentLikeVal = is_like;
              result[key].dataValues.comments[cm].dataValues.post_comment_like_count = result[key].dataValues.comments[cm].dataValues.post_comment_likes.length;
              result[key].dataValues.comments[cm].dataValues.post_comment_likes = [];

              result[key].dataValues.comments[cm].dataValues.replycount = commentData.dataValues.comments.length;
              if (replyArray == 2) {
                result[key].dataValues.comments[cm].dataValues.comments = [];
              }
              result[key].dataValues.comments[cm].dataValues.comments = replyArray;
              cm++;
            }

            if (countval.dataValues.description && countval.dataValues.description != null && countval.dataValues.description != "") {
              let str = renderTextToUrl(countval.dataValues.description);
              countval.dataValues.description = await this.manageTagsString(str);
            }
            resultCount = resultCount + 1;
            // countval.dataValues.comments = [];
            if(curentUserPostIns.includes(countval.dataValues.id)){
              countval.dataValues.curentUserLikeVal = true;
            } else {
              countval.dataValues.curentUserLikeVal = false;
            }

            if (countval.dataValues.job) {
              let is_owner = false;
              let is_apply = false;
              if (user_id == countval.dataValues.job.dataValues.user_id) {
                is_owner = true;
              }
              for(let job_apply of countval.dataValues.job.dataValues.job_applies){
                if (user_id == job_apply.dataValues.apply_id) {
                  is_apply = true;
                }
              }
              result[key].dataValues.job.dataValues.is_apply = is_apply;
              result[key].dataValues.job.dataValues.is_owner = is_owner;
            }
            if (result[key].dataValues.sharePost) {  
              sharestr = renderTextToUrl(result[key].dataValues.sharePost.dataValues.description);
              result[key].dataValues.sharePost.description = await this.manageTagsString(sharestr);
            }
            if (result[key].dataValues.shareComment) {  
              sharestr = renderTextToUrl(result[key].dataValues.shareComment.dataValues.comment);
              result[key].dataValues.shareComment.comment = await this.manageTagsString(sharestr);
            }

            key = key + 1;
        }
        let countStatus = false;
        if ((+offset + resultCount) < postCount) {
          countStatus = true;
        }

        productUse(user_id, loginUser.dataValues.distinct_id, loginUser.dataValues.analytic_user_id);
        res.json({
          'status':true,
          data : result,
          offset : +offset + resultCount,
          postCount : postCount,
          countStatus : countStatus
        })
      }else{
        productUse(user_id, loginUser.dataValues.distinct_id, loginUser.dataValues.analytic_user_id);
        res.json({
          'status':false,
          'message':'Data not found'
        })
      }
}

module.exports.recentContact = recentContact = async (req,res) => {
  const { User, Capability, Socketinfo, Message } = await connectToDatabase()
  let decoded = jwt.decode(req.header("x-auth-token"), {complete: true});
  let user_id = decoded.payload.id;
  let offset = (req.query.offset == undefined) ? 0 : req.query.offset;
  let limit = (req.query.limit == undefined) ? 5 :  isNaN(parseInt(req.query.limit)) ? 5 : parseInt(req.query.limit);
  let msgCounts = await Message.findAll({ where:{ [Op.or]: {receiver_id: user_id , sender_id: user_id }}, group:['chat_id'] });
  let msgCount = 0;
  for(let k in msgCounts ){
    msgCount = msgCount + 1;
  }
  /*let userCount = await User.count({ where:{user_step:'4', id:{ [Op.not]: user_id }} });*/
  Message.findAll({
      where:{ [Op.or]: {receiver_id: user_id , sender_id: user_id }},
      order: [ ['id', 'DESC'] ],
      offset: +offset, limit:limit,
      group:['chat_id'],
      include: [ 
        { 
          model: User, as:'receiver', attributes:['gender', 'latitude','longitude', 'user_role' ,['id', 'receiver_id'], ['name', 'receiver_name'], ['last_name', 'receiver_last_name'], ['profile', 'receiver_profile'],  [Sequelize.literal('(SELECT COUNT(*) FROM socket_infos WHERE receiver.id = socket_infos.user_id)'), 'islives']], required: true,
          include:[
            {
              model: Capability, attributes:['user_id', 'cpb_name', 'id', 'is_pending'], required: false,where:{is_pending:0}
            }
          ]
        },
        { 
          model: User, as:'sender', attributes:['gender', 'latitude','longitude','user_role' ,['id', 'sender_id'], ['name', 'sender_name'],['last_name', 'sender_last_name'], ['profile', 'sender_profile'],  [Sequelize.literal('(SELECT COUNT(*) FROM socket_infos WHERE sender.id = socket_infos.user_id)'), 'islives']], required: true,
          include:[
            {
              model: Capability, attributes:['user_id', 'cpb_name', 'id', 'is_pending'], required: false,where:{is_pending:0}
            }
          ]
        }
      ]
  }).then(recentMes => {
    let recents = [];
    let resultCount = 0;
    for(let k in recentMes){
      recentMes[k].dataValues.sender.dataValues.sender_last_name = (recentMes[k].dataValues.sender.dataValues.sender_last_name) ? recentMes[k].dataValues.sender.dataValues.sender_last_name : '';
      recentMes[k].dataValues.receiver.dataValues.receiver_last_name = (recentMes[k].dataValues.receiver.dataValues.receiver_last_name) ? recentMes[k].dataValues.receiver.dataValues.receiver_last_name : '';

      let temp = {};
      temp.id = (recentMes[k].sender_id == user_id)? recentMes[k].dataValues.receiver.dataValues.receiver_id :  recentMes[k].dataValues.sender.dataValues.sender_id;
      temp.name = (recentMes[k].sender_id == user_id)? `${recentMes[k].dataValues.receiver.dataValues.receiver_name} ${recentMes[k].dataValues.receiver.dataValues.receiver_last_name}` :  `${recentMes[k].dataValues.sender.dataValues.sender_name} ${recentMes[k].dataValues.sender.dataValues.sender_last_name}`;
      temp.profile = (recentMes[k].sender_id == user_id)? recentMes[k].dataValues.receiver.dataValues.receiver_profile :  recentMes[k].dataValues.sender.dataValues.sender_profile;
      temp.islives = (recentMes[k].sender_id == user_id)? recentMes[k].dataValues.receiver.dataValues.islives :  recentMes[k].dataValues.sender.dataValues.islives;
      temp.gender = (recentMes[k].sender_id == user_id)? recentMes[k].dataValues.receiver.dataValues.gender :  recentMes[k].dataValues.sender.dataValues.gender;
      temp.latitude = (recentMes[k].sender_id == user_id)? recentMes[k].dataValues.receiver.dataValues.latitude :  recentMes[k].dataValues.sender.dataValues.latitude;
      temp.longitude = (recentMes[k].sender_id == user_id)? recentMes[k].dataValues.receiver.dataValues.longitude :  recentMes[k].dataValues.sender.dataValues.longitude;
      temp.user_role = (recentMes[k].sender_id == user_id)? recentMes[k].dataValues.receiver.dataValues.user_role :  recentMes[k].dataValues.sender.dataValues.user_role;
      temp.capabilities = (recentMes[k].sender_id == user_id)? recentMes[k].dataValues.receiver.dataValues.capabilities :  recentMes[k].dataValues.sender.dataValues.capabilities;
      temp.msg_id = recentMes[k].id;
      recents.push(temp);
      resultCount = resultCount + 1;
    }
    if(recentMes){
        res.json({
          'status':true,
          data : recents,
          offset : +offset + resultCount,
          msgCount : msgCount
        })
      }else{
        res.json({
          'status':false,
          'message':'Data not found'
        })
      }

  })
  

  /*User.findAll({ 
    where:{user_step:'4', 
    id:{ [Op.not]: user_id }}, 
    offset: +offset, 
    limit: 5, 
    order: [ ['id', 'ASC'] ], 
    attributes:['id', 'name', 'profile' , 'latitude', 'longitude', 'city', 'country', 'state',  'gender', [Sequelize.literal('(SELECT COUNT(*) FROM socket_infos WHERE users.id = socket_infos.user_id)'), 'islives']],
    include: [ 
      { model: Capability, attributes:['user_id', 'cpb_name'], required: false },
      //{ model: Socketinfo}
    ],
  })
    .then(result => {
      let resultCount = 0;
      for (var countval in result) {
          resultCount = resultCount + 1;
      }
      if(result){
        res.json({
          'status':true,
          data : result,
          offset : +offset + resultCount,
          userCount : userCount
        })
      }else{
        res.json({
          'status':false,
          'message':'Data not found'
        })
      }
    });*/
}

module.exports.postComment = postComment = async (req, res) => {
  const { Comment, User, Capability, Post, Portfolio, PortfolioComment } = await connectToDatabase()
  let decoded = jwt.decode(req.header("x-auth-token"), {complete: true});
  let user_id = decoded.payload.id;
  let postUser = await Post.findOne({
    where: {id:req.body.post_id},
    include: [ 
      { model: User, attributes:['id', 'distinct_id', 'analytic_user_id', 'email', 'is_mail_post_responses', 'is_wp_post_responses', 'is_sms_post_responses', 'mobile', 'name', 'last_name'], required: false, },
      { model: Portfolio, attributes:['id', 'post_id', 'is_post'], required: false, }
    ],
    attributes:['id', 'user_id']
  });

  let getUserData = await User.findOne({where:{id:user_id}, include: [ { model: Capability, attributes:['user_id', 'cpb_name', 'is_pending'], required: false, where:{is_pending:0} } ] , attributes:['id', [Sequelize.fn("CONCAT", Sequelize.col("name"), " ", Sequelize.col("last_name")), 'name'], 'profile', 'latitude', 'longitude', 'city', 'country', 'state', 'user_role', 'gender', [Sequelize.literal('(SELECT COUNT(*) FROM socket_infos WHERE users.id = socket_infos.user_id)'), 'islives']]});

  if(req.body.parent_comment_id){
    var parenComUser = await Comment.findOne({where:{id:req.body.parent_comment_id},
      include: [
            { model: User, attributes:['id',[Sequelize.fn("CONCAT", Sequelize.col("name"), " ", Sequelize.col("last_name")), 'name'], ], required: true,}
          ]
    })
  }
    Comment.create({
      user_id: user_id,
      comment: req.body.comment,
      parent_comment_id: req.body.parent_comment_id,
      post_id: req.body.post_id,
      link_data: (req.body.link_data) ? req.body.link_data : null,
      image: (req.body.image) ? req.body.image : null,
    })
    .then(async result => {

      let imageData = null;
      if (result.dataValues.image) {
        imageData = await halper.getSignUrlImage(result.dataValues.image);
      }
      result.dataValues.image = imageData;

      getCommentCount(req.body.post_id).then(async (comments) =>{
        let notifyUser = postUser.dataValues.user.dataValues;
          if(notifyUser.id !== user_id){
              parent_comment_id = '';
              parentCommentId = '';
              if(req.body.parent_comment_id){
                parent_comment_id = `&parent_comment_id=${halper.makeEncr(req.body.parent_comment_id)}`;
                parentCommentId = req.body.parent_comment_id;
              }
              if(notifyUser.is_mail_post_responses){
                this.manageTagsString(result.comment).then(async cmnt =>{
                  if (req.body.parent_comment_id) {
                    postCommentReplyEmailTemp({'connect_user':notifyUser.name, 'email':notifyUser.email, 'request_user':getUserData.name, 'request_first_name':getUserData.dataValues.name, 'request_last_name':getUserData.last_name, 'comment':cmnt, 'post_detail_url':`${process.env.FRONT_URL}/post/${halper.makeEncr(req.body.post_id)}?comment_id=${halper.makeEncr(result.id)}${parent_comment_id}`, 'user_profile': `${process.env.FRONT_URL}/view-profile/${halper.makeEncr(user_id)}`});
                  } else {
                    postCommentEmailTemp({'connect_user':notifyUser.name, 'email':notifyUser.email, 'request_user':getUserData.name, 'request_first_name':getUserData.dataValues.name, 'request_last_name':getUserData.last_name, 'comment':cmnt, 'post_detail_url':`${process.env.FRONT_URL}/post/${halper.makeEncr(req.body.post_id)}?comment_id=${halper.makeEncr(result.id)}${parent_comment_id}`, 'user_profile': `${process.env.FRONT_URL}/view-profile/${halper.makeEncr(user_id)}`});
                  }
                })
              }
              if(notifyUser.is_wp_post_responses){
                if (req.body.parent_comment_id) {
                  wtPostReply({'connect_user':notifyUser.name, 'mobile':notifyUser.mobile, 'action_user':getUserData.dataValues.name, 'post_detail_url':`${process.env.FRONT_URL}/post/${halper.makeEncr(req.body.post_id)}?comment_id=${halper.makeEncr(result.id)}${parent_comment_id}`});
                } else {
                  wtPostCommentTemp({'connect_user':notifyUser.name, 'mobile':notifyUser.mobile, 'action_user':getUserData.dataValues.name, 'post_detail_url':`${process.env.FRONT_URL}/post/${halper.makeEncr(req.body.post_id)}?comment_id=${halper.makeEncr(result.id)}${parent_comment_id}`});
                }
              }
              if(notifyUser.is_sms_post_responses){
                if (req.body.parent_comment_id) {
                  txtPostReply({'connect_user':notifyUser.name, 'mobile':notifyUser.mobile, 'action_user':getUserData.dataValues.name, 'post_detail_url':`${process.env.FRONT_URL}/post/${halper.makeEncr(req.body.post_id)}?comment_id=${halper.makeEncr(result.id)}${parent_comment_id}`});
                } else {
                  txtPostComment({'connect_user':notifyUser.name, 'mobile':notifyUser.mobile, 'action_user':getUserData.dataValues.name, 'post_detail_url':`${process.env.FRONT_URL}/post/${halper.makeEncr(req.body.post_id)}?comment_id=${halper.makeEncr(result.id)}${parent_comment_id}`});
                }
              }
              if (req.body.parent_comment_id) {
                addNotification({notify_to: notifyUser.id, action_user:getUserData.id, content:"Reply", notify_to_username: notifyUser.name, action_username:getUserData.name, post_id: req.body.post_id, comment_id: result.id, parent_comment_id: parentCommentId}, req); 
              } else {
                addNotification({notify_to: notifyUser.id, action_user:getUserData.id, content:"Comment", notify_to_username: notifyUser.name, action_username:getUserData.name, post_id: req.body.post_id, comment_id: result.id, parent_comment_id: parentCommentId}, req); 
              }
          }
          
          this.tagMentioed({comment : result.comment, action_user:getUserData.id, content: (req.body.parent_comment_id) ? "TagReply" : "TagComment", action_username:getUserData.name, post_id: req.body.post_id, comment_id: result.id, parent_comment_id: (req.body.parent_comment_id) ? req.body.parent_comment_id : ''}, req).then(ind => {
          })

          if (req.body.parent_comment_id) {
            let commnetNotifyUser = parenComUser.dataValues.user.dataValues;
            this.manageTagsString(result.comment).then(async cmnt =>{
                let is_edit = false;
                if (user_id == postUser.dataValues.user.dataValues.id) {
                  is_edit = true;
                }
                result.comment = cmnt;
                req.app.io.sockets.emit("sub_comment",{"commentData":result, "commentUserData":getUserData, comments, is_edit, parent_comment_id: req.body.parent_comment_id});  

                if (postUser.dataValues.portfolio != '' && postUser.dataValues.portfolio.dataValues.post_id != null && postUser.dataValues.portfolio.dataValues.is_post != 0) {
                  var parenCommentUser = await PortfolioComment.findOne({where:{post_parent_comment_id:req.body.parent_comment_id}, attributes:['id', 'post_parent_comment_id']})
                  PortfolioComment.create({
                    user_id: user_id,
                    comment: req.body.comment,
                    parent_comment_id: parenCommentUser.dataValues.id,
                    portfolio_id: postUser.dataValues.portfolio.dataValues.id
                  })
                  .then(result => {
                    getPortfolioCommentCount(postUser.dataValues.portfolio.dataValues.id).then((comments) =>{
                      req.app.io.sockets.emit("portfolio_sub_comment",{"commentData":result, "commentUserData":getUserData, comments});
                    })
                    result.dataValues.post_id = postUser.dataValues.id;
                    result.dataValues.distinct_id = postUser.dataValues.user.dataValues.distinct_id;
                    result.dataValues.analytic_user_id = postUser.dataValues.user.dataValues.analytic_user_id;
                    commentPortfolioProject(result)
                    setCachePromis(`portfolio_comments-${postUser.dataValues.portfolio.dataValues.user_id}`);
                  })
                }
            })
            if((commnetNotifyUser.id !== getUserData.id)){
              if((notifyUser.id !== commnetNotifyUser.id)){
                //this.tagMentioed({comment : result.comment, action_user:getUserData.id, content:"TagReply", action_username:getUserData.name, post_id: req.body.post_id}, req).then(ind => {
                  addNotification({notify_to: commnetNotifyUser.id, action_user:getUserData.id, content:"Reply", notify_to_username: commnetNotifyUser.name, action_username:getUserData.name, post_id: req.body.post_id, comment_id: result.id, parent_comment_id: (req.body.parent_comment_id) ? req.body.parent_comment_id : ''}, req);
                //});
              }
            }
          } else {
            this.manageTagsString(result.comment).then(cmnt =>{
              let is_edit = false;
              if (user_id == postUser.dataValues.user.dataValues.id) {
                is_edit = true;
              }
              result.comment = cmnt;
              req.app.io.sockets.emit("comment",{"commentData":result, "commentUserData":getUserData, comments, is_edit});  
              if (postUser.dataValues.portfolio && postUser.dataValues.portfolio != '' && postUser.dataValues.portfolio.dataValues.post_id != null && postUser.dataValues.portfolio.dataValues.is_post != 0) {
                PortfolioComment.create({
                  user_id: user_id,
                  comment: req.body.comment,
                  parent_comment_id: req.body.parent_comment_id,
                  post_parent_comment_id: result.dataValues.id,
                  portfolio_id: postUser.dataValues.portfolio.dataValues.id
                })
                .then(portfolio_result => {
                  Comment.update( { portfolio_parent_comment_id:portfolio_result.dataValues.id }, { where:{id:result.dataValues.id} })
                  getPortfolioCommentCount(postUser.dataValues.portfolio.dataValues.id).then((comments) =>{
                    req.app.io.sockets.emit("portfolio_comment",{"commentData":portfolio_result, "commentUserData":getUserData, comments});
                  })
                  portfolio_result.dataValues.post_id = postUser.dataValues.id;
                  portfolio_result.dataValues.distinct_id = postUser.dataValues.user.dataValues.distinct_id;
                  portfolio_result.dataValues.analytic_user_id = postUser.dataValues.user.dataValues.analytic_user_id;
                  commentPortfolioProject(portfolio_result)
                  setCachePromis(`portfolio_comments-${postUser.dataValues.portfolio.dataValues.user_id}`);
                })
              }
            })
            
          }

          result.dataValues.distinct_id = postUser.dataValues.user.dataValues.distinct_id;
          result.dataValues.analytic_user_id = postUser.dataValues.user.dataValues.analytic_user_id;
          commentPost(result)
          setCachePromis(`post_comments-${postUser.dataValues.user_id}`);
          productUse(user_id, postUser.dataValues.user.dataValues.distinct_id, postUser.dataValues.user.dataValues.analytic_user_id);

        res.json({
          'status':true,
          'message':'Comment created',
          'data' : result,
          comments
        });  
      })
      
    })
    .catch(err => {
      res.json({
        'status':false,
        'message':'Something went to wrong! Try again later',
        err
      })
    });
}

module.exports.getComments = getComments = async (req,res) => {
  const { Comment, User, Capability, PostCommentLike } = await connectToDatabase()
  let decoded = jwt.decode(req.header("x-auth-token"), {complete: true});
  let user_id = decoded.payload.id;
  let post_id = req.params.post_id;
  let offset = (req.query.offset == undefined) ? 0 : req.query.offset;
  let limit = (req.query.limit == undefined) ? 2 : parseInt(req.query.limit);
  let comment_id = (req.query.comment_id == undefined) ? '' : req.query.comment_id;
  let curentUserPostCommentLikes = await PostCommentLike.findAll({ where:{user_id:user_id, comment_type: 'comment'}, attributes:['id', 'comment_id'] });

  let whereQuery = [];
  whereQuery.push({post_id:post_id, parent_comment_id:{ [Op.eq]: null}});
  if (comment_id != '') {
    whereQuery.push({ id: { [Op.lte]: comment_id } });
  }
  let commentCount = await Comment.count({ where:whereQuery });
  let result = await Comment.findAll({ order: [ ['id', 'DESC'] ],
          // where:{post_id:post_id, parent_comment_id:{ [Op.eq]: null}},
          where:whereQuery,
          limit: limit,
          include: [
            { model: User, attributes:['id',[Sequelize.fn("CONCAT", Sequelize.col("name"), " ", Sequelize.col("last_name")), 'name'], 'street_address', 'city', 'country', 'profile', 'latitude', 'longitude', 'city', 'country', 'state',  'user_role', 'gender', [Sequelize.literal('(SELECT COUNT(*) FROM socket_infos WHERE user.id = socket_infos.user_id)'), 'islives']], required: true,
              include: [ { model: Capability, attributes:['cpb_name', 'is_pending'], required: false, where:{is_pending:0} } ]
            },
            { 
              limit: 2000, order: [ ['id', 'DESC']], where:{parent_comment_id:{ [Op.not]: null }},  
              model: Comment, attributes:['id', 'user_id', 'parent_comment_id', 'comment', 'createdAt'], required: false, 
            },
            { model: PostCommentLike, attributes:['id','comment_id','comment_type'], required: false, where:{comment_type: 'comment'} },
          ],
          attributes:['id', 'comment', 'parent_comment_id', 'user_id', 'createdAt', 'link_data', 'image']})
    
      if(result){
        let curentUserPostCommentIns = [];
        for (var getlikes of curentUserPostCommentLikes) {
          curentUserPostCommentIns.push(getlikes.dataValues.comment_id);
        }
        let resultCount = 0;
        var pk =0;
        for (var countval of result) {
            resultCount = resultCount + 1;
            var k = 0;
            for (var reply of result[pk].dataValues.comments) {
              k++;
            }
            console.log(countval.dataValues.comment, "manageTagsString comment");
            countval.dataValues.comment = await this.manageTagsString(countval.dataValues.comment);
            countval.dataValues.replycount = k;
            result[pk].dataValues.comments = [];
            countval.dataValues.post_comment_like_count = countval.dataValues.post_comment_likes.length;
            countval.dataValues.post_comment_likes = [];
            let is_edit = false;
            if (user_id == countval.dataValues.user_id) {
              is_edit = true;
            }
            countval.dataValues.is_edit = is_edit;
            let is_like = false;
            if(curentUserPostCommentIns.includes(countval.dataValues.id)){
              is_like = true;
            }
            countval.dataValues.curentUserCommentLikeVal = is_like;
            pk++;
        }
        res.json({
          'status':true,
          data : result,
          offset : parseInt(offset) + resultCount,
          count: commentCount
        })
      }else{
        res.json({
          'status':false,
          'message':'Data not found'
        })
      }
}

module.exports.postLike = postLike = async (req, res) => {
  const { Like, Post, User, Portfolio, PortfolioLike } = await connectToDatabase()
  let decoded = jwt.decode(req.header("x-auth-token"), {complete: true});
  let user_id = decoded.payload.id;

    let getlike = await Like.count({ where:{post_id:req.body.post_id, user_id:user_id }});
    
    if (getlike == 0) {
      let getUser = await User.findByPk(user_id);
      let postUser = await Post.findOne({
        where: {id:req.body.post_id},
        include: [ 
          { model: User, attributes:['id', 'email', 'is_mail_post_responses', 'is_sms_post_responses', 'is_wp_post_responses', 'mobile', 'name', 'last_name'], required: false, },
          { model: Portfolio, attributes:['id', 'post_id', 'is_post'], required: false, }
        ],
        attributes:['id', 'user_id']
      });

      Like.create({
        user_id: user_id,
        post_id: req.body.post_id
      })
      .then(result => {
        let notifyUser = postUser.dataValues.user.dataValues;
        getlikesCount(req.body.post_id).then((likes) => {
            if(notifyUser.id !== user_id){
              if(notifyUser.is_mail_post_responses){
                postLikeEmailTemp({'connect_user':notifyUser.name, 'email':notifyUser.email, 'request_user':getUser.dataValues.name+' '+getUser.dataValues.last_name, 'request_first_name':getUser.dataValues.name+' '+getUser.dataValues.last_name, 'like':'like you post', 'post_detail_url':`${process.env.FRONT_URL}/post/${halper.makeEncr(req.body.post_id)}`, 'user_profile': `${process.env.FRONT_URL}/view-profile/${halper.makeEncr(user_id)}`});
              }
              if(notifyUser.is_wp_post_responses){
                wtPostLike({mobile: notifyUser.mobile, connect_user:notifyUser.name,  action_user:getUser.name, post_detail_url:`${process.env.FRONT_URL}/post/${halper.makeEncr(req.body.post_id)}`});  
              }
              if(notifyUser.is_sms_post_responses){
                txtPostLike({mobile: notifyUser.mobile, connect_user:notifyUser.name,  action_user:getUser.name, post_detail_url:`${process.env.FRONT_URL}/post/${halper.makeEncr(req.body.post_id)}`});  
              }
              
              addNotification({notify_to: notifyUser.id, action_user:getUser.id, content:"Like", notify_to_username: notifyUser.name, action_username:getUser.name, post_id:req.body.post_id }, req);
            }
            req.app.io.sockets.emit("like",{"post_id":req.body.post_id, likes, user_id});

            if (postUser.dataValues.portfolio && postUser.dataValues.portfolio != '' && postUser.dataValues.portfolio.dataValues.post_id != null && postUser.dataValues.portfolio.dataValues.is_post != 0) {
              PortfolioLike.create({
                user_id: user_id,
                portfolio_id: postUser.dataValues.portfolio.dataValues.id
              }).then(portfolio_result => {
                getPortfoliolikesCount(postUser.dataValues.portfolio.dataValues.id).then((likes) => {
                  req.app.io.sockets.emit("portfolio_like",{"portfolio_id":postUser.dataValues.portfolio.dataValues.id, likes, user_id});
                })
                setCachePromis(`portfolio_likes-${postUser.dataValues.portfolio.dataValues.user_id}`);
              })
            }

            result.dataValues.distinct_id = getUser.dataValues.distinct_id;
            result.dataValues.analytic_user_id = getUser.dataValues.analytic_user_id;
            likePost(result)
            setCachePromis(`post_likes-${postUser.dataValues.user_id}`);
            productUse(user_id, getUser.dataValues.distinct_id, getUser.dataValues.analytic_user_id);
            res.json({
              'status':true,
              'message':'Liked',
              'data' : result,
              likes
            });
        })
      })
      .catch(err => {
        res.json({
          'status':false,
          'message':'Something went to wrong! Try again later',
          err
        })
      });

    } else {
      Like.destroy({ where:{post_id:req.body.post_id, user_id:user_id }})
      .then(result => {
        getlikesCount(req.body.post_id).then(async (likes) => {
          /*getUser.forEach((user_list) => {
              req.app.io.to("usersocket"+user_list.dataValues.id).emit("unlike",{"post_id":req.body.post_id, likes});
          });*/
          req.app.io.sockets.emit("unlike",{"post_id":req.body.post_id, likes, user_id});

          let postUser = await Post.findOne({ where: {id:req.body.post_id}, include: [  { model: Portfolio, attributes:['id', 'post_id', 'is_post'], required: false, } ], attributes:['id', 'user_id'] });
          removeCachePromis(`post_likes-${postUser.dataValues.user_id}`);
          if (postUser.dataValues.portfolio && postUser.dataValues.portfolio != '' && postUser.dataValues.portfolio.dataValues.post_id != null && postUser.dataValues.portfolio.dataValues.is_post != 0) {
            PortfolioLike.destroy({ where:{portfolio_id: postUser.dataValues.portfolio.dataValues.id, user_id:user_id }})
            .then(result => {
              getPortfoliolikesCount(postUser.dataValues.portfolio.dataValues.id).then((likes) => {
                req.app.io.sockets.emit("portfolio_unlike",{"portfolio_id":postUser.dataValues.portfolio.dataValues.id, likes, user_id});
              })
              removeCachePromis(`portfolio_likes-${postUser.dataValues.portfolio.dataValues.user_id}`);
            })
          }
          res.json({
            'status':true,
            'message':'UnLiked',
            'data' : result,
            'post_id' : req.body.post_id,
            likes
          });
        })
      })
      .catch(err => {
        res.json({
          'status':false,
          'message':'Something went to wrong! Try again later',
          err
        })
      });
    }
}

module.exports.getLikeUser = getLikeUser = async (req,res) => {
  const { Like, User, Capability } = await connectToDatabase()
  let post_id = req.params.post_id;
  let decoded = jwt.decode(req.header("x-auth-token"), {complete: true});
  let user_id = decoded.payload.id;
  Like.findAll({ where:{post_id:post_id}, order: [ ['id', 'DESC'] ], 
    include: [ { model: User, attributes:['id', [Sequelize.fn("CONCAT", Sequelize.col("name"), " ", Sequelize.col("last_name")), 'name'], 'profile', 'latitude', 'longitude', 'city', 'country', 'state',  'user_role', 'gender', [Sequelize.literal('(SELECT COUNT(*) FROM socket_infos WHERE user.id = socket_infos.user_id)'), 'islives']], required: true, 
    include: [ { model: Capability, attributes:['cpb_name', 'is_pending'], required: false, where:{is_pending:0} } ] } ] , attributes:['id', 'post_id', 'user_id']})
    .then(result => {
      if(result){
        this.getFollowersIds(user_id).then(followers => {
          this.getRequestConformIds(user_id).then(requestConformIds => {
            this.getRequestedIds(user_id).then(requestedids => {
              let likesuser = []
              for(var user of result){
                user.dataValues.isconnected = false;
                if(followers.includes(user.dataValues.user_id)){
                  user.dataValues.isconnected = true;
                }

                user.dataValues.isrequested = false;
                if(requestedids.includes(user.dataValues.user_id)){
                  user.dataValues.isrequested = true;
                }

                user.dataValues.needconform = false;
                if(requestConformIds.includes(user.dataValues.user_id)){
                  user.dataValues.needconform = true;
                }

                likesuser.push(user);
              }
              res.json({
                'status':true,
                data : likesuser
              })
            })
          })
        });
      }else{
        res.json({
          'status':false,
          'message':'Data not found'
        })
      }
    });
}

module.exports.getPostsDetails = getPostsDetails = async (req,res) => {
  let id = req.params.id;
  const { Post, PostImage, User, Capability, Like, Comment, Follower, Portfolio, PortfolioTag, Job, JobApply, PostCommentLike } = await connectToDatabase()
  let decoded = jwt.decode(req.header("x-auth-token"), {complete: true});
  let user_id = decoded.payload.id;
  let curentUserPostCommentLikes = await PostCommentLike.findAll({ where:{user_id:user_id}, attributes:['id', 'comment_id', 'comment_type'] });
  let curentUserLikes = await Like.findAll({ where:{user_id:user_id} });
  Post.findOne({
        where:{id},
        include: [
          {
            model: Post, as:'sharePost', attributes:['id', 'user_id', 'description', 'link_content', 'post_type', 'share_type', 'created_by'], required: false,
            include: [
              { model: User, attributes:['id',[Sequelize.fn("CONCAT", Sequelize.col("sharePost->user.name"), " ", Sequelize.col("sharePost->user.last_name")), 'name'], 'profile'], required: false },
              { model: PostImage, attributes:['post_image'], required: false },
              { model: Portfolio, attributes:['id'], required: false, include: [ { model: PortfolioTag, attributes:['tag'], required: false } ] },
              { 
                model: Job, attributes:['id', 'user_id', 'title', 'city', 'state', 'country', 'frequency', 'pay_currency', 'pay_amount', 'pay_time', 'day_application_close', 'description', 'is_publish', 'is_complete', 'createdAt'], required: false,
                include: [
                  { model: JobApply, attributes:['id', 'apply_id'], required: false, },
                  { model: User, attributes:['id',[Sequelize.fn("CONCAT", Sequelize.col("job->user.name"), " ", Sequelize.col("job->user.last_name")), 'name'], 'profile', 'user_role'], required: false, }
                ]
              },
            ]
          },
          {
            limit: 2, order: [ ['id', 'DESC']], where:{parent_comment_id:{ [Op.eq]: null }}, model: Comment, attributes:['id', 'comment', 'parent_comment_id', 'user_id', 'createdAt', 'link_data', 'image'], required: false,
            include: [
              { model: PostCommentLike, attributes:['id','comment_id','comment_type'], required: false, where:{comment_type: 'comment'} },
              { model: User, attributes:['id',[Sequelize.fn("CONCAT", Sequelize.col("user.name"), " ", Sequelize.col("user.last_name")), 'name'], 'profile'], required: false },
              {
                limit: 5000, order: [ ['id', 'DESC']], where:{parent_comment_id:{ [Op.not]: null }}, model: Comment, attributes:['id', 'comment', 'parent_comment_id', 'user_id', 'createdAt', 'link_data', 'image'], required: false,
                include: [
                  { model: PostCommentLike, attributes:['id','comment_id','comment_type'], required: false, where:{comment_type: 'comment'} },
                  { model: User, attributes:['id',[Sequelize.fn("CONCAT", Sequelize.col("user.name"), " ", Sequelize.col("user.last_name")), 'name'], 'profile'], required: false },
                ]
              },

            ]
          },
          {
            model: Comment, as:'shareComment', attributes:['id', 'user_id', 'comment', 'link_data', 'image'], required: false,
            include: [{ model: User, attributes:['id',[Sequelize.fn("CONCAT", Sequelize.col("shareComment->user.name"), " ", Sequelize.col("shareComment->user.last_name")), 'name'], 'profile'], required: false }]
          },
          { model: PostImage, attributes:['post_image'], required: false },
          { 
            model: User, 
            attributes:['id',[Sequelize.fn("CONCAT", Sequelize.col("user.name"), " ", Sequelize.col("user.last_name")), 'name'], 'street_address', 'city', 'country', 'profile', 'latitude', 'longitude', 'city', 'country', 'state', 'user_role',  'gender', [Sequelize.literal('(SELECT COUNT(*) FROM socket_infos WHERE user.id = socket_infos.user_id)'), 'islives']],
            required: true,
            include: [ { model: Capability, attributes:['cpb_name', 'is_pending'], required: false } ]
          },
          { 
            model: Portfolio, attributes:['id'], required: false,
            include: [ 
              { model: PortfolioTag, attributes:['tag'], required: false },
              {  model: User,  attributes:['id',[Sequelize.fn("CONCAT", Sequelize.col("portfolio->user.name"), " ", Sequelize.col("portfolio->user.last_name")), 'name'], 'profile', 'user_role'], required: true }
            ]
          },
          { 
            model: Job, attributes:['id', 'user_id', 'title', 'city', 'state', 'country', 'frequency', 'pay_currency', 'pay_amount', 'pay_time', 'day_application_close', 'description', 'is_publish', 'createdAt'], required: false,
            include: [{  model: User,  attributes:['id',[Sequelize.fn("CONCAT", Sequelize.col("job->user.name"), " ", Sequelize.col("job->user.last_name")), 'name'], 'profile', 'user_role'], required: true }],
          },
        ], 
        attributes:['id', 'user_id', 'post_name', 'description', 'link_content', 'post_type', 'createdAt', 'updatedAt', 'share_type', [Sequelize.literal('(SELECT COUNT(*) FROM likes WHERE posts.id = likes.post_id)'), 'likeCount'], [Sequelize.literal('(SELECT COUNT(*) FROM comments WHERE posts.id = comments.post_id AND comments.parent_comment_id IS NULL)'), 'commentCount'], [Sequelize.literal(`(SELECT IF(posts.user_id = ${user_id}, 1,0) )`), 'editable']]})
    .then(async post => {
      if(post){
        let curentUserPostIns = [];
        for (var getlikes of curentUserLikes) {
          curentUserPostIns.push(getlikes.dataValues.post_id);
        }

        let curentUserPostCommentIns = [];
        let curentUserPostReplyIns = [];
        for (var getlikes of curentUserPostCommentLikes) {
          if (getlikes.dataValues.comment_type == 'comment') {
            curentUserPostCommentIns.push(getlikes.dataValues.comment_id);
          } else {
            curentUserPostReplyIns.push(getlikes.dataValues.comment_id);
          }
        }
        var cm = 0;
        for (var commentData of post.dataValues.comments) {
          var k = 0;
          let replyArray = [];
          for (var reply of commentData.dataValues.comments) {
            if (replyArray.length != 2) {
              reply.dataValues.comment = await this.manageTagsString(reply.dataValues.comment);
              let is_edit = false;
              if (user_id == reply.dataValues.user_id) {
                is_edit = true;
              }
              reply.dataValues.is_edit = is_edit;
              let is_like = false;
              if(curentUserPostReplyIns.includes(reply.dataValues.id)){
                is_like = true;
              }
              reply.dataValues.curentUserReplyCommentLikeVal = is_like;
              reply.dataValues.post_reply_like_count = reply.dataValues.post_comment_likes.length;
              reply.dataValues.post_comment_likes = [];
              replyArray.push(reply);
              k++;
            }
          }
          post.dataValues.comments[cm].dataValues.comment = await this.manageTagsString(commentData.dataValues.comment);
          post.dataValues.comments[cm].dataValues.replycount = commentData.dataValues.comments.length;

          let is_edit = false;
          if (user_id == commentData.dataValues.user_id) {
            is_edit = true;
          }
          post.dataValues.comments[cm].dataValues.is_edit = is_edit;
          let is_like = false;
          if(curentUserPostCommentIns.includes(commentData.dataValues.id)){
            is_like = true;
          }
          post.dataValues.comments[cm].dataValues.curentUserCommentLikeVal = is_like;
          post.dataValues.comments[cm].dataValues.post_comment_like_count = post.dataValues.comments[cm].dataValues.post_comment_likes.length;
          post.dataValues.comments[cm].dataValues.post_comment_likes = [];

          if (replyArray == 2) {
            post.dataValues.comments[cm].dataValues.comments = [];
          }
          post.dataValues.comments[cm].dataValues.comments = replyArray;
          cm++;
        }

        // post.dataValues.comments = [];
        if(curentUserPostIns.includes(post.dataValues.id)){
          post.dataValues.curentUserLikeVal = true;
        } else {
          post.dataValues.curentUserLikeVal = false;
        }
        let resultCount = 0;

        if (post.dataValues.sharePost) {  
          sharestr = renderTextToUrl(post.dataValues.sharePost.dataValues.description);
          post.dataValues.sharePost.description = await this.manageTagsString(sharestr);
        }
        if (post.dataValues.shareComment) {  
          sharestr = renderTextToUrl(post.dataValues.shareComment.dataValues.comment);
          post.dataValues.shareComment.comment = await this.manageTagsString(sharestr);
        }
        if (post.dataValues.description) {  
          sharestr = renderTextToUrl(post.dataValues.description);
          post.dataValues.description = await this.manageTagsString(sharestr);
        }

        // this.manageTagsString(post.dataValues.description).then(dec => {
        //   post.dataValues.description = dec;
          res.json({
            'status':true,
             post:[post],
          })  
        // })
      }else{
        res.json({
          'status':false,
          'message':'Data not found'
        })
      }
    });
}

async function getlikesCount(post_id){
  const { Like } = await connectToDatabase();
  let likes = await Like.count({ where:{post_id}});
  return likes;
}

async function getPortfoliolikesCount(portfolio_id){
  const { PortfolioLike } = await connectToDatabase();
  let likes = await PortfolioLike.count({ where:{portfolio_id}});
  return likes;
}

async function getCommentCount(post_id){
  const { Comment } = await connectToDatabase();
  let comments = await Comment.count({ where:{post_id, parent_comment_id: null }});
  return comments;
}

async function getPortfolioCommentCount(portfolio_id){
  const { PortfolioComment } = await connectToDatabase();
  let comments = await PortfolioComment.count({ where:{portfolio_id, parent_comment_id: null }});
  return comments;
}

module.exports.getFollowersIds = async (user_id) => {
  const { Follower } = await connectToDatabase();
  let followers = await Follower.findAll({attributes:['follower_id', "user_id"],
   where:{ 
      [Op.or]: [{user_id}, {follower_id: user_id}]
      },
    order: [ ['id', 'DESC'] ]
    });
  let follower_ids = [];
  for (var follower of followers) {
    follower_ids.push(follower.dataValues.follower_id);
    follower_ids.push(follower.dataValues.user_id);
  }
  follower_ids = follower_ids.filter(function(elem, pos) {
      return follower_ids.indexOf(elem) == pos;
  })
  return follower_ids;
}

module.exports.getRequestedIds = async (user_id) => {
  const { ConnectRequest } = await connectToDatabase();
  let conneRequests = await ConnectRequest.findAll({attributes:['connect_to'],
    where:{user_id},
    order: [ ['id', 'DESC'] ]
  });
  let connectRequestIds = [];
  for (var connenrequestid of conneRequests) {
    connectRequestIds.push(connenrequestid.dataValues.connect_to);
  }
  connectRequestIds = connectRequestIds.filter(function(elem, pos) {
      return connectRequestIds.indexOf(elem) == pos;
  })
  return connectRequestIds;
}


module.exports.getRequestConformIds = async (connect_to) => {
  const { ConnectRequest } = await connectToDatabase();
  let conneRequests = await ConnectRequest.findAll({attributes:['user_id'],
    where:{connect_to},
    order: [ ['id', 'DESC'] ]
  });
  let connectRequestIds = [];
  for (var connenrequestid of conneRequests) {
    connectRequestIds.push(connenrequestid.dataValues.user_id);
  }
  connectRequestIds = connectRequestIds.filter(function(elem, pos) {
      return connectRequestIds.indexOf(elem) == pos;
  })
  return connectRequestIds;
}

module.exports.userPosts = userPosts = async (req,res) => {
  const { User, Post, PostImage } = await connectToDatabase()
  let decoded = jwt.decode(req.header("x-auth-token"), {complete: true});
  let id = decoded.payload.id;
  let user_id = req.params.id;
  user_id = (user_id == 'mypost')? id : user_id;
  let offset = (req.query.offset == undefined) ? 0 : req.query.offset;
  let limit = (req.query.limit == undefined) ? 5 :  isNaN(parseInt(req.query.limit)) ? 5 : parseInt(req.query.limit);
  limit = (limit < 0 ) ? 5 : limit; 
  let userCount = await Post.count({ where:{ user_id } });
  let result = await Post.findAll({ 
    where:{user_id}, offset: +offset, limit:limit, order: [ ['id', 'DESC'] ], attributes:['id', 'user_id', 'post_name', 'description', 'link_content', 'post_type', 'createdAt'], 
    include: [
          { model: PostImage, attributes:['post_image'], required: false, limit: 1 }]});


      
      if(result){
        let resultCount = 0;
        for (var countval in result) {
            resultCount = resultCount + 1;
            //countval.dataValues.description = "eee";
            console.log(countval, "countval");
            result[countval].dataValues.description = await this.manageTagsString(renderTextToUrlPost(result[countval].dataValues.description, result[countval].dataValues.description.substr(0, 30)));
        }

        res.json({
          'status':true,
          data : result,
          offset : +offset + resultCount,
          userCount : userCount,
          user_id
        })
      }else{
        res.json({
          'status':false,
          'message':'Data not found'
        })
      }
}


module.exports.userReviews = userReviews = async (req,res) => {
  const { User, ReviewRequest } = await connectToDatabase()
  let decoded = jwt.decode(req.header("x-auth-token"), {complete: true});
  //let user_id = decoded.payload.id;
  let user_id = req.params.id;
  let offset = (req.query.offset == undefined) ? 0 : req.query.offset;
  let limit = (req.query.limit == undefined) ? 5 :  isNaN(parseInt(req.query.limit)) ? 5 : parseInt(req.query.limit);
  limit = (limit < 0 ) ? 5 : limit; 
  let userCount = await ReviewRequest.count({ where:{ user_id, status:'reviewed' } });
  ReviewRequest.findAll({ 
    where:{ user_id, status:'reviewed' }, offset: +offset, limit: limit, order: [ ['id', 'DESC'] ], attributes:['id', 'review'], 
    include: [
          { model: User, attributes:[[Sequelize.fn("CONCAT", Sequelize.col("name"), " ", Sequelize.col("last_name")), 'name'], 'id'], required: true}]})
    .then(result => {
      let resultCount = 0;
      for (var countval in result) {
          resultCount = resultCount + 1;
      }
      if(result){
        res.json({
          'status':true,
          data : result,
          offset : +offset + resultCount,
          userCount : userCount,
          user_id
        })
      }else{
        res.json({
          'status':false,
          'message':'Data not found'
        })
      }
    });
}

module.exports.putPost = putPost = async (req, res) => {
  const { Post, PostImage, User, Portfolio, PortfolioTag } = await connectToDatabase()
  let decoded = jwt.decode(req.header("x-auth-token"), {complete: true});
  let user_id = decoded.payload.id;
  let id = user_id;
  let post_id = req.params.id;
  //
  let isPost = await Post.count({where:{id:post_id, user_id}});
  if(isPost > 0){
    const user = await User.findByPk(id, {attributes:['id', 'name', 'last_name']});
    const storage = multerS3({
      s3: s3,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_BUCKET_NAME,
      acl: 'public-read',
      contentType: multerS3.AUTO_CONTENT_TYPE,
      contentDisposition: 'inline',
      metadata: function (req, file, cb) {
        cb(null, {fieldName: file.fieldname});
      },
      key: function (req, file, cb) {
        let datetime = Date.now();
        fileName = id+'_'+datetime+'_'+file.originalname.toLowerCase().split(' ').join('-');
        fileName = fileName.replace(/'/g, "").replace(/\(|\)/g, "");
        cb(null, `${process.env.POST_IMG_DIR}/${fileName}`)
      },
    });

    let upload = multer({
      storage: storage,
      fileFilter: (req, file, cb) => {
        if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
          cb(null, true);
        } else {
          cb(null, false);
          return cb(('Only .png, .jpg and .jpeg format allowed!'));
        }
      },
      limits:{
            fileSize: 1024 * 1024 * 5
        }
    }).array('post_image');

    upload(req, res, async (err) =>  {
      if (err) {
        if (err.message) { message = 'File too large, Please try with image less than 5 MB of size.'; } else { message = err.message; }
        res.json({
          'status':false,
          'message':message
        })
      } else {
        if(req.body.delete_images !== undefined ){
          let deleteimages = req.body.delete_images;
          deleteimages  = deleteimages.split(',')
          if(deleteimages.length > 0){
            let postImages = await PostImage.findAll({where:{post_id, post_image:deleteimages }, attributes:['id','post_image']});
            await PostImage.destroy({where:{post_id, post_image:deleteimages }});
            for (const postImage of postImages) {
              let post_image = postImage.post_image
              let imageArr = post_image.split("/");
              await this.deleteS3Image(`${process.env.POST_IMG_DIR}/${_.last(imageArr)}`); 
            }
          }
        }
        Post.update(
        {
          description: req.body.description,
          post_type: (req.body.post_type == undefined) ? 'img_text' : req.body.post_type,
          link_content: (req.body.link_data == undefined) ? '' : req.body.link_data
        }, {
          where:{id:post_id}
        })
        .then( post => {
          if(req.files){
            let newImages =[];
            req.files.forEach( 
              (files) => { 
                let old_url = files.location;
                let new_url = old_url.replace(`https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`, `${process.env.S3_URL}`);
                newImages.push({ 'post_id': post_id, 'post_image': new_url });
            });
            PostImage.bulkCreate(newImages).then(createImages => {
              Post.findAll({
                  where:{id:post_id},
                  include: [
                    { model: PostImage, attributes:['post_image'], required: false },
                    { 
                      model: Portfolio, attributes:['id'], required: false,
                      include: [ { model: PortfolioTag, attributes:['tag'], required: false } ]
                    },
                  ], 
                  attributes:['id', 'user_id', 'post_name', 'description', 'link_content', 'post_type', 'createdAt', 'updatedAt']})
              .then(postDetails => {
                this.tagMentioed({comment : postDetails[0].dataValues.description, action_user:user.id, content: "TagPost", action_username:`${user.name} ${user.last_name}`, post_id: post_id}, req).then(ind => {
                })
                this.manageTagsString(postDetails[0].dataValues.description).then(comnt => {
                  postDetails[0].dataValues.description = comnt;
                  res.json({
                    'status':true,
                    'message':'The post has been successfully updated',
                    post: postDetails
                  })
                })
              })
            })
          }
        });
      }
    })  
  }else{
    res.json({
        'status':true,
        'message':'Post not found!'
      })
  }
  
}

module.exports.deletePost = deletePost = async (req, res) => {
  const { Post, PostImage, Portfolio, PostCommentLike } = await connectToDatabase()
  let decoded = jwt.decode(req.header("x-auth-token"), {complete: true});
  let user_id = decoded.payload.id;
  let post_id = req.params.id;

  let isPost = await Post.count({where:{id:post_id,user_id }});
  if(isPost > 0){
    await Portfolio.update( { is_post:`0`, post_id: null }, { where:{post_id:post_id, is_post:`1`, user_id} })
    await Post.destroy({ where:{id:post_id, user_id}});
    await Post.destroy({ where:{share_id:post_id, user_id, share_type:'post'}});
    let postImages = await PostImage.findAll({where:{post_id}, attributes:['id','post_image']});
    await PostImage.destroy({where:{post_id}});
    for (const postImage of postImages) {
      let post_image = postImage.post_image
      let imageArr = post_image.split("/");
      await this.deleteS3Image(`${process.env.POST_IMG_DIR}/${_.last(imageArr)}`); 
    }
    await PostCommentLike.destroy({where:{post_id}});

    removeCachePromis(`posts-${user_id}`);
    res.json({
      'status':true,
      'message':'The post has been successfully deleted'
    });
  }else{
    res.json({
      'status':true,
      'message':'Post not found!'
    })
  }
}

module.exports.deleteImage = deleteImage = async (req, res) => {
  const { Post, PostImage } = await connectToDatabase()
  let decoded = jwt.decode(req.header("x-auth-token"), {complete: true});
  let user_id = decoded.payload.id;
  let post_id = req.params.id;
  let post_image = req.body.image;

  let isPost = await Post.count({where:{id:post_id,user_id}});
  if(isPost<=0){
    res.json({
      'status':true,
      'message':'Post not found!'
    })
  }else{
    let isPostImage = await PostImage.count({where:{post_id,post_image}});
    if(isPostImage > 0){
      await PostImage.destroy({where:{post_id,post_image}});
      let imageArr = post_image.split("/");
      await this.deleteS3Image(`${process.env.POST_IMG_DIR}/${_.last(imageArr)}`); 
      res.json({
        'status':true,
        'message':'Post image has been deleted successfully'
      });
    }else{
      res.json({
        'status':true,
        'message':'Image not found!'
      })
    }
  }
}


module.exports.deleteS3Image = async (imageKey) => {
  let isDelete = await s3.deleteObject({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: imageKey
      },function (err,data){
      });
  return true;
}
module.exports.getSinglePost = getSinglePost = async (req, res) => {
  let decoded = jwt.decode(req.header("x-auth-token"), {complete: true});
  let user_id = decoded.payload.id;
  let post_id = req.params.id;
  let post_image = req.body.image;

  const { Post, PostImage } = await connectToDatabase()
  Post.findAll({
        where:{id:post_id, user_id},
        include: [
          { model: PostImage, attributes:['post_image'], required: false },
        ], 
        attributes:['id', 'user_id', 'post_name', 'description', 'link_content', 'post_type', 'createdAt']})
    .then(post => {
      if(post){
        res.json({
            'status':true,
             post,
          })  
      }else{
        res.json({
          'status':false,
          'message':'Data not found'
        })
      }
    });
}

module.exports.getReply = getReply = async (req, res) => {
  const { Post, Comment, User, Capability, PostCommentLike } = await connectToDatabase()
  let decoded = jwt.decode(req.header("x-auth-token"), {complete: true});
  let user_id = decoded.payload.id;
  let post_id = req.params.id;
  let comment_id = req.params.comment_id;
  let commentId = (req.query.comment_id == undefined) ? '' : req.query.comment_id;
  let offset = (req.query.offset == undefined) ? 0 : req.query.offset;
  let limit = (req.query.limit == undefined) ? 2 : parseInt(req.query.limit)
  let curentUserPostSubCommentLikes = await PostCommentLike.findAll({ where:{user_id:user_id, comment_type: 'reply'} });


  let whereQuery = [];
  whereQuery.push({parent_comment_id: comment_id});
  if (commentId != '') {
    whereQuery.push({ id: { [Op.lte]: commentId } });
  }
  let commentCount = await Comment.count({ where:whereQuery });
  let comments = await Comment.findAll({
    order: [ ['id', 'DESC']], 
    // where:{parent_comment_id: comment_id}, 
    where:whereQuery,
    limit: limit,
    attributes:['id', 'user_id', 'parent_comment_id', 'comment', 'createdAt', 'link_data', 'image'], required: false,
    include: [
      { model: User, attributes:['id',[Sequelize.fn("CONCAT", Sequelize.col("name"), " ", Sequelize.col("last_name")), 'name'], 'street_address', 'city', 'country', 'profile', 'latitude', 'longitude', 'city', 'country', 'state',  'user_role', 'gender', [Sequelize.literal('(SELECT COUNT(*) FROM socket_infos WHERE user.id = socket_infos.user_id)'), 'islives']], required: true,
        include: [ { model: Capability, attributes:['cpb_name', 'is_pending'], required: false } ]
      },
      { model: PostCommentLike, attributes:['id','comment_id','comment_type'], required: false, where:{comment_type: 'reply'} }
    ]
  });
  let resultCount = 0;

  if(comments){
    let curentUserPostSubCommentIns = [];
    for (var getlikes of curentUserPostSubCommentLikes) {
      curentUserPostSubCommentIns.push(getlikes.dataValues.comment_id);
    }
    for (var countval of comments) {
      resultCount = resultCount + 1;
      countval.dataValues.comment = await this.manageTagsString(countval.dataValues.comment);
      countval.dataValues.post_reply_like_count = countval.dataValues.post_comment_likes.length;
      countval.dataValues.post_comment_likes = [];
      let is_edit = false;
      if (user_id == countval.dataValues.user_id) {
        is_edit = true;
      }
      countval.dataValues.is_edit = is_edit;
      let is_like = false;
      if(curentUserPostSubCommentIns.includes(countval.dataValues.id)){
        is_like = true;
      }
      countval.dataValues.curentUserReplyCommentLikeVal = is_like;
    }
    res.json({
      'status':true,
       data:comments,
       offset : parseInt(offset) + resultCount,
       count: commentCount
    })
  } else {
    res.json({
      'status':false,
      'message':'Data not found'
    })
  }
 /* })
  .catch(err => {
      res.json({
        'status':false,
        'message':'Something went to wrong! Try again later',
        err
      })
    });*/
}

module.exports.getReplyNoti = getReplyNoti = async (req, res) => {
  let decoded = jwt.decode(req.header("x-auth-token"), {complete: true});
  let user_id = decoded.payload.id;
  let post_id = req.params.id;
  let comment_id = req.params.comment_id;
  let commentId = (req.query.comment_id == undefined) ? '' : req.query.comment_id;

  const { Post, Comment, User, Capability, PostCommentLike } = await connectToDatabase()

  let curentUserPostCommentLikes = await PostCommentLike.findAll({ where:{user_id:user_id}, attributes:['id', 'comment_id', 'comment_type'] });
  let whereQuery = [];
  // whereQuery.push({parent_comment_id: comment_id});
  // whereQuery.push({id: comment_id});
  // if (commentId != '') {
  //   whereQuery.push({ id: { [Op.lte]: commentId } });
  // }
  whereQuery.push({ id: { [Op.lte]: comment_id }, post_id: post_id, parent_comment_id:{ [Op.is]: null } });
  // whereQuery.push({ id: { [Op.lte]: commentId } });
  let comments = await Comment.findAll({
    order: [ ['id', 'DESC']], 
    // where:{parent_comment_id: comment_id}, 
    where:whereQuery, 
    attributes:['id', 'user_id', 'parent_comment_id', 'comment', 'createdAt', 'link_data', 'image'], required: false,
    include: [
      { model: User, attributes:['id',[Sequelize.fn("CONCAT", Sequelize.col("name"), " ", Sequelize.col("last_name")), 'name'], 'street_address', 'city', 'country', 'profile', 'latitude', 'longitude', 'city', 'country', 'state',  'user_role', 'gender', [Sequelize.literal('(SELECT COUNT(*) FROM socket_infos WHERE user.id = socket_infos.user_id)'), 'islives']], required: true,
        include: [ { model: Capability, attributes:['cpb_name', 'is_pending'], required: false } ]
      },
      { 
        limit: 2000, order: [ ['id', 'DESC']], where:{parent_comment_id:{ [Op.not]: null }, id: { [Op.lte]: commentId}},  
        model: Comment, attributes:['id', 'user_id', 'parent_comment_id', 'comment', 'createdAt', 'link_data', 'image'], required: false, 
        include: [
          { 
            model: User, attributes:['id',[Sequelize.fn("CONCAT", Sequelize.col("name"), " ", Sequelize.col("last_name")), 'name'], 'street_address', 'city', 'country', 'profile', 'latitude', 'longitude', 'city', 'country', 'state',  'user_role', 'gender', [Sequelize.literal('(SELECT COUNT(*) FROM socket_infos WHERE user.id = socket_infos.user_id)'), 'islives']], required: true,
            include: [ { model: Capability, attributes:['cpb_name', 'is_pending'], required: false, where:{is_pending:0} } ]
          },
          { model: PostCommentLike, attributes:['id','comment_id','comment_type'], required: false, where:{comment_type: 'reply'} },
        ]
      },
      { model: PostCommentLike, attributes:['id','comment_id','comment_type'], required: false, where:{comment_type: 'comment'} },
    ]
  });

  let curentUserPostCommentIns = [];
  let curentUserPostReplyIns = [];
  for (var getlikes of curentUserPostCommentLikes) {
    if (getlikes.dataValues.comment_type == 'comment') {
      curentUserPostCommentIns.push(getlikes.dataValues.comment_id);
    } else {
      curentUserPostReplyIns.push(getlikes.dataValues.comment_id);
    }
  }
  for (var countval of comments) {
    countval.dataValues.comment = await this.manageTagsString(countval.dataValues.comment);
    countval.dataValues.replycount = countval.dataValues.comments.length;

    countval.dataValues.post_comment_like_count = countval.dataValues.post_comment_likes.length;
    countval.dataValues.post_comment_likes = [];
    let is_edit = false;
    if (user_id == countval.dataValues.user_id) {
      is_edit = true;
    }
    countval.dataValues.is_edit = is_edit;
    let is_like = false;
    if(curentUserPostCommentIns.includes(countval.dataValues.id)){
      is_like = true;
    }
    countval.dataValues.curentUserCommentLikeVal = is_like;

    i = 0;
    if (countval.dataValues.comments.length > 0) {
      for (var reply of countval.dataValues.comments) {
        countval.dataValues.comments[i].dataValues.comment = await this.manageTagsString(reply.dataValues.comment);

        reply.dataValues.post_reply_like_count = reply.dataValues.post_comment_likes.length;
        reply.dataValues.post_comment_likes = [];
        let is_edit = false;
        if (user_id == reply.dataValues.user_id) {
          is_edit = true;
        }
        reply.dataValues.is_edit = is_edit;
        let is_like = false;
        if(curentUserPostReplyIns.includes(reply.dataValues.id)){
          is_like = true;
        }
        reply.dataValues.curentUserCommentLikeVal = is_like;
    
        i ++;
      }
    }
  }
  res.json({
    'status':true,
     data:comments,
  })
}

module.exports.getReviewed = async (user_id) => {
  const { ReviewRequest } = await connectToDatabase();
  let conneRequests = await ReviewRequest.findAll({attributes:['who_review'],
    where:{user_id},
  });
  let connectRequestIds = [];
  for (var connenrequestid of conneRequests) {
    if(connenrequestid.dataValues.who_review){
      connectRequestIds.push(connenrequestid.dataValues.who_review);  
    }
  }
  connectRequestIds = connectRequestIds.filter(function(elem, pos) {
      return connectRequestIds.indexOf(elem) == pos;
  })
  return connectRequestIds;
}

module.exports.manageTagsString = async (str) => {
  const { User} = await connectToDatabase();
  var s1 = str.split("@!#!@]");
  let finalStr = '';
  for (var i = 0; i < s1.length; i++) {
      var y = s1[i].split("@[@!#!@");
      finalStr += y[0];
      if(y.length == 2){
          var userIDA = y[1].split("#@");
          const user = await User.count({where:{id:userIDA[0]}});
          if(user > 0){
            let url = `${process.env.FRONT_URL}/view-profile/${halper.makeEncr(userIDA[0])}`;
            finalStr += `<a clicktracking="off" href="${url}" class="tagUser" target="_blank" style="color:#fa6017; text-decoration: none;">${userIDA[1]}</a>`;
          }else{
            finalStr += `<strong>${userIDA[1]}</strong>`;
          }
      }
  };
  return finalStr;
}

module.exports.tagMentioed = async (params, req) => {
  const { User} = await connectToDatabase();
  const str = params.comment;
  console.log(params, "tagMentioed")
  var s1 = str.split("@!#!@]");
  let finalStr = '';
  for (var i = 0; i < s1.length; i++) {
      var y = s1[i].split("@[@!#!@");
      finalStr += y[0];
      if(y.length == 2){
          var userIDA = y[1].split("#@");
          const user = await User.count({where:{id:userIDA[0]}});
          if(user > 0){
            addNotification({notify_to: userIDA[0], action_user:params.action_user, content:params.content , notify_to_username: userIDA[1], action_username:params.action_username, post_id:params.post_id, comment_id: params.comment_id, parent_comment_id: (params.parent_comment_id != '' && params.parent_comment_id != null) ? params.parent_comment_id : ''}, req);

            let url = `${process.env.FRONT_URL}/view-profile/${halper.makeEncr(userIDA[0])}`;
            finalStr += `<a href="${url}" class="tagUser" target="_blank">${userIDA[1]}</a>`;
          }else{
            finalStr += `<strong>${userIDA[1]}</strong>`;
          }
      }
  };
  return finalStr;
}

function renderTextToUrl(text) {
  console.log(text, "renderTextToUrl")
  var text = text.replace(/\n/g, " ");
  var words = text.split(" ");
  var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
  console.log(words);
  for (var i = 0; i < words.length; i++) {
    var n = regexp.test(words[i]);
    if (n) {
      var deadLink =
        '<a href="' +
        words[i] +
        '" target="_blank" class="textInURL" rel="nofollow">' +
        words[i] +
        "</a>";
      // changed line below to assign replace()'s result
      words[i] = words[i].replace(words[i], deadLink);
    }
  }
  console.log(words, "after loop");
  return words.join(" ");
  //return parts
}

function renderTextToUrlPost(mainText, text) {
  var text = text.replace(/\n/g, " ");
  var mainText = mainText.replace(/\n/g, " ");
  var words = text.split(" ");
  var mainWords = mainText.split(" ");
  var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
  for (var i = 0; i < words.length; i++) {
    var n = regexp.test(words[i]);
    if (n) {
      var deadLink =
        '<a href="' +
        mainWords[i] +
        '" target="_blank" class="textInURL" rel="nofollow">' +
        words[i] +
        "</a>";
      // changed line below to assign replace()'s result
      words[i] = words[i].replace(words[i], deadLink);
    }
  }
  return words.join(" ");
  //return parts
};

module.exports.postReport = postReport = async (req, res) => {
  const { Post, User, PostReport } = await connectToDatabase()
  let decoded = jwt.decode(req.header("x-auth-token"), {complete: true});
  let user_id = decoded.payload.id;

  let loginUser = await User.findOne({ where:{id:user_id}, attributes: ['id', [Sequelize.fn("CONCAT", Sequelize.col("name"), " ", Sequelize.col("last_name")), 'name'], 'email'] });
  if (loginUser) {
    PostReport.create({
      user_id: user_id,
      post_id: req.body.post_id,
      post_user_id: req.body.post_user_id,
      post_comment_id: (req.body.post_comment_id) ? req.body.post_comment_id : null,
      post_sub_comment_id: (req.body.post_sub_comment_id) ? req.body.post_sub_comment_id : null,
      post_like_id: (req.body.post_like_id) ? req.body.post_like_id : null,
      report_text: req.body.report_text,
      report_type: req.body.report_type,
    })
    .then(result => {
      if (loginUser.dataValues.email != null) {
        let post_detail_url = `${process.env.FRONT_URL}/post/${halper.makeEncr(result.dataValues.post_id)}`;
        postReportEmailTemp({'report_text': result.dataValues.report_text, 'report_type': result.dataValues.report_type, 'share_name': loginUser.dataValues.name, 'email': loginUser.dataValues.email, 'post_detail_url':post_detail_url, 'user_profile': `${process.env.FRONT_URL}/view-profile/${halper.makeEncr(user_id)}`});
        res.json({
          'status':true,
          'message':'Report has been sent successfully',
          'data' : result,
        });
      }
    })
    .catch(err => {
      res.json({
        'status':false,
        'message':'Something went to wrong! Try again later',
        err
      })
    });
  } else {
    res.json({
      'status':false,
      'message':'User not found!',
      err
    })
  }
}

module.exports.deletePostComment = deletePostComment = async (req, res) => {
  const { Comment, PostCommentLike, Post } = await connectToDatabase()
  let decoded = jwt.decode(req.header("x-auth-token"), {complete: true});
  let user_id = decoded.payload.id;
  let comment_id = req.params.comment_id;
  let comment_type = req.query.comment_type;

  let getComment = await Comment.findOne({where:{id:comment_id,user_id }});
  if(getComment != null){
    if (comment_type == "comment") {
      let getParentComment = await Comment.findAll({where:{parent_comment_id:comment_id}});
      if(getParentComment.length > 0){
        for(let parentComment of getParentComment){
          if (parentComment.dataValues.image != null) {
            let image = parentComment.dataValues.image;
            let imageArr = image.split("/");
            await this.deleteS3Image(`${process.env.COMMENT_IMG_DIR}/${_.last(imageArr)}`); 
          }
        }
      }
      await Comment.destroy({ where:{id:comment_id,user_id}});
      await Comment.destroy({ where:{parent_comment_id:comment_id}});
      await PostCommentLike.destroy({ where:{user_id, comment_id:comment_id, comment_type:comment_type}});
      await Post.destroy({ where:{share_id:comment_id, user_id, share_type:'comment'}});
    } else {
      if (getComment.dataValues.image != null) {
        let image = getComment.dataValues.image;
        let imageArr = image.split("/");
        await this.deleteS3Image(`${process.env.COMMENT_IMG_DIR}/${_.last(imageArr)}`); 
      }
      await Comment.destroy({ where:{id:comment_id,user_id}});
      await PostCommentLike.destroy({ where:{user_id, comment_id:comment_id, comment_type:comment_type}});
      await Post.destroy({ where:{share_id:comment_id, user_id, share_type:'reply'}});
    }
    res.json({
      'status':true,
      'message': (comment_type == "comment") ? 'The comment has been successfully deleted' : 'The reply has been successfully deleted'
    });
  }else{
    res.json({
      'status':true,
      'message':'Comment not found!'
    })
  }
}

module.exports.postCommentLike = postCommentLike = async (req, res) => {
  const { PostCommentLike, Post, User } = await connectToDatabase()
  let decoded = jwt.decode(req.header("x-auth-token"), {complete: true});
  let user_id = decoded.payload.id;
  let post_id = req.body.post_id;
  let comment_id = req.body.comment_id;
  let comment_type = req.body.comment_type;
  let parent_comment_id = (req.body.parent_comment_id) ? req.body.parent_comment_id : null;

  let getPostCommentLike = await PostCommentLike.count({ where:{user_id:user_id, post_id:post_id, comment_id:comment_id, comment_type:comment_type }});    
  if (getPostCommentLike == 0) {
    PostCommentLike.create({
      user_id: user_id,
      post_id: post_id,
      comment_id: comment_id,
      comment_type: comment_type,
      parent_comment_id: parent_comment_id,
    })
    .then(async result => {
      let getUser = await User.findByPk(user_id);
      let postUser = await Post.findOne({
        where: {id:req.body.post_id},
        include: [{ model: User, attributes:['id', 'email', 'is_mail_post_responses', 'is_sms_post_responses', 'is_wp_post_responses', 'mobile', 'name', 'last_name'], required: false, }],
        attributes:['id', 'user_id']
      });
      let notifyUser = postUser.dataValues.user.dataValues;
      if(notifyUser.id !== user_id){
        parentCommentIdURL = '';
        parentCommentId = '';
        if(req.body.parent_comment_id){
          parentCommentIdURL = `&parent_comment_id=${halper.makeEncr(req.body.parent_comment_id)}`;
          parentCommentId = req.body.parent_comment_id;
        }
        let post_detail_url = `${process.env.FRONT_URL}/post/${halper.makeEncr(post_id)}?comment_id=${halper.makeEncr(result.id)}${parentCommentIdURL}`;
        if(notifyUser.is_mail_post_responses){
          postCommentLikeEmailTemp({'connect_user':notifyUser.name, 'email':notifyUser.email, 'request_user':getUser.dataValues.name+' '+getUser.dataValues.last_name, 'request_first_name':getUser.dataValues.name+' '+getUser.dataValues.last_name, 'like':'like you post', 'post_detail_url':post_detail_url, 'user_profile': `${process.env.FRONT_URL}/view-profile/${halper.makeEncr(user_id)}`});
        }
        if(notifyUser.is_wp_post_responses){
          wtPostCommentLike({mobile: notifyUser.mobile, connect_user:getUser.dataValues.name+' '+getUser.dataValues.last_name, post_detail_url:post_detail_url});
        }
        if(notifyUser.is_sms_post_responses){
          txtPostCommentLike({mobile: notifyUser.mobile, connect_user:getUser.dataValues.name+' '+getUser.dataValues.last_name, post_detail_url:post_detail_url});
        }
        if(comment_type == "comment"){
          addNotification({notify_to: notifyUser.id, action_user:getUser.id, content:"PostCommentLike", notify_to_username: notifyUser.name, action_username:getUser.name, post_id:req.body.post_id, comment_id: result.id, parent_comment_id: parentCommentId }, req);
        } else {
          addNotification({notify_to: notifyUser.id, action_user:getUser.id, content:"PostReplyLike", notify_to_username: notifyUser.name, action_username:getUser.name, post_id:req.body.post_id, comment_id: result.id, parent_comment_id: parentCommentId }, req);
        }
      }
      getCommentLikesCount(comment_id, comment_type).then((likes) => {
          if(comment_type == "comment"){
            req.app.io.sockets.emit("comment-like",{"post_id":post_id, "comment_id":comment_id, likes, user_id});
          } else {
            req.app.io.sockets.emit("reply-comment-like",{"post_id":post_id, "comment_id":comment_id, likes, user_id, parent_comment_id});              
          }
          res.json({
            'status':true,
            'message':'Liked',
            'data' : result,
            likes
          });
      })
    })
    .catch(err => {
      res.json({
        'status':false,
        'message':'Something went to wrong! Try again later',
        err
      })
    });
  } else {
    PostCommentLike.destroy({ where:{user_id:user_id, post_id:post_id, comment_id:comment_id, comment_type:comment_type }})
    .then(result => {
      getCommentLikesCount(comment_id, comment_type).then(async (likes) => {
        if(comment_type == "comment"){
          req.app.io.sockets.emit("comment-unlike",{"post_id":post_id, "comment_id":comment_id, likes, user_id});
        } else {
          req.app.io.sockets.emit("reply-comment-unlike",{"post_id":post_id, "comment_id":comment_id, likes, user_id, parent_comment_id});
        }
        res.json({
          'status':true,
          'message':'UnLiked',
          'data' : result,
          'post_id' : post_id,
          "comment_id":comment_id,
          likes
        });
      })
    })
    .catch(err => {
      res.json({
        'status':false,
        'message':'Something went to wrong! Try again later',
        err
      })
    });
  }
}

async function getCommentLikesCount(comment_id, comment_type){
  const { PostCommentLike } = await connectToDatabase();
  let likes = await PostCommentLike.count({ where:{comment_id,comment_type}});
  return likes;
}

module.exports.putComment = putComment = async (req, res) => {
  const { Comment, Post, PostImage, User, Portfolio, PortfolioTag } = await connectToDatabase()
  let decoded = jwt.decode(req.header("x-auth-token"), {complete: true});
  let user_id = decoded.payload.id;
  let comment_id = req.params.comment_id;
  let comment_text = req.body.comment;
  //
  let isComment = await Comment.count({where:{id:comment_id, user_id}});
  if(isComment > 0){
    let commentObj = {comment: comment_text};
    if (req.body.link_data) {
      commentObj.link_data = (req.body.link_data) ? req.body.link_data : null;
    }
    if (req.body.image) {
      commentObj.image = (req.body.image) ? req.body.image : null;
    }
    Comment.update(commentObj, { where:{id:comment_id, user_id} })
    // Comment.update({comment: comment_text}, { where:{id:comment_id, user_id} })
    .then(comment => {
      this.manageTagsString(comment_text).then(comnt => {
        res.json({
          'status':true,
          'message':'The comment has been successfully updated',
          data: comnt
        })
      })
    });
  } else {
    res.json({
      'status':true,
      'message':'Comment not found!'
    })
  }
}

module.exports.postShare = postShare = async (req,res) => {
  const { Job, Post, User } = await connectToDatabase()
  let decoded = jwt.decode(req.header("x-auth-token"), {complete: true});
  let user_id = decoded.payload.id;

  Post.create({
    user_id: user_id,
    description: req.body.description,
    post_type: 'img_text',
    created_by: user_id,
    share_type: req.body.share_type,
    share_id: req.body.share_id,
  })
  .then(result => {
    if (result) {

      let message = `The Post has been shared to your Home Feed`;
      if (req.body.share_type == 'comment') {
        message = `The Comment has been shared to your Home Feed`;
      } else if (req.body.share_type == 'reply') {
        message = `The Reply has been shared to your Home Feed`;
      }
      res.json({
        'status': true,
        data: result,
        'message': message
      })
    } else {
      res.json({
        'status': true,
        data: {},
        'message': 'Data not found'
      })
    }
  });
}

module.exports.deletePostCommentImage = deletePostCommentImage = async (req, res) => {
  const { Comment } = await connectToDatabase()
  let decoded = jwt.decode(req.header("x-auth-token"), {complete: true});
  let user_id = decoded.payload.id;
  let comment_id = req.params.comment_id;

  let getComment = await Comment.findOne({where:{id:comment_id,user_id }, attributes:['image']});
  if(getComment != null){
    if (getComment.dataValues.image != null) {
      let image = getComment.dataValues.image;
      let imageArr = image.split("?");
      imageArr = imageArr[0];
      imageArr = imageArr.split("/");
      await this.deleteS3Image(`${process.env.COMMENT_IMG_DIR}/${_.last(imageArr)}`); 
      Comment.update({image : null}, { where:{id:comment_id,user_id} })
    }
    res.json({
      'status':true,
      'message': 'The Image has been successfully deleted'
    });
  }else{
    res.json({
      'status':true,
      'message':'Image not found!'
    })
  }
}