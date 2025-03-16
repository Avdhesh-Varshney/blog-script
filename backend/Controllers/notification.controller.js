import Project from "../Models/project.model.js";
import Notification from "../Models/notification.model.js";

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