const routes = require('express').Router();
const postControl = require('../controllers/Post')
const checkAuth = require('../middleware/checkAuth')
const checkjoiValidator = require('../middleware/validator')
const postValidate  = require('../validation/post.validate');
const commentValidate  = require('../validation/comment.validate');

routes.get("/", checkAuth, postControl.getPosts);
// routes.post("/store", checkAuth, checkjoiValidator(postValidate.postStore), postControl.postStore);
routes.post("/store", checkAuth, postControl.postStore);
routes.get("/recent-contact", checkAuth, postControl.recentContact);
routes.post("/comment", checkAuth, checkjoiValidator(commentValidate.postComment), postControl.postComment);
routes.get("/comment/:post_id", checkAuth, postControl.getComments);
routes.post("/like", checkAuth, postControl.postLike);
routes.get("/like-user/:post_id", checkAuth, postControl.getLikeUser);
routes.get("/:id", checkAuth, postControl.getPostsDetails);
routes.put("/:id", checkAuth, postControl.putPost);
routes.delete("/:id", checkAuth, postControl.deletePost);
routes.post("/:id/image", checkAuth, postControl.deleteImage);
routes.get("/:id/details", checkAuth, postControl.getSinglePost);
routes.get("/:id/comment/:comment_id/reply", checkAuth, postControl.getReply);
routes.get("/:id/comment-noti/:comment_id/reply", checkAuth, postControl.getReplyNoti);
routes.post("/report", checkAuth, postControl.postReport);
routes.delete("/comment/:comment_id", checkAuth, postControl.deletePostComment);
routes.post("/comment/like", checkAuth, postControl.postCommentLike);
routes.put("/comment/:comment_id", checkAuth, checkjoiValidator(commentValidate.putComment), postControl.putComment);
routes.post("/share", checkAuth, postControl.postShare);
routes.delete("/comment/image/:comment_id", checkAuth, postControl.deletePostCommentImage);

module.exports = routes;