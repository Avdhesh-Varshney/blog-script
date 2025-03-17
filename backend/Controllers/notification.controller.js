import Project from "../Models/project.model.js";
import Notification from "../Models/notification.model.js";
import Comment from "../Models/comment.model.js";

export const likeProject = async (req, res) => {
    let user_id = req.user;

    let { _id, islikedByUser } = req.body;

    let incrementVal = !islikedByUser ? 1 : -1;

    Project.findOneAndUpdate({ _id }, { $inc: { "activity.total_likes": incrementVal } })
        .then(project => {
            if (!islikedByUser) {
                let like = new Notification({
                    type: "like",
                    project: _id,
                    notification_for: project.author,
                    user: user_id
                });

                like.save().then(notification => {
                    return res.status(200).json({ liked_by_user: true });
                })
            } else {
                Notification.findOneAndDelete({ type: "like", project: _id, user: user_id })
                    .then(() => {
                        return res.status(200).json({ liked_by_user: false });
                    })
                    .catch(err => {
                        return res.status(500).json({ error: err.message });
                    })
            }
        })
}

export const likeStatus = async (req, res) => {
    let user_id = req.user;

    let { _id } = req.body;

    Notification.exists({ type: "like", project: _id, user: user_id })
        .then(isLiked => {
            return res.status(200).json({ isLiked });
        })
        .catch(err => {
            return res.status(500).json({ error: err.message });
        })
}

export const addComment = async (req, res) => {
    let user_id = req.user;

    let { _id, comment, project_author, replying_to } = req.body;

    if (!comment.length) {
        return res.status(403).json({ error: "Write something to leave a comment" });
    }

    let commentObj = {
        project_id: _id,
        project_author,
        comment,
        commented_by: user_id,
    }

    if (replying_to) {
        commentObj.parent = replying_to;
        commentObj.isReply = true;
    }

    new Comment(commentObj).save().then(async commentFile => {
        let { comment, commentedAt, children } = commentFile;

        Project.findOneAndUpdate({ _id }, { $push: { "comments": commentFile._id }, $inc: { "activity.total_comments": 1, "activity.total_parent_comments": replying_to ? 0 : 1 } })
            .then(project => {
                console.log('New comment created')
            });

        let notificationObj = new Notification({
            type: replying_to ? "reply" : "comment",
            project: _id,
            notification_for: project_author,
            user: user_id,
            comment: commentFile._id,
        })

        if (replying_to) {
            notificationObj.replied_on_comment = replying_to;
            await Comment.findOneAndUpdate({ _id: replying_to }, { $push: { children: commentFile._id } })
                .then(replyingToCommentDoc => {
                    notificationObj.notification_for = replyingToCommentDoc.commented_by;
                });
        }

        notificationObj.save().then(notification => {
            console.log('New notification created')
        });

        return res.status(200).json({ comment, commentedAt, _id: commentFile._id, user_id, children });
    })
}

export const getComments = async (req, res) => {
    let { project_id, skip } = req.body;

    let maxLimit = 5;

    Comment.find({ project_id, isReply: false })
        .populate("commented_by", "personal_info.username personal_info.fullname personal_info.profile_img")
        .skip(skip)
        .limit(maxLimit)
        .sort({ "commentedAt": -1 })
        .then(comment => {
            return res.status(200).json(comment);
        })
        .catch(err => {
            return res.status(500).json({ error: err.message });
        })
}

export const getReplies = async (req, res) => {
    let { _id, skip } = req.body;

    let maxLimit = 5;

    Comment.findOne({ _id })
        .populate({
            path: "children",
            option: {
                limit: maxLimit,
                skip: skip,
                sort: { "commentedAt": -1 }
            },
            populate: {
                path: 'commented_by',
                select: 'personal_info.username personal_info.fullname personal_info.profile_img'
            },
            select: "-project_id -updatedAt"
        })
        .select("children")
        .then(doc => {
            return res.status(200).json({ replies: doc.children });
        })
        .catch(err => {
            return res.status(500).json({ error: err.message });
        })
}