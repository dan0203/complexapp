const Post = require('../models/Post')

exports.apiCreate = (req, res) => {
    let post = new Post(req.body, req.apiUser._id)
    post.create()
            .then(function(newId) {
                res.json("Post created successfully.")
            })
            .catch(function(errors) {
                res.json(errors)
            })
}

exports.apiDelete = function (req, res) {
    Post.delete(req.params.id, req.apiUser._id)
            .then(() => {
                res.json("Post deleted successfully.")
            })
            .catch(() => {
                res.json("You don't have permission to perform that action.")
            })
}

exports.create = (req, res) => {
    let post = new Post(req.body, req.session.user._id)
    post.create()
            .then(function(newId) {
                req.flash("success", "New post successfully created.")
                req.session.save(() => res.redirect(`/post/${newId}`))
            })
            .catch(function(errors) {
                errors.forEach(error => req.flash("errors", error))
                req.session.save(() => res.redirect("/create-post"))
            })
}

exports.delete = function (req, res) {
    Post.delete(req.params.id, req.visitorId)
            .then(() => {
                req.flash("success", "Post successfully deleted.")
                req.session.save(() => res.redirect(`/profile/${req.session.user.username}`))
            })
            .catch(() => {
                req.flash("errors", "You don't have permission to perform that action.")
                req.session.save(() => res.redirect("/"))
            })
}

exports.edit = (req, res) => {
    let post = new Post(req.body, req.visitorId, req.params.id)
    post.update()
            .then((status) => {
                // the post was successfully updated in the database
                // or user did have permission but there was validation errors
                if (status === "success") {
                    // post was updtaed in db
                    req.flash("success", "Post successfully updated")
                    req.session.save(() => res.redirect("/"))
                } else {
                    post.errors.forEach(function(error) {
                        req.flash("errors", error)
                    })
                    req.session.save(() => res.redirect(`/post/${req.params.id}/edit`))
                }
            })
            .catch(() => {
                // a post with the requested id doesn't exist
                // or if the current visitor is not the owner of the requested post
                req.flash("errors", "You don't have permission to perform that action.")
                req.session.save(() => res.redirect("/"))
            })
}

exports.search = (req, res) => {
    Post.search(req.body.searchTerm)
            .then(posts => {
                res.json(posts)
            })
            .catch(() => {
                res.json([])
            })
}

exports.viewCreateScreen = (req, res) => {
    res.render('create-post')
}

exports.viewEditScreen = async (req, res) => {
    try {
      let post = await Post.findSingleById(req.params.id, req.visitorId)
      if (post.isVisitorOwner) {
        res.render("edit-post", {post: post})
      } else {
        req.flash("errors", "You do not have permission to perform that action.")
        req.session.save(() => res.redirect("/"))
      }
    } catch {
      res.render("404")
    }
  }

exports.viewSingle = async (req, res) => {
    try {
        let post = await Post.findSingleById(req.params.id, req.visitorId)
        res.render('single-post-screen', {post: post, title: post.title})
    } catch {
        res.render('404')
    }
}