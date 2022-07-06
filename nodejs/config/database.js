const Sequelize = require('sequelize');

require('dotenv').config();

const UserModel = require('../models/User.model');
const CapabilityModel = require('../models/Capability.model');
const SkillModel = require('../models/Skill.model');
const ReputationModel = require('../models/Reputation.model');
const PostModel = require('../models/Post.model');
const PostImageModel = require('../models/PostImage.model');
const CommentModel = require('../models/Comment.model');
const LikeModel = require('../models/Like.model');
const FollowerModel = require('../models/Follower.model');
const ConnectRequestModel = require('../models/ConnectRequest.model');
const ReviewRequeststModel = require('../models/ReviewRequests.model');
const ReviewOptionModel = require('../models/ReviewOptions.model');
const ReputationReviewModel = require('../models/ReputationReviews.model');
const MessageModel = require('../models/Message.model');
const SocketinfoModel = require('../models/Socketinfo.model');
const NotificationsModel = require('../models/Notifications.model');
const ChatidsModel = require('../models/Chatids.model');
const ChatNotificationsModel = require('../models/ChatNotifications.model');
const GlobalSkillsModel = require('../models/GlobalSkills.model');
const GlobalCapabilityModel = require('../models/GlobalCapability.model');
const UserWorkModel = require('../models/UserWork.model');
const UserExperienceDocumentModel = require('../models/UserExperienceDocument.model');
const UserQualificationModel = require('../models/UserQualification.model');
const UserAwardModel = require('../models/UserAward.model');
const UserLanguageModel = require('../models/UserLanguage.model');
const PortfolioModel = require('../models/Portfolio.model');
const PortfolioTagModel = require('../models/PortfolioTag.model');
const PortfolioMediaModel = require('../models/PortfolioMedia.model');
const PortfolioLikeModel = require('../models/PortfolioLike.model');
const PortfolioCommentModel = require('../models/PortfolioComment.model');
const UserContactModel = require('../models/UserContact.model');
const ContactSuggestedModel = require('../models/ContactSuggested.model');
const JobModel = require('../models/Job.model');
const JobMediaModel = require('../models/JobMedia.model');
const JobSkillModel = require('../models/JobSkill.model');
const JobCapabilityModel = require('../models/JobCapability.model');
const JobApplyModel = require('../models/JobApply.model');
const JobReferModel = require('../models/JobRefer.model');
const JobCompleteModel = require('../models/JobComplete.model');
const JobChatModel = require('../models/JobChat.model');
const JobScraperModel = require('../models/JobScraper.model');
const SettingModel = require('../models/Setting.model');
const MessageImageModel = require('../models/MessageImage.model');
const JobSaveModel = require('../models/JobSave.model');
const RecentViewJobModel = require('../models/RecentViewJob.model');
const PostReportModel = require('../models/PostReport.model');
const PostCommentLikeModel = require('../models/PostCommentLike.model');
const PortfolioCommentLikeModel = require('../models/PortfolioCommentLike.model');


const sequelize = new Sequelize(
  process.env.DATABASE,
  process.env.DBUSERNAME,
  process.env.PASSWORD,
  {
    dialect: process.env.DIALECT,
    host: process.env.HOST,
    port: process.env.PORT
  }
)

const User = UserModel(sequelize, Sequelize)
const Capability = CapabilityModel(sequelize, Sequelize)
const Skill = SkillModel(sequelize, Sequelize)
const Reputation = ReputationModel(sequelize, Sequelize)
const Post = PostModel(sequelize, Sequelize)
const PostImage = PostImageModel(sequelize, Sequelize)
const Comment = CommentModel(sequelize, Sequelize)
const Like = LikeModel(sequelize, Sequelize)
const Follower = FollowerModel(sequelize, Sequelize)
const ConnectRequest = ConnectRequestModel(sequelize, Sequelize)
const ReviewRequest = ReviewRequeststModel(sequelize, Sequelize)
const ReviewOption = ReviewOptionModel(sequelize, Sequelize)
const ReputationReview = ReputationReviewModel(sequelize, Sequelize)
const Message = MessageModel(sequelize, Sequelize)
const Socketinfo = SocketinfoModel(sequelize, Sequelize)
const Notifications = NotificationsModel(sequelize, Sequelize)
const Chatids = ChatidsModel(sequelize, Sequelize)
const ChatNotifications = ChatNotificationsModel(sequelize, Sequelize)
const GlobalSkills = GlobalSkillsModel(sequelize, Sequelize)
const GlobalCapability = GlobalCapabilityModel(sequelize, Sequelize)
const UserWork = UserWorkModel(sequelize, Sequelize)
const UserExperienceDocument = UserExperienceDocumentModel(sequelize, Sequelize)
const UserQualification = UserQualificationModel(sequelize, Sequelize)
const UserAward = UserAwardModel(sequelize, Sequelize)
const UserLanguage = UserLanguageModel(sequelize, Sequelize)
const Portfolio = PortfolioModel(sequelize, Sequelize)
const PortfolioTag = PortfolioTagModel(sequelize, Sequelize)
const PortfolioMedia = PortfolioMediaModel(sequelize, Sequelize)
const PortfolioLike = PortfolioLikeModel(sequelize, Sequelize)
const PortfolioComment = PortfolioCommentModel(sequelize, Sequelize)
const UserContact = UserContactModel(sequelize, Sequelize)
const ContactSuggested = ContactSuggestedModel(sequelize, Sequelize)
const Job = JobModel(sequelize, Sequelize)
const JobMedia = JobMediaModel(sequelize, Sequelize)
const JobSkill = JobSkillModel(sequelize, Sequelize)
const JobCapability = JobCapabilityModel(sequelize, Sequelize)
const JobApply = JobApplyModel(sequelize, Sequelize)
const JobRefer = JobReferModel(sequelize, Sequelize)
const JobComplete = JobCompleteModel(sequelize, Sequelize)
const JobChat = JobChatModel(sequelize, Sequelize)
const JobScraper = JobScraperModel(sequelize, Sequelize)
const Setting = SettingModel(sequelize, Sequelize)
const MessageImage = MessageImageModel(sequelize, Sequelize)
const JobSave = JobSaveModel(sequelize, Sequelize)
const RecentViewJob = RecentViewJobModel(sequelize, Sequelize)
const PostReport = PostReportModel(sequelize, Sequelize)
const PostCommentLike = PostCommentLikeModel(sequelize, Sequelize)
const PortfolioCommentLike = PortfolioCommentLikeModel(sequelize, Sequelize)


Skill.belongsTo(Capability, { foreignKey: 'capability_id' });
Capability.belongsTo(User, { foreignKey: 'user_id' });
Follower.belongsTo(User, { foreignKey: 'follower_id' });
User.hasMany(ReviewRequest, { foreignKey: 'user_id' });
Skill.hasMany(ReviewOption, { foreignKey: 'skill_id' });
ReviewRequest.hasMany(ReviewOption, { foreignKey: 'request_id' });
ReviewRequest.hasMany(ReputationReview, { foreignKey: 'request_id' });
ReviewRequest.belongsTo(User, { foreignKey: 'who_review' });
ReviewRequest.belongsTo(User, {as: 'whosentRequest' , foreignKey: 'user_id' });
User.hasMany(Capability, {  foreignKey: 'user_id' });
User.hasMany(Follower, {  foreignKey: 'user_id' });
User.hasMany(Reputation, {  foreignKey: 'user_id' });
Capability.hasMany(Skill, {  foreignKey: 'capability_id' }); // Use API /profile/profile-step-data/:profile_step
Post.hasMany(PostImage, { foreignKey: 'post_id' }); // Use API /post
ReviewOption.belongsTo(Skill, { foreignKey: 'skill_id' });
ReviewOption.belongsTo(Capability, { foreignKey: 'capability_id' });
Post.belongsTo(User, { foreignKey: 'user_id' }); // Use API /post
Post.hasMany(Like, { foreignKey: 'post_id' }); // Use API /post
Post.hasMany(Comment, { foreignKey: 'post_id' }); // Use API /post
Comment.belongsTo(User, { foreignKey: 'user_id' }); // Use API /comment
Like.belongsTo(User, { foreignKey: 'user_id' }); // Use API /like-user
Comment.hasMany(Comment, { foreignKey: 'parent_comment_id' }); // Use child comment
Message.belongsTo(User, {as: 'receiver', foreignKey: 'receiver_id' });
Message.belongsTo(User, {as: 'sender', foreignKey: 'sender_id' });
Socketinfo.belongsTo(User, {as: 'socket', foreignKey: 'user_id' });
User.hasMany(Socketinfo, {  foreignKey: 'user_id' });
User.hasMany(Notifications, { as: 'notifications', foreignKey: 'notify_to' });
Notifications.belongsTo(User, {as: 'actionuser', foreignKey: 'action_user' });
UserWork.hasMany(UserExperienceDocument, { foreignKey: 'experience_id' }); // Use API /UserWork
UserQualification.hasMany(UserExperienceDocument, { foreignKey: 'experience_id' }); // Use API /UserQualification
UserAward.hasMany(UserExperienceDocument, { foreignKey: 'experience_id' }); // Use API /useraward

Portfolio.hasMany(PortfolioTag, { foreignKey: 'portfolio_id' }); // Use API /portfolio
Portfolio.hasMany(PortfolioMedia, { foreignKey: 'portfolio_id' }); // Use API /portfolio
Portfolio.belongsTo(User, { foreignKey: 'user_id' }); // Use API /portfolio
PortfolioComment.belongsTo(User, { foreignKey: 'user_id' }); // Use API /portfolio
PortfolioComment.hasMany(PortfolioComment, { foreignKey: 'parent_comment_id' }); // Use API /portfolio
PortfolioLike.belongsTo(User, { foreignKey: 'user_id' }); // Use API /portfolio
Portfolio.hasOne(PortfolioLike, { foreignKey: 'portfolio_id' }); // Use API /portfolio
User.hasMany(Portfolio, { foreignKey: 'user_id' }); // Use API /your-network
PortfolioTag.belongsTo(Portfolio, { foreignKey: 'portfolio_id' }); // Use API /your-network
Post.hasOne(Portfolio, { foreignKey: 'post_id' }); // Use API /post
User.hasMany(UserContact, { foreignKey: 'user_id' }); // Use API /your-network
User.hasMany(ContactSuggested, { foreignKey: 'user_id' }); // Use API /your-network

User.hasMany(UserWork, { foreignKey: 'user_id' }); // Use API /update/basic
User.hasMany(UserQualification, { foreignKey: 'user_id' }); // Use API /update/basic
User.hasMany(UserAward, { foreignKey: 'user_id' }); // Use API /update/basic
User.hasMany(UserLanguage, { foreignKey: 'user_id' }); // Use API /update/basic
User.hasMany(ReviewRequest, { foreignKey: 'user_id' }); // Use API /update/basic

Job.hasMany(JobMedia, { foreignKey: 'job_id' }); // Use API /job
Job.belongsTo(User, { foreignKey: 'user_id' }); // Use API /job
Job.hasMany(JobCapability, { foreignKey: 'job_id' }); // Use API /job
JobCapability.belongsTo(Capability, { foreignKey: 'capability_id' }); // Use API /job
Job.hasMany(JobSkill, { foreignKey: 'job_id' }); // Use API /job
JobSkill.belongsTo(Skill, { foreignKey: 'skill_id' }); // Use API /job
Job.hasMany(JobApply, { foreignKey: 'job_id' }); // Use API /job
JobApply.belongsTo(User, { foreignKey: 'apply_id' }); // Use API /job
JobApply.belongsTo(Job, { foreignKey: 'job_id' }); // Use API /job
Post.hasOne(Job, { foreignKey: 'post_id' }); // Use API /post
User.hasOne(Job, { foreignKey: 'user_id' }); // Use API /job
JobCapability.belongsTo(GlobalCapability, { foreignKey: 'capability_id' }); // Use API /job
JobSkill.belongsTo(GlobalSkills, { foreignKey: 'skill_id' }); // Use API /job
User.hasMany(JobComplete, { foreignKey: 'user_id' }); // Use API /job
// User.hasMany(JobRefer, { foreignKey: 'refer_sent_user_id' }); // Use API /job
User.hasMany(JobRefer, { foreignKey: 'refer_receive_user_id' }); // Use API /job
Job.hasMany(JobComplete, { foreignKey: 'job_id' }); // Use API /job
Job.hasOne(JobRefer, { foreignKey: 'job_id' }); // Use API /job
Job.belongsTo(Post, { foreignKey: 'post_id' }); // Use API /job
User.hasMany(JobApply, { foreignKey: 'job_user_id' }); // Use API /job
Job.hasMany(JobRefer, {as: 'jobreferalljob', foreignKey: 'job_id' });
JobSave.belongsTo(Job, {foreignKey: 'job_id' });
GlobalCapability.hasOne(JobCapability, { foreignKey: 'capability_id' }); // Use API /job
GlobalCapability.hasOne(JobCapability, {as: 'jobCapabilitySingle', foreignKey: 'capability_id' });
GlobalSkills.hasOne(JobSkill, {as: 'jobSkillSingle', foreignKey: 'skill_id' });
GlobalCapability.hasMany(JobCapability, { foreignKey: 'capability_id' }); // Use API /job-suggestions-mail
GlobalSkills.hasMany(JobSkill, { foreignKey: 'skill_id' }); // Use API /job-suggestions-mail
User.hasMany(ReviewRequest, {as: 'whoReviewRequest', foreignKey: 'who_review' });
User.hasMany(ReputationReview, { foreignKey: 'user_id' });
ReputationReview.belongsTo(Reputation, { foreignKey: 'reputation_id' });
RecentViewJob.belongsTo(Job, {foreignKey: 'job_id' });
Comment.hasMany(PostCommentLike, { foreignKey: 'comment_id' });
Post.belongsTo(Post, {as: 'sharePost', foreignKey: 'share_id' });
Post.belongsTo(Comment, {as: 'shareComment', foreignKey: 'share_id' });
Message.hasMany(MessageImage, { foreignKey: 'message_id' });
PortfolioComment.hasMany(PortfolioCommentLike, { foreignKey: 'comment_id' });

const Models = {User, Capability, Skill, Reputation, Post, PostImage, Comment, Like, Follower, ConnectRequest, ReviewRequest, ReviewOption, ReputationReview, sequelize, Message, Socketinfo, Notifications, Chatids, ChatNotifications, GlobalSkills, GlobalCapability, UserWork, UserExperienceDocument, UserQualification, UserAward, UserLanguage, Portfolio, PortfolioTag, PortfolioMedia, PortfolioLike, PortfolioComment, UserContact, ContactSuggested, Job, JobMedia, JobSkill, JobCapability, JobApply, JobRefer, JobComplete, JobChat, JobScraper, Setting, MessageImage, JobSave, PostReport, PostCommentLike, PortfolioCommentLike, RecentViewJob}

const connection = {}

module.exports = async () => {
  if (connection.isConnected) {
    console.log('=> Using existing connection.')
    return Models
  }

  // await sequelize.sync()
  await sequelize.authenticate()
  connection.isConnected = true
  console.log('=> Created a new connection.')
  return Models
}